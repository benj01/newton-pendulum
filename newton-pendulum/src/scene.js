// scene.js - Three.js scene setup and visual elements
import * as THREE from 'three';

// Scene variables
let scene, camera, renderer;
let balls = [];
let strings = [];
let frame;
let frameObjects = [];

// Scene configuration
const config = {
  ballRadius: 0.5,
  ballDistance: 0.1,
  numBalls: 7,
  frameHeight: 12,
  frameWidth: 0,  // Will be calculated based on balls
  frameThickness: 0.5
};

// Store fixed attachment points for strings
let stringAttachPoints = [];

// Initialize the Three.js scene
export function initScene() {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x444444);
  
  // Create camera
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 20);
  camera.lookAt(0, 5, 0);
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ 
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  
  // Add renderer to document
  document.getElementById('app').appendChild(renderer.domElement);
  
  // Set up lighting
  setupLighting();
  
  return {
    scene,
    camera,
    renderer
  };
}

// Set up lighting for the scene
function setupLighting() {
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0x909090);
  scene.add(ambientLight);
  
  // Add directional light
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(0, 10, 10);
  light.castShadow = true;
  scene.add(light);
  
  // Configure shadows
  light.shadow.camera.left = -10;
  light.shadow.camera.right = 10;
  light.shadow.camera.top = 10;
  light.shadow.camera.bottom = -10;
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 50;
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;
  
  // Add front light
  const frontLight = new THREE.DirectionalLight(0xffffff, 0.7);
  frontLight.position.set(0, 5, 15);
  scene.add(frontLight);
}

// Create the Newton's Cradle visual elements
export function createCradle() {
  // Calculate frame size based on balls
  config.frameWidth = (config.numBalls * (config.ballRadius * 2 + config.ballDistance)) + 4;
  
  // Create frame
  createFrame();
  
  // Create balls
  createBalls();
  
  // Create strings
  createStrings();
  
  // Create floor
  createFloor();
  
  return {
    frame: frameObjects,
    balls,
    strings
  };
}

// Create frame for the cradle
function createFrame() {
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    metalness: 0.2,
    roughness: 0.8
  });
  
  // Top bar
  const topBarGeometry = new THREE.BoxGeometry(config.frameWidth, config.frameThickness, config.frameThickness);
  const topBar = new THREE.Mesh(topBarGeometry, frameMaterial);
  topBar.position.set(0, config.frameHeight, 0);
  topBar.castShadow = true;
  topBar.receiveShadow = true;
  scene.add(topBar);
  frameObjects.push(topBar);
  
  // Left leg
  const legGeometry = new THREE.BoxGeometry(config.frameThickness, config.frameHeight, config.frameThickness);
  const leftLeg = new THREE.Mesh(legGeometry, frameMaterial);
  leftLeg.position.set(-config.frameWidth / 2 + config.frameThickness/2, config.frameHeight / 2, 0);
  leftLeg.castShadow = true;
  leftLeg.receiveShadow = true;
  scene.add(leftLeg);
  frameObjects.push(leftLeg);
  
  // Right leg
  const rightLeg = new THREE.Mesh(legGeometry, frameMaterial);
  rightLeg.position.set(config.frameWidth / 2 - config.frameThickness/2, config.frameHeight / 2, 0);
  rightLeg.castShadow = true;
  rightLeg.receiveShadow = true;
  scene.add(rightLeg);
  frameObjects.push(rightLeg);
  
  // Base
  const baseGeometry = new THREE.BoxGeometry(config.frameWidth, config.frameThickness, 4);
  const base = new THREE.Mesh(baseGeometry, frameMaterial);
  base.position.set(0, 0, 0);
  base.receiveShadow = true;
  scene.add(base);
  frameObjects.push(base);
}

// Create balls for the cradle
function createBalls() {
  const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0xc0c0c0,
    metalness: 0.7,
    roughness: 0.2,
  });
  
  const totalWidth = config.numBalls * (config.ballRadius * 2 + config.ballDistance);
  const startX = -totalWidth / 2 + config.ballRadius;
  
  for (let i = 0; i < config.numBalls; i++) {
    const ballGeometry = new THREE.SphereGeometry(config.ballRadius, 32, 32);
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    
    const x = startX + i * (config.ballRadius * 2 + config.ballDistance);
    ball.position.set(x, 3, 0);
    
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball);
    balls.push(ball);
  }
}

// Create strings for the cradle
function createStrings() {
  const stringMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x222222,
    roughness: 0.5,
    metalness: 0.2
  });
  
  stringAttachPoints = []; // Clear any existing points
  strings = []; // Clear existing strings
  
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    
    // Store the initial attachment point (fixed to frame)
    const topAttachPoint = new THREE.Vector3(ball.position.x, config.frameHeight, 0);
    stringAttachPoints.push(topAttachPoint);
    
    // Calculate string length
    const stringLength = topAttachPoint.y - ball.position.y - config.ballRadius;
    
    // Create a single cylinder for the string
    const stringGeometry = new THREE.CylinderGeometry(0.02, 0.02, stringLength, 8);
    const string = new THREE.Mesh(stringGeometry, stringMaterial);
    
    // Position the string at its center point
    string.position.set(
      ball.position.x,
      topAttachPoint.y - stringLength/2,
      0
    );
    
    // No initial rotation needed - the cylinder is already vertical by default
    
    scene.add(string);
    // Keep the array structure for compatibility, but each string is now a single object
    strings.push([string]);
  }
}

// Create floor for shadows
function createFloor() {
  const floorGeometry = new THREE.PlaneGeometry(30, 30);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.8,
    metalness: 0.2
  });
  
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2;
  floor.receiveShadow = true;
  scene.add(floor);
}

// This function is now deprecated as we're using soft body physics
function updateStrings() {
  // This function is no longer used - string updates are handled by updateSoftBodyStrings in physics.js
  console.warn('updateStrings is deprecated - using soft body physics instead');
}

// Update scene elements (for animation loop)
export function updateScene() {
  if (!renderer || !scene || !camera) return;
  
  // Update strings to follow balls - This is now handled by updateSoftBodyStrings in physics.js
  // when soft body physics is available. The main.js file will call the appropriate function.
  
  // Render the scene
  renderer.render(scene, camera);
}

// Handle window resize
export function onWindowResize(camera, renderer) {
  if (!camera || !renderer) return;
  
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Access to scene objects (for debugging and testing)
export function getSceneObjects() {
  return {
    scene,
    camera,
    renderer,
    balls,
    strings,
    frameObjects
  };
}