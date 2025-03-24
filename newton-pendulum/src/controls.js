// Updated controls.js with enhanced mobile touch support
import * as THREE from 'three';
import { applyImpulse, getBallBodies } from './physics.js';

// Controls variables
let camera, renderer, scene;
let isDragging = false;
let selectedBall = null;
let selectedBallIndex = -1;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let dragPlane = new THREE.Plane();
let dragPoint = new THREE.Vector3();
let physicsWorld = null;
let physics = null;
let startAnimationCallback = null;
let lastDragPosition = null;

// Track for velocity calculation
let lastDragTime = 0;
let lastDragPositions = [];

// Setup controls for the scene
export function setupControls(sceneCamera, sceneRenderer, sceneObj, physicsObj, ammoObj, startAnimationCb) {
  camera = sceneCamera;
  renderer = sceneRenderer;
  scene = sceneObj;
  physicsWorld = physicsObj;
  physics = ammoObj;
  startAnimationCallback = startAnimationCb;

  // Initialize raycaster and vectors
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  dragPlane = new THREE.Plane();
  dragPoint = new THREE.Vector3();

  if (renderer && renderer.domElement) {
    const element = renderer.domElement;
    
    // Remove previous event listeners if they exist
    element.removeEventListener('mousedown', onMouseDown);
    element.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('touchend', onTouchEnd);
    
    // Add mouse event listeners
    element.addEventListener('mousedown', onMouseDown, { passive: false });
    window.addEventListener('mousemove', onMouseMove, { passive: false });
    window.addEventListener('mouseup', onMouseUp, { passive: false });
    
    // Add touch event listeners for mobile with passive: false to allow preventDefault
    element.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });

    // Add key events for animation
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space' && startAnimationCallback) {
        event.preventDefault();
        startAnimationCallback();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    });

    // Add a double-tap handler for mobile to trigger animation
    let lastTap = 0;
    element.addEventListener('touchend', (event) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      
      if (tapLength < 300 && tapLength > 0 && !isDragging && startAnimationCallback) {
        event.preventDefault();
        startAnimationCallback();
      }
      
      lastTap = currentTime;
    }, { passive: false });

    console.log('Ball interaction controls setup complete with enhanced mobile support');
  } else {
    console.error('Renderer or domElement not available for event listeners');
  }
}

// Mouse down event handler
function onMouseDown(event) {
  // Prevent default behavior
  event.preventDefault();
  
  // Check if we have the necessary components
  if (!camera || !renderer || !scene || !physicsWorld || !physics) {
    console.error('Required components not initialized for ball dragging');
    return;
  }
  
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  selectBall();
}

// Touch start event handler
function onTouchStart(event) {
  // Prevent default behavior to avoid scrolling/zooming
  event.preventDefault();
  
  if (event.touches.length === 1) {
    // Get the first touch
    const touch = event.touches[0];
    
    // Calculate touch position in normalized device coordinates (-1 to +1)
    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    
    selectBall();
  }
}

// Common function to select a ball based on current mouse/touch position
function selectBall() {
  // Get balls from the scene
  const balls = scene.children.filter(obj => obj.geometry && obj.geometry.type === 'SphereGeometry');
  
  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);
  
  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(balls);
  
  if (intersects.length > 0) {
    // Set selected ball
    selectedBall = intersects[0].object;
    
    // Find ball index
    selectedBallIndex = balls.findIndex(ball => ball.uuid === selectedBall.uuid);
    
    isDragging = true;
    
    // Set up drag plane aligned with the camera view
    dragPlane.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(dragPlane.normal).negate(),
      selectedBall.position
    );
    
    // Calculate drag point (intersection of ray with drag plane)
    raycaster.ray.intersectPlane(dragPlane, dragPoint);
    
    // Reset drag tracking
    lastDragPosition = dragPoint.clone();
    lastDragTime = performance.now();
    lastDragPositions = [];
    
    // Create physics constraint for dragging
    createMouseConstraint(selectedBallIndex, dragPoint);
    
    console.log('Ball selected:', {
      ballIndex: selectedBallIndex,
      ballPosition: selectedBall.position.toArray(),
      dragPoint: dragPoint.toArray()
    });
  }
}

// Mouse move event handler
function onMouseMove(event) {
  if (isDragging && selectedBall) {
    event.preventDefault();
    
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    updateDragPosition();
  }
}

// Touch move event handler
function onTouchMove(event) {
  if (isDragging && selectedBall && event.touches.length === 1) {
    event.preventDefault();
    
    // Get the first touch
    const touch = event.touches[0];
    
    // Calculate touch position in normalized device coordinates (-1 to +1)
    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    
    updateDragPosition();
  }
}

// Common function to update drag position based on current mouse/touch position
function updateDragPosition() {
  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);
  
  // Calculate new drag point (intersection of ray with drag plane)
  raycaster.ray.intersectPlane(dragPlane, dragPoint);
  
  // Store position and time for velocity calculation
  const now = performance.now();
  lastDragPositions.push({
    position: dragPoint.clone(),
    time: now
  });
  
  // Keep only the last 5 positions for smoothing
  if (lastDragPositions.length > 5) {
    lastDragPositions.shift();
  }
  
  // Update the mouse constraint target position
  updateMouseConstraint(dragPoint);
}

