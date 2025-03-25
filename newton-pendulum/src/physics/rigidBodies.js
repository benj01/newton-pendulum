import * as THREE from 'three';
import { getPhysics, getPhysicsWorld } from './core.js';
import { physicsConfig } from '../config/physics.js';

// Store rigid bodies
let ballBodies = [];
let frameBodies = [];

// Create physics bodies for the cradle
export function createPhysicsBodies(cradle) {
  const physics = getPhysics();
  const physicsWorld = getPhysicsWorld();
  
  if (!physics || !physicsWorld) {
    console.error("Physics not initialized");
    return null;
  }
  
  // Clear any existing bodies
  clearBodies();
  
  // Create frame bodies
  createFrameBodies(cradle, physics, physicsWorld);
  
  // Create ball bodies
  createBallBodies(cradle, physics, physicsWorld);
  
  return {
    balls: ballBodies,
    frame: frameBodies
  };
}

// Create rigid bodies for the frame
function createFrameBodies(cradle, physics, physicsWorld) {
  const frameObjects = cradle.children.filter(child => child.name.startsWith('frame_'));
  
  frameObjects.forEach(frame => {
    const shape = new physics.btBoxShape(new physics.btVector3(
      frame.geometry.parameters.width / 2,
      frame.geometry.parameters.height / 2,
      frame.geometry.parameters.depth / 2
    ));
    
    const transform = new physics.btTransform();
    transform.setIdentity();
    transform.setOrigin(new physics.btVector3(
      frame.position.x,
      frame.position.y,
      frame.position.z
    ));
    
    const motionState = new physics.btDefaultMotionState(transform);
    const localInertia = new physics.btVector3(0, 0, 0);
    
    const rbInfo = new physics.btRigidBodyConstructionInfo(0, motionState, shape, localInertia);
    const body = new physics.btRigidBody(rbInfo);
    
    // Set friction and restitution
    body.setFriction(physicsConfig.frame.friction);
    body.setRestitution(physicsConfig.frame.restitution);
    
    // Add to physics world
    physicsWorld.addRigidBody(body);
    frameBodies.push(body);
    
    // Store physics body in userData
    frame.userData.physicsBody = body;
  });
}

// Create rigid bodies for the balls
function createBallBodies(cradle, physics, physicsWorld) {
  const ballObjects = cradle.children.filter(child => child.name.startsWith('ball_'));
  
  ballObjects.forEach(ball => {
    const shape = new physics.btSphereShape(ball.geometry.parameters.radius);
    
    const transform = new physics.btTransform();
    transform.setIdentity();
    transform.setOrigin(new physics.btVector3(
      ball.position.x,
      ball.position.y,
      ball.position.z
    ));
    
    const motionState = new physics.btDefaultMotionState(transform);
    const localInertia = new physics.btVector3(0, 0, 0);
    shape.calculateLocalInertia(physicsConfig.ball.mass, localInertia);
    
    const rbInfo = new physics.btRigidBodyConstructionInfo(
      physicsConfig.ball.mass,
      motionState,
      shape,
      localInertia
    );
    const body = new physics.btRigidBody(rbInfo);
    
    // Set friction and restitution
    body.setFriction(physicsConfig.ball.friction);
    body.setRestitution(physicsConfig.ball.restitution);
    
    // Set damping
    body.setDamping(
      physicsConfig.ball.linearDamping,
      physicsConfig.ball.angularDamping
    );
    
    // Add to physics world
    physicsWorld.addRigidBody(body);
    ballBodies.push(body);
    
    // Store physics body in userData
    ball.userData.physicsBody = body;
  });
}

// Apply impulse to a ball
export function applyImpulse(ballIndex, impulse) {
  const physics = getPhysics();
  if (!physics) {
    console.error("Physics not initialized");
    return;
  }
  
  if (ballIndex < 0 || ballIndex >= ballBodies.length) {
    console.error("Invalid ball index:", ballIndex);
    return;
  }
  
  const body = ballBodies[ballIndex];
  if (!body) {
    console.error("Ball body not found for index:", ballIndex);
    return;
  }
  
  // Convert THREE.Vector3 to btVector3 if needed
  const impulseVec = impulse instanceof THREE.Vector3 ?
    new physics.btVector3(impulse.x, impulse.y, impulse.z) :
    new physics.btVector3(impulse.x || 0, impulse.y || 0, impulse.z || 0);
  
  // Apply central impulse
  body.activate(true);
  body.applyCentralImpulse(impulseVec);
}

// Sync physics objects with visual objects
export function syncPhysicsObjects(cradle) {
  // Sync balls
  const balls = cradle.children.filter(child => child.name.startsWith('ball_'));
  
  for (let i = 0; i < balls.length && i < ballBodies.length; i++) {
    const ball = balls[i];
    const body = ballBodies[i];
    
    if (!ball || !body) continue;
    
    const transform = body.getWorldTransform();
    const origin = transform.getOrigin();
    
    ball.position.set(origin.x(), origin.y(), origin.z());
    
    const rotation = transform.getRotation();
    ball.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
  }
}

// Clear all physics bodies
function clearBodies() {
  const physicsWorld = getPhysicsWorld();
  if (!physicsWorld) return;
  
  // Remove ball bodies
  for (const body of ballBodies) {
    if (body) {
      physicsWorld.removeRigidBody(body);
    }
  }
  ballBodies = [];
  
  // Remove frame bodies
  for (const body of frameBodies) {
    if (body) {
      physicsWorld.removeRigidBody(body);
    }
  }
  frameBodies = [];
  
  // Clear userData references
  const cradle = document.querySelector('#cradle');
  if (cradle) {
    cradle.children.forEach(child => {
      if (child.userData.physicsBody) {
        delete child.userData.physicsBody;
      }
    });
  }
} 