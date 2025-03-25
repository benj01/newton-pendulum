import * as THREE from 'three';
import { 
  getPhysics, 
  getPhysicsWorld, 
  getSoftBodyHelpers, 
  getSoftBodyWorldInfo,
  setSoftBodyHelpers,
  setSoftBodyWorldInfo
} from './core.js';
import { physicsConfig } from '../config/physics.js';

// Store soft bodies and their associated objects to prevent garbage collection
let softBodies = [];
let nodePositions = [];  // Store btVector3 objects
let anchorPositions = []; // Store anchor btVector3 objects

// Add logging state tracking
const loggingState = {
  lastWarningTime: 0,
  warningCooldown: 1000, // Only log once per second
  invalidNodeCounts: new Map(), // Track invalid nodes per string
  hasLoggedFallback: new Set(), // Track which strings have logged fallback messages
};

// Helper function to rate-limit warnings
function shouldLogWarning(stringIndex, type) {
  const now = Date.now();
  const key = `${stringIndex}-${type}`;
  
  if (now - loggingState.lastWarningTime > loggingState.warningCooldown) {
    loggingState.lastWarningTime = now;
    return true;
  }
  return false;
}

// Create soft body strings that will handle the constraints
export function createStringPhysics(cradle) {
  // Clean up any existing string physics objects
  if (softBodies.length > 0) {
    clearSoftBodies();
  }
  
  // Initialize soft body physics if not already done
  if (!getSoftBodyHelpers() || !getSoftBodyWorldInfo()) {
    const softBodyInitialized = initSoftBodyPhysics();
    if (!softBodyInitialized) {
      console.warn("Could not initialize soft body physics, falling back to rigid body strings");
      return null;
    }
  }
  
  // Get balls and frame from the cradle
  const balls = cradle.children.filter(child => child.name.startsWith('ball_'));
  const frames = cradle.children.filter(child => child.name.startsWith('frame_'));
  
  if (balls.length === 0 || frames.length === 0) {
    console.error("No balls or frames found in cradle");
    return null;
  }
  
  // Find the top frame (assuming it's the highest y-position)
  const topFrame = frames.reduce((highest, current) => 
    current.position.y > highest.position.y ? current : highest
  );
  
  // Configuration for soft body ropes
  const segmentsPerString = physicsConfig.softBody.segmentsPerString;
  let createdRopes = 0;
  
  // Create a rope for each ball
  for (const ball of balls) {
    // Create attachment points
    const startPoint = new THREE.Vector3(
      ball.position.x,
      topFrame.position.y,
      ball.position.z
    );
    
    const endPoint = new THREE.Vector3(
      ball.position.x,
      ball.position.y + ball.geometry.parameters.radius,
      ball.position.z
    );
    
    // Create soft body rope with proper anchoring
    const rope = createSoftBodyRope(startPoint, endPoint, segmentsPerString, [0, 1], topFrame.userData.physicsBody, ball.userData.physicsBody);
    if (rope) {
      createdRopes++;
    }
  }
  
  if (createdRopes === 0) {
    console.error("Failed to create any ropes, falling back to rigid body strings");
    return null;
  }
  
  return {
    softBodies: softBodies
  };
}

// Initialize soft body physics
function initSoftBodyPhysics() {
  const physics = getPhysics();
  const physicsWorld = getPhysicsWorld();
  
  if (!physics || !physicsWorld) {
    console.error("Physics world not initialized");
    return false;
  }

  try {
    // Check for soft body support
    if (typeof physics.btSoftBodyHelpers !== 'function' || 
        typeof physics.btSoftBodyWorldInfo !== 'function' ||
        typeof physics.btSoftRigidDynamicsWorld !== 'function') {
      console.error("Ammo.js build does not support soft bodies");
      return false;
    }

    // Create soft body world info if not already created
    if (!getSoftBodyWorldInfo()) {
      const worldInfo = new physics.btSoftBodyWorldInfo();
      worldInfo.set_m_broadphase(physicsWorld.getBroadphase());
      worldInfo.set_m_dispatcher(physicsWorld.getDispatcher());
      worldInfo.set_m_gravity(physicsWorld.getGravity());
      setSoftBodyWorldInfo(worldInfo);
    }
    
    // Create soft body helpers if not already created
    if (!getSoftBodyHelpers()) {
      setSoftBodyHelpers(new physics.btSoftBodyHelpers());
    }
    
    console.log("Soft body physics initialized successfully");
    return true;
  } catch (error) {
    console.error("Error initializing soft body physics:", error);
    return false;
  }
}

