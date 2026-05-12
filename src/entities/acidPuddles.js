import * as THREE from 'three';
import { angleInArc } from '../core/utils.js';
import { platformY } from './platforms.js';

export function createAcidPuddleSystem({
  scene,
  ball,
  enemies,
  platforms,
  particles,
  acidPuddles,
  acidPuddleMaterial,
  acidDropletGeometry,
  particleGeometry,
  colors,
  platformThickness,
  platformInnerRadius,
  platformOuterRadius,
  twoPi,
  getPlayerHitboxRadius,
  getAcidStompImmunity,
  getAcidBurnCooldown,
  setAcidBurnCooldown,
  getEnemyWorldPosition,
  removeEnemyAt,
  damageEnemy,
  applyDamage,
  playAcidBurnSound,
  spawnParticle,
}) {
  function spawnAcidPuddle(platformData, angle, radius, isDeath) {
    const size = isDeath ? 0.44 : 0.22;
    const geometry = new THREE.CircleGeometry(size, 20);
    const material = acidPuddleMaterial.clone();
    material.opacity = 0.85;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(
      Math.cos(angle) * radius,
      platformThickness / 2 + 0.005,
      Math.sin(angle) * radius
    );
    platformData.group.add(mesh);
    acidPuddles.push({
      mesh,
      material,
      platformData,
      angle,
      radius,
      age: 0,
      fullLife: isDeath ? 3 : 2,
      shrinkLife: 1,
      isDeath,
      baseSize: size,
      colliderPosition: new THREE.Vector3(),
      falling: false,
      fallVelocity: 0,
      isDroplet: false,
    });
  }

  function updateAcidPuddles(dt) {
    const damageRadius = getPlayerHitboxRadius() + 0.22;
    const damageRadiusSq = damageRadius * damageRadius;

    for (let i = acidPuddles.length - 1; i >= 0; i -= 1) {
      const puddle = acidPuddles[i];

      if (!puddle.falling) {
        if (!puddle.emitTimer) puddle.emitTimer = 0;
        puddle.emitTimer += dt;
        if (puddle.emitTimer >= 0.05) {
          puddle.emitTimer = 0;
          const worldPos = new THREE.Vector3();
          puddle.mesh.getWorldPosition(worldPos);
          for (let j = 0; j < 2; j += 1) {
            const particlePosition = new THREE.Vector3(
              worldPos.x + (Math.random() - 0.5) * 0.15,
              worldPos.y + 0.01,
              worldPos.z + (Math.random() - 0.5) * 0.15
            );
            const velocity = new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.8 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3);
            if (spawnParticle) {
              spawnParticle({ position: particlePosition, color: colors.acid, velocity, life: 0.4 + Math.random() * 0.3 });
            } else {
              const material = new THREE.MeshBasicMaterial({ color: colors.acid, transparent: true, opacity: 1 });
              const mesh = new THREE.Mesh(particleGeometry, material);
              mesh.position.copy(particlePosition);
              scene.add(mesh);
              particles.push({
                mesh,
                material,
                velocity,
                life: 0.4 + Math.random() * 0.3,
              });
            }
          }
        }
      }

      if (puddle.falling) {
        const previousY = puddle.mesh.position.y;
        puddle.fallVelocity -= 14 * dt;
        puddle.mesh.position.y += puddle.fallVelocity * dt;

        const dropletRadiusSq = 0.1 * 0.1;
        for (let e = enemies.length - 1; e >= 0; e -= 1) {
          const enemy = enemies[e];
          const enemyPos = getEnemyWorldPosition(enemy);
          const dx = puddle.mesh.position.x - enemyPos.x;
          const dy = puddle.mesh.position.y - enemyPos.y;
          const dz = puddle.mesh.position.z - enemyPos.z;
          if (dx * dx + dy * dy + dz * dz <= dropletRadiusSq + enemy.collisionRadius * enemy.collisionRadius) {
            if (enemy.type === 'bat' || enemy.type === 'jellyfish') {
              removeEnemyAt(e, colors.acid);
            } else if (enemy.type !== 'acidSnail') {
              damageEnemy(e);
            }
          }
        }

        const currentY = puddle.mesh.position.y;
        for (const platform of platforms) {
          const platformTop = platformY(platform) + platformThickness / 2;
          if (previousY >= platformTop && currentY <= platformTop && puddle.fallVelocity < 0) {
            const localPos = new THREE.Vector3(puddle.mesh.position.x, platformTop, puddle.mesh.position.z);
            platform.group.worldToLocal(localPos);
            const r = Math.hypot(localPos.x, localPos.z);
            const a = (Math.atan2(localPos.z, localPos.x) + twoPi) % twoPi;
            const tile = platform.tiles.find(t => !t.broken && angleInArc(a, t.start, t.end));
            if (tile && r >= platformInnerRadius && r <= platformOuterRadius) {
              puddle.mesh.removeFromParent();
              puddle.mesh.geometry.dispose();
              const size = puddle.isDeath ? 0.44 : 0.22;
              const geometry = new THREE.CircleGeometry(size, 20);
              const material = acidPuddleMaterial.clone();
              material.opacity = 0.85;
              const newMesh = new THREE.Mesh(geometry, material);
              newMesh.rotation.x = -Math.PI / 2;
              newMesh.position.set(localPos.x, platformThickness / 2 + 0.005, localPos.z);
              platform.group.add(newMesh);
              puddle.mesh = newMesh;
              puddle.material = material;
              puddle.platformData = platform;
              puddle.angle = a;
              puddle.radius = r;
              puddle.age = 0;
              puddle.falling = false;
              puddle.fallVelocity = 0;
              puddle.isDroplet = false;
              puddle.baseSize = size;
              break;
            }
          }
        }
        continue;
      }

      puddle.age += dt;
      const totalLife = puddle.fullLife + puddle.shrinkLife;

      if (puddle.age > puddle.fullLife) {
        const shrinkT = (puddle.age - puddle.fullLife) / puddle.shrinkLife;
        const scale = Math.max(0, 1 - shrinkT);
        puddle.mesh.scale.setScalar(scale);
        puddle.material.opacity = 0.85 * scale;
      }

      if (puddle.age >= totalLife) {
        puddle.mesh.removeFromParent();
        puddle.mesh.geometry.dispose();
        puddle.material.dispose();
        acidPuddles.splice(i, 1);
        continue;
      }

      puddle.colliderPosition.set(
        Math.cos(puddle.angle) * puddle.radius,
        platformThickness / 2 + 0.02,
        Math.sin(puddle.angle) * puddle.radius
      );
      puddle.platformData.group.localToWorld(puddle.colliderPosition);

      if (getAcidStompImmunity() <= 0 && getAcidBurnCooldown() <= 0 && ball.position.distanceToSquared(puddle.colliderPosition) <= damageRadiusSq) {
        applyDamage();
        playAcidBurnSound();
        setAcidBurnCooldown(0.5);
      }
    }
  }

  function detachAcidPuddlesFromTile(platform, tile) {
    for (const puddle of acidPuddles) {
      if (puddle.falling || puddle.platformData !== platform) continue;
      const angle = (puddle.angle + twoPi) % twoPi;
      if (angleInArc(angle, tile.start, tile.end)) {
        const worldPos = new THREE.Vector3();
        puddle.mesh.getWorldPosition(worldPos);
        puddle.mesh.removeFromParent();
        puddle.mesh.geometry.dispose();
        const dropletMaterial = acidPuddleMaterial.clone();
        dropletMaterial.opacity = 0.9;
        const dropletMesh = new THREE.Mesh(acidDropletGeometry, dropletMaterial);
        dropletMesh.position.copy(worldPos);
        scene.add(dropletMesh);
        puddle.mesh = dropletMesh;
        puddle.material = dropletMaterial;
        puddle.falling = true;
        puddle.fallVelocity = 0;
        puddle.isDroplet = true;
        puddle.platformData = null;
      }
    }
  }

  function clearAcidPuddles() {
    while (acidPuddles.length) {
      const puddle = acidPuddles.pop();
      puddle.mesh.removeFromParent();
      puddle.mesh.geometry.dispose();
      puddle.material.dispose();
    }
  }

  return {
    spawnAcidPuddle,
    updateAcidPuddles,
    detachAcidPuddlesFromTile,
    clearAcidPuddles,
  };
}
