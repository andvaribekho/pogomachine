import * as THREE from 'three';
import { angleInArc } from '../../core/utils.js';
import { colors } from '../../data/colors.js';
import { isGroundEnemy, isWormTile } from '../enemies.js';
import { platformY, getTileAtWorldPoint } from '../platforms.js';

export function createEnemyUpdateSystem({
  world,
  ball,
  enemies,
  platforms,
  acidSnailCrackedShellMaterial,
  gameplayLaneRadius,
  platformThickness,
  groundEnemyFootOffset,
  twoPi,
  getScaledTime,
  getFlyingModeB,
  getBallVelocity,
  setBallVelocity,
  getStompImpulse,
  setAcidStompImmunity,
  getBallEnemyContact,
  applyDamage,
  killEnemyAt,
  reloadAmmo,
  spawnFloatingText,
  playReloadSound,
  spawnAcidPuddle,
  disposeEnemy,
}) {
  const enemyLocalPosition = new THREE.Vector3();
  const enemyFallLocalPosition = new THREE.Vector3();

  function positionEnemy(enemy) {
    if (enemy.type === 'pillarWorm') {
      enemy.localAngle = (enemy.localAngle + twoPi) % twoPi;
      enemy.group.position.set(0, enemy.y, 0);
      enemy.group.rotation.set(0, 0, 0);
      for (let i = 0; i < enemy.segments.length; i += 1) {
        const segmentAngle = enemy.localAngle - i * enemy.segmentArc * enemy.direction;
        const segment = enemy.segments[i];
        segment.position.set(
          Math.cos(segmentAngle) * enemy.visualRadius,
          Math.sin(performance.now() * 0.008 + i) * 0.015,
          Math.sin(segmentAngle) * enemy.visualRadius
        );
        segment.rotation.y = -segmentAngle + Math.PI / 2;
        segment.rotation.z = Math.PI / 2;
      }

      enemy.interactable = false;
      enemy.collisionPosition.set(
        Math.cos(enemy.localAngle) * enemy.visualRadius,
        0,
        Math.sin(enemy.localAngle) * enemy.visualRadius
      );
      enemy.group.localToWorld(enemy.collisionPosition);
      return;
    }

    if (enemy.type === 'worm' || enemy.type === 'yellowWorm' || enemy.type === 'miniYellowWorm' || enemy.type === 'turtle' || enemy.type === 'porcupine' || enemy.type === 'acidSnail') {
      const localPosition = enemyLocalPosition.set(
        Math.cos(enemy.localAngle) * enemy.orbitRadius,
        platformThickness / 2 + 0.2,
        Math.sin(enemy.localAngle) * enemy.orbitRadius
      );
      enemy.platformData.group.localToWorld(localPosition);
      enemy.group.position.copy(localPosition);
      enemy.group.rotation.y = world.rotation.y - enemy.localAngle + Math.PI / 2;
      return;
    }

    if (enemy.type === 'explosiveMushroom') return;

    enemy.group.position.set(
      Math.cos(enemy.angle) * enemy.orbitRadius,
      enemy.y,
      Math.sin(enemy.angle) * enemy.orbitRadius
    );
    enemy.group.rotation.y = -enemy.angle + Math.PI / 2;
  }

  function isWormAngleValid(platformData, angle) {
    return platformData.tiles.some(tile => isWormTile(tile) && angleInArc((angle + twoPi) % twoPi, tile.start, tile.end));
  }

  function isWormBodySupported(platformData, angle, radius, segmentSpacing = 0.24) {
    const angleSpacing = segmentSpacing / radius;
    for (let i = -1; i <= 4; i += 1) {
      const forwardAngle = angle + i * angleSpacing;
      const backwardAngle = angle - i * angleSpacing;
      if (!isWormAngleValid(platformData, forwardAngle)) return false;
      if (!isWormAngleValid(platformData, backwardAngle)) return false;
    }
    return true;
  }

  function startGroundEnemyFall(enemy) {
    if (enemy.falling) return;
    enemy.falling = true;
    enemy.fallVelocity = -0.2;
    enemy.platformData = null;
  }

  function updateGroundEnemyFall(enemy, dt) {
    const previousY = enemy.group.position.y;
    enemy.fallVelocity = (enemy.fallVelocity ?? -0.2) - 14 * dt;
    enemy.group.position.y += enemy.fallVelocity * dt;

    for (const platform of platforms) {
      const platformTop = platformY(platform) + platformThickness / 2;
      const footBefore = previousY - groundEnemyFootOffset;
      const footNow = enemy.group.position.y - groundEnemyFootOffset;
      if (footBefore < platformTop || footNow > platformTop || enemy.fallVelocity >= 0) continue;

      enemyFallLocalPosition.copy(enemy.group.position);
      enemyFallLocalPosition.y = platformTop + groundEnemyFootOffset;
      const tile = getTileAtWorldPoint(platform, enemyFallLocalPosition);
      if (!tile || !isWormTile(tile)) continue;

      platform.group.worldToLocal(enemyFallLocalPosition);
      enemy.platformData = platform;
      enemy.localAngle = (Math.atan2(enemyFallLocalPosition.z, enemyFallLocalPosition.x) + twoPi) % twoPi;
      enemy.angle = enemy.localAngle;
      enemy.orbitRadius = gameplayLaneRadius;
      enemy.y = platformTop + groundEnemyFootOffset;
      enemy.falling = false;
      enemy.fallVelocity = 0;
      positionEnemy(enemy);
      return;
    }
  }

  function detachGroundEnemiesFromTile(platform, tile) {
    for (const enemy of enemies) {
      if (!isGroundEnemy(enemy) || enemy.falling || enemy.platformData !== platform) continue;
      const angle = (enemy.localAngle + twoPi) % twoPi;
      if (angleInArc(angle, tile.start, tile.end)) startGroundEnemyFall(enemy);
    }
  }

  function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      if (enemy.type === 'pillarWorm') {
        enemy.localAngle += enemy.speed * enemy.direction * dt;
        enemy.angle = enemy.localAngle;
      } else if (isGroundEnemy(enemy)) {
        if (enemy.falling) {
          updateGroundEnemyFall(enemy, dt);
        } else if (enemy.type === 'porcupine') {
          enemy.stateTimer -= dt;
          if (enemy.state === 'walk' && enemy.stateTimer <= 0) {
            enemy.state = 'spikes';
            enemy.stateTimer = 2;
            enemy.speed = 0;
            enemy.spikesOut = true;
            for (const spike of enemy.spikes) spike.visible = true;
          } else if (enemy.state === 'spikes' && enemy.stateTimer <= 0) {
            enemy.state = 'walk';
            enemy.stateTimer = 1.5 + Math.random() * 1.4;
            enemy.speed = enemy.baseSpeed;
            enemy.spikesOut = false;
            for (const spike of enemy.spikes) spike.visible = false;
          }
        }
        if (!enemy.falling) {
          const nextAngle = enemy.localAngle + enemy.speed * enemy.direction * dt;
          if (isWormBodySupported(enemy.platformData, nextAngle, enemy.orbitRadius, enemy.segmentSpacing)) {
            enemy.localAngle = (nextAngle + twoPi) % twoPi;
          } else if (isWormBodySupported(enemy.platformData, enemy.localAngle, enemy.orbitRadius, enemy.segmentSpacing)) {
            enemy.direction *= -1;
          } else {
            startGroundEnemyFall(enemy);
          }
          enemy.angle = enemy.localAngle;
          if (enemy.type === 'acidSnail' && !enemy.falling) {
            enemy.trailTimer += dt;
            if (enemy.trailTimer >= 0.25) {
              enemy.trailTimer = 0;
              spawnAcidPuddle(enemy.platformData, enemy.localAngle, enemy.orbitRadius, false);
            }
          }
        }
      } else if (enemy.type === 'explosiveMushroom') {
        // Fixed ground hazard: it only reacts to stomps and bullets.
      } else if (enemy.twistB || getFlyingModeB()) {
        enemy.angle = (enemy.angle + enemy.speed * enemy.direction * dt + twoPi) % twoPi;
      } else {
        const arcMin = enemy.arcCenter - enemy.arcSpan / 2;
        const arcMax = enemy.arcCenter + enemy.arcSpan / 2;
        enemy.angle += enemy.speed * enemy.direction * dt;
        if (enemy.angle >= arcMax) {
          enemy.angle = arcMax;
          enemy.direction = -1;
        } else if (enemy.angle <= arcMin) {
          enemy.angle = arcMin;
          enemy.direction = 1;
        }
      }
      if (!enemy.falling) positionEnemy(enemy);

      if (enemy.type === 'jellyfish' || enemy.type === 'pufferBomb') {
        enemy.y = enemy.baseY + Math.sin(getScaledTime() * 2 + enemy.bobOffset) * 0.18;
        if (enemy.type === 'pufferBomb') enemy.group.scale.setScalar(1 + Math.sin(getScaledTime() * 4 + enemy.bobOffset) * 0.08);
      }

      updateEnemyVisualState(enemy, dt);

      const contact = getBallEnemyContact(enemy);
      if (contact === 'bottom' && isStompableEnemy(enemy) && getBallVelocity() < 0 && ball.position.y > getEnemyWorldPosition(enemy).y) {
        if (enemy.type === 'turtle') applyDamage();
        if (enemy.type === 'porcupine' && enemy.spikesOut) {
          applyDamage();
          setBallVelocity(Math.max(getBallVelocity(), getStompImpulse() * 0.55));
          continue;
        }
        if (enemy.type === 'acidSnail') {
          setAcidStompImmunity(0.6);
          enemy.flashTimer = 0.25;
          enemy.bodyMaterial.emissive.setHex(0xff0000);
          enemy.bodyMaterial.emissiveIntensity = 0.9;
          enemy.shellMaterial.emissive.setHex(0xff0000);
          enemy.shellMaterial.emissiveIntensity = 0.9;
          if (enemy.shellIntact) {
            enemy.shellIntact = false;
            enemy.shell.material = acidSnailCrackedShellMaterial.clone();
            spawnAcidPuddle(enemy.platformData, enemy.localAngle, enemy.orbitRadius, true);
            if (reloadAmmo()) {
              spawnFloatingText('Reload', ball.position);
              playReloadSound();
            }
            setBallVelocity(Math.max(getBallVelocity(), getStompImpulse() * 0.7));
            continue;
          } else {
            spawnAcidPuddle(enemy.platformData, enemy.localAngle, enemy.orbitRadius, true);
            killEnemyAt(i, colors.acid);
            if (reloadAmmo()) {
              spawnFloatingText('Reload', ball.position);
              playReloadSound();
            }
            setBallVelocity(Math.max(getBallVelocity(), getStompImpulse()));
            continue;
          }
        }
        killEnemyAt(i, enemy.type === 'worm' || enemy.type === 'pillarWorm' ? colors.worm : enemy.type === 'yellowWorm' || enemy.type === 'miniYellowWorm' ? colors.yellowWorm : enemy.type === 'turtle' ? colors.red : colors.particle);
        if (reloadAmmo()) {
          spawnFloatingText('Reload', ball.position);
          playReloadSound();
        }
        setBallVelocity(Math.max(getBallVelocity(), getStompImpulse()));
        continue;
      }

      if (contact) {
        applyDamage();
        return;
      }

      if (enemy.y > ball.position.y + 15) {
        disposeEnemy(enemy);
        enemies.splice(i, 1);
      }
    }
  }

  function getEnemyWorldPosition(enemy, target = new THREE.Vector3()) {
    if (enemy.type === 'pillarWorm') return enemy.collisionPosition;
    enemy.group.getWorldPosition(target);
    return target;
  }

  function isStompableEnemy(enemy) {
    return enemy.type === 'bat' || enemy.type === 'worm' || enemy.type === 'yellowWorm' || enemy.type === 'miniYellowWorm' || enemy.type === 'pillarWorm' || enemy.type === 'turtle' || enemy.type === 'jellyfish' || enemy.type === 'pufferBomb' || enemy.type === 'porcupine' || enemy.type === 'acidSnail' || enemy.type === 'explosiveMushroom';
  }

  function updateEnemyVisualState(enemy, dt) {
    if (enemy.type === 'bat') {
      const flap = Math.sin(getScaledTime() * 18 + enemy.flapOffset) * 0.55;
      enemy.leftWing.rotation.z = -0.28 - flap;
      enemy.rightWing.rotation.z = 0.28 + flap;
    } else if (enemy.type === 'worm' || enemy.type === 'yellowWorm' || enemy.type === 'miniYellowWorm' || enemy.type === 'pillarWorm') {
      const wiggle = Math.sin(performance.now() * 0.012 + enemy.id) * 0.05;
      enemy.group.rotation.z = wiggle;
      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= dt;
      } else {
        for (const segment of enemy.segments) segment.material.emissiveIntensity = 0;
      }
    } else if (enemy.type === 'turtle') {
      const wiggle = Math.sin(performance.now() * 0.01 + enemy.id) * 0.035;
      enemy.group.rotation.z = wiggle;
      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= dt;
      } else {
        for (const material of enemy.materials) material.emissiveIntensity = material === enemy.materials[1] ? 0.18 : 0;
      }
    } else if (enemy.type === 'porcupine') {
      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= dt;
      } else {
        enemy.material.emissiveIntensity = 0;
        enemy.spikeMaterial.emissiveIntensity = 0;
      }
    } else if (enemy.type === 'acidSnail') {
      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= dt;
      } else {
        enemy.bodyMaterial.emissiveIntensity = 0;
        enemy.shellMaterial.emissiveIntensity = 0;
      }
    } else if (enemy.type === 'explosiveMushroom') {
      enemy.group.scale.setScalar(1 + Math.sin(getScaledTime() * 3 + enemy.id) * 0.025);
    } else {
      enemy.group.rotation.x += dt * 1.1;
      enemy.group.rotation.z += dt * 0.8;
      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= dt;
      } else {
        enemy.material.emissiveIntensity = 0;
      }
    }
  }

  return {
    positionEnemy,
    isWormAngleValid,
    isWormBodySupported,
    startGroundEnemyFall,
    updateGroundEnemyFall,
    detachGroundEnemiesFromTile,
    updateEnemies,
  };
}
