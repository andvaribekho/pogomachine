import * as THREE from 'three';

export function createLevelBossSystem({
  world,
  ball,
  platforms,
  platformThickness,
  platformOuterRadius,
  gameplayLaneRadius,
  twoPi,
  getCurrentLevel,
  getLevelTarget,
  getPlatformsPassedThisLevel,
  getPlayerHitboxRadius,
  getBounceVelocity,
  setBallVelocity,
  applyDamage,
  bossHealthEl,
  bossHealthFillEl,
  spawnParticle,
  spawnExplosion,
  playBatDeathSound,
  playBossDeathSound,
  playBossSpawnSound,
  playBounceSound,
  colors,
}) {
  const boss = { active: false, dead: false, dying: false, spawnProgress: 0, deathTimer: 0, deathEmitTimer: 0, deathCubesEmitted: 0, deathCubes: [], group: null, platform: null, eyes: [], spikes: [], hp: 8, openEyeIndex: -1, eyeTimer: 0, attackTimer: 0, shakeTimer: 0, contactCooldown: 0 };
  const bossWorldPosition = new THREE.Vector3();
  const eyeWorldPosition = new THREE.Vector3();
  const spikeWorldPosition = new THREE.Vector3();
  const tmpVelocity = new THREE.Vector3();
  const cubeLocalPosition = new THREE.Vector3();

  const bodyGeometry = new THREE.CylinderGeometry(platformOuterRadius, platformOuterRadius, 0.16, 64);
  const spikeGeometry = new THREE.ConeGeometry(0.08, 0.34, 8);
  const eyeGeometry = new THREE.SphereGeometry(0.32, 16, 10);
  const pupilGeometry = new THREE.SphereGeometry(0.11, 8, 6);
  const deathCubeGeometry = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  const bigDeathCubeGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
  const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xb71c1c });
  const spikeMaterial = new THREE.MeshLambertMaterial({ color: 0xff1744 });
  const closedEyeMaterial = new THREE.MeshLambertMaterial({ color: 0x250000 });
  const openEyeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const eyeFlashMaterial = new THREE.MeshLambertMaterial({ color: 0xffeb3b });
  const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x050505 });
  const deathCubeMaterial = new THREE.MeshLambertMaterial({ color: colors.red });

  function updateBossHealthUI() {
    if (!bossHealthEl || !bossHealthFillEl) return;
    bossHealthEl.hidden = !boss.active;
    bossHealthFillEl.style.width = `${Math.max(0, boss.hp / 8) * 100}%`;
  }

  function spawnDeathCube(position, velocity, life, big = false) {
    const mesh = new THREE.Mesh(big ? bigDeathCubeGeometry : deathCubeGeometry, deathCubeMaterial);
    mesh.position.copy(position);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    world.attach(mesh);
    boss.deathCubes.push({ mesh, velocity: velocity.clone(), angularVelocity: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8), life });
  }

  function getRandomEyeWorldPosition(target) {
    const eye = boss.eyes[Math.floor(Math.random() * boss.eyes.length)];
    if (!eye) return boss.group.getWorldPosition(target);
    return eye.group.getWorldPosition(target);
  }

  function updateDeathCubes(dt) {
    for (let i = boss.deathCubes.length - 1; i >= 0; i -= 1) {
      const cube = boss.deathCubes[i];
      cube.life -= dt;
      cube.velocity.y -= 14 * dt;
      cube.mesh.getWorldPosition(cubeLocalPosition);
      cubeLocalPosition.addScaledVector(cube.velocity, dt);
      cube.mesh.position.copy(cubeLocalPosition);
      world.worldToLocal(cube.mesh.position);
      cube.mesh.rotation.x += cube.angularVelocity.x * dt;
      cube.mesh.rotation.y += cube.angularVelocity.y * dt;
      cube.mesh.rotation.z += cube.angularVelocity.z * dt;
      if (cube.life <= 0) {
        cube.mesh.removeFromParent();
        boss.deathCubes.splice(i, 1);
      }
    }
  }

  function setEyeOpen(index, open) {
    const eye = boss.eyes[index];
    if (!eye) return;
    eye.mesh.material = eye.flashTimer > 0 ? eyeFlashMaterial : open ? openEyeMaterial : closedEyeMaterial;
    eye.mesh.scale.set(1, open ? 1 : 0.18, 1);
    eye.pupil.visible = open;
  }

  function closeOpenEye() {
    if (boss.openEyeIndex >= 0) setEyeOpen(boss.openEyeIndex, false);
    boss.openEyeIndex = -1;
    boss.eyeTimer = 0.65 + Math.random() * 0.55;
  }

  function openRandomEye() {
    boss.openEyeIndex = Math.floor(Math.random() * boss.eyes.length);
    setEyeOpen(boss.openEyeIndex, true);
    boss.eyeTimer = 3;
  }

  function createBoss(platform) {
    clearBoss();
    boss.active = true;
    boss.dead = false;
    boss.dying = false;
    boss.spawnProgress = 0;
    boss.deathTimer = 0;
    boss.deathEmitTimer = 0;
    boss.deathCubesEmitted = 0;
    boss.platform = platform;
    boss.hp = 8;
    boss.openEyeIndex = -1;
    boss.eyeTimer = 0.8;
    boss.attackTimer = 0.45;
    boss.shakeTimer = 0;
    boss.contactCooldown = 0;

    const group = new THREE.Group();
    group.position.y = platformThickness / 2 + 0.09;

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * twoPi;
      const radius = i % 2 === 0 ? gameplayLaneRadius : platformOuterRadius - 0.32;
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
      spike.position.set(Math.cos(angle) * radius, 0.22, Math.sin(angle) * radius);
      group.add(spike);
    }

    boss.eyes = [];
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * twoPi;
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(Math.cos(angle) * gameplayLaneRadius, 0.28, Math.sin(angle) * gameplayLaneRadius);
      const eyeMesh = new THREE.Mesh(eyeGeometry, closedEyeMaterial);
      eyeMesh.scale.set(1, 0.18, 1);
      const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      pupil.position.set(0, 0.18, 0.22);
      pupil.visible = false;
      eyeGroup.rotation.y = -angle;
      eyeGroup.add(eyeMesh, pupil);
      group.add(eyeGroup);
      boss.eyes.push({ group: eyeGroup, mesh: eyeMesh, pupil, angle, flashTimer: 0 });
    }

    platform.group.add(group);
    group.scale.setScalar(0.05);
    boss.group = group;
    updateBossHealthUI();
    playBossSpawnSound();
  }

  function ensureBoss() {
    if (getCurrentLevel() !== 1 || boss.active || boss.dead) return;
    if (getPlatformsPassedThisLevel() < getLevelTarget() - 2) return;
    const platform = platforms.find(candidate => candidate.final);
    if (platform) createBoss(platform);
  }

  function spawnBossSpike() {
    if (!boss.group) return;
    const angle = Math.floor(Math.random() * 8) / 8 * twoPi;
    const mesh = new THREE.Mesh(spikeGeometry, spikeMaterial);
    mesh.position.set(Math.cos(angle) * gameplayLaneRadius, 0.42, Math.sin(angle) * gameplayLaneRadius);
    boss.group.add(mesh);
    boss.spikes.push({ mesh, velocity: 7.2, hit: false });
  }

  function clearBossSpikes() {
    while (boss.spikes.length) {
      const spike = boss.spikes.pop();
      spike.mesh.removeFromParent();
    }
  }

  function damageBoss(eyeIndex) {
    if (boss.dying) return;
    if (boss.eyes[eyeIndex]) boss.eyes[eyeIndex].group.getWorldPosition(eyeWorldPosition);
    boss.hp -= 1;
    boss.shakeTimer = 0.22;
    if (boss.eyes[eyeIndex]) boss.eyes[eyeIndex].flashTimer = 0.18;
    setEyeOpen(eyeIndex, true);
    updateBossHealthUI();
    spawnExplosion(eyeWorldPosition, colors.red, 12);
    playBatDeathSound();
    closeOpenEye();
    if (boss.hp <= 0) killBoss();
  }

  function killBoss() {
    if (!boss.active || !boss.group) return;
    boss.dying = true;
    boss.deathTimer = 3;
    boss.deathEmitTimer = 0;
    boss.deathCubesEmitted = 0;
    closeOpenEye();
    clearBossSpikes();
    playBossDeathSound();
  }

  function emitRoarDeathCube() {
    getRandomEyeWorldPosition(bossWorldPosition);
    tmpVelocity.set((Math.random() - 0.5) * 1.8, getBounceVelocity() * 1.5 + Math.random() * 1.6, (Math.random() - 0.5) * 1.8);
    spawnDeathCube(bossWorldPosition, tmpVelocity, 1.2 + Math.random() * 0.8);
    boss.deathCubesEmitted += 1;
  }

  function finishBossDeath() {
    if (!boss.group) return;
    for (let i = 0; i < 10; i += 1) {
      getRandomEyeWorldPosition(bossWorldPosition);
      tmpVelocity.set((Math.random() - 0.5) * 3, getBounceVelocity() * 1.5 + Math.random() * 3.2, (Math.random() - 0.5) * 3);
      spawnDeathCube(bossWorldPosition, tmpVelocity, 1.8 + Math.random() * 0.8, true);
    }
    boss.group.removeFromParent();
    boss.active = false;
    boss.dead = true;
    boss.dying = false;
    boss.group = null;
    boss.platform = null;
    clearBossSpikes();
    boss.eyes.length = 0;
    updateBossHealthUI();
  }

  function checkBulletBossHit(bullet) {
    if (!boss.active || !boss.group || boss.dying) return false;

    if (boss.openEyeIndex >= 0) {
      boss.eyes[boss.openEyeIndex].group.getWorldPosition(eyeWorldPosition);
      if (bullet.mesh.position.distanceToSquared(eyeWorldPosition) <= 0.56 * 0.56) {
        damageBoss(boss.openEyeIndex);
        return true;
      }
    }

    boss.group.getWorldPosition(bossWorldPosition);
    const dy = Math.abs(bullet.mesh.position.y - bossWorldPosition.y);
    const radial = Math.hypot(bullet.mesh.position.x - bossWorldPosition.x, bullet.mesh.position.z - bossWorldPosition.z);
    return dy <= 0.3 && radial <= platformOuterRadius;
  }

  function updateBoss(dt) {
    updateDeathCubes(dt);
    ensureBoss();
    if (!boss.active || !boss.group) return;

    for (let i = 0; i < boss.eyes.length; i += 1) {
      const eye = boss.eyes[i];
      if (eye.flashTimer > 0) {
        eye.flashTimer = Math.max(0, eye.flashTimer - dt);
        setEyeOpen(i, i === boss.openEyeIndex);
      }
    }

    if (boss.spawnProgress < 1) {
      boss.spawnProgress = Math.min(1, boss.spawnProgress + dt * 1.35);
      const ease = 1 - (1 - boss.spawnProgress) ** 3;
      boss.group.scale.setScalar(0.05 + ease * 0.95);
    }

    if (boss.dying) {
    boss.deathTimer = Math.max(0, boss.deathTimer - dt);
      boss.deathEmitTimer += dt;
      while (boss.deathCubesEmitted < 50 && boss.deathEmitTimer >= 3 / 50) {
        boss.deathEmitTimer -= 3 / 50;
        emitRoarDeathCube();
      }
      boss.group.position.x = (Math.random() - 0.5) * 0.12;
      boss.group.position.z = (Math.random() - 0.5) * 0.12;
      if (boss.deathTimer <= 0) finishBossDeath();
      return;
    }

    boss.contactCooldown = Math.max(0, boss.contactCooldown - dt);
    boss.group.getWorldPosition(bossWorldPosition);
    const contactRadius = platformOuterRadius + getPlayerHitboxRadius() * 0.3;
    if (boss.contactCooldown <= 0 && Math.abs(ball.position.y - bossWorldPosition.y) <= 0.55 && Math.hypot(ball.position.x - bossWorldPosition.x, ball.position.z - bossWorldPosition.z) <= contactRadius) {
      boss.contactCooldown = 0.7;
      applyDamage();
      setBallVelocity(15.5);
    }

    boss.eyeTimer -= dt;
    if (boss.eyeTimer <= 0) {
      if (boss.openEyeIndex >= 0) closeOpenEye();
      else openRandomEye();
    }

    if (boss.spawnProgress < 1) return;

    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      boss.attackTimer = 0.76 + Math.random() * 0.56;
      spawnBossSpike();
    }

    if (boss.shakeTimer > 0) {
      boss.shakeTimer = Math.max(0, boss.shakeTimer - dt);
      boss.group.position.x = (Math.random() - 0.5) * 0.08;
      boss.group.position.z = (Math.random() - 0.5) * 0.08;
    } else {
      boss.group.position.x = 0;
      boss.group.position.z = 0;
    }

    const hitRadius = getPlayerHitboxRadius() + 0.1;
    for (let i = boss.spikes.length - 1; i >= 0; i -= 1) {
      const spike = boss.spikes[i];
      spike.mesh.position.y += spike.velocity * dt;
      spike.mesh.getWorldPosition(spikeWorldPosition);
      tmpVelocity.set((Math.random() - 0.5) * 0.18, -0.25 - Math.random() * 0.25, (Math.random() - 0.5) * 0.18);
      spawnParticle({ position: spikeWorldPosition, color: colors.red, velocity: tmpVelocity.clone(), life: 0.22 + Math.random() * 0.14, scale: 1.2 });
      if (!spike.hit && ball.position.distanceToSquared(spikeWorldPosition) <= hitRadius * hitRadius) {
        spike.hit = true;
        applyDamage();
      }
      if (spike.mesh.position.y > 18) {
        spike.mesh.removeFromParent();
        boss.spikes.splice(i, 1);
      }
    }
  }

  function isFinalPlatformBlocked() {
    return getCurrentLevel() === 1 && boss.active;
  }

  function clearBoss() {
    if (boss.group) boss.group.removeFromParent();
    boss.active = false;
    boss.dead = false;
    boss.dying = false;
    boss.spawnProgress = 0;
    boss.deathTimer = 0;
    boss.deathEmitTimer = 0;
    boss.deathCubesEmitted = 0;
    boss.group = null;
    boss.platform = null;
    boss.eyes.length = 0;
    clearBossSpikes();
    while (boss.deathCubes.length) boss.deathCubes.pop().mesh.removeFromParent();
    boss.openEyeIndex = -1;
    boss.contactCooldown = 0;
    updateBossHealthUI();
  }

  return { updateBoss, checkBulletBossHit, isFinalPlatformBlocked, clearBoss };
}
