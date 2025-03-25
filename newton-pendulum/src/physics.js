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

// Export physics instance
export function getPhysics() {
  return physics;
}

// Export ball bodies for interaction
export function getBallBodies() {
  return ballBodies;
}

// Initialize Ammo.js physics
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
    
    // Create physics world configuration
    const collisionConfiguration = new physics.btDefaultCollisionConfiguration();
    const dispatcher = new physics.btCollisionDispatcher(collisionConfiguration);
    const broadphase = new physics.btDbvtBroadphase();
    const solver = new physics.btSequentialImpulseConstraintSolver();
    physicsWorld = new physics.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
    
    // Set gravity
    physicsWorld.setGravity(new physics.btVector3(0, config.gravityConstant, 0));
    
    // Remove loading message
    document.body.removeChild(loadingMsg);
    
    return { physicsWorld, physics };
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
  
  // Create ball bodies and constraints
  for (let i = 0; i < cradle.balls.length; i++) {
    const ball = cradle.balls[i];
    
    // Create ball body
    const ballBody = createBallBody(ball);
    ballBodies.push(ballBody);
    
    // Create ceiling anchor point (for constraint)
    const roofPoint = createRoofPoint(ball.position.x, ball.position.y + 6, 0);
    
    // Create constraint between ball and roof point
    const constraint = createConstraint(ballBody, roofPoint, ball);
    constraints.push(constraint);
  }
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
  
  // Configuration for string segments
  const segmentsPerString = 8;
  const stringSegmentMass = 0.01; // Very light segments
  const stringSegmentRadius = 0.03;
  
  // Create string segments and constraints for each ball
  for (let ballIndex = 0; ballIndex < ballBodies.length; ballIndex++) {
    const ballBody = ballBodies[ballIndex];
    const ball = ballBody.threeObject;
    
    // Calculate positions for string segments
    const topY = ball.position.y + 6; // Top attachment point
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
    
    physicsWorld.addRigidBody(anchorBody);
    currentStringBodies.push(anchorBody);
    
    // Create each segment as a physical body
    let prevBody = anchorBody;
    
    for (let i = 0; i < segmentsPerString; i++) {
      // Create segment shape
      const segmentShape = new physics.btCapsuleShape(
        stringSegmentRadius, // radius
        segmentHeight * 0.8 // height (slightly shorter to allow for bending)
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
      segmentBody.setRestitution(0.1); // Not very bouncy
      segmentBody.setFriction(0.9);    // High friction
      segmentBody.setDamping(0.7, 0.7); // Quite a bit of damping
      
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
      
      // Make the constraint a bit stiff but still allow bending
      if (constraint.setting) {
        constraint.setting.set_m_tau(0.3); // lower = more responsive
        constraint.setting.set_m_damping(0.7); // higher = more damping
      }
      
      physicsWorld.addConstraint(constraint, true);
      stringConstraints.push(constraint);
      
      // Current becomes previous for next iteration
      prevBody = segmentBody;
    }
    
    // Finally, connect the last segment to the ball
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
    
    // Add all bodies of this string to the main array
    stringBodies.push(...currentStringBodies);
  }
  
  return {
    bodies: stringBodies,
    constraints: stringConstraints
  };
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
    ball.position.z
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
  
  // Set physical properties for metal-like behavior
  body.setRestitution(0.95); // Higher restitution for more elastic bounces
  body.setFriction(0.1);     // Lower friction for smooth surfaces
  body.setDamping(0.1, 0.1); // Minimal damping for better energy conservation
  // Remove these unsupported methods:
  // body.setRollingFriction(0.0); 
  // body.setSpinningFriction(0.0);
  
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