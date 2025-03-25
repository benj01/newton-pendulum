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

// Collision tracking
const collisionPairs = new Set();

// Helper to track unique collisions
function getCollisionPairKey(obj1, obj2) {
  const id1 = obj1.userIndex || obj1.ptr;
  const id2 = obj2.userIndex || obj2.ptr;
  return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
}

// Collision callback setup
function setupCollisionCallback(dispatcher) {
  const numManifolds = dispatcher.getNumManifolds();
  
  for (let i = 0; i < numManifolds; i++) {
    const contactManifold = dispatcher.getManifoldByIndexInternal(i);
    const body0 = contactManifold.getBody0();
    const body1 = contactManifold.getBody1();
    
    // Only process if there are actual contact points
    const numContacts = contactManifold.getNumContacts();
    if (numContacts > 0) {
      const pairKey = getCollisionPairKey(body0, body1);
      
      // Only log first collision between this pair
      if (!collisionPairs.has(pairKey)) {
        collisionPairs.add(pairKey);
        
        // Try to get meaningful names for the objects
        const name0 = body0.name || 'unknown';
        const name1 = body1.name || 'unknown';
        
        console.log(`Collision detected between: ${name0} and ${name1}`);
        console.log(`Contact points: ${numContacts}`);
        
        // Log the first contact point's position
        const contact = contactManifold.getContactPoint(0);
        const pos = contact.getPositionWorldOnB();
        console.log(`Collision position: (${pos.x().toFixed(2)}, ${pos.y().toFixed(2)}, ${pos.z().toFixed(2)})`);
      }
    }
  }
}

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

// Initialize physics
export async function initPhysics() {
  try {
    // Make sure Ammo is available globally from the script tag
    if (typeof Ammo === 'undefined' || !window.AmmoReadyPromise) {
      console.error('Ammo.js not loaded or AmmoReadyPromise not available');
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
    
    if (!softBodyCapable) {
      console.error('Soft body support is required but not available');
      return null;
    }
    
    // Create appropriate collision configuration
    const collisionConfiguration = new physics.btSoftBodyRigidBodyCollisionConfiguration();
    
    // Create dispatcher
    const dispatcher = new physics.btCollisionDispatcher(collisionConfiguration);
    
    // Create broadphase
    const broadphase = new physics.btDbvtBroadphase();
    
    // Create solver
    const solver = new physics.btSequentialImpulseConstraintSolver();
    
    // Create soft body solver
    const softBodySolver = new physics.btDefaultSoftBodySolver();
    
    // Create gravity vector
    const gravity = new physics.btVector3(0, physicsConfig.gravityConstant, 0);
    
    // Create world with soft body support
    physicsWorld = new physics.btSoftRigidDynamicsWorld(
      dispatcher,
      broadphase,
      solver,
      collisionConfiguration,
      softBodySolver
    );
    
    // Set gravity for the world
    physicsWorld.setGravity(gravity);
    
    // Initialize soft body world info
    softBodyWorldInfo = new physics.btSoftBodyWorldInfo();
    softBodyWorldInfo.set_m_broadphase(broadphase);
    softBodyWorldInfo.set_m_dispatcher(dispatcher);
    softBodyWorldInfo.set_m_gravity(gravity);
    
    // Initialize soft body helpers
    softBodyHelpers = new physics.btSoftBodyHelpers();
    
    // Set air density and water offset for better soft body behavior
    softBodyWorldInfo.set_air_density(1.2);
    softBodyWorldInfo.set_water_offset(0);
    softBodyWorldInfo.set_water_normal(new physics.btVector3(0, 0, 0));
    
    console.log("Physics world initialized with soft body support");
    
    return {
      physics,
      physicsWorld,
      softBodyHelpers,
      softBodyWorldInfo,
      dispatcher,
      broadphase,
      solver,
      collisionConfiguration,
      hasSoftBodySupport: true
    };
  } catch (error) {
    console.error('Error initializing physics:', error);
    return null;
  }
}

// Update physics world
export function stepPhysics(deltaTime) {
  if (!physicsWorld) {
    console.warn("Physics world not available for stepping");
    return;
  }
  
  // Log simulation step
  console.debug(`Stepping physics simulation with dt: ${deltaTime}`);
  
  // Step simulation
  physicsWorld.stepSimulation(deltaTime, physicsConfig.maxSubSteps);
  
  // Check for collisions
  const dispatcher = physicsWorld.getDispatcher();
  const numManifolds = dispatcher.getNumManifolds();
  console.debug(`Number of collision manifolds: ${numManifolds}`);
  
  if (numManifolds > 0) {
    console.debug("Found collision manifolds, checking contacts...");
  }
  
  setupCollisionCallback(dispatcher);
}

// Clear the physics world
export function clearPhysicsWorld() {
  if (!physicsWorld) return;
  
  // Clear collision tracking
  collisionPairs.clear();
  
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

// Getters for physics objects
export function getPhysics() {
  return physics;
}

export function getPhysicsWorld() {
  return physicsWorld;
}

export function getSoftBodyHelpers() {
  return softBodyHelpers;
}

export function getSoftBodyWorldInfo() {
  return softBodyWorldInfo;
}

// Add setter functions
export function setSoftBodyHelpers(helpers) {
  softBodyHelpers = helpers;
}

export function setSoftBodyWorldInfo(info) {
  softBodyWorldInfo = info;
} 