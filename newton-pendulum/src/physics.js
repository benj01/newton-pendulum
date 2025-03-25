// physics.js - Ammo.js physics integration
import * as THREE from 'three';

// Physics configuration
const config = {
  gravityConstant: -9.8,
  timeStep: 1/120,
  maxSubSteps: 10,
  ballMass: 2,
  ballRestitution: 0.95,
  ballFriction: 0.1,
  ballDamping: 0.1
};

// Physics variables
let physics;
let physicsWorld;
let tmpTrans;
let ammoTmpPos;
let ammoTmpQuat;
let ballBodies = [];
let frameBodies = [];
let constraints = [];
let stringBodies = [];
let stringConstraints = [];
let softBodies = [];
let softBodyHelpers = null;
let softBodyWorldInfo = null;

// Export physics instance
export function getPhysics() {
  return physics;
}

// Export ball bodies for interaction
export function getBallBodies() {
  return ballBodies;
}

// Initialize Ammo.js physics
// Modified portion of the initPhysics function in physics.js
export async function initPhysics() {
  // Create a loading message
  const loadingMsg = document.createElement('div');
  loadingMsg.style.position = 'absolute';
  loadingMsg.style.top = '50%';
  loadingMsg.style.left = '50%';
  loadingMsg.style.transform = 'translate(-50%, -50%)';
  loadingMsg.style.background = 'rgba(0, 0, 0, 0.7)';
  loadingMsg.style.color = 'white';
  loadingMsg.style.padding = '20px';
  loadingMsg.style.borderRadius = '10px';
  loadingMsg.style.zIndex = '1000';
  loadingMsg.textContent = 'Loading Physics Engine...';
  document.body.appendChild(loadingMsg);
  
  try {
    // Make sure Ammo is available globally from the script tag
    if (typeof Ammo === 'undefined') {
      throw new Error('Ammo.js is not loaded. Make sure it is included in the HTML.');
    }
    
    // We need to check if Ammo is a function or already instantiated
    if (typeof Ammo === 'function') {
      physics = await Ammo();
    } else {
      // Ammo is already instantiated
      physics = Ammo;
    }
    
    // Create temp transformation variables
    tmpTrans = new physics.btTransform();
    ammoTmpPos = new physics.btVector3();
    ammoTmpQuat = new physics.btQuaternion();
    
    // Check for soft body support more carefully
    let hasSoftBodySupport = false;
    try {
      hasSoftBodySupport = (
        typeof physics.btSoftBodyHelpers === 'function' && 
        typeof physics.btSoftBodyWorldInfo === 'function' &&
        typeof physics.btSoftRigidDynamicsWorld === 'function' &&
        typeof physics.btSoftBodyRigidBodyCollisionConfiguration === 'function'
      );
    } catch (e) {
      console.warn("Error checking for soft body support:", e);
      hasSoftBodySupport = false;
    }
    
    console.log("Soft body support:", hasSoftBodySupport);
    
    let dispatcher, broadphase, solver, softBodySolver;
    
    try {
      // Create the appropriate physics world based on soft body support
      if (hasSoftBodySupport) {
        // Create soft body physics world
        const collisionConfiguration = new physics.btSoftBodyRigidBodyCollisionConfiguration();
        dispatcher = new physics.btCollisionDispatcher(collisionConfiguration);
        broadphase = new physics.btDbvtBroadphase();
        solver = new physics.btSequentialImpulseConstraintSolver();
        softBodySolver = new physics.btDefaultSoftBodySolver();
        
        physicsWorld = new physics.btSoftRigidDynamicsWorld(
          dispatcher, broadphase, solver, collisionConfiguration, softBodySolver
        );
        
        // Initialize soft body world info right away
        softBodyWorldInfo = new physics.btSoftBodyWorldInfo();
        softBodyWorldInfo.set_m_broadphase(broadphase);
        softBodyWorldInfo.set_m_dispatcher(dispatcher);
        softBodyWorldInfo.set_m_gravity(new physics.btVector3(0, config.gravityConstant, 0));
        
        // Create soft body helpers
        softBodyHelpers = new physics.btSoftBodyHelpers();
        
        console.log("Soft body physics world created successfully");
      } else {
        // Create standard physics world with rigid bodies
        const collisionConfiguration = new physics.btDefaultCollisionConfiguration();
        dispatcher = new physics.btCollisionDispatcher(collisionConfiguration);
        broadphase = new physics.btDbvtBroadphase();
        solver = new physics.btSequentialImpulseConstraintSolver();
        physicsWorld = new physics.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
        
        console.log("Standard rigid body physics world created");
      }
      
      // Set gravity
      physicsWorld.setGravity(new physics.btVector3(0, config.gravityConstant, 0));
      
      // Try to set solver parameters for stability
      if (physicsWorld.getSolverInfo) {
        const solverInfo = physicsWorld.getSolverInfo();
        if (solverInfo) {
          solverInfo.m_numIterations = 10; // Increase solver iterations for more stability
          // Only set these if they exist to avoid errors
          if ('m_erp' in solverInfo) solverInfo.m_erp = 0.8;
          if ('m_erp2' in solverInfo) solverInfo.m_erp2 = 0.8;
        }
      }
    } catch (error) {
      console.error("Error creating physics world:", error);
      throw error;
    }
    
    // Remove loading message
    document.body.removeChild(loadingMsg);
    
    return { physicsWorld, physics, hasSoftBodySupport };
  } catch (error) {
    console.error('Error initializing Ammo.js:', error);
    loadingMsg.textContent = `Error loading physics engine: ${error.message}`;
    loadingMsg.style.background = 'rgba(255, 0, 0, 0.7)';
    
    return null;
  }
}

