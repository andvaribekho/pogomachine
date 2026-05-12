import * as THREE from 'three';

function basicMat(opts) {
  const mat = new THREE.MeshLambertMaterial(opts);
  mat.userData.baseColor = opts.color ?? 0xffffff;
  return mat;
}

export function createGameAssets({
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
}) {
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

  const sawBladeGeometry = new THREE.ExtrudeGeometry(sawBladeShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 1,
  });
  sawBladeGeometry.center();

  return {
    floaterDiscGeometry: new THREE.CylinderGeometry(ballRadius * 1.4, ballRadius * 1.4, 0.1, 16),
    floaterMaterial: basicMat({ color: 0x9e9e9e }),
    pillarGeometry: new THREE.CylinderGeometry(pillarRadius, pillarRadius, 80, 48),
    pillarMaterial: basicMat({ color: colors.pillar }),
    ballGeometry: new THREE.SphereGeometry(ballRadius, 32, 24),
    ballMaterial: basicMat({ color: colors.ball }),
    bulletGeometry: new THREE.SphereGeometry(0.095, 16, 12),
    bulletMaterial: basicMat({ color: colors.bullet }),
    batBodyGeometry: new THREE.SphereGeometry(0.18, 16, 10),
    batWingGeometry: new THREE.BoxGeometry(0.46, 0.045, 0.2),
    spikeBodyGeometry: new THREE.SphereGeometry(0.28, 20, 14),
    spikeConeGeometry: new THREE.ConeGeometry(0.075, 0.28, 10),
    particleGeometry: new THREE.SphereGeometry(0.045, 8, 6),
    bounceCubeGeometry: new THREE.BoxGeometry(0.14, 0.14, 0.14),
    crateGeometry: new THREE.BoxGeometry(0.34, 0.34, 0.34),
    goldBlockGeometry: new THREE.BoxGeometry(goldBlockSize, goldBlockSize, goldBlockSize),
    ledgeGeometry: new THREE.BoxGeometry(ledgeRadialLength, 0.18, 0.72),
    pillarSpikeGeometry: new THREE.ConeGeometry(0.14, ledgeRadialLength, 4),
    wormHeadGeometry: new THREE.SphereGeometry(0.18, 14, 10),
    wormSegmentGeometry: new THREE.SphereGeometry(0.15, 14, 10),
    turtleBodyGeometry: new THREE.SphereGeometry(0.22, 16, 12),
    turtleShellGeometry: new THREE.SphereGeometry(0.28, 18, 12),
    turtleSpikeGeometry: new THREE.ConeGeometry(0.055, 0.18, 8),
    jellyfishBodyGeometry: new THREE.SphereGeometry(0.24, 18, 12),
    jellyfishTentacleGeometry: new THREE.CylinderGeometry(0.018, 0.012, 0.38, 6),
    pufferBodyGeometry: new THREE.SphereGeometry(0.25, 18, 12),
    mushroomStemGeometry: new THREE.CylinderGeometry(0.1, 0.14, 0.32, 12),
    mushroomCapGeometry: new THREE.SphereGeometry(0.26, 18, 12),
    mushroomSpotGeometry: new THREE.SphereGeometry(0.045, 8, 6),
    porcupineBodyGeometry: new THREE.SphereGeometry(0.25, 16, 12),
    acidPuddleGeometry: new THREE.CircleGeometry(0.22, 20),
    acidDropletGeometry: new THREE.SphereGeometry(0.1, 10, 8),
    acidSnailBodyGeometry: new THREE.SphereGeometry(0.22, 14, 10),
    acidSnailShellGeometry: new THREE.SphereGeometry(0.28, 16, 12),
    shockwaveGeometry: new THREE.SphereGeometry(1, 24, 16),
    pillarLaserRingGeometry: new THREE.TorusGeometry(gameplayLaneRadius, 0.035, 8, 96),
    coinPickupGeometry: new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16),
    coinPickupMaterial: basicMat({ color: 0xffd700 }),
    shieldGeometry: new THREE.BoxGeometry(0.42, 0.14, 0.42),
    cannonBaseGeometry: new THREE.CylinderGeometry(0.18, 0.24, 0.22, 16),
    cannonMouthGeometry: new THREE.CylinderGeometry(0.11, 0.13, 0.34, 16),
    cannonRingGeometry: new THREE.TorusGeometry(0.2, 0.018, 8, 32),
    cannonLaserGeometry: new THREE.CylinderGeometry(0.11, 0.11, 36, 16),
    sawBladeGeometry,
    batBodyMaterial: basicMat({ color: colors.bat }),
    batWingMaterial: basicMat({ color: colors.batWing }),
    spikeMaterial: basicMat({ color: colors.spike }),
    crateMaterial: basicMat({ color: colors.crate }),
    goldBlockMaterial: basicMat({ color: colors.gold }),
    ledgeMaterial: basicMat({ color: 0x546e7a }),
    spikeHoleGeometry: new THREE.BoxGeometry(0.26, 0.018, 0.26),
    platformSpikeGeometry: new THREE.ConeGeometry(0.16, platformSpikeHeight, 4),
    spikeHoleMaterial: basicMat({ color: 0x050505 }),
    platformSpikeMaterial: basicMat({ color: 0xff1744 }),
    pillarSpikeMaterial: basicMat({ color: 0xff1744 }),
    wormMaterial: basicMat({ color: colors.worm }),
    wormHeadMaterial: basicMat({ color: 0x558b2f }),
    yellowWormMaterial: basicMat({ color: colors.yellowWorm }),
    yellowWormHeadMaterial: basicMat({ color: colors.yellowWormHead }),
    turtleBodyMaterial: basicMat({ color: 0x4caf50 }),
    turtleShellMaterial: basicMat({ color: 0xff1744 }),
    jellyfishMaterial: basicMat({ color: 0x9c27b0, transparent: true, opacity: 0.82 }),
    pufferMaterial: basicMat({ color: 0xffc107 }),
    mushroomStemMaterial: basicMat({ color: 0xfdd835 }),
    mushroomCapMaterial: basicMat({ color: 0xffeb3b }),
    mushroomSpotMaterial: basicMat({ color: 0xe53935 }),
    porcupineMaterial: basicMat({ color: 0x795548 }),
    porcupineSpikeMaterial: basicMat({ color: 0xff1744 }),
    acidPuddleMaterial: basicMat({ color: colors.acid, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    acidSnailBodyMaterial: basicMat({ color: 0x558b2f }),
    acidSnailShellMaterial: basicMat({ color: 0x795548 }),
    acidSnailCrackedShellMaterial: basicMat({ color: 0x5d4037 }),
    shockwaveMaterial: basicMat({ color: 0xff9800, transparent: true, opacity: 0.42, wireframe: true, depthWrite: false }),
    pillarLaserRingMaterial: basicMat({ color: 0xff1744, transparent: true, opacity: 0.72 }),
    cannonMaterial: basicMat({ color: 0x607d8b }),
    cannonWarningMaterial: basicMat({ color: 0xff1744, transparent: true, opacity: 0.85 }),
    laserMaterial: basicMat({ color: 0xff1744, transparent: true, opacity: 0.65 }),
    shieldMaterial: basicMat({ color: 0x80deea }),
    sawBladeMaterial: basicMat({ color: 0xff1744 }),
  };
}
