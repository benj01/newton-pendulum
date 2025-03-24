// src/main.js - Fixed version with proper camera controls
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Global variables
let camera, scene, renderer, controls, physics;
let balls = [];
let tmpTrans;
let ballMaterial;
let lastTime = 0;
let ammoTmpPos = null;
let ammoTmpQuat = null;

// Physics configuration
const gravityConstant = -9.8;
let collisionConfiguration = null;
let dispatcher = null;
let broadphase = null;
let solver = null;
let physicsWorld = null;

// Ball configuration
const ballRadius = 1;
const ballDistance = 0.1; // Distance between balls
const numBalls = 5; 
const ballMass = 1;

// Animation variables
let animationStarted = false;
let firstBallBody = null;

// Initialize the app
init();

async function init() {
  // Initialize Ammo physics
  await initPhysics();
  
  // Create the scene
  createScene();
  
  // Create the Newton's Cradle
  createCradle();
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  
  // Start animation loop
  animate();
  
  // Add alternative event listeners to start animation and debug controls
  renderer.domElement.addEventListener('click', startAnimation);
  
  // Add key controls for debugging
  window.addEventListener('keydown', (event) => {
    // Use space bar as alternative to start animation
    if (event.code === 'Space') {
      startAnimation();
    }
    
    // Log camera position for debugging
    if (event.code === 'KeyD') {
      console.log('Camera position:', camera.position);
      console.log('Controls target:', controls.target);
    }
    
    // Reset camera position with R key
    if (event.code === 'KeyR') {
      camera.position.set(0, 8, 20);
      controls.target.set(0, 5, 0);
      controls.update();
    }
  });

  // Add info text
  addInfoText();
}

function addInfoText() {
  const infoDiv = document.createElement('div');
  infoDiv.id = 'info';
  infoDiv.innerHTML = 'Newton\'s Cradle - Click to start animation | Click and drag to rotate view | Scroll to zoom | Press R to reset camera';
  infoDiv.style.position = 'absolute';
  infoDiv.style.top = '10px';
  infoDiv.style.width = '100%';
  infoDiv.style.textAlign = 'center';
  infoDiv.style.color = 'white';
  infoDiv.style.fontFamily = 'system-ui, sans-serif';
  infoDiv.style.padding = '5px';
  infoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  infoDiv.style.zIndex = '100';
  document.body.appendChild(infoDiv);
  
  // Add controls help for mobile
  const mobileInfo = document.createElement('div');
  mobileInfo.style.position = 'absolute';
  mobileInfo.style.bottom = '10px';
  mobileInfo.style.left = '10px';
  mobileInfo.style.color = 'white';
  mobileInfo.style.fontFamily = 'system-ui, sans-serif';
  mobileInfo.style.padding = '10px';
  mobileInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  mobileInfo.style.borderRadius = '5px';
  mobileInfo.style.zIndex = '100';
  mobileInfo.innerHTML = 'One finger: Rotate<br>Two fingers: Zoom';
  document.body.appendChild(mobileInfo);
}