// Create physics bodies for the cradle
export function createPhysicsBodies(cradle) {
  // Clear any existing bodies
  ballBodies = [];
  frameBodies = [];
  constraints = [];
  
  // Create frame bodies
  for (let i = 0; i < cradle.frame.length; i++) {
    const frameObject = cradle.frame[i];
    const frameBody = createFrameBody(frameObject);
    frameBodies.push(frameBody);
  }
  
  // Create ball bodies (without old constraints)
  for (let i = 0; i < cradle.balls.length; i++) {
    const ball = cradle.balls[i];
    const ballBody = createBallBody(ball);
    ballBodies.push(ballBody);
  }

  // Create soft body strings that will handle the constraints
  createStringPhysics(cradle);
}

export function createStringPhysics(cradle) {
  // Clean up any existing string physics objects
  if (stringBodies.length > 0) {
    // Remove constraints first
    for (let i = 0; i < stringConstraints.length; i++) {
      if (stringConstraints[i]) {
        physicsWorld.removeConstraint(stringConstraints[i]);
      }
    }
    
    // Then remove bodies
    for (let i = 0; i < stringBodies.length; i++) {
      if (stringBodies[i]) {
        physicsWorld.removeRigidBody(stringBodies[i]);
      }
    }
    
    stringBodies = [];
    stringConstraints = [];
  }
  
  // Clear any existing soft bodies
  clearSoftBodies();
  
  // Initialize soft body physics if not already done
  if (!softBodyHelpers || !softBodyWorldInfo) {
    const softBodyInitialized = initSoftBodyPhysics();
    if (!softBodyInitialized) {
      console.warn("Could not initialize soft body physics, falling back to rigid body strings");
      // Fall back to the original implementation by returning here
      return createRigidBodyStrings(cradle);
    }
  }
  
  // Configuration for soft body ropes
  const segmentsPerString = 8;
  
  // Create a rope for each ball
  for (let ballIndex = 0; ballIndex < ballBodies.length; ballIndex++) {
    const ballBody = ballBodies[ballIndex];
    const ball = ballBody.threeObject;
    
    // Get attachment points
    const frameTopY = cradle.frame[0].position.y; // Top bar Y position
    
    // Create attachment points
    const startPoint = new THREE.Vector3(ball.position.x, frameTopY, 0);
    const endPoint = new THREE.Vector3(ball.position.x, ball.position.y + ball.geometry.parameters.radius, 0);
    
    // Get the top frame body
    const frameBody = frameBodies[0]; // Use the first frame body (top bar)
    
    // Create soft body rope with proper anchoring
    createSoftBodyRope(startPoint, endPoint, segmentsPerString, [0, 1], frameBody, ballBody);
  }
  
  return {
    softBodies: softBodies
  };
}

