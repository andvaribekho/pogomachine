import * as THREE from 'three';

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
    floaterMaterial: new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.6, metalness: 0.1 }),
    pillarGeometry: new THREE.CylinderGeometry(pillarRadius, pillarRadius, 80, 48),
    pillarMaterial: new THREE.MeshStandardMaterial({ color: colors.pillar, roughness: 0.55 }),
    ballGeometry: new THREE.SphereGeometry(ballRadius, 32, 24),
    ballMaterial: new THREE.MeshStandardMaterial({ color: colors.ball, roughness: 0.35, metalness: 0.05 }),
    bulletGeometry: new THREE.SphereGeometry(0.095, 16, 12),
    bulletMaterial: new THREE.MeshBasicMaterial({ color: colors.bullet }),
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
    coinPickupMaterial: new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xb8860b, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.7 }),
    shieldGeometry: new THREE.BoxGeometry(0.42, 0.14, 0.42),
    cannonBaseGeometry: new THREE.CylinderGeometry(0.18, 0.24, 0.22, 16),
    cannonMouthGeometry: new THREE.CylinderGeometry(0.11, 0.13, 0.34, 16),
    cannonRingGeometry: new THREE.TorusGeometry(0.2, 0.018, 8, 32),
    cannonLaserGeometry: new THREE.CylinderGeometry(0.11, 0.11, 36, 16),
    sawBladeGeometry,
    batBodyMaterial: new THREE.MeshStandardMaterial({ color: colors.bat, roughness: 0.62 }),
    batWingMaterial: new THREE.MeshStandardMaterial({ color: colors.batWing, roughness: 0.7 }),
    spikeMaterial: new THREE.MeshStandardMaterial({ color: colors.spike, roughness: 0.55 }),
    crateMaterial: new THREE.MeshStandardMaterial({ color: colors.crate, roughness: 0.72 }),
    goldBlockMaterial: new THREE.MeshStandardMaterial({ color: colors.gold, emissive: 0x8a5a00, emissiveIntensity: 0.25, roughness: 0.28, metalness: 0.65 }),
    ledgeMaterial: new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.58, metalness: 0.05 }),
    spikeHoleGeometry: new THREE.BoxGeometry(0.26, 0.018, 0.26),
    platformSpikeGeometry: new THREE.ConeGeometry(0.16, platformSpikeHeight, 4),
    spikeHoleMaterial: new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.82 }),
    platformSpikeMaterial: new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.48, metalness: 0.08 }),
    pillarSpikeMaterial: new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.48, metalness: 0.08 }),
    wormMaterial: new THREE.MeshStandardMaterial({ color: colors.worm, roughness: 0.5, metalness: 0.08 }),
    wormHeadMaterial: new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.45, metalness: 0.08 }),
    yellowWormMaterial: new THREE.MeshStandardMaterial({ color: colors.yellowWorm, roughness: 0.5, metalness: 0.08 }),
    yellowWormHeadMaterial: new THREE.MeshStandardMaterial({ color: colors.yellowWormHead, roughness: 0.45, metalness: 0.08 }),
    turtleBodyMaterial: new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.5, metalness: 0.05 }),
    turtleShellMaterial: new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0x7a0000, emissiveIntensity: 0.18, roughness: 0.44, metalness: 0.08 }),
    jellyfishMaterial: new THREE.MeshStandardMaterial({ color: 0x9c27b0, emissive: 0x4a148c, emissiveIntensity: 0.28, roughness: 0.36, transparent: true, opacity: 0.82 }),
    pufferMaterial: new THREE.MeshStandardMaterial({ color: 0xffc107, emissive: 0xff6f00, emissiveIntensity: 0.22, roughness: 0.48 }),
    mushroomStemMaterial: new THREE.MeshStandardMaterial({ color: 0xfdd835, emissive: 0x8a6d00, emissiveIntensity: 0.14, roughness: 0.55 }),
    mushroomCapMaterial: new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xff9800, emissiveIntensity: 0.2, roughness: 0.5 }),
    mushroomSpotMaterial: new THREE.MeshStandardMaterial({ color: 0xe53935, emissive: 0x7f0000, emissiveIntensity: 0.18, roughness: 0.48 }),
    porcupineMaterial: new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.56, metalness: 0.04 }),
    porcupineSpikeMaterial: new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.48, metalness: 0.08 }),
    acidPuddleMaterial: new THREE.MeshStandardMaterial({ color: colors.acid, emissive: 0x2e7d32, emissiveIntensity: 0.45, roughness: 0.6, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    acidSnailBodyMaterial: new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.55, metalness: 0.05 }),
    acidSnailShellMaterial: new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.5, metalness: 0.08 }),
    acidSnailCrackedShellMaterial: new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.5, metalness: 0.08, emissive: 0x3e2723, emissiveIntensity: 0.3 }),
    shockwaveMaterial: new THREE.MeshBasicMaterial({ color: 0xff9800, transparent: true, opacity: 0.42, wireframe: true, depthWrite: false }),
    pillarLaserRingMaterial: new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.72 }),
    cannonMaterial: new THREE.MeshStandardMaterial({ color: 0x607d8b, roughness: 0.45, metalness: 0.35 }),
    cannonWarningMaterial: new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.85 }),
    laserMaterial: new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.65 }),
    shieldMaterial: new THREE.MeshStandardMaterial({ color: 0x80deea, emissive: 0x00bcd4, emissiveIntensity: 0.35 }),
    sawBladeMaterial: new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0x8b0000, emissiveIntensity: 0.28, roughness: 0.34, metalness: 0.65 }),
  };
}