async function initPhysics() {
  // Create a loading message
  const loadingMsg = document.createElement('div');
  loadingMsg.style.position = 'absolute';
  loadingMsg.style.top = '50%';
  loadingMsg.style.left = '50%';
  loadingMsg.style.transform = 'translate(-50%, -50%)';
  loadingMsg.style.background = 'rgba(0, 0, 0, 0.7)';
  loadingMsg.style.color = 'white';
  loadingMsg.style.padding = '20px';
  loadingMsg.style.borderRadius = '10px';
  loadingMsg.style.zIndex = '1000';
  loadingMsg.textContent = 'Loading Physics Engine...';
  document.body.appendChild(loadingMsg);

  try {
    // Make sure Ammo is available globally from the script tag
    if (typeof Ammo === 'undefined') {
      throw new Error('Ammo.js is not loaded. Make sure it is included in the HTML.');
    }

    // We need to check if Ammo is a function or already instantiated
    if (typeof Ammo === 'function') {
      physics = await Ammo();
    } else {
      // Ammo is already instantiated
      physics = Ammo;
    }
    
    // Create temp transformation variables
    tmpTrans = new physics.btTransform();
    ammoTmpPos = new physics.btVector3();
    ammoTmpQuat = new physics.btQuaternion();
    
    // Create physics world configuration
    collisionConfiguration = new physics.btDefaultCollisionConfiguration();
    dispatcher = new physics.btCollisionDispatcher(collisionConfiguration);
    broadphase = new physics.btDbvtBroadphase();
    solver = new physics.btSequentialImpulseConstraintSolver();
    physicsWorld = new physics.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
    
    // Set gravity
    physicsWorld.setGravity(new physics.btVector3(0, gravityConstant, 0));

    // Remove loading message
    document.body.removeChild(loadingMsg);
  } catch (error) {
    console.error('Error initializing Ammo.js:', error);
    loadingMsg.textContent = `Error loading physics engine: ${error.message}`;
    loadingMsg.style.background = 'rgba(255, 0, 0, 0.7)';
  }
}

function createScene() {
  // Create camera
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 20); // Position further back and higher
  
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x444444); // Lighter background
  
  // Add stronger ambient light
  const ambientLight = new THREE.AmbientLight(0x909090);
  scene.add(ambientLight);
  
  // Add directional light
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(0, 10, 10);
  light.castShadow = true;
  scene.add(light);
  
  // Add an additional light from the front
  const frontLight = new THREE.DirectionalLight(0xffffff, 0.7);
  frontLight.position.set(0, 5, 15);
  scene.add(frontLight);
  
  // Configure shadows
  light.shadow.camera.left = -10;
  light.shadow.camera.right = 10;
  light.shadow.camera.top = 10;
  light.shadow.camera.bottom = -10;
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 50;
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  
  // Add orbit controls - IMPORTANT: This is where the controls are initialized
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // Add smooth damping
  controls.dampingFactor = 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 50;
  controls.maxPolarAngle = Math.PI / 1.5; // Prevent going below the cradle
  controls.target.set(0, 5, 0); // Look at the center of the cradle
  controls.update();
  
  // Force controls to be activated
  renderer.domElement.focus();
  
  // Create a shared material for all balls
  ballMaterial = new THREE.MeshStandardMaterial({
    color: 0xc0c0c0,
    metalness: 0.7,
    roughness: 0.2,
  });
}

function createCradle() {
  // Skip if physics is not initialized
  if (!physics || !physicsWorld) {
    console.warn('Physics not initialized, cannot create cradle');
    return;
  }

  // Frame thickness and size
  const frameSize = {
    width: (numBalls * (ballRadius * 2 + ballDistance)) + 4,
    height: 12,
    depth: 4
  };
  
  // Create frame
  createFrame(frameSize);
  
  // Create balls
  const totalWidth = numBalls * (ballRadius * 2 + ballDistance);
  const startX = -totalWidth / 2 + ballRadius;
  
  for (let i = 0; i < numBalls; i++) {
    const x = startX + i * (ballRadius * 2 + ballDistance);
    createBall(x, 5, 0);
  }
}