// Mouse up event handler
function onMouseUp(event) {
  if (isDragging) {
    event.preventDefault();
    releaseConstraint();
  }
}

// Touch end event handler
function onTouchEnd(event) {
  if (isDragging) {
    event.preventDefault();
    releaseConstraint();
  }
}

// Common function to handle constraint release
function releaseConstraint() {
  console.log('Ball released:', {
    ballIndex: selectedBallIndex,
    finalPosition: selectedBall ? selectedBall.position.toArray() : null
  });
  
  // Apply velocity impulse when releasing the ball
  if (selectedBallIndex >= 0 && lastDragPositions.length >= 2) {
    // Calculate velocity from the last few positions
    const first = lastDragPositions[0];
    const last = lastDragPositions[lastDragPositions.length - 1];
    
    if (last.time - first.time > 0) {
      const velocity = new THREE.Vector3();
      velocity.subVectors(last.position, first.position);
      
      // Scale velocity based on time elapsed (convert to per-second)
      const timeScale = 1000 / (last.time - first.time);
      velocity.multiplyScalar(timeScale * 2); // Multiply by 2 for more responsive feel
      
      // Apply impulse based on calculated velocity
      applyImpulse(selectedBallIndex, { 
        x: velocity.x, 
        y: velocity.y, 
        z: velocity.z 
      });
      
      console.log('Applied release velocity:', {
        velocity: velocity.toArray(),
        timeElapsed: last.time - first.time
      });
    }
  }
  
  // Release the constraint
  releaseMouseConstraint();
  
  // Reset drag state
  isDragging = false;
  selectedBall = null;
  selectedBallIndex = -1;
  lastDragPositions = [];
}

// Physics constraint variables
let mouseBody = null;
let mouseConstraint = null;

// Create mouse constraint for dragging
function createMouseConstraint(ballIndex, position) {
  if (!physics || !physicsWorld) {
    console.error('Physics not initialized for mouse constraint');
    return;
  }
  
  try {
    // Get ball body from physics
    const ballBodies = getBallBodies();
    if (ballIndex < 0 || ballIndex >= ballBodies.length) {
      console.error('Invalid ball index:', ballIndex);
      return;
    }
    
    const ballBody = ballBodies[ballIndex];
    
    // Create a body for the mouse point
    const shape = new physics.btSphereShape(0.1);
    const transform = new physics.btTransform();
    transform.setIdentity();
    transform.setOrigin(new physics.btVector3(position.x, position.y, position.z));
    
    // Create motion state
    const motionState = new physics.btDefaultMotionState(transform);
    
    // Create rigid body (static - mass = 0)
    const rbInfo = new physics.btRigidBodyConstructionInfo(
      0, // Mass of 0 makes it static
      motionState,
      shape,
      new physics.btVector3(0, 0, 0) // No inertia for static objects
    );
    mouseBody = new physics.btRigidBody(rbInfo);
    
    // Make it kinematic
    mouseBody.setCollisionFlags(mouseBody.getCollisionFlags() | 2); // CF_KINEMATIC_OBJECT
    mouseBody.setActivationState(4); // DISABLE_DEACTIVATION
    
    // Add to physics world
    physicsWorld.addRigidBody(mouseBody);
    
    // Create the constraint between ball and mouse position
    const pivotInBall = new physics.btVector3(0, 0, 0);
    const pivotInMouse = new physics.btVector3(0, 0, 0);
    
    mouseConstraint = new physics.btPoint2PointConstraint(
      ballBody,
      mouseBody,
      pivotInBall,
      pivotInMouse
    );
    
    // Set constraint parameters
    mouseConstraint.setBreakingImpulseThreshold(3500); // High enough to not break easily
    
    // Add constraint to physics world
    physicsWorld.addConstraint(mouseConstraint, true);
    
    console.log('Mouse constraint created for ball', ballIndex);
  } catch (error) {
    console.error('Error creating mouse constraint:', error);
  }
}

// Update mouse constraint position
function updateMouseConstraint(position) {
  if (mouseBody && physics) {
    try {
      // Create transform for new position
      const transform = new physics.btTransform();
      transform.setIdentity();
      transform.setOrigin(new physics.btVector3(position.x, position.y, position.z));
      
      // Apply transform to mouse body
      mouseBody.setWorldTransform(transform);
      mouseBody.activate();
    } catch (error) {
      console.error('Error updating mouse constraint:', error);
    }
  }
}

// Release mouse constraint
function releaseMouseConstraint() {
  if (mouseConstraint && physicsWorld) {
    try {
      // Remove constraint from physics world
      physicsWorld.removeConstraint(mouseConstraint);
      mouseConstraint = null;
    } catch (error) {
      console.error('Error removing constraint:', error);
    }
  }
  
  if (mouseBody && physicsWorld) {
    try {
      // Remove mouse body from physics world
      physicsWorld.removeRigidBody(mouseBody);
      mouseBody = null;
    } catch (error) {
      console.error('Error removing mouse body:', error);
    }
  }
}