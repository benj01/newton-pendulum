// scene.js - Three.js scene setup and visual elements
import * as THREE from 'three';
import { sceneConfig } from './config/scene.js';
import { visualConfig } from './config/visual.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene variables
let scene, camera, renderer;
let balls = [];
let strings = [];
let frame;
let frameObjects = [];

// Store fixed attachment points for strings
let stringAttachPoints = [];

// Initialize the Three.js scene
export function initScene() {
  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(visualConfig.background.color);
  
  // Create camera
  const { fov, near, far } = sceneConfig.camera;
  const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
  camera.position.set(
    sceneConfig.camera.position.x,
    sceneConfig.camera.position.y,
    sceneConfig.camera.position.z
  );
  camera.lookAt(
    sceneConfig.camera.target.x,
    sceneConfig.camera.target.y,
    sceneConfig.camera.target.z
  );
  
  // Create renderer
  const renderer = new THREE.WebGLRenderer({ 
    antialias: visualConfig.postProcessing.antialias
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = visualConfig.shadows.enabled;
  renderer.shadowMap.type = visualConfig.shadows.type;
  renderer.shadowMap.bias = visualConfig.shadows.bias;
  renderer.shadowMap.normalBias = visualConfig.shadows.normalBias;
  
  // Add renderer to document
  const appElement = document.getElementById('app');
  if (!appElement) {
    throw new Error("Could not find #app element in the document");
  }
  appElement.appendChild(renderer.domElement);
  
  // Create OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 5;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI / 2;
  
  // Set up lighting
  setupLighting(scene);
  
  return {
    scene,
    camera,
    renderer,
    controls
  };
}

// Set up lighting for the scene
function setupLighting(scene) {
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, sceneConfig.lighting.ambient);
  scene.add(ambientLight);
  
  // Add directional light
  const light = new THREE.DirectionalLight(0xffffff, sceneConfig.lighting.directional);
  light.position.set(
    sceneConfig.lighting.position.x,
    sceneConfig.lighting.position.y,
    sceneConfig.lighting.position.z
  );
  light.castShadow = visualConfig.shadows.enabled;
  scene.add(light);
  
  // Configure shadows if enabled
  if (visualConfig.shadows.enabled) {
    light.shadow.camera.left = -10;
    light.shadow.camera.right = 10;
    light.shadow.camera.top = 10;
    light.shadow.camera.bottom = -10;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 50;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
  }
}

// Create the Newton's Cradle visual elements
export function createCradle() {
  const cradle = new THREE.Group();
  
  // Calculate frame size based on balls
  const frameWidth = (sceneConfig.numBalls * (sceneConfig.ballRadius * 2 + sceneConfig.ballSpacing)) + 4;
  
  // Create frame
  createFrame(cradle, frameWidth);
  
  // Create balls
  createBalls(cradle);
  
  // Create strings
  createStrings(cradle);
  
  // Create floor
  createFloor(cradle);
  
  return cradle;
}

// Create frame for the cradle
function createFrame(cradle, frameWidth) {
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: visualConfig.frameMaterial.color,
    metalness: visualConfig.frameMaterial.metalness,
    roughness: visualConfig.frameMaterial.roughness
  });
  
  // Top bar
  const topBarGeometry = new THREE.BoxGeometry(
    frameWidth,
    sceneConfig.frame.height,
    sceneConfig.frame.depth
  );
  const topBar = new THREE.Mesh(topBarGeometry, frameMaterial);
  topBar.position.set(0, sceneConfig.frame.topBarLength, 0);
  topBar.castShadow = true;
  topBar.receiveShadow = true;
  topBar.name = 'frame_top';
  cradle.add(topBar);
  
  // Left leg
  const legGeometry = new THREE.BoxGeometry(
    sceneConfig.frame.width,
    sceneConfig.frame.sideBarLength,
    sceneConfig.frame.depth
  );
  const leftLeg = new THREE.Mesh(legGeometry, frameMaterial);
  leftLeg.position.set(-frameWidth / 2 + sceneConfig.frame.width/2, sceneConfig.frame.sideBarLength / 2, 0);
  leftLeg.castShadow = true;
  leftLeg.receiveShadow = true;
  leftLeg.name = 'frame_left';
  cradle.add(leftLeg);
  
  // Right leg
  const rightLeg = new THREE.Mesh(legGeometry, frameMaterial);
  rightLeg.position.set(frameWidth / 2 - sceneConfig.frame.width/2, sceneConfig.frame.sideBarLength / 2, 0);
  rightLeg.castShadow = true;
  rightLeg.receiveShadow = true;
  rightLeg.name = 'frame_right';
  cradle.add(rightLeg);
  
  // Base
  const baseGeometry = new THREE.BoxGeometry(
    frameWidth,
    sceneConfig.frame.height,
    sceneConfig.frame.depth
  );
  const base = new THREE.Mesh(baseGeometry, frameMaterial);
  base.position.set(0, 0, 0);
  base.receiveShadow = true;
  base.name = 'frame_base';
  cradle.add(base);
}

