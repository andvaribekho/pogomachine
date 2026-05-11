import * as THREE from 'three';
import './style.css';
import { colors } from './data/colors.js';
import {
  platformInnerRadius, platformOuterRadius, platformThickness, platformSpacing,
  ballRadius, pillarRadius, twoPi, collisionDebugEnabled,
  defaultMaxAmmo, defaultFireInterval, defaultShotgunFireInterval,
  defaultShotgunSpreadAngle, defaultBulletImpulse, defaultGravity,
  defaultTerminalVelocity, defaultStompImpulse, defaultPlayerHitboxScale,
  defaultCannonChargeTime, defaultCannonCooldown, defaultLaserRingOnTime,
  defaultLaserRingOffTime, defaultCoinAttractionRadius, bulletSpeed,
  bulletLifetime, baseShotUpwardVelocityCap, bounceCubePoolSize,
  gameplayLaneRadius, goldBlockSize, goldBlockHalfSize, goldBlockCollisionRadius,
  goldBlockHitsToBreak, goldCubesPerHit, grayTileHitsToBreak, ledgeRadialLength,
  sawBladeOuterRadius, sawBladeInnerRadius, sawBladeLaneRadius,
  spikeCycleDuration, spikeUpDuration, spikeMoveDuration, spikeDownDuration,
  platformSpikeHeight, ballStartY, groundEnemyFootOffset, idleRotationSpeed,
} from './core/constants.js';
import {
  goldBlocksPerLevel, sawBladesPerLevel, maxHp,
  invulnerabilityCost, shieldCost, piercingCost, vampiricCost,
  comboShieldCost, comboShieldThreshold,
} from './data/balance.js';
import {
  angleInArc, isBlueTile,
} from './core/utils.js';
import {
  playBounceSound, playFailSound, playShootSound, playEmptyAmmoSound,
  playReloadSound, playBatDeathSound, playCannonActivateSound,
  playCannonFireSound, playRewardSound, playCoinCubeCollectSound,
  playGlassBreakSound, playPufferExplosionSound, playMetallicBlipSound,
  playAcidBurnSound, startInvulnerabilityMusic, updateInvulnerabilityMusic,
  stopInvulnerabilityMusic,
} from './systems/audio.js';
import {
  updateHeartsUI, updateCoinsUI, rebuildAmmoUI as rebuildAmmoSegments,
  updateAmmoUI as updateAmmoSegments, updateWeaponUI as updateWeaponLabel,
  updateShopUI as renderShopUI, updateLevelCompleteUI as renderLevelCompleteUI,
} from './systems/ui.js';
import { setupInputListeners } from './systems/input.js';
import { loadScores, submitScoreToLeaderboard, getPlayerRank } from './systems/leaderboard.js';
import { setupSteamDeckMode } from './systems/steamDeckInput.js';
import { integrateBallPhysics } from './systems/physics.js';
import {
  createShootingSystem,
} from './systems/shooting.js';
import { parseClampedFloat, parseClampedAbsFloat, parseClampedInt } from './systems/options.js';
import { getLevelInfo as makeLevelInfo, getLevelTarget as getTargetForLevel } from './systems/levels.js';
import { createGameAssets } from './render/assets.js';
import { createSceneBundle, resizeScene } from './render/scene.js';
import {
  spawnExplosion as spawnExplosionParticles,
  spawnBulletImpact as spawnBulletImpactParticles,
} from './render/effects.js';
import {
  platformY, clearPlatformBandIndex, registerPlatformInBand,
  unregisterPlatformFromBand, getPlatformsNearY,
  disposeTile, setGrayTileCrackStage,
  getTileAtWorldPoint, updateTileFlashes as updatePlatformTileFlashes,
  createPlatformSystem,
} from './entities/platforms.js';
import { createEnemyMeshFactory } from './entities/enemies/meshes.js';
import { createEnemySpawnSystem } from './entities/enemies/spawn.js';
import { createEnemyUpdateSystem } from './entities/enemies/update.js';
import { createEnemyCombatSystem } from './entities/enemies/combat.js';
import { createCoinPickupSystem } from './entities/coinPickups.js';
import { createBounceCubeSystem } from './entities/bounceCubes.js';
import { createCrateSystem } from './entities/crates.js';
import { createGoldBlockSystem } from './entities/goldBlocks.js';
import { createObstacleSystem } from './entities/obstacles.js';
import { getDomRefs } from './ui/dom.js';
import { createCollisionDebug } from './debug/collisionDebug.js';

const { scene, camera, renderer } = createSceneBundle();
const {
  scoreEl, heartsEl, coinsEl, levelLabelEl, progressFillEl, progressLabelEl,
  gameOverEl, finalScoreEl, ammoMagazineEl, weaponIndicatorEl, pauseButton,
  steamDeckButton, pausePanelEl, closePanelButton, impulseInput, fireIntervalInput,
  shotgunSpreadInput, shotgunIntervalInput, maxAmmoInput, gravityInput,
  terminalVelocityInput, stompImpulseInput, hitboxScaleInput, cannonChargeInput,
  cannonCooldownInput, laserOnInput, laserOffInput, coinAttractionInput,
  levelCompleteEl, completeSummaryEl, rewardHpButton, rewardAmmoButton,
  rewardPiercingButton, rewardVampiricButton, rewardComboShieldButton,
  buyInvulnerabilityButton, buyShieldButton, shopStatusEl, nextLevelButton,
  extraButton, extraPanelEl, closeExtraButton, impulseAButton, impulseBButton,
  impulseCButton, impulseBResetInput, impulseBShotgunInput, impulseBResetLabel,
  impulseBShotgunLabel, impulseCFactorLabel, impulseCFactorInput, controlAButton,
  controlBButton, twistBOffButton, twistBOnButton, flyingModeBOffButton,
  flyingModeBOnButton, shopPanelEl, shopCoinsEl, shopBulletBtn, shopHpBtn,
  shopArmorBtn, shopInvulnBtn, shopPiercingBtn, shopVampiricBtn,
  shopComboShieldBtn, closeShopButton, leaderboardPanelEl, leaderboardNameSection,
  leaderboardNameInput, leaderboardSubmitBtn, leaderboardScoreLabel,
  leaderboardSubmittedEl, leaderboardRankMsg, leaderboardListEl, leaderboardCloseBtn,
} = getDomRefs();

let scoreSubmittedToLeaderboard = false;
let leaderboardPendingClose = false;
let gameOverScreenShown = false;

const world = new THREE.Group();
scene.add(world);

let ballVelocity = 0;
let gravity = defaultGravity;
let terminalVelocity = defaultTerminalVelocity;
let stompImpulse = defaultStompImpulse;
let cannonChargeTime = defaultCannonChargeTime;
let cannonCooldown = defaultCannonCooldown;
let laserRingOnTime = defaultLaserRingOnTime;
let laserRingOffTime = defaultLaserRingOffTime;
let bounceVelocity = 7.7;
let score = 0;
let currentLevel = 1;
let platformsPassedThisLevel = 0;
let nextPlatformId = 0;
let isGameOver = false;
let isPaused = false;
let impulseMode = 'C';
let impulseBResetSpeed = defaultGravity * 0.1;
let impulseBShotgunImpulse = 4;
let impulseCfactor = 0.93;
let controlMode = 'A';
let twistBMode = true;
let flyingModeB = true;
let timeScale = 1;
let damageSlowdownTimer = 0;
let grayscaleAmount = 0;
let coinAttractionRadius = defaultCoinAttractionRadius;
let playerHitboxScale = defaultPlayerHitboxScale;
const touchPointerIds = new Set();
let shopTilePlat = null;
let shopTileRef = null;
let shopUsed = false;
let isLevelComplete = false;
let hp = maxHp;
let coins = 0;
let damageCooldown = 0;
let acidStompImmunity = 0;
let acidBurnCooldown = 0;
let damageFlashTimer = 0;
let reloadFlashTimer = 0;
let pendingInvulnerability = false;
let pendingShield = false;
let invulnerabilityTimer = 0;
let hasShield = false;
let rewardChosen = false;
let maxAmmo = defaultMaxAmmo;
let fireInterval = defaultFireInterval;
let shotgunFireInterval = defaultShotgunFireInterval;
let shotgunSpreadAngle = defaultShotgunSpreadAngle;
let bulletImpulse = defaultBulletImpulse;
let ammo = maxAmmo;
let isShooting = false;
let fireCooldown = 0;
let combo = 0;
let comboSprite = null;
let comboTexture = null;
let comboMaterial = null;
let selectedWeapon = 'machinegun';
let nextShotId = 1;
let scaledTime = 0;
let piercingBulletsUnlocked = false;
let vampiricLifeUnlocked = false;
let comboShieldUnlocked = false;
let vampiricKillCount = 0;
let comboShieldAwardedThisCombo = false;
const platforms = [];
const bullets = [];
const enemies = [];
const particles = [];
const floatingTexts = [];
const crates = [];
const goldBlocks = [];
const coinPickups = [];
const cannons = [];
const shockwaves = [];
const pillarLaserRings = [];
const bounceCubes = [];
const pillarSpikes = [];
const spikeTraps = [];
const sawBlades = [];
const floaters = [];
const acidPuddles = [];
let nextBounceCubeOrder = 1;
let spikePlatformsThisLevel = 0;
let groundWormsSinceTurtle = 0;
let acidSnailsThisLevel = 0;

let shakeIntensity = 0;
let shakeDecay = 0;
const shakeOffset = new THREE.Vector3();

const cameraBasePos = new THREE.Vector3();

const {
  floaterDiscGeometry, floaterMaterial, pillarGeometry, pillarMaterial,
  ballGeometry, ballMaterial, bulletGeometry, bulletMaterial, batBodyGeometry,
  batWingGeometry, spikeBodyGeometry, spikeConeGeometry, particleGeometry,
  bounceCubeGeometry, crateGeometry, goldBlockGeometry, ledgeGeometry,
  pillarSpikeGeometry, wormHeadGeometry, wormSegmentGeometry, turtleBodyGeometry,
  turtleShellGeometry, turtleSpikeGeometry, jellyfishBodyGeometry,
  jellyfishTentacleGeometry, pufferBodyGeometry, mushroomStemGeometry,
  mushroomCapGeometry, mushroomSpotGeometry, porcupineBodyGeometry,
  acidPuddleGeometry, acidDropletGeometry, acidSnailBodyGeometry,
  acidSnailShellGeometry, shockwaveGeometry, pillarLaserRingGeometry,
  coinPickupGeometry, coinPickupMaterial, shieldGeometry, cannonBaseGeometry,
  cannonMouthGeometry, cannonRingGeometry, cannonLaserGeometry, sawBladeGeometry,
  batBodyMaterial, batWingMaterial, spikeMaterial, crateMaterial, goldBlockMaterial,
  ledgeMaterial, spikeHoleGeometry, platformSpikeGeometry, spikeHoleMaterial,
  platformSpikeMaterial, pillarSpikeMaterial, wormMaterial, wormHeadMaterial,
  yellowWormMaterial, yellowWormHeadMaterial, turtleBodyMaterial, turtleShellMaterial,
  jellyfishMaterial, pufferMaterial, mushroomStemMaterial, mushroomCapMaterial,
  mushroomSpotMaterial, porcupineMaterial, porcupineSpikeMaterial, acidPuddleMaterial,
  acidSnailBodyMaterial, acidSnailShellMaterial, acidSnailCrackedShellMaterial,
  shockwaveMaterial, pillarLaserRingMaterial, cannonMaterial, cannonWarningMaterial,
  laserMaterial, shieldMaterial, sawBladeMaterial,
} = createGameAssets({
  colors,
  ballRadius,
  pillarRadius,
  twoPi,
  gameplayLaneRadius,
  goldBlockSize,
  ledgeRadialLength,
  platformSpikeHeight,
  sawBladeOuterRadius,
  sawBladeInnerRadius,
});

