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

// Helper to explicitly check soft body capability
function checkSoftBodyCapability(physics) {
  try {
    return (
      typeof physics.btSoftBodyHelpers === 'function' && 
      typeof physics.btSoftBodyWorldInfo === 'function' &&
      typeof physics.btSoftRigidDynamicsWorld === 'function'
    );
  } catch (e) {
    console.error("Error checking soft body capability:", e);
    return false;
  }
}

// Initialize Ammo.js physics
export async function initPhysics() {
  try {
    // Make sure Ammo is available globally from the script tag
    if (typeof Ammo === 'undefined' || !window.AmmoReadyPromise) {
      console.warn('Waiting for Ammo.js to load...');
      return null;
    }
    
    // Initialize Ammo.js using the ready promise
    try {
      physics = await window.AmmoReadyPromise;
      console.log('Ammo.js initialized:', typeof physics);
    } catch (error) {
      console.error('Error initializing Ammo.js:', error);
      return null;
    }
    
    // Explicitly check and log soft body capability first
    const softBodyCapable = checkSoftBodyCapability(physics);
    console.log(`Ammo.js soft body capability: ${softBodyCapable ? 'Available' : 'Not available'}`);
    
    // Create appropriate collision configuration
    const collisionConfiguration = softBodyCapable ? 
      new physics.btSoftBodyRigidBodyCollisionConfiguration() :
      new physics.btDefaultCollisionConfiguration();
    
    // Create dispatcher
    const dispatcher = new physics.btCollisionDispatcher(collisionConfiguration);
    
    // Create broadphase
    const broadphase = new physics.btDbvtBroadphase();
    
    // Create solver
    const solver = new physics.btSequentialImpulseConstraintSolver();
    
    // Create gravity vector
    const gravity = new physics.btVector3(0, physicsConfig.gravityConstant, 0);
    
    // Create world based on capability
    if (softBodyCapable) {
      // Create soft body solver
      const softBodySolver = new physics.btDefaultSoftBodySolver();
      
      // Create world with soft body support
      physicsWorld = new physics.btSoftRigidDynamicsWorld(
        dispatcher,
        broadphase,
        solver,
        collisionConfiguration,
        softBodySolver
      );
      
      // Initialize soft body world info
      softBodyWorldInfo = new physics.btSoftBodyWorldInfo();
      softBodyWorldInfo.set_m_broadphase(broadphase);
      softBodyWorldInfo.set_m_dispatcher(dispatcher);
      softBodyWorldInfo.set_m_gravity(gravity);
      
      // Initialize soft body helpers
      softBodyHelpers = new physics.btSoftBodyHelpers();
    } else {
      // Create regular dynamics world if soft body not supported
      physicsWorld = new physics.btDiscreteDynamicsWorld(
        dispatcher,
        broadphase,
        solver,
        collisionConfiguration
      );
    }
    
    // Set gravity for the world
    physicsWorld.setGravity(gravity);
    
    return {
      physics,
      physicsWorld,
      softBodyHelpers,
      softBodyWorldInfo,
      dispatcher,
      broadphase,
      solver,
      collisionConfiguration,
      hasSoftBodySupport: softBodyCapable
    };
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