// Fallback to rigid body strings if soft body isn't supported
function createRigidBodyStrings(cradle) {
  console.warn("Using rigid body fallback for strings");
  
  // Configuration for string segments
  const segmentsPerString = 8;
  const stringSegmentMass = 0.01; // Very light segments
  const stringSegmentRadius = 0.03;
  
  // Create string segments and constraints for each ball
  for (let ballIndex = 0; ballIndex < ballBodies.length; ballIndex++) {
    const ballBody = ballBodies[ballIndex];
    const ball = ballBody.threeObject;
    
    // Calculate positions for string segments
    const frameTopY = cradle.frame[0].position.y; 
    const topY = frameTopY; 
    const bottomY = ball.position.y + ball.geometry.parameters.radius;
    const segmentHeight = (topY - bottomY) / segmentsPerString;
    
    // Array to store this string's bodies
    const currentStringBodies = [];
    
    // Create the top fixed anchor point (static body)
    const anchorShape = new physics.btSphereShape(0.05);
    const anchorTransform = new physics.btTransform();
    anchorTransform.setIdentity();
    anchorTransform.setOrigin(new physics.btVector3(ball.position.x, topY, 0));
    
    const anchorMotionState = new physics.btDefaultMotionState(anchorTransform);
    const anchorBody = new physics.btRigidBody(
      new physics.btRigidBodyConstructionInfo(
        0, // Mass of 0 makes it static
        anchorMotionState,
        anchorShape,
        new physics.btVector3(0, 0, 0)
      )
    );
    
    // Make sure the anchor is properly static
    anchorBody.setCollisionFlags(anchorBody.getCollisionFlags() | 2); // CF_KINEMATIC_OBJECT
    
    physicsWorld.addRigidBody(anchorBody);
    currentStringBodies.push(anchorBody);
    
    // Create each segment as a physical body
    let prevBody = anchorBody;
    
    for (let i = 0; i < segmentsPerString; i++) {
      // Create segment shape
      const segmentShape = new physics.btCapsuleShape(
        stringSegmentRadius, 
        segmentHeight * 0.8 
      );
      
      // Calculate segment position (top down)
      const segmentY = topY - (i + 0.5) * segmentHeight;
      const segmentTransform = new physics.btTransform();
      segmentTransform.setIdentity();
      segmentTransform.setOrigin(new physics.btVector3(ball.position.x, segmentY, 0));
      
      // Create motion state
      const segmentMotionState = new physics.btDefaultMotionState(segmentTransform);
      
      // Calculate inertia
      const segmentInertia = new physics.btVector3(0, 0, 0);
      segmentShape.calculateLocalInertia(stringSegmentMass, segmentInertia);
      
      // Create rigid body
      const segmentBody = new physics.btRigidBody(
        new physics.btRigidBodyConstructionInfo(
          stringSegmentMass,
          segmentMotionState,
          segmentShape,
          segmentInertia
        )
      );
      
      // Set physical properties for string behavior
      segmentBody.setRestitution(0.1);
      segmentBody.setFriction(0.9);
      segmentBody.setDamping(0.9, 0.9);
      segmentBody.setActivationState(4); // DISABLE_DEACTIVATION
      
      // Add to world
      physicsWorld.addRigidBody(segmentBody);
      currentStringBodies.push(segmentBody);
      
      // Create constraint connecting to previous segment
      const pivotInPrev = new physics.btVector3(0, -segmentHeight/2, 0);
      const pivotInCurrent = new physics.btVector3(0, segmentHeight/2, 0);
      
      const constraint = new physics.btPoint2PointConstraint(
        prevBody,
        segmentBody,
        pivotInPrev,
        pivotInCurrent
      );
      
      physicsWorld.addConstraint(constraint, true);
      stringConstraints.push(constraint);
      
      prevBody = segmentBody;
    }
    
    // Connect the last segment to the ball
    const lastSegment = currentStringBodies[currentStringBodies.length - 1];
    
    const pivotInLastSegment = new physics.btVector3(0, -segmentHeight/2, 0);
    const pivotInBall = new physics.btVector3(0, ball.geometry.parameters.radius, 0);
    
    const ballConstraint = new physics.btPoint2PointConstraint(
      lastSegment,
      ballBody,
      pivotInLastSegment,
      pivotInBall
    );
    
    physicsWorld.addConstraint(ballConstraint, true);
    stringConstraints.push(ballConstraint);
    
    stringBodies.push(...currentStringBodies);
  }
  
  return {
    bodies: stringBodies,
    constraints: stringConstraints
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

    // Create soft body world info
    softBodyWorldInfo = new physics.btSoftBodyWorldInfo();
    softBodyWorldInfo.set_m_broadphase(physicsWorld.getBroadphase());
    softBodyWorldInfo.set_m_dispatcher(physicsWorld.getDispatcher());
    softBodyWorldInfo.set_m_gravity(physicsWorld.getGravity());
    
    // Create soft body helpers
    softBodyHelpers = new physics.btSoftBodyHelpers();
    
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
    
    // Configure rope properties
    const sbConfig = rope.get_m_cfg();
    sbConfig.set_kDP(0.005);           // Damping coefficient
    sbConfig.set_kLF(0.05);            // Lift coefficient
    sbConfig.set_kPR(10);              // Pressure coefficient
    sbConfig.set_kVC(20);              // Volume conservation coefficient
    sbConfig.set_kDF(0.2);             // Dynamic friction coefficient
    sbConfig.set_kMT(0.05);            // Pose matching coefficient
    sbConfig.set_kCHR(1.0);            // Rigid contact hardness
    sbConfig.set_kKHR(0.8);            // Kinetic contact hardness
    sbConfig.set_kSHR(1.0);            // Soft contact hardness
    sbConfig.set_maxvolume(1.0);       // Maximum volume ratio
    
    // Set mass per node (lower = less stretchiness)
    rope.setTotalMass(0.1, false);     // Low mass, distribute across nodes
    
    // Fix specified points and create anchors
    if (fixedPoints.includes(0) && frameBody) {
      rope.setMass(0, 0);              // First point is fixed (massless)
      // Anchor to frame
      const frameAnchor = new physics.btSoftBody.Anchor();
      frameAnchor.set_m_node(rope.get_m_nodes().at(0));
      frameAnchor.set_m_body(frameBody);
      frameAnchor.set_m_influence(1.0);
      rope.appendAnchor(0, frameBody, false);
    }
    
    if (fixedPoints.includes(1) && ballBody) {
      rope.setMass(numSegments - 1, 0);    // Last point is fixed (massless)
      // Anchor to ball
      const ballAnchor = new physics.btSoftBody.Anchor();
      ballAnchor.set_m_node(rope.get_m_nodes().at(numSegments - 1));
      ballAnchor.set_m_body(ballBody);
      ballAnchor.set_m_influence(1.0);
      rope.appendAnchor(numSegments - 1, ballBody, false);
    }
    
    // Add rope to the physics world
    physicsWorld.addSoftBody(rope);
    softBodies.push(rope);
    
    return rope;
  } catch (error) {
    console.error("Error creating soft body rope:", error);
    return null;
  }
}