function createFrame(size) {
  // Create frame material
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    metalness: 0.2,
    roughness: 0.8
  });
  
  // Top bar
  const topBarGeometry = new THREE.BoxGeometry(size.width, 0.5, 0.5);
  const topBar = new THREE.Mesh(topBarGeometry, frameMaterial);
  topBar.position.set(0, size.height, 0);
  topBar.castShadow = true;
  topBar.receiveShadow = true;
  scene.add(topBar);
  
  // Create a rigid body for the top bar (static)
  const topBarShape = new physics.btBoxShape(new physics.btVector3(size.width / 2, 0.25, 0.25));
  const topBarTransform = new physics.btTransform();
  topBarTransform.setIdentity();
  topBarTransform.setOrigin(new physics.btVector3(0, size.height, 0));
  const topBarMotionState = new physics.btDefaultMotionState(topBarTransform);
  const topBarInfo = new physics.btRigidBodyConstructionInfo(0, topBarMotionState, topBarShape, new physics.btVector3(0, 0, 0));
  const topBarBody = new physics.btRigidBody(topBarInfo);
  physicsWorld.addRigidBody(topBarBody);
  
  // Left leg
  const legGeometry = new THREE.BoxGeometry(0.5, size.height, 0.5);
  const leftLeg = new THREE.Mesh(legGeometry, frameMaterial);
  leftLeg.position.set(-size.width / 2 + 0.25, size.height / 2, 0);
  leftLeg.castShadow = true;
  leftLeg.receiveShadow = true;
  scene.add(leftLeg);
  
  // Create a rigid body for the left leg (static)
  const leftLegShape = new physics.btBoxShape(new physics.btVector3(0.25, size.height / 2, 0.25));
  const leftLegTransform = new physics.btTransform();
  leftLegTransform.setIdentity();
  leftLegTransform.setOrigin(new physics.btVector3(-size.width / 2 + 0.25, size.height / 2, 0));
  const leftLegMotionState = new physics.btDefaultMotionState(leftLegTransform);
  const leftLegInfo = new physics.btRigidBodyConstructionInfo(0, leftLegMotionState, leftLegShape, new physics.btVector3(0, 0, 0));
  const leftLegBody = new physics.btRigidBody(leftLegInfo);
  physicsWorld.addRigidBody(leftLegBody);
  
  // Right leg
  const rightLeg = new THREE.Mesh(legGeometry, frameMaterial);
  rightLeg.position.set(size.width / 2 - 0.25, size.height / 2, 0);
  rightLeg.castShadow = true;
  rightLeg.receiveShadow = true;
  scene.add(rightLeg);
  
  // Create a rigid body for the right leg (static)
  const rightLegShape = new physics.btBoxShape(new physics.btVector3(0.25, size.height / 2, 0.25));
  const rightLegTransform = new physics.btTransform();
  rightLegTransform.setIdentity();
  rightLegTransform.setOrigin(new physics.btVector3(size.width / 2 - 0.25, size.height / 2, 0));
  const rightLegMotionState = new physics.btDefaultMotionState(rightLegTransform);
  const rightLegInfo = new physics.btRigidBodyConstructionInfo(0, rightLegMotionState, rightLegShape, new physics.btVector3(0, 0, 0));
  const rightLegBody = new physics.btRigidBody(rightLegInfo);
  physicsWorld.addRigidBody(rightLegBody);
  
  // Base
  const baseGeometry = new THREE.BoxGeometry(size.width, 0.5, size.depth);
  const base = new THREE.Mesh(baseGeometry, frameMaterial);
  base.position.set(0, 0, 0);
  base.receiveShadow = true;
  scene.add(base);
  
  // Create a rigid body for the base (static)
  const baseShape = new physics.btBoxShape(new physics.btVector3(size.width / 2, 0.25, size.depth / 2));
  const baseTransform = new physics.btTransform();
  baseTransform.setIdentity();
  baseTransform.setOrigin(new physics.btVector3(0, 0, 0));
  const baseMotionState = new physics.btDefaultMotionState(baseTransform);
  const baseInfo = new physics.btRigidBodyConstructionInfo(0, baseMotionState, baseShape, new physics.btVector3(0, 0, 0));
  const baseBody = new physics.btRigidBody(baseInfo);
  physicsWorld.addRigidBody(baseBody);
}

