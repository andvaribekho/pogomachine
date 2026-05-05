import * as THREE from 'three';
import './style.css';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeef7ff);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 240);
camera.position.set(0, 6.2, 10.5);
camera.lookAt(0, -2.2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
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
const pauseButton = document.querySelector('#pause-button');
const pausePanelEl = document.querySelector('#pause-panel');
const closePanelButton = document.querySelector('#close-panel-button');
const impulseInput = document.querySelector('#impulse-input');
const fireIntervalInput = document.querySelector('#fire-interval-input');
const maxAmmoInput = document.querySelector('#max-ammo-input');
const levelCompleteEl = document.querySelector('#level-complete');
const completeSummaryEl = document.querySelector('#complete-summary');
const rewardHpButton = document.querySelector('#reward-hp');
const rewardAmmoButton = document.querySelector('#reward-ammo');
const buyInvulnerabilityButton = document.querySelector('#buy-invulnerability');
const buyShieldButton = document.querySelector('#buy-shield');
const shopStatusEl = document.querySelector('#shop-status');
const nextLevelButton = document.querySelector('#next-level-button');

const world = new THREE.Group();
scene.add(world);

const colors = {
  blue: 0x2196f3,
  blueFlash: 0x90caf9,
  crack: 0x0d47a1,
  finish: 0x2ecc71,
  red: 0xf44336,
  pillar: 0x243447,
  ball: 0xffd54f,
  bullet: 0xfff176,
  bat: 0x263238,
  batWing: 0x455a64,
  spike: 0x6d4c41,
  particle: 0xffe082,
  blueParticle: 0x64b5f6,
  crate: 0x9c6b30,
};

const platformInnerRadius = 0.95;
const platformOuterRadius = 3.15;
const platformThickness = 0.22;
const platformSpacing = 6.45;
const ballRadius = 0.32;
const twoPi = Math.PI * 2;
const collisionDebugEnabled = new URLSearchParams(window.location.search).has('debug');
const defaultMaxAmmo = 5;
const defaultFireInterval = 0.3;
const defaultBulletImpulse = 4.3;
const maxHp = 3;
const invulnerabilityCost = 20;
const shieldCost = 20;
const bulletSpeed = 22;
const bulletLifetime = 1.05;
const baseShotUpwardVelocityCap = 2.4;

const ballStartY = 1.9;
let ballVelocity = 0;
let gravity = -14;
let bounceVelocity = 7.7;
let score = 0;
let currentLevel = 1;
let platformsPassedThisLevel = 0;
let nextPlatformId = 0;
let isGameOver = false;
let isPaused = false;
let isLevelComplete = false;
let hp = maxHp;
let coins = 0;
let damageCooldown = 0;
let damageFlashTimer = 0;
let pendingInvulnerability = false;
let pendingShield = false;
let invulnerabilityTimer = 0;
let hasShield = false;
let rewardChosen = false;
let maxAmmo = defaultMaxAmmo;
let fireInterval = defaultFireInterval;
let bulletImpulse = defaultBulletImpulse;
let ammo = maxAmmo;
let isShooting = false;
let fireCooldown = 0;
let lastEmptySoundTime = -Infinity;
const platforms = [];
const bullets = [];
const enemies = [];
const particles = [];
const floatingTexts = [];
const crates = [];
const coinPickups = [];

let shakeIntensity = 0;
let shakeDecay = 0;
const shakeOffset = new THREE.Vector3();

const cameraBasePos = new THREE.Vector3();

const pillar = new THREE.Mesh(
  new THREE.CylinderGeometry(0.27, 0.27, 80, 32),
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
const crateGeometry = new THREE.BoxGeometry(0.34, 0.34, 0.34);
const coinPickupGeometry = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16);
const coinPickupMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xb8860b, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.7 });
const shieldGeometry = new THREE.BoxGeometry(0.42, 0.14, 0.42);
const batBodyMaterial = new THREE.MeshStandardMaterial({ color: colors.bat, roughness: 0.62 });
const batWingMaterial = new THREE.MeshStandardMaterial({ color: colors.batWing, roughness: 0.7 });
const spikeMaterial = new THREE.MeshStandardMaterial({ color: colors.spike, roughness: 0.55 });
const crateMaterial = new THREE.MeshStandardMaterial({ color: colors.crate, roughness: 0.72 });
const shieldMaterial = new THREE.MeshStandardMaterial({ color: 0x80deea, emissive: 0x00bcd4, emissiveIntensity: 0.35 });

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

