// physics.js - Ammo.js physics integration
import * as THREE from 'three';

// Physics configuration
const config = {
  gravityConstant: -9.8,
  timeStep: 1/60,
  maxSubSteps: 10,
  ballMass: 1,
  ballRestitution: 0.9,
  ballFriction: 0.5,
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
    
    return physicsWorld;
  } catch (error) {
    console.error('Error initializing Ammo.js:', error);
    loadingMsg.textContent = `Error loading physics engine: ${error.message}`;
    loadingMsg.style.background = 'rgba(255, 0, 0, 0.7)';
    
    return null;
  }
}

// Create physics bodies for the cradle
export function createPhysicsBodies(cradle) {
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
}

// Create a rigid body for a ball
function createBallBody(ball) {
  // Create collision shape
  const shape = new physics.btSphereShape(ball.geometry.parameters.radius);
  shape.setMargin(0.05);
  
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
  
  // Set physical properties
  body.setRestitution(config.ballRestitution);
  body.setFriction(config.ballFriction);
  body.setDamping(config.ballDamping, config.ballDamping);
  
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

// Get all ball bodies (for external use)
export function getBallBodies() {
  return ballBodies;
}