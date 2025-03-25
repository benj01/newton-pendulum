import * as THREE from 'three';
import { physics, physicsWorld, softBodyHelpers, softBodyWorldInfo } from './core.js';
import { physicsConfig } from '../config/physics.js';

// Store soft bodies
let softBodies = [];

// Create soft body strings that will handle the constraints
export function createStringPhysics(cradle) {
  // Clean up any existing string physics objects
  if (softBodies.length > 0) {
    clearSoftBodies();
  }
  
  // Initialize soft body physics if not already done
  if (!softBodyHelpers || !softBodyWorldInfo) {
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
    if (!softBodyWorldInfo) {
      softBodyWorldInfo = new physics.btSoftBodyWorldInfo();
      softBodyWorldInfo.set_m_broadphase(physicsWorld.getBroadphase());
      softBodyWorldInfo.set_m_dispatcher(physicsWorld.getDispatcher());
      softBodyWorldInfo.set_m_gravity(physicsWorld.getGravity());
    }
    
    // Create soft body helpers if not already created
    if (!softBodyHelpers) {
      softBodyHelpers = new physics.btSoftBodyHelpers();
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
  if (!softBodyHelpers || !softBodyWorldInfo) {
    console.error("Soft body helpers not initialized");
    return null;
  }

  try {
    // Convert Three.js Vector3 to Ammo.js btVector3
    const startVec = new physics.btVector3(startPoint.x, startPoint.y, startPoint.z);
    const endVec = new physics.btVector3(endPoint.x, endPoint.y, endPoint.z);
    
    // Create rope soft body
    const rope = softBodyHelpers.CreateRope(
      softBodyWorldInfo,
      startVec,      // Start position
      endVec,        // End position
      numSegments,   // Number of segments
      0              // Flag (0 for normal)
    );
    
    // Initialize all nodes with valid positions
    const nodes = rope.get_m_nodes();
    const numNodes = nodes.size();
    
    // Create a linear interpolation between start and end points
    const step = 1.0 / (numNodes - 1);
    
    for (let i = 0; i < numNodes; i++) {
      const node = nodes.at(i);
      const t = i * step; // Interpolation factor (0 to 1)
      
      // Linear interpolation between start and end
      const x = startPoint.x + (endPoint.x - startPoint.x) * t;
      const y = startPoint.y + (endPoint.y - startPoint.y) * t;
      const z = startPoint.z + (endPoint.z - startPoint.z) * t;
      
      // Set initial position using btVector3
      const pos = new physics.btVector3(x, y, z);
      node.set_m_x(pos);
      
      // Also set the previous position (m_q) to the same value to prevent initial velocity
      node.set_m_q(pos);
      
      // Ensure non-zero mass for internal nodes (if they should be simulated)
      if (!fixedPoints.includes(i)) {
        node.set_m_im(1.0 / (physicsConfig.softBody.mass / numNodes));
      }
    }
    
    // Configure rope properties
    const sbConfig = rope.get_m_cfg();
    sbConfig.set_kDP(physicsConfig.softBody.damping);             // Damping coefficient
    sbConfig.set_kLF(physicsConfig.softBody.lift);                // Lift coefficient
    sbConfig.set_kPR(physicsConfig.softBody.pressure);            // Pressure coefficient
    sbConfig.set_kVC(physicsConfig.softBody.volumeConservation);  // Volume conservation coefficient
    sbConfig.set_kDF(physicsConfig.softBody.dynamicFriction);     // Dynamic friction coefficient
    sbConfig.set_kMT(physicsConfig.softBody.poseMatching);        // Pose matching coefficient
    sbConfig.set_kCHR(physicsConfig.softBody.contactHardness);    // Rigid contact hardness
    sbConfig.set_kKHR(physicsConfig.softBody.kineticHardness);    // Kinetic contact hardness
    sbConfig.set_kSHR(physicsConfig.softBody.softHardness);       // Soft contact hardness
    sbConfig.set_maxvolume(physicsConfig.softBody.maxVolume);     // Maximum volume ratio
    
    // Set mass per node (lower = less stretchiness)
    rope.setTotalMass(physicsConfig.softBody.mass, false);
    
    // Fix specified points and create anchors
    if (fixedPoints.includes(0) && frameBody) {
      // Anchor to frame - first node
      rope.setMass(0, 0);              // First point is fixed (massless)
      rope.appendAnchor(0, frameBody, false, 1.0);
    }
    
    if (fixedPoints.includes(1) && ballBody) {
      // Get the ball's radius for proper attachment point
      const lastNode = rope.get_m_nodes().at(numSegments - 1);
      lastNode.set_m_x(new physics.btVector3(
        endPoint.x,
        endPoint.y,
        endPoint.z
      ));
      
      // Anchor to ball - last node
      rope.appendAnchor(numSegments - 1, ballBody, false, 1.0);
    }
    
    // Add rope to the physics world
    physicsWorld.addSoftBody(rope, 1, -1);  // Add to default collision groups
    rope.setTotalMass(physicsConfig.softBody.mass, true);  // Recompute mass with new configuration
    softBodies.push(rope);
    
    return rope;
  } catch (error) {
    console.error("Error creating soft body rope:", error);
    return null;
  }
}

// Clear all soft bodies
export function clearSoftBodies() {
  if (!physicsWorld) return;
  
  // Remove each soft body from physics world
  for (const softBody of softBodies) {
    if (softBody) {
      try {
        physicsWorld.removeSoftBody(softBody);
      } catch (error) {
        console.error("Error removing soft body:", error);
      }
    }
  }
  
  // Clear array
  softBodies = [];
}

// Update soft body strings
export function updateSoftBodyStrings(cradle) {
  if (!cradle || softBodies.length === 0) return;
  
  // Get visual strings and top frame
  const strings = cradle.children.filter(child => child.name.startsWith('string_'));
  const balls = cradle.children.filter(child => child.name.startsWith('ball_'));
  const topFrame = cradle.children.find(child => child.name === 'frame_top');
  
  if (!topFrame) {
    console.error("Top frame not found in cradle");
    return;
  }
  
  // Update each soft body rope
  for (let i = 0; i < softBodies.length && i < strings.length && i < balls.length; i++) {
    const softBody = softBodies[i];
    const string = strings[i];
    const ball = balls[i];  // Get the corresponding ball
    
    if (!softBody || !string || !ball) {
      console.warn(`Missing objects for string ${i}`);
      continue;
    }
    
    try {
      // Get nodes from soft body
      const nodes = softBody.get_m_nodes();
      const numNodes = nodes.size();
      
      if (numNodes === 0) continue;
      
      // Create positions array for the line segments
      const positions = new Float32Array(numNodes * 3);
      let hasValidPositions = false;
      
      // Update positions from soft body nodes
      for (let j = 0; j < numNodes; j++) {
        const node = nodes.at(j);
        const pos = node.get_m_x();
        
        // Check for valid values
        const x = pos.x();
        const y = pos.y();
        const z = pos.z();
        
        if (isFinite(x) && isFinite(y) && isFinite(z)) {
          positions[j * 3] = x;
          positions[j * 3 + 1] = y;
          positions[j * 3 + 2] = z;
          hasValidPositions = true;
        } else {
          console.warn(`Invalid node position detected at index ${j}`);
          
          // Use last known good position or fallback to initial position
          if (j > 0 && isFinite(positions[(j-1) * 3])) {
            // Use previous node position as fallback
            positions[j * 3] = positions[(j-1) * 3];
            positions[j * 3 + 1] = positions[(j-1) * 3 + 1];
            positions[j * 3 + 2] = positions[(j-1) * 3 + 2];
          } else {
            // Fallback to a position based on the string's endpoints
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
      
      // Only update the geometry if we have at least some valid positions
      if (hasValidPositions) {
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
      } else {
        console.error(`No valid positions found for soft body string ${i}`);
        string.visible = false;
      }
      
    } catch (error) {
      console.error(`Error updating soft body string ${i}:`, error);
      if (string) {
        string.visible = false; // Hide string on error
      }
    }
  }
} 