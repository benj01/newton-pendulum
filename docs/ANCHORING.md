# Newton's Cradle Anchoring Mechanisms Documentation

## Overview
This document details the various anchoring mechanisms implemented in the Newton's Cradle physics simulation, their characteristics, and fallback strategies.

## Table of Contents
- [1. Pinned Node Approach](#1-pinned-node-approach)
- [2. AppendAnchor Method](#2-appendanchor-method)
- [3. Soft Body Configuration](#3-soft-body-configuration)
- [4. Alternative Approaches](#4-alternative-approaches)
- [5. Fallback Mechanisms](#5-fallback-mechanisms)

## 1. Pinned Node Approach
Currently the primary implementation method for anchoring the ropes.

### Key Components
- **Inverse Mass Setting**
  ```javascript
  node.set_m_im(0);  // Frame node (completely fixed)
  node.set_m_im(1.0);  // Ball node (normal mass)
  node.set_m_im(0.5);  // Internal nodes (lighter for better behavior)
  ```

- **Direct Position Control**
  ```javascript
  node.set_m_x(pos);  // Set current position
  node.set_m_q(pos);  // Set previous position
  ```

- **Velocity Control**
  ```javascript
  node.set_m_v(new physics.btVector3(0, 0, 0));
  ```

### Implementation Details
- Frame nodes are fixed by setting inverse mass to 0
- Ball nodes maintain normal mass for physics interaction
- Internal nodes use reduced mass for improved rope behavior
- Position and velocity are directly controlled for precise anchoring

## 2. AppendAnchor Method
Native Ammo.js method that's available but currently not functioning as expected.

### Characteristics
- Native to Ammo.js soft body physics
- Takes node index, body, and collision flag parameters
- Currently returns undefined when called
- Includes debug logging for troubleshooting:
  ```javascript
  console.log("Rope object details:", {
    type: rope.constructor.name,
    methods: Object.getOwnPropertyNames(rope.__proto__),
    hasAppendAnchor: typeof rope.appendAnchor === 'function',
    properties: Object.keys(rope)
  });
  ```

## 3. Soft Body Configuration
Indirect control through material properties and physics parameters.

### Configuration Parameters
```javascript
const physicsConfig = {
  softBody: {
    enabled: true,
    segmentsPerString: 8,
    mass: 0.1,
    damping: 0.1,
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
```

### Runtime Configuration
```javascript
sbConfig.set_kDP(0.2);    // Damping
sbConfig.set_kDG(0.1);    // Drag
sbConfig.set_kLF(0.0);    // Lift
sbConfig.set_kPR(1.0);    // Pressure
sbConfig.set_kVC(1);      // Volume conservation
sbConfig.set_kDF(0.2);    // Dynamic friction
sbConfig.set_kMT(0.2);    // Pose matching
```

## 4. Alternative Approaches
### Ammo.js Constraints (Not Implemented)
- Point-to-point constraints
- Fixed constraints
- Would require different Ammo.js APIs
- Could provide alternative anchoring method if implemented

## 5. Fallback Mechanisms

### Simple Line Fallback
When soft body physics fails, the system falls back to a simple line representation:
```javascript
function createFallbackStringGeometry(string, ball, topFrame) {
  const positions = new Float32Array(2 * 3); // Two points
  const startX = ball.position.x;
  const startY = topFrame.position.y;
  const endX = ball.position.x;
  const endY = ball.position.y + ball.geometry.parameters.radius;
  
  // Set start and end points
  positions[0] = startX;
  positions[1] = startY;
  positions[2] = 0;
  positions[3] = endX;
  positions[4] = endY;
  positions[5] = 0;
}
```

### Error Handling
```javascript
const loggingState = {
  lastWarningTime: 0,
  warningCooldown: 1000,
  invalidNodeCounts: new Map(),
  hasLoggedFallback: new Set()
};
```

### Frame Body Configuration
Special configuration for frame bodies to support anchoring:
```javascript
body.setCollisionFlags(body.getCollisionFlags() | 1); // CF_STATIC_OBJECT
body.setActivationState(4); // DISABLE_DEACTIVATION
```

## Best Practices
1. Always implement fallback mechanisms for physics failures
2. Use debug logging for troubleshooting anchor issues
3. Configure frame bodies properly for stable anchoring
4. Monitor and handle invalid node positions
5. Rate-limit warning messages to prevent console spam

## Known Issues
1. AppendAnchor method currently non-functional
2. Potential instability in certain physics configurations
3. Need for manual position control in some cases

## Future Improvements
1. Implement Ammo.js constraints as alternative anchoring method
2. Improve appendAnchor functionality
3. Enhance error recovery mechanisms
4. Add more sophisticated fallback options 