import { initPhysics, stepPhysics, clearPhysicsWorld } from './core.js';
import { createPhysicsBodies, applyImpulse, syncPhysicsObjects } from './rigidBodies.js';
import { createStringPhysics, updateSoftBodyStrings, clearSoftBodies } from './softBodies.js';
import { physicsConfig } from '../config/physics.js';

let initialized = false;
let physicsBodies = null;
let stringPhysics = null;

// Initialize physics system
export async function initPhysicsSystem(cradle) {
  try {
    // Initialize Ammo.js physics
    const result = await initPhysics();
    if (!result) {
      throw new Error("Failed to initialize physics engine");
    }
    
    const { physics, physicsWorld, hasSoftBodySupport } = result;
    
    // Create physics bodies only if cradle is provided
    if (cradle) {
      // Create rigid bodies first
      physicsBodies = createPhysicsBodies(cradle);
      if (!physicsBodies) {
        throw new Error("Failed to create rigid bodies");
      }
      
      // Create soft body strings if supported
      if (hasSoftBodySupport && physicsConfig.softBody.enabled) {
        stringPhysics = createStringPhysics(cradle);
      }
    }
    
    initialized = true;
    return true;
  } catch (error) {
    console.error("Error initializing physics system:", error);
    return false;
  }
}

// Update physics simulation
export function updatePhysics(cradle, deltaTime = 1/60) {
  if (!initialized) return;
  
  try {
    // Step physics simulation
    stepPhysics(deltaTime);
    
    // Sync visual objects with physics
    if (cradle) {
      // Update rigid bodies
      syncPhysicsObjects(cradle);
      
      // Update soft body strings if they exist
      if (stringPhysics) {
        updateSoftBodyStrings(cradle);
      }
    }
  } catch (error) {
    console.error("Error updating physics:", error);
  }
}

// Apply impulse to a ball
export function applyBallImpulse(ballIndex, impulse) {
  if (!initialized) return;
  try {
    applyImpulse(ballIndex, impulse);
  } catch (error) {
    console.error("Error applying impulse:", error);
  }
}

// Clean up physics system
export function cleanupPhysics() {
  if (!initialized) return;
  try {
    // Clear soft bodies first
    if (stringPhysics) {
      clearSoftBodies();
      stringPhysics = null;
    }
    
    // Clear rigid bodies and world
    clearPhysicsWorld();
    initialized = false;
    physicsBodies = null;
  } catch (error) {
    console.error("Error cleaning up physics:", error);
  }
}

// Restart physics simulation
export function restartPhysics(cradle) {
  cleanupPhysics();
  return initPhysicsSystem(cradle);
} 