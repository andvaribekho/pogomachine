import * as THREE from 'three';
import { angleInArc } from '../core/utils.js';
import { getTileAtWorldPoint, platformY } from './platforms.js';

export function createObstacleSystem({
  world,
  ball,
  pillarSpikes,
  floaters,
  sawBlades,
  pillarLaserRings,
  spikeTraps,
  cannons,
  platforms,
  assets,
  constants,
  getLevelTarget,
  getCurrentLevel,
  getBulletLaneAngle,
  getWorldRotation,
  getBallVelocity,
  setBallVelocity,
  getBounceVelocity,
  getStompImpulse,
  getCannonChargeTime,
  getCannonCooldown,
  getLaserRingOnTime,
  getLaserRingOffTime,
  getPlayerHitboxRadius,
  getBallColliderPositions,
  reloadAmmo,
  spawnExplosion,
  spawnBulletImpact,
  spawnFloatingText,
  playReloadSound,
  playBounceSound,
  playCannonActivateSound,
  playCannonFireSound,
  applyDamage,
}) {
  const {
    floaterDiscGeometry,
    floaterMaterial,
    pillarSpikeGeometry,
    pillarSpikeMaterial,
    sawBladeGeometry,
    sawBladeMaterial,
    pillarLaserRingGeometry,
    pillarLaserRingMaterial,
    cannonBaseGeometry,
    cannonMouthGeometry,
    cannonRingGeometry,
    cannonLaserGeometry,
    cannonMaterial,
    cannonWarningMaterial,
    laserMaterial,
  } = assets;
  const {
    ballRadius,
    gameplayLaneRadius,
    goldBlockSize,
    ledgeRadialLength,
    pillarRadius,
    platformOuterRadius,
    platformSpacing,
    platformSpikeHeight,
    platformThickness,
    sawBladeLaneRadius,
    sawBladeOuterRadius,
    spikeCycleDuration,
    spikeDownDuration,
    spikeMoveDuration,
    spikeUpDuration,
    twoPi,
  } = constants;
  const floaterWorldPos = new THREE.Vector3();
  const sawBladeWorldPosition = new THREE.Vector3();
  const cannonWorldPosition = new THREE.Vector3();
  const cannonMouthWorldPosition = new THREE.Vector3();
  const cannonLosPoint = new THREE.Vector3();
  const cannonLocalPosition = new THREE.Vector3();
  const blueFloaterMaterial = floaterMaterial.clone();
  blueFloaterMaterial.color.setHex(0x2196f3);
  blueFloaterMaterial.userData.baseColor = 0x2196f3;

  function createCannonMesh() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(cannonBaseGeometry.clone(), cannonMaterial.clone());
    base.position.y = 0.11;
    group.add(base);

    const mouth = new THREE.Mesh(cannonMouthGeometry.clone(), cannonMaterial.clone());
    mouth.position.y = 0.34;
    group.add(mouth);

    const ring = new THREE.Mesh(cannonRingGeometry.clone(), cannonWarningMaterial.clone());
    ring.position.y = 0.56;
    ring.rotation.x = Math.PI / 2;
    ring.visible = false;
    group.add(ring);

    const laser = new THREE.Mesh(cannonLaserGeometry.clone(), laserMaterial.clone());
    laser.position.y = 18.56;
    laser.visible = false;
    group.add(laser);

    return { group, base, mouth, ring, laser };
  }

  function maybeSpawnCannon(platformData, id) {
    if (id < 7 || Math.random() > 0.16) return;
    const validTiles = platformData.tiles.filter(tile => tile.type === 'blue' && !tile.broken);
    if (validTiles.length === 0) return;

    const playerLane = ((getBulletLaneAngle() - getWorldRotation()) % twoPi + twoPi) % twoPi;
    const cannonTile = validTiles.find(tile => angleInArc(playerLane, tile.start, tile.end));
    if (!cannonTile) return;

    const cannon = createCannonMesh();
    const angle = playerLane;
    const radius = platformOuterRadius - 0.8;
    cannon.group.position.set(
      Math.cos(angle) * radius,
      platformThickness / 2 + 0.02,
      Math.sin(angle) * radius
    );
    cannon.group.rotation.y = -angle + Math.PI / 2;
    platformData.group.add(cannon.group);
    cannons.push({
      ...cannon,
      platformData,
      angle,
      radius,
      state: 'idle',
      charge: 0,
      cooldown: 0,
      laserTimer: 0,
      damagedThisShot: false,
      hp: 5,
      flashTimer: 0,
      falling: false,
      fallVelocity: 0,
    });
  }

  function getCannonWorldPosition(cannon) {
    cannonWorldPosition.set(0, 0.25, 0);
    cannon.group.localToWorld(cannonWorldPosition);
    return cannonWorldPosition;
  }

  function destroyCannon(index) {
    const cannon = cannons[index];
    const position = getCannonWorldPosition(cannon).clone();
    if (cannon.group.parent) cannon.group.parent.remove(cannon.group);
    cannon.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    cannons.splice(index, 1);
    spawnExplosion(position, 0xff7043, 18);
  }

  function damageCannon(index) {
    const cannon = cannons[index];
    cannon.hp -= 1;
    cannon.flashTimer = 0.18;
    spawnBulletImpact(getCannonWorldPosition(cannon));
    if (cannon.hp <= 0) destroyCannon(index);
  }

  function checkBulletCannonHit(bullet) {
    for (let i = cannons.length - 1; i >= 0; i -= 1) {
      const cannon = cannons[i];
      const position = getCannonWorldPosition(cannon);
      if (bullet.mesh.position.distanceToSquared(position) <= 0.34 * 0.34) {
        if (bullet.shotgunShotId && cannon.lastShotgunHitId === bullet.shotgunShotId) return false;
        if (bullet.shotgunShotId) cannon.lastShotgunHitId = bullet.shotgunShotId;
        damageCannon(i);
        return true;
      }
    }
    return false;
  }

  function getBallCannonContact(cannon) {
    const colliders = getBallColliderPositions();
    const position = getCannonWorldPosition(cannon);
    const hitRadius = getPlayerHitboxRadius() + 0.22;
    const hitRadiusSq = hitRadius * hitRadius;
    const sideHitRadius = getPlayerHitboxRadius() * 0.55 + 0.22;
    const sideHitRadiusSq = sideHitRadius * sideHitRadius;
    if (colliders.bottom.distanceToSquared(position) <= hitRadiusSq) return 'bottom';
    if (colliders.top.distanceToSquared(position) <= hitRadiusSq) return 'top';
    if (colliders.left.distanceToSquared(position) <= sideHitRadiusSq) return 'left';
    if (colliders.right.distanceToSquared(position) <= sideHitRadiusSq) return 'right';
    return null;
  }

  function isSolidLineOfSightTile(tile) {
    return tile && !tile.broken && (tile.type === 'blue' || tile.type === 'red' || tile.type === 'crackedBlue' || tile.type === 'gray');
  }

  function getAngularDistance(a, b) {
    let dist = Math.abs(a - b);
    if (dist > Math.PI) dist = twoPi - dist;
    return dist;
  }

  function getCannonWorldMouth(cannon) {
    cannonMouthWorldPosition.set(0, 0.56, 0);
    cannon.group.localToWorld(cannonMouthWorldPosition);
    return cannonMouthWorldPosition;
  }

  function cannonHasLineOfSight(cannon) {
    if (!cannon.platformData) return false;
    const mouth = getCannonWorldMouth(cannon);
    if (mouth.y >= ball.position.y - ballRadius) return false;

    const cannonAngle = Math.atan2(mouth.z, mouth.x);
    const ballAngle = Math.atan2(ball.position.z, ball.position.x);
    if (getAngularDistance(cannonAngle, ballAngle) > 0.18) return false;

    for (const platform of platforms) {
      if (platform === cannon.platformData) continue;
      const y = platformY(platform);
      if (y <= mouth.y + platformThickness || y >= ball.position.y - ballRadius) continue;
      cannonLosPoint.set(ball.position.x, y, ball.position.z);
      const tile = getTileAtWorldPoint(platform, cannonLosPoint);
      if (isSolidLineOfSightTile(tile)) return false;
    }
    return true;
  }

  function detachCannonsFromTile(platform, tile) {
    for (const cannon of cannons) {
      if (cannon.falling || cannon.platformData !== platform) continue;
      cannon.group.getWorldPosition(cannonLocalPosition);
      platform.group.worldToLocal(cannonLocalPosition);
      const radius = Math.hypot(cannonLocalPosition.x, cannonLocalPosition.z);
      const angle = (Math.atan2(cannonLocalPosition.z, cannonLocalPosition.x) + twoPi) % twoPi;
      if (radius > platformOuterRadius || !angleInArc(angle, tile.start, tile.end)) continue;

      world.attach(cannon.group);
      cannon.platformData = null;
      cannon.falling = true;
      cannon.fallVelocity = 0;
      cannon.charge = 0;
      cannon.laserTimer = 0;
      cannon.ring.visible = false;
      cannon.laser.visible = false;
    }
  }

  function updateFallingCannon(cannon, dt) {
    const previousY = cannon.group.position.y;
    cannon.fallVelocity = (cannon.fallVelocity ?? 0) - 14 * dt;
    cannon.group.position.y += cannon.fallVelocity * dt;

    for (const platform of platforms) {
      const platformTop = platformY(platform) + platformThickness / 2 + 0.02;
      if (previousY < platformTop || cannon.group.position.y > platformTop) continue;

      cannon.group.getWorldPosition(cannonWorldPosition);
      cannonWorldPosition.y = platformTop;
      if (!isSolidLineOfSightTile(getTileAtWorldPoint(platform, cannonWorldPosition))) continue;

      cannon.platformData = platform;
      platform.group.attach(cannon.group);
      cannon.group.position.y = platformThickness / 2 + 0.02;
      cannon.falling = false;
      cannon.fallVelocity = 0;
      break;
    }
  }

  function updateCannons(dt) {
    for (let i = cannons.length - 1; i >= 0; i -= 1) {
      const cannon = cannons[i];
      if (cannon.falling) {
        updateFallingCannon(cannon, dt);
        continue;
      }
      const contact = getBallCannonContact(cannon);
      if (contact === 'bottom' && getBallVelocity() < 0 && ball.position.y > getCannonWorldPosition(cannon).y) {
        destroyCannon(i);
        if (reloadAmmo()) {
          spawnFloatingText('Reload', ball.position);
          playReloadSound();
        }
        setBallVelocity(Math.max(getBallVelocity(), getStompImpulse()));
        continue;
      }
      if (contact) applyDamage();

      const hasLos = cannonHasLineOfSight(cannon);

      cannon.base.material.color.setHex(cannon.base.material.userData.baseColor);
      cannon.ring.visible = false;
      cannon.laser.visible = false;

      if (cannon.flashTimer > 0) {
        cannon.flashTimer = Math.max(0, cannon.flashTimer - dt);
        cannon.base.material.color.setHex(0xff9800);
      }

      if (cannon.cooldown > 0) {
        cannon.cooldown = Math.max(0, cannon.cooldown - dt);
        cannon.charge = 0;
        continue;
      }

      if (cannon.laserTimer > 0) {
        cannon.laserTimer = Math.max(0, cannon.laserTimer - dt);
        cannon.laser.visible = true;
        if (!cannon.damagedThisShot && Math.hypot(ball.position.x - getCannonWorldMouth(cannon).x, ball.position.z - getCannonWorldMouth(cannon).z) <= getPlayerHitboxRadius() + 0.15 && ball.position.y > cannonMouthWorldPosition.y) {
          applyDamage();
          cannon.damagedThisShot = true;
        }
        if (cannon.laserTimer <= 0) cannon.cooldown = getCannonCooldown();
        continue;
      }

      if (!hasLos) {
        cannon.charge = 0;
        continue;
      }

      if (cannon.charge === 0) playCannonActivateSound();
      cannon.charge += dt;
      const chargeProgress = Math.min(1, cannon.charge / getCannonChargeTime());
      cannon.base.material.color.setHex(0xff0000);
      cannon.ring.visible = true;
      cannon.ring.scale.setScalar(Math.max(0.25, 1 - chargeProgress * 0.75));

      if (cannon.charge >= getCannonChargeTime()) {
        cannon.charge = 0;
        cannon.laserTimer = 0.3;
        cannon.damagedThisShot = false;
        cannon.ring.visible = false;
        cannon.laser.visible = true;
        playCannonFireSound();
      }
    }
  }

  function createPillarSpike(y, angle) {
    const group = new THREE.Group();
    group.position.set(Math.cos(angle) * pillarRadius, y, Math.sin(angle) * pillarRadius);
    group.rotation.y = -angle;

    const mesh = new THREE.Mesh(pillarSpikeGeometry.clone(), pillarSpikeMaterial.clone());
    mesh.rotation.z = -Math.PI / 2;
    mesh.position.x = ledgeRadialLength / 2;
    group.add(mesh);

    world.add(group);
    pillarSpikes.push({ group, mesh, colliderPosition: new THREE.Vector3() });
  }

  function spawnPillarSpikesForLevel() {
    const target = getLevelTarget();
    const intervalCount = Math.max(1, target - 1);
    const usedIntervals = new Set();

    while (usedIntervals.size < Math.min(4, intervalCount)) {
      usedIntervals.add(1 + Math.floor(Math.random() * intervalCount));
    }

    for (const interval of usedIntervals) {
      const y = -(interval + 0.35 + Math.random() * 0.3) * platformSpacing;
      const angle = Math.random() * twoPi;
      createPillarSpike(y, angle);
    }
  }

  function createFloater(y, angle, options = {}) {
    const mesh = new THREE.Mesh(floaterDiscGeometry, options.blue ? blueFloaterMaterial.clone() : floaterMaterial.clone());
    mesh.position.set(
      Math.cos(angle) * gameplayLaneRadius,
      y,
      Math.sin(angle) * gameplayLaneRadius
    );
    world.add(mesh);
    floaters.push({ mesh, angle, y, used: false, blue: options.blue === true, persistent: options.persistent === true });
  }

  function createBossFloaterRing(y) {
    for (let i = 0; i < 8; i += 1) {
      createFloater(y, (i / 8) * twoPi, { blue: true, persistent: true });
    }
  }

  function spawnFloatersForLevel() {
    const target = getLevelTarget();
    const intervalCount = Math.max(1, target - 1);
    const bossSupportInterval = getCurrentLevel() === 1 ? target - 1 : -1;
    const maxRandomFloaters = intervalCount - (bossSupportInterval >= 1 && bossSupportInterval <= intervalCount ? 1 : 0);
    const usedIntervals = new Set();

    while (usedIntervals.size < Math.min(24, maxRandomFloaters)) {
      const interval = 1 + Math.floor(Math.random() * intervalCount);
      if (interval === bossSupportInterval) continue;
      usedIntervals.add(interval);
    }

    for (const interval of usedIntervals) {
      const y = -(interval + 0.35 + Math.random() * 0.3) * platformSpacing;
      const angle = Math.random() * twoPi;
      createFloater(y, angle);
    }
  }

  function updateFloaters(dt) {
    if (getBallVelocity() >= 0) return;

    const bottomY = ball.position.y - ballRadius;
    const previousBottomY = bottomY - getBallVelocity() * dt;

    for (let i = floaters.length - 1; i >= 0; i -= 1) {
      const floater = floaters[i];
      if (floater.used) continue;

      const worldPos = floater.mesh.getWorldPosition(floaterWorldPos);
      const fY = worldPos.y;
      const floaterTop = fY + 0.05;

      if (previousBottomY > floaterTop && bottomY <= floaterTop) {
        const dx = ball.position.x - worldPos.x;
        const dz = ball.position.z - worldPos.z;
        const radialDist = Math.hypot(dx, dz);
        if (radialDist <= ballRadius) {
          if (!floater.persistent) {
            floater.used = true;
            spawnExplosion(worldPos.clone(), 0x9e9e9e, 8);
            world.remove(floater.mesh);
            floater.mesh.geometry.dispose();
            floaters.splice(i, 1);
          }
          setBallVelocity(floater.blue ? getBounceVelocity() : Math.max(getBallVelocity(), getStompImpulse()));
          if (reloadAmmo()) {
            spawnFloatingText('Reload', ball.position);
            playReloadSound();
          }
          playBounceSound();
          continue;
        }
      }

      if (!floater.persistent && worldPos.y > ball.position.y + 15) {
        world.remove(floater.mesh);
        floater.mesh.geometry.dispose();
        floaters.splice(i, 1);
      }
    }
  }

  function createSawBlade(y, angle, speedOffset = 0) {
    const mesh = new THREE.Mesh(sawBladeGeometry, sawBladeMaterial.clone());
    const sawBlade = {
      group: mesh,
      y,
      angle,
      speed: 1.55 + getCurrentLevel() * 0.08 + speedOffset,
      collisionRadius: sawBladeOuterRadius,
    };
    positionSawBlade(sawBlade);
    world.add(mesh);
    sawBlades.push(sawBlade);
  }

  function positionSawBlade(sawBlade) {
    sawBlade.group.position.set(
      Math.cos(sawBlade.angle) * sawBladeLaneRadius,
      sawBlade.y,
      Math.sin(sawBlade.angle) * sawBladeLaneRadius
    );
    sawBlade.group.rotation.y = -sawBlade.angle;
  }

  function spawnSawBladesForLevel(sawBladesPerLevel) {
    const target = getLevelTarget();
    const spacing = (target * platformSpacing) / sawBladesPerLevel;
    for (let i = 0; i < sawBladesPerLevel; i += 1) {
      const y = -platformSpacing * 0.75 - i * spacing - Math.random() * platformSpacing * 0.45;
      const angle = (i / sawBladesPerLevel) * twoPi + Math.random() * 0.35;
      createSawBlade(y, angle, Math.random() * 0.35);
    }
  }

  function createPillarLaserRing(y) {
    const mesh = new THREE.Mesh(pillarLaserRingGeometry, pillarLaserRingMaterial.clone());
    mesh.position.y = y;
    mesh.rotation.x = Math.PI / 2;
    mesh.renderOrder = 3;
    world.add(mesh);
    pillarLaserRings.push({ mesh, y, timer: Math.random() * (getLaserRingOnTime() + getLaserRingOffTime()) });
  }

  function spawnPillarLaserRingsForLevel() {
    const target = getLevelTarget();
    const count = Math.min(5, Math.max(1, Math.floor(getCurrentLevel() / 2)));
    const used = new Set();
    while (used.size < count) used.add(2 + Math.floor(Math.random() * Math.max(1, target - 3)));
    for (const interval of used) {
      const y = -(interval + 0.5) * platformSpacing;
      createPillarLaserRing(y);
      const floaterY = y + goldBlockSize;
      const angleStep = Math.PI / 7.2;
      for (let j = 0; j < 3; j++) {
        const angle = j * angleStep;
        createFloater(floaterY, angle);
      }
    }
  }

  function getSpikeRaiseAmount(timer) {
    const cycleTime = timer % spikeCycleDuration;
    const moveDownStart = spikeUpDuration;
    const downStart = moveDownStart + spikeMoveDuration;
    const moveUpStart = downStart + spikeDownDuration;

    if (cycleTime < moveDownStart) return 1;
    if (cycleTime < downStart) return 1 - (cycleTime - moveDownStart) / spikeMoveDuration;
    if (cycleTime < moveUpStart) return 0;
    return (cycleTime - moveUpStart) / spikeMoveDuration;
  }

  function updateSpikeTraps(dt) {
    const upY = platformThickness / 2 + platformSpikeHeight / 2 - 0.02;
    const downY = platformThickness / 2 - platformSpikeHeight / 2 - 0.16;
    const damageRadius = getPlayerHitboxRadius() + 0.16;
    const damageRadiusSq = damageRadius * damageRadius;

    for (const trap of spikeTraps) {
      trap.timer = (trap.timer + dt) % spikeCycleDuration;
      trap.raiseAmount = getSpikeRaiseAmount(trap.timer);

      for (const spike of trap.spikes) {
        spike.mesh.position.y = downY + (upY - downY) * trap.raiseAmount;
        spike.colliderPosition.set(
          Math.cos(spike.angle) * gameplayLaneRadius,
          spike.mesh.position.y + platformSpikeHeight * 0.22,
          Math.sin(spike.angle) * gameplayLaneRadius
        );
        trap.platformGroup.localToWorld(spike.colliderPosition);
      }

      if (trap.raiseAmount < 0.55) continue;
      for (const spike of trap.spikes) {
        if (ball.position.distanceToSquared(spike.colliderPosition) <= damageRadiusSq) {
          applyDamage();
          break;
        }
      }
    }
  }

  function updatePillarSpikes() {
    const damageRadius = getPlayerHitboxRadius() + 0.18;
    const damageRadiusSq = damageRadius * damageRadius;

    for (const ps of pillarSpikes) {
      ps.colliderPosition.set(ledgeRadialLength, 0, 0);
      ps.group.localToWorld(ps.colliderPosition);
      const dx = ball.position.x - ps.colliderPosition.x;
      const dy = ball.position.y - ps.colliderPosition.y;
      const dz = ball.position.z - ps.colliderPosition.z;
      if (dx * dx + dy * dy + dz * dz <= damageRadiusSq) {
        applyDamage();
      }
    }
  }

  function updateSawBlades(dt) {
    for (const sawBlade of sawBlades) {
      sawBlade.y += sawBlade.speed * dt;
      positionSawBlade(sawBlade);
      sawBlade.group.rotation.z += dt * 9;
      sawBlade.group.getWorldPosition(sawBladeWorldPosition);

      const damageRadius = getPlayerHitboxRadius() + sawBlade.collisionRadius;
      if (ball.position.distanceToSquared(sawBladeWorldPosition) <= damageRadius * damageRadius) {
        applyDamage();
      }
    }
  }

  function updatePillarLaserRings(dt) {
    const hitbox = getPlayerHitboxRadius();
    for (let i = pillarLaserRings.length - 1; i >= 0; i -= 1) {
      const ring = pillarLaserRings[i];
      const cycle = getLaserRingOnTime() + getLaserRingOffTime();
      ring.timer = (ring.timer + dt) % cycle;
      const active = ring.timer < getLaserRingOnTime();
      ring.mesh.visible = true;
      ring.mesh.material.opacity = active ? 0.72 : 0.09;
      if (active) {
        const vertical = Math.abs(ball.position.y - ring.mesh.position.y);
        const radial = Math.abs(Math.hypot(ball.position.x, ball.position.z) - gameplayLaneRadius);
        if (vertical <= hitbox + 0.06 && radial <= hitbox + 0.18) applyDamage();
      }
      if (ring.mesh.position.y > ball.position.y + 15) {
        ring.mesh.removeFromParent();
        ring.mesh.material.dispose();
        pillarLaserRings.splice(i, 1);
      }
    }
  }

  return {
    createPillarSpike,
    spawnPillarSpikesForLevel,
    createFloater,
    createBossFloaterRing,
    spawnFloatersForLevel,
    updateFloaters,
    createSawBlade,
    positionSawBlade,
    spawnSawBladesForLevel,
    createPillarLaserRing,
    spawnPillarLaserRingsForLevel,
    getSpikeRaiseAmount,
    updateSpikeTraps,
    updatePillarSpikes,
    updateSawBlades,
    updatePillarLaserRings,
    createCannonMesh,
    maybeSpawnCannon,
    getCannonWorldPosition,
    destroyCannon,
    damageCannon,
    checkBulletCannonHit,
    getBallCannonContact,
    isSolidLineOfSightTile,
    getAngularDistance,
    getCannonWorldMouth,
    cannonHasLineOfSight,
    detachCannonsFromTile,
    updateCannons,
  };
}