const enemyMeshes = createEnemyMeshFactory({
  assets: {
    batBodyGeometry,
    batWingGeometry,
    spikeBodyGeometry,
    spikeConeGeometry,
    wormHeadGeometry,
    wormSegmentGeometry,
    turtleBodyGeometry,
    turtleShellGeometry,
    turtleSpikeGeometry,
    jellyfishBodyGeometry,
    jellyfishTentacleGeometry,
    pufferBodyGeometry,
    mushroomStemGeometry,
    mushroomCapGeometry,
    mushroomSpotGeometry,
    porcupineBodyGeometry,
    acidSnailBodyGeometry,
    acidSnailShellGeometry,
    batBodyMaterial,
    batWingMaterial,
    spikeMaterial,
    wormMaterial,
    wormHeadMaterial,
    turtleBodyMaterial,
    turtleShellMaterial,
    jellyfishMaterial,
    pufferMaterial,
    mushroomStemMaterial,
    mushroomCapMaterial,
    mushroomSpotMaterial,
    porcupineMaterial,
    porcupineSpikeMaterial,
    acidSnailBodyMaterial,
    acidSnailShellMaterial,
  },
  twoPi,
});

const {
  createBatMesh,
  createSpikedBallMesh,
  createWormMesh,
  createTurtleMesh,
  createJellyfishMesh,
  createPufferBombMesh,
  createExplosiveMushroomMesh,
  createPorcupineMesh,
  createAcidSnailMesh,
} = enemyMeshes;

const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
pillar.position.y = -30;
pillar.receiveShadow = true;
world.add(pillar);

const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.position.set(0, ballStartY, platformOuterRadius - 0.8);
ball.castShadow = true;
scene.add(ball);

const shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
shieldMesh.visible = false;
scene.add(shieldMesh);

let ammoSegments = [];

scene.add(new THREE.HemisphereLight(0xffffff, 0x90a4ae, 2.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.35);
sun.position.set(4, 7, 6);
sun.castShadow = true;
scene.add(sun);

const drag = {
  active: false,
  x: 0,
  targetRotation: 0,
};

function getBulletLaneAngle() {
  return Math.atan2(ball.position.z, ball.position.x);
}

function getBulletLaneRadius() {
  return Math.hypot(ball.position.x, ball.position.z);
}

function createPlatform(y, id, options = {}) {
  platformSystem.createPlatform(y, id, options);
}

function createCrate(platformGroup, angle, radius) {
  crateSystem.createCrate(platformGroup, angle, radius);
}

function createGoldBlock(platformData, tile) {
  return goldBlockSystem.createGoldBlock(platformData, tile);
}

function isGoldBlockPositionClear(platformData, localPosition) {
  return goldBlockSystem.isGoldBlockPositionClear(platformData, localPosition);
}

function spawnGoldBlocksForLevel() {
  goldBlockSystem.spawnGoldBlocksForLevel();
}

function createPillarSpike(y, angle) {
  obstacleSystem.createPillarSpike(y, angle);
}

function spawnPillarSpikesForLevel() {
  obstacleSystem.spawnPillarSpikesForLevel();
}

function createFloater(y, angle) {
  obstacleSystem.createFloater(y, angle);
}

function spawnFloatersForLevel() {
  obstacleSystem.spawnFloatersForLevel();
}

function spawnAcidPuddle(platformData, angle, radius, isDeath) {
  const size = isDeath ? 0.44 : 0.22;
  const geometry = new THREE.CircleGeometry(size, 20);
  const material = acidPuddleMaterial.clone();
  material.opacity = 0.85;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(
    Math.cos(angle) * radius,
    platformThickness / 2 + 0.005,
    Math.sin(angle) * radius
  );
  platformData.group.add(mesh);
  acidPuddles.push({
    mesh,
    material,
    platformData,
    angle,
    radius,
    age: 0,
    fullLife: isDeath ? 3 : 2,
    shrinkLife: 1,
    isDeath,
    baseSize: size,
    colliderPosition: new THREE.Vector3(),
    falling: false,
    fallVelocity: 0,
    isDroplet: false,
  });
}

function updateFloaters(dt) {
  obstacleSystem.updateFloaters(dt);
}

function updateAcidPuddles(dt) {
  const damageRadius = getPlayerHitboxRadius() + 0.22;
  const damageRadiusSq = damageRadius * damageRadius;

  for (let i = acidPuddles.length - 1; i >= 0; i -= 1) {
    const puddle = acidPuddles[i];

    if (!puddle.falling) {
      if (!puddle.emitTimer) puddle.emitTimer = 0;
      puddle.emitTimer += dt;
      if (puddle.emitTimer >= 0.05) {
        puddle.emitTimer = 0;
        const worldPos = new THREE.Vector3();
        puddle.mesh.getWorldPosition(worldPos);
        for (let j = 0; j < 2; j += 1) {
          const material = new THREE.MeshBasicMaterial({ color: colors.acid, transparent: true, opacity: 1 });
          const mesh = new THREE.Mesh(particleGeometry, material);
          mesh.position.set(
            worldPos.x + (Math.random() - 0.5) * 0.15,
            worldPos.y + 0.01,
            worldPos.z + (Math.random() - 0.5) * 0.15
          );
          scene.add(mesh);
          particles.push({
            mesh,
            material,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.8 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3),
            life: 0.4 + Math.random() * 0.3,
          });
        }
      }
    }

    if (puddle.falling) {
      const previousY = puddle.mesh.position.y;
      puddle.fallVelocity -= 14 * dt;
      puddle.mesh.position.y += puddle.fallVelocity * dt;

      const dropletRadiusSq = 0.1 * 0.1;
      for (let e = enemies.length - 1; e >= 0; e -= 1) {
        const enemy = enemies[e];
        const enemyPos = getEnemyWorldPosition(enemy);
        const dx = puddle.mesh.position.x - enemyPos.x;
        const dy = puddle.mesh.position.y - enemyPos.y;
        const dz = puddle.mesh.position.z - enemyPos.z;
        if (dx * dx + dy * dy + dz * dz <= dropletRadiusSq + enemy.collisionRadius * enemy.collisionRadius) {
          if (enemy.type === 'bat' || enemy.type === 'jellyfish') {
            removeEnemyAt(e, colors.acid);
          } else if (enemy.type !== 'acidSnail') {
            damageEnemy(e);
          }
        }
      }

      const currentY = puddle.mesh.position.y;
      for (const platform of platforms) {
        const platformTop = platformY(platform) + platformThickness / 2;
        if (previousY >= platformTop && currentY <= platformTop && puddle.fallVelocity < 0) {
          const localPos = new THREE.Vector3(puddle.mesh.position.x, platformTop, puddle.mesh.position.z);
          platform.group.worldToLocal(localPos);
          const r = Math.hypot(localPos.x, localPos.z);
          const a = (Math.atan2(localPos.z, localPos.x) + twoPi) % twoPi;
          const tile = platform.tiles.find(t => !t.broken && angleInArc(a, t.start, t.end));
          if (tile && r >= platformInnerRadius && r <= platformOuterRadius) {
            puddle.mesh.removeFromParent();
            puddle.mesh.geometry.dispose();
            const size = puddle.isDeath ? 0.44 : 0.22;
            const geometry = new THREE.CircleGeometry(size, 20);
            const material = acidPuddleMaterial.clone();
            material.opacity = 0.85;
            const newMesh = new THREE.Mesh(geometry, material);
            newMesh.rotation.x = -Math.PI / 2;
            newMesh.position.set(localPos.x, platformThickness / 2 + 0.005, localPos.z);
            platform.group.add(newMesh);
            puddle.mesh = newMesh;
            puddle.material = material;
            puddle.platformData = platform;
            puddle.angle = a;
            puddle.radius = r;
            puddle.age = 0;
            puddle.falling = false;
            puddle.fallVelocity = 0;
            puddle.isDroplet = false;
            puddle.baseSize = size;
            break;
          }
        }
      }
      continue;
    }

    puddle.age += dt;
    const totalLife = puddle.fullLife + puddle.shrinkLife;

    if (puddle.age > puddle.fullLife) {
      const shrinkT = (puddle.age - puddle.fullLife) / puddle.shrinkLife;
      const scale = Math.max(0, 1 - shrinkT);
      puddle.mesh.scale.setScalar(scale);
      puddle.material.opacity = 0.85 * scale;
    }

    if (puddle.age >= totalLife) {
      puddle.mesh.removeFromParent();
      puddle.mesh.geometry.dispose();
      puddle.material.dispose();
      acidPuddles.splice(i, 1);
      continue;
    }

    puddle.colliderPosition.set(
      Math.cos(puddle.angle) * puddle.radius,
      platformThickness / 2 + 0.02,
      Math.sin(puddle.angle) * puddle.radius
    );
    puddle.platformData.group.localToWorld(puddle.colliderPosition);

    if (acidStompImmunity <= 0 && acidBurnCooldown <= 0 && ball.position.distanceToSquared(puddle.colliderPosition) <= damageRadiusSq) {
      applyDamage();
      playAcidBurnSound();
      acidBurnCooldown = 0.5;
    }
  }
}

function detachAcidPuddlesFromTile(platform, tile) {
  for (const puddle of acidPuddles) {
    if (puddle.falling || puddle.platformData !== platform) continue;
    const angle = (puddle.angle + twoPi) % twoPi;
    if (angleInArc(angle, tile.start, tile.end)) {
      const worldPos = new THREE.Vector3();
      puddle.mesh.getWorldPosition(worldPos);
      puddle.mesh.removeFromParent();
      puddle.mesh.geometry.dispose();
      const dropletMaterial = acidPuddleMaterial.clone();
      dropletMaterial.opacity = 0.9;
      const dropletMesh = new THREE.Mesh(acidDropletGeometry, dropletMaterial);
      dropletMesh.position.copy(worldPos);
      scene.add(dropletMesh);
      puddle.mesh = dropletMesh;
      puddle.material = dropletMaterial;
      puddle.falling = true;
      puddle.fallVelocity = 0;
      puddle.isDroplet = true;
      puddle.platformData = null;
    }
  }
}

function clearAcidPuddles() {
  while (acidPuddles.length) {
    const puddle = acidPuddles.pop();
    puddle.mesh.removeFromParent();
    puddle.mesh.geometry.dispose();
    puddle.material.dispose();
  }
}

function createAcidSnail(platformData, id, tile) {
  enemySpawnSystem.createAcidSnail(platformData, id, tile);
}

