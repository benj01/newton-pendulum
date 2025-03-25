// Visual configuration settings
export const visualConfig = {
  // Ball materials
  ballMaterial: {
    color: 0x2196F3,
    metalness: 0.8,
    roughness: 0.2,
    reflectivity: 0.5
  },
  
  // Frame materials
  frameMaterial: {
    color: 0x424242,
    metalness: 0.5,
    roughness: 0.5,
    reflectivity: 0.3
  },
  
  // String materials
  stringMaterial: {
    color: 0x000000,
    opacity: 0.8,
    transparent: true
  },
  
  // Background settings
  background: {
    color: 0xF5F5F5,
    fog: {
      enabled: false,
      color: 0x000000,
      density: 0.002,
      near: 1,
      far: 100
    }
  },
  
  // Shadow settings
  shadows: {
    enabled: true,
    type: 'PCFSoftShadowMap',
    bias: -0.0001,
    normalBias: 0.04
  },
  
  // Post-processing settings
  postProcessing: {
    enabled: false,
    antialias: true,
    bloom: {
      enabled: false,
      strength: 0.5,
      radius: 0.4,
      threshold: 0.85
    }
  }
}; 