// Clear all soft bodies
function clearSoftBodies() {
  if (!physicsWorld) return;
  
  // Remove each soft body from physics world
  for (let i = 0; i < softBodies.length; i++) {
    if (softBodies[i]) {
      try {
        physicsWorld.removeSoftBody(softBodies[i]);
      } catch (error) {
        console.error("Error removing soft body:", error);
      }
    }
  }
  
  // Clear array
  softBodies = [];
}

// Create a rigid body for a ball
function createBallBody(ball) {
  // Create collision shape
  const shape = new physics.btSphereShape(ball.geometry.parameters.radius);
  shape.setMargin(0.01); // Reduce collision margin for more precise contacts
  
  // Set position
  const transform = new physics.btTransform();
  transform.setIdentity();
  transform.setOrigin(new physics.btVector3(
    ball.position.x,
    ball.position.y,
    0 // Ensure Z is exactly 0
  ));
  
  // Calculate inertia
  const mass = config.ballMass;
  const localInertia = new physics.btVector3(0, 0, 0);
  shape.calculateLocalInertia(mass, localInertia);
  
  // Create motion state
  const motionState = new physics.btDefaultMotionState(transform);
  
  // Create rigid body
  const rbInfo = new physics.btRigidBodyConstructionInfo(
    mass, motionState, shape, localInertia
  );
  const body = new physics.btRigidBody(rbInfo);
  
  // Now that body is defined, we can set properties
  body.setLinearFactor(new physics.btVector3(1, 1, 0)); // Allow movement only in X and Y directions
  
  // Increase damping to prevent unwanted movement
  body.setDamping(0.2, 0.2);
  body.setRestitution(0.95); // Higher restitution for more elastic bounces
  body.setFriction(0.1);     // Lower friction for smooth surfaces
  
  // Prevent balls from sleeping when they appear to stop
  body.setActivationState(4); // DISABLE_DEACTIVATION
  
  // Store reference to visual object
  body.threeObject = ball;
  
  // Add to physics world
  physicsWorld.addRigidBody(body);
  
  return body;
}