function createCannonMesh() {
  return obstacleSystem.createCannonMesh();
}

function maybeSpawnCannon(platformData, id) {
  obstacleSystem.maybeSpawnCannon(platformData, id);
}

function positionEnemy(enemy) {
  enemyUpdateSystem.positionEnemy(enemy);
}

function getEnemyWorldPosition(enemy, target = _enemyWorldPosition) {
  if (enemy.type === 'pillarWorm') return enemy.collisionPosition;
  enemy.group.getWorldPosition(target);
  return target;
}

function createBat(y, id) {
  enemySpawnSystem.createBat(y, id);
}

function createSpikedBall(y, id) {
  enemySpawnSystem.createSpikedBall(y, id);
}

function detachGroundEnemiesFromTile(platform, tile) {
  enemyUpdateSystem.detachGroundEnemiesFromTile(platform, tile);
}

function createWorm(platformData, id, tile) {
  enemySpawnSystem.createWorm(platformData, id, tile);
}

function createYellowWorm(platformData, id, tile) {
  enemySpawnSystem.createYellowWorm(platformData, id, tile);
}

function createMiniYellowWorm(platformData, id, localAngle, direction) {
  enemySpawnSystem.createMiniYellowWorm(platformData, id, localAngle, direction);
}

function splitYellowWorm(enemy) {
  enemyCombatSystem.splitYellowWorm(enemy);
}

function createPillarWorm(y, id) {
  enemySpawnSystem.createPillarWorm(y, id);
}

function createFloatingEnemy(type, y, id) {
  return enemySpawnSystem.createFloatingEnemy(type, y, id);
}

function createFloatingEnemyWithOptions(type, y, id, options = {}) {
  return enemySpawnSystem.createFloatingEnemyWithOptions(type, y, id, options);
}

function splitJellyfish(enemy, position) {
  enemyCombatSystem.splitJellyfish(enemy, position);
}

function createExplosiveMushroom(platformData, id, tile) {
  enemySpawnSystem.createExplosiveMushroom(platformData, id, tile);
}

function createTurtle(platformData, id, tile) {
  enemySpawnSystem.createTurtle(platformData, id, tile);
}

function createPorcupine(platformData, id, tile) {
  enemySpawnSystem.createPorcupine(platformData, id, tile);
}

function createSawBlade(y, angle, speedOffset = 0) {
  obstacleSystem.createSawBlade(y, angle, speedOffset);
}

function positionSawBlade(sawBlade) {
  obstacleSystem.positionSawBlade(sawBlade);
}

function spawnSawBladesForLevel() {
  obstacleSystem.spawnSawBladesForLevel(sawBladesPerLevel);
}

function createPillarLaserRing(y) {
  obstacleSystem.createPillarLaserRing(y);
}

function spawnPillarLaserRingsForLevel() {
  obstacleSystem.spawnPillarLaserRingsForLevel();
}

function maybeSpawnWorms(platformData, id) {
  enemySpawnSystem.maybeSpawnWorms(platformData, id);
}

function ensureInitialLowerPlatformYellowWorm() {
  enemySpawnSystem.ensureInitialLowerPlatformYellowWorm();
}

function ensureInitialLowerPlatformMushroom() {
  enemySpawnSystem.ensureInitialLowerPlatformMushroom();
}

function maybeSpawnEnemiesForSection(platformData, id) {
  enemySpawnSystem.maybeSpawnEnemiesForSection(platformData, id);
}

function rebuildAmmoUI() {
  ammoSegments = rebuildAmmoSegments(ammoMagazineEl, maxAmmo);
  updateAmmoUI();
}

function updateAmmoUI() {
  updateAmmoSegments(ammoSegments, ammo);
}

function updateWeaponUI() {
  updateWeaponLabel(weaponIndicatorEl, selectedWeapon);
}

function selectWeapon(weapon) {
  selectedWeapon = weapon;
  updateWeaponUI();
  if (isShooting) fireCooldown = Math.min(fireCooldown, getCurrentFireInterval());
}

function showReloadText() {
  weaponIndicatorEl.textContent = 'Reload';
  setTimeout(() => updateWeaponUI(), 600);
}

function reloadAmmo() {
  return shooting.reloadAmmo();
}

