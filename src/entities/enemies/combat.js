import * as THREE from 'three';
import { colors } from '../../data/colors.js';

export function createEnemyCombatSystem({
  ball,
  enemies,
  getScore,
  setScore,
  getCombo,
  getHp,
  setHp,
  maxHp,
  getVampiricLifeUnlocked,
  getVampiricKillCount,
  setVampiricKillCount,
  scoreEl,
  heartsEl,
  updateHeartsUI,
  getEnemyWorldPosition,
  getWorldRotation,
  createMiniYellowWorm,
  createFloatingEnemyWithOptions,
  damageEnemy,
  killEnemyAt,
  removeEnemyAt,
  spawnExplosion,
  spawnBulletImpact,
  spawnBounceCubes,
  spawnFloatingText,
  explodePuffer,
  increaseCombo,
  playBatDeathSound,
  playMetallicBlipSound,
}) {
  function disposeEnemy(enemy) {
    const materials = new Set();
    enemy.group.traverse((child) => {
      if (child.material) materials.add(child.material);
    });
    if (enemy.group.parent) enemy.group.parent.remove(enemy.group);
    materials.forEach((material) => material.dispose());
  }

  function splitYellowWorm(enemy) {
    if (!enemy.splitOnDeath || !enemy.platformData) return;
    const baseId = enemy.id + 2000;
    createMiniYellowWorm(enemy.platformData, baseId, enemy.localAngle - 0.08, -1);
    createMiniYellowWorm(enemy.platformData, baseId + 1, enemy.localAngle + 0.08, 1);
  }

  function splitJellyfish(enemy, position) {
    if (!enemy.splitOnDeath) return;
    const parentAngle = enemy.twistB ? enemy.angle + getWorldRotation() : enemy.angle;
    const parentArcCenter = enemy.twistB ? enemy.arcCenter + getWorldRotation() : enemy.arcCenter;
    for (let i = 0; i < 2; i += 1) {
      createFloatingEnemyWithOptions('jellyfish', position.y + (i - 0.5) * 0.25, enemy.id + 1000 + i, {
        small: true,
        hp: 1,
        collisionRadius: enemy.collisionRadius * 0.65,
        orbitRadius: enemy.orbitRadius,
        angle: parentAngle + (i - 0.5) * 0.35,
        arcCenter: parentArcCenter,
        arcSpan: enemy.arcSpan * 0.8,
        speed: enemy.speed * 1.35,
        direction: i === 0 ? -1 : 1,
        twistB: enemy.twistB,
      });
    }
  }

  function removeEnemyAtImpl(index, explosionColor) {
    const enemy = enemies[index];
    const position = new THREE.Vector3();
    if (enemy.type === 'pillarWorm' && enemy.collisionPosition) {
      position.copy(enemy.collisionPosition);
    } else {
      enemy.group.getWorldPosition(position);
    }
    disposeEnemy(enemy);
    enemies.splice(index, 1);
    spawnExplosion(position, explosionColor, enemy.type === 'bat' ? 12 : 18);
    if (enemy.type === 'jellyfish') splitJellyfish(enemy, position);
    if (enemy.type === 'yellowWorm') splitYellowWorm(enemy);
    if (enemy.type === 'pufferBomb' || enemy.type === 'explosiveMushroom') explodePuffer(position);
    spawnBounceCubes(position);
  }

  function killEnemyAtImpl(index, explosionColor) {
    const enemy = enemies[index];
    if (enemy.type === 'bat' || enemy.type === 'worm' || enemy.type === 'yellowWorm' || enemy.type === 'miniYellowWorm' || enemy.type === 'pillarWorm' || enemy.type === 'turtle' || enemy.type === 'acidSnail' || enemy.type === 'jellyfish' || enemy.type === 'porcupine' || enemy.type === 'explosiveMushroom') playBatDeathSound();
    setScore(getScore() + 5 * Math.max(1, getCombo()));
    scoreEl.textContent = String(getScore());
    removeEnemyAt(index, explosionColor);
    increaseCombo();
    if (getVampiricLifeUnlocked()) {
      setVampiricKillCount(getVampiricKillCount() + 1);
      if (getVampiricKillCount() >= 10) {
        setVampiricKillCount(0);
        if (getHp() < maxHp) {
          setHp(getHp() + 1);
          updateHeartsUI(heartsEl, getHp(), maxHp);
          spawnFloatingText('VAMP +1', ball.position, 0xe91e63, true);
        }
      }
    }
  }

  function damageEnemyImpl(enemyIndex) {
    const enemy = enemies[enemyIndex];
    if (enemy.type === 'acidSnail') return;
    if (enemy.type === 'explosiveMushroom') {
      killEnemyAt(enemyIndex, colors.particle);
      return;
    }
    if (enemy.type === 'bat') {
      killEnemyAt(enemyIndex, colors.particle);
      return;
    }

    enemy.hp -= 1;
    enemy.flashTimer = 0.18;
    if (enemy.type === 'worm' || enemy.type === 'yellowWorm' || enemy.type === 'miniYellowWorm' || enemy.type === 'pillarWorm') {
      for (const segment of enemy.segments) {
        segment.material.emissive.setHex(0xffeb3b);
        segment.material.emissiveIntensity = 0.8;
      }
    } else if (enemy.type === 'turtle') {
      for (const material of enemy.materials) {
        material.emissive.setHex(0xffeb3b);
        material.emissiveIntensity = 0.8;
      }
    } else if (enemy.type === 'porcupine') {
      enemy.material.emissive.setHex(0xffeb3b);
      enemy.material.emissiveIntensity = 0.8;
      enemy.spikeMaterial.emissive.setHex(0xffeb3b);
      enemy.spikeMaterial.emissiveIntensity = 0.8;
    } else {
      enemy.material.emissive.setHex(0xff0000);
      enemy.material.emissiveIntensity = 0.9;
    }

    if (enemy.hp <= 0) {
      killEnemyAt(enemyIndex, enemy.type === 'worm' || enemy.type === 'pillarWorm' ? colors.worm : enemy.type === 'yellowWorm' || enemy.type === 'miniYellowWorm' ? colors.yellowWorm : colors.red);
    }
  }

  function checkBulletEnemyHit(bullet) {
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      if (bullet.hitEnemies?.has(enemy)) continue;
      const hitRadius = enemy.collisionRadius + 0.12;
      if (enemy.type === 'pillarWorm' && !enemy.interactable) continue;
      const collisionPosition = getEnemyWorldPosition(enemy);
      if (bullet.mesh.position.distanceToSquared(collisionPosition) <= hitRadius * hitRadius) {
        if (bullet.shotgunShotId && enemy.lastShotgunHitId === bullet.shotgunShotId) return false;
        if (bullet.shotgunShotId) enemy.lastShotgunHitId = bullet.shotgunShotId;
        if (bullet.hitEnemies) bullet.hitEnemies.add(enemy);
        if (enemy.type === 'acidSnail') {
          spawnBulletImpact(bullet.mesh.position.clone());
          enemy.flashTimer = 0.2;
          enemy.bodyMaterial.emissive.setHex(0x2196f3);
          enemy.bodyMaterial.emissiveIntensity = 0.9;
          enemy.shellMaterial.emissive.setHex(0x2196f3);
          enemy.shellMaterial.emissiveIntensity = 0.9;
          playMetallicBlipSound();
          return true;
        }
        damageEnemy(i);
        return true;
      }
    }
    return false;
  }

  return {
    disposeEnemy,
    splitYellowWorm,
    splitJellyfish,
    removeEnemyAt: removeEnemyAtImpl,
    killEnemyAt: killEnemyAtImpl,
    damageEnemy: damageEnemyImpl,
    checkBulletEnemyHit,
  };
}
