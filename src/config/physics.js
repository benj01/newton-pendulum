// Physics configuration settings
export const physicsConfig = {
  // World settings
  gravityConstant: -9.8,
  timeStep: 1/120,
  maxSubSteps: 10,
  
  // Ball settings
  ball: {
    mass: 2,
    restitution: 0.95,
    friction: 0.1,
    linearDamping: 0.1,
    angularDamping: 0.1,
    radius: 0.5
  },
  
  // Frame settings
  frame: {
    mass: 0,  // Static body
    restitution: 0.7,
    friction: 0.5
  },
  
  // String settings
  string: {
    segments: 8,
    mass: 0.01,
    radius: 0.03,
    restitution: 0.1,
    friction: 0.9,
    damping: 0.9
  },
  
  // Soft body settings (if supported)
  softBody: {
    enabled: true,
    segmentsPerString: 14,
    mass: 0.07,
    damping: 0.08,
    lift: 0.1,
    pressure: 50,
    volumeConservation: 20,
    dynamicFriction: 0.2,
    poseMatching: 0.2,
    contactHardness: 1.0,
    kineticHardness: 0.8,
    softHardness: 1.0,
    maxVolume: 1.0
  }
}; 