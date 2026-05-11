import * as THREE from 'three';
import { angleInArc } from '../core/utils.js';
import { platformY } from './platforms.js';

export function createGoldBlockSystem({
  scene,
  ball,
  ballRadius,
  platforms,
  crates,
  goldBlocks,
  particles,
  goldBlockGeometry,
  goldBlockMaterial,
  particleGeometry,
  gameplayLaneRadius,
  platformThickness,
  platformInnerRadius,
  platformOuterRadius,
  goldBlockSize,
  goldBlockHalfSize,
  goldBlockCollisionRadius,
  goldBlockHitsToBreak,
  goldBlocksPerLevel,
  goldCubesPerHit,
  twoPi,
  colors,
  getBallVelocity,
  setBallVelocity,
  getStompImpulse,
  getCannons,
  getEnemies,
  getCannonWorldPosition,
  getEnemyWorldPosition,
  reloadAmmo,
  spawnFloatingText,
  playReloadSound,
  playBounceSound,
  spawnExplosion,
  spawnBulletImpact,
  spawnBounceCubes,
}) {
  function createGoldBlock(platformData, tile) {
    const angle = tile.start + (tile.end - tile.start) * (0.25 + Math.random() * 0.5);
    const position = new THREE.Vector3(
      Math.cos(angle) * gameplayLaneRadius,
      platformThickness / 2 + goldBlockHalfSize,
      Math.sin(angle) * gameplayLaneRadius
    );
    if (!isGoldBlockPositionClear(platformData, position)) return false;

    const mesh = new THREE.Mesh(goldBlockGeometry.clone(), goldBlockMaterial.clone());
    mesh.position.copy(position);
    mesh.rotation.y = angle + Math.PI * 0.25;
    mesh.castShadow = true;
    platformData.group.add(mesh);
    goldBlocks.push({ mesh, platformData, hp: goldBlockHitsToBreak, flashTimer: 0, sparkleTimer: Math.random() * 0.12, broken: false, falling: false, fallVelocity: 0 });
    return true;
  }

  function isGoldBlockPositionClear(platformData, localPosition) {
    const worldPosition = localPosition.clone();
    platformData.group.localToWorld(worldPosition);
    const minDistance = goldBlockHalfSize + 0.45;

    for (const crate of crates) {
      if (crate.broken || crate.platformGroup !== platformData.group) continue;
      const cratePosition = new THREE.Vector3();
      crate.mesh.getWorldPosition(cratePosition);
      if (cratePosition.distanceTo(worldPosition) < minDistance) return false;
    }

    for (const cannon of getCannons()) {
      if (cannon.platformData !== platformData) continue;
      if (getCannonWorldPosition(cannon).distanceTo(worldPosition) < minDistance) return false;
    }

    for (const enemy of getEnemies()) {
      const enemyPosition = getEnemyWorldPosition(enemy);
      if (Math.abs(enemyPosition.y - worldPosition.y) > goldBlockSize + 0.6) continue;
      if (enemyPosition.distanceToSquared(worldPosition) < minDistance * minDistance) return false;
    }

    for (const goldBlock of goldBlocks) {
      if (goldBlock.platformData !== platformData || goldBlock.broken) continue;
      const position = new THREE.Vector3();
      goldBlock.mesh.getWorldPosition(position);
      if (position.distanceTo(worldPosition) < minDistance) return false;
    }

    return true;
  }

  function spawnGoldBlocksForLevel() {
    const floorCandidates = platforms
      .filter(platform => !platform.final)
      .map(platform => ({
        platform,
        tiles: platform.tiles.filter(tile => !tile.broken && (tile.type === 'blue' || tile.type === 'gray')),
      }))
      .filter(candidate => candidate.tiles.length > 0)
      .sort(() => Math.random() - 0.5);

    let spawned = 0;
    for (const candidate of floorCandidates) {
      if (spawned >= goldBlocksPerLevel) break;
      const tiles = [...candidate.tiles].sort(() => Math.random() - 0.5);
      for (const tile of tiles) {
        if (createGoldBlock(candidate.platform, tile)) {
          spawned += 1;
          break;
        }
      }
    }
  }

  function detachGoldBlocksFromTile(platform, tile) {
    for (const gb of goldBlocks) {
      if (gb.broken || gb.platformData !== platform) continue;
      const localPos = new THREE.Vector3();
      gb.mesh.getWorldPosition(localPos);
      const r = Math.hypot(localPos.x, localPos.z);
      const a = (Math.atan2(localPos.z, localPos.x) + twoPi) % twoPi;
      if (r < platformInnerRadius || r > platformOuterRadius || !angleInArc(a, tile.start, tile.end)) continue;
      gb.platformData.group.remove(gb.mesh);
      scene.add(gb.mesh);
      gb.platformData = null;
      gb.falling = true;
      gb.fallVelocity = 0;
    }
  }

  function checkBallGoldBlockStomp(previousY) {
    if (getBallVelocity() >= 0) return;

    const bottomBefore = previousY - ballRadius;
    const bottomNow = ball.position.y - ballRadius;

    for (let i = goldBlocks.length - 1; i >= 0; i -= 1) {
      const goldBlock = goldBlocks[i];
      if (goldBlock.broken) continue;

      const position = new THREE.Vector3();
      goldBlock.mesh.getWorldPosition(position);
      const blockTop = position.y + goldBlockHalfSize;

      if (bottomBefore < blockTop || bottomNow > blockTop) continue;

      const horizontalDistance = Math.hypot(
        ball.position.x - position.x,
        ball.position.z - position.z
      );

      if (horizontalDistance <= goldBlockCollisionRadius) {
        damageGoldBlock(i);
        if (reloadAmmo()) {
          spawnFloatingText('Reload', ball.position);
          playReloadSound();
        }
        playBounceSound();
        ball.position.y = blockTop + ballRadius;
        setBallVelocity(Math.max(getBallVelocity(), getStompImpulse()));
        return;
      }
    }
  }

  function destroyGoldBlock(index, position) {
    const goldBlock = goldBlocks[index];
    if (!goldBlock || goldBlock.broken) return;

    goldBlock.broken = true;
    spawnExplosion(position, colors.gold, 14);
    if (goldBlock.mesh.parent) goldBlock.mesh.parent.remove(goldBlock.mesh);
    goldBlock.mesh.geometry.dispose();
    goldBlock.mesh.material.dispose();
    goldBlocks.splice(index, 1);
  }

  function damageGoldBlock(index) {
    const goldBlock = goldBlocks[index];
    if (!goldBlock || goldBlock.broken) return false;

    const position = new THREE.Vector3();
    goldBlock.mesh.getWorldPosition(position);
    goldBlock.hp -= 1;
    goldBlock.flashTimer = 0.16;
    spawnBounceCubes(position, goldCubesPerHit, colors.gold, 1);
    spawnBulletImpact(position);

    if (goldBlock.hp <= 0) {
      destroyGoldBlock(index, position);
    }
    return true;
  }

  function spawnGoldSparkle(goldBlock) {
    const localOffset = new THREE.Vector3(
      (Math.random() - 0.5) * goldBlockSize * 0.8,
      goldBlockHalfSize + 0.035,
      (Math.random() - 0.5) * goldBlockSize * 0.8
    );
    const position = localOffset.clone();
    goldBlock.mesh.localToWorld(position);

    const material = new THREE.MeshBasicMaterial({ color: colors.gold, transparent: true, opacity: 0.82, depthWrite: false });
    const mesh = new THREE.Mesh(particleGeometry, material);
    mesh.position.copy(position);
    mesh.scale.setScalar(0.45 + Math.random() * 0.35);
    scene.add(mesh);
    particles.push({
      mesh,
      material,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 0.12, 0.65 + Math.random() * 0.45, (Math.random() - 0.5) * 0.12),
      gravity: 0,
      life: 2,
      maxLife: 2,
    });
  }

  function checkBulletGoldBlockHit(bullet, previousY) {
    for (let i = goldBlocks.length - 1; i >= 0; i -= 1) {
      const goldBlock = goldBlocks[i];
      if (goldBlock.broken) continue;

      const position = new THREE.Vector3();
      goldBlock.mesh.getWorldPosition(position);
      const crossedBlockY = previousY >= position.y - goldBlockHalfSize && bullet.mesh.position.y <= position.y + goldBlockHalfSize;
      const horizontalDistance = Math.hypot(
        bullet.mesh.position.x - position.x,
        bullet.mesh.position.z - position.z
      );

      if (crossedBlockY && horizontalDistance <= goldBlockHalfSize + 0.16) {
        return damageGoldBlock(i);
      }
    }
    return false;
  }

  function updateGoldBlocks(dt) {
    for (const goldBlock of goldBlocks) {
      if (goldBlock.broken) continue;

      goldBlock.mesh.rotation.y += dt * 0.7;
      goldBlock.sparkleTimer -= dt;
      if (goldBlock.sparkleTimer <= 0) {
        goldBlock.sparkleTimer = 0.06 + Math.random() * 0.06;
        spawnGoldSparkle(goldBlock);
      }

      if (goldBlock.flashTimer > 0) {
        goldBlock.flashTimer = Math.max(0, goldBlock.flashTimer - dt);
        goldBlock.mesh.material.color.setHex(colors.goldFlash);
        goldBlock.mesh.material.emissive.setHex(colors.goldFlash);
        goldBlock.mesh.material.emissiveIntensity = 0.55;
      } else {
        goldBlock.mesh.material.color.setHex(colors.gold);
        goldBlock.mesh.material.emissive.setHex(0x8a5a00);
        goldBlock.mesh.material.emissiveIntensity = 0.25;
      }
    }
  }

  function updateFallingGoldBlocks(dt) {
    for (const gb of goldBlocks) {
      if (!gb.falling || gb.broken) continue;
      const previousY = gb.mesh.position.y;
      gb.fallVelocity = (gb.fallVelocity ?? 0) - 14 * dt;
      gb.mesh.position.y += gb.fallVelocity * dt;
      for (const platform of platforms) {
        const platformTop = platformY(platform) + platformThickness / 2 + goldBlockHalfSize;
        if (previousY >= platformTop && gb.mesh.position.y <= platformTop) {
          gb.platformData = platform;
          platform.group.add(gb.mesh);
          gb.mesh.position.y = platformThickness / 2 + goldBlockHalfSize;
          gb.falling = false;
          gb.fallVelocity = 0;
          break;
        }
      }
    }
  }

  function removeGoldBlocksForPlatform(platform) {
    for (let g = goldBlocks.length - 1; g >= 0; g -= 1) {
      if (goldBlocks[g].platformData === platform) goldBlocks.splice(g, 1);
    }
  }

  return {
    createGoldBlock,
    isGoldBlockPositionClear,
    spawnGoldBlocksForLevel,
    detachGoldBlocksFromTile,
    checkBallGoldBlockStomp,
    destroyGoldBlock,
    damageGoldBlock,
    spawnGoldSparkle,
    checkBulletGoldBlockHit,
    updateGoldBlocks,
    updateFallingGoldBlocks,
    removeGoldBlocksForPlatform,
  };
}
