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

    // Configure rope properties
    const sbConfig = rope.get_m_cfg();
    
    // Material configuration
    sbConfig.set_kDP(0.1);                // Reduced damping
    sbConfig.set_kDG(0.0);                // No drag
    sbConfig.set_kLF(0.0);                // No lift
    sbConfig.set_kPR(0.0);                // No pressure
    sbConfig.set_kVC(0);                  // No volume conservation
    sbConfig.set_kDF(0.1);                // Reduced dynamic friction
    sbConfig.set_kMT(0.05);               // Very low pose matching for more natural movement
    
    // Collision configuration
    sbConfig.set_kCHR(0.0);               // No collision between soft bodies and rigid bodies
    sbConfig.set_kKHR(0.0);               // No kinetic contact response
    sbConfig.set_kSHR(0.0);               // No soft contact response
    
    // Set total mass (very light)
    rope.setTotalMass(0.01, false);
    
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
      
      // Set mass for end nodes
      if (i === 0 || i === numNodes - 1) {
        node.set_m_im(0);  // Fixed points are immovable
      } else {
        node.set_m_im(1.0); // Lighter internal nodes
      }
    }
    
    // Add to physics world first
    physicsWorld.addSoftBody(rope);
    
    // Create anchors after adding to world
    console.log("Attempting to create anchors...");
    
    // Try creating frame anchor with different parameters
    console.log("Creating frame anchor...");
    let frameAnchorSuccess = rope.appendAnchor(0, frameBody, true); // Try with collision enabled
    if (!frameAnchorSuccess) {
        console.log("Retrying frame anchor with different parameters...");
        frameAnchorSuccess = rope.appendAnchor(0, frameBody, false); // Try without collision
    }
    
    if (!frameAnchorSuccess) {
      console.error("Failed to create frame anchor after retries");
      physicsWorld.removeSoftBody(rope);
      return null;
    }
    
    // Create ball anchor
    console.log("Creating ball anchor...");
    const ballAnchorSuccess = rope.appendAnchor(numNodes - 1, ballBody, true);
    if (!ballAnchorSuccess) {
      console.error("Failed to create ball anchor");
      physicsWorld.removeSoftBody(rope);
      return null;
    }
    
    // Store the rope if successful
    softBodies.push(rope);
    console.log("Successfully created rope with both anchors");
    return rope;
    
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
  
  // Get visual strings and top frame
  const strings = cradle.children.filter(child => child.name.startsWith('string_'));
  const balls = cradle.children.filter(child => child.name.startsWith('ball_'));
  const topFrame = cradle.children.find(child => child.name === 'frame_top');
  
  if (!topFrame) {
    if (shouldLogWarning('global', 'noTopFrame')) {
      console.error("Top frame not found in cradle");
    }
    return;
  }
  
  // Update each soft body rope
  for (let i = 0; i < softBodies.length && i < strings.length && i < balls.length; i++) {
    const softBody = softBodies[i];
    const string = strings[i];
    const ball = balls[i];
    
    if (!softBody || !string || !ball) {
      if (shouldLogWarning(i, 'missingObjects')) {
        console.warn(`Missing objects for string ${i}`);
      }
      continue;
    }
    
    try {
      // Get nodes from soft body
      const nodes = softBody.get_m_nodes();
      const numNodes = nodes.size();
      
      if (numNodes === 0) {
        if (!loggingState.hasLoggedFallback.has(i)) {
          console.warn(`No nodes found for string ${i}, using fallback visualization`);
          loggingState.hasLoggedFallback.add(i);
        }
        createFallbackStringGeometry(string, ball, topFrame);
        continue;
      }
      
      // Create positions array for the line segments
      const positions = new Float32Array(numNodes * 3);
      let hasValidPositions = false;
      let invalidCount = 0;
      
      // Update positions from soft body nodes with validation
      for (let j = 0; j < numNodes; j++) {
        const node = nodes.at(j);
        const pos = node.get_m_x();
        
        // Validate position values
        const x = pos.x();
        const y = pos.y();
        const z = pos.z();
        
        if (isFinite(x) && isFinite(y) && isFinite(z)) {
          positions[j * 3] = x;
          positions[j * 3 + 1] = y;
          positions[j * 3 + 2] = z;
          hasValidPositions = true;
        } else {
          invalidCount++;
          
          // Use last known good position or fallback to initial position
          if (j > 0 && isFinite(positions[(j-1) * 3])) {
            positions[j * 3] = positions[(j-1) * 3];
            positions[j * 3 + 1] = positions[(j-1) * 3 + 1];
            positions[j * 3 + 2] = positions[(j-1) * 3 + 2];
          } else {
            const t = j / (numNodes - 1);
            const startX = ball.position.x;
            const startY = topFrame.position.y;
            const endX = ball.position.x;
            const endY = ball.position.y + ball.geometry.parameters.radius;
            
            positions[j * 3] = startX;
            positions[j * 3 + 1] = startY + (endY - startY) * t;
            positions[j * 3 + 2] = 0;
          }
        }
      }
      
      // Log invalid nodes only when the count changes
      const prevInvalidCount = loggingState.invalidNodeCounts.get(i) || 0;
      if (invalidCount !== prevInvalidCount && shouldLogWarning(i, 'invalidNodes')) {
        if (invalidCount > 0) {
          console.warn(`String ${i}: ${invalidCount}/${numNodes} invalid node positions detected`);
        }
        loggingState.invalidNodeCounts.set(i, invalidCount);
      }
      
      // Only update the geometry if we have at least some valid positions
      if (hasValidPositions) {
        updateStringGeometry(string, positions);
        // Clear fallback log flag if string recovers
        loggingState.hasLoggedFallback.delete(i);
      } else {
        if (!loggingState.hasLoggedFallback.has(i)) {
          console.warn(`No valid positions found for soft body string ${i}, using fallback visualization`);
          loggingState.hasLoggedFallback.add(i);
        }
        createFallbackStringGeometry(string, ball, topFrame);
      }
      
    } catch (error) {
      if (shouldLogWarning(i, 'updateError')) {
        console.error(`Error updating soft body string ${i}:`, error);
      }
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
  // Update or create geometry
  if (!string.geometry || !(string.geometry instanceof THREE.BufferGeometry)) {
    // Create new buffer geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    string.geometry = geometry;
  } else {
    // Update existing geometry
    const positionAttribute = string.geometry.getAttribute('position');
    
    // Resize buffer if needed
    if (positionAttribute.array.length !== positions.length) {
      string.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    } else {
      positionAttribute.set(positions);
      positionAttribute.needsUpdate = true;
    }
  }
  
  // Skip bounding sphere computation to avoid NaN-related issues
  try {
    string.geometry.computeBoundingBox();
  } catch (e) {
    console.warn("Error computing bounding box:", e);
  }
  
  // Ensure the string is visible
  string.visible = true;
} 