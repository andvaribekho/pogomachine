import * as THREE from 'three';
import { isWormTile } from '../enemies.js';

export function createEnemySpawnSystem({
  scene,
  world,
  enemies,
  platforms,
  meshFactory,
  yellowWormMaterial,
  yellowWormHeadMaterial,
  gameplayLaneRadius,
  pillarRadius,
  platformThickness,
  platformSpacing,
  twoPi,
  getBulletLaneAngle,
  getTwistBMode,
  getGroundWormsSinceTurtle,
  setGroundWormsSinceTurtle,
  getAcidSnailsThisLevel,
  setAcidSnailsThisLevel,
  positionEnemy,
}) {
  function createBat(y, id) {
    const bat = meshFactory.createBatMesh();
    const arcSpan = 1.05 + Math.random() * 0.25;
    const arcCenter = getBulletLaneAngle();
    const angle = arcCenter + (Math.random() - 0.5) * arcSpan * 0.6;
    const enemy = {
      type: 'bat',
      id,
      group: bat.group,
      leftWing: bat.leftWing,
      rightWing: bat.rightWing,
      y,
      angle,
      arcCenter,
      arcSpan,
      direction: Math.random() < 0.5 ? 1 : -1,
      orbitRadius: gameplayLaneRadius,
      speed: (0.55 + Math.random() * 0.75) * 0.6,
      collisionRadius: 0.38,
      flapOffset: Math.random() * twoPi,
      twistB: getTwistBMode(),
    };
    if (getTwistBMode()) {
      enemy.angle -= world.rotation.y;
      enemy.arcCenter -= world.rotation.y;
      positionEnemy(enemy);
      world.add(enemy.group);
    } else {
      positionEnemy(enemy);
      scene.add(enemy.group);
    }
    enemies.push(enemy);
  }

  function createSpikedBall(y, id) {
    const spike = meshFactory.createSpikedBallMesh();
    const arcSpan = 0.9 + Math.random() * 0.25;
    const arcCenter = getBulletLaneAngle();
    const angle = arcCenter + (Math.random() - 0.5) * arcSpan * 0.6;
    const enemy = {
      type: 'spike',
      id,
      group: spike.group,
      material: spike.material,
      y,
      angle,
      arcCenter,
      arcSpan,
      direction: Math.random() < 0.5 ? 1 : -1,
      orbitRadius: gameplayLaneRadius,
      speed: 0.2 + Math.random() * 0.35,
      collisionRadius: 0.43,
      hp: 3,
      flashTimer: 0,
      twistB: getTwistBMode(),
    };
    if (getTwistBMode()) {
      enemy.angle -= world.rotation.y;
      enemy.arcCenter -= world.rotation.y;
      positionEnemy(enemy);
      world.add(enemy.group);
    } else {
      positionEnemy(enemy);
      scene.add(enemy.group);
    }
    enemies.push(enemy);
  }

  function createWorm(platformData, id, tile) {
    const worm = meshFactory.createWormMesh();
    const start = tile.start + (tile.end - tile.start) * (0.25 + Math.random() * 0.5);
    const enemy = makeGroundWormEnemy({ type: 'worm', id, worm, platformData, start });
    positionEnemy(enemy);
    scene.add(enemy.group);
    enemies.push(enemy);
  }

  function createYellowWorm(platformData, id, tile) {
    const worm = meshFactory.createWormMesh({ bodyMaterialTemplate: yellowWormMaterial, headMaterialTemplate: yellowWormHeadMaterial });
    const start = tile.start + (tile.end - tile.start) * (0.25 + Math.random() * 0.5);
    const enemy = makeGroundWormEnemy({ type: 'yellowWorm', id, worm, platformData, start });
    enemy.splitOnDeath = true;
    positionEnemy(enemy);
    scene.add(enemy.group);
    enemies.push(enemy);
  }

  function createMiniYellowWorm(platformData, id, localAngle, direction) {
    const worm = meshFactory.createWormMesh({ bodyMaterialTemplate: yellowWormMaterial, headMaterialTemplate: yellowWormHeadMaterial, scale: 0.5 });
    const enemy = {
      type: 'miniYellowWorm',
      id,
      group: worm.group,
      segments: worm.segments,
      platformData,
      y: platformData.group.position.y + platformThickness / 2 + 0.2,
      localAngle,
      angle: localAngle,
      direction,
      orbitRadius: gameplayLaneRadius,
      speed: 0.6,
      segmentSpacing: 0.12,
      collisionRadius: 0.17,
      hp: 1,
      flashTimer: 0,
    };
    positionEnemy(enemy);
    scene.add(enemy.group);
    enemies.push(enemy);
  }

  function makeGroundWormEnemy({ type, id, worm, platformData, start }) {
    return {
      type,
      id,
      group: worm.group,
      segments: worm.segments,
      platformData,
      y: platformData.group.position.y + platformThickness / 2 + 0.2,
      localAngle: start,
      angle: start,
      direction: Math.random() < 0.5 ? 1 : -1,
      orbitRadius: gameplayLaneRadius,
      speed: 0.45 + Math.random() * 0.45,
      segmentSpacing: 0.24,
      collisionRadius: 0.34,
      hp: 3,
      flashTimer: 0,
    };
  }

  function createPillarWorm(y, id) {
    const worm = meshFactory.createWormMesh();
    worm.group.scale.setScalar(0.84);
    const laneAngle = ((getBulletLaneAngle() - world.rotation.y + 0.18) % twoPi + twoPi) % twoPi;
    const enemy = {
      type: 'pillarWorm',
      id,
      group: worm.group,
      segments: worm.segments,
      y,
      localAngle: laneAngle,
      angle: laneAngle,
      direction: Math.random() < 0.5 ? 1 : -1,
      visualRadius: pillarRadius + 0.18,
      segmentArc: 0.19,
      speed: 0.28 + Math.random() * 0.22,
      collisionRadius: 0.34,
      hp: 3,
      flashTimer: 0,
      collisionPosition: new THREE.Vector3(),
      interactable: false,
    };
    world.add(enemy.group);
    positionEnemy(enemy);
    enemies.push(enemy);
  }

  function createFloatingEnemy(type, y, id) {
    return createFloatingEnemyWithOptions(type, y, id);
  }

  function createFloatingEnemyWithOptions(type, y, id, options = {}) {
    const isJellyfish = type === 'jellyfish';
    const built = isJellyfish ? meshFactory.createJellyfishMesh() : meshFactory.createPufferBombMesh();
    const arcSpan = 0.95 + Math.random() * 0.35;
    const arcCenter = getBulletLaneAngle();
    const angle = arcCenter + (Math.random() - 0.5) * arcSpan;
    const useTwistB = options.twistB ?? (getTwistBMode() && !options.small);
    const enemy = {
      type,
      id,
      group: built.group,
      material: built.material,
      y,
      baseY: y,
      angle: options.angle ?? angle,
      arcCenter: options.arcCenter ?? arcCenter,
      arcSpan: options.arcSpan ?? arcSpan,
      direction: options.direction ?? (Math.random() < 0.5 ? 1 : -1),
      orbitRadius: options.orbitRadius ?? gameplayLaneRadius,
      speed: options.speed ?? (isJellyfish ? 0.28 + Math.random() * 0.28 : 0.18 + Math.random() * 0.2),
      collisionRadius: options.collisionRadius ?? (isJellyfish ? 0.34 : 0.38),
      hp: options.hp ?? (isJellyfish ? 2 : 2),
      flashTimer: 0,
      bobOffset: Math.random() * twoPi,
      splitOnDeath: options.splitOnDeath ?? (isJellyfish && !options.small),
      twistB: useTwistB,
    };
    if (options.small) enemy.group.scale.setScalar(0.62);
    if (useTwistB) {
      enemy.angle -= world.rotation.y;
      enemy.arcCenter -= world.rotation.y;
      positionEnemy(enemy);
      world.add(enemy.group);
    } else {
      positionEnemy(enemy);
      scene.add(enemy.group);
    }
    enemies.push(enemy);
  }

  function createExplosiveMushroom(platformData, id, tile) {
    const built = meshFactory.createExplosiveMushroomMesh();
    const angle = tile.start + (tile.end - tile.start) * (0.25 + Math.random() * 0.5);
    const enemy = {
      type: 'explosiveMushroom',
      id,
      group: built.group,
      materials: [built.stemMaterial, built.capMaterial, built.spotMaterial],
      platformData,
      y: platformData.group.position.y + platformThickness / 2 + 0.24,
      angle,
      localAngle: angle,
      orbitRadius: gameplayLaneRadius,
      collisionRadius: 0.36,
      hp: 1,
      flashTimer: 0,
    };
    enemy.group.position.set(
      Math.cos(angle) * gameplayLaneRadius,
      platformThickness / 2 + 0.24,
      Math.sin(angle) * gameplayLaneRadius
    );
    enemy.group.rotation.y = -angle + Math.PI / 2;
    platformData.group.add(enemy.group);
    enemies.push(enemy);
  }

  function createTurtle(platformData, id, tile) {
    const turtle = meshFactory.createTurtleMesh();
    const start = tile.start + (tile.end - tile.start) * (0.25 + Math.random() * 0.5);
    const enemy = {
      type: 'turtle',
      id,
      group: turtle.group,
      materials: turtle.materials,
      platformData,
      y: platformData.group.position.y + platformThickness / 2 + 0.2,
      localAngle: start,
      angle: start,
      direction: Math.random() < 0.5 ? 1 : -1,
      orbitRadius: gameplayLaneRadius,
      speed: 0.32 + Math.random() * 0.28,
      collisionRadius: 0.4,
      hp: 3,
      flashTimer: 0,
    };
    positionEnemy(enemy);
    scene.add(enemy.group);
    enemies.push(enemy);
  }

  function createPorcupine(platformData, id, tile) {
    const porcupine = meshFactory.createPorcupineMesh();
    const start = tile.start + (tile.end - tile.start) * (0.25 + Math.random() * 0.5);
    const speed = 0.28 + Math.random() * 0.24;
    const enemy = {
      type: 'porcupine',
      id,
      group: porcupine.group,
      material: porcupine.material,
      spikeMaterial: porcupine.spikeMaterial,
      spikes: porcupine.spikes,
      platformData,
      y: platformData.group.position.y + platformThickness / 2 + 0.2,
      localAngle: start,
      angle: start,
      direction: Math.random() < 0.5 ? 1 : -1,
      orbitRadius: gameplayLaneRadius,
      baseSpeed: speed,
      speed,
      collisionRadius: 0.38,
      hp: 3,
      flashTimer: 0,
      state: 'walk',
      stateTimer: 1.5 + Math.random() * 1.4,
      spikesOut: false,
    };
    positionEnemy(enemy);
    scene.add(enemy.group);
    enemies.push(enemy);
  }

  function createAcidSnail(platformData, id, tile) {
    const snail = meshFactory.createAcidSnailMesh();
    const start = tile.start + (tile.end - tile.start) * (0.25 + Math.random() * 0.5);
    const enemy = {
      type: 'acidSnail',
      id,
      group: snail.group,
      bodyMaterial: snail.bodyMaterial,
      shellMaterial: snail.shellMaterial,
      body: snail.body,
      shell: snail.shell,
      platformData,
      y: platformData.group.position.y + platformThickness / 2 + 0.2,
      localAngle: start,
      angle: start,
      direction: Math.random() < 0.5 ? 1 : -1,
      orbitRadius: gameplayLaneRadius,
      speed: 0.3 + Math.random() * 0.2,
      collisionRadius: 0.36,
      hp: 999,
      flashTimer: 0,
      shellIntact: true,
      trailTimer: 0,
    };
    positionEnemy(enemy);
    scene.add(enemy.group);
    enemies.push(enemy);
  }

  function maybeSpawnWorms(platformData, id) {
    if (id < 6 || platformData.final) return;
    const validTiles = platformData.tiles.filter(isWormTile);
    if (validTiles.length === 0) return;

    const difficulty = Math.min(id / 24, 1);
    const maxWorms = Math.min(3, validTiles.length);
    const wormCount = Math.min(maxWorms, Math.floor(Math.random() * 4));
    const shuffled = [...validTiles].sort(() => Math.random() - 0.5);
    for (let i = 0; i < wormCount; i += 1) {
      if (Math.random() >= 0.35 + difficulty * 0.35) continue;
      if (getGroundWormsSinceTurtle() >= 3) {
        createTurtle(platformData, id, shuffled[i]);
        setGroundWormsSinceTurtle(0);
      } else {
        if (Math.random() < 0.22) {
          createYellowWorm(platformData, id, shuffled[i]);
        } else {
          createWorm(platformData, id, shuffled[i]);
        }
        setGroundWormsSinceTurtle(getGroundWormsSinceTurtle() + 1);
      }
    }
  }

  function ensureInitialLowerPlatformYellowWorm() {
    const platform = platforms.find(candidate => candidate.id === 1 && !candidate.final);
    if (!platform) return;
    const tile = platform.tiles.find(isWormTile);
    if (!tile) return;
    createYellowWorm(platform, platform.id * 1000 + 1, tile);
  }

  function ensureInitialLowerPlatformMushroom() {
    const platform = platforms.find(candidate => candidate.id === 1 && !candidate.final);
    if (!platform) return;
    const validTiles = platform.tiles.filter(isWormTile);
    if (validTiles.length === 0) return;
    const tile = validTiles[Math.min(1, validTiles.length - 1)];
    createExplosiveMushroom(platform, platform.id * 1000 + 2, tile);
  }

  function maybeSpawnEnemiesForSection(platformData, id) {
    if (id < 5) return;

    const difficulty = Math.min(id / 24, 1);
    const platformYValue = platformData.group.position.y;
    const sectionY = platformYValue + platformSpacing * (0.38 + Math.random() * 0.22);
    const batChance = Math.min(0.08 + difficulty * 0.38, 0.55);
    const spikeChance = id > 10 ? Math.min((difficulty - 0.35) * 0.28, 0.22) : 0;

    for (let i = 0; i < 2; i += 1) {
      if (Math.random() < batChance) {
        const offset = (i - 0.5) * 0.9 + (Math.random() - 0.5) * 0.35;
        createBat(sectionY + offset, id);
      }
    }

    if (Math.random() < spikeChance) {
      createSpikedBall(sectionY - 0.9 + Math.random() * 1.8, id);
    }

    maybeSpawnWorms(platformData, id);

    if (id > 6 && Math.random() < 0.08 + difficulty * 0.12) {
      const mushroomTiles = platformData.tiles.filter(isWormTile);
      if (mushroomTiles.length > 0) createExplosiveMushroom(platformData, id, mushroomTiles[Math.floor(Math.random() * mushroomTiles.length)]);
    }

    if (id > 7 && Math.random() < 0.1 + difficulty * 0.14) {
      createFloatingEnemy('jellyfish', sectionY + (Math.random() - 0.5) * 1.2, id);
    }

    if (id > 12 && Math.random() < 0.07 + difficulty * 0.1) {
      createFloatingEnemy('pufferBomb', sectionY + (Math.random() - 0.5) * 1.2, id);
    }

    if (id > 9 && platformData.tiles.length > 0 && Math.random() < 0.1 + difficulty * 0.12) {
      const porcupineTiles = platformData.tiles.filter(isWormTile);
      if (porcupineTiles.length > 0) createPorcupine(platformData, id, porcupineTiles[Math.floor(Math.random() * porcupineTiles.length)]);
    }

    if (getAcidSnailsThisLevel() < 2 && id >= 3 && !platformData.final && platformData.tiles.length > 0) {
      const snailTiles = platformData.tiles.filter(isWormTile);
      if (snailTiles.length > 0) {
        createAcidSnail(platformData, id, snailTiles[Math.floor(Math.random() * snailTiles.length)]);
        setAcidSnailsThisLevel(getAcidSnailsThisLevel() + 1);
      }
    }

    if (id > 8 && Math.random() < 0.18 + difficulty * 0.12) {
      createPillarWorm(sectionY - 0.45 + Math.random() * 0.9, id);
    }
  }

  return {
    createBat,
    createSpikedBall,
    createWorm,
    createYellowWorm,
    createMiniYellowWorm,
    createPillarWorm,
    createFloatingEnemy,
    createFloatingEnemyWithOptions,
    createExplosiveMushroom,
    createTurtle,
    createPorcupine,
    createAcidSnail,
    maybeSpawnWorms,
    ensureInitialLowerPlatformYellowWorm,
    ensureInitialLowerPlatformMushroom,
    maybeSpawnEnemiesForSection,
  };
}
