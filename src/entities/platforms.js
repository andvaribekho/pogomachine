import * as THREE from 'three';
import {
  gameplayLaneRadius, pillarRadius, platformInnerRadius, platformOuterRadius,
  platformThickness, platformSpacing, platformSpikeHeight, spikeCycleDuration, twoPi,
} from '../core/constants.js';
import { colors } from '../data/colors.js';
import { angleInArc, isFlashablePlatformTile, makeArcGeometry } from '../core/utils.js';

const platformBandIndex = new Map();
const tilePointLocal = new THREE.Vector3();
const flashA = new THREE.Color();
const flashB = new THREE.Color();

export function platformY(platform) {
  return platform.group.position.y;
}

export function clearPlatformBandIndex() {
  platformBandIndex.clear();
}

export function registerPlatformInBand(platform) {
  const y = platformY(platform);
  const band = Math.round(y / platformSpacing);
  if (!platformBandIndex.has(band)) platformBandIndex.set(band, []);
  platformBandIndex.get(band).push(platform);
}

export function unregisterPlatformFromBand(platform) {
  const y = platformY(platform);
  const band = Math.round(y / platformSpacing);
  const arr = platformBandIndex.get(band);
  if (!arr) return;
  const idx = arr.indexOf(platform);
  if (idx !== -1) arr.splice(idx, 1);
}

export function getPlatformsNearY(yMin, yMax) {
  const bandMin = Math.round(yMin / platformSpacing) - 1;
  const bandMax = Math.round(yMax / platformSpacing) + 1;
  const result = [];
  for (let b = bandMin; b <= bandMax; b += 1) {
    const arr = platformBandIndex.get(b);
    if (arr) {
      for (let i = 0; i < arr.length; i += 1) {
        result.push(arr[i]);
      }
    }
  }
  return result;
}

export function forEachPlatformNearY(yMin, yMax, callback) {
  const bandMin = Math.round(yMin / platformSpacing) - 1;
  const bandMax = Math.round(yMax / platformSpacing) + 1;
  for (let b = bandMin; b <= bandMax; b += 1) {
    const arr = platformBandIndex.get(b);
    if (!arr) continue;
    for (let i = 0; i < arr.length; i += 1) {
      callback(arr[i]);
    }
  }
}

export function getPlatformTileColor(type) {
  if (type === 'red') return colors.red;
  if (type === 'finish') return colors.finish;
  if (type === 'gray') return colors.gray;
  if (type === 'shop') return colors.shop;
  return colors.blue;
}

export function makeCrackLine(startAngle, endAngle) {
  const centerAngle = (startAngle + endAngle) / 2;
  const points = [
    new THREE.Vector3(Math.cos(centerAngle - 0.08) * 1.35, platformThickness / 2 + 0.014, Math.sin(centerAngle - 0.08) * 1.35),
    new THREE.Vector3(Math.cos(centerAngle + 0.04) * 1.82, platformThickness / 2 + 0.014, Math.sin(centerAngle + 0.04) * 1.82),
    new THREE.Vector3(Math.cos(centerAngle - 0.03) * 2.18, platformThickness / 2 + 0.014, Math.sin(centerAngle - 0.03) * 2.18),
    new THREE.Vector3(Math.cos(centerAngle + 0.08) * 2.72, platformThickness / 2 + 0.014, Math.sin(centerAngle + 0.08) * 2.72),
  ];
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: colors.crack })
  );
}

export function makeGrayCrackLines(startAngle, endAngle, stage) {
  const group = new THREE.Group();
  const centerAngle = (startAngle + endAngle) / 2;
  const lineCount = stage >= 2 ? 3 : 1;

  for (let i = 0; i < lineCount; i += 1) {
    const offset = (i - (lineCount - 1) / 2) * 0.09;
    const spread = stage >= 2 ? 0.14 : 0.08;
    const points = [
      new THREE.Vector3(Math.cos(centerAngle - spread + offset) * 1.24, platformThickness / 2 + 0.018, Math.sin(centerAngle - spread + offset) * 1.24),
      new THREE.Vector3(Math.cos(centerAngle + 0.03 - offset) * 1.7, platformThickness / 2 + 0.018, Math.sin(centerAngle + 0.03 - offset) * 1.7),
      new THREE.Vector3(Math.cos(centerAngle - 0.06 + offset) * 2.2, platformThickness / 2 + 0.018, Math.sin(centerAngle - 0.06 + offset) * 2.2),
      new THREE.Vector3(Math.cos(centerAngle + spread - offset) * 2.82, platformThickness / 2 + 0.018, Math.sin(centerAngle + spread - offset) * 2.82),
    ];
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: colors.grayCrack })
    ));
  }

  return group;
}