// Create balls for the cradle
function createBalls(cradle) {
  const ballMaterial = new THREE.MeshStandardMaterial({
    color: visualConfig.ballMaterial.color,
    metalness: visualConfig.ballMaterial.metalness,
    roughness: visualConfig.ballMaterial.roughness,
    transparent: false,
    depthTest: true,
    depthWrite: true
  });
  
  const totalWidth = sceneConfig.numBalls * (sceneConfig.ballRadius * 2 + sceneConfig.ballSpacing);
  const startX = -totalWidth / 2 + sceneConfig.ballRadius;
  const ballHeight = sceneConfig.frame.sideBarLength * 0.4;
  
  for (let i = 0; i < sceneConfig.numBalls; i++) {
    const ballGeometry = new THREE.SphereGeometry(sceneConfig.ballRadius, 32, 32);
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    
    const x = startX + i * (sceneConfig.ballRadius * 2 + sceneConfig.ballSpacing);
    ball.position.set(x, ballHeight, 0);
    ball.name = `ball_${i}`;
    
    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.renderOrder = 1; // Ensure balls render after strings
    cradle.add(ball);
  }
}

// Create strings for the cradle
function createStrings(cradle) {
  const stringMaterial = new THREE.LineBasicMaterial({ 
    color: visualConfig.stringMaterial.color,
    transparent: visualConfig.stringMaterial.transparent,
    opacity: visualConfig.stringMaterial.opacity,
    linewidth: 2
  });
  
  const balls = cradle.children.filter(child => child.name.startsWith('ball_'));
  const frameTop = cradle.children.find(child => child.name === 'frame_top');
  
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    
    // Create initial geometry with two points
    const points = [
      new THREE.Vector3(ball.position.x, frameTop.position.y, 0),
      new THREE.Vector3(ball.position.x, ball.position.y + sceneConfig.ballRadius, 0)
    ];
    
    // Create buffer geometry for the line
    const stringGeometry = new THREE.BufferGeometry();
    
    // Create vertices for the line
    const positions = new Float32Array(points.length * 3);
    for (let j = 0; j < points.length; j++) {
      positions[j * 3] = points[j].x;
      positions[j * 3 + 1] = points[j].y;
      positions[j * 3 + 2] = points[j].z;
    }
    
    // Set position attribute
    stringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    // Create the line
    const string = new THREE.Line(stringGeometry, stringMaterial);
    string.name = `string_${i}`;
    cradle.add(string);
  }
}

// Create floor for shadows
function createFloor(cradle) {
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
  floor.name = 'floor';
  cradle.add(floor);
}

// Update string positions and rotations
/* 
function updateStrings(cradle) {
  // This function should not be used if softBodies.js is handling string updates
  // Leaving it as a comment for reference
}
*/

// Update the scene
export function updateScene() {
  // Don't call updateStrings here, as it will conflict with softBodies.js
  // You can add other scene updates here if needed
}

// Handle window resize
export function onWindowResize(camera, renderer) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Get scene objects
export function getSceneObjects() {
  return {
    scene,
    camera,
    renderer,
    balls,
    strings,
    frame: frameObjects
  };
}