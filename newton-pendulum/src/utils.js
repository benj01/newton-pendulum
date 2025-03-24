// utils.js - Helper functions and utilities

// Add info text to the DOM
export function addInfoText() {
  // Main info div
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
  
  // Mobile info div
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

// Convert degrees to radians
export function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

// Get screen position from 3D position
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

// Create a FPS counter for performance monitoring
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

// Debounce function to limit function calls
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