function updateComboSprite() {
  if (combo <= 0) {
    if (comboSprite) {
      comboSprite.removeFromParent();
      comboTexture.dispose();
      comboMaterial.dispose();
      comboSprite = null;
      comboTexture = null;
      comboMaterial = null;
    }
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = '900 64px Inter, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 8;
  context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  context.strokeText(String(combo), canvas.width / 2, canvas.height / 2);
  context.fillStyle = '#ffc107';
  context.fillText(String(combo), canvas.width / 2, canvas.height / 2);
  if (comboTexture) comboTexture.dispose();
  if (comboMaterial) comboMaterial.dispose();
  if (comboSprite) comboSprite.removeFromParent();
  comboTexture = new THREE.CanvasTexture(canvas);
  comboMaterial = new THREE.SpriteMaterial({ map: comboTexture, transparent: true, depthTest: false });
  comboSprite = new THREE.Sprite(comboMaterial);
  comboSprite.position.copy(ball.position);
  comboSprite.position.y += ballRadius + 0.28;
  comboSprite.scale.set(1.35, 0.68, 1);
  comboSprite.renderOrder = 20;
  scene.add(comboSprite);
}

function increaseCombo() {
  combo += 1;
  updateComboSprite();
  if (comboShieldUnlocked && combo >= comboShieldThreshold && !comboShieldAwardedThisCombo) {
    comboShieldAwardedThisCombo = true;
    if (!hasShield) {
      hasShield = true;
      shieldMesh.visible = true;
      spawnFloatingText('COMBO SHIELD', ball.position, 0x80deea, true);
    }
  }
}

function resetCombo(showLoss = true) {
  if (combo <= 0) return;
  combo = 0;
  comboShieldAwardedThisCombo = false;
  updateComboSprite();
  updateComboSprite();
  if (showLoss) {
    spawnFloatingText('Combo Loss', ball.position, 0xff7043, true);
  }
}

function setShootingImpulse(value) {
  bulletImpulse = parseClampedFloat(value, 0, 12, defaultBulletImpulse);
  impulseInput.value = bulletImpulse.toFixed(1);
}

function setGravity(value) {
  gravity = parseClampedFloat(value, -40, 0, defaultGravity);
  gravityInput.value = gravity.toFixed(1);
}

function setTerminalVelocity(value) {
  terminalVelocity = parseClampedAbsFloat(value, 1, 80, defaultTerminalVelocity);
  terminalVelocityInput.value = terminalVelocity.toFixed(1);
}

function setStompImpulse(value) {
  stompImpulse = parseClampedFloat(value, 0, 20, defaultStompImpulse);
  stompImpulseInput.value = stompImpulse.toFixed(1);
}

function getPlayerHitboxRadius() {
  return ballRadius * playerHitboxScale;
}

function setPlayerHitboxScale(value) {
  playerHitboxScale = parseClampedFloat(value, 0.1, 1, defaultPlayerHitboxScale);
  hitboxScaleInput.value = playerHitboxScale.toFixed(2);
}

function setCannonChargeTime(value) {
  cannonChargeTime = parseClampedFloat(value, 0.5, 10, defaultCannonChargeTime);
  cannonChargeInput.value = cannonChargeTime.toFixed(1);
}

function setCannonCooldown(value) {
  cannonCooldown = parseClampedFloat(value, 0, 20, defaultCannonCooldown);
  cannonCooldownInput.value = cannonCooldown.toFixed(1);
}

function setLaserRingOnTime(value) {
  laserRingOnTime = parseClampedFloat(value, 0.2, 10, defaultLaserRingOnTime);
  laserOnInput.value = laserRingOnTime.toFixed(1);
}

function setLaserRingOffTime(value) {
  laserRingOffTime = parseClampedFloat(value, 0.2, 10, defaultLaserRingOffTime);
  laserOffInput.value = laserRingOffTime.toFixed(1);
}

function setCoinAttractionRadius(value) {
  coinAttractionRadius = parseClampedFloat(value, 0.1, 5, defaultCoinAttractionRadius);
  coinAttractionInput.value = coinAttractionRadius.toFixed(2);
}

function setShotgunSpreadAngle(value) {
  shotgunSpreadAngle = parseClampedFloat(value, 0, 25, defaultShotgunSpreadAngle);
  shotgunSpreadInput.value = shotgunSpreadAngle.toFixed(1);
}

function setShotgunFireInterval(value) {
  shotgunFireInterval = parseClampedFloat(value, 0.1, 3, defaultShotgunFireInterval);
  shotgunIntervalInput.value = shotgunFireInterval.toFixed(2);
  if (isShooting && selectedWeapon === 'shotgun') fireCooldown = Math.min(fireCooldown, shotgunFireInterval);
}

function getShotUpwardVelocityCap() {
  return shooting.shotUpwardVelocityCap();
}

function syncOptionsPanel() {
  impulseInput.value = bulletImpulse.toFixed(1);
  fireIntervalInput.value = fireInterval.toFixed(2);
  shotgunSpreadInput.value = shotgunSpreadAngle.toFixed(1);
  shotgunIntervalInput.value = shotgunFireInterval.toFixed(2);
  maxAmmoInput.value = String(maxAmmo);
  gravityInput.value = gravity.toFixed(1);
  terminalVelocityInput.value = terminalVelocity.toFixed(1);
  stompImpulseInput.value = stompImpulse.toFixed(1);
  hitboxScaleInput.value = playerHitboxScale.toFixed(2);
  cannonChargeInput.value = cannonChargeTime.toFixed(1);
  cannonCooldownInput.value = cannonCooldown.toFixed(1);
  laserOnInput.value = laserRingOnTime.toFixed(1);
  laserOffInput.value = laserRingOffTime.toFixed(1);
  coinAttractionInput.value = coinAttractionRadius.toFixed(2);
  impulseBResetInput.value = impulseBResetSpeed.toFixed(1);
  impulseBShotgunInput.value = impulseBShotgunImpulse.toFixed(1);
  impulseCFactorInput.value = impulseCfactor.toFixed(2);
  impulseBResetLabel.hidden = impulseMode !== 'B';
  impulseBShotgunLabel.hidden = impulseMode !== 'B';
  impulseCFactorLabel.hidden = impulseMode !== 'C';
  impulseAButton.classList.toggle('active', impulseMode === 'A');
  impulseBButton.classList.toggle('active', impulseMode === 'B');
  impulseCButton.classList.toggle('active', impulseMode === 'C');
  twistBOffButton.classList.toggle('active', !twistBMode);
  twistBOnButton.classList.toggle('active', twistBMode);
  flyingModeBOffButton.classList.toggle('active', !flyingModeB);
  flyingModeBOnButton.classList.toggle('active', flyingModeB);
}

function getLevelTarget(level = currentLevel) {
  return getTargetForLevel(level);
}

function getLevelInfo() {
  return makeLevelInfo(currentLevel, platformsPassedThisLevel);
}

function updateLevelUI() {
  const levelInfo = getLevelInfo();
  levelLabelEl.textContent = `Level ${levelInfo.level}`;
  progressLabelEl.textContent = `${platformsPassedThisLevel} / ${levelInfo.target}`;
  progressFillEl.style.width = `${levelInfo.progress * 100}%`;
}

function worldToScreen(position) {
  const projected = position.clone().project(camera);
  return {
    x: (projected.x * 0.5 + 0.5) * window.innerWidth,
    y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
  };
}

function spawnCoinPickupAnimation(worldPosition, value = 5) {
  coinPickupSystem.spawnCoinPickupAnimation(worldPosition, value);
}

function updatePersistentUI() {
  updateHeartsUI(heartsEl, hp, maxHp);
  updateCoinsUI(coinsEl, coins);
  updateLevelUI();
}

function setPaused(paused) {
  isPaused = paused;
  pausePanelEl.hidden = !paused;
  extraPanelEl.hidden = true;
  if (paused) {
    drag.active = false;
    stopShooting();
    stopInvulnerabilityMusic();
    syncOptionsPanel();
  } else if (invulnerabilityTimer > 0) {
    startInvulnerabilityMusic();
  }
}

const shooting = createShootingSystem({
  scene,
  ball,
  ballRadius,
  bullets,
  bulletGeometry,
  bulletMaterial,
  bulletLifetime,
  bulletSpeed,
  baseShotUpwardVelocityCap,
  getAmmo: () => ammo,
  setAmmo: value => { ammo = value; },
  getMaxAmmo: () => maxAmmo,
  getIsShooting: () => isShooting,
  setIsShooting: value => { isShooting = value; },
  getFireCooldown: () => fireCooldown,
  setFireCooldown: value => { fireCooldown = value; },
  getSelectedWeapon: () => selectedWeapon,
  getFireInterval: () => fireInterval,
  getShotgunFireInterval: () => shotgunFireInterval,
  getShotgunSpreadAngle: () => shotgunSpreadAngle,
  getBulletImpulse: () => bulletImpulse,
  getBallVelocity: () => ballVelocity,
  setBallVelocity: value => { ballVelocity = value; },
  getImpulseMode: () => impulseMode,
  getImpulseBResetSpeed: () => impulseBResetSpeed,
  getImpulseBShotgunImpulse: () => impulseBShotgunImpulse,
  getImpulseCFactor: () => impulseCfactor,
  getNextShotId: () => nextShotId,
  setNextShotId: value => { nextShotId = value; },
  setReloadFlashTimer: value => { reloadFlashTimer = value; },
  updateAmmoUI,
  showReloadText,
  playEmptyAmmoSound,
  playShootSound,
  isGameOver: () => isGameOver,
  isPaused: () => isPaused,
  isSteamDeckModeActive: () => steamDeckMode.isActive(),
  isPiercingBulletsUnlocked: () => piercingBulletsUnlocked,
  checkBulletEnemyHit,
  checkBulletCrateHit,
  checkBulletGoldBlockHit,
  checkBulletCannonHit,
  checkBulletPlatformHit,
});

function stopShooting() {
  shooting.stop();
}

function clearBullets() {
  shooting.clearBullets();
}

function getCurrentFireInterval() {
  return shooting.currentFireInterval();
}

function startShooting(source = 'default') {
  shooting.start(source);
}

function updateShooting(dt) {
  shooting.updateShooting(dt);
}

function updateBullets(dt) {
  shooting.updateBullets(dt);
}

function disposeEnemy(enemy) {
  enemyCombatSystem.disposeEnemy(enemy);
}

function spawnExplosion(position, color, count = 12) {
  spawnExplosionParticles({ scene, particles, particleGeometry, position, color, count });
}

function spawnBulletImpact(position) {
  spawnBulletImpactParticles({ scene, particles, particleGeometry, position, color: colors.bullet });
}

const platformSystem = createPlatformSystem({
  world,
  platforms,
  spikeTraps,
  spikeHoleGeometry,
  spikeHoleMaterial,
  platformSpikeGeometry,
  platformSpikeMaterial,
  getLevelTarget,
  getSpikePlatformsThisLevel: () => spikePlatformsThisLevel,
  setSpikePlatformsThisLevel: value => { spikePlatformsThisLevel = value; },
  getShopTilePlat: () => shopTilePlat,
  setShopTilePlat: value => { shopTilePlat = value; },
  setShopTileRef: value => { shopTileRef = value; },
  createCrate,
  maybeSpawnEnemiesForSection,
  maybeSpawnCannon,
});

const enemySpawnSystem = createEnemySpawnSystem({
  scene,
  world,
  enemies,
  platforms,
  meshFactory: enemyMeshes,
  yellowWormMaterial,
  yellowWormHeadMaterial,
  gameplayLaneRadius,
  pillarRadius,
  platformThickness,
  platformSpacing,
  twoPi,
  getBulletLaneAngle,
  getTwistBMode: () => twistBMode,
  getGroundWormsSinceTurtle: () => groundWormsSinceTurtle,
  setGroundWormsSinceTurtle: value => { groundWormsSinceTurtle = value; },
  getAcidSnailsThisLevel: () => acidSnailsThisLevel,
  setAcidSnailsThisLevel: value => { acidSnailsThisLevel = value; },
  positionEnemy,
});

const enemyUpdateSystem = createEnemyUpdateSystem({
  world,
  ball,
  enemies,
  platforms,
  acidSnailCrackedShellMaterial,
  gameplayLaneRadius,
  platformThickness,
  groundEnemyFootOffset,
  twoPi,
  getScaledTime: () => scaledTime,
  getFlyingModeB: () => flyingModeB,
  getBallVelocity: () => ballVelocity,
  setBallVelocity: value => { ballVelocity = value; },
  getStompImpulse: () => stompImpulse,
  setAcidStompImmunity: value => { acidStompImmunity = value; },
  getBallEnemyContact,
  applyDamage,
  killEnemyAt,
  reloadAmmo,
  spawnFloatingText,
  playReloadSound,
  spawnAcidPuddle,
  disposeEnemy,
});

const enemyCombatSystem = createEnemyCombatSystem({
  ball,
  enemies,
  getScore: () => score,
  setScore: value => { score = value; },
  getCombo: () => combo,
  getHp: () => hp,
  setHp: value => { hp = value; },
  maxHp,
  getVampiricLifeUnlocked: () => vampiricLifeUnlocked,
  getVampiricKillCount: () => vampiricKillCount,
  setVampiricKillCount: value => { vampiricKillCount = value; },
  scoreEl,
  heartsEl,
  updateHeartsUI,
  getEnemyWorldPosition,
  getWorldRotation: () => world.rotation.y,
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
});

const obstacleSystem = createObstacleSystem({
  world,
  ball,
  cannons,
  platforms,
  pillarSpikes,
  floaters,
  sawBlades,
  pillarLaserRings,
  spikeTraps,
  assets: {
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
  },
  constants: {
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
  },
  getLevelTarget,
  getCurrentLevel: () => currentLevel,
  getBulletLaneAngle,
  getWorldRotation: () => world.rotation.y,
  getBallVelocity: () => ballVelocity,
  setBallVelocity: value => { ballVelocity = value; },
  getStompImpulse: () => stompImpulse,
  getCannonChargeTime: () => cannonChargeTime,
  getCannonCooldown: () => cannonCooldown,
  getLaserRingOnTime: () => laserRingOnTime,
  getLaserRingOffTime: () => laserRingOffTime,
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
});

const coinPickupSystem = createCoinPickupSystem({
  camera,
  ball,
  ballRadius,
  coinsEl,
  coinPickups,
  coinPickupGeometry,
  coinPickupMaterial,
  platformThickness,
  getCoins: () => coins,
  setCoins: value => { coins = value; },
  updateCoinsUI,
});

const bounceCubeSystem = createBounceCubeSystem({
  scene,
  world,
  ball,
  ballRadius,
  platforms,
  bounceCubes,
  bounceCubeGeometry,
  bounceCubePoolSize,
  gameplayLaneRadius,
  platformThickness,
  platformInnerRadius,
  platformOuterRadius,
  twoPi,
  getCoinAttractionRadius: () => coinAttractionRadius,
  getTileAtWorldPoint,
  collectBounceCube,
});

const crateSystem = createCrateSystem({
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
  getCoins: () => coins,
  setCoins: value => { coins = value; },
  updateCoinsUI,
  coinsEl,
  spawnExplosion,
  spawnCoinPickup,
  spawnCoinPickupAnimation,
});

const goldBlockSystem = createGoldBlockSystem({
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
  getBallVelocity: () => ballVelocity,
  setBallVelocity: value => { ballVelocity = value; },
  getStompImpulse: () => stompImpulse,
  getCannons: () => cannons,
  getEnemies: () => enemies,
  getCannonWorldPosition,
  getEnemyWorldPosition,
  reloadAmmo,
  spawnFloatingText,
  playReloadSound,
  playBounceSound,
  spawnExplosion,
  spawnBulletImpact,
  spawnBounceCubes,
});

function ensureBounceCubePool() {
  bounceCubeSystem.ensureBounceCubePool();
}

function getPooledBounceCube() {
  return bounceCubeSystem.getPooledBounceCube();
}

function spawnBounceCubes(position, count = 3, color = 0xffc107, value = 1) {
  bounceCubeSystem.spawnBounceCubes(position, count, color, value);
}

function resetBounceCube(cube, position, color = 0xffc107, value = 1) {
  bounceCubeSystem.resetBounceCube(cube, position, color, value);
}

function updateBounceCubes(dt) {
  bounceCubeSystem.updateBounceCubes(dt);
}

function collectBounceCube(cube, worldPos) {
  if (!cube.active || cube.collected) return;

  cube.collected = true;
  coins += cube.value;
  score += 1;
  scoreEl.textContent = String(score);
  updateCoinsUI(coinsEl, coins);
  spawnCoinPickupAnimation(worldPos, cube.value);
  playCoinCubeCollectSound();
  deactivateBounceCube(cube);
}

function getBounceCubeWorldPosition(cube) {
  return bounceCubeSystem.getBounceCubeWorldPosition(cube);
}

function detachBounceCubeToScene(cube, worldPos = getBounceCubeWorldPosition(cube)) {
  bounceCubeSystem.detachBounceCubeToScene(cube, worldPos);
}

function deactivateBounceCube(cube) {
  bounceCubeSystem.deactivateBounceCube(cube);
}

function deactivateAllBounceCubes() {
  bounceCubeSystem.deactivateAllBounceCubes();
}

function detachBounceCubesFromPlatform(platform) {
  bounceCubeSystem.detachBounceCubesFromPlatform(platform);
}

function detachBounceCubesFromTile(platform, tile) {
  bounceCubeSystem.detachBounceCubesFromTile(platform, tile);
}

function detachCratesAndGoldFromTile(platform, tile) {
  crateSystem.detachCratesFromTile(platform, tile);
  goldBlockSystem.detachGoldBlocksFromTile(platform, tile);
}

function breakCrate(crateIndex, byBullet = false) {
  return crateSystem.breakCrate(crateIndex, byBullet);
}

function spawnCoinPickup(worldPos, platformGroup) {
  coinPickupSystem.spawnCoinPickup(worldPos, platformGroup);
}

function updateCoinPickups(dt) {
  coinPickupSystem.updateCoinPickups(dt);
}

function clearCoinPickups() {
  coinPickupSystem.clearCoinPickups();
}

function breakGrayTile(platform, tile) {
  if (tile.broken) return;

  const centerAngle = (tile.start + tile.end) / 2;
  const centerRadius = (platformInnerRadius + platformOuterRadius) / 2;
  const breakPosition = new THREE.Vector3(
    Math.cos(centerAngle) * centerRadius,
    platformThickness / 2 + 0.05,
    Math.sin(centerAngle) * centerRadius
  );
  platform.group.localToWorld(breakPosition);

  detachBounceCubesFromTile(platform, tile);
  detachGroundEnemiesFromTile(platform, tile);
  detachAcidPuddlesFromTile(platform, tile);
  detachCratesAndGoldFromTile(platform, tile);
  tile.broken = true;
  disposeTile(tile);
  playGlassBreakSound();
  spawnExplosion(breakPosition, colors.grayParticle, 18);
}

function damageGrayTile(platform, tile) {
  if (tile.broken || tile.type !== 'gray') return false;

  tile.hitCount += 1;
  tile.flashTimer = 0.18;
  if (tile.hitCount >= grayTileHitsToBreak) {
    breakGrayTile(platform, tile);
  } else {
    setGrayTileCrackStage(platform, tile, tile.hitCount);
  }
  return true;
}

function breakCrackedTile(platform, tile) {
  if (tile.broken) return;

  const centerAngle = (tile.start + tile.end) / 2;
  const centerRadius = (platformInnerRadius + platformOuterRadius) / 2;
  const breakPosition = new THREE.Vector3(
    Math.cos(centerAngle) * centerRadius,
    platformThickness / 2 + 0.05,
    Math.sin(centerAngle) * centerRadius
  );
  platform.group.localToWorld(breakPosition);

  detachBounceCubesFromTile(platform, tile);
  detachGroundEnemiesFromTile(platform, tile);
  detachAcidPuddlesFromTile(platform, tile);
  detachCratesAndGoldFromTile(platform, tile);
  tile.broken = true;
  disposeTile(tile);
  playGlassBreakSound();
  spawnExplosion(breakPosition, colors.blueParticle, 18);
}

function removeEnemyAt(index, explosionColor) {
  enemyCombatSystem.removeEnemyAt(index, explosionColor);
}

function killEnemyAt(index, explosionColor) {
  enemyCombatSystem.killEnemyAt(index, explosionColor);
}

function damageEnemy(enemyIndex) {
  enemyCombatSystem.damageEnemy(enemyIndex);
}

function explodePuffer(position) {
  playPufferExplosionSound();
  const material = shockwaveMaterial.clone();
  const mesh = new THREE.Mesh(shockwaveGeometry, material);
  mesh.position.copy(position);
  mesh.scale.setScalar(0.1);
  scene.add(mesh);
  shockwaves.push({ mesh, material, position: position.clone(), radius: 0.1, maxRadius: 2.2, life: 0.55, maxLife: 0.55, damagedEnemies: new Set(), damagedPlayer: false });
}

function getBallColliderPositions() {
  const offset = getPlayerHitboxRadius();
  const sideOffset = offset * 0.62;
  const tangentLength = Math.hypot(ball.position.x, ball.position.z) || 1;
  _ballTangent.set(-ball.position.z / tangentLength, 0, ball.position.x / tangentLength);

  _ballBottomCollider.copy(ball.position).y -= offset;
  _ballTopCollider.copy(ball.position).y += offset;
  _ballLeftCollider.copy(ball.position).addScaledVector(_ballTangent, -sideOffset);
  _ballRightCollider.copy(ball.position).addScaledVector(_ballTangent, sideOffset);

  return {
    bottom: _ballBottomCollider,
    top: _ballTopCollider,
    left: _ballLeftCollider,
    right: _ballRightCollider,
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
      segment.getWorldPosition(_enemySegmentWorldPosition);
      if (colliders.bottom.distanceToSquared(_enemySegmentWorldPosition) <= stompRadius * stompRadius) return 'bottom';
    }
    for (const segment of enemy.segments) {
      segment.getWorldPosition(_enemySegmentWorldPosition);
      if (colliders.top.distanceToSquared(_enemySegmentWorldPosition) <= contactRadius * contactRadius) return 'top';
      if (colliders.left.distanceToSquared(_enemySegmentWorldPosition) <= sideContactRadius * sideContactRadius) return 'left';
      if (colliders.right.distanceToSquared(_enemySegmentWorldPosition) <= sideContactRadius * sideContactRadius) return 'right';
    }
    return null;
  }

  if (enemy.type === 'acidSnail') {
    enemy.body.getWorldPosition(_acidSnailBodyWorldPosition);
    enemy.shell.getWorldPosition(_acidSnailShellWorldPosition);
    _acidSnailHeadWorldPosition.set(0.26, 0.1, 0);
    enemy.group.localToWorld(_acidSnailHeadWorldPosition);

    const stompTargets = [
      [_acidSnailBodyWorldPosition, 0.28],
      [_acidSnailShellWorldPosition, 0.3],
      [_acidSnailHeadWorldPosition, 0.2],
    ];

    for (const [target, radius] of stompTargets) {
      const stompRadius = radius + ballRadius * 0.75;
      if (colliders.bottom.distanceToSquared(target) <= stompRadius * stompRadius) return 'bottom';
    }

    const topY = Math.max(
      _acidSnailBodyWorldPosition.y + 0.18,
      _acidSnailShellWorldPosition.y + 0.2,
      _acidSnailHeadWorldPosition.y + 0.08
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

function checkBulletCrateHit(bullet, previousY) {
  return crateSystem.checkBulletCrateHit(bullet, previousY);
}

function checkBallCrateHit(previousY) {
  crateSystem.checkBallCrateHit(previousY);
}

function checkBallGoldBlockStomp(previousY) {
  goldBlockSystem.checkBallGoldBlockStomp(previousY);
}

function checkBulletEnemyHit(bullet) {
  return enemyCombatSystem.checkBulletEnemyHit(bullet);
}

function destroyGoldBlock(index, position) {
  goldBlockSystem.destroyGoldBlock(index, position);
}

function damageGoldBlock(index) {
  return goldBlockSystem.damageGoldBlock(index);
}

function spawnGoldSparkle(goldBlock) {
  goldBlockSystem.spawnGoldSparkle(goldBlock);
}

function checkBulletGoldBlockHit(bullet, previousY) {
  return goldBlockSystem.checkBulletGoldBlockHit(bullet, previousY);
}

function updateGoldBlocks(dt) {
  goldBlockSystem.updateGoldBlocks(dt);
}

function updateFallingCratesAndGold(dt) {
  crateSystem.updateFallingCrates(dt);
  goldBlockSystem.updateFallingGoldBlocks(dt);
}

function getCannonWorldPosition(cannon) {
  return obstacleSystem.getCannonWorldPosition(cannon);
}

function destroyCannon(index) {
  obstacleSystem.destroyCannon(index);
}

function damageCannon(index) {
  obstacleSystem.damageCannon(index);
}

function checkBulletCannonHit(bullet) {
  return obstacleSystem.checkBulletCannonHit(bullet);
}

function getBallCannonContact(cannon) {
  return obstacleSystem.getBallCannonContact(cannon);
}

function isSolidLineOfSightTile(tile) {
  return obstacleSystem.isSolidLineOfSightTile(tile);
}

function getAngularDistance(a, b) {
  return obstacleSystem.getAngularDistance(a, b);
}

function getCannonWorldMouth(cannon) {
  return obstacleSystem.getCannonWorldMouth(cannon);
}

function cannonHasLineOfSight(cannon) {
  return obstacleSystem.cannonHasLineOfSight(cannon);
}

function updateCannons(dt) {
  obstacleSystem.updateCannons(dt);
}

function updateEnemies(dt) {
  enemyUpdateSystem.updateEnemies(dt);
}

function getSpikeRaiseAmount(timer) {
  return obstacleSystem.getSpikeRaiseAmount(timer);
}

function updateSpikeTraps(dt) {
  obstacleSystem.updateSpikeTraps(dt);
}

function updatePillarSpikes(dt) {
  obstacleSystem.updatePillarSpikes(dt);
}

function updateSawBlades(dt) {
  obstacleSystem.updateSawBlades(dt);
}

function updateShockwaves(dt) {
  for (let i = shockwaves.length - 1; i >= 0; i -= 1) {
    const shockwave = shockwaves[i];
    const previousRadius = shockwave.radius;
    shockwave.life -= dt;
    const progress = 1 - Math.max(0, shockwave.life / shockwave.maxLife);
    shockwave.radius = THREE.MathUtils.lerp(0.1, shockwave.maxRadius, progress);
    shockwave.mesh.scale.setScalar(shockwave.radius);
    shockwave.material.opacity = Math.max(0, 0.42 * (1 - progress));
    if (!shockwave.damagedPlayer && ball.position.distanceToSquared(shockwave.position) <= (shockwave.radius + getPlayerHitboxRadius()) ** 2) {
      shockwave.damagedPlayer = true;
      applyDamage();
    }
    for (let e = enemies.length - 1; e >= 0; e -= 1) {
      const enemy = enemies[e];
      if (shockwave.damagedEnemies.has(enemy)) continue;
      const pos = getEnemyWorldPosition(enemy);
      const effectiveRadius = Math.max(shockwave.radius, previousRadius) + enemy.collisionRadius + 0.35;
      if (pos.distanceToSquared(shockwave.position) <= effectiveRadius * effectiveRadius) {
        shockwave.damagedEnemies.add(enemy);
        damageEnemy(e);
      }
    }
    if (shockwave.life <= 0) {
      shockwave.mesh.removeFromParent();
      shockwave.material.dispose();
      shockwaves.splice(i, 1);
    }
  }
}

function updatePillarLaserRings(dt) {
  obstacleSystem.updatePillarLaserRings(dt);
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.life -= dt;
    particle.velocity.y += (particle.gravity ?? -3.5) * dt;
    particle.mesh.position.addScaledVector(particle.velocity, dt);
    particle.mesh.scale.multiplyScalar(0.965);
    particle.material.opacity = THREE.MathUtils.clamp(particle.life / (particle.maxLife ?? 0.8), 0, 1);

    if (particle.life <= 0) {
      particle.mesh.removeFromParent();
      particle.material.dispose();
      particles.splice(i, 1);
    }
  }
}

function spawnFloatingText(text, position, color = 0x2ecc71, followBall = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = '900 64px Inter, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 8;
  context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  context.strokeText(text, canvas.width / 2, canvas.height / 2);
  context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.position.y += ballRadius + 0.28;
  sprite.scale.set(1.35, 0.68, 1);
  sprite.renderOrder = 20;
  scene.add(sprite);
  floatingTexts.push({ sprite, material, texture, life: 1, startY: sprite.position.y, followBall });
}

function updateFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
    const item = floatingTexts[i];
    item.life -= dt;
    const progress = 1 - Math.max(0, item.life);
    if (item.followBall) {
      item.sprite.position.copy(ball.position);
      item.sprite.position.y += ballRadius + 0.28 + progress * 1.1;
    } else {
      item.sprite.position.y = item.startY + progress * 1.1;
    }
    item.sprite.material.opacity = Math.max(0, item.life);
    const scale = 1 + progress * 0.22;
    item.sprite.scale.set(1.35 * scale, 0.68 * scale, 1);

    if (item.life <= 0) {
      item.sprite.removeFromParent();
      item.texture.dispose();
      item.material.dispose();
      floatingTexts.splice(i, 1);
    }
  }
}

