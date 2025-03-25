const startX = ball.position.x;
const startY = topFrame.position.y;
const endX = ball.position.x;
const endY = ball.position.y + ball.geometry.parameters.radius;

// Calculate interpolation factor based on node index
const t = j / (numNodes - 1);

positions[j * 3] = startX;
positions[j * 3 + 1] = startY + (endY - startY) * t;
positions[j * 3 + 2] = 0;

// Create anchors to rigid bodies
if (frameBody && fixedPoints.includes(0)) {
  const frameAnchor = rope.appendAnchor(0, frameBody, true);
  if (!frameAnchor) {
    console.error("Failed to create frame anchor");
  }
}

if (ballBody && fixedPoints.includes(numNodes - 1)) {
  // Create a stronger connection to the ball
  const ballAnchor = rope.appendAnchor(numNodes - 1, ballBody, true);
  if (!ballAnchor) {
    console.error("Failed to create ball anchor");
  }
  // Add additional anchor point for stability
  if (numNodes > 1) {
    rope.appendAnchor(numNodes - 2, ballBody, false);
  }
}

// Set additional parameters for better stability
rope.setTotalMass(softBodyConfig.mass, true); // Force mass update
rope.setPose(true, true); // Set current pose as reference

// Add to physics world with proper collision flags
physicsWorld.addSoftBody(rope, 1, -1);
rope.setCollisionFlags(0x00); // Reset collision flags
softBodies.push(rope); 