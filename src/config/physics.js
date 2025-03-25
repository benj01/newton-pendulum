// Ball settings
ball: {
  mass: 1.5,            // Reduced mass for better stability
  restitution: 0.8,     // Reduced bounciness
  friction: 0.3,        // Increased friction
  linearDamping: 0.2,   // Increased damping
  angularDamping: 0.2,  // Increased damping
  radius: 0.5
},

// Frame settings
frame: {
  mass: 0,  // Static body
  restitution: 0.5,  // Reduced bounciness
  friction: 0.8      // Increased friction
},

// Soft body settings (if supported)
softBody: {
  enabled: true,
  segmentsPerString: 4,     // Keep reduced segments
  mass: 0.01,              // Further reduced mass
  damping: 0.4,            // Increased damping
  lift: 0.005,             // Minimal lift
  pressure: 5,             // Reduced pressure
  volumeConservation: 2,   // Reduced for more flexibility
  dynamicFriction: 0.5,    // Increased friction
  poseMatching: 0.8,       // Increased pose matching for stability
  contactHardness: 0.5,    // Reduced for softer contacts
  kineticHardness: 0.4,    // Reduced for smoother movement
  softHardness: 0.4,       // Reduced for smoother movement
  maxVolume: 1.0
} 