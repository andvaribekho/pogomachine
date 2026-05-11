import * as THREE from 'three';

export function createParticleSystem({ particles }) {
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.life -= dt;
      particle.velocity.y += (particle.gravity ?? -3.5) * dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.scale.multiplyScalar(0.965);
      particle.material.opacity = THREE.MathUtils.clamp(particle.life / (particle.maxLife ?? 0.8), 0, 1);

      if (particle.life <= 0) {
        particle.mesh.removeFromParent();
        particle.material.dispose();
        particles.splice(i, 1);
      }
    }
  }

  function clearParticles() {
    while (particles.length) {
      const particle = particles.pop();
      particle.mesh.removeFromParent();
      particle.material.dispose();
    }
  }

  return { updateParticles, clearParticles };
}