function clearEnemiesAndParticles() {
  while (enemies.length) {
    disposeEnemy(enemies.pop());
  }
  while (particles.length) {
    const particle = particles.pop();
    particle.mesh.removeFromParent();
    particle.material.dispose();
  }
  while (floatingTexts.length) {
    const item = floatingTexts.pop();
    item.sprite.removeFromParent();
    item.texture.dispose();
    item.material.dispose();
  }
  while (shockwaves.length) {
    const shockwave = shockwaves.pop();
    shockwave.mesh.removeFromParent();
    shockwave.material.dispose();
  }
}

function clearTower() {
  clearPlatformBandIndex();
  clearBullets();
  clearEnemiesAndParticles();
  clearCoinPickups();
  clearAcidPuddles();
  deactivateAllBounceCubes();
  crates.length = 0;
  goldBlocks.length = 0;
  cannons.length = 0;
spikeTraps.length = 0;
  while (floaters.length) {
    const f = floaters.pop();
    world.remove(f.mesh);
    f.mesh.geometry.dispose();
  }
  while (pillarLaserRings.length) {
    const ring = pillarLaserRings.pop();
    ring.mesh.removeFromParent();
    ring.mesh.material.dispose();
  }
  while (pillarSpikes.length) {
    const ps = pillarSpikes.pop();
    world.remove(ps.group);
    ps.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  while (sawBlades.length) {
    const sawBlade = sawBlades.pop();
    world.remove(sawBlade.group);
    sawBlade.group.traverse((child) => {
      if (child.material) child.material.dispose();
    });
  }

  while (platforms.length) {
    const platform = platforms.pop();
    world.remove(platform.group);
    platform.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}

function startLevel() {
  clearTower();

  ball.position.set(0, ballStartY, platformOuterRadius - 0.8);
  ballVelocity = 0;
  platformsPassedThisLevel = 0;
  nextPlatformId = 0;
  spikePlatformsThisLevel = 0;
  groundWormsSinceTurtle = 0;
  acidSnailsThisLevel = 0;
  clearAcidPuddles();
  bounceVelocity = 7.7;
  world.rotation.y = 0;
  drag.targetRotation = 0;
  combo = 0;
  isGameOver = false;
  isLevelComplete = false;
  levelCompleteEl.hidden = true;
  pausePanelEl.hidden = true;
  isPaused = false;
  stopShooting();
  reloadAmmo();
  damageCooldown = 0;
  damageFlashTimer = 0;
  shakeIntensity = 0;
  shakeDecay = 0;
  invulnerabilityTimer = 0;
  acidStompImmunity = 0;
  acidBurnCooldown = 0;
  reloadFlashTimer = 0;
  shopTilePlat = null;
  shopTileRef = null;
  shopUsed = false;
  scoreEl.textContent = String(score);
  updateLevelUI();
  gameOverEl.hidden = true;
  ball.material.color.setHex(colors.ball);
  stopInvulnerabilityMusic();
  activatePendingPowerups();
  updateWeaponUI();

  const target = getLevelTarget();
  for (let i = 0; i <= target; i += 1) {
    createPlatform(-i * platformSpacing, nextPlatformId, { final: i === target });
    nextPlatformId += 1;
  }
  ensureInitialLowerPlatformYellowWorm();
  ensureInitialLowerPlatformMushroom();
  spawnGoldBlocksForLevel();
  spawnPillarSpikesForLevel();
  spawnFloatersForLevel();
  spawnSawBladesForLevel();
  spawnPillarLaserRingsForLevel();
}

function resetGame() {
  score = 0;
  currentLevel = 1;
  hp = maxHp;
  coins = 0;
  maxAmmo = defaultMaxAmmo;
  ammo = defaultMaxAmmo;
  selectedWeapon = 'machinegun';
  pendingInvulnerability = false;
  pendingShield = false;
  invulnerabilityTimer = 0;
  hasShield = false;
  acidStompImmunity = 0;
  acidBurnCooldown = 0;
  reloadFlashTimer = 0;
  rewardChosen = false;
  shieldMesh.visible = false;
  damageSlowdownTimer = 0;
  timeScale = 1;
  grayscaleAmount = 0;
  piercingBulletsUnlocked = false;
  vampiricLifeUnlocked = false;
  comboShieldUnlocked = false;
  vampiricKillCount = 0;
  comboShieldAwardedThisCombo = false;
  scoreSubmittedToLeaderboard = false;
  if (scene.background) scene.background.setHex(0xeef7ff);
  rebuildAmmoUI();
  updateWeaponUI();
  syncOptionsPanel();
  updatePersistentUI();
  startLevel();
}

function endGame() {
  isGameOver = true;
  stopShooting();
  stopInvulnerabilityMusic();
  updateComboSprite();
  finalScoreEl.textContent = String(score);
  gameOverEl.hidden = false;
  scoreSubmittedToLeaderboard = false;
  leaderboardPendingClose = true;
  leaderboardPanelEl.hidden = true;
  setTimeout(() => {
    if (isGameOver) {
      showLeaderboardPanel();
    }
  }, 2000);
}

async function showLeaderboardPanel() {
  leaderboardScoreLabel.textContent = `Score: ${score}`;
  leaderboardNameSection.hidden = false;
  leaderboardSubmittedEl.hidden = true;
  leaderboardListEl.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
  leaderboardPanelEl.hidden = false;
  await fetchLeaderboard();
}

async function submitScore(playerName) {
  if (!playerName.trim() || scoreSubmittedToLeaderboard) return;
  scoreSubmittedToLeaderboard = true;
  try {
    await submitScoreToLeaderboard(playerName.trim(), score);
    leaderboardNameSection.hidden = true;
    leaderboardSubmittedEl.hidden = false;
    const rank = await getPlayerRank(playerName.trim(), score);
    leaderboardRankMsg.textContent = `Score submitted! Rank: #${rank}`;
    await fetchLeaderboard();
  } catch (e) {
    leaderboardRankMsg.textContent = 'Submission failed. Retrying...';
    scoreSubmittedToLeaderboard = false;
  }
}

async function fetchLeaderboard() {
  try {
    const scores = await loadScores();
    leaderboardListEl.innerHTML = '';
    let pos = 1;
    for (const entry of scores) {
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      if (pos <= 3) row.classList.add('top-3');
      if (pos === 1) row.classList.add('gold-rank');
      else if (pos === 2) row.classList.add('silver-rank');
      else if (pos === 3) row.classList.add('bronze-rank');
      row.innerHTML = `<span class="leaderboard-pos">#${pos}</span><span class="leaderboard-name">${entry.name}</span><span class="leaderboard-score">${entry.score}</span>`;
      leaderboardListEl.appendChild(row);
      pos++;
    }
    if (leaderboardListEl.children.length === 0) {
      leaderboardListEl.innerHTML = '<div class="leaderboard-loading">No scores yet. Be the first!</div>';
    }
  } catch (e) {
    leaderboardListEl.innerHTML = '<div class="leaderboard-loading">Could not load leaderboard</div>';
  }
}

function triggerShake(intensity) {
  shakeIntensity = intensity;
  shakeDecay = 12;
}

function applyDamage() {
  if (damageCooldown > 0 || isGameOver || isLevelComplete) return;
  if (invulnerabilityTimer > 0) {
    spawnFloatingText('NO HIT', ball.position);
    damageCooldown = 0.45;
    return;
  }
  if (hasShield) {
    hasShield = false;
    shieldMesh.visible = false;
    spawnFloatingText('SHIELD', ball.position);
    playBounceSound();
    damageCooldown = 0.8;
    return;
  }

  hp -= 1;
  updateHeartsUI(heartsEl, hp, maxHp);
  damageFlashTimer = 0.28;
  damageSlowdownTimer = 2;
  timeScale = 0.5;
  playFailSound();
  triggerShake(0.65);
  damageCooldown = 1.1;

  if (hp <= 0) {
    endGame();
  }
}

function updatePowerups(dt) {
  if (damageCooldown > 0) damageCooldown = Math.max(0, damageCooldown - dt);
  if (acidStompImmunity > 0) acidStompImmunity = Math.max(0, acidStompImmunity - dt);
  if (acidBurnCooldown > 0) acidBurnCooldown = Math.max(0, acidBurnCooldown - dt);
  if (damageFlashTimer > 0) damageFlashTimer = Math.max(0, damageFlashTimer - dt);
  if (reloadFlashTimer > 0) reloadFlashTimer = Math.max(0, reloadFlashTimer - dt);

  if (hasShield) {
    shieldMesh.visible = true;
    shieldMesh.position.copy(ball.position);
    shieldMesh.position.y += ballRadius + 0.34;
    shieldMesh.rotation.y += dt * 2.4;
  } else {
    shieldMesh.visible = false;
  }

  if (invulnerabilityTimer > 0) {
    invulnerabilityTimer = Math.max(0, invulnerabilityTimer - dt);
    updateInvulnerabilityMusic();
    if (invulnerabilityTimer === 0) {
      stopInvulnerabilityMusic();
    }
  }
}

function updateBallVisual() {
  if (reloadFlashTimer > 0) {
    ball.material.color.setHex(0xffffff);
  } else if (invulnerabilityTimer > 0) {
    const hue = (performance.now() * 0.0008) % 1;
    ball.material.color.setHSL(hue, 0.95, 0.58);
  } else if (damageSlowdownTimer > 0) {
    const blink = Math.floor(performance.now() / 80) % 2;
    ball.material.color.setHex(blink ? 0xff1744 : colors.ball);
  } else if (hp === 1) {
    const blink = Math.floor(performance.now() / 200) % 2;
    ball.material.color.setHex(blink ? 0xff1744 : colors.ball);
  } else if (damageFlashTimer > 0) {
    ball.material.color.setHex(0xff1744);
  } else {
    ball.material.color.setHex(colors.ball);
  }
}

function activatePendingPowerups() {
  if (pendingInvulnerability) {
    pendingInvulnerability = false;
    invulnerabilityTimer = 10;
    startInvulnerabilityMusic();
  }
  if (pendingShield) {
    pendingShield = false;
    hasShield = true;
    shieldMesh.visible = true;
  }
}

function updateShopUI() {
  renderShopUI({
    shopCoinsEl, shopBulletBtn, shopHpBtn, shopArmorBtn, shopInvulnBtn,
    shopPiercingBtn, shopVampiricBtn, shopComboShieldBtn,
  }, {
    coins, hp, maxHp, hasShield, invulnerabilityTimer, piercingCost,
    piercingBulletsUnlocked, vampiricCost, vampiricLifeUnlocked,
    comboShieldCost, comboShieldUnlocked,
  });
}

function openShop() {
  shopUsed = true;
  isPaused = true;
  stopShooting();
  shopPanelEl.hidden = false;
  updateShopUI();
}

function closeShop() {
  shopPanelEl.hidden = true;
  isPaused = false;
  if (shopTileRef) {
    shopTileRef.type = 'blue';
    shopTileRef.material.color.setHex(colors.blue);
    shopTileRef = null;
  }
  shopTilePlat = null;
}

function buyShopBullet() {
  if (coins < 5) return;
  coins -= 5;
  maxAmmo += 1;
  ammo = maxAmmo;
  rebuildAmmoUI();
  syncOptionsPanel();
  updateCoinsUI(coinsEl, coins);
  updateShopUI();
  playRewardSound();
}

function buyShopHp() {
  if (coins < 20 || hp >= maxHp) return;
  coins -= 20;
  hp += 1;
  updateHeartsUI(heartsEl, hp, maxHp);
  updateCoinsUI(coinsEl, coins);
  updateShopUI();
  playRewardSound();
}

function buyShopArmor() {
  if (coins < 20 || hasShield) return;
  coins -= 20;
  hasShield = true;
  shieldMesh.visible = true;
  updateCoinsUI(coinsEl, coins);
  updateShopUI();
  playRewardSound();
}

function buyShopInvuln() {
  if (coins < 30 || invulnerabilityTimer > 0) return;
  coins -= 30;
  invulnerabilityTimer = 10;
  startInvulnerabilityMusic();
  updateCoinsUI(coinsEl, coins);
  updateShopUI();
  playRewardSound();
}

function buyShopPiercing() {
  if (coins < piercingCost || piercingBulletsUnlocked) return;
  coins -= piercingCost;
  piercingBulletsUnlocked = true;
  updateCoinsUI(coinsEl, coins);
  updateShopUI();
  playRewardSound();
}

function buyShopVampiric() {
  if (coins < vampiricCost || vampiricLifeUnlocked) return;
  coins -= vampiricCost;
  vampiricLifeUnlocked = true;
  updateCoinsUI(coinsEl, coins);
  updateShopUI();
  playRewardSound();
}

function buyShopComboShield() {
  if (coins < comboShieldCost || comboShieldUnlocked) return;
  coins -= comboShieldCost;
  comboShieldUnlocked = true;
  updateCoinsUI(coinsEl, coins);
  updateShopUI();
  playRewardSound();
}

function updateLevelCompleteUI() {
  renderLevelCompleteUI({
    completeSummaryEl, rewardHpButton, rewardAmmoButton, rewardPiercingButton,
    rewardVampiricButton, rewardComboShieldButton, nextLevelButton,
    buyInvulnerabilityButton, buyShieldButton,
  }, {
    currentLevel, coins, rewardChosen, hp, maxHp, piercingBulletsUnlocked,
    vampiricLifeUnlocked, comboShieldUnlocked, invulnerabilityCost,
    pendingInvulnerability, shieldCost, pendingShield, hasShield,
  });
}

function completeLevel() {
  if (isLevelComplete) return;
  isLevelComplete = true;
  stopShooting();
  stopInvulnerabilityMusic();
  score += 100;
  scoreEl.textContent = String(score);
  rewardChosen = false;
  platformsPassedThisLevel = getLevelTarget();
  updateLevelUI();
  ballVelocity = 0;
  levelCompleteEl.hidden = false;
  shopStatusEl.textContent = '';
  updateLevelCompleteUI();
}

const _ballLocal = new THREE.Vector3();
const _bulletImpactPoint = new THREE.Vector3();
const _bulletImpactLocal = new THREE.Vector3();
const _crateWorldPosition = new THREE.Vector3();
const _coinLocalPosition = new THREE.Vector3();
const _pickupWorldPosition = new THREE.Vector3();
const _bounceCubeLocalPosition = new THREE.Vector3();
const _ballTangent = new THREE.Vector3();
const _ballBottomCollider = new THREE.Vector3();
const _ballTopCollider = new THREE.Vector3();
const _ballLeftCollider = new THREE.Vector3();
const _ballRightCollider = new THREE.Vector3();
const _enemyWorldPosition = new THREE.Vector3();
const _enemySegmentWorldPosition = new THREE.Vector3();
const _acidSnailBodyWorldPosition = new THREE.Vector3();
const _acidSnailShellWorldPosition = new THREE.Vector3();
const _acidSnailHeadWorldPosition = new THREE.Vector3();
const _platformUndersidePoint = new THREE.Vector3();
const _enemyProjectedPosition = new THREE.Vector3();
const _pillarWormNormal = new THREE.Vector3();
const _ballRadialNormal = new THREE.Vector3();
const _ledgePreviousBottom = new THREE.Vector3();
const _ledgeCurrentBottom = new THREE.Vector3();
const _ledgeStompPoint = new THREE.Vector3();
const collisionDebug = createCollisionDebug({
  enabled: collisionDebugEnabled,
  scene,
  world,
  ball,
  getWorldRotation: () => world.rotation.y,
});

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
    _bulletImpactPoint.set(bullet.mesh.position.x, collision.platformTop + 0.035, bullet.mesh.position.z);
    const tile = getTileAtWorldPoint(collision.platform, _bulletImpactPoint);
    if (!tile) continue;

    spawnBulletImpact(_bulletImpactPoint);
    if (tile.type === 'gray') {
      damageGrayTile(collision.platform, tile);
    }
    return true;
  }

  return false;
}