let audioCtx = null;
let invulnerabilityAudio = null;

function ensureAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBounceSound() {
  try {
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);
  } catch (_) {
    /* silent */
  }
}

function playFailSound() {
  try {
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.45);
    gain.gain.setValueAtTime(0.32, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (_) {
    /* silent */
  }
}

function playShootSound() {
  try {
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.13);
  } catch (_) {
    /* silent */
  }
}

function playEmptyAmmoSound() {
  try {
    const ctx = ensureAudioCtx();
    if (ctx.currentTime - lastEmptySoundTime < 0.08) return;
    lastEmptySoundTime = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.setValueAtTime(110, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.16);
  } catch (_) {
    /* silent */
  }
}

function playReloadSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;

    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(180, now);
    click.frequency.exponentialRampToValueAtTime(95, now + 0.055);
    clickGain.gain.setValueAtTime(0.22, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(now);
    click.stop(now + 0.08);

    const ching = ctx.createOscillator();
    const chingGain = ctx.createGain();
    ching.type = 'sine';
    ching.frequency.setValueAtTime(1320, now + 0.055);
    ching.frequency.exponentialRampToValueAtTime(1900, now + 0.13);
    chingGain.gain.setValueAtTime(0.001, now + 0.045);
    chingGain.gain.linearRampToValueAtTime(0.24, now + 0.065);
    chingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    ching.connect(chingGain);
    chingGain.connect(ctx.destination);
    ching.start(now + 0.045);
    ching.stop(now + 0.42);
  } catch (_) {
    /* silent */
  }
}

function playBatDeathSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1250, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.18);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch (_) {
    /* silent */
  }
}

function playRewardSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(780, now + 0.06);
    osc.frequency.setValueAtTime(1040, now + 0.13);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  } catch (_) {
    /* silent */
  }
}

function playGlassBreakSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1350, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.18);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch (_) {
    /* silent */
  }
}

