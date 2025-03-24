// scene.js - Responsible for Three.js setup and rendering

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene configuration
const config = {
  ballRadius: 0.5,
  ballSpacing: 0.1,
  numberOfBalls: 5,
  frameHeight: 4,
  frameWidth: 6,
  frameThickness: 0.2,
  stringLength: 3,
};

// Scene variables
let scene, camera, renderer, controls;
let balls = [], strings = [], frame;
let directionalLight, ambientLight;

/**
 * Initialize the Three.js scene
 */
export function initScene(container) {
  // Create the scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Add renderer to container
  container.appendChild(renderer.domElement);

  // Setup camera
  camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 1000
  );
  camera.position.set(0, 0, 10);
  
  // Add orbit controls for camera interaction
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  
  // Setup lighting
  setupLighting();
  
  // Create cradle elements
  createCradle();
  
  // Add floor for shadows
  createFloor();
  
  // Handle window resizing
  window.addEventListener('resize', onWindowResize);
  
  return {
    scene,
    renderer,
    camera,
    balls,
    frame
  };
}

/**
 * Setup scene lighting
 */
function setupLighting() {
  // Main directional light (sun-like)
  directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  
  // Configure shadow properties
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -10;
  directionalLight.shadow.camera.right = 10;
  directionalLight.shadow.camera.top = 10;
  directionalLight.shadow.camera.bottom = -10;
  
  scene.add(directionalLight);
  
  // Ambient light for overall illumination
  ambientLight = new THREE.AmbientLight(0x404040, 0.7);
  scene.add(ambientLight);
}

/**
 * Create the Newton's Cradle components
 */
function createCradle() {
  createFrame();
  createBalls();
  createStrings();
}

/**
 * Create the top frame
 */
function createFrame() {
  const geometry = new THREE.CylinderGeometry(
    config.frameThickness,
    config.frameThickness,
    config.frameWidth,
    32
  );
  
  // Rotate cylinder to be horizontal
  geometry.rotateZ(Math.PI / 2);
  
  const material = new THREE.MeshStandardMaterial({
    color: 0x555555,
    metalness: 0.8,
    roughness: 0.2
  });
  
  frame = new THREE.Mesh(geometry, material);
  frame.position.set(0, config.frameHeight, 0);
  frame.castShadow = true;
  frame.receiveShadow = true;
  
  scene.add(frame);
}

/**
 * Create the metal balls
 */
function createBalls() {
  // Calculate total width of all balls with spacing
  const totalWidth = config.numberOfBalls * 
                    (config.ballRadius * 2 + config.ballSpacing) - 
                    config.ballSpacing;
  
  const startX = -totalWidth / 2 + config.ballRadius;
  
  const ballGeometry = new THREE.SphereGeometry(config.ballRadius, 32, 32);
  const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.9,
    roughness: 0.1
  });
  
  for (let i = 0; i < config.numberOfBalls; i++) {
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    const xPos = startX + i * (config.ballRadius * 2 + config.ballSpacing);
    
    ball.position.set(
      xPos, 
      config.frameHeight - config.stringLength, 
      0
    );
    
    ball.castShadow = true;
    ball.receiveShadow = true;
    
    scene.add(ball);
    balls.push(ball);
  }
}

/**
 * Create strings that connect balls to the frame
 */
function createStrings() {
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    
    // Create line geometry
    const points = [
      new THREE.Vector3(
        ball.position.x, 
        config.frameHeight, 
        0
      ),
      new THREE.Vector3(
        ball.position.x, 
        ball.position.y + config.ballRadius, 
        0
      )
    ];
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    
    scene.add(line);
    strings.push(line);
  }
}

/**
 * Create a floor for shadows
 */
function createFloor() {
  const floorGeometry = new THREE.PlaneGeometry(20, 20);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.8,
    metalness: 0.2
  });
  
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2; // Make horizontal
  floor.position.y = -2;
  floor.receiveShadow = true;
  
  scene.add(floor);
}

/**
 * Handle window resize events
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Animation loop function
 */
export function animateScene() {
  controls.update();
  renderer.render(scene, camera);
}

/**
 * Update string positions based on ball positions
 */
export function updateStrings() {
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const string = strings[i];
    
    // Update string geometry
    const points = [
      new THREE.Vector3(
        ball.position.x, 
        config.frameHeight, 
        0
      ),
      new THREE.Vector3(
        ball.position.x, 
        ball.position.y + config.ballRadius, 
        0
      )
    ];
    
    string.geometry.dispose();
    string.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }
}