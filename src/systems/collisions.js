import * as THREE from 'three';
import { angleInArc } from '../core/utils.js';
import { getPlatformsNearY, getTileAtWorldPoint, platformY } from '../entities/platforms.js';

export function createCollisionSystem({
  ball,
  ballRadius,
  platformInnerRadius,
  platformOuterRadius,
  platformThickness,
  twoPi,
  getBallVelocity,
  setBallVelocity,
  getBounceVelocity,
  getPlayerHitboxRadius,
  getIsGameOver,
  collisionDebug,
  getEnemyWorldPosition,
  spawnBulletImpact,
  damageGrayTile,
  applyDamage,
  resetCombo,
  completeLevel,
  reloadAmmo,
  spawnFloatingText,
  playReloadSound,
  playBounceSound,
  getShopUsed,
  openShop,
  breakCrackedTile,
}) {
  const bulletImpactPoint = new THREE.Vector3();
  const ballLocal = new THREE.Vector3();
  const ballTangent = new THREE.Vector3();
  const ballBottomCollider = new THREE.Vector3();
  const ballTopCollider = new THREE.Vector3();
  const ballLeftCollider = new THREE.Vector3();
  const ballRightCollider = new THREE.Vector3();
  const enemySegmentWorldPosition = new THREE.Vector3();
  const acidSnailBodyWorldPosition = new THREE.Vector3();
  const acidSnailShellWorldPosition = new THREE.Vector3();
  const acidSnailHeadWorldPosition = new THREE.Vector3();
  const platformUndersidePoint = new THREE.Vector3();

  function getBallColliderPositions() {
    const offset = getPlayerHitboxRadius();
    const sideOffset = offset * 0.62;
    const tangentLength = Math.hypot(ball.position.x, ball.position.z) || 1;
    ballTangent.set(-ball.position.z / tangentLength, 0, ball.position.x / tangentLength);

    ballBottomCollider.copy(ball.position).y -= offset;
    ballTopCollider.copy(ball.position).y += offset;
    ballLeftCollider.copy(ball.position).addScaledVector(ballTangent, -sideOffset);
    ballRightCollider.copy(ball.position).addScaledVector(ballTangent, sideOffset);

    return {
      bottom: ballBottomCollider,
      top: ballTopCollider,
      left: ballLeftCollider,
      right: ballRightCollider,
    };
  }

  function getBallEnemyContact(enemy) {
    const colliders = getBallColliderPositions();
    const hitboxRadius = getPlayerHitboxRadius();
    const sideHitboxRadius = hitboxRadius * 0.55;
    if (enemy.type === 'pillarWorm') {
      if (!enemy.interactable) return null;
      const stompRadius = enemy.collisionRadius + ballRadius * 0.8;
      const contactRadius = enemy.collisionRadius + hitboxRadius;
      const sideContactRadius = enemy.collisionRadius + sideHitboxRadius;
      if (colliders.bottom.distanceToSquared(enemy.collisionPosition) <= stompRadius * stompRadius) return 'bottom';
      if (colliders.top.distanceToSquared(enemy.collisionPosition) <= contactRadius * contactRadius) return 'top';
      if (colliders.left.distanceToSquared(enemy.collisionPosition) <= sideContactRadius * sideContactRadius) return 'left';
      if (colliders.right.distanceToSquared(enemy.collisionPosition) <= sideContactRadius * sideContactRadius) return 'right';
      return null;
    }

    if (enemy.type === 'worm' || enemy.type === 'yellowWorm' || enemy.type === 'miniYellowWorm') {
      const stompRadius = enemy.collisionRadius + ballRadius * 0.75;
      const contactRadius = enemy.collisionRadius + hitboxRadius;
      const sideContactRadius = enemy.collisionRadius + sideHitboxRadius;
      for (const segment of enemy.segments) {
        segment.getWorldPosition(enemySegmentWorldPosition);
        if (colliders.bottom.distanceToSquared(enemySegmentWorldPosition) <= stompRadius * stompRadius) return 'bottom';
      }
      for (const segment of enemy.segments) {
        segment.getWorldPosition(enemySegmentWorldPosition);
        if (colliders.top.distanceToSquared(enemySegmentWorldPosition) <= contactRadius * contactRadius) return 'top';
        if (colliders.left.distanceToSquared(enemySegmentWorldPosition) <= sideContactRadius * sideContactRadius) return 'left';
        if (colliders.right.distanceToSquared(enemySegmentWorldPosition) <= sideContactRadius * sideContactRadius) return 'right';
      }
      return null;
    }

    if (enemy.type === 'acidSnail') {
      enemy.body.getWorldPosition(acidSnailBodyWorldPosition);
      enemy.shell.getWorldPosition(acidSnailShellWorldPosition);
      acidSnailHeadWorldPosition.set(0.26, 0.1, 0);
      enemy.group.localToWorld(acidSnailHeadWorldPosition);

      const stompTargets = [
        [acidSnailBodyWorldPosition, 0.28],
        [acidSnailShellWorldPosition, 0.3],
        [acidSnailHeadWorldPosition, 0.2],
      ];

      for (const [target, radius] of stompTargets) {
        const stompRadius = radius + ballRadius * 0.75;
        if (colliders.bottom.distanceToSquared(target) <= stompRadius * stompRadius) return 'bottom';
      }

      const topY = Math.max(
        acidSnailBodyWorldPosition.y + 0.18,
        acidSnailShellWorldPosition.y + 0.2,
        acidSnailHeadWorldPosition.y + 0.08
      );

      for (const [target, radius] of stompTargets) {
        const contactRadius = radius + hitboxRadius * 0.92;
        const sideContactRadius = radius + sideHitboxRadius;
        if (colliders.top.distanceToSquared(target) <= contactRadius * contactRadius) return 'top';
        if (colliders.left.y <= topY - 0.02 && colliders.left.distanceToSquared(target) <= sideContactRadius * sideContactRadius) return 'left';
        if (colliders.right.y <= topY - 0.02 && colliders.right.distanceToSquared(target) <= sideContactRadius * sideContactRadius) return 'right';
      }

      return null;
    }

    const hitRadius = enemy.collisionRadius + hitboxRadius;
    const hitRadiusSq = hitRadius * hitRadius;
    const sideHitRadius = enemy.collisionRadius + sideHitboxRadius;
    const sideHitRadiusSq = sideHitRadius * sideHitRadius;
    const collisionPosition = getEnemyWorldPosition(enemy);

    if (colliders.bottom.distanceToSquared(collisionPosition) <= hitRadiusSq) return 'bottom';
    if (colliders.top.distanceToSquared(collisionPosition) <= hitRadiusSq) return 'top';
    if (colliders.left.distanceToSquared(collisionPosition) <= sideHitRadiusSq) return 'left';
    if (colliders.right.distanceToSquared(collisionPosition) <= sideHitRadiusSq) return 'right';

    const fallbackRadius = enemy.collisionRadius + sideHitboxRadius;
    return ball.position.distanceToSquared(collisionPosition) <= fallbackRadius * fallbackRadius ? 'body' : null;
  }

  function checkBulletPlatformHit(bullet, previousY) {
    const currentY = bullet.mesh.position.y;
    const crossedPlatforms = [];

    for (const platform of getPlatformsNearY(Math.min(previousY, currentY), Math.max(previousY, currentY))) {
      const platformTop = platformY(platform) + platformThickness / 2;
      if (previousY >= platformTop && currentY <= platformTop) {
        crossedPlatforms.push({ platform, platformTop });
      }
    }

    crossedPlatforms.sort((a, b) => b.platformTop - a.platformTop);

    for (const collision of crossedPlatforms) {
      bulletImpactPoint.set(bullet.mesh.position.x, collision.platformTop + 0.035, bullet.mesh.position.z);
      const tile = getTileAtWorldPoint(collision.platform, bulletImpactPoint);
      if (!tile) continue;

      spawnBulletImpact(bulletImpactPoint);
      if (tile.type === 'gray') {
        damageGrayTile(collision.platform, tile);
      }
      return true;
    }

    return false;
  }

  function getBallContactOnPlatform(platform) {
    ballLocal.copy(ball.position);
    platform.group.worldToLocal(ballLocal);

    const radius = Math.hypot(ballLocal.x, ballLocal.z);
    const angle = (Math.atan2(ballLocal.z, ballLocal.x) + twoPi) % twoPi;
    const tile = radius >= platformInnerRadius && radius <= platformOuterRadius
      ? platform.tiles.find((candidate) => !candidate.broken && angleInArc(angle, candidate.start, candidate.end)) || null
      : null;

    return { angle, radius, tile, localX: ballLocal.x, localZ: ballLocal.z };
  }

  function isSolidUndersideTile(tile) {
    return tile && !tile.broken && (tile.type === 'blue' || tile.type === 'crackedBlue' || tile.type === 'red' || tile.type === 'gray');
  }

  function handlePlatformUndersideCollision(previousY) {
    if (getBallVelocity() <= 0) return;

    const topBefore = previousY + ballRadius;
    const topNow = ball.position.y + ballRadius;
    const crossedPlatforms = [];

    for (const platform of getPlatformsNearY(Math.min(topBefore, topNow), Math.max(topBefore, topNow))) {
      const platformBottom = platformY(platform) - platformThickness / 2;
      if (topBefore <= platformBottom && topNow >= platformBottom) {
        crossedPlatforms.push({ platform, platformBottom });
      }
    }

    crossedPlatforms.sort((a, b) => a.platformBottom - b.platformBottom);

    for (const collision of crossedPlatforms) {
      platformUndersidePoint.set(ball.position.x, collision.platformBottom - 0.035, ball.position.z);
      const tile = getTileAtWorldPoint(collision.platform, platformUndersidePoint);
      if (!isSolidUndersideTile(tile)) continue;

      ball.position.y = collision.platformBottom - ballRadius;
      setBallVelocity(-Math.max(1.2, getBounceVelocity() * 0.22));
      return;
    }
  }

  function handlePlatformCollision(previousY) {
    if (getBallVelocity() >= 0) return;

    const bottomNow = ball.position.y - ballRadius;
    const bottomBefore = previousY - ballRadius;
    const crossedPlatforms = [];

    for (const platform of getPlatformsNearY(Math.min(bottomBefore, bottomNow), Math.max(bottomBefore, bottomNow))) {
      const platformTop = platformY(platform) + platformThickness / 2;

      if (bottomBefore >= platformTop && bottomNow <= platformTop) {
        crossedPlatforms.push({ platform, platformTop });
      }
    }

    crossedPlatforms.sort((a, b) => b.platformTop - a.platformTop);

    for (const collision of crossedPlatforms) {
      const { platform, platformTop } = collision;
      const contact = getBallContactOnPlatform(platform);
      collisionDebug.update(platform, contact, platformTop);

      if (!contact.tile) continue;

      if (contact.tile.type === 'red') {
        contact.tile.material.emissive.setHex(0x7a0000);
        contact.tile.material.emissiveIntensity = 0.45;
        applyDamage();
        if (!getIsGameOver()) resetCombo();
        ball.position.y = platformTop + ballRadius;
        setBallVelocity(getBounceVelocity() * 0.72);
        return;
      }

      if (contact.tile.type === 'finish') {
        ball.position.y = platformTop + ballRadius;
        setBallVelocity(0);
        completeLevel();
        return;
      }

      if (contact.tile.type === 'shop' && !getShopUsed()) {
        ball.position.y = platformTop + ballRadius;
        setBallVelocity(getBounceVelocity());
        resetCombo();
        if (reloadAmmo()) {
          spawnFloatingText('Reload', ball.position);
          playReloadSound();
        }
        playBounceSound();
        contact.tile.flashTimer = 0.3;
        openShop();
        return;
      }

      ball.position.y = platformTop + ballRadius;
      setBallVelocity(getBounceVelocity());
      resetCombo();
      if (reloadAmmo()) {
        spawnFloatingText('Reload', ball.position);
        playReloadSound();
      }
      playBounceSound();
      if (contact.tile.type === 'crackedBlue') {
        breakCrackedTile(platform, contact.tile);
      } else {
        contact.tile.flashTimer = 0.3;
      }
      return;
    }
  }

  return {
    getBallColliderPositions,
    getBallEnemyContact,
    checkBulletPlatformHit,
    getBallContactOnPlatform,
    isSolidUndersideTile,
    handlePlatformUndersideCollision,
    handlePlatformCollision,
  };
}
