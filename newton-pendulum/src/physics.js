// physics.js - Responsible for Ammo.js physics simulation

import * as THREE from 'three';
// Ammo.js is imported as a global in index.html, not as an ES module

// Physics configuration
const config = {
  gravity: -9.81,
  timeStep: 1/60, 
  maxSubSteps: 5,
  ballMass: 1,
  frameMass: 0,  // 0 = static object
  ballRadius: 0.5,
  restitution: 0.9, // Bounciness
  friction: 0.5,
  linearDamping: 0.05,
  angularDamping: 0.05,
  ballSpacing: 0.1,
  numberOfBalls: 5,
  frameHeight: 4,
  stringLength: 3
};

// Physics variables
let AmmoLib; // Changed from 'Ammo' to 'AmmoLib' to avoid naming conflict
let physicsWorld;
let tmpTransform;
let ballBodies = [];
let frameBody;
let constraints = [];
let rigidBodies = [];

// Raycasting variables for interaction
let ballSelected = null;
let mouseConstraint = null;
let dragPoint = new THREE.Vector3();

/**
 * Initialize the Ammo.js physics engine
 */
export async function initPhysics() {
  console.log("Initializing Ammo.js physics");
  
  // Initialize Ammo.js
  return new Promise((resolve) => {
    // Check if Ammo is already loaded via the script tag
    if (typeof Ammo !== 'undefined') {
      console.log("Ammo.js is already loaded from script tag");
      AmmoLib = Ammo;
      setupPhysicsWorld();
      console.log("Ammo.js initialized successfully");
      resolve();
    } else {
      console.error("Ammo.js is not loaded. Make sure it's included in the HTML.");
      resolve(); // Resolve anyway to prevent hanging
    }
  });
}

/**
 * Setup the physics world with proper configuration
 */
function setupPhysicsWorld() {
  // Configure collision detection
  const collisionConfiguration = new AmmoLib.btDefaultCollisionConfiguration();
  const dispatcher = new AmmoLib.btCollisionDispatcher(collisionConfiguration);
  const broadphase = new AmmoLib.btDbvtBroadphase();
  const solver = new AmmoLib.btSequentialImpulseConstraintSolver();
  
  // Create the physics world
  physicsWorld = new AmmoLib.btDiscreteDynamicsWorld(
    dispatcher, broadphase, solver, collisionConfiguration
  );
  
  // Set gravity
  physicsWorld.setGravity(new AmmoLib.btVector3(0, config.gravity, 0));
  
  // Create temporary transform for object creation
  tmpTransform = new AmmoLib.btTransform();
}

/**
 * Create the cradle in the physics world
 */
export function createPhysicsCradle(threeBalls, threeFrame) {
  // Create the frame (static object)
  createFrameBody(threeFrame);
  
  // Create each ball and its string constraint
  ballBodies = [];
  constraints = [];
  
  for (let i = 0; i < threeBalls.length; i++) {
    const ball = threeBalls[i];
    
    // Create the ball's rigid body
    const ballBody = createBallBody(ball);
    ballBodies.push(ballBody);
    
    // Create constraint between ball and frame
    const constraint = createStringConstraint(ballBody, ball.position);
    constraints.push(constraint);
  }
}

/**
 * Create a rigid body for a ball
 */
function createBallBody(ball) {
  // Extract position from Three.js object
  const pos = ball.position;
  
  // Create collision shape
  const shape = new AmmoLib.btSphereShape(config.ballRadius);
  shape.setMargin(0.05);
  
  // Calculate inertia
  const localInertia = new AmmoLib.btVector3(0, 0, 0);
  if (config.ballMass > 0) {
    shape.calculateLocalInertia(config.ballMass, localInertia);
  }
  
  // Create motion state
  tmpTransform.setIdentity();
  tmpTransform.setOrigin(new AmmoLib.btVector3(pos.x, pos.y, pos.z));
  const motionState = new AmmoLib.btDefaultMotionState(tmpTransform);
  
  // Create rigid body
  const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
    config.ballMass, motionState, shape, localInertia
  );
  const body = new AmmoLib.btRigidBody(rbInfo);
  
  // Set damping to reduce movement over time
  body.setDamping(config.linearDamping, config.angularDamping);
  
  // Set restitution (bounciness)
  body.setRestitution(config.restitution);
  
  // Set friction
  body.setFriction(config.friction);
  
  // Add to physics world
  physicsWorld.addRigidBody(body);
  
  // Store the Three.js mesh reference
  body.threeObject = ball;
  
  // Add to rigid bodies array for sync
  rigidBodies.push(body);
  
  return body;
}

/**
 * Create a rigid body for the frame
 */
function createFrameBody(frame) {
  // Extract position from Three.js object
  const pos = frame.position;
  
  // Create box shape for the frame
  // Get dimensions from the frame geometry
  const halfExtents = new AmmoLib.btVector3(
    config.frameWidth / 2,
    config.frameThickness / 2,
    config.frameThickness / 2
  );
  const shape = new AmmoLib.btBoxShape(halfExtents);
  shape.setMargin(0.05);
  
  // Create transform
  tmpTransform.setIdentity();
  tmpTransform.setOrigin(new AmmoLib.btVector3(pos.x, pos.y, pos.z));
  const motionState = new AmmoLib.btDefaultMotionState(tmpTransform);
  
  // Create rigid body (static - mass = 0)
  const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
    config.frameMass, motionState, shape, new AmmoLib.btVector3(0, 0, 0)
  );
  frameBody = new AmmoLib.btRigidBody(rbInfo);
  
  // Make static by disabling dynamics
  if (config.frameMass === 0) {
    frameBody.setCollisionFlags(frameBody.getCollisionFlags() | 1); // CF_STATIC_OBJECT
  }
  
  // Add to physics world
  physicsWorld.addRigidBody(frameBody);
  
  // Store the Three.js mesh reference
  frameBody.threeObject = frame;
  
  return frameBody;
}