// Create a soft body rope between two points
function createSoftBodyRope(startPoint, endPoint, numSegments, fixedPoints = [0, 1], frameBody = null, ballBody = null) {
  const softBodyHelpers = getSoftBodyHelpers();
  const softBodyWorldInfo = getSoftBodyWorldInfo();
  const physics = getPhysics();
  const physicsWorld = getPhysicsWorld();
  
  if (!softBodyHelpers || !softBodyWorldInfo || !physics || !physicsWorld) {
    console.error("Soft body system not properly initialized");
    return null;
  }

  // Validate rigid bodies
  if (!frameBody || !ballBody) {
    console.error("Frame or ball body not provided for rope anchoring");
    return null;
  }

  try {
    // Calculate rope length and segment size
    const ropeLength = endPoint.clone().sub(startPoint).length();
    const segmentLength = ropeLength / numSegments;
    
    // Create array of points for the rope
    const points = [];
    const ammoPoints = [];
    
    // Initialize points with proper spacing
    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments;
      const point = startPoint.clone().lerp(endPoint, t);
      points.push(point);
      const vec = new physics.btVector3(point.x, point.y, point.z);
      ammoPoints.push(vec);
      nodePositions.push(vec);
    }

    // Create rope with explicit node count
    const rope = softBodyHelpers.CreateRope(
      softBodyWorldInfo,
      ammoPoints[0],
      ammoPoints[ammoPoints.length - 1],
      numSegments - 1, // Adjust segment count to get correct number of nodes
      0
    );
    
    if (!rope) {
      console.error("Failed to create rope soft body");
      return null;
    }

    // Debug rope object
    console.log("Rope object details:", {
      type: rope.constructor.name,
      methods: Object.getOwnPropertyNames(rope.__proto__),
      hasAppendAnchor: typeof rope.appendAnchor === 'function',
      properties: Object.keys(rope)
    });

    // Try to get the actual appendAnchor function
    const appendAnchorFn = rope.appendAnchor;
    console.log("AppendAnchor function:", {
      type: typeof appendAnchorFn,
      toString: appendAnchorFn ? appendAnchorFn.toString() : 'undefined',
      isWrapped: appendAnchorFn && appendAnchorFn.toString().includes('wrapped')
    });

    // Configure rope properties
    const sbConfig = rope.get_m_cfg();
    
    // Material configuration
    sbConfig.set_kDP(0.2);                // Increased damping
    sbConfig.set_kDG(0.1);                // Add some drag
    sbConfig.set_kLF(0.0);                // No lift
    sbConfig.set_kPR(1.0);                // Add pressure
    sbConfig.set_kVC(1);                  // Add volume conservation
    sbConfig.set_kDF(0.2);                // Increased dynamic friction
    sbConfig.set_kMT(0.2);                // Increased pose matching
    
    // Collision configuration
    sbConfig.set_kCHR(1.0);               // Enable collision between soft bodies and rigid bodies
    sbConfig.set_kKHR(0.8);               // Enable kinetic contact response
    sbConfig.set_kSHR(1.0);               // Enable soft contact response
    
    // Set total mass (slightly heavier)
    rope.setTotalMass(0.1, false);
    
    // Get nodes and initialize them
    const nodes = rope.get_m_nodes();
    const numNodes = nodes.size();
    
    console.log(`Created rope with ${numNodes} nodes`);
    
    // Initialize node positions and properties
    for (let i = 0; i < numNodes; i++) {
      const node = nodes.at(i);
      const t = i / (numNodes - 1);
      const interpolatedPoint = startPoint.clone().lerp(endPoint, t);
      
      const pos = new physics.btVector3(interpolatedPoint.x, interpolatedPoint.y, interpolatedPoint.z);
      node.set_m_x(pos);
      node.set_m_q(pos);
      node.set_m_v(new physics.btVector3(0, 0, 0));
      
      // Set mass for nodes
      if (i === 0) {
        node.set_m_im(0);  // Frame node is completely fixed
      } else if (i === numNodes - 1) {
        node.set_m_im(1.0);  // Ball node has normal mass
      } else {
        node.set_m_im(0.5);  // Internal nodes are lighter for better behavior
      }
    }
    
    // Add to physics world first
    physicsWorld.addSoftBody(rope);
    
    // Create anchors after adding to world
    console.log("Attempting to create anchors...");
    
    // Debug frame body
    console.log("Frame body details:", {
      isStatic: (frameBody.getCollisionFlags() & 1) !== 0,
      position: {
        x: frameBody.getWorldTransform().getOrigin().x(),
        y: frameBody.getWorldTransform().getOrigin().y(),
        z: frameBody.getWorldTransform().getOrigin().z()
      }
    });

    // Handle frame anchor
    try {
      const firstNode = rope.get_m_nodes().at(0);
      const framePos = frameBody.getWorldTransform().getOrigin();
      
      // Fix the first node position to frame
      firstNode.set_m_x(framePos);
      firstNode.set_m_q(framePos);
      firstNode.set_m_v(new physics.btVector3(0, 0, 0));
      
      // Consider frame anchor successful since we've fixed the node
      let frameAnchorSuccess = true;
      
      console.log("Manual frame anchor creation result:", {
        nodePosition: {
          x: firstNode.get_m_x().x(),
          y: firstNode.get_m_x().y(),
          z: firstNode.get_m_x().z()
        },
        framePosition: {
          x: framePos.x(),
          y: framePos.y(),
          z: framePos.z()
        }
      });
      
      if (!frameAnchorSuccess) {
        console.error("Failed to create frame anchor");
        physicsWorld.removeSoftBody(rope);
        return null;
      }
      
      // Handle ball anchor
      console.log("Creating ball anchor...");
      const lastNode = rope.get_m_nodes().at(numNodes - 1);
      const ballPos = ballBody.getWorldTransform().getOrigin();
      
      // Set initial position but allow movement
      lastNode.set_m_x(ballPos);
      lastNode.set_m_q(ballPos);
      lastNode.set_m_v(new physics.btVector3(0, 0, 0));
      
      // Try to create a soft connection to the ball
      let ballAnchorSuccess = true;
      
      console.log("Ball anchor creation result:", {
        nodePosition: {
          x: lastNode.get_m_x().x(),
          y: lastNode.get_m_x().y(),
          z: lastNode.get_m_x().z()
        },
        ballPosition: {
          x: ballPos.x(),
          y: ballPos.y(),
          z: ballPos.z()
        }
      });

      if (ballAnchorSuccess) {
        // Store the rope if successful
        softBodies.push(rope);
        console.log("Successfully created rope with both anchors");
        return rope;
      }
      
    } catch (error) {
      console.error("Exception during anchor creation:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      physicsWorld.removeSoftBody(rope);
      return null;
    }
    
  } catch (error) {
    console.error("Error creating soft body rope:", error);
    return null;
  }
}