function getBallContactOnPlatform(platform) {
  _ballLocal.copy(ball.position);
  platform.group.worldToLocal(_ballLocal);

  const radius = Math.hypot(_ballLocal.x, _ballLocal.z);
  const angle = (Math.atan2(_ballLocal.z, _ballLocal.x) + twoPi) % twoPi;
  const tile = radius >= platformInnerRadius && radius <= platformOuterRadius
    ? platform.tiles.find((candidate) => !candidate.broken && angleInArc(angle, candidate.start, candidate.end)) || null
    : null;

  return { angle, radius, tile, localX: _ballLocal.x, localZ: _ballLocal.z };
}

function isSolidUndersideTile(tile) {
  return tile && !tile.broken && (tile.type === 'blue' || tile.type === 'crackedBlue' || tile.type === 'red' || tile.type === 'gray');
}

function handlePlatformUndersideCollision(previousY) {
  if (ballVelocity <= 0) return;

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
    _platformUndersidePoint.set(ball.position.x, collision.platformBottom - 0.035, ball.position.z);
    const tile = getTileAtWorldPoint(collision.platform, _platformUndersidePoint);
    if (!isSolidUndersideTile(tile)) continue;

    ball.position.y = collision.platformBottom - ballRadius;
    ballVelocity = -Math.max(1.2, bounceVelocity * 0.22);
    return;
  }
}

