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
  makeArcGeometry, angleInArc, isBlueTile, isFlashablePlatformTile,
} from './core/utils.js';
import {
  playBounceSound, playFailSound, playShootSound, playEmptyAmmoSound,
  playReloadSound, playBatDeathSound, playCannonActivateSound,
  playCannonFireSound, playRewardSound, playCoinCubeCollectSound,
  playGlassBreakSound, playPufferExplosionSound, playMetallicBlipSound,
  playAcidBurnSound, startInvulnerabilityMusic, updateInvulnerabilityMusic,
  stopInvulnerabilityMusic,
} from './systems/audio.js';
import { updateHeartsUI, updateCoinsUI } from './systems/ui.js';
import { setupInputListeners } from './systems/input.js';

const JSONBIN_BIN_ID = '69fd1176adc21f119a6b5071';
const JSONBIN_ACCESS_KEY = '$2a$10$rijn8M9JPA3wdQtJMc2IW.I3kZD/s1BYr1SePS8O9lrB2x78LhL92';

async function jsonbinFetch(endpoint, options = {}) {
  const url = `https://api.jsonbin.io/v3/${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Access-Key': JSONBIN_ACCESS_KEY
  };
  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  return response.json();
}

async function loadScores() {
  try {
    const data = await jsonbinFetch(`b/${JSONBIN_BIN_ID}/latest`);
    return data.record?.scores || [];
  } catch {
    return [];
  }
}

async function saveScores(scores) {
  await jsonbinFetch(`b/${JSONBIN_BIN_ID}`, {
    method: 'PUT',
    body: JSON.stringify({ scores })
  });
}

async function submitScoreToLeaderboard(playerName, playerScore) {
  const scores = await loadScores();
  scores.push({
    name: playerName.trim().toUpperCase().substring(0, 12),
    score: playerScore,
    timestamp: Date.now()
  });
  scores.sort((a, b) => b.score - a.score);
  scores.splice(20);
  await saveScores(scores);
}

async function getPlayerRank(playerName, playerScore) {
  const scores = await loadScores();
  const rank = scores.findIndex(s => s.name === playerName.trim().toUpperCase().substring(0, 12) && s.score === playerScore) + 1;
  return rank > 0 ? rank : scores.length + 1;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeef7ff);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 240);
camera.position.set(0, 6.2, 10.5);
camera.lookAt(0, -2.2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

const scoreEl = document.querySelector('#score');
const heartsEl = document.querySelector('#hearts');
const coinsEl = document.querySelector('#coins');
const levelLabelEl = document.querySelector('#level-label');
const progressFillEl = document.querySelector('#progress-fill');
const progressLabelEl = document.querySelector('#progress-label');
const gameOverEl = document.querySelector('#game-over');
const finalScoreEl = document.querySelector('#final-score');
const ammoMagazineEl = document.querySelector('#ammo-magazine');
const weaponIndicatorEl = document.querySelector('#weapon-indicator');
const pauseButton = document.querySelector('#pause-button');
const pausePanelEl = document.querySelector('#pause-panel');
const closePanelButton = document.querySelector('#close-panel-button');
const impulseInput = document.querySelector('#impulse-input');
const fireIntervalInput = document.querySelector('#fire-interval-input');
const shotgunSpreadInput = document.querySelector('#shotgun-spread-input');
const shotgunIntervalInput = document.querySelector('#shotgun-interval-input');
const maxAmmoInput = document.querySelector('#max-ammo-input');
const gravityInput = document.querySelector('#gravity-input');
const terminalVelocityInput = document.querySelector('#terminal-velocity-input');
const stompImpulseInput = document.querySelector('#stomp-impulse-input');
const hitboxScaleInput = document.querySelector('#hitbox-scale-input');
const cannonChargeInput = document.querySelector('#cannon-charge-input');
const cannonCooldownInput = document.querySelector('#cannon-cooldown-input');
const laserOnInput = document.querySelector('#laser-on-input');
const laserOffInput = document.querySelector('#laser-off-input');
const coinAttractionInput = document.querySelector('#coin-attraction-input');
const levelCompleteEl = document.querySelector('#level-complete');
const completeSummaryEl = document.querySelector('#complete-summary');
const rewardHpButton = document.querySelector('#reward-hp');
const rewardAmmoButton = document.querySelector('#reward-ammo');
const rewardPiercingButton = document.querySelector('#reward-piercing');
const rewardVampiricButton = document.querySelector('#reward-vampiric');
const rewardComboShieldButton = document.querySelector('#reward-combo-shield');
const buyInvulnerabilityButton = document.querySelector('#buy-invulnerability');
const buyShieldButton = document.querySelector('#buy-shield');
const shopStatusEl = document.querySelector('#shop-status');
const nextLevelButton = document.querySelector('#next-level-button');
const extraButton = document.querySelector('#extra-button');
const extraPanelEl = document.querySelector('#extra-panel');
const closeExtraButton = document.querySelector('#close-extra-button');
const impulseAButton = document.querySelector('#impulse-a-btn');
const impulseBButton = document.querySelector('#impulse-b-btn');
const impulseCButton = document.querySelector('#impulse-c-btn');
const impulseBResetInput = document.querySelector('#impulse-b-reset-input');
const impulseBShotgunInput = document.querySelector('#impulse-b-shotgun-input');
const impulseBResetLabel = document.querySelector('#impulse-b-reset-label');
const impulseBShotgunLabel = document.querySelector('#impulse-b-shotgun-label');
const impulseCFactorLabel = document.querySelector('#impulse-c-factor-label');
const impulseCFactorInput = document.querySelector('#impulse-c-factor-input');
const controlAButton = document.querySelector('#control-a-btn');
const controlBButton = document.querySelector('#control-b-btn');
const twistBOffButton = document.querySelector('#twist-b-off-btn');
const twistBOnButton = document.querySelector('#twist-b-on-btn');
const shopPanelEl = document.querySelector('#shop-panel');
const shopCoinsEl = document.querySelector('#shop-coins');
const shopBulletBtn = document.querySelector('#shop-bullet');
const shopHpBtn = document.querySelector('#shop-hp');
const shopArmorBtn = document.querySelector('#shop-armor');
const shopInvulnBtn = document.querySelector('#shop-invuln');
const shopPiercingBtn = document.querySelector('#shop-piercing');
const shopVampiricBtn = document.querySelector('#shop-vampiric');
const shopComboShieldBtn = document.querySelector('#shop-combo-shield');
const closeShopButton = document.querySelector('#close-shop-button');
const arModeButton = document.querySelector('#ar-mode-button');
const arStatusEl = document.querySelector('#ar-status');
const leaderboardPanelEl = document.querySelector('#leaderboard-panel');
const leaderboardNameSection = document.querySelector('#leaderboard-name-section');
const leaderboardNameInput = document.querySelector('#leaderboard-name-input');
const leaderboardSubmitBtn = document.querySelector('#leaderboard-submit-btn');
const leaderboardScoreLabel = document.querySelector('#leaderboard-score-label');
const leaderboardSubmittedEl = document.querySelector('#leaderboard-submitted');
const leaderboardRankMsg = document.querySelector('#leaderboard-rank-msg');
const leaderboardListEl = document.querySelector('#leaderboard-list');
const leaderboardCloseBtn = document.querySelector('#leaderboard-close-btn');

let scoreSubmittedToLeaderboard = false;
let leaderboardPendingClose = false;
let gameOverScreenShown = false;

const world = new THREE.Group();
scene.add(world);

const floaterDiscGeometry = new THREE.CylinderGeometry(ballRadius * 1.4, ballRadius * 1.4, 0.1, 16);
const floaterMaterial = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.6, metalness: 0.1 });

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
let impulseMode = 'A';
let impulseBResetSpeed = defaultGravity * 0.1;
let impulseBShotgunImpulse = 4;
let impulseCfactor = 0.9;
let controlMode = 'A';
let twistBMode = false;
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

const pillar = new THREE.Mesh(
  new THREE.CylinderGeometry(pillarRadius, pillarRadius, 80, 48),
  new THREE.MeshStandardMaterial({ color: colors.pillar, roughness: 0.55 })
);
pillar.position.y = -30;
pillar.receiveShadow = true;
world.add(pillar);

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(ballRadius, 32, 24),
  new THREE.MeshStandardMaterial({ color: colors.ball, roughness: 0.35, metalness: 0.05 })
);
ball.position.set(0, ballStartY, platformOuterRadius - 0.8);
ball.castShadow = true;
scene.add(ball);

const bulletGeometry = new THREE.SphereGeometry(0.095, 16, 12);
const bulletMaterial = new THREE.MeshBasicMaterial({ color: colors.bullet });
const batBodyGeometry = new THREE.SphereGeometry(0.18, 16, 10);
const batWingGeometry = new THREE.BoxGeometry(0.46, 0.045, 0.2);
const spikeBodyGeometry = new THREE.SphereGeometry(0.28, 20, 14);
const spikeConeGeometry = new THREE.ConeGeometry(0.075, 0.28, 10);
const particleGeometry = new THREE.SphereGeometry(0.045, 8, 6);
const bounceCubeGeometry = new THREE.BoxGeometry(0.14, 0.14, 0.14);
const crateGeometry = new THREE.BoxGeometry(0.34, 0.34, 0.34);
const goldBlockGeometry = new THREE.BoxGeometry(goldBlockSize, goldBlockSize, goldBlockSize);
const ledgeGeometry = new THREE.BoxGeometry(ledgeRadialLength, 0.18, 0.72);
const pillarSpikeGeometry = new THREE.ConeGeometry(0.14, ledgeRadialLength, 4);
const wormHeadGeometry = new THREE.SphereGeometry(0.18, 14, 10);
const wormSegmentGeometry = new THREE.SphereGeometry(0.15, 14, 10);
const turtleBodyGeometry = new THREE.SphereGeometry(0.22, 16, 12);
const turtleShellGeometry = new THREE.SphereGeometry(0.28, 18, 12);
const turtleSpikeGeometry = new THREE.ConeGeometry(0.055, 0.18, 8);
const jellyfishBodyGeometry = new THREE.SphereGeometry(0.24, 18, 12);
const jellyfishTentacleGeometry = new THREE.CylinderGeometry(0.018, 0.012, 0.38, 6);
const pufferBodyGeometry = new THREE.SphereGeometry(0.25, 18, 12);
const porcupineBodyGeometry = new THREE.SphereGeometry(0.25, 16, 12);
const acidPuddleGeometry = new THREE.CircleGeometry(0.22, 20);
const acidDropletGeometry = new THREE.SphereGeometry(0.1, 10, 8);
const acidSnailBodyGeometry = new THREE.SphereGeometry(0.22, 14, 10);
const acidSnailShellGeometry = new THREE.SphereGeometry(0.28, 16, 12);
const shockwaveGeometry = new THREE.SphereGeometry(1, 24, 16);
const pillarLaserRingGeometry = new THREE.TorusGeometry(gameplayLaneRadius, 0.035, 8, 96);
const coinPickupGeometry = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16);
const coinPickupMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xb8860b, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.7 });
const shieldGeometry = new THREE.BoxGeometry(0.42, 0.14, 0.42);
const cannonBaseGeometry = new THREE.CylinderGeometry(0.18, 0.24, 0.22, 16);
const cannonMouthGeometry = new THREE.CylinderGeometry(0.11, 0.13, 0.34, 16);
const cannonRingGeometry = new THREE.TorusGeometry(0.2, 0.018, 8, 32);
const cannonLaserGeometry = new THREE.CylinderGeometry(0.11, 0.11, 36, 16);
const sawBladeShape = new THREE.Shape();
for (let i = 0; i <= 32; i += 1) {
  const angle = (i / 32) * twoPi;
  const radius = i % 2 === 0 ? sawBladeOuterRadius : sawBladeOuterRadius * 0.76;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  if (i === 0) sawBladeShape.moveTo(x, y);
  else sawBladeShape.lineTo(x, y);
}
const sawBladeHole = new THREE.Path();
sawBladeHole.absarc(0, 0, sawBladeInnerRadius, 0, twoPi, false);
sawBladeShape.holes.push(sawBladeHole);
const sawBladeGeometry = new THREE.ExtrudeGeometry(sawBladeShape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1 });
sawBladeGeometry.center();
const batBodyMaterial = new THREE.MeshStandardMaterial({ color: colors.bat, roughness: 0.62 });
const batWingMaterial = new THREE.MeshStandardMaterial({ color: colors.batWing, roughness: 0.7 });
const spikeMaterial = new THREE.MeshStandardMaterial({ color: colors.spike, roughness: 0.55 });
const crateMaterial = new THREE.MeshStandardMaterial({ color: colors.crate, roughness: 0.72 });
const goldBlockMaterial = new THREE.MeshStandardMaterial({ color: colors.gold, emissive: 0x8a5a00, emissiveIntensity: 0.25, roughness: 0.28, metalness: 0.65 });
const ledgeMaterial = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.58, metalness: 0.05 });
const spikeHoleGeometry = new THREE.BoxGeometry(0.26, 0.018, 0.26);
const platformSpikeGeometry = new THREE.ConeGeometry(0.16, platformSpikeHeight, 4);
const spikeHoleMaterial = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.82 });
const platformSpikeMaterial = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.48, metalness: 0.08 });
const pillarSpikeMaterial = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.48, metalness: 0.08 });
const wormMaterial = new THREE.MeshStandardMaterial({ color: colors.worm, roughness: 0.5, metalness: 0.08 });
const wormHeadMaterial = new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.45, metalness: 0.08 });
const turtleBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.5, metalness: 0.05 });
const turtleShellMaterial = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0x7a0000, emissiveIntensity: 0.18, roughness: 0.44, metalness: 0.08 });
const jellyfishMaterial = new THREE.MeshStandardMaterial({ color: 0x9c27b0, emissive: 0x4a148c, emissiveIntensity: 0.28, roughness: 0.36, transparent: true, opacity: 0.82 });
const pufferMaterial = new THREE.MeshStandardMaterial({ color: 0xffc107, emissive: 0xff6f00, emissiveIntensity: 0.22, roughness: 0.48 });
const porcupineMaterial = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.56, metalness: 0.04 });
const porcupineSpikeMaterial = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.48, metalness: 0.08 });
const acidPuddleMaterial = new THREE.MeshStandardMaterial({ color: colors.acid, emissive: 0x2e7d32, emissiveIntensity: 0.45, roughness: 0.6, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
const acidSnailBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.55, metalness: 0.05 });
const acidSnailShellMaterial = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.5, metalness: 0.08 });
const acidSnailCrackedShellMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.5, metalness: 0.08, emissive: 0x3e2723, emissiveIntensity: 0.3 });
const shockwaveMaterial = new THREE.MeshBasicMaterial({ color: 0xff9800, transparent: true, opacity: 0.42, wireframe: true, depthWrite: false });
const pillarLaserRingMaterial = new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.72 });
const cannonMaterial = new THREE.MeshStandardMaterial({ color: 0x607d8b, roughness: 0.45, metalness: 0.35 });
const cannonWarningMaterial = new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.85 });
const laserMaterial = new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.65 });
const shieldMaterial = new THREE.MeshStandardMaterial({ color: 0x80deea, emissive: 0x00bcd4, emissiveIntensity: 0.35 });
const sawBladeMaterial = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0x8b0000, emissiveIntensity: 0.28, roughness: 0.34, metalness: 0.65 });

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

function makeCrackLine(startAngle, endAngle) {
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

function makeGrayCrackLines(startAngle, endAngle, stage) {
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

function shouldCreateSpikePlatform(id, isFinal) {
  if (isFinal || id <= 1) return false;
  const target = getLevelTarget();
  const required = Math.ceil(target * 0.1);
  if (spikePlatformsThisLevel >= required) return Math.random() < 0.045;
  const remainingNonFinalPlatforms = Math.max(0, target - id);
  const remainingRequired = required - spikePlatformsThisLevel;
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
  spikePlatformsThisLevel += 1;
}

function maybeCreateSpikeTrap(platformGroup, tiles, id, isFinal) {
  if (!shouldCreateSpikePlatform(id, isFinal)) return;
  const validTiles = tiles.filter(tile => tile.type === 'blue' && !tile.broken && !tile.spikeTrap);
  if (!validTiles.length) return;
  createSpikeTrap(platformGroup, validTiles[Math.floor(Math.random() * validTiles.length)]);
}

function getPlatformTileColor(type) {
  if (type === 'red') return colors.red;
  if (type === 'finish') return colors.finish;
  if (type === 'gray') return colors.gray;
  if (type === 'shop') return colors.shop;
  return colors.blue;
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

  if (!isFinal && !shopTilePlat && id === 3) {
    const shopTile = tiles.find(t => t.type === 'blue' && !t.broken && !t.spikeTrap);
    if (shopTile) {
      shopTile.type = 'shop';
      shopTile.material.color.setHex(colors.shop);
      shopTilePlat = { id, group };
      shopTileRef = shopTile;

      const shopAngle = (shopTile.start + shopTile.end) / 2;
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
      group.add(signMesh);
    }
  }

  world.add(group);
  const platData = { id, group, tiles, scored: false, final: isFinal };
  platforms.push(platData);
  registerPlatformInBand(platData);

  if (!isFinal) maybeSpawnEnemiesForSection(platData, id);
  if (!isFinal) maybeSpawnCannon(platData, id);
}

function createCrate(platformGroup, angle, radius) {
  const mesh = new THREE.Mesh(crateGeometry.clone(), crateMaterial.clone());
  mesh.position.set(
    Math.cos(angle) * radius,
    platformThickness / 2 + 0.22,
    Math.sin(angle) * radius
  );
  mesh.rotation.y = angle;
  platformGroup.add(mesh);
  crates.push({ mesh, platformGroup, value: 5, broken: false, falling: false, fallVelocity: 0 });
}

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
    crate.mesh.getWorldPosition(_crateWorldPosition);
    if (_crateWorldPosition.distanceTo(worldPosition) < minDistance) return false;
  }

  for (const cannon of cannons) {
    if (cannon.platformData !== platformData) continue;
    if (getCannonWorldPosition(cannon).distanceTo(worldPosition) < minDistance) return false;
  }

  for (const enemy of enemies) {
    const enemyPosition = enemy.type === 'pillarWorm' ? enemy.collisionPosition : enemy.group.position;
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

function createPillarSpike(y, angle) {
  const group = new THREE.Group();
  group.position.set(Math.cos(angle) * pillarRadius, y, Math.sin(angle) * pillarRadius);
  group.rotation.y = -angle;

  const mesh = new THREE.Mesh(pillarSpikeGeometry.clone(), pillarSpikeMaterial.clone());
  mesh.rotation.z = -Math.PI / 2;
  mesh.position.x = ledgeRadialLength / 2;
  mesh.castShadow = true;
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

function createFloater(y, angle) {
  const mesh = new THREE.Mesh(floaterDiscGeometry, floaterMaterial.clone());
  mesh.position.set(
    Math.cos(angle) * gameplayLaneRadius,
    y,
    Math.sin(angle) * gameplayLaneRadius
  );
  mesh.castShadow = true;
  world.add(mesh);
  floaters.push({ mesh, angle, y, used: false });
}

function spawnFloatersForLevel() {
  const target = getLevelTarget();
  const intervalCount = Math.max(1, target - 1);
  const usedIntervals = new Set();

  while (usedIntervals.size < Math.min(24, intervalCount)) {
    usedIntervals.add(1 + Math.floor(Math.random() * intervalCount));
  }

  for (const interval of usedIntervals) {
    const y = -(interval + 0.35 + Math.random() * 0.3) * platformSpacing;
    const angle = Math.random() * twoPi;
    createFloater(y, angle);
  }
}

function createBatMesh() {
  const group = new THREE.Group();
  group.scale.setScalar(1.105);
  const body = new THREE.Mesh(batBodyGeometry, batBodyMaterial.clone());
  body.scale.set(1, 0.72, 1.25);
  group.add(body);

  const leftWing = new THREE.Mesh(batWingGeometry, batWingMaterial.clone());
  const rightWing = new THREE.Mesh(batWingGeometry, batWingMaterial.clone());
  leftWing.position.x = -0.32;
  rightWing.position.x = 0.32;
  leftWing.rotation.z = -0.28;
  rightWing.rotation.z = 0.28;
  group.add(leftWing, rightWing);

  return { group, leftWing, rightWing };
}

function createSpikedBallMesh() {
  const group = new THREE.Group();
  const material = spikeMaterial.clone();
  const body = new THREE.Mesh(spikeBodyGeometry, material);
  group.add(body);

  const directions = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0.7, 0.45, 0.45).normalize(),
    new THREE.Vector3(-0.7, -0.45, -0.45).normalize(),
  ];

  for (const direction of directions) {
    const spike = new THREE.Mesh(spikeConeGeometry, material);
    spike.position.copy(direction).multiplyScalar(0.35);
    spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    group.add(spike);
  }

  return { group, material };
}

function createWormMesh() {
  const group = new THREE.Group();
  const segments = [];
  for (let i = 0; i < 4; i += 1) {
    const geometry = i === 0 ? wormHeadGeometry : wormSegmentGeometry;
    const material = i === 0 ? wormHeadMaterial.clone() : wormMaterial.clone();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = -i * 0.24;
    mesh.scale.y = 0.62;
    mesh.castShadow = true;
    group.add(mesh);
    segments.push(mesh);
  }
  return { group, segments };
}

function createTurtleMesh() {
  const group = new THREE.Group();
  const materials = [];

  const bodyMaterial = turtleBodyMaterial.clone();
  const shellMaterial = turtleShellMaterial.clone();
  materials.push(bodyMaterial, shellMaterial);

  const body = new THREE.Mesh(turtleBodyGeometry, bodyMaterial);
  body.scale.set(1.35, 0.42, 0.9);
  body.position.y = -0.02;
  body.castShadow = true;
  group.add(body);

  const shell = new THREE.Mesh(turtleShellGeometry, shellMaterial);
  shell.scale.set(1.08, 0.58, 0.95);
  shell.position.y = 0.08;
  shell.castShadow = true;
  group.add(shell);

  const head = new THREE.Mesh(wormHeadGeometry, bodyMaterial);
  head.scale.set(0.7, 0.58, 0.7);
  head.position.set(0.33, 0.03, 0);
  head.castShadow = true;
  group.add(head);

  const spikePositions = [
    [-0.18, 0.3, 0],
    [0.02, 0.34, -0.12],
    [0.02, 0.34, 0.12],
    [0.22, 0.28, 0],
  ];
  for (const [x, y, z] of spikePositions) {
    const spike = new THREE.Mesh(turtleSpikeGeometry, shellMaterial);
    spike.position.set(x, y, z);
    spike.castShadow = true;
    group.add(spike);
  }

  return { group, materials };
}

function createJellyfishMesh() {
  const group = new THREE.Group();
  const material = jellyfishMaterial.clone();
  const body = new THREE.Mesh(jellyfishBodyGeometry, material);
  body.scale.set(1, 0.7, 1);
  body.castShadow = true;
  group.add(body);
  for (let i = 0; i < 5; i += 1) {
    const tentacle = new THREE.Mesh(jellyfishTentacleGeometry, material);
    const angle = (i / 5) * twoPi;
    tentacle.position.set(Math.cos(angle) * 0.12, -0.25, Math.sin(angle) * 0.12);
    group.add(tentacle);
  }
  return { group, material };
}

function createPufferBombMesh() {
  const group = new THREE.Group();
  const material = pufferMaterial.clone();
  const body = new THREE.Mesh(pufferBodyGeometry, material);
  body.castShadow = true;
  group.add(body);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * twoPi;
    const spike = new THREE.Mesh(turtleSpikeGeometry, material);
    const dir = new THREE.Vector3(Math.cos(angle), 0.2, Math.sin(angle)).normalize();
    spike.position.copy(dir).multiplyScalar(0.24);
    spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    group.add(spike);
  }
  return { group, material };
}

function createPorcupineMesh() {
  const group = new THREE.Group();
  const material = porcupineMaterial.clone();
  const spikeMaterial = porcupineSpikeMaterial.clone();
  const body = new THREE.Mesh(porcupineBodyGeometry, material);
  body.scale.set(1.25, 0.55, 0.8);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(wormHeadGeometry, material);
  head.scale.set(0.72, 0.62, 0.72);
  head.position.set(0.28, 0.03, 0);
  head.castShadow = true;
  group.add(head);

  const spikes = [];
  for (let i = 0; i < 7; i += 1) {
    const spike = new THREE.Mesh(turtleSpikeGeometry, spikeMaterial);
    const x = -0.22 + i * 0.075;
    spike.position.set(x, 0.18 + Math.sin(i) * 0.025, (i % 2 === 0 ? -1 : 1) * 0.09);
spike.rotation.z = 0;
    spike.visible = false;
    group.add(spike);
    spikes.push(spike);
  }
  return { group, material, spikeMaterial, spikes };
}

function createAcidSnailMesh() {
  const group = new THREE.Group();
  const bodyMaterial = acidSnailBodyMaterial.clone();
  const body = new THREE.Mesh(acidSnailBodyGeometry, bodyMaterial);
  body.scale.set(1, 0.6, 1.3);
  body.position.set(0.12, 0.05, 0);
  body.castShadow = true;
  group.add(body);

  const shellMaterial = acidSnailShellMaterial.clone();
  const shell = new THREE.Mesh(acidSnailShellGeometry, shellMaterial);
  shell.scale.set(1, 0.7, 1);
  shell.position.set(-0.05, 0.1, 0);
  shell.castShadow = true;
  group.add(shell);

  const eyeGeo = new THREE.SphereGeometry(0.04, 8, 6);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.3 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(0.26, 0.1, 0.07);
  group.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat.clone());
  eyeR.position.set(0.26, 0.1, -0.07);
  group.add(eyeR);

  return { group, bodyMaterial, shellMaterial, shell };
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
  if (ballVelocity >= 0) return;

  const bottomY = ball.position.y - ballRadius;
  const previousBottomY = bottomY - ballVelocity * dt;

  for (let i = floaters.length - 1; i >= 0; i -= 1) {
    const floater = floaters[i];
    if (floater.used) continue;

    const worldPos = floater.mesh.getWorldPosition(_floaterWorldPos);
    const fY = worldPos.y;
    const floaterTop = fY + 0.05;

    if (previousBottomY > floaterTop && bottomY <= floaterTop) {
      const dx = ball.position.x - worldPos.x;
      const dz = ball.position.z - worldPos.z;
      const radialDist = Math.hypot(dx, dz);
      if (radialDist <= ballRadius) {
        floater.used = true;
        spawnExplosion(worldPos.clone(), 0x9e9e9e, 8);
        world.remove(floater.mesh);
        floater.mesh.geometry.dispose();
        floaters.splice(i, 1);
        ballVelocity = Math.max(ballVelocity, stompImpulse);
        if (reloadAmmo()) {
          spawnFloatingText('Reload', ball.position);
          playReloadSound();
        }
        playBounceSound();
        continue;
      }
    }

    if (worldPos.y > ball.position.y + 15) {
      world.remove(floater.mesh);
      floater.mesh.geometry.dispose();
      floaters.splice(i, 1);
    }
  }
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
        const enemyPos = enemy.type === 'pillarWorm' ? enemy.collisionPosition : enemy.group.position;
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
  const snail = createAcidSnailMesh();
  const start = tile.start + (tile.end - tile.start) * (0.25 + Math.random() * 0.5);
  const enemy = {
    type: 'acidSnail',
    id,
    group: snail.group,
    bodyMaterial: snail.bodyMaterial,
    shellMaterial: snail.shellMaterial,
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

function createCannonMesh() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(cannonBaseGeometry.clone(), cannonMaterial.clone());
  base.position.y = 0.11;
  base.castShadow = true;
  group.add(base);

  const mouth = new THREE.Mesh(cannonMouthGeometry.clone(), cannonMaterial.clone());
  mouth.position.y = 0.34;
  mouth.castShadow = true;
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

  const playerLane = ((getBulletLaneAngle() - world.rotation.y) % twoPi + twoPi) % twoPi;
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
  });
}

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

    enemy.interactable = true;
    enemy.collisionPosition.set(
      Math.cos(enemy.localAngle) * gameplayLaneRadius,
      0,
      Math.sin(enemy.localAngle) * gameplayLaneRadius
    );
    enemy.group.localToWorld(enemy.collisionPosition);
    return;
  }

  if (enemy.type === 'worm' || enemy.type === 'turtle' || enemy.type === 'porcupine' || enemy.type === 'acidSnail') {
    const localPosition = _enemyLocalPosition.set(
      Math.cos(enemy.localAngle) * enemy.orbitRadius,
      platformThickness / 2 + 0.2,
      Math.sin(enemy.localAngle) * enemy.orbitRadius
    );
    enemy.platformData.group.localToWorld(localPosition);
    enemy.group.position.copy(localPosition);
    enemy.group.rotation.y = world.rotation.y - enemy.localAngle + Math.PI / 2;
    return;
  }

  enemy.group.position.set(
    Math.cos(enemy.angle) * enemy.orbitRadius,
    enemy.y,
    Math.sin(enemy.angle) * enemy.orbitRadius
  );
  enemy.group.rotation.y = -enemy.angle + Math.PI / 2;
}

function createBat(y, id) {
  const bat = createBatMesh();
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
    orbitRadius: getBulletLaneRadius(),
    speed: (0.55 + Math.random() * 0.75) * 0.6,
    collisionRadius: 0.38,
    flapOffset: Math.random() * twoPi,
  };
  positionEnemy(enemy);
  if (twistBMode) {
    enemy.angle -= world.rotation.y;
    world.add(enemy.group);
  } else {
    scene.add(enemy.group);
  }
  enemies.push(enemy);
}

function createSpikedBall(y, id) {
  const spike = createSpikedBallMesh();
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
    orbitRadius: getBulletLaneRadius(),
    speed: 0.2 + Math.random() * 0.35,
    collisionRadius: 0.43,
    hp: 3,
    flashTimer: 0,
  };
  positionEnemy(enemy);
  if (twistBMode) {
    enemy.angle -= world.rotation.y;
    world.add(enemy.group);
  } else {
    scene.add(enemy.group);
  }
  enemies.push(enemy);
}

function isWormTile(tile) {
  return !tile.broken && !tile.spikeTrap && (tile.type === 'blue' || tile.type === 'red' || tile.type === 'gray' || tile.type === 'crackedBlue');
}

function isWormAngleValid(platformData, angle) {
  return platformData.tiles.some(tile => isWormTile(tile) && angleInArc((angle + twoPi) % twoPi, tile.start, tile.end));
}

function isWormBodySupported(platformData, angle, radius) {
  const segmentSpacing = 0.24 / radius;
  for (let i = -1; i <= 4; i += 1) {
    const forwardAngle = angle + i * segmentSpacing;
    const backwardAngle = angle - i * segmentSpacing;
    if (!isWormAngleValid(platformData, forwardAngle)) return false;
    if (!isWormAngleValid(platformData, backwardAngle)) return false;
  }
  return true;
}

function isGroundEnemy(enemy) {
  return enemy.type === 'worm' || enemy.type === 'turtle' || enemy.type === 'porcupine' || enemy.type === 'acidSnail';
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

    _enemyFallLocalPosition.copy(enemy.group.position);
    _enemyFallLocalPosition.y = platformTop + groundEnemyFootOffset;
    const tile = getTileAtWorldPoint(platform, _enemyFallLocalPosition);
    if (!tile || !isWormTile(tile)) continue;

    platform.group.worldToLocal(_enemyFallLocalPosition);
    enemy.platformData = platform;
    enemy.localAngle = (Math.atan2(_enemyFallLocalPosition.z, _enemyFallLocalPosition.x) + twoPi) % twoPi;
    enemy.angle = enemy.localAngle;
    enemy.orbitRadius = THREE.MathUtils.clamp(Math.hypot(_enemyFallLocalPosition.x, _enemyFallLocalPosition.z), platformInnerRadius + 0.12, platformOuterRadius - 0.12);
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

function createWorm(platformData, id, tile) {
  const worm = createWormMesh();
  const start = tile.start + (tile.end - tile.start) * (0.25 + Math.random() * 0.5);
  const enemy = {
    type: 'worm',
    id,
    group: worm.group,
    segments: worm.segments,
    platformData,
    y: platformData.group.position.y + platformThickness / 2 + 0.2,
    localAngle: start,
    angle: start,
    direction: Math.random() < 0.5 ? 1 : -1,
    orbitRadius: (platformInnerRadius + platformOuterRadius) / 2 + (Math.random() - 0.5) * 0.35,
    speed: 0.45 + Math.random() * 0.45,
    collisionRadius: 0.34,
    hp: 3,
    flashTimer: 0,
  };
  positionEnemy(enemy);
  scene.add(enemy.group);
  enemies.push(enemy);
}

function createPillarWorm(y, id) {
  const worm = createWormMesh();
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
    visualRadius: pillarRadius + 0.34,
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
  const built = isJellyfish ? createJellyfishMesh() : createPufferBombMesh();
  const arcSpan = 0.95 + Math.random() * 0.35;
  const arcCenter = getBulletLaneAngle();
  const angle = arcCenter + (Math.random() - 0.5) * arcSpan;
  const enemy = {
    type,
    id,
    group: built.group,
    material: built.material,
    y,
    baseY: y,
    angle: options.angle ?? angle,
    arcCenter,
    arcSpan: options.arcSpan ?? arcSpan,
    direction: Math.random() < 0.5 ? 1 : -1,
    orbitRadius: options.orbitRadius ?? getBulletLaneRadius() + (Math.random() - 0.5) * 0.25,
    speed: options.speed ?? (isJellyfish ? 0.28 + Math.random() * 0.28 : 0.18 + Math.random() * 0.2),
    collisionRadius: options.collisionRadius ?? (isJellyfish ? 0.34 : 0.38),
    hp: options.hp ?? (isJellyfish ? 2 : 2),
    flashTimer: 0,
    bobOffset: Math.random() * twoPi,
    splitOnDeath: options.splitOnDeath ?? (isJellyfish && !options.small),
  };
  if (options.small) enemy.group.scale.setScalar(0.62);
  positionEnemy(enemy);
  if (twistBMode && !options.small) {
    enemy.angle -= world.rotation.y;
    enemy.arcCenter -= world.rotation.y;
    world.add(enemy.group);
  } else {
    scene.add(enemy.group);
  }
  enemies.push(enemy);
}

function splitJellyfish(enemy, position) {
  if (!enemy.splitOnDeath) return;
  for (let i = 0; i < 2; i += 1) {
    createFloatingEnemyWithOptions('jellyfish', position.y + (i - 0.5) * 0.25, enemy.id + 1000 + i, {
      small: true,
      hp: 1,
      collisionRadius: enemy.collisionRadius * 0.65,
      orbitRadius: Math.max(pillarRadius + 0.8, enemy.orbitRadius + (i - 0.5) * 0.45),
      angle: enemy.angle + (i - 0.5) * 0.35,
      arcSpan: enemy.arcSpan * 0.8,
      speed: enemy.speed * 1.35,
    });
  }
}

function createTurtle(platformData, id, tile) {
  const turtle = createTurtleMesh();
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
    orbitRadius: (platformInnerRadius + platformOuterRadius) / 2 + (Math.random() - 0.5) * 0.35,
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
  const porcupine = createPorcupineMesh();
  const start = tile.start + (tile.end - tile.start) * (0.25 + Math.random() * 0.5);
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
    orbitRadius: (platformInnerRadius + platformOuterRadius) / 2 + (Math.random() - 0.5) * 0.35,
    baseSpeed: 0.28 + Math.random() * 0.24,
    speed: 0.28 + Math.random() * 0.24,
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

function createSawBlade(y, angle, speedOffset = 0) {
  const mesh = new THREE.Mesh(sawBladeGeometry, sawBladeMaterial.clone());
  mesh.castShadow = true;
  const sawBlade = {
    group: mesh,
    y,
    angle,
    speed: 1.55 + currentLevel * 0.08 + speedOffset,
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

function spawnSawBladesForLevel() {
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
  pillarLaserRings.push({ mesh, y, timer: Math.random() * (laserRingOnTime + laserRingOffTime) });
}

function spawnPillarLaserRingsForLevel() {
  const target = getLevelTarget();
  const count = Math.min(5, Math.max(1, Math.floor(currentLevel / 2)));
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
    if (groundWormsSinceTurtle >= 3) {
      createTurtle(platformData, id, shuffled[i]);
      groundWormsSinceTurtle = 0;
    } else {
      createWorm(platformData, id, shuffled[i]);
      groundWormsSinceTurtle += 1;
    }
  }
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

  if (acidSnailsThisLevel < 2 && id >= 3 && !platformData.final && platformData.tiles.length > 0) {
    const snailTiles = platformData.tiles.filter(isWormTile);
    if (snailTiles.length > 0) {
      createAcidSnail(platformData, id, snailTiles[Math.floor(Math.random() * snailTiles.length)]);
      acidSnailsThisLevel += 1;
    }
  }

  if (id > 8 && Math.random() < 0.18 + difficulty * 0.12) {
    createPillarWorm(sectionY - 0.45 + Math.random() * 0.9, id);
  }
}

function rebuildAmmoUI() {
  ammoMagazineEl.replaceChildren();
  ammoSegments = Array.from({ length: maxAmmo }, () => {
    const segment = document.createElement('div');
    segment.className = 'ammo-segment';
    ammoMagazineEl.appendChild(segment);
    return segment;
  });
  updateAmmoUI();
}

function updateAmmoUI() {
  ammoSegments.forEach((segment, index) => {
    segment.classList.toggle('filled', index < ammo);
  });
}

function updateWeaponUI() {
  weaponIndicatorEl.textContent = selectedWeapon === 'shotgun' ? 'Weapon: Shotgun' : 'Weapon: Machinegun';
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
  if (ammo === maxAmmo) return false;

  ammo = maxAmmo;
  updateAmmoUI();
  showReloadText();
  return true;
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
  const nextValue = Number.parseFloat(value);
  bulletImpulse = Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(nextValue, 0, 12)
    : defaultBulletImpulse;
  impulseInput.value = bulletImpulse.toFixed(1);
}

function setGravity(value) {
  const nextValue = Number.parseFloat(value);
  gravity = Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(nextValue, -40, 0)
    : defaultGravity;
  gravityInput.value = gravity.toFixed(1);
}

function setTerminalVelocity(value) {
  const nextValue = Number.parseFloat(value);
  terminalVelocity = Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(Math.abs(nextValue), 1, 80)
    : defaultTerminalVelocity;
  terminalVelocityInput.value = terminalVelocity.toFixed(1);
}

function setStompImpulse(value) {
  const nextValue = Number.parseFloat(value);
  stompImpulse = Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(nextValue, 0, 20)
    : defaultStompImpulse;
  stompImpulseInput.value = stompImpulse.toFixed(1);
}

function getPlayerHitboxRadius() {
  return ballRadius * playerHitboxScale;
}

function setPlayerHitboxScale(value) {
  const nextValue = Number.parseFloat(value);
  playerHitboxScale = Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(nextValue, 0.1, 1)
    : defaultPlayerHitboxScale;
  hitboxScaleInput.value = playerHitboxScale.toFixed(2);
}

function setCannonChargeTime(value) {
  const nextValue = Number.parseFloat(value);
  cannonChargeTime = Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(nextValue, 0.5, 10)
    : defaultCannonChargeTime;
  cannonChargeInput.value = cannonChargeTime.toFixed(1);
}

function setCannonCooldown(value) {
  const nextValue = Number.parseFloat(value);
  cannonCooldown = Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(nextValue, 0, 20)
    : defaultCannonCooldown;
  cannonCooldownInput.value = cannonCooldown.toFixed(1);
}

function setLaserRingOnTime(value) {
  const nextValue = Number.parseFloat(value);
  laserRingOnTime = Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(nextValue, 0.2, 10)
    : defaultLaserRingOnTime;
  laserOnInput.value = laserRingOnTime.toFixed(1);
}

function setLaserRingOffTime(value) {
  const nextValue = Number.parseFloat(value);
  laserRingOffTime = Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(nextValue, 0.2, 10)
    : defaultLaserRingOffTime;
  laserOffInput.value = laserRingOffTime.toFixed(1);
}

function setCoinAttractionRadius(value) {
  const nextValue = Number.parseFloat(value);
  coinAttractionRadius = Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(nextValue, 0.1, 5)
    : defaultCoinAttractionRadius;
  coinAttractionInput.value = coinAttractionRadius.toFixed(2);
}

function setShotgunSpreadAngle(value) {
  const nextValue = Number.parseFloat(value);
  shotgunSpreadAngle = Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(nextValue, 0, 25)
    : defaultShotgunSpreadAngle;
  shotgunSpreadInput.value = shotgunSpreadAngle.toFixed(1);
}

function setShotgunFireInterval(value) {
  const nextValue = Number.parseFloat(value);
  shotgunFireInterval = Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(nextValue, 0.1, 3)
    : defaultShotgunFireInterval;
  shotgunIntervalInput.value = shotgunFireInterval.toFixed(2);
  if (isShooting && selectedWeapon === 'shotgun') fireCooldown = Math.min(fireCooldown, shotgunFireInterval);
}

function getShotUpwardVelocityCap() {
  return Math.max(baseShotUpwardVelocityCap, bulletImpulse * 0.75);
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
}

function getLevelTarget(level = currentLevel) {
  return level * 10 + 10;
}

function getLevelInfo() {
  const target = getLevelTarget();
  const progress = THREE.MathUtils.clamp(platformsPassedThisLevel / target, 0, 1);
  return { level: currentLevel, target, progress };
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
  const start = worldToScreen(worldPosition);
  const targetRect = coinsEl.getBoundingClientRect();
  const coin = document.createElement('div');
  coin.className = 'coin-pickup';
  coin.textContent = `+${value}`;
  coin.style.left = `${start.x}px`;
  coin.style.top = `${start.y}px`;
  document.body.appendChild(coin);

  requestAnimationFrame(() => {
    coin.style.left = `${targetRect.left + targetRect.width / 2}px`;
    coin.style.top = `${targetRect.top + targetRect.height / 2}px`;
    coin.style.opacity = '0';
    coin.style.transform = 'translate(-50%, -50%) scale(0.45)';
  });

  window.setTimeout(() => coin.remove(), 720);
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

function stopShooting() {
  isShooting = false;
  fireCooldown = 0;
}

function clearBullets() {
  while (bullets.length) {
    const bullet = bullets.pop();
    bullet.mesh.removeFromParent();
  }
}

function getCurrentFireInterval() {
  return selectedWeapon === 'shotgun' ? shotgunFireInterval : fireInterval;
}

function spawnBullet(velocity = new THREE.Vector3(0, -bulletSpeed, 0), shotId = 0) {
  const mesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
  mesh.position.copy(ball.position);
  mesh.position.y -= ballRadius + 0.06;
  mesh.renderOrder = 5;
  scene.add(mesh);
  bullets.push({ mesh, life: bulletLifetime, velocity: velocity.clone(), shotgunShotId: shotId, hitEnemies: new Set() });
}

function fireMachinegun() {
  if (ammo <= 0) {
    playEmptyAmmoSound();
    return false;
  }

  ammo -= 1;
  updateAmmoUI();
  spawnBullet();
  playShootSound();

  if (impulseMode === 'B') {
    ballVelocity = impulseBResetSpeed;
  } else if (impulseMode === 'C' && ballVelocity < 0) {
    const instantVel = Math.abs(ballVelocity);
    ballVelocity += impulseCfactor * instantVel;
  } else {
    const shotVelocityCap = getShotUpwardVelocityCap();
    if (ballVelocity < shotVelocityCap) {
      ballVelocity = Math.min(ballVelocity + bulletImpulse, shotVelocityCap);
    }
  }

  return true;
}

function fireShotgun() {
  if (ammo < 4) {
    playEmptyAmmoSound();
    return false;
  }

  ammo -= 4;
  updateAmmoUI();
  const shotId = nextShotId;
  nextShotId += 1;
  const spreadRad = THREE.MathUtils.degToRad(shotgunSpreadAngle);
  const tangentLength = Math.hypot(ball.position.x, ball.position.z) || 1;
  _shotgunTangent.set(-ball.position.z / tangentLength, 0, ball.position.x / tangentLength);
  for (let i = 0; i < 5; i += 1) {
    const t = i / 4 - 0.5;
    const angle = t * spreadRad;
    const velocity = _shotgunVelocity
      .set(0, -Math.cos(angle) * bulletSpeed, 0)
      .addScaledVector(_shotgunTangent, Math.sin(angle) * bulletSpeed);
    spawnBullet(velocity, shotId);
  }
  playShootSound();

  if (impulseMode === 'B') {
    ballVelocity = impulseBResetSpeed;
    ballVelocity -= impulseBShotgunImpulse;
  } else if (impulseMode === 'C' && ballVelocity < 0) {
    const instantVel = Math.abs(ballVelocity);
    ballVelocity += impulseCfactor * instantVel;
    ballVelocity -= impulseBShotgunImpulse;
  } else {
    const shotVelocityCap = Math.max(baseShotUpwardVelocityCap, bulletImpulse * 2.25);
    if (ballVelocity < shotVelocityCap) {
      ballVelocity = Math.min(ballVelocity + bulletImpulse * 3, shotVelocityCap);
    }
  }

  return true;
}

function fireCurrentWeapon() {
  return selectedWeapon === 'shotgun' ? fireShotgun() : fireMachinegun();
}

function startShooting() {
  if (isGameOver || isPaused) return;
  isShooting = true;
  if (fireCooldown <= 0) {
    fireCurrentWeapon();
    fireCooldown = getCurrentFireInterval();
  }
}

function updateShooting(dt) {
  if (!isShooting || isGameOver) return;

  fireCooldown -= dt;
  while (isShooting && fireCooldown <= 0) {
    fireCurrentWeapon();
    fireCooldown += getCurrentFireInterval();
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    const previousY = bullet.mesh.position.y;
    bullet.life -= dt;
    bullet.mesh.position.addScaledVector(bullet.velocity, dt);
    bullet.mesh.scale.setScalar(Math.max(0.45, bullet.life / bulletLifetime));

    if (checkBulletEnemyHit(bullet) && !piercingBulletsUnlocked) {
      bullet.mesh.removeFromParent();
      bullets.splice(i, 1);
      continue;
    }

    if (checkBulletCrateHit(bullet, previousY)) {
      bullet.mesh.removeFromParent();
      bullets.splice(i, 1);
      continue;
    }

    if (checkBulletGoldBlockHit(bullet, previousY)) {
      bullet.mesh.removeFromParent();
      bullets.splice(i, 1);
      continue;
    }

    if (checkBulletCannonHit(bullet)) {
      bullet.mesh.removeFromParent();
      bullets.splice(i, 1);
      continue;
    }

    if (checkBulletPlatformHit(bullet, previousY)) {
      bullet.mesh.removeFromParent();
      bullets.splice(i, 1);
      continue;
    }

    if (bullet.life <= 0) {
      bullet.mesh.removeFromParent();
      bullets.splice(i, 1);
    }
  }
}

function disposeEnemy(enemy) {
  const materials = new Set();
  enemy.group.traverse((child) => {
    if (child.material) materials.add(child.material);
  });
  if (enemy.group.parent) enemy.group.parent.remove(enemy.group);
  materials.forEach((material) => material.dispose());
}

function spawnExplosion(position, color, count = 12) {
  for (let i = 0; i < count; i += 1) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(particleGeometry, material);
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 4.5,
      (Math.random() - 0.5) * 4.5,
      (Math.random() - 0.5) * 4.5
    );
    mesh.position.copy(position);
    scene.add(mesh);
    particles.push({ mesh, material, velocity, life: 0.55 + Math.random() * 0.25 });
  }
}

function spawnBulletImpact(position) {
  for (let i = 0; i < 7; i += 1) {
    const material = new THREE.MeshBasicMaterial({ color: colors.bullet, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(particleGeometry, material);
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 1.6,
      0.45 + Math.random() * 1.5,
      (Math.random() - 0.5) * 1.6
    );
    mesh.position.copy(position);
    scene.add(mesh);
    particles.push({ mesh, material, velocity, life: 0.26 + Math.random() * 0.14 });
  }
}

function ensureBounceCubePool() {
  if (bounceCubes.length > 0) return;

  for (let i = 0; i < bounceCubePoolSize; i += 1) {
    const material = new THREE.MeshStandardMaterial({ color: 0xffc107, roughness: 0.5 });
    const mesh = new THREE.Mesh(bounceCubeGeometry, material);
    mesh.visible = false;
    scene.add(mesh);
    bounceCubes.push({
      mesh,
      material,
      velocity: new THREE.Vector3(),
      active: false,
      grounded: false,
      platform: null,
      value: 1,
      collected: false,
      order: 0,
      angle: 0,
      angularVelocity: 0,
      freeFlight: false,
    });
  }
}

function getPooledBounceCube() {
  ensureBounceCubePool();
  const inactiveCube = bounceCubes.find(cube => !cube.active);
  if (inactiveCube) return inactiveCube;

  return bounceCubes.reduce((oldest, cube) => cube.order < oldest.order ? cube : oldest, bounceCubes[0]);
}

function spawnBounceCubes(position, count = 3, color = 0xffc107, value = 1) {
  ensureBounceCubePool();

  for (let i = 0; i < count; i += 1) {
    const cube = getPooledBounceCube();
    resetBounceCube(cube, position, color, value);
  }
}

function resetBounceCube(cube, position, color = 0xffc107, value = 1) {
  if (cube.mesh.parent && cube.mesh.parent !== scene) cube.mesh.parent.remove(cube.mesh);
  if (cube.mesh.parent !== scene) scene.add(cube.mesh);

  cube.mesh.visible = true;
  cube.mesh.position.copy(position);
  cube.mesh.position.y += 0.1;
  cube.mesh.rotation.set(0, 0, 0);
  cube.material.color.setHex(color);

  const radial = Math.hypot(position.x, position.z) || 1;
  cube.mesh.position.x = (position.x / radial) * gameplayLaneRadius;
  cube.mesh.position.z = (position.z / radial) * gameplayLaneRadius;

  cube.angle = Math.atan2(cube.mesh.position.z, cube.mesh.position.x);
  const tangentialSpeed = 1.5 + Math.random() * 2;
  cube.angularVelocity = (Math.random() < 0.5 ? -1 : 1) * tangentialSpeed / gameplayLaneRadius;

  cube.velocity.set(0, 2.5 + Math.random() * 2, 0);

  cube.active = true;
  cube.grounded = false;
  cube.platform = null;
  cube.collected = false;
  cube.value = value;
  cube.order = nextBounceCubeOrder;
  nextBounceCubeOrder += 1;
}

function updateBounceCubes(dt) {
  const collectRadius = (ballRadius + 0.14) * (ballRadius + 0.14);
  const attractRadiusSq = coinAttractionRadius * coinAttractionRadius;
  const attractStrength = 11;
  const cubeHalfSize = 0.07;

  for (const cube of bounceCubes) {
    if (!cube.active || cube.collected) continue;

    const worldPos = getBounceCubeWorldPosition(cube);
    const dx = ball.position.x - worldPos.x;
    const dy = ball.position.y - worldPos.y;
    const dz = ball.position.z - worldPos.z;
    const distanceSq = dx * dx + dy * dy + dz * dz;

    if (distanceSq <= attractRadiusSq && distanceSq > collectRadius) {
      const direction = new THREE.Vector3(dx, dy, dz).normalize();
      detachBounceCubeToScene(cube, worldPos);
      cube.grounded = false;
      cube.platform = null;
      cube.freeFlight = true;
      cube.velocity.addScaledVector(direction, attractStrength * dt);
      cube.velocity.multiplyScalar(Math.max(0, 1 - 1.8 * dt));
    }

    if (!cube.grounded) {
      const previousY = cube.mesh.position.y;
      cube.velocity.y -= 14 * dt;

      if (cube.freeFlight) {
        cube.mesh.position.addScaledVector(cube.velocity, dt);
      } else {
        cube.angle += cube.angularVelocity * dt;
        cube.mesh.position.x = Math.cos(cube.angle) * gameplayLaneRadius;
        cube.mesh.position.z = Math.sin(cube.angle) * gameplayLaneRadius;
        cube.mesh.position.y += cube.velocity.y * dt;
      }

      cube.mesh.rotation.x += dt * 5;
      cube.mesh.rotation.z += dt * 3;

      for (const platform of platforms) {
        const platformTop = platformY(platform) + platformThickness / 2;
        const bottomBefore = previousY - cubeHalfSize;
        const bottomNow = cube.mesh.position.y - cubeHalfSize;
        if (bottomBefore >= platformTop && bottomNow <= platformTop && cube.velocity.y < 0) {
          const landingWorldPos = cube.mesh.position.clone();
          landingWorldPos.y = platformTop + cubeHalfSize;

          if (!cube.freeFlight) {
            landingWorldPos.x = Math.cos(cube.angle) * gameplayLaneRadius;
            landingWorldPos.z = Math.sin(cube.angle) * gameplayLaneRadius;
          }

          const tile = getTileAtWorldPoint(platform, landingWorldPos);
          if (!tile) continue;

          const tangentX = -Math.sin(cube.angle || Math.atan2(landingWorldPos.z, landingWorldPos.x));
          const tangentZ = Math.cos(cube.angle || Math.atan2(landingWorldPos.z, landingWorldPos.x));
          const tangentialSpeed = cube.freeFlight
            ? (-landingWorldPos.z * cube.velocity.x + landingWorldPos.x * cube.velocity.z) / (Math.hypot(landingWorldPos.x, landingWorldPos.z) || 1)
            : (cube.angularVelocity || 0) * gameplayLaneRadius;

          const localNext = landingWorldPos.clone();
          localNext.x += tangentX * tangentialSpeed * 0.7;
          localNext.z += tangentZ * tangentialSpeed * 0.7;

          cube.mesh.removeFromParent();
          world.add(cube.mesh);
          cube.mesh.position.copy(landingWorldPos);
          world.worldToLocal(cube.mesh.position);
          world.worldToLocal(localNext);
          cube.grounded = true;
          cube.platform = platform;
          cube.freeFlight = false;
          cube.angularVelocity = 0;
          cube.angle = 0;
          cube.velocity.set(
            (localNext.x - cube.mesh.position.x) * 0.7,
            0,
            (localNext.z - cube.mesh.position.z) * 0.7
          );
          cube.mesh.rotation.set(0, 0, 0);
          break;
        }
      }
    } else {
      cube.mesh.position.x += cube.velocity.x * dt;
      cube.mesh.position.z += cube.velocity.z * dt;
      if (cube.platform) {
        cube.mesh.position.y = cube.platform.group.position.y + platformThickness / 2 + cubeHalfSize;
        const localRadial = Math.hypot(cube.mesh.position.x, cube.mesh.position.z);
        if (localRadial > 0.01) {
          cube.mesh.position.x = (cube.mesh.position.x / localRadial) * gameplayLaneRadius;
          cube.mesh.position.z = (cube.mesh.position.z / localRadial) * gameplayLaneRadius;
        }
      }
      cube.velocity.x *= Math.max(0, 1 - 4 * dt);
      cube.velocity.z *= Math.max(0, 1 - 4 * dt);
    }

    const nextWorldPos = getBounceCubeWorldPosition(cube);
    const nextDx = ball.position.x - nextWorldPos.x;
    const nextDy = ball.position.y - nextWorldPos.y;
    const nextDz = ball.position.z - nextWorldPos.z;
    if (nextDx * nextDx + nextDy * nextDy + nextDz * nextDz <= collectRadius) {
      collectBounceCube(cube, nextWorldPos);
    }
  }
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
  if (!cube.mesh.parent || cube.mesh.parent === scene) return cube.mesh.position;
  const worldPos = cube.mesh.position.clone();
  cube.mesh.parent.localToWorld(worldPos);
  return worldPos;
}

function detachBounceCubeToScene(cube, worldPos = getBounceCubeWorldPosition(cube)) {
  if (cube.mesh.parent === scene) return;
  if (cube.mesh.parent) {
    const worldNext = cube.mesh.position.clone().add(cube.velocity);
    cube.mesh.parent.localToWorld(worldNext);
    cube.velocity.copy(worldNext.sub(worldPos));
    cube.mesh.parent.remove(cube.mesh);
  }
  scene.add(cube.mesh);
  cube.mesh.position.copy(worldPos);
}

function deactivateBounceCube(cube) {
  if (cube.mesh.parent && cube.mesh.parent !== scene) cube.mesh.parent.remove(cube.mesh);
  if (cube.mesh.parent !== scene) scene.add(cube.mesh);
  cube.mesh.visible = false;
  cube.velocity.set(0, 0, 0);
  cube.active = false;
  cube.grounded = false;
  cube.platform = null;
  cube.collected = false;
  cube.order = 0;
  cube.angle = 0;
  cube.angularVelocity = 0;
  cube.freeFlight = false;
}

function deactivateAllBounceCubes() {
  ensureBounceCubePool();
  for (const cube of bounceCubes) {
    deactivateBounceCube(cube);
  }
}

function detachBounceCubesFromPlatform(platform) {
  for (const cube of bounceCubes) {
    if (!cube.active || cube.platform !== platform) continue;

    detachBounceCubeToScene(cube);
    cube.platform = null;
    cube.grounded = false;
    cube.freeFlight = true;
    cube.velocity.set(0, -0.2, 0);
  }
}

function detachBounceCubesFromTile(platform, tile) {
  for (const cube of bounceCubes) {
    if (!cube.active || !cube.grounded || cube.platform !== platform) continue;

    const worldPos = getBounceCubeWorldPosition(cube);
    _bounceCubeLocalPosition.copy(worldPos);
    platform.group.worldToLocal(_bounceCubeLocalPosition);
    const radius = Math.hypot(_bounceCubeLocalPosition.x, _bounceCubeLocalPosition.z);
    const angle = (Math.atan2(_bounceCubeLocalPosition.z, _bounceCubeLocalPosition.x) + twoPi) % twoPi;
    if (radius < platformInnerRadius || radius > platformOuterRadius || !angleInArc(angle, tile.start, tile.end)) continue;

    detachBounceCubeToScene(cube, worldPos);
    cube.platform = null;
    cube.grounded = false;
    cube.freeFlight = true;
    cube.velocity.set(0, -0.2, 0);
  }
}

function detachCratesAndGoldFromTile(platform, tile) {
  for (const crate of crates) {
    if (crate.broken || crate.platformGroup !== platform.group) continue;
    const localPos = new THREE.Vector3();
    crate.mesh.getWorldPosition(localPos);
    const r = Math.hypot(localPos.x, localPos.z);
    const a = (Math.atan2(localPos.z, localPos.x) + twoPi) % twoPi;
    if (r < platformInnerRadius || r > platformOuterRadius || !angleInArc(a, tile.start, tile.end)) continue;
    crate.platformGroup.remove(crate.mesh);
    scene.add(crate.mesh);
    crate.platformGroup = null;
    crate.falling = true;
    crate.fallVelocity = 0;
  }
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

function breakCrate(crateIndex, byBullet = false) {
  const crate = crates[crateIndex];
  if (!crate || crate.broken) return false;

  crate.broken = true;
  crate.mesh.getWorldPosition(_crateWorldPosition);
  const platGroup = crate.platformGroup;
  spawnExplosion(_crateWorldPosition, colors.crate, 12);
  platGroup.remove(crate.mesh);
  crate.mesh.geometry.dispose();
  crate.mesh.material.dispose();
  crates.splice(crateIndex, 1);

  if (byBullet) {
    spawnCoinPickup(_crateWorldPosition, platGroup);
  } else {
    coins += 5;
    updateCoinsUI(coinsEl, coins);
    spawnCoinPickupAnimation(_crateWorldPosition);
  }
  return true;
}

function spawnCoinPickup(worldPos, platformGroup) {
  const mesh = new THREE.Mesh(coinPickupGeometry, coinPickupMaterial);
  _coinLocalPosition.copy(worldPos);
  platformGroup.worldToLocal(_coinLocalPosition);
  _coinLocalPosition.y = platformThickness / 2 + 0.04;
  mesh.position.copy(_coinLocalPosition);
  platformGroup.add(mesh);
  coinPickups.push({ mesh, value: 5, collected: false, platformGroup });
}

function updateCoinPickups(dt) {
  for (let i = coinPickups.length - 1; i >= 0; i -= 1) {
    const pickup = coinPickups[i];
    if (pickup.collected) continue;
    pickup.mesh.rotation.y += dt * 3;

    pickup.mesh.getWorldPosition(_pickupWorldPosition);
    const dx = ball.position.x - _pickupWorldPosition.x;
    const dy = ball.position.y - _pickupWorldPosition.y;
    const dz = ball.position.z - _pickupWorldPosition.z;
    if (dx * dx + dy * dy + dz * dz <= (ballRadius + 0.25) * (ballRadius + 0.25)) {
      pickup.collected = true;
      coins += pickup.value;
      updateCoinsUI(coinsEl, coins);
      spawnCoinPickupAnimation(_pickupWorldPosition);
      pickup.mesh.removeFromParent();
      pickup.mesh.geometry.dispose();
      coinPickups.splice(i, 1);
    }
  }
}

function clearCoinPickups() {
  while (coinPickups.length) {
    const pickup = coinPickups.pop();
    pickup.mesh.removeFromParent();
    pickup.mesh.geometry.dispose();
  }
}

function disposeTile(tile) {
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

function setGrayTileCrackStage(platform, tile, stage) {
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
  if (enemy.type === 'pufferBomb') explodePuffer(position);
  spawnBounceCubes(position);
}

function killEnemyAt(index, explosionColor) {
  const enemy = enemies[index];
  if (enemy.type === 'bat' || enemy.type === 'worm' || enemy.type === 'pillarWorm' || enemy.type === 'turtle' || enemy.type === 'acidSnail' || enemy.type === 'jellyfish' || enemy.type === 'porcupine') playBatDeathSound();
  score += 5 * Math.max(1, combo);
  scoreEl.textContent = String(score);
  removeEnemyAt(index, explosionColor);
  increaseCombo();
  if (vampiricLifeUnlocked) {
    vampiricKillCount += 1;
    if (vampiricKillCount >= 10) {
      vampiricKillCount = 0;
      if (hp < maxHp) {
        hp += 1;
        updateHeartsUI(heartsEl, hp, maxHp);
        spawnFloatingText('VAMP +1', ball.position, 0xe91e63, true);
      }
    }
  }
}

function damageEnemy(enemyIndex) {
  const enemy = enemies[enemyIndex];
  if (enemy.type === 'acidSnail') return;
  if (enemy.type === 'bat') {
    killEnemyAt(enemyIndex, colors.particle);
    return;
  }

  enemy.hp -= 1;
  enemy.flashTimer = 0.18;
  if (enemy.type === 'worm' || enemy.type === 'pillarWorm') {
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
    killEnemyAt(enemyIndex, enemy.type === 'worm' || enemy.type === 'pillarWorm' ? colors.worm : colors.red);
  }
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
  const tangentLength = Math.hypot(ball.position.x, ball.position.z) || 1;
  _ballTangent.set(-ball.position.z / tangentLength, 0, ball.position.x / tangentLength);

  _ballBottomCollider.copy(ball.position).y -= offset;
  _ballTopCollider.copy(ball.position).y += offset;
  _ballLeftCollider.copy(ball.position).addScaledVector(_ballTangent, -offset);
  _ballRightCollider.copy(ball.position).addScaledVector(_ballTangent, offset);

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
  if (enemy.type === 'pillarWorm') {
    if (!enemy.interactable) return null;
    const stompRadius = enemy.collisionRadius + ballRadius * 0.8;
    const contactRadius = enemy.collisionRadius + hitboxRadius;
    if (colliders.bottom.distanceToSquared(enemy.collisionPosition) <= stompRadius * stompRadius) return 'bottom';
    if (colliders.top.distanceToSquared(enemy.collisionPosition) <= contactRadius * contactRadius) return 'top';
    if (colliders.left.distanceToSquared(enemy.collisionPosition) <= contactRadius * contactRadius) return 'left';
    if (colliders.right.distanceToSquared(enemy.collisionPosition) <= contactRadius * contactRadius) return 'right';
    return null;
  }

  if (enemy.type === 'worm') {
    const stompRadius = enemy.collisionRadius + ballRadius * 0.75;
    const contactRadius = enemy.collisionRadius + hitboxRadius;
    for (const segment of enemy.segments) {
      segment.getWorldPosition(_enemySegmentWorldPosition);
      if (colliders.bottom.distanceToSquared(_enemySegmentWorldPosition) <= stompRadius * stompRadius) return 'bottom';
    }
    for (const segment of enemy.segments) {
      segment.getWorldPosition(_enemySegmentWorldPosition);
      if (colliders.top.distanceToSquared(_enemySegmentWorldPosition) <= contactRadius * contactRadius) return 'top';
      if (colliders.left.distanceToSquared(_enemySegmentWorldPosition) <= contactRadius * contactRadius) return 'left';
      if (colliders.right.distanceToSquared(_enemySegmentWorldPosition) <= contactRadius * contactRadius) return 'right';
    }
    return null;
  }

  const hitRadius = enemy.collisionRadius + hitboxRadius;
  const hitRadiusSq = hitRadius * hitRadius;

  if (colliders.bottom.distanceToSquared(enemy.group.position) <= hitRadiusSq) return 'bottom';
  if (colliders.top.distanceToSquared(enemy.group.position) <= hitRadiusSq) return 'top';
  if (colliders.left.distanceToSquared(enemy.group.position) <= hitRadiusSq) return 'left';
  if (colliders.right.distanceToSquared(enemy.group.position) <= hitRadiusSq) return 'right';

  const fallbackRadius = enemy.collisionRadius + hitboxRadius;
  return ball.position.distanceToSquared(enemy.group.position) <= fallbackRadius * fallbackRadius ? 'body' : null;
}

function checkBulletCrateHit(bullet, previousY) {
  for (let i = crates.length - 1; i >= 0; i -= 1) {
    const crate = crates[i];
    if (crate.broken) continue;
    crate.mesh.getWorldPosition(_crateWorldPosition);
    const crossedCrateY = previousY >= _crateWorldPosition.y && bullet.mesh.position.y <= _crateWorldPosition.y;
    const horizontalDistance = Math.hypot(
      bullet.mesh.position.x - _crateWorldPosition.x,
      bullet.mesh.position.z - _crateWorldPosition.z
    );
    if (crossedCrateY && horizontalDistance <= 0.3) {
      return breakCrate(i, true);
    }
  }
  return false;
}

function checkBallCrateHit(previousY) {
  const bottomBefore = previousY - ballRadius;
  const bottomNow = ball.position.y - ballRadius;

  for (let i = crates.length - 1; i >= 0; i -= 1) {
    const crate = crates[i];
    if (crate.broken) continue;
    crate.mesh.getWorldPosition(_crateWorldPosition);
    const crateTop = _crateWorldPosition.y + 0.17;
    const crossedCrateTop = bottomBefore >= crateTop && bottomNow <= crateTop;
    const horizontalDistance = Math.hypot(
      ball.position.x - _crateWorldPosition.x,
      ball.position.z - _crateWorldPosition.z
    );

    if (crossedCrateTop && horizontalDistance <= ballRadius + 0.22) {
      breakCrate(i);
      return;
    }
  }
}

function checkBallGoldBlockStomp(previousY) {
  if (ballVelocity >= 0) return;

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
      ballVelocity = Math.max(ballVelocity, stompImpulse);
      return;
    }
  }
}

function checkBulletEnemyHit(bullet) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (bullet.hitEnemies?.has(enemy)) continue;
    const hitRadius = enemy.collisionRadius + 0.12;
    if (enemy.type === 'pillarWorm' && !enemy.interactable) continue;
    const collisionPosition = enemy.type === 'pillarWorm' ? enemy.collisionPosition : enemy.group.position;
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

function updateFallingCratesAndGold(dt) {
  for (const crate of crates) {
    if (!crate.falling || crate.broken) continue;
    const previousY = crate.mesh.position.y;
    crate.fallVelocity = (crate.fallVelocity ?? 0) - 14 * dt;
    crate.mesh.position.y += crate.fallVelocity * dt;
    for (const platform of platforms) {
      const platformTop = platformY(platform) + platformThickness / 2 + 0.22;
      if (previousY >= platformTop && crate.mesh.position.y <= platformTop) {
        crate.platformGroup = platform.group;
        platform.group.add(crate.mesh);
        crate.mesh.position.y = platformThickness / 2 + 0.22;
        crate.falling = false;
        crate.fallVelocity = 0;
        break;
      }
    }
  }
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

function getCannonWorldPosition(cannon) {
  _cannonWorldPosition.set(0, 0.25, 0);
  cannon.group.localToWorld(_cannonWorldPosition);
  return _cannonWorldPosition;
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
  if (colliders.bottom.distanceToSquared(position) <= hitRadiusSq) return 'bottom';
  if (colliders.top.distanceToSquared(position) <= hitRadiusSq) return 'top';
  if (colliders.left.distanceToSquared(position) <= hitRadiusSq) return 'left';
  if (colliders.right.distanceToSquared(position) <= hitRadiusSq) return 'right';
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
  _cannonMouthWorldPosition.set(0, 0.56, 0);
  cannon.group.localToWorld(_cannonMouthWorldPosition);
  return _cannonMouthWorldPosition;
}

function cannonHasLineOfSight(cannon) {
  const mouth = getCannonWorldMouth(cannon);
  if (mouth.y >= ball.position.y - ballRadius) return false;

  const cannonAngle = Math.atan2(mouth.z, mouth.x);
  const ballAngle = Math.atan2(ball.position.z, ball.position.x);
  if (getAngularDistance(cannonAngle, ballAngle) > 0.18) return false;

  for (const platform of platforms) {
    if (platform === cannon.platformData) continue;
    const y = platformY(platform);
    if (y <= mouth.y + platformThickness || y >= ball.position.y - ballRadius) continue;
    _cannonLosPoint.set(ball.position.x, y, ball.position.z);
    const tile = getTileAtWorldPoint(platform, _cannonLosPoint);
    if (isSolidLineOfSightTile(tile)) return false;
  }
  return true;
}

function updateCannons(dt) {
  for (let i = cannons.length - 1; i >= 0; i -= 1) {
    const cannon = cannons[i];
    const contact = getBallCannonContact(cannon);
    if (contact === 'bottom' && ballVelocity < 0 && ball.position.y > getCannonWorldPosition(cannon).y) {
      destroyCannon(i);
      if (reloadAmmo()) {
        spawnFloatingText('Reload', ball.position);
        playReloadSound();
      }
      ballVelocity = Math.max(ballVelocity, stompImpulse);
      continue;
    }
    if (contact) {
      applyDamage();
    }

    const hasLos = cannonHasLineOfSight(cannon);

    cannon.base.material.emissive?.setHex(0x000000);
    cannon.base.material.emissiveIntensity = 0;
    cannon.ring.visible = false;
    cannon.laser.visible = false;

    if (cannon.flashTimer > 0) {
      cannon.flashTimer = Math.max(0, cannon.flashTimer - dt);
      cannon.base.material.emissive?.setHex(0xff9800);
      cannon.base.material.emissiveIntensity = 0.8;
    }

    if (cannon.cooldown > 0) {
      cannon.cooldown = Math.max(0, cannon.cooldown - dt);
      cannon.charge = 0;
      continue;
    }

    if (cannon.laserTimer > 0) {
      cannon.laserTimer = Math.max(0, cannon.laserTimer - dt);
      cannon.laser.visible = true;
      if (!cannon.damagedThisShot && Math.hypot(ball.position.x - getCannonWorldMouth(cannon).x, ball.position.z - getCannonWorldMouth(cannon).z) <= getPlayerHitboxRadius() + 0.15 && ball.position.y > _cannonMouthWorldPosition.y) {
        applyDamage();
        cannon.damagedThisShot = true;
      }
      if (cannon.laserTimer <= 0) {
        cannon.cooldown = cannonCooldown;
      }
      continue;
    }

    if (!hasLos) {
      cannon.charge = 0;
      continue;
    }

    if (cannon.charge === 0) {
      playCannonActivateSound();
    }
    cannon.charge += dt;
    const chargeProgress = Math.min(1, cannon.charge / cannonChargeTime);
    cannon.base.material.emissive?.setHex(0xff0000);
    cannon.base.material.emissiveIntensity = 0.35 + Math.sin(performance.now() * 0.02) * 0.25;
    cannon.ring.visible = true;
    cannon.ring.scale.setScalar(Math.max(0.25, 1 - chargeProgress * 0.75));

    if (cannon.charge >= cannonChargeTime) {
      cannon.charge = 0;
      cannon.laserTimer = 0.3;
      cannon.damagedThisShot = false;
      cannon.ring.visible = false;
      cannon.laser.visible = true;
      playCannonFireSound();
    }
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
        if (isWormBodySupported(enemy.platformData, nextAngle, enemy.orbitRadius)) {
          enemy.localAngle = (nextAngle + twoPi) % twoPi;
        } else if (isWormBodySupported(enemy.platformData, enemy.localAngle, enemy.orbitRadius)) {
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
      enemy.y = enemy.baseY + Math.sin(scaledTime * 2 + enemy.bobOffset) * 0.18;
      if (enemy.type === 'pufferBomb') enemy.group.scale.setScalar(1 + Math.sin(scaledTime * 4 + enemy.bobOffset) * 0.08);
    }

    if (enemy.type === 'bat') {
      const flap = Math.sin(scaledTime * 18 + enemy.flapOffset) * 0.55;
      enemy.leftWing.rotation.z = -0.28 - flap;
      enemy.rightWing.rotation.z = 0.28 + flap;
    } else if (enemy.type === 'worm' || enemy.type === 'pillarWorm') {
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
    } else {
      enemy.group.rotation.x += dt * 1.1;
      enemy.group.rotation.z += dt * 0.8;
      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= dt;
      } else {
        enemy.material.emissiveIntensity = 0;
      }
    }

    const contact = getBallEnemyContact(enemy);
    if (contact === 'bottom' && (enemy.type === 'bat' || enemy.type === 'worm' || enemy.type === 'pillarWorm' || enemy.type === 'turtle' || enemy.type === 'jellyfish' || enemy.type === 'pufferBomb' || enemy.type === 'porcupine' || enemy.type === 'acidSnail') && ballVelocity < 0 && ball.position.y > enemy.group.position.y) {
      if (enemy.type === 'turtle') applyDamage();
      if (enemy.type === 'porcupine' && enemy.spikesOut) {
        applyDamage();
        ballVelocity = Math.max(ballVelocity, stompImpulse * 0.55);
        continue;
      }
      if (enemy.type === 'acidSnail') {
        acidStompImmunity = 0.6;
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
          ballVelocity = Math.max(ballVelocity, stompImpulse * 0.7);
          continue;
        } else {
          spawnAcidPuddle(enemy.platformData, enemy.localAngle, enemy.orbitRadius, true);
          killEnemyAt(i, colors.acid);
          if (reloadAmmo()) {
            spawnFloatingText('Reload', ball.position);
            playReloadSound();
          }
          ballVelocity = Math.max(ballVelocity, stompImpulse);
          continue;
        }
      }
      killEnemyAt(i, enemy.type === 'worm' || enemy.type === 'pillarWorm' ? colors.worm : enemy.type === 'turtle' ? colors.red : colors.particle);
      if (reloadAmmo()) {
        spawnFloatingText('Reload', ball.position);
        playReloadSound();
      }
      ballVelocity = Math.max(ballVelocity, stompImpulse);
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

function updatePillarSpikes(dt) {
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
    sawBlade.group.getWorldPosition(_sawBladeWorldPosition);

    const damageRadius = getPlayerHitboxRadius() + sawBlade.collisionRadius;
    if (ball.position.distanceToSquared(_sawBladeWorldPosition) <= damageRadius * damageRadius) {
      applyDamage();
    }
  }
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
      const pos = enemy.type === 'pillarWorm' ? enemy.collisionPosition : enemy.group.position;
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
  const hitbox = getPlayerHitboxRadius();
  for (let i = pillarLaserRings.length - 1; i >= 0; i -= 1) {
    const ring = pillarLaserRings[i];
    const cycle = laserRingOnTime + laserRingOffTime;
    ring.timer = (ring.timer + dt) % cycle;
    const active = ring.timer < laserRingOnTime;
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
  platformBandIndex.clear();
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
  pendingInvulnerability = false;
  pendingShield = false;
  invulnerabilityTimer = 0;
  hasShield = false;
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
  if (invulnerabilityTimer > 0) {
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
  shopCoinsEl.textContent = `${coins} coins`;
  shopBulletBtn.disabled = coins < 5;
  shopHpBtn.disabled = coins < 20 || hp >= maxHp;
  shopArmorBtn.disabled = coins < 20 || hasShield;
  shopInvulnBtn.disabled = coins < 30 || invulnerabilityTimer > 0;
  shopPiercingBtn.disabled = coins < piercingCost || piercingBulletsUnlocked;
  shopVampiricBtn.disabled = coins < vampiricCost || vampiricLifeUnlocked;
  shopComboShieldBtn.disabled = coins < comboShieldCost || comboShieldUnlocked;
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
  completeSummaryEl.textContent = `Level ${currentLevel} cleared. Coins: ${coins}. Choose one reward, then start Level ${currentLevel + 1}.`;
  rewardHpButton.disabled = rewardChosen || hp >= maxHp;
  rewardAmmoButton.disabled = rewardChosen;
  rewardPiercingButton.disabled = rewardChosen || piercingBulletsUnlocked;
  rewardVampiricButton.disabled = rewardChosen || vampiricLifeUnlocked;
  rewardComboShieldButton.disabled = rewardChosen || comboShieldUnlocked;
  nextLevelButton.disabled = !rewardChosen;
  buyInvulnerabilityButton.disabled = coins < invulnerabilityCost || pendingInvulnerability;
  buyShieldButton.disabled = coins < shieldCost || pendingShield || hasShield;
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
const _collisionPoint = new THREE.Vector3();
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
const _enemyLocalPosition = new THREE.Vector3();
const _enemyFallLocalPosition = new THREE.Vector3();
const _floaterWorldPos = new THREE.Vector3();
const _enemySegmentWorldPosition = new THREE.Vector3();
const _platformUndersidePoint = new THREE.Vector3();
const _enemyProjectedPosition = new THREE.Vector3();
const _cannonMouthWorldPosition = new THREE.Vector3();
const _cannonLosPoint = new THREE.Vector3();
const _cannonWorldPosition = new THREE.Vector3();
const _shotgunTangent = new THREE.Vector3();
const _shotgunVelocity = new THREE.Vector3();
const _pillarWormNormal = new THREE.Vector3();
const _ballRadialNormal = new THREE.Vector3();
const _sawBladeWorldPosition = new THREE.Vector3();
const _ledgePreviousBottom = new THREE.Vector3();
const _ledgeCurrentBottom = new THREE.Vector3();
const _ledgeStompPoint = new THREE.Vector3();

const debugPanel = collisionDebugEnabled ? document.createElement('pre') : null;
const debugMarker = collisionDebugEnabled
  ? new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xff00ff, depthTest: false })
    )
  : null;
const debugRing = collisionDebugEnabled ? new THREE.Group() : null;

function makeCircleLine(radius, color) {
  const points = [];
  for (let i = 0; i <= 96; i += 1) {
    const angle = (i / 96) * twoPi;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, depthTest: false })
  );
}

if (collisionDebugEnabled) {
  debugPanel.id = 'debug-panel';
  document.body.appendChild(debugPanel);
  debugMarker.renderOrder = 10;
  scene.add(debugMarker);
  debugRing.add(makeCircleLine(platformInnerRadius, 0xff00ff));
  debugRing.add(makeCircleLine(platformOuterRadius, 0xff00ff));
  world.add(debugRing);
}

function updateCollisionDebug(platform, contact, platformTop) {
  if (!collisionDebugEnabled) return;

  _collisionPoint.set(contact.localX, platformThickness / 2 + 0.04, contact.localZ);
  platform.group.localToWorld(_collisionPoint);
  debugMarker.position.copy(_collisionPoint);
  debugMarker.visible = true;
  debugRing.position.y = platformY(platform) + platformThickness / 2 + 0.035;
  debugRing.visible = true;

  debugPanel.textContent = [
    `platform=${platform.id}`,
    `tile=${contact.tile ? contact.tile.index : 'gap'} ${contact.tile ? contact.tile.type : ''}`,
    `angle=${contact.angle.toFixed(3)}`,
    `radius=${contact.radius.toFixed(3)}`,
    `ballY=${ball.position.y.toFixed(3)}`,
    `platformTop=${platformTop.toFixed(3)}`,
    `worldRotation=${world.rotation.y.toFixed(3)}`,
  ].join('\n');
}

function platformY(platform) {
  return platform.group.position.y;
}

const platformBandIndex = new Map();

function registerPlatformInBand(platform) {
  const y = platformY(platform);
  const band = Math.round(y / platformSpacing);
  if (!platformBandIndex.has(band)) platformBandIndex.set(band, []);
  platformBandIndex.get(band).push(platform);
}

function unregisterPlatformFromBand(platform) {
  const y = platformY(platform);
  const band = Math.round(y / platformSpacing);
  const arr = platformBandIndex.get(band);
  if (!arr) return;
  const idx = arr.indexOf(platform);
  if (idx !== -1) arr.splice(idx, 1);
}

function getPlatformsNearY(yMin, yMax) {
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

function getTileAtWorldPoint(platform, worldPoint) {
  _bulletImpactLocal.copy(worldPoint);
  platform.group.worldToLocal(_bulletImpactLocal);

  const radius = Math.hypot(_bulletImpactLocal.x, _bulletImpactLocal.z);
  if (radius < platformInnerRadius || radius > platformOuterRadius) return null;

  const angle = (Math.atan2(_bulletImpactLocal.z, _bulletImpactLocal.x) + twoPi) % twoPi;
  return platform.tiles.find((tile) => !tile.broken && angleInArc(angle, tile.start, tile.end)) || null;
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
    updateCollisionDebug(platform, contact, platformTop);

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
      for (let g = goldBlocks.length - 1; g >= 0; g -= 1) {
        if (goldBlocks[g].platformData === platform) goldBlocks.splice(g, 1);
      }
      for (let s = spikeTraps.length - 1; s >= 0; s -= 1) {
        if (spikeTraps[s].platformGroup === platform.group) spikeTraps.splice(s, 1);
      }
      for (let c = coinPickups.length - 1; c >= 0; c -= 1) {
        if (coinPickups[c].platformGroup === platform.group) {
          coinPickups[c].mesh.removeFromParent();
          coinPickups[c].mesh.geometry.dispose();
          coinPickups.splice(c, 1);
        }
      }
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

const _flashA = new THREE.Color();
const _flashB = new THREE.Color();

function updateTileFlashes(dt) {
  for (const platform of platforms) {
    for (const tile of platform.tiles) {
      if (!isFlashablePlatformTile(tile) || tile.broken) continue;

      const baseColor = getPlatformTileColor(tile.type);
      const flashColor = tile.type === 'gray' ? colors.grayFlash : colors.blueFlash;
      if (tile.flashTimer > 0) {
        tile.flashTimer = Math.max(0, tile.flashTimer - dt);
        const t = tile.flashTimer / 0.3;
        _flashA.setHex(baseColor);
        _flashB.setHex(flashColor);
        tile.mesh.material.color.copy(_flashA.lerp(_flashB, t));
      } else {
        tile.mesh.material.color.setHex(baseColor);
      }
    }
  }
}

const arScene = new THREE.Scene();
const arRoot = new THREE.Group();
const arTowerRotator = new THREE.Group();
const arBullets = [];
const arPlatforms = [];
let arPillar = null;
let arModeActive = false;
let arTowerPlaced = false;
let arReferenceSpace = null;
let arViewerSpace = null;
let arHitTestSource = null;
let arBall = null;
let arBallVelocity = 0;
let arLowestPlatformY = 0;
let arNextPlatformY = 0;
let arNextPlatformId = 0;
let arAmmo = 0;
let arIsShooting = false;
let arFireCooldown = 0;
let arLastHapticStep = 0;
const arScale = 0.16;
const arMinScale = arScale * 0.1;
let arCurrentScale = arScale;
let arScaleAdjusting = false;
let arScaleStartDistance = 0;
let arScaleStartValue = arScale;
const arVisiblePlatformCount = 12;
const arPlatformSpacing = 2.125;
const arPlatformBaseY = 0;
const arGravity = -4.5;
const arBounceVelocity = 3.1;
const arBulletSpeed = 5.8;
const arBulletLifetime = 1.25;
const arFireInterval = 0.3;
const arMaxAmmo = 5;
const arShotImpulse = 1.25;
const arShotVelocityCap = 2.75;
const arPillarHeight = 8.5;
const arPillarTopOffset = 2.1;
const arControllerPosition = new THREE.Vector3();
const arControllerLocalPosition = new THREE.Vector3();
const arGripControllers = new Set();

arScene.add(new THREE.HemisphereLight(0xffffff, 0x78909c, 2.2));
const arSun = new THREE.DirectionalLight(0xffffff, 1.5);
arSun.position.set(2, 5, 3);
arScene.add(arSun);
arRoot.visible = false;
arRoot.scale.setScalar(arScale);
arScene.add(arRoot);

const arReticleGeometry = new THREE.RingGeometry(0.08, 0.105, 32).rotateX(-Math.PI / 2);
const arReticleMaterial = new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.88, depthTest: false });
const arReticle = new THREE.Mesh(arReticleGeometry, arReticleMaterial);
arReticle.matrixAutoUpdate = false;
arReticle.visible = false;
arReticle.renderOrder = 30;
arScene.add(arReticle);

function setArStatus(message, visible = true) {
  arStatusEl.textContent = message;
  arStatusEl.hidden = !visible;
}

function setDesktopVisible(visible) {
  world.visible = visible;
  ball.visible = visible;
  shieldMesh.visible = visible && hasShield;
  gameOverEl.hidden = true;
  levelCompleteEl.hidden = true;
  pausePanelEl.hidden = true;
  extraPanelEl.hidden = true;
  shopPanelEl.hidden = true;
}

function disposeGroupChildren(group) {
  while (group.children.length) {
    const child = group.children.pop();
    child.traverse((item) => {
      if (item.geometry) item.geometry.dispose();
      if (item.material) item.material.dispose();
    });
  }
}

function createArPlatform(y, index) {
  const group = new THREE.Group();
  group.position.y = y;
  const segmentCount = 12;
  const gapIndex = (index * 5) % segmentCount;
  const arcSize = twoPi / segmentCount;
  const material = new THREE.MeshStandardMaterial({ color: colors.blue, roughness: 0.56, side: THREE.DoubleSide });

  for (let i = 0; i < segmentCount; i += 1) {
    if (i === gapIndex) continue;
    const mesh = new THREE.Mesh(
      makeArcGeometry(platformInnerRadius, platformOuterRadius, i * arcSize, (i + 1) * arcSize, platformThickness),
      material.clone()
    );
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  arTowerRotator.add(group);
  arPlatforms.push({ y, gapIndex, segmentCount, group });
  arPlatforms.sort((a, b) => b.y - a.y);
}

function buildArTower() {
  disposeGroupChildren(arRoot);
  arBullets.length = 0;
  arPlatforms.length = 0;
  arTowerRotator.clear();
  arTowerRotator.rotation.set(0, 0, 0);
  arRoot.add(arTowerRotator);

  arPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(pillarRadius, pillarRadius, arPillarHeight, 48),
    new THREE.MeshStandardMaterial({ color: colors.pillar, roughness: 0.55 })
  );
  arTowerRotator.add(arPillar);

  arNextPlatformY = arPlatformBaseY;
  arNextPlatformId = 0;
  for (let i = 0; i < arVisiblePlatformCount; i += 1) {
    createArPlatform(arNextPlatformY, arNextPlatformId);
    arLowestPlatformY = arNextPlatformY;
    arNextPlatformY -= arPlatformSpacing;
    arNextPlatformId += 1;
  }

  arBall = new THREE.Mesh(
    new THREE.SphereGeometry(ballRadius, 32, 24),
    new THREE.MeshStandardMaterial({ color: colors.ball, roughness: 0.35, metalness: 0.05 })
  );
  arBall.position.set(0, arPlatformBaseY + arPlatformSpacing * 0.4, gameplayLaneRadius);
  arBall.castShadow = true;
  arRoot.add(arBall);
  arBallVelocity = 0;
  arAmmo = arMaxAmmo;
  arIsShooting = false;
  arFireCooldown = 0;
  updateArPillarClip();
}

function placeArTowerFromReticle() {
  if (!arReticle.visible) return;
  buildArTower();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  arReticle.matrix.decompose(pos, quat, new THREE.Vector3());
  arRoot.position.copy(pos);
  arRoot.quaternion.copy(quat);
  arCurrentScale = arScale;
  arRoot.scale.setScalar(arCurrentScale);
  arRoot.visible = true;
  arTowerPlaced = true;
  arReticle.visible = false;
  setArStatus('Hold grip + move to rotate. Trigger to fire. Both grips to scale.');
}

function updateArPillarClip() {
  if (!arPillar || !arBall) return;
  arPillar.position.y = arBall.position.y + arPillarTopOffset - arPillarHeight / 2;
}

function recycleArPlatforms() {
  if (!arBall) return;
  for (let i = arPlatforms.length - 1; i >= 0; i -= 1) {
    const platform = arPlatforms[i];
    if (platform.y > arBall.position.y + arPlatformSpacing * 2.4) {
      arTowerRotator.remove(platform.group);
      platform.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      arPlatforms.splice(i, 1);
    }
  }

  while (arPlatforms.length < arVisiblePlatformCount) {
    createArPlatform(arNextPlatformY, arNextPlatformId);
    arLowestPlatformY = arNextPlatformY;
    arNextPlatformY -= arPlatformSpacing;
    arNextPlatformId += 1;
  }
}

function fireArBullet() {
  if (!arTowerPlaced || !arBall || arAmmo <= 0 || arScaleAdjusting) return false;
  const mesh = new THREE.Mesh(bulletGeometry, bulletMaterial.clone());
  mesh.position.copy(arBall.position);
  mesh.position.y -= ballRadius + 0.08;
  arRoot.add(mesh);
  arBullets.push({ mesh, life: arBulletLifetime });
  arAmmo -= 1;
  arBallVelocity = Math.min(arBallVelocity + arShotImpulse, arShotVelocityCap);
  playShootSound();
  return true;
}

function updateArShooting(dt) {
  if (!arIsShooting || arScaleAdjusting || !arTowerPlaced) return;
  arFireCooldown -= dt;
  while (arIsShooting && arFireCooldown <= 0) {
    if (!fireArBullet()) {
      arIsShooting = false;
      arFireCooldown = 0;
      break;
    }
    arFireCooldown += arFireInterval;
  }
}

function getArControllerLocalX(controller) {
  controller.getWorldPosition(arControllerPosition);
  arControllerLocalPosition.copy(arControllerPosition);
  arRoot.worldToLocal(arControllerLocalPosition);
  return arControllerLocalPosition.x;
}

function arHapticPulse(intensity = 1.0, duration = 30) {
  try {
    const session = renderer.xr.getSession();
    if (!session) return;
    for (const source of session.inputSources) {
      const gamepad = source.gamepad;
      if (!gamepad) continue;
      const actuator = gamepad.hapticActuators?.[0];
      if (actuator?.pulse) {
        actuator.pulse(intensity, duration).catch(() => {});
      }
    }
  } catch (_) {
    /* silent */
  }
}

function getArControllerDistance(a, b) {
  const aPos = new THREE.Vector3();
  const bPos = new THREE.Vector3();
  a.getWorldPosition(aPos);
  b.getWorldPosition(bPos);
  return aPos.distanceTo(bPos);
}

function startArShooting() {
  if (!arTowerPlaced || arScaleAdjusting) return;
  arIsShooting = true;
  if (arFireCooldown <= 0) {
    fireArBullet();
    arFireCooldown = arFireInterval;
  }
}

function stopArShooting() {
  arIsShooting = false;
  arFireCooldown = 0;
}

function startArScaleAdjust() {
  const controllers = [...arGripControllers];
  if (controllers.length < 2 || arScaleAdjusting) return;
  arScaleAdjusting = true;
  arScaleStartDistance = Math.max(0.05, getArControllerDistance(controllers[0], controllers[1]));
  arScaleStartValue = arCurrentScale;
  arActiveGripController = null;
  setArStatus('Scaling: move grips together/apart. Release one grip to resume.');
}

function stopArScaleAdjust() {
  if (!arScaleAdjusting) return;
  arScaleAdjusting = false;
  setArStatus('Hold grip + move to rotate. Trigger to fire. Both grips to scale.');
}

function updateArScaleAdjust() {
  if (!arScaleAdjusting) return;
  const controllers = [...arGripControllers];
  if (controllers.length < 2) {
    stopArScaleAdjust();
    return;
  }
  const distance = getArControllerDistance(controllers[0], controllers[1]);
  arCurrentScale = THREE.MathUtils.clamp(arScaleStartValue * (distance / arScaleStartDistance), arMinScale, arScale);
  arRoot.scale.setScalar(arCurrentScale);
}

let arActiveGripController = null;
let arLastGripX = 0;

function updateArGripRotation() {
  if (!arTowerPlaced || !arActiveGripController || arScaleAdjusting) return;
  const nextX = getArControllerLocalX(arActiveGripController);
  arTowerRotator.rotation.y += (nextX - arLastGripX) * 3.6;
  arLastGripX = nextX;
  const step = Math.floor(arTowerRotator.rotation.y / THREE.MathUtils.degToRad(5));
  if (step !== arLastHapticStep) {
    arLastHapticStep = step;
    arHapticPulse(1.0, 30);
  }
}

function updateArReticle(frame) {
  if (!frame || !arHitTestSource || !arReferenceSpace || arTowerPlaced) return;
  const results = frame.getHitTestResults(arHitTestSource);
  if (results.length > 0) {
    const pose = results[0].getPose(arReferenceSpace);
    arReticle.visible = true;
    arReticle.matrix.fromArray(pose.transform.matrix);
  } else {
    arReticle.visible = false;
  }
}

function updateArBall(dt) {
  if (!arTowerPlaced || !arBall) return;
  const previousY = arBall.position.y;
  arBallVelocity += arGravity * dt;
  arBall.position.y += arBallVelocity * dt;
  arBall.rotation.x += dt * 7;

  if (arBallVelocity < 0) {
    const bottomBefore = previousY - ballRadius;
    const bottomNow = arBall.position.y - ballRadius;
    for (let i = 0; i < arPlatforms.length; i += 1) {
      const platform = arPlatforms[i];
      const platformTop = platform.y + platformThickness / 2;
      if (bottomBefore < platformTop || bottomNow > platformTop) continue;

      const localAngle = ((Math.atan2(arBall.position.z, arBall.position.x) - arTowerRotator.rotation.y) % twoPi + twoPi) % twoPi;
      const segment = Math.floor(localAngle / (twoPi / platform.segmentCount));
      if (segment === platform.gapIndex) continue;

      arBall.position.y = platformTop + ballRadius;
      arBallVelocity = arBounceVelocity;
      arAmmo = arMaxAmmo;
      playBounceSound();
      break;
    }
  }

  recycleArPlatforms();
  updateArPillarClip();
}

function updateArBullets(dt) {
  for (let i = arBullets.length - 1; i >= 0; i -= 1) {
    const bullet = arBullets[i];
    bullet.life -= dt;
    bullet.mesh.position.y -= arBulletSpeed * dt;
    bullet.mesh.scale.setScalar(Math.max(0.35, bullet.life / arBulletLifetime));
    if (bullet.life <= 0 || bullet.mesh.position.y < arBall.position.y - 4.5) {
      if (bullet.mesh.parent) bullet.mesh.parent.remove(bullet.mesh);
      bullet.mesh.material.dispose();
      arBullets.splice(i, 1);
    }
  }
}

function updateArMode(dt, frame) {
  updateArReticle(frame);
  updateArGripRotation();
  updateArScaleAdjust();
  updateArShooting(dt);
  updateArBall(dt);
  updateArBullets(dt);
}

function endArMode() {
  arModeActive = false;
  arTowerPlaced = false;
  arReferenceSpace = null;
  arViewerSpace = null;
  arHitTestSource = null;
  arActiveGripController = null;
  arGripControllers.clear();
  arScaleAdjusting = false;
  stopArShooting();
  arReticle.visible = false;
  arRoot.visible = false;
  disposeGroupChildren(arRoot);
  setDesktopVisible(true);
  document.body.classList.remove('ar-active');
  scene.background = new THREE.Color(0xeef7ff);
  setArStatus('', false);
}

async function startArMode() {
  if (!navigator.xr) {
    setArStatus('WebXR is not available in this browser. Open this site in Meta Quest Browser.');
    return;
  }

  arModeButton.disabled = true;
  setArStatus('Checking AR support...');
  try {
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!supported) {
      setArStatus('Immersive AR is not supported here. Try Meta Quest Browser on Quest 3.');
      return;
    }

    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['local-floor', 'dom-overlay'],
      domOverlay: { root: document.body },
    });

    stopShooting();
    isPaused = true;
    setDesktopVisible(false);
    document.body.classList.add('ar-active');
    scene.background = null;
    arModeActive = true;
    arTowerPlaced = false;
    arRoot.visible = false;
    setArStatus('Move the reticle onto a surface, then pull the trigger to place the tower.');

    try {
      renderer.xr.setReferenceSpaceType('local-floor');
    } catch (_) {
      renderer.xr.setReferenceSpaceType('local');
    }
    await renderer.xr.setSession(session);

    arReferenceSpace = await session.requestReferenceSpace('local-floor').catch(() => session.requestReferenceSpace('local'));
    arViewerSpace = await session.requestReferenceSpace('viewer');
    arHitTestSource = await session.requestHitTestSource({ space: arViewerSpace });

    session.addEventListener('end', () => {
      isPaused = false;
      endArMode();
    }, { once: true });
  } catch (error) {
    arModeActive = false;
    setDesktopVisible(true);
    document.body.classList.remove('ar-active');
    setArStatus(`Could not start AR: ${error.message || error}`);
  } finally {
    arModeButton.disabled = false;
  }
}

for (let i = 0; i < 2; i += 1) {
  const controller = renderer.xr.getController(i);
  controller.addEventListener('selectstart', () => {
    if (!arModeActive) return;
    if (!arTowerPlaced) {
      placeArTowerFromReticle();
      return;
    }
    startArShooting();
  });
  controller.addEventListener('selectend', () => {
    if (!arModeActive) return;
    stopArShooting();
  });
  controller.addEventListener('squeezestart', () => {
    if (!arModeActive || !arTowerPlaced) return;
    arGripControllers.add(controller);
    if (arGripControllers.size >= 2) {
      startArScaleAdjust();
      return;
    }
    arActiveGripController = controller;
    arLastGripX = getArControllerLocalX(controller);
    arLastHapticStep = Math.floor(arTowerRotator.rotation.y / THREE.MathUtils.degToRad(5));
  });
  controller.addEventListener('squeezeend', () => {
    if (!arModeActive) return;
    arGripControllers.delete(controller);
    if (arScaleAdjusting && arGripControllers.size < 2) {
      stopArScaleAdjust();
    }
    if (arActiveGripController === controller) {
      arActiveGripController = arGripControllers.size > 0 ? [...arGripControllers][0] : null;
      if (arActiveGripController) arLastGripX = getArControllerLocalX(arActiveGripController);
    }
  });
  arScene.add(controller);
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
  maxAmmo = Math.max(1, Math.min(20, Math.floor(Number(maxAmmoInput.value) || defaultMaxAmmo)));
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

arModeButton.addEventListener('click', (event) => {
  event.stopPropagation();
  startArMode();
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
  get timeScale() { return timeScale; },
  selectWeapon,
  setPaused,
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate(_time, frame) {
  const realDt = Math.min(clock.getDelta(), 0.033);

  if (arModeActive) {
    updateArMode(realDt, frame);
    renderer.render(arScene, camera);
    return;
  }

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

  if (!isPaused) {
    const lerpFactor = 1 - Math.pow(1 - 0.22, timeScale);
    world.rotation.y += (drag.targetRotation - world.rotation.y) * lerpFactor;
  }

  if (!isGameOver && !isPaused && !isLevelComplete) {
    updateShooting(dt);
    updatePowerups(dt);

    const previousY = ball.position.y;
    ballVelocity = Math.max(ballVelocity + gravity * dt, -terminalVelocity);
    ball.position.y += ballVelocity * dt;
    ball.rotation.x += dt * 8;

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
