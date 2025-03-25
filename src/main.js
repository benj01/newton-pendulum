// main.js - Application entry point
import './style.css';
import './ui/styles.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { initScene, createCradle, updateScene } from './scene.js';
import { initPhysicsSystem, updatePhysics, applyBallImpulse, cleanupPhysics, restartPhysics } from './physics/index.js';
import { UserConsole } from './ui/console.js';
import { sceneConfig, physicsConfig, visualConfig } from './config/index.js';
import { displayAmmoCapabilities } from './checkammo.js';

// Global state
let scene, camera, renderer, controls;
let cradle;
let physicsSystem;
let userConsole;
let isAnimating = true;

// Initialize the application
async function init() {
  try {
    // Display Ammo.js capabilities first
    displayAmmoCapabilities();
    
    // Initialize scene
    ({ scene, camera, renderer, controls } = initScene());
    
    // Verify critical components are initialized
    if (!scene || !camera || !renderer || !controls) {
      throw new Error("Failed to initialize critical scene components");
    }
    
    // Create visual cradle
    cradle = createCradle();
    scene.add(cradle);
    
    // Initialize physics system with cradle
    const success = await initPhysicsSystem(cradle);
    if (!success) {
      throw new Error("Failed to initialize physics system");
    }
    
    // Initialize user console
    userConsole = new UserConsole({
      onSettingsChange: handleSettingsChange,
      onRestart: handleRestart
    });
    
    // Set up event listeners
    setupEventListeners();
    
    // Display soft body support status
    displaySoftBodyStatus();
    
    // Start animation loop only after all components are initialized
    isAnimating = true;
    animate();
  } catch (error) {
    console.error("Error initializing application:", error);
    alert("Failed to initialize application. Please check the console for details.");
  }
}

// Handle settings changes from user console
function handleSettingsChange(settings) {
  try {
    // Update scene settings
    if (settings.scene) {
      Object.assign(sceneConfig, settings.scene);
      handleRestart();
    }
    
    // Update physics settings
    if (settings.physics) {
      Object.assign(physicsConfig, settings.physics);
      handleRestart();
    }
    
    // Update visual settings
    if (settings.visual) {
      Object.assign(visualConfig, settings.visual);
      updateVisualSettings();
    }
  } catch (error) {
    console.error("Error handling settings change:", error);
  }
}

// Handle scene restart
async function handleRestart() {
  try {
    // Clean up existing physics
    cleanupPhysics();
    
    // Remove existing cradle from scene
    scene.remove(cradle);
    
    // Create new cradle with updated settings
    cradle = createCradle();
    scene.add(cradle);
    
    // Reinitialize physics system with new cradle
    const success = await initPhysicsSystem(cradle);
    if (!success) {
      throw new Error("Failed to reinitialize physics system");
    }
  } catch (error) {
    console.error("Error restarting scene:", error);
    alert("Failed to restart scene. Please check the console for details.");
  }
}

// Update visual settings
function updateVisualSettings() {
  try {
    // Update renderer settings
    renderer.setClearColor(visualConfig.background.color);
    renderer.shadowMap.enabled = visualConfig.shadows.enabled;
    renderer.shadowMap.type = visualConfig.shadows.type;
    renderer.shadowMap.bias = visualConfig.shadows.bias;
    renderer.shadowMap.normalBias = visualConfig.shadows.normalBias;
    
    // Update post-processing if enabled
    if (visualConfig.postProcessing.enabled) {
      // TODO: Implement post-processing effects
    }
    
    // Update materials
    if (cradle) {
      cradle.traverse((object) => {
        if (object.isMesh) {
          if (object.name.includes('ball')) {
            object.material = new THREE.MeshStandardMaterial(visualConfig.ballMaterial);
          } else if (object.name.includes('frame')) {
            object.material = new THREE.MeshStandardMaterial(visualConfig.frameMaterial);
          } else if (object.name.includes('string')) {
            object.material = new THREE.MeshBasicMaterial(visualConfig.stringMaterial);
          }
        }
      });
    }
  } catch (error) {
    console.error("Error updating visual settings:", error);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Window resize
  window.addEventListener('resize', onWindowResize, false);
  
  // Mouse click for impulse
  window.addEventListener('click', onMouseClick, false);
  
  // Space key to pause/resume
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      isAnimating = !isAnimating;
    }
  });
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle mouse click for impulse
function onMouseClick(event) {
  if (!isAnimating) return;
  
  // Calculate mouse position in normalized device coordinates
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Create raycaster
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  
  // Find intersected objects
  const intersects = raycaster.intersectObjects(cradle.children, true);
  
  // Apply impulse to first intersected ball
  for (const intersect of intersects) {
    if (intersect.object.name.includes('ball')) {
      const ballIndex = parseInt(intersect.object.name.split('_')[1]);
      const impulse = new THREE.Vector3(0, physicsConfig.impulse, 0);
      applyBallImpulse(ballIndex, impulse);
      break;
    }
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  if (isAnimating) {
    // Update physics with defensive check
    if (cradle) {
      updatePhysics(cradle);
    }
    
    // Update scene with defensive check
    if (typeof updateScene === 'function') {
      updateScene();
    }
    
    // Update controls with defensive check
    if (controls && typeof controls.update === 'function') {
      controls.update();
    }
  }
  
  // Render scene with defensive checks
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Display soft body support status
function displaySoftBodyStatus() {
  const status = document.createElement('div');
  status.style.position = 'fixed';
  status.style.top = '10px';
  status.style.left = '10px';
  status.style.color = '#000';
  status.style.fontFamily = 'Arial, sans-serif';
  status.style.fontSize = '14px';
  status.style.zIndex = '1000';
  
  // Check for actual soft body capability rather than instantiated objects
  const hasSoftBodySupport = typeof Ammo !== 'undefined' && 
    typeof Ammo.btSoftBodyHelpers === 'function' && 
    typeof Ammo.btSoftBodyWorldInfo === 'function' &&
    typeof Ammo.btSoftRigidDynamicsWorld === 'function';
    
  status.textContent = `Soft Body Support: ${hasSoftBodySupport ? 'Enabled' : 'Disabled'}`;
  
  document.body.appendChild(status);
}

// Start the application
init();