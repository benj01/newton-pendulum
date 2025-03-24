// controls.js - User interaction and controls
import * as THREE from 'three';
import { applyImpulse } from './physics.js';

// Controls variables
let camera, renderer, orbitControls;
let animationStarted = false;

// Setup controls for the scene
export function setupControls(sceneCamera, sceneRenderer, sceneControls) {
  camera = sceneCamera;
  renderer = sceneRenderer;
  orbitControls = sceneControls;
}

// Setup event listeners for user interaction
export function setupEventListeners(cradle, startAnimationCallback, resetCameraCallback, sceneObjects) {
  // Use sceneObjects.renderer.domElement for the event listener
  sceneObjects.renderer.domElement.addEventListener('click', () => {
    if (!animationStarted) {
      animationStarted = true;
      startAnimationCallback();
    }
  });
  
  // Key events for animation and camera control
  window.addEventListener('keydown', (event) => {
    // Space bar to start animation
    if (event.code === 'Space') {
      if (!animationStarted) {
        animationStarted = true;
        startAnimationCallback();
      }
    }
    
    // R key to reset camera position
    if (event.code === 'KeyR') {
      resetCameraCallback();
    }
    
    // D key for debugging output
    if (event.code === 'KeyD') {
      console.log('Camera position:', camera.position);
      console.log('Controls target:', orbitControls.target);
    }
  });
}

// Reset animation state
export function resetAnimation() {
  animationStarted = false;
}

// Check if animation has started
export function isAnimationStarted() {
  return animationStarted;
}