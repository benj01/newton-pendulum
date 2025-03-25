import * as THREE from 'three';
import { physicsConfig } from '../config/physics.js';

// Physics variables
let physics = null;
let physicsWorld = null;
let tmpTrans = null;
let ammoTmpPos = null;
let ammoTmpQuat = null;
let softBodyHelpers = null;
let softBodyWorldInfo = null;

// Initialize Ammo.js physics
export async function initPhysics() {
  try {
    // Make sure Ammo is available globally from the script tag
    if (typeof Ammo === 'undefined') {
      throw new Error('Ammo.js is not loaded. Make sure it is included in the HTML.');
    }
    
    // Initialize Ammo.js
    physics = await Ammo();
    
    // Create temp transformation variables
    tmpTrans = new physics.btTransform();
    ammoTmpPos = new physics.btVector3();
    ammoTmpQuat = new physics.btQuaternion();
    
    // Check for soft body support
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
      
      // Initialize soft body world info
      softBodyWorldInfo = new physics.btSoftBodyWorldInfo();
      softBodyWorldInfo.set_m_broadphase(broadphase);
      softBodyWorldInfo.set_m_dispatcher(dispatcher);
      softBodyWorldInfo.set_m_gravity(new physics.btVector3(0, physicsConfig.gravityConstant, 0));
      
      // Create soft body helpers
      softBodyHelpers = new physics.btSoftBodyHelpers();
      
      console.log("Soft body physics world created successfully");
    } else {
      // Create standard physics world
      const collisionConfiguration = new physics.btDefaultCollisionConfiguration();
      dispatcher = new physics.btCollisionDispatcher(collisionConfiguration);
      broadphase = new physics.btDbvtBroadphase();
      solver = new physics.btSequentialImpulseConstraintSolver();
      physicsWorld = new physics.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
      
      console.log("Standard rigid body physics world created");
    }
    
    // Set gravity
    physicsWorld.setGravity(new physics.btVector3(0, physicsConfig.gravityConstant, 0));
    
    // Set solver parameters for stability
    if (physicsWorld.getSolverInfo) {
      const solverInfo = physicsWorld.getSolverInfo();
      if (solverInfo) {
        solverInfo.m_numIterations = 10;
        if ('m_erp' in solverInfo) solverInfo.m_erp = 0.8;
        if ('m_erp2' in solverInfo) solverInfo.m_erp2 = 0.8;
      }
    }
    
    return { physics, physicsWorld, hasSoftBodySupport };
  } catch (error) {
    console.error('Error initializing Ammo.js:', error);
    return null;
  }
}

// Step the physics simulation
export function stepPhysics(deltaTime) {
  if (physicsWorld) {
    physicsWorld.stepSimulation(deltaTime, physicsConfig.maxSubSteps, physicsConfig.timeStep);
  }
}

// Clear the physics world
export function clearPhysicsWorld() {
  if (!physicsWorld) return;
  
  // Remove all bodies and constraints
  for (let i = physicsWorld.getNumCollisionObjects() - 1; i >= 0; i--) {
    const obj = physicsWorld.getCollisionObjectArray().at(i);
    physicsWorld.removeCollisionObject(obj);
  }
  
  // Clear soft bodies if they exist
  if (physicsWorld.getSoftBodyArray) {
    for (let i = physicsWorld.getSoftBodyArray().size() - 1; i >= 0; i--) {
      const softBody = physicsWorld.getSoftBodyArray().at(i);
      physicsWorld.removeSoftBody(softBody);
    }
  }
  
  // Clear constraints
  for (let i = physicsWorld.getNumConstraints() - 1; i >= 0; i--) {
    const constraint = physicsWorld.getConstraint(i);
    physicsWorld.removeConstraint(constraint);
  }
}

// Get physics instance
export function getPhysics() {
  return physics;
}

// Get physics world
export function getPhysicsWorld() {
  return physicsWorld;
}

// Export physics variables
export {
  physics,
  physicsWorld,
  tmpTrans,
  ammoTmpPos,
  ammoTmpQuat,
  softBodyHelpers,
  softBodyWorldInfo
}; 