function createBall(x, y, z) {
  // Create ball geometry
  const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
  const ball = new THREE.Mesh(ballGeometry, ballMaterial);
  ball.position.set(x, y, z);
  ball.castShadow = true;
  ball.receiveShadow = true;
  scene.add(ball);
  
  // Create collision shape
  const shape = new physics.btSphereShape(ballRadius);
  shape.setMargin(0.05);
  
  // Set initial transform
  const transform = new physics.btTransform();
  transform.setIdentity();
  transform.setOrigin(new physics.btVector3(x, y, z));
  
  // Set mass and inertia
  const mass = ballMass;
  const localInertia = new physics.btVector3(0, 0, 0);
  shape.calculateLocalInertia(mass, localInertia);
  
  // Create rigid body
  const motionState = new physics.btDefaultMotionState(transform);
  const rbInfo = new physics.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
  const body = new physics.btRigidBody(rbInfo);
  
  // Set restitution and friction
  body.setRestitution(0.9);
  body.setFriction(0.5);
  body.setDamping(0.1, 0.1);
  
  // Add to physics world
  physicsWorld.addRigidBody(body);
  
  // Create another rigid body for the "roof" connection point
  const roofPointTransform = new physics.btTransform();
  roofPointTransform.setIdentity();
  roofPointTransform.setOrigin(new physics.btVector3(x, y + 6, 0));
  
  const roofPointShape = new physics.btSphereShape(0.1); // Small invisible sphere
  const roofMotionState = new physics.btDefaultMotionState(roofPointTransform);
  const roofRBInfo = new physics.btRigidBodyConstructionInfo(0, roofMotionState, roofPointShape, new physics.btVector3(0, 0, 0));
  const roofBody = new physics.btRigidBody(roofRBInfo);
  
  // Make it static (kinematic)
  roofBody.setCollisionFlags(roofBody.getCollisionFlags() | 2); // CF_KINEMATIC_OBJECT
  roofBody.setActivationState(4); // DISABLE_DEACTIVATION
  
  physicsWorld.addRigidBody(roofBody);
  
  // Create point-to-point constraint (similar to a pendulum)
  // The proper way to create a constraint between two rigid bodies
  const pivotInBall = new physics.btVector3(0, ballRadius, 0);
  const pivotInRoof = new physics.btVector3(0, 0, 0);
  
  // Create the constraint between the ball and the roof point
  const constraint = new physics.btPoint2PointConstraint(
    body,
    roofBody,
    pivotInBall,
    pivotInRoof
  );
  
  // Add constraint to world
  physicsWorld.addConstraint(constraint, true);
  
  // Store first ball for animation
  if (balls.length === 0) {
    firstBallBody = body;
  }
  
  // Store the ball and body reference
  balls.push({ mesh: ball, body: body });
}

function startAnimation() {
  if (!animationStarted && firstBallBody) {
    // Apply initial impulse to the first ball
    animationStarted = true;
    const impulse = new physics.btVector3(-5, 0, 0);
    firstBallBody.applyImpulse(impulse, new physics.btVector3(0, 0, 0));
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  
  const time = performance.now();
  let deltaTime = (time - lastTime) / 1000;
  lastTime = time;
  
  // Prevent too large time steps
  if (deltaTime > 0.2) deltaTime = 0.2;
  
  // Update controls - IMPORTANT: This makes the controls responsive
  if (controls) {
    controls.update();
  }
  
  // Update physics if initialized
  if (physicsWorld) {
    try {
      physicsWorld.stepSimulation(deltaTime, 10);
      
      // Update ball positions
      for (let i = 0; i < balls.length; i++) {
        const ball = balls[i];
        const body = ball.body;
        const mesh = ball.mesh;
        
        // Get the updated position and rotation
        const motionState = body.getMotionState();
        motionState.getWorldTransform(tmpTrans);
        
        const position = tmpTrans.getOrigin();
        const quaternion = tmpTrans.getRotation();
        
        // Update the mesh
        mesh.position.set(position.x(), position.y(), position.z());
        mesh.quaternion.set(quaternion.x(), quaternion.y(), quaternion.z(), quaternion.w());
      }
    } catch (e) {
      console.error('Error in physics simulation:', e);
    }
  }
  
  // Render the scene
  renderer.render(scene, camera);
}