function startInvulnerabilityMusic() {
  try {
    if (invulnerabilityAudio) return;
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    gain.gain.setValueAtTime(0.045, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    invulnerabilityAudio = { osc, gain, nextChange: 0, note: 0 };
  } catch (_) {
    /* silent */
  }
}

function updateInvulnerabilityMusic() {
  if (!invulnerabilityAudio || !audioCtx) return;
  const notes = [660, 880, 990, 1320];
  if (audioCtx.currentTime >= invulnerabilityAudio.nextChange) {
    invulnerabilityAudio.osc.frequency.setValueAtTime(notes[invulnerabilityAudio.note % notes.length], audioCtx.currentTime);
    invulnerabilityAudio.note += 1;
    invulnerabilityAudio.nextChange = audioCtx.currentTime + 0.16;
  }
}

function stopInvulnerabilityMusic() {
  if (!invulnerabilityAudio || !audioCtx) return;
  invulnerabilityAudio.gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  invulnerabilityAudio.osc.stop(audioCtx.currentTime + 0.14);
  invulnerabilityAudio = null;
}

function makeArcGeometry(innerRadius, outerRadius, startAngle, endAngle, depth) {
  const positions = [];
  const indices = [];
  const segmentCount = Math.max(8, Math.ceil(((endAngle - startAngle) / twoPi) * 80));
  const yTop = depth / 2;
  const yBottom = -depth / 2;

  function vertex(radius, angle, y) {
    const index = positions.length / 3;
    positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    return index;
  }

  function quad(a, b, c, d) {
    indices.push(a, b, c, a, c, d);
  }

  for (let i = 0; i < segmentCount; i += 1) {
    const a0 = startAngle + ((endAngle - startAngle) * i) / segmentCount;
    const a1 = startAngle + ((endAngle - startAngle) * (i + 1)) / segmentCount;

    const innerTop0 = vertex(innerRadius, a0, yTop);
    const innerTop1 = vertex(innerRadius, a1, yTop);
    const outerTop1 = vertex(outerRadius, a1, yTop);
    const outerTop0 = vertex(outerRadius, a0, yTop);
    quad(outerTop0, innerTop0, innerTop1, outerTop1);

    const outerBottom0 = vertex(outerRadius, a0, yBottom);
    const outerBottom1 = vertex(outerRadius, a1, yBottom);
    const innerBottom1 = vertex(innerRadius, a1, yBottom);
    const innerBottom0 = vertex(innerRadius, a0, yBottom);
    quad(outerBottom0, outerBottom1, innerBottom1, innerBottom0);

    const outerSide0Top = vertex(outerRadius, a0, yTop);
    const outerSide1Top = vertex(outerRadius, a1, yTop);
    const outerSide1Bottom = vertex(outerRadius, a1, yBottom);
    const outerSide0Bottom = vertex(outerRadius, a0, yBottom);
    quad(outerSide0Top, outerSide1Top, outerSide1Bottom, outerSide0Bottom);

    const innerSide0Top = vertex(innerRadius, a0, yTop);
    const innerSide0Bottom = vertex(innerRadius, a0, yBottom);
    const innerSide1Bottom = vertex(innerRadius, a1, yBottom);
    const innerSide1Top = vertex(innerRadius, a1, yTop);
    quad(innerSide0Top, innerSide0Bottom, innerSide1Bottom, innerSide1Top);
  }

  const capStartOuterTop = vertex(outerRadius, startAngle, yTop);
  const capStartInnerTop = vertex(innerRadius, startAngle, yTop);
  const capStartInnerBottom = vertex(innerRadius, startAngle, yBottom);
  const capStartOuterBottom = vertex(outerRadius, startAngle, yBottom);
  quad(capStartOuterTop, capStartInnerTop, capStartInnerBottom, capStartOuterBottom);

  const capEndOuterTop = vertex(outerRadius, endAngle, yTop);
  const capEndOuterBottom = vertex(outerRadius, endAngle, yBottom);
  const capEndInnerBottom = vertex(innerRadius, endAngle, yBottom);
  const capEndInnerTop = vertex(innerRadius, endAngle, yTop);
  quad(capEndOuterTop, capEndOuterBottom, capEndInnerBottom, capEndInnerTop);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function angleInArc(angle, start, end) {
  if (start <= end) return angle >= start && angle <= end;
  return angle >= start || angle <= end;
}

function getBulletLaneAngle() {
  return Math.atan2(ball.position.z, ball.position.x);
}

function getBulletLaneRadius() {
  return Math.hypot(ball.position.x, ball.position.z);
}

function isBlueTile(tile) {
  return tile.type === 'blue' || tile.type === 'crackedBlue';
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

function createPlatform(y, id, options = {}) {
  const group = new THREE.Group();
  group.position.y = y;

  const isFinal = options.final === true;
  const difficulty = Math.min(id / 18, 1);
  const segmentCount = isFinal ? 16 : Math.floor(8 + difficulty * 5);
  const gapCount = isFinal ? 0 : Math.min(4, 2 + Math.floor(difficulty * 3));
  const redChance = isFinal ? 0 : 0.08 + difficulty * 0.17;
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
    if (type === 'blue' && Math.random() < crackedChance && id > 2) {
      type = 'crackedBlue';
    }
    const geometry = makeArcGeometry(platformInnerRadius, platformOuterRadius, start, end, platformThickness);
    const tileColor = type === 'red' ? colors.red : type === 'finish' ? colors.finish : colors.blue;
    const material = new THREE.MeshStandardMaterial({ color: tileColor, roughness: 0.6, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    const crackLine = type === 'crackedBlue' ? makeCrackLine(start, end) : null;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (crackLine) group.add(crackLine);
    const tile = { index: i, start, end, type, mesh, material, crackLine, flashTimer: 0, broken: false };
    tiles.push(tile);
  }

  if (!isFinal && Math.random() < 0.055) {
    const ballAngle = 0;
    const ballRadius = platformOuterRadius - 0.8;
    const ballTile = tiles.find(t =>
      t.type === 'blue' && !t.broken &&
      angleInArc(ballAngle, t.start, t.end)
    );
    if (ballTile) {
      createCrate(group, ballAngle, ballRadius);
    }
  }

  world.add(group);
  const platData = { id, group, tiles, scored: false, final: isFinal };
  platforms.push(platData);

  if (!isFinal) maybeSpawnEnemiesForSection(y, id);
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
  crates.push({ mesh, platformGroup, value: 5, broken: false });
}

function createBatMesh() {
  const group = new THREE.Group();
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

function positionEnemy(enemy) {
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
    speed: 0.55 + Math.random() * 0.75,
    collisionRadius: 0.35,
    flapOffset: Math.random() * twoPi,
  };
  positionEnemy(enemy);
  scene.add(enemy.group);
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
  scene.add(enemy.group);
  enemies.push(enemy);
}

function maybeSpawnEnemiesForSection(platformYValue, id) {
  if (id < 5) return;

  const difficulty = Math.min(id / 24, 1);
  const sectionY = platformYValue + platformSpacing * (0.38 + Math.random() * 0.22);
  const batChance = Math.min(0.08 + difficulty * 0.38, 0.55);
  const spikeChance = id > 10 ? Math.min((difficulty - 0.35) * 0.28, 0.22) : 0;

  if (Math.random() < batChance) {
    createBat(sectionY, id);
  }

  if (Math.random() < spikeChance) {
    createSpikedBall(sectionY - 0.9 + Math.random() * 1.8, id);
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

function reloadAmmo() {
  if (ammo === maxAmmo) return false;

  ammo = maxAmmo;
  updateAmmoUI();
  return true;
}

function setShootingImpulse(value) {
  const nextValue = Number.parseFloat(value);
  bulletImpulse = Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(nextValue, 0, 12)
    : defaultBulletImpulse;
  impulseInput.value = bulletImpulse.toFixed(1);
}

function getShotUpwardVelocityCap() {
  return Math.max(baseShotUpwardVelocityCap, bulletImpulse * 0.75);
}

function syncOptionsPanel() {
  impulseInput.value = bulletImpulse.toFixed(1);
  fireIntervalInput.value = fireInterval.toFixed(2);
  maxAmmoInput.value = String(maxAmmo);
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

function updateHeartsUI() {
  heartsEl.textContent = `${'♥'.repeat(hp)}${'♡'.repeat(maxHp - hp)}`;
}

function updateCoinsUI() {
  coinsEl.textContent = `${coins} coins`;
}

function worldToScreen(position) {
  const projected = position.clone().project(camera);
  return {
    x: (projected.x * 0.5 + 0.5) * window.innerWidth,
    y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
  };
}

function spawnCoinPickupAnimation(worldPosition) {
  const start = worldToScreen(worldPosition);
  const targetRect = coinsEl.getBoundingClientRect();
  const coin = document.createElement('div');
  coin.className = 'coin-pickup';
  coin.textContent = '+5';
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
  updateHeartsUI();
  updateCoinsUI();
  updateLevelUI();
}

function setPaused(paused) {
  isPaused = paused;
  pausePanelEl.hidden = !paused;
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
    scene.remove(bullet.mesh);
  }
}

function spawnBullet() {
  const mesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
  mesh.position.copy(ball.position);
  mesh.position.y -= ballRadius + 0.06;
  mesh.renderOrder = 5;
  scene.add(mesh);
  bullets.push({ mesh, life: bulletLifetime });
}

function fireBullet() {
  if (ammo <= 0) {
    playEmptyAmmoSound();
    return false;
  }

  ammo -= 1;
  updateAmmoUI();
  spawnBullet();
  playShootSound();
  const shotVelocityCap = getShotUpwardVelocityCap();
  if (ballVelocity < shotVelocityCap) {
    ballVelocity = Math.min(ballVelocity + bulletImpulse, shotVelocityCap);
  }

  return true;
}

function startShooting() {
  if (isGameOver || isPaused) return;
  isShooting = true;
  fireBullet();
  fireCooldown = fireInterval;
}

function updateShooting(dt) {
  if (!isShooting || isGameOver) return;

  fireCooldown -= dt;
  while (isShooting && fireCooldown <= 0) {
    fireBullet();
    fireCooldown += fireInterval;
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    const previousY = bullet.mesh.position.y;
    bullet.life -= dt;
    bullet.mesh.position.y -= bulletSpeed * dt;
    bullet.mesh.scale.setScalar(Math.max(0.45, bullet.life / bulletLifetime));

    if (checkBulletEnemyHit(bullet)) {
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
      continue;
    }

    if (checkBulletCrateHit(bullet, previousY)) {
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
      continue;
    }

    if (checkBulletPlatformHit(bullet, previousY)) {
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
      continue;
    }

    if (bullet.life <= 0) {
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
    }
  }
}

function disposeEnemy(enemy) {
  const materials = new Set();
  enemy.group.traverse((child) => {
    if (child.material) materials.add(child.material);
  });
  scene.remove(enemy.group);
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

function breakCrate(crateIndex, byBullet = false) {
  const crate = crates[crateIndex];
  if (!crate || crate.broken) return false;

  crate.broken = true;
  crate.mesh.getWorldPosition(_crateWorldPosition);
  spawnExplosion(_crateWorldPosition, colors.crate, 12);
  crate.platformGroup.remove(crate.mesh);
  crate.mesh.geometry.dispose();
  crate.mesh.material.dispose();
  crates.splice(crateIndex, 1);

  if (byBullet) {
    spawnCoinPickup(_crateWorldPosition);
  } else {
    coins += 5;
    updateCoinsUI();
    spawnCoinPickupAnimation(_crateWorldPosition);
  }
  return true;
}

function spawnCoinPickup(worldPos) {
  const mesh = new THREE.Mesh(coinPickupGeometry, coinPickupMaterial);
  mesh.position.copy(worldPos);
  mesh.position.y += 0.1;
  scene.add(mesh);
  coinPickups.push({ mesh, value: 5, collected: false });
}

function updateCoinPickups(dt) {
  for (let i = coinPickups.length - 1; i >= 0; i -= 1) {
    const pickup = coinPickups[i];
    if (pickup.collected) continue;
    pickup.mesh.rotation.y += dt * 3;
    pickup.mesh.position.y += Math.sin(performance.now() * 0.004 + i) * 0.002;

    const dx = ball.position.x - pickup.mesh.position.x;
    const dy = ball.position.y - pickup.mesh.position.y;
    const dz = ball.position.z - pickup.mesh.position.z;
    if (dx * dx + dy * dy + dz * dz <= (ballRadius + 0.25) * (ballRadius + 0.25)) {
      pickup.collected = true;
      coins += pickup.value;
      updateCoinsUI();
      spawnCoinPickupAnimation(pickup.mesh.position);
      scene.remove(pickup.mesh);
      pickup.mesh.geometry.dispose();
      coinPickups.splice(i, 1);
    }
  }
}

function clearCoinPickups() {
  while (coinPickups.length) {
    const pickup = coinPickups.pop();
    scene.remove(pickup.mesh);
    pickup.mesh.geometry.dispose();
  }
}

function disposeTile(tile) {
  if (tile.mesh.parent) tile.mesh.parent.remove(tile.mesh);
  tile.mesh.geometry.dispose();
  tile.material.dispose();

  if (tile.crackLine) {
    if (tile.crackLine.parent) tile.crackLine.parent.remove(tile.crackLine);
    tile.crackLine.geometry.dispose();
    tile.crackLine.material.dispose();
  }
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

  tile.broken = true;
  disposeTile(tile);
  playGlassBreakSound();
  spawnExplosion(breakPosition, colors.blueParticle, 18);
}

function removeEnemyAt(index, explosionColor) {
  const enemy = enemies[index];
  const position = enemy.group.position.clone();
  disposeEnemy(enemy);
  enemies.splice(index, 1);
  spawnExplosion(position, explosionColor, enemy.type === 'bat' ? 12 : 18);
}

function damageEnemy(enemyIndex) {
  const enemy = enemies[enemyIndex];
  if (enemy.type === 'bat') {
    playBatDeathSound();
    removeEnemyAt(enemyIndex, colors.particle);
    return;
  }

  enemy.hp -= 1;
  enemy.flashTimer = 0.18;
  enemy.material.emissive.setHex(0xff0000);
  enemy.material.emissiveIntensity = 0.9;

  if (enemy.hp <= 0) {
    removeEnemyAt(enemyIndex, colors.red);
  }
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

function checkBulletEnemyHit(bullet) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const hitRadius = enemy.collisionRadius + 0.12;
    if (bullet.mesh.position.distanceToSquared(enemy.group.position) <= hitRadius * hitRadius) {
      damageEnemy(i);
      return true;
    }
  }
  return false;
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
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
    positionEnemy(enemy);

    if (enemy.type === 'bat') {
      const flap = Math.sin(performance.now() * 0.018 + enemy.flapOffset) * 0.55;
      enemy.leftWing.rotation.z = -0.28 - flap;
      enemy.rightWing.rotation.z = 0.28 + flap;
    } else {
      enemy.group.rotation.x += dt * 1.1;
      enemy.group.rotation.z += dt * 0.8;
      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= dt;
      } else {
        enemy.material.emissiveIntensity = 0;
      }
    }

    const playerHitRadius = enemy.collisionRadius + ballRadius * 0.78;
    if (ball.position.distanceToSquared(enemy.group.position) <= playerHitRadius * playerHitRadius) {
      applyDamage();
      return;
    }

    if (enemy.y > ball.position.y + 15) {
      disposeEnemy(enemy);
      enemies.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.life -= dt;
    particle.velocity.y -= 3.5 * dt;
    particle.mesh.position.addScaledVector(particle.velocity, dt);
    particle.mesh.scale.multiplyScalar(0.965);
    particle.material.opacity = Math.max(0, particle.life / 0.8);

    if (particle.life <= 0) {
      scene.remove(particle.mesh);
      particle.material.dispose();
      particles.splice(i, 1);
    }
  }
}

function spawnFloatingText(text, position) {
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
  context.fillStyle = '#2ecc71';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.position.y += ballRadius + 0.28;
  sprite.scale.set(1.35, 0.68, 1);
  sprite.renderOrder = 20;
  scene.add(sprite);
  floatingTexts.push({ sprite, material, texture, life: 1, startY: sprite.position.y });
}

function updateFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
    const item = floatingTexts[i];
    item.life -= dt;
    const progress = 1 - Math.max(0, item.life);
    item.sprite.position.y = item.startY + progress * 1.1;
    item.sprite.material.opacity = Math.max(0, item.life);
    const scale = 1 + progress * 0.22;
    item.sprite.scale.set(1.35 * scale, 0.68 * scale, 1);

    if (item.life <= 0) {
      scene.remove(item.sprite);
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
    scene.remove(particle.mesh);
    particle.material.dispose();
  }
  while (floatingTexts.length) {
    const item = floatingTexts.pop();
    scene.remove(item.sprite);
    item.texture.dispose();
    item.material.dispose();
  }
}

function clearTower() {
  clearBullets();
  clearEnemiesAndParticles();
  clearCoinPickups();
  crates.length = 0;

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
  gravity = -14;
  bounceVelocity = 7.7;
  world.rotation.y = 0;
  drag.targetRotation = 0;
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
  scoreEl.textContent = String(score);
  updateLevelUI();
  gameOverEl.hidden = true;
  ball.material.color.setHex(colors.ball);
  stopInvulnerabilityMusic();
  activatePendingPowerups();

  const target = getLevelTarget();
  for (let i = 0; i <= target; i += 1) {
    createPlatform(-i * platformSpacing, nextPlatformId, { final: i === target });
    nextPlatformId += 1;
  }
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
  updatePersistentUI();
  startLevel();
}

function endGame() {
  isGameOver = true;
  stopShooting();
  stopInvulnerabilityMusic();
  finalScoreEl.textContent = String(score);
  gameOverEl.hidden = false;
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
  updateHeartsUI();
  damageFlashTimer = 0.28;
  playFailSound();
  triggerShake(0.65);
  damageCooldown = 1.1;

  if (hp <= 0) {
    endGame();
  }
}

function updatePowerups(dt) {
  if (damageCooldown > 0) damageCooldown = Math.max(0, damageCooldown - dt);
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
    const hue = (performance.now() * 0.0008) % 1;
    ball.material.color.setHSL(hue, 0.95, 0.58);
    updateInvulnerabilityMusic();
    if (invulnerabilityTimer === 0) {
      ball.material.color.setHex(colors.ball);
      stopInvulnerabilityMusic();
    }
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

function updateLevelCompleteUI() {
  completeSummaryEl.textContent = `Level ${currentLevel} cleared. Coins: ${coins}. Choose one reward, then start Level ${currentLevel + 1}.`;
  rewardHpButton.disabled = rewardChosen || hp >= maxHp;
  rewardAmmoButton.disabled = rewardChosen;
  nextLevelButton.disabled = !rewardChosen;
  buyInvulnerabilityButton.disabled = coins < invulnerabilityCost || pendingInvulnerability;
  buyShieldButton.disabled = coins < shieldCost || pendingShield || hasShield;
}

function completeLevel() {
  if (isLevelComplete) return;
  isLevelComplete = true;
  stopShooting();
  stopInvulnerabilityMusic();
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

  for (const platform of platforms) {
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

function handlePlatformCollision(previousY) {
  if (ballVelocity >= 0) return;

  const bottomNow = ball.position.y - ballRadius;
  const bottomBefore = previousY - ballRadius;
  const crossedPlatforms = [];

  for (const platform of platforms) {
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

    ball.position.y = platformTop + ballRadius;
    ballVelocity = bounceVelocity;
    if (reloadAmmo()) {
      spawnFloatingText(`+ ${maxAmmo}`, ball.position);
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
      score += 1;
      if (!platform.final) {
        platformsPassedThisLevel = Math.min(getLevelTarget(), platformsPassedThisLevel + 1);
      }
      scoreEl.textContent = String(score);
      updateLevelUI();
      gravity = -14 - Math.min(score * 0.08, 3.5);
      bounceVelocity = 7.7 + Math.min(score * 0.025, 0.8);
    }

    if (y > ball.position.y + 12) {
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
      (Math.random() - 0.5) * shakeIntensity * 0.4
    );
    camera.position.copy(cameraBasePos).add(shakeOffset);
    shakeIntensity *= Math.exp(-shakeDecay * dt);
  } else {
    shakeIntensity = 0;
  }
}

const _flashA = new THREE.Color();
const _flashB = new THREE.Color();

function updateTileFlashes(dt) {
  for (const platform of platforms) {
    for (const tile of platform.tiles) {
      if (!isBlueTile(tile) || tile.broken) continue;

      if (tile.flashTimer > 0) {
        tile.flashTimer = Math.max(0, tile.flashTimer - dt);
        const t = tile.flashTimer / 0.3;
        _flashA.setHex(colors.blue);
        _flashB.setHex(colors.blueFlash);
        tile.mesh.material.color.copy(_flashA.lerp(_flashB, t));
      } else {
        tile.mesh.material.color.setHex(colors.blue);
      }
    }
  }
}

function onPointerDown(event) {
  if (isPaused || isLevelComplete) return;
  if (isGameOver) {
    resetGame();
    return;
  }
  stopShooting();
  drag.active = true;
  drag.x = event.clientX;
}

function onPointerMove(event) {
  if (!drag.active || isGameOver || isPaused || isLevelComplete) return;
  const dx = event.clientX - drag.x;
  drag.x = event.clientX;
  drag.targetRotation += dx * 0.012;
}

function onPointerUp() {
  const wasDragging = drag.active;
  drag.active = false;
  if (wasDragging && !isGameOver && !isPaused && !isLevelComplete) {
    startShooting();
  }
}

function onPointerCancel() {
  drag.active = false;
  stopShooting();
}

function onKeyDown(event) {
  if (event.key.toLowerCase() === 'p') {
    if (isGameOver) return;
    setPaused(!isPaused);
  }
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

levelCompleteEl.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});

rewardHpButton.addEventListener('click', () => {
  if (rewardChosen) return;
  playRewardSound();
  if (hp < maxHp) {
    hp += 1;
    updateHeartsUI();
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
  updateCoinsUI();
  shopStatusEl.textContent = 'Invulnerability will activate at the start of the next level.';
  updateLevelCompleteUI();
});

buyShieldButton.addEventListener('click', () => {
  if (coins < shieldCost || pendingShield || hasShield) return;
  coins -= shieldCost;
  pendingShield = true;
  updateCoinsUI();
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

fireIntervalInput.addEventListener('input', () => {
  fireInterval = Math.max(0.08, Number(fireIntervalInput.value) || defaultFireInterval);
  if (isShooting) fireCooldown = Math.min(fireCooldown, fireInterval);
});

maxAmmoInput.addEventListener('input', () => {
  maxAmmo = Math.max(1, Math.min(20, Math.floor(Number(maxAmmoInput.value) || defaultMaxAmmo)));
  ammo = Math.min(ammo, maxAmmo);
  rebuildAmmoUI();
  maxAmmoInput.value = String(maxAmmo);
});

window.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointercancel', onPointerCancel);
window.addEventListener('keydown', onKeyDown);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  if (!isPaused) {
    world.rotation.y += (drag.targetRotation - world.rotation.y) * 0.22;
  }

  if (!isGameOver && !isPaused && !isLevelComplete) {
    updateShooting(dt);
    updatePowerups(dt);

    const previousY = ball.position.y;
    ballVelocity += gravity * dt;
    ball.position.y += ballVelocity * dt;
    ball.rotation.x += dt * 8;

    scene.updateMatrixWorld(true);
    checkBallCrateHit(previousY);
    handlePlatformCollision(previousY);
    updateBullets(dt);
    updateEnemies(dt);
    updateCoinPickups(dt);
    recyclePlatforms();
    updateParticles(dt);
    updateFloatingTexts(dt);
    updateTileFlashes(dt);
    updateCamera(dt);
  }

  renderer.render(scene, camera);
}

rebuildAmmoUI();
syncOptionsPanel();
resetGame();
animate();
