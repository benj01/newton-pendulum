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
    createSoftBodyRope(startPoint, endPoint, segmentsPerString, [0, 1], topFrame.userData.physicsBody, ball.userData.physicsBody);
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
  
  if (!softBodyHelpers || !softBodyWorldInfo) {
    console.error("Soft body helpers not initialized");
    return null;
  }

  try {
    // Calculate rope length and segment size
    const ropeLength = endPoint.clone().sub(startPoint).length();
    const segmentLength = ropeLength / numSegments;
    
    // Create rope direction vector
    const direction = endPoint.clone().sub(startPoint).normalize();
    
    // Create array of points for the rope
    const points = [];
    for (let i = 0; i <= numSegments; i++) {
      const point = startPoint.clone().add(direction.clone().multiplyScalar(i * segmentLength));
      points.push(point);
    }
    
    // Convert points to Ammo.js vectors and store them
    const ammoPoints = points.map(p => {
      const vec = new physics.btVector3(p.x, p.y, p.z);
      nodePositions.push(vec); // Store for cleanup
      return vec;
    });
    
    // Create rope soft body using first and last points
    const rope = softBodyHelpers.CreateRope(
      softBodyWorldInfo,
      ammoPoints[0],              // Start position
      ammoPoints[ammoPoints.length - 1], // End position
      numSegments,                // Number of segments
      0                          // Flag (0 for normal)
    );
    
    if (!rope) {
      console.error("Failed to create rope soft body");
      return null;
    }
    
    // Configure rope properties
    const sbConfig = rope.get_m_cfg();
    const softBodyConfig = physicsConfig.softBody;
    
    // Set configuration values
    sbConfig.set_kDP(softBodyConfig.damping);           // Damping
    sbConfig.set_kLF(softBodyConfig.lift);             // Lift
    sbConfig.set_kPR(softBodyConfig.pressure);         // Pressure
    sbConfig.set_kVC(softBodyConfig.volumeConservation); // Volume
    sbConfig.set_kDF(softBodyConfig.dynamicFriction);   // Dynamic friction
    sbConfig.set_kMT(softBodyConfig.poseMatching);      // Pose matching
    sbConfig.set_kCHR(softBodyConfig.contactHardness);  // Contact hardness
    sbConfig.set_kKHR(softBodyConfig.kineticHardness);  // Kinetic hardness
    sbConfig.set_kSHR(softBodyConfig.softHardness);     // Soft hardness
    sbConfig.set_maxvolume(softBodyConfig.maxVolume);   // Max volume
    
    // Set total mass and generate clusters
    rope.setTotalMass(softBodyConfig.mass, false);
    rope.generateClusters(4);
    rope.generateBendingConstraints(2);
    
    // Get nodes array
    const nodes = rope.get_m_nodes();
    const numNodes = nodes.size();
    
    // Validate and initialize node positions
    for (let i = 0; i < numNodes; i++) {
      const node = nodes.at(i);
      const pos = ammoPoints[i];
      
      if (!pos) {
        console.error(`Invalid position for node ${i}`);
        continue;
      }
      
      // Set node positions and previous positions
      node.set_m_x(pos);
      node.set_m_q(pos);
      
      // Set mass for internal nodes (fixed points get zero inverse mass)
      if (!fixedPoints.includes(i)) {
        const nodeMass = softBodyConfig.mass / numNodes;
        node.set_m_im(1.0 / nodeMass);
      } else {
        node.set_m_im(0);
      }
    }
    
    // Create anchors to rigid bodies
    if (frameBody && fixedPoints.includes(0)) {
      rope.appendAnchor(0, frameBody, true);
    }
    
    if (ballBody && fixedPoints.includes(numNodes - 1)) {
      rope.appendAnchor(numNodes - 1, ballBody, true);
    }
    
    // Add to physics world
    physicsWorld.addSoftBody(rope, 1, -1);
    softBodies.push(rope);
    
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