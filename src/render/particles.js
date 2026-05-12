import * as THREE from 'three';

export function createParticleSystem({ scene, particles, particleGeometry }) {
  const particlePool = [];

  function createParticle() {
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(particleGeometry, material);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, material, velocity: new THREE.Vector3(), life: 0, maxLife: 0.8, gravity: -3.5, active: false };
  }

  function releaseParticle(particle) {
    particle.active = false;
    particle.mesh.visible = false;
    particle.mesh.scale.setScalar(1);
    particle.velocity.set(0, 0, 0);
    if (particle.mesh.parent !== scene) {
      particle.mesh.removeFromParent();
      scene.add(particle.mesh);
    }
    particlePool.push(particle);
  }

  function spawnParticle({ position, color, velocity, life, maxLife = life, gravity = -3.5, opacity = 1, scale = 1, depthWrite = true }) {
    const particle = particlePool.pop() || createParticle();
    particle.active = true;
    particle.life = life;
    particle.maxLife = maxLife;
    particle.gravity = gravity;
    particle.velocity.copy(velocity);
    particle.material.color.setHex(color);
    particle.material.opacity = opacity;
    particle.material.depthWrite = depthWrite;
    particle.mesh.position.copy(position);
    particle.mesh.scale.setScalar(scale);
    particle.mesh.visible = true;
    if (particle.mesh.parent !== scene) scene.add(particle.mesh);
    particles.push(particle);
    return particle;
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.life -= dt;
      particle.velocity.y += (particle.gravity ?? -3.5) * dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.scale.multiplyScalar(0.965);
      particle.material.opacity = THREE.MathUtils.clamp(particle.life / (particle.maxLife ?? 0.8), 0, 1);

      if (particle.life <= 0) {
        particles.splice(i, 1);
        releaseParticle(particle);
      }
    }
  }

  function clearParticles() {
    while (particles.length) {
      const particle = particles.pop();
      releaseParticle(particle);
    }
  }

  return { spawnParticle, updateParticles, clearParticles };
}
