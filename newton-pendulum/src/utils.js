// utils.js - Utility functions for the Newton's Cradle simulation

import * as THREE from 'three';

/**
 * Convert degrees to radians
 */
export function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Calculate point on screen from 3D position
 */
export function getScreenPosition(position, camera, renderer) {
  const vector = position.clone();
  const widthHalf = renderer.domElement.width / 2;
  const heightHalf = renderer.domElement.height / 2;
  
  vector.project(camera);
  
  vector.x = (vector.x * widthHalf) + widthHalf;
  vector.y = -(vector.y * heightHalf) + heightHalf;
  
  return {
    x: vector.x,
    y: vector.y
  };
}

/**
 * Create a FPS counter for performance monitoring
 */
export function createFPSCounter() {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '10px';
  container.style.left = '10px';
  container.style.color = 'white';
  container.style.backgroundColor = 'rgba(0,0,0,0.5)';
  container.style.padding = '5px';
  container.style.borderRadius = '5px';
  container.style.fontFamily = 'monospace';
  container.style.fontSize = '12px';
  container.style.zIndex = '100';
  
  document.body.appendChild(container);
  
  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 0;
  
  function update() {
    const currentTime = performance.now();
    frameCount++;
    
    // Update once per second
    if (currentTime > lastTime + 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      frameCount = 0;
      lastTime = currentTime;
      container.textContent = `FPS: ${fps}`;
    }
    
    requestAnimationFrame(update);
  }
  
  update();
  
  return container;
}

/**
 * Debounce function to limit function calls
 */
export function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Detect raycaster intersections with objects
 */
export function getIntersections(mouse, camera, objects) {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  return raycaster.intersectObjects(objects);
}

/**
 * Calculate a 3D position from mouse coordinates and a plane
 */
export function get3DPositionOnPlane(mouse, camera, planeY = 0) {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  
  // Create an invisible horizontal plane at the specified Y coordinate
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
  
  // Get intersection point
  const point = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, point);
  
  return point;
}

/**
 * Create a drag plane based on camera view
 */
export function createDragPlane(camera, targetPoint) {
  // Create a plane that faces the camera and passes through the target point
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
  return new THREE.Plane(normal, -normal.dot(targetPoint));
}

/**
 * Calculate intersection point with a plane
 */
export function getIntersectionWithPlane(ray, plane) {
  const point = new THREE.Vector3();
  ray.intersectPlane(plane, point);
  return point;
}

/**
 * Add helper text to the scene
 */
export function createHelpText() {
  const helpDiv = document.createElement('div');
  helpDiv.style.position = 'absolute';
  helpDiv.style.bottom = '20px';
  helpDiv.style.left = '20px';
  helpDiv.style.color = 'white';
  helpDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
  helpDiv.style.padding = '10px';
  helpDiv.style.borderRadius = '5px';
  helpDiv.style.fontFamily = 'Arial, sans-serif';
  helpDiv.style.fontSize = '14px';
  helpDiv.style.zIndex = '100';
  helpDiv.style.pointerEvents = 'none'; // Makes it click-through
  
  helpDiv.innerHTML = `
    <p><strong>Newton's Cradle Controls:</strong></p>
    <p>• Click and drag a ball to move it</p>
    <p>• Release to let physics take over</p>
    <p>• Mouse wheel to zoom in/out</p>
    <p>• Right-click drag to rotate view</p>
  `;
  
  document.body.appendChild(helpDiv);
  
  return helpDiv;
}

/**
 * Normalize value between min and max to 0-1 range
 */
export function normalize(value, min, max) {
  return (value - min) / (max - min);
}

/**
 * Clamp value between min and max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}