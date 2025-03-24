// main.js - Application entry point
import './style.css';
import { initScene, createCradle, updateScene, onWindowResize } from './scene.js';
import { initPhysics, createPhysicsBodies, stepPhysics, syncPhysicsObjects, applyImpulse } from './physics.js';
import { setupControls, setupEventListeners } from './controls.js';
import { addInfoText } from './utils.js';

// Global app state
let running = false;
let lastTime = 0;
let cradle = null;
let physicsWorld = null;
let sceneObjects = null;

// Initialize the application
async function init() {
  // Initialize scene first (Three.js)
  sceneObjects = initScene();
  
  // Initialize physics (Ammo.js)
  physicsWorld = await initPhysics();
  
  if (!physicsWorld) {
    console.error("Failed to initialize physics");
    return;
  }
  
  // Create cradle objects both visually and in physics
  cradle = createCradle();
  createPhysicsBodies(cradle);
  
  // Setup controls and event listeners
  setupControls(sceneObjects.camera, sceneObjects.renderer, sceneObjects.controls);
  setupEventListeners(cradle, startAnimation, resetCamera, sceneObjects);
  
  // Set up window resize handler
  window.addEventListener('resize', () => onWindowResize(sceneObjects.camera, sceneObjects.renderer));
  
  // Add UI elements
  addInfoText();
  
  // Start animation loop
  running = true;
  lastTime = performance.now();
  animate();
}

// Animation loop
function animate() {
  if (!running) return;
  
  requestAnimationFrame(animate);
  // console.log('Animation frame');
  
  const time = performance.now();
  const deltaTime = (time - lastTime) / 1000;
  lastTime = time;
  
  // Cap delta time to avoid large time steps
  const cappedDelta = Math.min(deltaTime, 0.2);
  
  // Step physics simulation
  stepPhysics(cappedDelta);
  
  // Sync physics with visual objects
  syncPhysicsObjects();
  
  // Update and render scene
  updateScene();
}

// Start the animation by applying impulse to first ball
function startAnimation() {
  if (cradle && cradle.balls.length > 0) {
    // Apply impulse to first ball (-5 in x direction)
    applyImpulse(0, { x: -10, y: 0, z: 0 });
  }
}

// Reset camera to default position
function resetCamera() {
  if (sceneObjects && sceneObjects.camera && sceneObjects.controls) {
    sceneObjects.camera.position.set(0, 8, 20);
    sceneObjects.controls.target.set(0, 5, 0);
    sceneObjects.controls.update();
  }
}

// Initialize application
init();