export function disposeTile(tile) {
  if (tile.mesh.parent) tile.mesh.parent.remove(tile.mesh);
  tile.mesh.geometry.dispose();
  tile.material.dispose();

  if (tile.crackLine) {
    if (tile.crackLine.parent) tile.crackLine.parent.remove(tile.crackLine);
    tile.crackLine.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    if (tile.crackLine.geometry) tile.crackLine.geometry.dispose();
    if (tile.crackLine.material) tile.crackLine.material.dispose();
  }
}

export function setGrayTileCrackStage(platform, tile, stage) {
  if (tile.crackLine) {
    if (tile.crackLine.parent) tile.crackLine.parent.remove(tile.crackLine);
    tile.crackLine.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  tile.crackLine = makeGrayCrackLines(tile.start, tile.end, stage);
  platform.group.add(tile.crackLine);
}

export function getTileAtWorldPoint(platform, worldPoint) {
  tilePointLocal.copy(worldPoint);
  platform.group.worldToLocal(tilePointLocal);

  const radius = Math.hypot(tilePointLocal.x, tilePointLocal.z);
  if (radius < platformInnerRadius || radius > platformOuterRadius) return null;

  const angle = (Math.atan2(tilePointLocal.z, tilePointLocal.x) + twoPi) % twoPi;
  return platform.tiles.find((tile) => !tile.broken && angleInArc(angle, tile.start, tile.end)) || null;
}

export function updateTileFlashes(platforms, dt) {
  for (const platform of platforms) {
    for (const tile of platform.tiles) {
      if (!isFlashablePlatformTile(tile) || tile.broken) continue;

      const baseColor = getPlatformTileColor(tile.type);
      const flashColor = tile.type === 'gray' ? colors.grayFlash : colors.blueFlash;
      if (tile.flashTimer > 0) {
        tile.flashTimer = Math.max(0, tile.flashTimer - dt);
        const t = tile.flashTimer / 0.3;
        flashA.setHex(baseColor);
        flashB.setHex(flashColor);
        tile.mesh.material.color.copy(flashA.lerp(flashB, t));
      } else {
        tile.mesh.material.color.setHex(baseColor);
      }
    }
  }
}

export function createPlatformSystem({
  world,
  platforms,
  spikeTraps,
  spikeHoleGeometry,
  spikeHoleMaterial,
  platformSpikeGeometry,
  platformSpikeMaterial,
  getLevelTarget,
  getSpikePlatformsThisLevel,
  setSpikePlatformsThisLevel,
  getShopTilePlat,
  setShopTilePlat,
  setShopTileRef,
  createCrate,
  maybeSpawnEnemiesForSection,
  maybeSpawnCannon,
}) {
  function shouldCreateSpikePlatform(id, isFinal) {
    if (isFinal || id <= 1) return false;
    const target = getLevelTarget();
    const required = Math.ceil(target * 0.1);
    if (getSpikePlatformsThisLevel() >= required) return Math.random() < 0.045;
    const remainingNonFinalPlatforms = Math.max(0, target - id);
    const remainingRequired = required - getSpikePlatformsThisLevel();
    return id % 10 === 5 || remainingNonFinalPlatforms <= remainingRequired;
  }

  function createSpikeTrap(platformGroup, tile) {
    const group = new THREE.Group();
    const spikes = [];
    const centerAngle = (tile.start + tile.end) / 2;
    const arcSpan = tile.end - tile.start;
    const angleStep = Math.min(0.09, arcSpan * 0.2);
    const angles = [centerAngle - angleStep, centerAngle, centerAngle + angleStep];

    for (const angle of angles) {
      const hole = new THREE.Mesh(spikeHoleGeometry.clone(), spikeHoleMaterial.clone());
      hole.position.set(
        Math.cos(angle) * gameplayLaneRadius,
        platformThickness / 2 + 0.012,
        Math.sin(angle) * gameplayLaneRadius
      );
      hole.rotation.y = -angle + Math.PI / 4;
      group.add(hole);

      const spike = new THREE.Mesh(platformSpikeGeometry.clone(), platformSpikeMaterial.clone());
      spike.position.set(
        Math.cos(angle) * gameplayLaneRadius,
        platformThickness / 2 + platformSpikeHeight / 2 - 0.02,
        Math.sin(angle) * gameplayLaneRadius
      );
      spike.rotation.y = -angle + Math.PI / 4;
      spike.castShadow = true;
      group.add(spike);
      spikes.push({ mesh: spike, angle, colliderPosition: new THREE.Vector3() });
    }

    platformGroup.add(group);
    tile.spikeTrap = true;
    const trap = { group, platformGroup, spikes, timer: Math.random() * spikeCycleDuration, raiseAmount: 1 };
    spikeTraps.push(trap);
    setSpikePlatformsThisLevel(getSpikePlatformsThisLevel() + 1);
  }

  function maybeCreateSpikeTrap(platformGroup, tiles, id, isFinal) {
    if (!shouldCreateSpikePlatform(id, isFinal)) return;
    const validTiles = tiles.filter(tile => tile.type === 'blue' && !tile.broken && !tile.spikeTrap);
    if (!validTiles.length) return;
    createSpikeTrap(platformGroup, validTiles[Math.floor(Math.random() * validTiles.length)]);
  }

  function createShopSign(shopAngle) {
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 128;
    signCanvas.height = 64;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#ffc107';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#15202b';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Shop', 64, 32);
    const signTexture = new THREE.CanvasTexture(signCanvas);
    const signMat = new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.6 });
    const signGeo = new THREE.PlaneGeometry(0.7, 0.35);
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(
      Math.cos(shopAngle) * (pillarRadius + 0.02),
      0,
      Math.sin(shopAngle) * (pillarRadius + 0.02)
    );
    signMesh.rotation.y = -shopAngle + Math.PI / 2;
    return signMesh;
  }

  function createPlatform(y, id, options = {}) {
    const group = new THREE.Group();
    group.position.y = y;

    const isFinal = options.final === true;
    const difficulty = Math.min(id / 18, 1);
    const segmentCount = isFinal ? 16 : Math.floor(8 + difficulty * 5);
    const gapCount = isFinal ? 0 : Math.min(4, 2 + Math.floor(difficulty * 3));
    const redChance = isFinal ? 0 : 0.08 + difficulty * 0.17;
    const grayChance = isFinal ? 0 : 0.1 + difficulty * 0.08;
    const crackedChance = isFinal ? 0 : 0.1 + difficulty * 0.08;
    const arcSize = twoPi / segmentCount;
    const tiles = [];

    const gapIndexes = new Set();
    while (gapIndexes.size < gapCount) {
      gapIndexes.add(Math.floor(Math.random() * segmentCount));
    }

    for (let i = 0; i < segmentCount; i += 1) {
      if (gapIndexes.has(i)) continue;

      const start = i * arcSize;
      const end = (i + 1) * arcSize;
      let type = isFinal ? 'finish' : Math.random() < redChance && id > 1 ? 'red' : 'blue';
      if (type === 'blue' && Math.random() < grayChance && id > 2) {
        type = 'gray';
      }
      if (type === 'blue' && Math.random() < crackedChance && id > 2) {
        type = 'crackedBlue';
      }
      const geometry = makeArcGeometry(platformInnerRadius, platformOuterRadius, start, end, platformThickness);
      const tileColor = getPlatformTileColor(type);
      const material = new THREE.MeshStandardMaterial({ color: tileColor, roughness: 0.6, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);
      const crackLine = type === 'crackedBlue' ? makeCrackLine(start, end) : null;
      mesh.receiveShadow = true;
      group.add(mesh);
      if (crackLine) group.add(crackLine);
      const tile = { index: i, start, end, type, mesh, material, crackLine, flashTimer: 0, broken: false, hitCount: 0, spikeTrap: false };
      tiles.push(tile);
    }

    maybeCreateSpikeTrap(group, tiles, id, isFinal);

    if (!isFinal) {
      for (let c = 0; c < 3; c += 1) {
        if (Math.random() < 0.055) {
          const crateAngle = Math.random() * twoPi;
          const crateRadius = gameplayLaneRadius;
          const crateTile = tiles.find(t =>
            t.type === 'blue' && !t.broken && !t.spikeTrap &&
            angleInArc(crateAngle, t.start, t.end)
          );
          if (crateTile) {
            createCrate(group, crateAngle, crateRadius);
          }
        }
      }
    }

    if (!isFinal && !getShopTilePlat() && id === 3) {
      const shopTile = tiles.find(t => t.type === 'blue' && !t.broken && !t.spikeTrap);
      if (shopTile) {
        shopTile.type = 'shop';
        shopTile.material.color.setHex(colors.shop);
        setShopTilePlat({ id, group });
        setShopTileRef(shopTile);

        const shopAngle = (shopTile.start + shopTile.end) / 2;
        group.add(createShopSign(shopAngle));
      }
    }

    world.add(group);
    const platData = { id, group, tiles, scored: false, final: isFinal };
    platforms.push(platData);
    registerPlatformInBand(platData);

    if (!isFinal) maybeSpawnEnemiesForSection(platData, id);
    if (!isFinal) maybeSpawnCannon(platData, id);
  }

  return {
    createPlatform,
    shouldCreateSpikePlatform,
    createSpikeTrap,
    maybeCreateSpikeTrap,
  };
}