function handlePlatformCollision(previousY) {
  if (ballVelocity >= 0) return;

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
      if (!isGameOver) resetCombo();
      ball.position.y = platformTop + ballRadius;
      ballVelocity = bounceVelocity * 0.72;
      return;
    }

    if (contact.tile.type === 'finish') {
      ball.position.y = platformTop + ballRadius;
      ballVelocity = 0;
      completeLevel();
      return;
    }

    if (contact.tile.type === 'shop' && !shopUsed) {
      ball.position.y = platformTop + ballRadius;
      ballVelocity = bounceVelocity;
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
    ballVelocity = bounceVelocity;
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

function recyclePlatforms() {
  for (let i = platforms.length - 1; i >= 0; i -= 1) {
    const platform = platforms[i];
    const y = platformY(platform);

    if (!platform.scored && ball.position.y < y - platformThickness) {
      platform.scored = true;
      score += 10;
      if (!platform.final) {
        platformsPassedThisLevel = Math.min(getLevelTarget(), platformsPassedThisLevel + 1);
      }
      scoreEl.textContent = String(score);
      updateLevelUI();
      bounceVelocity = 7.7 + Math.min(score * 0.025, 0.8);
    }

    if (y > ball.position.y + 12) {
      detachBounceCubesFromPlatform(platform);
      goldBlockSystem.removeGoldBlocksForPlatform(platform);
      for (let e = enemies.length - 1; e >= 0; e -= 1) {
        if (enemies[e].type === 'explosiveMushroom' && enemies[e].platformData === platform) {
          disposeEnemy(enemies[e]);
          enemies.splice(e, 1);
        }
      }
      for (let s = spikeTraps.length - 1; s >= 0; s -= 1) {
        if (spikeTraps[s].platformGroup === platform.group) spikeTraps.splice(s, 1);
      }
      coinPickupSystem.removeCoinPickupsForPlatform(platform.group);
      unregisterPlatformFromBand(platform);
      world.remove(platform.group);
      platform.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      platforms.splice(i, 1);
    }
  }
}

function updateCamera(dt) {
  const targetY = ball.position.y - 4.2;
  camera.position.y += (targetY + 9.0 - camera.position.y) * 0.08;
  camera.lookAt(0, targetY, 0);
  pillar.position.y = targetY - 25;

  if (shakeIntensity > 0.01) {
    cameraBasePos.copy(camera.position);
    shakeOffset.set(
      (Math.random() - 0.5) * shakeIntensity,
      (Math.random() - 0.5) * shakeIntensity,
      0
    );
    camera.position.copy(cameraBasePos).add(shakeOffset);
    camera.position.z = 10.5;
    camera.position.x = 0;
    shakeIntensity *= Math.exp(-shakeDecay * dt);
  } else {
    shakeIntensity = 0;
    camera.position.z = 10.5;
    camera.position.x = 0;
  }
}

function updateTileFlashes(dt) {
  updatePlatformTileFlashes(platforms, dt);
}

pauseButton.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});

pauseButton.addEventListener('click', (event) => {
  event.stopPropagation();
  if (isGameOver) return;
  setPaused(!isPaused);
});

closePanelButton.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});

closePanelButton.addEventListener('click', (event) => {
  event.stopPropagation();
  setPaused(false);
});

extraButton.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});

extraButton.addEventListener('click', (event) => {
  event.stopPropagation();
  extraPanelEl.hidden = false;
  pausePanelEl.hidden = true;
  impulseBResetLabel.hidden = impulseMode !== 'B';
  impulseBShotgunLabel.hidden = impulseMode !== 'B';
  impulseCFactorLabel.hidden = impulseMode !== 'C';
  impulseAButton.classList.toggle('active', impulseMode === 'A');
  impulseBButton.classList.toggle('active', impulseMode === 'B');
  impulseCButton.classList.toggle('active', impulseMode === 'C');
});

closeExtraButton.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});

closeExtraButton.addEventListener('click', (event) => {
  event.stopPropagation();
  extraPanelEl.hidden = true;
  pausePanelEl.hidden = false;
  syncOptionsPanel();
});

impulseAButton.addEventListener('click', () => {
  impulseMode = 'A';
  impulseAButton.classList.add('active');
  impulseBButton.classList.remove('active');
  impulseCButton.classList.remove('active');
  impulseBResetLabel.hidden = true;
  impulseBShotgunLabel.hidden = true;
  impulseCFactorLabel.hidden = true;
});

