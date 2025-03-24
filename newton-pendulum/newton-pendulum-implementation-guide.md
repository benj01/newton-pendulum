# Newton's Cradle Implementation Guide

This document serves as both an instruction manual and tracking document for implementing a realistic Newton's Cradle simulation using Three.js for 3D rendering and Ammo.js for physics.

## Project Overview

We're creating a physics-accurate Newton's Cradle with the following features:
- 3D visualization with Three.js
- Realistic physics with Ammo.js
- Interactive elements (mouse control)
- Optimized performance

## Development Plan

### 1. Project Structure ✅

```
/newton-pendulum  
 ├── /public      
 ├── /src         
 │   ├── main.js   # Entry point
 │   ├── scene.js  # Three.js scene setup
 │   ├── physics.js # Ammo.js physics setup
 │   ├── utils.js  # Helper functions
 ├── index.html    
 ├── package.json  
 ├── vite.config.js
```

### 2. Scene Setup with Three.js ⬜

- [ ] Initialize basic Three.js scene
- [ ] Setup PerspectiveCamera with appropriate position
- [ ] Add OrbitControls for camera interaction
- [ ] Create metal spheres using SphereGeometry
- [ ] Add frame (top bar) using CylinderGeometry
- [ ] Create strings/wires using LineGeometry
- [ ] Set up lighting (ambient + directional)
- [ ] Configure renderer with proper size and shadows

Implementation details:
- Spheres should be metallic/reflective
- Scene should have a simple, clean background
- Position camera to view the entire cradle
- Frame should be positioned above the spheres

### 3. Ammo.js Physics Integration ⬜

- [ ] Initialize Ammo.js with WebAssembly
- [ ] Create a physics world with gravity
- [ ] Build rigid bodies for each sphere
- [ ] Create the frame as a static rigid body
- [ ] Add point-to-point constraints for strings
- [ ] Configure proper mass, inertia, and friction values
- [ ] Setup collision detection

Implementation details:
- Use `Ammo().then(...)` pattern for initialization
- Set gravity to -9.81 m/s² on Y-axis
- Configure proper material properties (restitution)
- Each string should be a btPoint2PointConstraint
- Ensure spheres can collide with each other

### 4. User Interactivity ⬜

- [ ] Implement mouse raycasting for object selection
- [ ] Create drag functionality for spheres
- [ ] Apply impulse when releasing a dragged sphere
- [ ] Add reset button/function
- [ ] Implement optional controls (speed, gravity)

Implementation details:
- Use THREE.Raycaster for mouse picking
- Create a "ghost" constraint while dragging
- Apply impulse based on drag movement
- Handle multiple interaction cases properly

### 5. Physics and Rendering Synchronization ⬜

- [ ] Create animation loop
- [ ] Implement fixed timestep for physics (1/60s)
- [ ] Update Three.js objects from physics state
- [ ] Properly handle window resize events
- [ ] Optimize render/physics cycle

Implementation details:
- Use requestAnimationFrame for the main loop
- Call world.stepSimulation() with fixed timestep
- Get transform matrices from Ammo objects
- Apply those transforms to Three.js objects

### 6. Performance Optimization ⬜

- [ ] Implement object "sleeping" when motion stops
- [ ] Use btDiscreteDynamicsWorld for better performance
- [ ] Enable GPU instancing for repeated geometries
- [ ] Optimize shadow calculations
- [ ] Implement FPS counter for performance monitoring

Implementation details:
- Configure proper sleep thresholds
- Consider using simplified collision shapes
- Test and adjust simulation parameters for stability
- Implement LOD (Level of Detail) if needed

## Implementation Details

### scene.js

This file will handle all Three.js related setup and rendering:

```javascript
// Key functions to implement:
- initScene()
- createRenderer()
- setupCamera()
- createLighting()
- createCradle(numBalls)
- animate()
- handleResize()
```

### physics.js

This file will handle all Ammo.js physics setup and simulation:

```javascript
// Key functions to implement:
- initPhysics()
- createBallBody(radius, mass, position)
- createFrameBody()
- createStringConstraint(ballBody, frameBody, length)
- stepSimulation(deltaTime)
- applyImpulse(ballBody, force)
- syncObjectTransforms()
```

### utils.js

Helper functions for various calculations and utilities:

```javascript
// Key functions to implement:
- degToRad(degrees)
- createTransformMatrix()
- calculateInertia(shape, mass)
- createFPSCounter()
- debounce(func, wait)
```

### main.js

Entry point that connects all components:

```javascript
// Key responsibilities:
- Import and initialize all modules
- Handle user input
- Create the main loop
- Initialize the application
```

## Development Phases

### Phase 1: Basic Setup
- Three.js scene with basic objects
- Simple physics world with gravity
- Basic sphere collisions

### Phase 2: Constraints and Materials
- Add proper constraints for strings
- Improve materials and lighting
- Fix collision detection and response

### Phase 3: Interactivity
- Implement mouse control
- Add UI elements for configuration
- Test and refine user experience

### Phase 4: Optimization
- Performance improvements
- Physics tuning
- Final polish and bug fixes

## Testing and Debugging

- Use Ammo.js debug drawing if available
- Add FPS counter in the corner
- Log physics state for troubleshooting
- Test on multiple devices/browsers

## Resources

- Three.js documentation: https://threejs.org/docs/
- Ammo.js examples: https://github.com/kripken/ammo.js/
- Physics tutorial: https://medium.com/@bluemagnificent/intro-to-javascript-3d-physics-using-ammo-js-and-three-js-dd48df81f591
- Newton's Cradle physics explanation: https://en.wikipedia.org/wiki/Newton%27s_cradle
