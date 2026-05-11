import * as THREE from 'three';
import { angleInArc } from '../core/utils.js';
import { platformY } from './platforms.js';

export function createCrateSystem({
  scene,
  ball,
  ballRadius,
  platforms,
  crates,
  crateGeometry,
  crateMaterial,
  platformThickness,
  platformInnerRadius,
  platformOuterRadius,
  twoPi,
  colors,
  getCoins,
  setCoins,
  updateCoinsUI,
  coinsEl,
  spawnExplosion,
  spawnCoinPickup,
  spawnCoinPickupAnimation,
}) {
  const crateWorldPosition = new THREE.Vector3();

  function createCrate(platformGroup, angle, radius) {
    const mesh = new THREE.Mesh(crateGeometry.clone(), crateMaterial.clone());
    mesh.position.set(
      Math.cos(angle) * radius,
      platformThickness / 2 + 0.22,
      Math.sin(angle) * radius
    );
    mesh.rotation.y = angle;
    platformGroup.add(mesh);
    crates.push({ mesh, platformGroup, value: 5, broken: false, falling: false, fallVelocity: 0 });
  }

  function detachCratesFromTile(platform, tile) {
    for (const crate of crates) {
      if (crate.broken || crate.platformGroup !== platform.group) continue;
      const localPos = new THREE.Vector3();
      crate.mesh.getWorldPosition(localPos);
      const r = Math.hypot(localPos.x, localPos.z);
      const a = (Math.atan2(localPos.z, localPos.x) + twoPi) % twoPi;
      if (r < platformInnerRadius || r > platformOuterRadius || !angleInArc(a, tile.start, tile.end)) continue;
      crate.platformGroup.remove(crate.mesh);
      scene.add(crate.mesh);
      crate.platformGroup = null;
      crate.falling = true;
      crate.fallVelocity = 0;
    }
  }

  function breakCrate(crateIndex, byBullet = false) {
    const crate = crates[crateIndex];
    if (!crate || crate.broken) return false;

    crate.broken = true;
    crate.mesh.getWorldPosition(crateWorldPosition);
    const platGroup = crate.platformGroup;
    spawnExplosion(crateWorldPosition, colors.crate, 12);
    platGroup.remove(crate.mesh);
    crate.mesh.geometry.dispose();
    crate.mesh.material.dispose();
    crates.splice(crateIndex, 1);

    if (byBullet) {
      spawnCoinPickup(crateWorldPosition, platGroup);
    } else {
      setCoins(getCoins() + 5);
      updateCoinsUI(coinsEl, getCoins());
      spawnCoinPickupAnimation(crateWorldPosition);
    }
    return true;
  }

  function checkBulletCrateHit(bullet, previousY) {
    for (let i = crates.length - 1; i >= 0; i -= 1) {
      const crate = crates[i];
      if (crate.broken) continue;
      crate.mesh.getWorldPosition(crateWorldPosition);
      const crossedCrateY = previousY >= crateWorldPosition.y && bullet.mesh.position.y <= crateWorldPosition.y;
      const horizontalDistance = Math.hypot(
        bullet.mesh.position.x - crateWorldPosition.x,
        bullet.mesh.position.z - crateWorldPosition.z
      );
      if (crossedCrateY && horizontalDistance <= 0.3) {
        return breakCrate(i, true);
      }
    }
    return false;
  }

  function checkBallCrateHit(previousY) {
    const bottomBefore = previousY - ballRadius;
    const bottomNow = ball.position.y - ballRadius;

    for (let i = crates.length - 1; i >= 0; i -= 1) {
      const crate = crates[i];
      if (crate.broken) continue;
      crate.mesh.getWorldPosition(crateWorldPosition);
      const crateTop = crateWorldPosition.y + 0.17;
      const crossedCrateTop = bottomBefore >= crateTop && bottomNow <= crateTop;
      const horizontalDistance = Math.hypot(
        ball.position.x - crateWorldPosition.x,
        ball.position.z - crateWorldPosition.z
      );

      if (crossedCrateTop && horizontalDistance <= ballRadius + 0.22) {
        breakCrate(i);
        return;
      }
    }
  }

  function updateFallingCrates(dt) {
    for (const crate of crates) {
      if (!crate.falling || crate.broken) continue;
      const previousY = crate.mesh.position.y;
      crate.fallVelocity = (crate.fallVelocity ?? 0) - 14 * dt;
      crate.mesh.position.y += crate.fallVelocity * dt;
      for (const platform of platforms) {
        const platformTop = platformY(platform) + platformThickness / 2 + 0.22;
        if (previousY >= platformTop && crate.mesh.position.y <= platformTop) {
          crate.platformGroup = platform.group;
          platform.group.add(crate.mesh);
          crate.mesh.position.y = platformThickness / 2 + 0.22;
          crate.falling = false;
          crate.fallVelocity = 0;
          break;
        }
      }
    }
  }

  return {
    createCrate,
    detachCratesFromTile,
    breakCrate,
    checkBulletCrateHit,
    checkBallCrateHit,
    updateFallingCrates,
  };
}
