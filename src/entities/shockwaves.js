import * as THREE from 'three';

export function createShockwaveSystem({
  scene,
  ball,
  enemies,
  shockwaves,
  shockwaveGeometry,
  shockwaveMaterial,
  getPlayerHitboxRadius,
  getEnemyWorldPosition,
  applyDamage,
  damageEnemy,
  playPufferExplosionSound,
}) {
  function explodePuffer(position) {
    playPufferExplosionSound();
    const material = shockwaveMaterial.clone();
    const mesh = new THREE.Mesh(shockwaveGeometry, material);
    mesh.position.copy(position);
    mesh.scale.setScalar(0.1);
    scene.add(mesh);
    shockwaves.push({ mesh, material, position: position.clone(), radius: 0.1, maxRadius: 2.2, life: 0.55, maxLife: 0.55, damagedEnemies: new Set(), damagedPlayer: false });
  }

  function updateShockwaves(dt) {
    for (let i = shockwaves.length - 1; i >= 0; i -= 1) {
      const shockwave = shockwaves[i];
      const previousRadius = shockwave.radius;
      shockwave.life -= dt;
      const progress = 1 - Math.max(0, shockwave.life / shockwave.maxLife);
      shockwave.radius = THREE.MathUtils.lerp(0.1, shockwave.maxRadius, progress);
      shockwave.mesh.scale.setScalar(shockwave.radius);
      shockwave.material.opacity = Math.max(0, 0.42 * (1 - progress));
      if (!shockwave.damagedPlayer && ball.position.distanceToSquared(shockwave.position) <= (shockwave.radius + getPlayerHitboxRadius()) ** 2) {
        shockwave.damagedPlayer = true;
        applyDamage();
      }
      for (let e = enemies.length - 1; e >= 0; e -= 1) {
        const enemy = enemies[e];
        if (shockwave.damagedEnemies.has(enemy)) continue;
        const pos = getEnemyWorldPosition(enemy);
        const effectiveRadius = Math.max(shockwave.radius, previousRadius) + enemy.collisionRadius + 0.35;
        if (pos.distanceToSquared(shockwave.position) <= effectiveRadius * effectiveRadius) {
          shockwave.damagedEnemies.add(enemy);
          damageEnemy(e);
        }
      }
      if (shockwave.life <= 0) {
        shockwave.mesh.removeFromParent();
        shockwave.material.dispose();
        shockwaves.splice(i, 1);
      }
    }
  }

  function clearShockwaves() {
    while (shockwaves.length) {
      const shockwave = shockwaves.pop();
      shockwave.mesh.removeFromParent();
      shockwave.material.dispose();
    }
  }

  return { explodePuffer, updateShockwaves, clearShockwaves };
}
