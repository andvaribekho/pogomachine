export function integrateBallPhysics({ ball, ballVelocity, gravity, terminalVelocity, dt }) {
  const nextVelocity = Math.max(ballVelocity + gravity * dt, -terminalVelocity);
  ball.position.y += nextVelocity * dt;
  ball.rotation.x += dt * 8;
  return nextVelocity;
}