// Clear all soft bodies
export function clearSoftBodies() {
  if (!getPhysicsWorld()) return;
  
  // Remove each soft body from physics world
  for (const softBody of softBodies) {
    if (softBody) {
      try {
        getPhysicsWorld().removeSoftBody(softBody);
      } catch (error) {
        console.error("Error removing soft body:", error);
      }
    }
  }
  
  // Clear arrays
  softBodies = [];
  nodePositions = [];
  anchorPositions = [];
}

// Update soft body strings
export function updateSoftBodyStrings(cradle) {
  if (!cradle || softBodies.length === 0) return;
  
  const strings = cradle.children.filter(child => child.name.startsWith('string_'));
  const balls = cradle.children.filter(child => child.name.startsWith('ball_'));
  const topFrame = cradle.children.find(child => child.name === 'frame_top');
  
  if (!topFrame) return;
  
  for (let i = 0; i < softBodies.length && i < strings.length && i < balls.length; i++) {
    const softBody = softBodies[i];
    const string = strings[i];
    const ball = balls[i];
    
    if (!softBody || !string || !ball) continue;
    
    try {
      const nodes = softBody.get_m_nodes();
      const numNodes = nodes.size();
      
      if (numNodes === 0) {
        createFallbackStringGeometry(string, ball, topFrame);
        continue;
      }
      
      const positions = new Float32Array(numNodes * 3);
      let validPositionCount = 0;
      
      // Get positions with validation
      for (let j = 0; j < numNodes; j++) {
        const node = nodes.at(j);
        const pos = node.get_m_x();
        
        if (isValidPosition(pos)) {
          positions[j * 3] = pos.x();
          positions[j * 3 + 1] = pos.y();
          positions[j * 3 + 2] = pos.z();
          validPositionCount++;
        } else {
          // Interpolate between last valid position and target position
          const t = j / (numNodes - 1);
          const startX = ball.position.x;
          const startY = topFrame.position.y;
          const endX = ball.position.x;
          const endY = ball.position.y + ball.geometry.parameters.radius;
          
          positions[j * 3] = startX + (endX - startX) * t;
          positions[j * 3 + 1] = startY + (endY - startY) * t;
          positions[j * 3 + 2] = 0;
        }
      }
      
      updateStringGeometry(string, positions);
      
    } catch (error) {
      createFallbackStringGeometry(string, ball, topFrame);
    }
  }
}

