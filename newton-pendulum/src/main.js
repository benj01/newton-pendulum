// main.js - Entry point for Newton's Cradle simulation

import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { initPhysics } from './physics.js';
import { createFPSCounter, createHelpText } from './utils.js';

// Application state
let scene, camera, renderer, controls;

// Initialize the application
async function init() {
  console.log('Initializing Newton\'s Cradle simulation');
  
  // Create container for the canvas
  const container = document.createElement('div');
  container.id = 'container';
  document.body.appendChild(container);
  
  // Initialize simple Three.js scene for testing
  setupTestScene(container);
  
  // Initialize Ammo.js physics
  try {
    await initPhysics();
    console.log("Physics initialized successfully");
  } catch (error) {
    console.error("Failed to initialize physics:", error);
  }
  
  // Add performance monitor
  createFPSCounter();
  
  // Add help text
  createHelpText();
  
  // Start animation loop
  animate();
  
  console.log('Initialization complete');
}

// Create a simple test scene to verify Three.js is working
function setupTestScene(container) {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  
  // Create camera
  camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 1000
  );
  camera.position.set(0, 0, 10);
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  
  // Add orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  
  // Add a simple test sphere
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);
  
  // Add light
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);
  
  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  console.log("Test scene created successfully");
}

// For now, we've removed the event listeners to simplify initial debugging

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Update controls
  if (controls) controls.update();
  
  // Render the scene
  renderer.render(scene, camera);
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);