// Create a rigid body for a frame piece
function createFrameBody(frameObject) {
  // Get size from the object's geometry
  const geometry = frameObject.geometry;
  const parameters = geometry.parameters;
  
  // Create shape based on the object's geometry
  const shape = new physics.btBoxShape(new physics.btVector3(
    parameters.width / 2,
    parameters.height / 2,
    parameters.depth / 2
  ));
  shape.setMargin(0.05);
  
  // Set position and rotation
  const transform = new physics.btTransform();
  transform.setIdentity();
  transform.setOrigin(new physics.btVector3(
    frameObject.position.x,
    frameObject.position.y,
    frameObject.position.z
  ));
  
  // Create motion state
  const motionState = new physics.btDefaultMotionState(transform);
  
  // Create rigid body (static - mass = 0)
  const rbInfo = new physics.btRigidBodyConstructionInfo(
    0, // Mass of 0 makes it static
    motionState,
    shape,
    new physics.btVector3(0, 0, 0) // No inertia for static objects
  );
  const body = new physics.btRigidBody(rbInfo);
  
  // Store reference to visual object
  body.threeObject = frameObject;
  
  // Add to physics world
  physicsWorld.addRigidBody(body);
  
  return body;
}

// Create a roof point for attaching constraints
function createRoofPoint(x, y, z) {
  // Create a small shape for the roof point
  const shape = new physics.btSphereShape(0.1);
  
  // Set position
  const transform = new physics.btTransform();
  transform.setIdentity();
  transform.setOrigin(new physics.btVector3(x, y, z));
  
  // Create motion state
  const motionState = new physics.btDefaultMotionState(transform);
  
  // Create rigid body (static - mass = 0)
  const rbInfo = new physics.btRigidBodyConstructionInfo(
    0, // Mass of 0 makes it static
    motionState,
    shape,
    new physics.btVector3(0, 0, 0) // No inertia for static objects
  );
  const body = new physics.btRigidBody(rbInfo);
  
  // Make it kinematic
  body.setCollisionFlags(body.getCollisionFlags() | 2); // CF_KINEMATIC_OBJECT
  body.setActivationState(4); // DISABLE_DEACTIVATION
  
  // Add to physics world
  physicsWorld.addRigidBody(body);
  
  return body;
}

// Create a constraint between a ball and a roof point
function createConstraint(ballBody, roofBody, ballObject) {
  // Define pivot points
  const pivotInBall = new physics.btVector3(0, ballObject.geometry.parameters.radius, 0);
  const pivotInRoof = new physics.btVector3(0, 0, 0);
  
  // Create the constraint
  const constraint = new physics.btPoint2PointConstraint(
    ballBody,
    roofBody,
    pivotInBall,
    pivotInRoof
  );
  
  // Add to physics world
  physicsWorld.addConstraint(constraint, true);
  
  return constraint;
}

