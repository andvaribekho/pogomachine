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
  isBlueTile,
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
import { setupGameplayInputWiring } from './systems/inputWiring.js';
import { loadScores, submitScoreToLeaderboard, getPlayerRank } from './systems/leaderboard.js';
import { setupSteamDeckMode } from './systems/steamDeckInput.js';
import { integrateBallPhysics } from './systems/physics.js';
import { createLifecycleSystem } from './systems/lifecycle.js';
import { createPowerupSystem } from './systems/powerups.js';
import { createShopRewardSystem } from './systems/shopRewards.js';
import { createCameraFrameSystem } from './systems/cameraFrame.js';
import { createGameLoop } from './systems/gameLoop.js';
import { createPlatformLifecycleSystem } from './systems/platformLifecycle.js';
import { createLeaderboardFlow } from './systems/leaderboardFlow.js';
import { createOptionsPanelSystem } from './systems/optionsPanel.js';
import {
  createShootingSystem,
} from './systems/shooting.js';
import { createCollisionSystem } from './systems/collisions.js';
import { getLevelInfo as makeLevelInfo, getLevelTarget as getTargetForLevel } from './systems/levels.js';
import { createGameAssets } from './render/assets.js';
import { createSceneBundle, resizeScene } from './render/scene.js';
import {
  spawnExplosion as spawnExplosionParticles,
  spawnBulletImpact as spawnBulletImpactParticles,
} from './render/effects.js';
import { createParticleSystem } from './render/particles.js';
import { createFloatingTextSystem } from './render/floatingText.js';
import {
  clearPlatformBandIndex, registerPlatformInBand,
  unregisterPlatformFromBand,
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
import { createAcidPuddleSystem } from './entities/acidPuddles.js';
import { createShockwaveSystem } from './entities/shockwaves.js';
import { getDomRefs } from './ui/dom.js';
import { createComboSystem } from './ui/combo.js';
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

const collisionDebug = createCollisionDebug({
  enabled: collisionDebugEnabled,
  scene,
  world,
  ball,
  getWorldRotation: () => world.rotation.y,
});

const collisionSystem = createCollisionSystem({
  ball,
  ballRadius,
  platformInnerRadius,
  platformOuterRadius,
  platformThickness,
  twoPi,
  getBallVelocity: () => ballVelocity,
  setBallVelocity: value => { ballVelocity = value; },
  getBounceVelocity: () => bounceVelocity,
  getPlayerHitboxRadius,
  getIsGameOver: () => isGameOver,
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
  getShopUsed: () => shopUsed,
  openShop,
  breakCrackedTile,
});

const acidPuddleSystem = createAcidPuddleSystem({
  scene,
  ball,
  enemies,
  platforms,
  particles,
  acidPuddles,
  acidPuddleMaterial,
  acidDropletGeometry,
  particleGeometry,
  colors,
  platformThickness,
  platformInnerRadius,
  platformOuterRadius,
  twoPi,
  getPlayerHitboxRadius,
  getAcidStompImmunity: () => acidStompImmunity,
  getAcidBurnCooldown: () => acidBurnCooldown,
  setAcidBurnCooldown: value => { acidBurnCooldown = value; },
  getEnemyWorldPosition,
  removeEnemyAt,
  damageEnemy,
  applyDamage,
  playAcidBurnSound,
});

const particleSystem = createParticleSystem({ particles });

const floatingTextSystem = createFloatingTextSystem({
  scene,
  ball,
  ballRadius,
  floatingTexts,
});

const comboSystem = createComboSystem({
  scene,
  ball,
  ballRadius,
  comboShieldThreshold,
  getCombo: () => combo,
  setCombo: value => { combo = value; },
  getComboShieldUnlocked: () => comboShieldUnlocked,
  getComboShieldAwardedThisCombo: () => comboShieldAwardedThisCombo,
  setComboShieldAwardedThisCombo: value => { comboShieldAwardedThisCombo = value; },
  getHasShield: () => hasShield,
  setHasShield: value => { hasShield = value; },
  shieldMesh,
  spawnFloatingText,
});

const optionsPanelSystem = createOptionsPanelSystem({
  refs: {
    impulseInput,
    fireIntervalInput,
    shotgunSpreadInput,
    shotgunIntervalInput,
    maxAmmoInput,
    gravityInput,
    terminalVelocityInput,
    stompImpulseInput,
    hitboxScaleInput,
    cannonChargeInput,
    cannonCooldownInput,
    laserOnInput,
    laserOffInput,
    coinAttractionInput,
    impulseBResetInput,
    impulseBShotgunInput,
    impulseCFactorInput,
    impulseBResetLabel,
    impulseBShotgunLabel,
    impulseCFactorLabel,
    impulseAButton,
    impulseBButton,
    impulseCButton,
    twistBOffButton,
    twistBOnButton,
    flyingModeBOffButton,
    flyingModeBOnButton,
  },
  defaults: {
    defaultBulletImpulse,
    defaultGravity,
    defaultTerminalVelocity,
    defaultStompImpulse,
    defaultPlayerHitboxScale,
    defaultCannonChargeTime,
    defaultCannonCooldown,
    defaultLaserRingOnTime,
    defaultLaserRingOffTime,
    defaultCoinAttractionRadius,
    defaultShotgunSpreadAngle,
    defaultShotgunFireInterval,
    defaultMaxAmmo,
  },
  getState: {
    bulletImpulse: () => bulletImpulse,
    fireInterval: () => fireInterval,
    shotgunSpreadAngle: () => shotgunSpreadAngle,
    shotgunFireInterval: () => shotgunFireInterval,
    maxAmmo: () => maxAmmo,
    ammo: () => ammo,
    gravity: () => gravity,
    terminalVelocity: () => terminalVelocity,
    stompImpulse: () => stompImpulse,
    playerHitboxScale: () => playerHitboxScale,
    cannonChargeTime: () => cannonChargeTime,
    cannonCooldown: () => cannonCooldown,
    laserRingOnTime: () => laserRingOnTime,
    laserRingOffTime: () => laserRingOffTime,
    coinAttractionRadius: () => coinAttractionRadius,
    impulseBResetSpeed: () => impulseBResetSpeed,
    impulseBShotgunImpulse: () => impulseBShotgunImpulse,
    impulseCfactor: () => impulseCfactor,
    impulseMode: () => impulseMode,
    twistBMode: () => twistBMode,
    flyingModeB: () => flyingModeB,
    fireCooldown: () => fireCooldown,
  },
  setState: {
    bulletImpulse: value => { bulletImpulse = value; },
    gravity: value => { gravity = value; },
    terminalVelocity: value => { terminalVelocity = value; },
    stompImpulse: value => { stompImpulse = value; },
    playerHitboxScale: value => { playerHitboxScale = value; },
    cannonChargeTime: value => { cannonChargeTime = value; },
    cannonCooldown: value => { cannonCooldown = value; },
    laserRingOnTime: value => { laserRingOnTime = value; },
    laserRingOffTime: value => { laserRingOffTime = value; },
    coinAttractionRadius: value => { coinAttractionRadius = value; },
    shotgunSpreadAngle: value => { shotgunSpreadAngle = value; },
    shotgunFireInterval: value => { shotgunFireInterval = value; },
    maxAmmo: value => { maxAmmo = value; },
    ammo: value => { ammo = value; },
    fireCooldown: value => { fireCooldown = value; },
  },
  rebuildAmmoUI,
  getIsShooting: () => isShooting,
  getSelectedWeapon: () => selectedWeapon,
});

const shockwaveSystem = createShockwaveSystem({
  scene,
  ball,
  enemies,
  shockwaves,
  shockwaveGeometry,
  shockwaveMaterial,
  getPlayerHitboxRadius,
  getEnemyWorldPosition,
  applyDamage,
  damageEnemy,
  playPufferExplosionSound,
});

const cameraFrameSystem = createCameraFrameSystem({
  scene,
  camera,
  pillar,
  shakeOffset,
  cameraBasePos,
  getBallY: () => ball.position.y,
  getShakeIntensity: () => shakeIntensity,
  setShakeIntensity: value => { shakeIntensity = value; },
  getShakeDecay: () => shakeDecay,
  setShakeDecay: value => { shakeDecay = value; },
  getDamageSlowdownTimer: () => damageSlowdownTimer,
  getGrayscaleAmount: () => grayscaleAmount,
  setGrayscaleAmount: value => { grayscaleAmount = value; },
});

const powerupSystem = createPowerupSystem({
  ball,
  ballRadius,
  shieldMesh,
  heartsEl,
  maxHp,
  colors,
  getDamageCooldown: () => damageCooldown,
  setDamageCooldown: value => { damageCooldown = value; },
  getIsGameOver: () => isGameOver,
  getIsLevelComplete: () => isLevelComplete,
  getInvulnerabilityTimer: () => invulnerabilityTimer,
  setInvulnerabilityTimer: value => { invulnerabilityTimer = value; },
  getHasShield: () => hasShield,
  setHasShield: value => { hasShield = value; },
  getHp: () => hp,
  setHp: value => { hp = value; },
  getDamageFlashTimer: () => damageFlashTimer,
  setDamageFlashTimer: value => { damageFlashTimer = value; },
  getDamageSlowdownTimer: () => damageSlowdownTimer,
  setDamageSlowdownTimer: value => { damageSlowdownTimer = value; },
  setTimeScale: value => { timeScale = value; },
  getAcidStompImmunity: () => acidStompImmunity,
  setAcidStompImmunity: value => { acidStompImmunity = value; },
  getAcidBurnCooldown: () => acidBurnCooldown,
  setAcidBurnCooldown: value => { acidBurnCooldown = value; },
  getReloadFlashTimer: () => reloadFlashTimer,
  setReloadFlashTimer: value => { reloadFlashTimer = value; },
  getPendingInvulnerability: () => pendingInvulnerability,
  setPendingInvulnerability: value => { pendingInvulnerability = value; },
  getPendingShield: () => pendingShield,
  setPendingShield: value => { pendingShield = value; },
  spawnFloatingText,
  playBounceSound,
  playFailSound,
  startInvulnerabilityMusic,
  updateInvulnerabilityMusic,
  stopInvulnerabilityMusic,
  updateHeartsUI,
  triggerShake,
  endGame,
});

const shopRewardSystem = createShopRewardSystem({
  colors,
  maxHp,
  piercingCost,
  vampiricCost,
  comboShieldCost,
  invulnerabilityCost,
  shieldCost,
  shopPanelEl,
  shopStatusEl,
  shopTileRef: () => shopTileRef,
  shieldMesh,
  coinsEl,
  heartsEl,
  shopRefs: { shopCoinsEl, shopBulletBtn, shopHpBtn, shopArmorBtn, shopInvulnBtn, shopPiercingBtn, shopVampiricBtn, shopComboShieldBtn },
  levelCompleteRefs: { completeSummaryEl, rewardHpButton, rewardAmmoButton, rewardPiercingButton, rewardVampiricButton, rewardComboShieldButton, nextLevelButton, buyInvulnerabilityButton, buyShieldButton },
  getCoins: () => coins,
  setCoins: value => { coins = value; },
  getHp: () => hp,
  setHp: value => { hp = value; },
  getMaxAmmo: () => maxAmmo,
  setMaxAmmo: value => { maxAmmo = value; },
  setAmmo: value => { ammo = value; },
  getHasShield: () => hasShield,
  setHasShield: value => { hasShield = value; },
  getInvulnerabilityTimer: () => invulnerabilityTimer,
  setInvulnerabilityTimer: value => { invulnerabilityTimer = value; },
  getPiercingBulletsUnlocked: () => piercingBulletsUnlocked,
  setPiercingBulletsUnlocked: value => { piercingBulletsUnlocked = value; },
  getVampiricLifeUnlocked: () => vampiricLifeUnlocked,
  setVampiricLifeUnlocked: value => { vampiricLifeUnlocked = value; },
  getComboShieldUnlocked: () => comboShieldUnlocked,
  setComboShieldUnlocked: value => { comboShieldUnlocked = value; },
  getPendingInvulnerability: () => pendingInvulnerability,
  setPendingInvulnerability: value => { pendingInvulnerability = value; },
  getPendingShield: () => pendingShield,
  setPendingShield: value => { pendingShield = value; },
  getRewardChosen: () => rewardChosen,
  setRewardChosen: value => { rewardChosen = value; },
  getCurrentLevel: () => currentLevel,
  setIsPaused: value => { isPaused = value; },
  setShopTileRef: value => { shopTileRef = value; },
  setShopTilePlat: value => { shopTilePlat = value; },
  setShopUsed: value => { shopUsed = value; },
  stopShooting,
  rebuildAmmoUI,
  syncOptionsPanel,
  renderShopUI,
  renderLevelCompleteUI,
  updateCoinsUI,
  updateHeartsUI,
  playRewardSound,
  startInvulnerabilityMusic,
});

const lifecycleSystem = createLifecycleSystem({
  scene,
  world,
  ball,
  shieldMesh,
  enemies,
  platforms,
  crates,
  goldBlocks,
  cannons,
  spikeTraps,
  floaters,
  pillarLaserRings,
  pillarSpikes,
  sawBlades,
  ballStartY,
  platformOuterRadius,
  platformSpacing,
  maxHp,
  defaultMaxAmmo,
  colors,
  drag,
  scoreEl,
  levelCompleteEl,
  pausePanelEl,
  gameOverEl,
  shopStatusEl,
  getLevelTarget,
  getIsLevelComplete: () => isLevelComplete,
  getScore: () => score,
  getNextPlatformId: () => nextPlatformId,
  setScore: value => { score = value; },
  setCurrentLevel: value => { currentLevel = value; },
  setHp: value => { hp = value; },
  setCoins: value => { coins = value; },
  setMaxAmmo: value => { maxAmmo = value; },
  setAmmo: value => { ammo = value; },
  setSelectedWeapon: value => { selectedWeapon = value; },
  setPendingInvulnerability: value => { pendingInvulnerability = value; },
  setPendingShield: value => { pendingShield = value; },
  setInvulnerabilityTimer: value => { invulnerabilityTimer = value; },
  setHasShield: value => { hasShield = value; },
  setAcidStompImmunity: value => { acidStompImmunity = value; },
  setAcidBurnCooldown: value => { acidBurnCooldown = value; },
  setReloadFlashTimer: value => { reloadFlashTimer = value; },
  setRewardChosen: value => { rewardChosen = value; },
  setDamageSlowdownTimer: value => { damageSlowdownTimer = value; },
  setTimeScale: value => { timeScale = value; },
  setGrayscaleAmount: value => { grayscaleAmount = value; },
  setPiercingBulletsUnlocked: value => { piercingBulletsUnlocked = value; },
  setVampiricLifeUnlocked: value => { vampiricLifeUnlocked = value; },
  setComboShieldUnlocked: value => { comboShieldUnlocked = value; },
  setVampiricKillCount: value => { vampiricKillCount = value; },
  setComboShieldAwardedThisCombo: value => { comboShieldAwardedThisCombo = value; },
  setScoreSubmittedToLeaderboard: value => { scoreSubmittedToLeaderboard = value; },
  setBallVelocity: value => { ballVelocity = value; },
  setPlatformsPassedThisLevel: value => { platformsPassedThisLevel = value; },
  setNextPlatformId: value => { nextPlatformId = value; },
  setSpikePlatformsThisLevel: value => { spikePlatformsThisLevel = value; },
  setGroundWormsSinceTurtle: value => { groundWormsSinceTurtle = value; },
  setAcidSnailsThisLevel: value => { acidSnailsThisLevel = value; },
  setBounceVelocity: value => { bounceVelocity = value; },
  setCombo: value => { combo = value; },
  setIsGameOver: value => { isGameOver = value; },
  setIsLevelComplete: value => { isLevelComplete = value; },
  setIsPaused: value => { isPaused = value; },
  setDamageCooldown: value => { damageCooldown = value; },
  setDamageFlashTimer: value => { damageFlashTimer = value; },
  setShakeIntensity: value => { shakeIntensity = value; },
  setShakeDecay: value => { shakeDecay = value; },
  setShopTilePlat: value => { shopTilePlat = value; },
  setShopTileRef: value => { shopTileRef = value; },
  setShopUsed: value => { shopUsed = value; },
  clearPlatformBandIndex,
  clearBullets,
  disposeEnemy,
  clearParticles: () => particleSystem.clearParticles(),
  clearFloatingTexts: () => floatingTextSystem.clearFloatingTexts(),
  clearShockwaves: () => shockwaveSystem.clearShockwaves(),
  clearCoinPickups,
  clearAcidPuddles,
  deactivateAllBounceCubes,
  stopShooting,
  reloadAmmo,
  stopInvulnerabilityMusic,
  activatePendingPowerups,
  updateWeaponUI,
  updateLevelUI,
  rebuildAmmoUI,
  syncOptionsPanel,
  updatePersistentUI,
  updateLevelCompleteUI,
  createPlatform,
  ensureInitialLowerPlatformYellowWorm,
  ensureInitialLowerPlatformMushroom,
  spawnGoldBlocksForLevel,
  spawnPillarSpikesForLevel,
  spawnFloatersForLevel,
  spawnSawBladesForLevel,
  spawnPillarLaserRingsForLevel,
});

const platformLifecycleSystem = createPlatformLifecycleSystem({
  world,
  ball,
  platforms,
  enemies,
  spikeTraps,
  platformThickness,
  scoreEl,
  getScore: () => score,
  setScore: value => { score = value; },
  getPlatformsPassedThisLevel: () => platformsPassedThisLevel,
  setPlatformsPassedThisLevel: value => { platformsPassedThisLevel = value; },
  getLevelTarget,
  setBounceVelocity: value => { bounceVelocity = value; },
  updateLevelUI,
  detachBounceCubesFromPlatform,
  removeGoldBlocksForPlatform: platform => goldBlockSystem.removeGoldBlocksForPlatform(platform),
  disposeEnemy,
  removeCoinPickupsForPlatform: platformGroup => coinPickupSystem.removeCoinPickupsForPlatform(platformGroup),
  unregisterPlatformFromBand,
});

const leaderboardFlow = createLeaderboardFlow({
  finalScoreEl,
  gameOverEl,
  leaderboardPanelEl,
  leaderboardScoreLabel,
  leaderboardNameSection,
  leaderboardSubmittedEl,
  leaderboardListEl,
  leaderboardRankMsg,
  getScore: () => score,
  getIsGameOver: () => isGameOver,
  setIsGameOver: value => { isGameOver = value; },
  setScoreSubmittedToLeaderboard: value => { scoreSubmittedToLeaderboard = value; },
  getScoreSubmittedToLeaderboard: () => scoreSubmittedToLeaderboard,
  setLeaderboardPendingClose: value => { leaderboardPendingClose = value; },
  stopShooting,
  stopInvulnerabilityMusic,
  updateComboSprite,
  loadScores,
  submitScoreToLeaderboard,
  getPlayerRank,
});

function getBulletLaneAngle() {
  return Math.atan2(ball.position.z, ball.position.x);
}

function createPlatform(y, id, options = {}) {
  platformSystem.createPlatform(y, id, options);
}

function createCrate(platformGroup, angle, radius) {
  crateSystem.createCrate(platformGroup, angle, radius);
}

function spawnGoldBlocksForLevel() {
  goldBlockSystem.spawnGoldBlocksForLevel();
}

function spawnPillarSpikesForLevel() {
  obstacleSystem.spawnPillarSpikesForLevel();
}

function spawnFloatersForLevel() {
  obstacleSystem.spawnFloatersForLevel();
}

function spawnAcidPuddle(platformData, angle, radius, isDeath) {
  acidPuddleSystem.spawnAcidPuddle(platformData, angle, radius, isDeath);
}

function updateFloaters(dt) {
  obstacleSystem.updateFloaters(dt);
}

function updateAcidPuddles(dt) {
  acidPuddleSystem.updateAcidPuddles(dt);
}

function detachAcidPuddlesFromTile(platform, tile) {
  acidPuddleSystem.detachAcidPuddlesFromTile(platform, tile);
}

function clearAcidPuddles() {
  acidPuddleSystem.clearAcidPuddles();
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

function detachGroundEnemiesFromTile(platform, tile) {
  enemyUpdateSystem.detachGroundEnemiesFromTile(platform, tile);
}

function createMiniYellowWorm(platformData, id, localAngle, direction) {
  enemySpawnSystem.createMiniYellowWorm(platformData, id, localAngle, direction);
}

function createFloatingEnemyWithOptions(type, y, id, options = {}) {
  return enemySpawnSystem.createFloatingEnemyWithOptions(type, y, id, options);
}

function spawnSawBladesForLevel() {
  obstacleSystem.spawnSawBladesForLevel(sawBladesPerLevel);
}

function spawnPillarLaserRingsForLevel() {
  obstacleSystem.spawnPillarLaserRingsForLevel();
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
  comboSystem.updateComboSprite();
}

function increaseCombo() {
  comboSystem.increaseCombo();
}

function resetCombo(showLoss = true) {
  comboSystem.resetCombo(showLoss);
}

function setShootingImpulse(value) {
  optionsPanelSystem.setShootingImpulse(value);
}

function setGravity(value) {
  optionsPanelSystem.setGravity(value);
}

function setTerminalVelocity(value) {
  optionsPanelSystem.setTerminalVelocity(value);
}

function setStompImpulse(value) {
  optionsPanelSystem.setStompImpulse(value);
}

function getPlayerHitboxRadius() {
  return ballRadius * playerHitboxScale;
}

function setPlayerHitboxScale(value) {
  optionsPanelSystem.setPlayerHitboxScale(value);
}

function setCannonChargeTime(value) {
  optionsPanelSystem.setCannonChargeTime(value);
}

function setCannonCooldown(value) {
  optionsPanelSystem.setCannonCooldown(value);
}

function setLaserRingOnTime(value) {
  optionsPanelSystem.setLaserRingOnTime(value);
}

function setLaserRingOffTime(value) {
  optionsPanelSystem.setLaserRingOffTime(value);
}

function setCoinAttractionRadius(value) {
  optionsPanelSystem.setCoinAttractionRadius(value);
}

function setShotgunSpreadAngle(value) {
  optionsPanelSystem.setShotgunSpreadAngle(value);
}

function setShotgunFireInterval(value) {
  optionsPanelSystem.setShotgunFireInterval(value);
}

function syncOptionsPanel() {
  optionsPanelSystem.syncOptionsPanel();
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

function spawnBounceCubes(position, count = 3, color = 0xffc107, value = 1) {
  bounceCubeSystem.spawnBounceCubes(position, count, color, value);
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
  shockwaveSystem.explodePuffer(position);
}

function getBallColliderPositions() {
  return collisionSystem.getBallColliderPositions();
}

function getBallEnemyContact(enemy) {
  return collisionSystem.getBallEnemyContact(enemy);
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

function checkBulletCannonHit(bullet) {
  return obstacleSystem.checkBulletCannonHit(bullet);
}

function getBallCannonContact(cannon) {
  return obstacleSystem.getBallCannonContact(cannon);
}

function isSolidLineOfSightTile(tile) {
  return obstacleSystem.isSolidLineOfSightTile(tile);
}

function updateCannons(dt) {
  obstacleSystem.updateCannons(dt);
}

function updateEnemies(dt) {
  enemyUpdateSystem.updateEnemies(dt);
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
  shockwaveSystem.updateShockwaves(dt);
}

function updatePillarLaserRings(dt) {
  obstacleSystem.updatePillarLaserRings(dt);
}

function updateParticles(dt) {
  particleSystem.updateParticles(dt);
}

function spawnFloatingText(text, position, color = 0x2ecc71, followBall = false) {
  floatingTextSystem.spawnFloatingText(text, position, color, followBall);
}

function updateFloatingTexts(dt) {
  floatingTextSystem.updateFloatingTexts(dt);
}

function startLevel() {
  lifecycleSystem.startLevel();
}

function resetGame() {
  lifecycleSystem.resetGame();
}

function endGame() {
  leaderboardFlow.endGame();
}

async function showLeaderboardPanel() {
  await leaderboardFlow.showLeaderboardPanel();
}

async function submitScore(playerName) {
  await leaderboardFlow.submitScore(playerName);
}

async function fetchLeaderboard() {
  await leaderboardFlow.fetchLeaderboard();
}

function triggerShake(intensity) {
  cameraFrameSystem.triggerShake(intensity);
}

function applyDamage() {
  powerupSystem.applyDamage();
}

function updatePowerups(dt) {
  powerupSystem.updatePowerups(dt);
}

function updateBallVisual() {
  powerupSystem.updateBallVisual();
}

function activatePendingPowerups() {
  powerupSystem.activatePendingPowerups();
}

function updateShopUI() {
  shopRewardSystem.updateShopUI();
}

function openShop() {
  shopRewardSystem.openShop();
}

function closeShop() {
  shopRewardSystem.closeShop();
}

function buyShopBullet() {
  shopRewardSystem.buyShopBullet();
}

function buyShopHp() {
  shopRewardSystem.buyShopHp();
}

function buyShopArmor() {
  shopRewardSystem.buyShopArmor();
}

function buyShopInvuln() {
  shopRewardSystem.buyShopInvuln();
}

function buyShopPiercing() {
  shopRewardSystem.buyShopPiercing();
}

function buyShopVampiric() {
  shopRewardSystem.buyShopVampiric();
}

function buyShopComboShield() {
  shopRewardSystem.buyShopComboShield();
}

function updateLevelCompleteUI() {
  shopRewardSystem.updateLevelCompleteUI();
}

function completeLevel() {
  lifecycleSystem.completeLevel();
}

const _enemyWorldPosition = new THREE.Vector3();

function checkBulletPlatformHit(bullet, previousY) {
  return collisionSystem.checkBulletPlatformHit(bullet, previousY);
}

function handlePlatformUndersideCollision(previousY) {
  collisionSystem.handlePlatformUndersideCollision(previousY);
}

function handlePlatformCollision(previousY) {
  collisionSystem.handlePlatformCollision(previousY);
}

function recyclePlatforms() {
  platformLifecycleSystem.recyclePlatforms();
}

function updateCamera(dt) {
  cameraFrameSystem.updateCamera(dt);
}

function updateTileFlashes(dt) {
  updatePlatformTileFlashes(platforms, dt);
}

setupGameplayInputWiring({
  refs: {
    pauseButton, closePanelButton, extraButton, closeExtraButton, impulseAButton, impulseBButton, impulseCButton,
    impulseCFactorInput, impulseBResetInput, impulseBShotgunInput, controlAButton, controlBButton,
    twistBOffButton, twistBOnButton, flyingModeBOffButton, flyingModeBOnButton, shopBulletBtn, shopHpBtn,
    shopArmorBtn, shopInvulnBtn, shopPiercingBtn, shopVampiricBtn, shopComboShieldBtn, closeShopButton,
    shopPanelEl, levelCompleteEl, rewardHpButton, rewardAmmoButton, buyInvulnerabilityButton, buyShieldButton,
    nextLevelButton, impulseInput, leaderboardSubmitBtn, leaderboardNameInput, leaderboardCloseBtn,
    leaderboardPanelEl, fireIntervalInput, shotgunSpreadInput, shotgunIntervalInput, maxAmmoInput, gravityInput,
    terminalVelocityInput, stompImpulseInput, rewardPiercingButton, rewardVampiricButton, rewardComboShieldButton,
    hitboxScaleInput, cannonChargeInput, cannonCooldownInput, laserOnInput, laserOffInput, coinAttractionInput,
  },
  handlers: {
    togglePause: () => { if (!isGameOver) setPaused(!isPaused); },
    closePanel: () => setPaused(false),
    openExtra: () => {
      extraPanelEl.hidden = false;
      pausePanelEl.hidden = true;
      impulseBResetLabel.hidden = impulseMode !== 'B';
      impulseBShotgunLabel.hidden = impulseMode !== 'B';
      impulseCFactorLabel.hidden = impulseMode !== 'C';
      impulseAButton.classList.toggle('active', impulseMode === 'A');
      impulseBButton.classList.toggle('active', impulseMode === 'B');
      impulseCButton.classList.toggle('active', impulseMode === 'C');
    },
    closeExtra: () => {
      extraPanelEl.hidden = true;
      pausePanelEl.hidden = false;
      syncOptionsPanel();
    },
    selectImpulseA: () => {
      impulseMode = 'A';
      impulseAButton.classList.add('active');
      impulseBButton.classList.remove('active');
      impulseCButton.classList.remove('active');
      impulseBResetLabel.hidden = true;
      impulseBShotgunLabel.hidden = true;
      impulseCFactorLabel.hidden = true;
    },
    selectImpulseB: () => {
      impulseMode = 'B';
      impulseBButton.classList.add('active');
      impulseAButton.classList.remove('active');
      impulseCButton.classList.remove('active');
      impulseBResetLabel.hidden = false;
      impulseBShotgunLabel.hidden = false;
      impulseCFactorLabel.hidden = true;
    },
    selectImpulseC: () => {
      impulseMode = 'C';
      impulseCButton.classList.add('active');
      impulseAButton.classList.remove('active');
      impulseBButton.classList.remove('active');
      impulseBResetLabel.hidden = true;
      impulseBShotgunLabel.hidden = true;
      impulseCFactorLabel.hidden = false;
    },
    updateImpulseCFactor: () => {
      const val = Number(impulseCFactorInput.value);
      impulseCfactor = Number.isFinite(val) ? Math.max(0, Math.min(1, val)) : 0.9;
    },
    updateImpulseBReset: () => {
      const val = Number(impulseBResetInput.value);
      impulseBResetSpeed = Number.isFinite(val) ? Math.max(-10, Math.min(10, val)) : defaultGravity * 0.1;
    },
    updateImpulseBShotgun: () => {
      const val = Number(impulseBShotgunInput.value);
      impulseBShotgunImpulse = Number.isFinite(val) ? Math.max(0, Math.min(20, val)) : 4;
    },
    selectControlA: () => {
      controlMode = 'A';
      controlAButton.classList.add('active');
      controlBButton.classList.remove('active');
      touchPointerIds.clear();
      stopShooting();
    },
    selectControlB: () => {
      controlMode = 'B';
      controlBButton.classList.add('active');
      controlAButton.classList.remove('active');
      touchPointerIds.clear();
      stopShooting();
    },
    disableTwistB: () => { twistBMode = false; twistBOffButton.classList.add('active'); twistBOnButton.classList.remove('active'); },
    enableTwistB: () => { twistBMode = true; twistBOnButton.classList.add('active'); twistBOffButton.classList.remove('active'); },
    disableFlyingModeB: () => { flyingModeB = false; flyingModeBOffButton.classList.add('active'); flyingModeBOnButton.classList.remove('active'); },
    enableFlyingModeB: () => { flyingModeB = true; flyingModeBOnButton.classList.add('active'); flyingModeBOffButton.classList.remove('active'); },
    buyShopBullet,
    buyShopHp,
    buyShopArmor,
    buyShopInvuln,
    buyShopPiercing,
    buyShopVampiric,
    buyShopComboShield,
    closeShop,
    rewardHp: () => shopRewardSystem.rewardHp(),
    rewardAmmo: () => shopRewardSystem.rewardAmmo(),
    buyPendingInvulnerability: () => shopRewardSystem.buyPendingInvulnerability(),
    buyPendingShield: () => shopRewardSystem.buyPendingShield(),
    nextLevel: () => { if (rewardChosen) { currentLevel += 1; startLevel(); } },
    updateImpulse: () => setShootingImpulse(impulseInput.value),
    submitLeaderboard: () => submitScore(leaderboardNameInput.value),
    submitLeaderboardOnEnter: (event) => { if (event.key === 'Enter') submitScore(leaderboardNameInput.value); },
    closeLeaderboard: () => { leaderboardPanelEl.hidden = true; leaderboardPendingClose = false; },
    closeLeaderboardBackdrop: (event) => {
      if (event.target === leaderboardPanelEl) {
        leaderboardPanelEl.hidden = true;
        leaderboardPendingClose = false;
      }
    },
    updateFireInterval: () => {
      fireInterval = Math.max(0.08, Number(fireIntervalInput.value) || defaultFireInterval);
      if (isShooting && selectedWeapon === 'machinegun') fireCooldown = Math.min(fireCooldown, fireInterval);
    },
    updateShotgunSpread: () => setShotgunSpreadAngle(shotgunSpreadInput.value),
    updateShotgunInterval: () => setShotgunFireInterval(shotgunIntervalInput.value),
    updateMaxAmmo: () => optionsPanelSystem.setMaxAmmo(maxAmmoInput.value),
    updateGravity: () => setGravity(gravityInput.value),
    updateTerminalVelocity: () => setTerminalVelocity(terminalVelocityInput.value),
    updateStompImpulse: () => setStompImpulse(stompImpulseInput.value),
    rewardPiercing: () => shopRewardSystem.rewardPiercing(),
    rewardVampiric: () => shopRewardSystem.rewardVampiric(),
    rewardComboShield: () => shopRewardSystem.rewardComboShield(),
    updateHitboxScale: () => setPlayerHitboxScale(hitboxScaleInput.value),
    updateCannonCharge: () => setCannonChargeTime(cannonChargeInput.value),
    updateCannonCooldown: () => setCannonCooldown(cannonCooldownInput.value),
    updateLaserOn: () => setLaserRingOnTime(laserOnInput.value),
    updateLaserOff: () => setLaserRingOffTime(laserOffInput.value),
    updateCoinAttraction: () => setCoinAttractionRadius(coinAttractionInput.value),
  },
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
const gameLoop = createGameLoop({
  clock,
  scene,
  camera,
  renderer,
  world,
  ball,
  drag,
  getDamageSlowdownTimer: () => damageSlowdownTimer,
  setDamageSlowdownTimer: value => { damageSlowdownTimer = value; },
  getTimeScale: () => timeScale,
  setTimeScale: value => { timeScale = value; },
  getScaledTime: () => scaledTime,
  setScaledTime: value => { scaledTime = value; },
  getIsPaused: () => isPaused,
  getIsGameOver: () => isGameOver,
  getIsLevelComplete: () => isLevelComplete,
  getBallVelocity: () => ballVelocity,
  setBallVelocity: value => { ballVelocity = value; },
  getGravity: () => gravity,
  getTerminalVelocity: () => terminalVelocity,
  updateDamageFrame: realDt => cameraFrameSystem.updateDamageFrame(realDt),
  updateSteamDeckMode: () => steamDeckMode.update(),
  updateShooting,
  updatePowerups,
  integrateBallPhysics,
  checkBallCrateHit,
  checkBallGoldBlockStomp,
  handlePlatformUndersideCollision,
  handlePlatformCollision,
  updateSpikeTraps,
  updatePillarSpikes,
  updateSawBlades,
  updatePillarLaserRings,
  updateBullets,
  updateEnemies,
  updateFloaters,
  updateAcidPuddles,
  updateShockwaves,
  updateCannons,
  updateGoldBlocks,
  updateFallingCratesAndGold,
  updateCoinPickups,
  updateParticles,
  updateBounceCubes,
  recyclePlatforms,
  updateFloatingTexts,
  updateComboPosition: () => comboSystem.updateComboPosition(),
  updateTileFlashes,
  updateCamera,
  updateBallVisual,
});

rebuildAmmoUI();
syncOptionsPanel();
resetGame();
renderer.setAnimationLoop(() => gameLoop.animate());
