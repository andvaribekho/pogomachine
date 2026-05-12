import * as THREE from 'three';

export function spawnExplosion({ scene, particles, particleGeometry, position, color, count = 12 }) {
  for (let i = 0; i < count; i += 1) {
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 4.5,
      (Math.random() - 0.5) * 4.5,
      (Math.random() - 0.5) * 4.5
    );
    particles.spawnParticle
      ? particles.spawnParticle({ position, color, velocity, life: 0.55 + Math.random() * 0.25 })
      : spawnLegacyParticle({ scene, particles, particleGeometry, position, color, velocity, life: 0.55 + Math.random() * 0.25 });
  }
}

export function spawnBulletImpact({ scene, particles, particleGeometry, position, color }) {
  for (let i = 0; i < 7; i += 1) {
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 1.6,
      0.45 + Math.random() * 1.5,
      (Math.random() - 0.5) * 1.6
    );
    particles.spawnParticle
      ? particles.spawnParticle({ position, color, velocity, life: 0.26 + Math.random() * 0.14 })
      : spawnLegacyParticle({ scene, particles, particleGeometry, position, color, velocity, life: 0.26 + Math.random() * 0.14 });
  }
}

function spawnLegacyParticle({ scene, particles, particleGeometry, position, color, velocity, life }) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
  const mesh = new THREE.Mesh(particleGeometry, material);
  mesh.position.copy(position);
  scene.add(mesh);
  particles.push({ mesh, material, velocity, life });
}