// Step the physics simulation
export function stepPhysics(deltaTime) {
  if (physicsWorld) {
    physicsWorld.stepSimulation(deltaTime, config.maxSubSteps, config.timeStep);
  }
}

// Synchronize Three.js objects with physics objects
export function syncPhysicsObjects() {
  // Update ball positions and rotations
  for (let i = 0; i < ballBodies.length; i++) {
    const body = ballBodies[i];
    const ball = body.threeObject;
    
    // Get updated transform
    const motionState = body.getMotionState();
    motionState.getWorldTransform(tmpTrans);
    
    // Get position and rotation
    const position = tmpTrans.getOrigin();
    const rotation = tmpTrans.getRotation();
    
    // Update Three.js object
    ball.position.set(position.x(), position.y(), position.z());
    ball.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
  }
}

export function updateStringPhysics(cradle) {
  // Get visual string segments
  const visualStrings = cradle.strings;
  
  // Sync physics string segments to visual representation
  let bodyIndex = 0;
  
  for (let stringIndex = 0; stringIndex < visualStrings.length; stringIndex++) {
    const segments = visualStrings[stringIndex];
    
    // Skip the anchor body (first body in each string)
    bodyIndex++;
    
    // Update each segment in the string
    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
      if (bodyIndex < stringBodies.length) {
        const body = stringBodies[bodyIndex];
        const visualSegment = segments[segmentIndex];
        
        // Get physics transform
        const motionState = body.getMotionState();
        motionState.getWorldTransform(tmpTrans);
        
        // Get position and rotation
        const position = tmpTrans.getOrigin();
        const rotation = tmpTrans.getRotation();
        
        // Update visual segment
        visualSegment.position.set(position.x(), position.y(), position.z());
        visualSegment.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
        
        bodyIndex++;
      }
    }
  }
}

// Apply an impulse to a ball
export function applyImpulse(ballIndex, impulseVector) {
  if (ballIndex >= 0 && ballIndex < ballBodies.length) {
    const body = ballBodies[ballIndex];
    
    // Create impulse vector
    const impulse = new physics.btVector3(
      impulseVector.x,
      impulseVector.y,
      impulseVector.z
    );
    
    // Apply the impulse
    body.applyImpulse(impulse, new physics.btVector3(0, 0, 0));
    
    // Make sure the body is active
    body.activate();
  }
}

// New function to update soft body strings
export function updateSoftBodyStrings(cradle) {
  if (softBodies.length === 0) {
    // No soft bodies, use the original string update
    return updateStringPhysics(cradle);
  }
  
  // Get visual strings
  const visualStrings = cradle.strings;
  
  // Update each soft body rope
  for (let i = 0; i < softBodies.length && i < visualStrings.length; i++) {
    const softBody = softBodies[i];
    const string = visualStrings[i][0]; // Get the single string object
    
    if (!softBody || !string) continue;
    
    try {
      // Get the first and last nodes of the soft body
      const firstNode = softBody.get_m_nodes().at(0);
      const lastNode = softBody.get_m_nodes().at(softBody.get_m_nodes().size() - 1);
      
      const startPos = firstNode.get_m_x();
      const endPos = lastNode.get_m_x();
      
      // Calculate the direction and length of the string
      const direction = new THREE.Vector3(
        endPos.x() - startPos.x(),
        endPos.y() - startPos.y(),
        endPos.z() - startPos.z()
      );
      
      const length = direction.length();
      
      if (length > 0.01) {
        // Update string position to midpoint between nodes
        string.position.set(
          (startPos.x() + endPos.x()) / 2,
          (startPos.y() + endPos.y()) / 2,
          (startPos.z() + endPos.z()) / 2
        );
        
        // Update string rotation to point in the right direction
        direction.normalize();
        const up = new THREE.Vector3(0, 1, 0);
        string.quaternion.setFromUnitVectors(up, direction);
        
        // Update string length
        string.scale.y = length / string.geometry.parameters.height;
      }
    } catch (error) {
      console.error(`Error updating soft body string ${i}:`, error);
    }
  }
}