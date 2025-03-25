// Create rigid bodies for the frame
function createFrameBodies(cradle, physics, physicsWorld) {
  const frameObjects = cradle.children.filter(child => child.name.startsWith('frame_'));
  
  // Create floor collision body first
  const floor = cradle.children.find(child => child.name === 'floor');
  if (floor) {
    const floorShape = new physics.btBoxShape(new physics.btVector3(15, 0.1, 15)); // Half-extents
    const transform = new physics.btTransform();
    transform.setIdentity();
    transform.setOrigin(new physics.btVector3(0, -2, 0)); // Match floor position
    
    const motionState = new physics.btDefaultMotionState(transform);
    const localInertia = new physics.btVector3(0, 0, 0);
    
    const rbInfo = new physics.btRigidBodyConstructionInfo(0, motionState, floorShape, localInertia);
    const body = new physics.btRigidBody(rbInfo);
    
    // Set high friction for the floor
    body.setFriction(1);
    body.setRestitution(0.3);
    
    // Add to physics world
    physicsWorld.addRigidBody(body);
    frameBodies.push(body);
    
    // Store physics body in userData
    floor.userData.physicsBody = body;
  }
  
  // Continue with frame objects
  frameObjects.forEach(frame => {
    // ... rest of existing createFrameBodies code ...
  });
} 