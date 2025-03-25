# Ammo.js Soft Body API Documentation

This document lists all available methods and properties for Ammo.js soft body objects in our Newton's Cradle simulation.

## Initialization
The soft body support is checked and initialized at startup. Required features:
- btSoftBodyHelpers
- btSoftBodyWorldInfo
- btSoftBodyRigidBodyCollisionConfiguration
- btSoftRigidDynamicsWorld

## Available Methods

### Core Soft Body Methods
- `get_m_nodes()` - Get the nodes of the soft body
- `get_m_materials()` - Get the materials array
- `get_m_faces()` - Get the faces array
- `get_m_cfg()` - Get the configuration
- `get_m_anchors()` - Get the anchors array
- `appendMaterial()` - Add a new material
- `appendNode(position, mass)` - Add a new node
- `appendLink(node1, node2, material, bending)` - Add a link between nodes
- `appendFace(node1, node2, node3, material)` - Add a face
- `appendAnchor(node, body, disableCollision, influence)` - Anchor a node to a rigid body
- `generateClusters(k, maxIterations)` - Generate clusters for better stability
- `generateBendingConstraints(distance, material)` - Generate bending constraints

### Physics Methods
- `addForce(force, position)` - Add force at position
- `addAeroForceToNode(node, velocity)` - Add aerodynamic force to node
- `getTotalMass()` - Get total mass
- `setTotalMass(mass, fromfaces)` - Set total mass
- `setMass(node, mass)` - Set mass for node
- `getRestLengthScale()` - Get rest length scale
- `setRestLengthScale(scale)` - Set rest length scale

### Transform Methods
- `transform(transform)` - Apply transform
- `translate(translation)` - Apply translation
- `rotate(rotation)` - Apply rotation
- `scale(scale)` - Apply scale

### Collision Methods
- `setAnisotropicFriction(friction, mode)`
- `getCollisionShape()`
- `setContactProcessingThreshold(threshold)`
- `setCollisionFlags(flags)`
- `getCollisionFlags()`
- `setCollisionShape(shape)`

### State Methods
- `setActivationState(state)`
- `forceActivationState(state)`
- `activate(forceActivation)`
- `isActive()`
- `isKinematicObject()`
- `isStaticObject()`
- `isStaticOrKinematicObject()`

### Material Properties
- `getRestitution()`
- `getFriction()`
- `getRollingFriction()`
- `setRestitution(value)`
- `setFriction(value)`
- `setRollingFriction(value)`

### World Transform
- `getWorldTransform()`
- `setWorldTransform(transform)`

### CCD Methods
- `setCcdMotionThreshold(threshold)`
- `setCcdSweptSphereRadius(radius)`

### User Data
- `getUserIndex()`
- `setUserIndex(index)`
- `getUserPointer()`
- `setUserPointer(pointer)`

## Properties
- `kB` (number) - Internal pointer/handle

## Common Operations

### Creating a Rope
```javascript
// Create rope between two points
const rope = softBodyHelpers.CreateRope(
  worldInfo,
  startPoint,
  endPoint,
  numSegments,
  flags
);

// Configure material properties
const material = rope.get_m_materials().at(0);
material.set_m_kLST(1.0);  // Linear stiffness
material.set_m_kAST(1.0);  // Angular stiffness
material.set_m_kVST(1.0);  // Volume stiffness

// Generate internal constraints
rope.generateClusters(8, 512);
rope.generateBendingConstraints(2);
```

### Adding Anchors
```javascript
// Anchor to rigid body
rope.appendAnchor(nodeIndex, rigidBody, disableCollision, influence);

// Fix node position
const node = rope.get_m_nodes().at(nodeIndex);
node.set_m_x(position);
node.set_m_q(position);
node.set_m_v(new Ammo.btVector3(0, 0, 0));
node.set_m_im(0);  // Set inverse mass to 0 to fix position
```

## Example Usage
```javascript
// Example code snippets will be added here
``` 