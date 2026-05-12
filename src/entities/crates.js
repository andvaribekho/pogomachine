import * as THREE from 'three';
import { angleInArc } from '../core/utils.js';
import { getTileAtWorldPoint, platformY } from './platforms.js';

export function createCrateSystem({
  scene,
  world,
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
  const crateLocalPosition = new THREE.Vector3();

  function createCrate(platformGroup, angle, radius) {
    const mesh = new THREE.Mesh(crateGeometry, crateMaterial);
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
      crate.mesh.getWorldPosition(crateLocalPosition);
      platform.group.worldToLocal(crateLocalPosition);
      const r = Math.hypot(crateLocalPosition.x, crateLocalPosition.z);
      const a = (Math.atan2(crateLocalPosition.z, crateLocalPosition.x) + twoPi) % twoPi;
      if (r < platformInnerRadius || r > platformOuterRadius || !angleInArc(a, tile.start, tile.end)) continue;
      world.attach(crate.mesh);
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
    crate.mesh.removeFromParent();
    crates.splice(crateIndex, 1);

    if (byBullet && platGroup) {
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
          crate.mesh.getWorldPosition(crateWorldPosition);
          crateWorldPosition.y = platformTop;
          if (!getTileAtWorldPoint(platform, crateWorldPosition)) continue;

          crate.platformGroup = platform.group;
          platform.group.attach(crate.mesh);
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