/**
 * Create a constraint (string) between a ball and the frame
 */
function createStringConstraint(ballBody, ballPosition) {
  // Calculate pivot points
  // Frame pivot is directly above the ball
  const framePivot = new AmmoLib.btVector3(
    ballPosition.x, 
    0, 
    0
  );
  
  // Ball pivot is at the top of the ball
  const ballPivot = new AmmoLib.btVector3(
    0, 
    config.ballRadius, 
    0
  );
  
  // Create point-to-point constraint (string)
  const constraint = new AmmoLib.btPoint2PointConstraint(
    frameBody,
    ballBody,
    framePivot,
    ballPivot
  );
  
  // Add soft constraint parameters
  const constraintParams = constraint.getConstraintParameter();
  if (constraintParams) {
    // These parameters control how rigid/soft the constraint is
    constraintParams.m_tau = 0.3; // Softness
    constraintParams.m_damping = 0.1; // Damping
  }
  
  // Add to physics world
  physicsWorld.addConstraint(constraint, true);
  
  return constraint;
}

/**
 * Step the physics simulation
 */
export function stepSimulation(deltaTime) {
  if (physicsWorld) {
    physicsWorld.stepSimulation(deltaTime, config.maxSubSteps, config.timeStep);
  }
}

/**
 * Synchronize Three.js objects with physics objects
 */
export function updatePhysicsObjects() {
  for (let i = 0; i < rigidBodies.length; i++) {
    const objPhys = rigidBodies[i];
    const objThree = objPhys.threeObject;
    
    if (objThree) {
      // Get object transformation from physics
      const motionState = objPhys.getMotionState();
      if (motionState) {
        motionState.getWorldTransform(tmpTransform);
        
        const pos = tmpTransform.getOrigin();
        const quat = tmpTransform.getRotation();
        
        // Update Three.js object
        objThree.position.set(pos.x(), pos.y(), pos.z());
        objThree.quaternion.set(quat.x(), quat.y(), quat.z(), quat.w());
      }
    }
  }
}

/**
 * Apply an impulse to a ball
 */
export function applyImpulse(ballIndex, impulse) {
  if (ballIndex >= 0 && ballIndex < ballBodies.length) {
    const ball = ballBodies[ballIndex];
    
    // Apply central impulse (force through center of mass)
    ball.applyCentralImpulse(
      new AmmoLib.btVector3(impulse.x, impulse.y, impulse.z)
    );
    
    // Activate the body to make sure it responds to the impulse
    ball.activate();
  }
}

/**
 * Handle starting to drag a ball with mouse/touch
 */
export function startDrag(ballIndex, dragPos, camera) {
  if (ballIndex >= 0 && ballIndex < ballBodies.length) {
    ballSelected = ballBodies[ballIndex];
    
    // Store drag point for reference
    dragPoint.copy(dragPos);
    
    // Create a temporary pivot constraint for dragging
    const bodyPos = ballSelected.threeObject.position;
    const pivotInA = new AmmoLib.btVector3(0, 0, 0);
    const pivotInB = new AmmoLib.btVector3(
      dragPos.x - bodyPos.x,
      dragPos.y - bodyPos.y,
      dragPos.z - bodyPos.z
    );
    
    // Create temporary transform for drag pivot
    const tempTransform = new AmmoLib.btTransform();
    tempTransform.setIdentity();
    tempTransform.setOrigin(new AmmoLib.btVector3(dragPos.x, dragPos.y, dragPos.z));
    
    // Create ghost body for mouse constraint
    const ghostShape = new AmmoLib.btSphereShape(0.01);
    const ghostBody = new AmmoLib.btRigidBody(
      new AmmoLib.btRigidBodyConstructionInfo(
        0, // Mass
        new AmmoLib.btDefaultMotionState(tempTransform),
        ghostShape,
        new AmmoLib.btVector3(0, 0, 0)
      )
    );
    
    // Disable ghost body dynamics
    ghostBody.setCollisionFlags(ghostBody.getCollisionFlags() | 4); // CF_KINEMATIC_OBJECT
    
    // Add ghost body to world
    physicsWorld.addRigidBody(ghostBody);
    
    // Create constraint between ghost and ball
    mouseConstraint = new AmmoLib.btPoint2PointConstraint(
      ghostBody,
      ballSelected,
      pivotInA,
      pivotInB
    );
    
    // Add constraint to world
    physicsWorld.addConstraint(mouseConstraint, true);
    
    // Store ghost body for later use
    mouseConstraint.ghostBody = ghostBody;
  }
}

/**
 * Update the drag position while dragging
 */
export function moveDrag(dragPos) {
  if (mouseConstraint && mouseConstraint.ghostBody) {
    // Update ghost body position
    const motionState = mouseConstraint.ghostBody.getMotionState();
    if (motionState) {
      tmpTransform.setIdentity();
      tmpTransform.setOrigin(new AmmoLib.btVector3(dragPos.x, dragPos.y, dragPos.z));
      motionState.setWorldTransform(tmpTransform);
    }
  }
}

/**
 * End dragging and apply impulse if moving
 */
export function endDrag() {
  if (mouseConstraint) {
    // Remove constraint
    physicsWorld.removeConstraint(mouseConstraint);
    
    // Remove ghost body
    if (mouseConstraint.ghostBody) {
      physicsWorld.removeRigidBody(mouseConstraint.ghostBody);
      AmmoLib.destroy(mouseConstraint.ghostBody);
    }
    
    AmmoLib.destroy(mouseConstraint);
    mouseConstraint = null;
  }
  
  ballSelected = null;
}