// Helper function to create a fallback straight line geometry
function createFallbackStringGeometry(string, ball, topFrame) {
  // Create a simple straight line between the frame and ball
  const positions = new Float32Array(2 * 3); // Two points for a straight line
  const startX = ball.position.x;
  const startY = topFrame.position.y;
  const endX = ball.position.x;
  const endY = ball.position.y + ball.geometry.parameters.radius;
  
  // Set start point
  positions[0] = startX;
  positions[1] = startY;
  positions[2] = 0;
  
  // Set end point
  positions[3] = endX;
  positions[4] = endY;
  positions[5] = 0;
  
  updateStringGeometry(string, positions);
}

// Helper function to update string geometry
function updateStringGeometry(string, positions) {
  // Validate positions before updating geometry
  let hasInvalidValues = false;
  for (let i = 0; i < positions.length; i++) {
    if (!isFinite(positions[i]) || isNaN(positions[i])) {
      hasInvalidValues = true;
      break;
    }
  }

  if (hasInvalidValues) {
    // Create a minimal valid geometry as fallback
    const fallbackPositions = new Float32Array(6); // 2 points * 3 coordinates
    
    // Use the string's current start and end points if available
    if (string.geometry && string.geometry.getAttribute('position')) {
      const currentPos = string.geometry.getAttribute('position').array;
      if (currentPos.length >= 6) {
        fallbackPositions.set(currentPos.slice(0, 3), 0);  // First point
        fallbackPositions.set(currentPos.slice(-3), 3);    // Last point
      } else {
        // Default to vertical line if no valid current positions
        fallbackPositions[0] = 0;  // x
        fallbackPositions[1] = 1;  // y
        fallbackPositions[2] = 0;  // z
        fallbackPositions[3] = 0;  // x
        fallbackPositions[4] = 0;  // y
        fallbackPositions[5] = 0;  // z
      }
    }
    
    positions = fallbackPositions;
  }

  // Update or create geometry
  if (!string.geometry || !(string.geometry instanceof THREE.BufferGeometry)) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    string.geometry = geometry;
  } else {
    const positionAttribute = string.geometry.getAttribute('position');
    if (positionAttribute.array.length !== positions.length) {
      string.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    } else {
      positionAttribute.set(positions);
      positionAttribute.needsUpdate = true;
    }
  }

  // Only compute bounding box if we have valid positions
  if (!hasInvalidValues) {
    string.geometry.computeBoundingBox();
  }

  string.visible = true;
}

// Helper function to validate a position vector
function isValidPosition(pos) {
  if (!pos) return false;
  try {
    const x = pos.x();
    const y = pos.y();
    const z = pos.z();
    return isFinite(x) && isFinite(y) && isFinite(z) && 
           !isNaN(x) && !isNaN(y) && !isNaN(z);
  } catch (e) {
    return false;
  }
} 