impulseBButton.addEventListener('click', () => {
  impulseMode = 'B';
  impulseBButton.classList.add('active');
  impulseAButton.classList.remove('active');
  impulseCButton.classList.remove('active');
  impulseBResetLabel.hidden = false;
  impulseBShotgunLabel.hidden = false;
  impulseCFactorLabel.hidden = true;
});

impulseCButton.addEventListener('click', () => {
  impulseMode = 'C';
  impulseCButton.classList.add('active');
  impulseAButton.classList.remove('active');
  impulseBButton.classList.remove('active');
  impulseBResetLabel.hidden = true;
  impulseBShotgunLabel.hidden = true;
  impulseCFactorLabel.hidden = false;
});

impulseCFactorInput.addEventListener('input', () => {
  const val = Number(impulseCFactorInput.value);
  impulseCfactor = Number.isFinite(val) ? Math.max(0, Math.min(1, val)) : 0.9;
});

impulseBResetInput.addEventListener('input', () => {
  const val = Number(impulseBResetInput.value);
  impulseBResetSpeed = Number.isFinite(val) ? Math.max(-10, Math.min(10, val)) : defaultGravity * 0.1;
});

impulseBShotgunInput.addEventListener('input', () => {
  const val = Number(impulseBShotgunInput.value);
  impulseBShotgunImpulse = Number.isFinite(val) ? Math.max(0, Math.min(20, val)) : 4;
});

controlAButton.addEventListener('click', () => {
  controlMode = 'A';
  controlAButton.classList.add('active');
  controlBButton.classList.remove('active');
  touchPointerIds.clear();
  stopShooting();
});

controlBButton.addEventListener('click', () => {
  controlMode = 'B';
  controlBButton.classList.add('active');
  controlAButton.classList.remove('active');
  touchPointerIds.clear();
  stopShooting();
});

twistBOffButton.addEventListener('click', () => {
  twistBMode = false;
  twistBOffButton.classList.add('active');
  twistBOnButton.classList.remove('active');
});

twistBOnButton.addEventListener('click', () => {
  twistBMode = true;
  twistBOnButton.classList.add('active');
  twistBOffButton.classList.remove('active');
});

flyingModeBOffButton.addEventListener('click', () => {
  flyingModeB = false;
  flyingModeBOffButton.classList.add('active');
  flyingModeBOnButton.classList.remove('active');
});

flyingModeBOnButton.addEventListener('click', () => {
  flyingModeB = true;
  flyingModeBOnButton.classList.add('active');
  flyingModeBOffButton.classList.remove('active');
});

shopBulletBtn.addEventListener('click', buyShopBullet);
shopHpBtn.addEventListener('click', buyShopHp);
shopArmorBtn.addEventListener('click', buyShopArmor);
shopInvulnBtn.addEventListener('click', buyShopInvuln);
shopPiercingBtn.addEventListener('click', buyShopPiercing);
shopVampiricBtn.addEventListener('click', buyShopVampiric);
shopComboShieldBtn.addEventListener('click', buyShopComboShield);
closeShopButton.addEventListener('click', closeShop);
shopPanelEl.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});

levelCompleteEl.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});

rewardHpButton.addEventListener('click', () => {
  if (rewardChosen) return;
  playRewardSound();
  if (hp < maxHp) {
    hp += 1;
    updateHeartsUI(heartsEl, hp, maxHp);
  }
  rewardChosen = true;
  updateLevelCompleteUI();
});

rewardAmmoButton.addEventListener('click', () => {
  if (rewardChosen) return;
  playRewardSound();
  maxAmmo += 1;
  ammo = maxAmmo;
  rebuildAmmoUI();
  syncOptionsPanel();
  rewardChosen = true;
  updateLevelCompleteUI();
});

buyInvulnerabilityButton.addEventListener('click', () => {
  if (coins < invulnerabilityCost || pendingInvulnerability) return;
  coins -= invulnerabilityCost;
  pendingInvulnerability = true;
  updateCoinsUI(coinsEl, coins);
  shopStatusEl.textContent = 'Invulnerability will activate at the start of the next level.';
  updateLevelCompleteUI();
});

buyShieldButton.addEventListener('click', () => {
  if (coins < shieldCost || pendingShield || hasShield) return;
  coins -= shieldCost;
  pendingShield = true;
  updateCoinsUI(coinsEl, coins);
  shopStatusEl.textContent = 'Shield will activate at the start of the next level.';
  updateLevelCompleteUI();
});

nextLevelButton.addEventListener('click', () => {
  if (!rewardChosen) return;
  currentLevel += 1;
  startLevel();
});

impulseInput.addEventListener('input', () => {
  setShootingImpulse(impulseInput.value);
});

leaderboardSubmitBtn.addEventListener('click', () => {
  submitScore(leaderboardNameInput.value);
});

leaderboardNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitScore(leaderboardNameInput.value);
});

leaderboardCloseBtn.addEventListener('click', () => {
  leaderboardPanelEl.hidden = true;
  leaderboardPendingClose = false;
});

leaderboardPanelEl.addEventListener('pointerdown', (event) => {
  if (event.target === leaderboardPanelEl) {
    leaderboardPanelEl.hidden = true;
    leaderboardPendingClose = false;
  }
});

fireIntervalInput.addEventListener('input', () => {
  fireInterval = Math.max(0.08, Number(fireIntervalInput.value) || defaultFireInterval);
  if (isShooting && selectedWeapon === 'machinegun') fireCooldown = Math.min(fireCooldown, fireInterval);
});

shotgunSpreadInput.addEventListener('input', () => {
  setShotgunSpreadAngle(shotgunSpreadInput.value);
});

shotgunIntervalInput.addEventListener('input', () => {
  setShotgunFireInterval(shotgunIntervalInput.value);
});

maxAmmoInput.addEventListener('input', () => {
  maxAmmo = parseClampedInt(maxAmmoInput.value, 1, 20, defaultMaxAmmo);
  ammo = Math.min(ammo, maxAmmo);
  rebuildAmmoUI();
  maxAmmoInput.value = String(maxAmmo);
});

gravityInput.addEventListener('input', () => {
  setGravity(gravityInput.value);
});

terminalVelocityInput.addEventListener('input', () => {
  setTerminalVelocity(terminalVelocityInput.value);
});

stompImpulseInput.addEventListener('input', () => {
  setStompImpulse(stompImpulseInput.value);
});

rewardPiercingButton.addEventListener('click', () => {
  if (rewardChosen || piercingBulletsUnlocked) return;
  playRewardSound();
  piercingBulletsUnlocked = true;
  rewardChosen = true;
  updateLevelCompleteUI();
});

rewardVampiricButton.addEventListener('click', () => {
  if (rewardChosen || vampiricLifeUnlocked) return;
  playRewardSound();
  vampiricLifeUnlocked = true;
  rewardChosen = true;
  updateLevelCompleteUI();
});

rewardComboShieldButton.addEventListener('click', () => {
  if (rewardChosen || comboShieldUnlocked) return;
  playRewardSound();
  comboShieldUnlocked = true;
  rewardChosen = true;
  updateLevelCompleteUI();
});

hitboxScaleInput.addEventListener('input', () => {
  setPlayerHitboxScale(hitboxScaleInput.value);
});

cannonChargeInput.addEventListener('input', () => {
  setCannonChargeTime(cannonChargeInput.value);
});

cannonCooldownInput.addEventListener('input', () => {
  setCannonCooldown(cannonCooldownInput.value);
});

laserOnInput.addEventListener('input', () => {
  setLaserRingOnTime(laserOnInput.value);
});

laserOffInput.addEventListener('input', () => {
  setLaserRingOffTime(laserOffInput.value);
});

coinAttractionInput.addEventListener('input', () => {
  setCoinAttractionRadius(coinAttractionInput.value);
});

setupInputListeners({
  get isPaused() { return isPaused; },
  get isLevelComplete() { return isLevelComplete; },
  get isGameOver() { return isGameOver; },
  leaderboardPendingClose,
  leaderboardPanelEl,
  resetGame,
  get controlMode() { return controlMode; },
  touchPointerIds,
  stopShooting,
  startShooting,
  drag,
  get steamDeckModeActive() { return steamDeckMode.isActive(); },
  get timeScale() { return timeScale; },
  selectWeapon,
  setPaused,
});

const steamDeckMode = setupSteamDeckMode({
  button: steamDeckButton,
  renderer,
  drag,
  getCanPlay: () => !isGameOver && !isPaused && !isLevelComplete,
  getTimeScale: () => timeScale,
  setPaused,
  startShooting,
  stopShooting,
});

window.addEventListener('resize', () => {
  resizeScene({ camera, renderer });
});

const clock = new THREE.Clock();

function animate() {
  const realDt = Math.min(clock.getDelta(), 0.033);

  if (damageSlowdownTimer > 0) {
    damageSlowdownTimer = Math.max(0, damageSlowdownTimer - realDt);
    if (damageSlowdownTimer === 0) timeScale = 1;
  }

  const grayscaleTarget = damageSlowdownTimer > 0 ? 1 : 0;
  grayscaleAmount += (grayscaleTarget - grayscaleAmount) * Math.min(1, realDt / 0.2);
  const _bgR = 0xee / 255;
  const _bgG = 0xf7 / 255;
  const _bgB = 0xff / 255;
  const _darkR = 0x2f / 255;
  const _darkG = 0x33 / 255;
  const _darkB = 0x38 / 255;
  scene.background.setRGB(
    _bgR + (_darkR - _bgR) * grayscaleAmount,
    _bgG + (_darkG - _bgG) * grayscaleAmount,
    _bgB + (_darkB - _bgB) * grayscaleAmount
  );

  const dt = realDt * timeScale;
  scaledTime += dt;
  steamDeckMode.update();

  if (!isPaused) {
    const lerpFactor = 1 - Math.pow(1 - 0.22, timeScale);
    world.rotation.y += (drag.targetRotation - world.rotation.y) * lerpFactor;
  }

  if (!isGameOver && !isPaused && !isLevelComplete) {
    updateShooting(dt);
    updatePowerups(dt);

    const previousY = ball.position.y;
    ballVelocity = integrateBallPhysics({ ball, ballVelocity, gravity, terminalVelocity, dt });

    scene.updateMatrixWorld(true);
    checkBallCrateHit(previousY);
    checkBallGoldBlockStomp(previousY);
    handlePlatformUndersideCollision(previousY);
    handlePlatformCollision(previousY);
    updateSpikeTraps(dt);
    updatePillarSpikes(dt);
    updateSawBlades(dt);
    updatePillarLaserRings(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updateFloaters(dt);
    updateAcidPuddles(dt);
    updateShockwaves(dt);
    updateCannons(dt);
    updateGoldBlocks(dt);
    updateFallingCratesAndGold(dt);
    updateCoinPickups(dt);
    updateParticles(dt);
    updateBounceCubes(dt);
    recyclePlatforms();
    updateFloatingTexts(dt);
    if (comboSprite) {
      comboSprite.position.copy(ball.position);
      comboSprite.position.y += ballRadius + 0.28;
    }
    updateTileFlashes(dt);
    updateCamera(dt);
  }

  updateBallVisual();

  renderer.render(scene, camera);
}

rebuildAmmoUI();
syncOptionsPanel();
resetGame();
renderer.setAnimationLoop(animate);
