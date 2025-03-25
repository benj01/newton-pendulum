// main.js - Application entry point
import './style.css';
import { initScene, createCradle, updateScene, onWindowResize } from './scene.js';
import { 
  initPhysics, 
  createPhysicsBodies, 
  stepPhysics, 
  syncPhysicsObjects, 
  applyImpulse, 
  updateStringPhysics,
  updateSoftBodyStrings
} from './physics.js';
import { setupControls } from './controls.js';
import { addInfoText } from './utils.js';
import { checkAmmoSoftBodySupport } from './checkammo.js';

// Global app state
let running = false;
let lastTime = 0;
let cradle = null;
let physicsWorld = null;
let sceneObjects = null;
let hasSoftBodySupport = false;

// Initialize the application
async function init() {
  console.log('Initializing application...');
  
  // Initialize scene first (Three.js)
  sceneObjects = initScene();
  
  // Verify scene initialization
  if (!sceneObjects || !sceneObjects.camera || !sceneObjects.renderer) {
    console.error('Failed to initialize scene properly:', sceneObjects);
    return;
  }
  
  console.log('Scene initialized:', {
    camera: sceneObjects.camera,
    renderer: sceneObjects.renderer,
    scene: sceneObjects.scene
  });
  
  // Initialize physics (Ammo.js)
  const physicsInit = await initPhysics();
  
  if (!physicsInit) {
    console.error("Failed to initialize physics");
    return;
  }
  
  physicsWorld = physicsInit.physicsWorld;
  const physics = physicsInit.physics;
  
  // Store soft body support flag
  hasSoftBodySupport = physicsInit.hasSoftBodySupport;
  console.log("Soft body support:", hasSoftBodySupport);
  
  // Create cradle objects both visually and in physics
  cradle = createCradle();
  createPhysicsBodies(cradle);
  
  // Setup controls and event listeners - Simplified for ball interaction only
  console.log('Setting up ball interaction controls...');
  setupControls(
    sceneObjects.camera,
    sceneObjects.renderer,
    sceneObjects.scene,
    physicsWorld,
    physics,
    startAnimation
  );
  
  // Set up window resize handler
  window.addEventListener('resize', () => onWindowResize(sceneObjects.camera, sceneObjects.renderer));
  
  // Add UI elements
  addInfoText();
  
  // Set up fixed camera - since we removed camera controls
  setupFixedCamera();
  
  // Display soft body status on screen
  displaySoftBodyStatus(hasSoftBodySupport);
  
  // Start animation loop
  running = true;
  lastTime = performance.now();
  animate();
}

// Setup a fixed camera position since we removed camera controls
function setupFixedCamera() {
  if (sceneObjects && sceneObjects.camera) {
    // Position the camera at a good vantage point
    sceneObjects.camera.position.set(0, 8, 20);
    sceneObjects.camera.lookAt(0, 5, 0);
    sceneObjects.camera.updateProjectionMatrix();
  }
}

// Animation loop
function animate() {
  if (!running) return;
  
  requestAnimationFrame(animate);
  
  const time = performance.now();
  const deltaTime = (time - lastTime) / 1000;
  lastTime = time;
  
  // Cap delta time to avoid large time steps
  const cappedDelta = Math.min(deltaTime, 0.2);
  
  // Step physics simulation
  stepPhysics(cappedDelta);
  
  // Sync physics with visual objects
  syncPhysicsObjects();
  
  // Update string physics (use soft body or fallback to rigid body)
  if (hasSoftBodySupport) {
    updateSoftBodyStrings(cradle);
  } else {
    updateStringPhysics(cradle);
  }
  
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

// Display soft body support status
function displaySoftBodyStatus(supported) {
  const statusDiv = document.createElement('div');
  statusDiv.id = 'softbody-status';
  statusDiv.style.position = 'absolute';
  statusDiv.style.top = '40px';
  statusDiv.style.width = '100%';
  statusDiv.style.textAlign = 'center';
  statusDiv.style.color = supported ? '#44ff44' : '#ff4444';
  statusDiv.style.fontFamily = 'system-ui, sans-serif';
  statusDiv.style.padding = '5px';
  statusDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  statusDiv.style.zIndex = '100';
  
  statusDiv.textContent = supported ? 
    "Soft Body Physics: Enabled (Using Soft Ropes)" : 
    "Soft Body Physics: Not Available (Using Rigid Body Fallback)";
  
  document.body.appendChild(statusDiv);
}

// checkAmmoSoftBodySupport();

// Initialize application
init();