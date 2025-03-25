// Scene configuration settings
export const sceneConfig = {
  // Cradle settings
  numBalls: 1,
  ballSpacing: 1.2,
  ropeLength: 2.0,
  ballRadius: 0.5,
  
  // Frame settings
  frame: {
    width: 0.1,
    height: 0.1,
    depth: 0.1,
    topBarLength: 6.0,
    sideBarLength: 3.0,
    bottomBarLength: 6.0
  },
  
  // Camera settings
  camera: {
    position: { x: 0, y: 2, z: 5 },
    target: { x: 0, y: 0, z: 0 },
    fov: 75,
    near: 0.1,
    far: 1000
  },
  
  // Lighting settings
  lighting: {
    ambient: 0.5,
    directional: 1.0,
    position: { x: 5, y: 5, z: 5 }
  },
  
  // Animation settings
  animation: {
    enabled: true,
    autoStart: true,
    speed: 1.0
  }
}; 