// Updated controls.js with ball dragging functionality
import * as THREE from 'three';
import { applyImpulse } from './physics.js';

// Controls variables
let camera, renderer, orbitControls, scene;
let animationStarted = false;
let isDragging = false;
let selectedBall = null;
let mouseConstraint = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let dragPlane = new THREE.Plane();
let dragPoint = new THREE.Vector3();
let physicsWorld = null;
let physics = null;

// Setup controls for the scene
export function setupControls(sceneCamera, sceneRenderer, sceneControls, sceneObj, physicsObj, ammoObj) {
  camera = sceneCamera;
  renderer = sceneRenderer;
  orbitControls = sceneControls;
  scene = sceneObj;
  physicsWorld = physicsObj;
  physics = ammoObj;
}

// Setup event listeners for user interaction
export function setupEventListeners(cradle, startAnimationCallback, resetCameraCallback, sceneObjects) {
  // Mouse event listeners for ball dragging
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  
  // Touch event listeners for mobile
  renderer.domElement.addEventListener('touchstart', onTouchStart);
  window.addEventListener('touchmove', onTouchMove);
  window.addEventListener('touchend', onTouchEnd);
  
  // Use sceneObjects.renderer.domElement for the click event listener
  sceneObjects.renderer.domElement.addEventListener('click', (event) => {
    // Only trigger animation on click if we're not dragging a ball
    if (!isDragging && !animationStarted) {
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
      
      // Log ball positions if available
      if (cradle && cradle.balls) {
        console.log('Ball positions:');
        cradle.balls.forEach((ball, index) => {
          console.log(`Ball ${index}:`, ball.position);
        });
      }
    }
  });
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
  
  // Get balls from the scene
  const balls = scene.children.filter(obj => obj.geometry && obj.geometry.type === 'SphereGeometry');
  
  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);
  
  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(balls);
  
  if (intersects.length > 0) {
    // Disable orbit controls temporarily
    orbitControls.enabled = false;
    
    // Set selected ball
    selectedBall = intersects[0].object;
    isDragging = true;
    
    // Set up drag plane aligned with the camera view
    dragPlane.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(dragPlane.normal).negate(),
      selectedBall.position
    );
    
    // Calculate drag point (intersection of ray with drag plane)
    raycaster.ray.intersectPlane(dragPlane, dragPoint);
    
    // Create physics constraint
    createMouseConstraint(selectedBall, dragPoint);
  }
}

// Mouse move event handler
function onMouseMove(event) {
  if (isDragging && selectedBall) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Calculate new drag point (intersection of ray with drag plane)
    raycaster.ray.intersectPlane(dragPlane, dragPoint);
    
    // Update the mouse constraint target position
    updateMouseConstraint(dragPoint);
  }
}

// Mouse up event handler
function onMouseUp(event) {
  if (isDragging) {
    // Re-enable orbit controls
    orbitControls.enabled = true;
    
    // Release the constraint
    releaseMouseConstraint();
    
    // Reset drag state
    isDragging = false;
    selectedBall = null;
  }
}

// Touch event handlers for mobile support
function onTouchStart(event) {
  // Prevent default behavior
  event.preventDefault();
  
  // Convert touch to mouse event
  const touch = event.touches[0];
  const mouseEvent = {
    clientX: touch.clientX,
    clientY: touch.clientY,
    preventDefault: () => {}
  };
  
  onMouseDown(mouseEvent);
}

function onTouchMove(event) {
  if (isDragging) {
    event.preventDefault();
    
    const touch = event.touches[0];
    const mouseEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY
    };
    
    onMouseMove(mouseEvent);
  }
}

function onTouchEnd(event) {
  onMouseUp(event);
}

// Create mouse constraint for dragging
function createMouseConstraint(ball, position) {
  // First, find the corresponding physics body
  // This requires accessing the ballBodies array from physics.js
  // For now, we'll just create a temporary reference
  
  if (!physics || !physicsWorld) {
    console.error('Physics not initialized for mouse constraint');
    return;
  }
  
  try {
    // Create a temporary body for the mouse point
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
    const mouseBody = new physics.btRigidBody(rbInfo);
    
    // Make it kinematic
    mouseBody.setCollisionFlags(mouseBody.getCollisionFlags() | 2); // CF_KINEMATIC_OBJECT
    mouseBody.setActivationState(4); // DISABLE_DEACTIVATION
    
    // Add to physics world
    physicsWorld.addRigidBody(mouseBody);
    
    // Store the mouse body
    mouseConstraint = {
      mouseBody,
      targetBody: null, // This should be set to the actual ball body
      constraint: null,
      originalPosition: ball.position.clone()
    };
    
    // IMPORTANT: We need to get the actual ball body from physics.js
    // For now, just log that we need to implement this properly
    console.log('Mouse constraint created, but needs to be connected to actual ball body');
    
    // This would be the ideal implementation, but requires accessing the ball bodies
    // const ballIndex = getBallIndex(ball);
    // if (ballIndex !== -1) {
    //   const ballBody = getBallBodies()[ballIndex];
    //   
    //   // Create the constraint
    //   const pivotInBall = new physics.btVector3(0, 0, 0);
    //   const pivotInMouse = new physics.btVector3(0, 0, 0);
    //   
    //   const constraint = new physics.btPoint2PointConstraint(
    //     ballBody,
    //     mouseBody,
    //     pivotInBall,
    //     pivotInMouse
    //   );
    //   
    //   physicsWorld.addConstraint(constraint, true);
    //   mouseConstraint.targetBody = ballBody;
    //   mouseConstraint.constraint = constraint;
    // }
  } catch (error) {
    console.error('Error creating mouse constraint:', error);
  }
}

// Update mouse constraint position
function updateMouseConstraint(position) {
  if (mouseConstraint && mouseConstraint.mouseBody) {
    try {
      // Create transform for new position
      const transform = new physics.btTransform();
      transform.setIdentity();
      transform.setOrigin(new physics.btVector3(position.x, position.y, position.z));
      
      // Apply transform to mouse body
      mouseConstraint.mouseBody.setWorldTransform(transform);
      mouseConstraint.mouseBody.activate();
      
      // If we have a target body, activate it too
      if (mouseConstraint.targetBody) {
        mouseConstraint.targetBody.activate();
      }
    } catch (error) {
      console.error('Error updating mouse constraint:', error);
    }
  }
}

// Release mouse constraint
function releaseMouseConstraint() {
  if (mouseConstraint) {
    try {
      // Remove constraint from physics world
      if (mouseConstraint.constraint) {
        physicsWorld.removeConstraint(mouseConstraint.constraint);
      }
      
      // Remove mouse body from physics world
      if (mouseConstraint.mouseBody) {
        physicsWorld.removeRigidBody(mouseConstraint.mouseBody);
      }
      
      // Clean up
      mouseConstraint = null;
    } catch (error) {
      console.error('Error releasing mouse constraint:', error);
    }
  }
}

// Reset animation state
export function resetAnimation() {
  animationStarted = false;
}

// Check if animation has started
export function isAnimationStarted() {
  return animationStarted;
}

// Get the index of a ball in the cradle
function getBallIndex(ball) {
  // This function would need to be implemented to find which physics body
  // corresponds to the visual ball that was clicked
  return -1; // Not implemented yet
}