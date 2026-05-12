import * as THREE from 'three';

export function getCurrentFireInterval(selectedWeapon, fireInterval, shotgunFireInterval) {
  return selectedWeapon === 'shotgun' ? shotgunFireInterval : fireInterval;
}

export function getShotUpwardVelocityCap(baseShotUpwardVelocityCap, bulletImpulse) {
  return Math.max(baseShotUpwardVelocityCap, bulletImpulse * 0.75);
}

export function shouldBlockShootingForSteamDeck(isSteamDeckModeActive, source) {
  return isSteamDeckModeActive && source !== 'steamDeckFire';
}

export function createShootingSystem(ctx) {
  const shotgunTangent = new THREE.Vector3();
  const shotgunVelocity = new THREE.Vector3();
  const defaultBulletVelocity = new THREE.Vector3(0, -ctx.bulletSpeed, 0);
  const bulletRotationAxis = new THREE.Vector3(0, 1, 0);
  const bulletPool = [];

  function currentFireInterval() {
    return getCurrentFireInterval(ctx.getSelectedWeapon(), ctx.getFireInterval(), ctx.getShotgunFireInterval());
  }

  function shotUpwardVelocityCap() {
    return getShotUpwardVelocityCap(ctx.baseShotUpwardVelocityCap, ctx.getBulletImpulse());
  }

  function stop() {
    ctx.setIsShooting(false);
    ctx.setFireCooldown(0);
  }

  function clearBullets() {
    while (ctx.bullets.length) {
      const bullet = ctx.bullets.pop();
      deactivateBullet(bullet);
    }
  }

  function createBullet() {
    const mesh = new THREE.Mesh(ctx.bulletGeometry, ctx.bulletMaterial);
    mesh.visible = false;
    mesh.renderOrder = 5;
    ctx.scene.add(mesh);
    return { mesh, life: 0, velocity: new THREE.Vector3(), shotgunShotId: 0, hitEnemies: new Set(), active: false, balasB: false, lastWorldRotation: 0 };
  }

  function getPooledBullet() {
    return bulletPool.pop() || createBullet();
  }

  function deactivateBullet(bullet) {
    bullet.active = false;
    bullet.mesh.visible = false;
    bullet.mesh.scale.setScalar(1);
    bullet.hitEnemies.clear();
    if (bullet.mesh.parent !== ctx.scene) {
      bullet.mesh.removeFromParent();
      ctx.scene.add(bullet.mesh);
    }
    bulletPool.push(bullet);
  }

  function spawnBullet(velocity = defaultBulletVelocity, shotId = 0) {
    const bullet = getPooledBullet();
    const { mesh } = bullet;
    bullet.active = true;
    bullet.life = ctx.bulletLifetime;
    bullet.velocity.copy(velocity);
    bullet.shotgunShotId = shotId;
    bullet.balasB = ctx.getBalasBMode?.() === true;
    bullet.lastWorldRotation = ctx.getWorldRotation?.() ?? 0;
    bullet.hitEnemies.clear();
    mesh.position.copy(ctx.ball.position);
    mesh.position.y -= ctx.ballRadius + 0.06;
    mesh.scale.setScalar(1);
    mesh.visible = true;
    if (mesh.parent !== ctx.scene) ctx.scene.add(mesh);
    ctx.bullets.push(bullet);
  }

  function fireMachinegun() {
    if (ctx.getAmmo() <= 0) {
      ctx.playEmptyAmmoSound();
      return false;
    }

    ctx.setAmmo(ctx.getAmmo() - 1);
    ctx.updateAmmoUI();
    spawnBullet();
    ctx.playShootSound();

    if (ctx.getImpulseMode() === 'B') {
      ctx.setBallVelocity(ctx.getImpulseBResetSpeed());
    } else if (ctx.getImpulseMode() === 'C' && ctx.getBallVelocity() < 0) {
      const instantVel = Math.abs(ctx.getBallVelocity());
      ctx.setBallVelocity(ctx.getBallVelocity() + ctx.getImpulseCFactor() * instantVel);
    } else {
      const cap = shotUpwardVelocityCap();
      if (ctx.getBallVelocity() < cap) {
        ctx.setBallVelocity(Math.min(ctx.getBallVelocity() + ctx.getBulletImpulse(), cap));
      }
    }

    return true;
  }

  function fireShotgun() {
    if (ctx.getAmmo() < 4) {
      ctx.playEmptyAmmoSound();
      return false;
    }

    ctx.setAmmo(ctx.getAmmo() - 4);
    ctx.updateAmmoUI();
    const shotId = ctx.getNextShotId();
    ctx.setNextShotId(shotId + 1);
    const spreadRad = THREE.MathUtils.degToRad(ctx.getShotgunSpreadAngle());
    const tangentLength = Math.hypot(ctx.ball.position.x, ctx.ball.position.z) || 1;
    shotgunTangent.set(-ctx.ball.position.z / tangentLength, 0, ctx.ball.position.x / tangentLength);
    for (let i = 0; i < 5; i += 1) {
      const t = i / 4 - 0.5;
      const angle = t * spreadRad;
      const velocity = shotgunVelocity
        .set(0, -Math.cos(angle) * ctx.bulletSpeed, 0)
        .addScaledVector(shotgunTangent, Math.sin(angle) * ctx.bulletSpeed);
      spawnBullet(velocity, shotId);
    }
    ctx.playShootSound();

    if (ctx.getImpulseMode() === 'B') {
      ctx.setBallVelocity(ctx.getImpulseBResetSpeed() - ctx.getImpulseBShotgunImpulse());
    } else if (ctx.getImpulseMode() === 'C' && ctx.getBallVelocity() < 0) {
      const instantVel = Math.abs(ctx.getBallVelocity());
      ctx.setBallVelocity(ctx.getBallVelocity() + ctx.getImpulseCFactor() * instantVel - ctx.getImpulseBShotgunImpulse());
    } else {
      const cap = Math.max(ctx.baseShotUpwardVelocityCap, ctx.getBulletImpulse() * 2.25);
      if (ctx.getBallVelocity() < cap) {
        ctx.setBallVelocity(Math.min(ctx.getBallVelocity() + ctx.getBulletImpulse() * 3, cap));
      }
    }

    return true;
  }

  function fireCurrentWeapon() {
    return ctx.getSelectedWeapon() === 'shotgun' ? fireShotgun() : fireMachinegun();
  }

  function start(source = 'default') {
    if (shouldBlockShootingForSteamDeck(ctx.isSteamDeckModeActive(), source)) return;
    if (ctx.isGameOver() || ctx.isPaused()) return;
    ctx.setIsShooting(true);
    if (ctx.getFireCooldown() <= 0) {
      fireCurrentWeapon();
      ctx.setFireCooldown(currentFireInterval());
    }
  }

  function updateShooting(dt) {
    if (!ctx.getIsShooting() || ctx.isGameOver()) return;

    ctx.setFireCooldown(ctx.getFireCooldown() - dt);
    while (ctx.getIsShooting() && ctx.getFireCooldown() <= 0) {
      fireCurrentWeapon();
      ctx.setFireCooldown(ctx.getFireCooldown() + currentFireInterval());
    }
  }

  function removeBullet(index) {
    const bullet = ctx.bullets[index];
    ctx.bullets.splice(index, 1);
    deactivateBullet(bullet);
  }

  function updateBullets(dt) {
    for (let i = ctx.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = ctx.bullets[i];
      const previousY = bullet.mesh.position.y;
      bullet.life -= dt;
      if (bullet.balasB) {
        const worldRotation = ctx.getWorldRotation();
        const deltaRotation = worldRotation - bullet.lastWorldRotation;
        bullet.mesh.position.applyAxisAngle(bulletRotationAxis, deltaRotation);
        bullet.velocity.applyAxisAngle(bulletRotationAxis, deltaRotation);
        bullet.lastWorldRotation = worldRotation;
      }
      bullet.mesh.position.addScaledVector(bullet.velocity, dt);
      bullet.mesh.scale.setScalar(Math.max(0.45, bullet.life / ctx.bulletLifetime));

      if (ctx.checkBulletBossHit?.(bullet)) {
        removeBullet(i);
        continue;
      }

      if (ctx.checkBulletEnemyHit(bullet) && !ctx.isPiercingBulletsUnlocked()) {
        removeBullet(i);
        continue;
      }

      if (ctx.checkBulletCrateHit(bullet, previousY)) {
        removeBullet(i);
        continue;
      }

      if (ctx.checkBulletGoldBlockHit(bullet, previousY)) {
        removeBullet(i);
        continue;
      }

      if (ctx.checkBulletCannonHit(bullet)) {
        removeBullet(i);
        continue;
      }

      if (ctx.checkBulletPlatformHit(bullet, previousY)) {
        removeBullet(i);
        continue;
      }

      if (bullet.life <= 0) {
        removeBullet(i);
      }
    }
  }

  function reloadAmmo() {
    if (ctx.getAmmo() === ctx.getMaxAmmo()) return false;

    ctx.setAmmo(ctx.getMaxAmmo());
    ctx.setReloadFlashTimer(0.2);
    ctx.updateAmmoUI();
    ctx.showReloadText();
    return true;
  }

  return {
    clearBullets,
    currentFireInterval,
    reloadAmmo,
    shotUpwardVelocityCap,
    start,
    stop,
    updateBullets,
    updateShooting,
  };
}
