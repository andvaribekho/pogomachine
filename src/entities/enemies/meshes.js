import * as THREE from 'three';

export function createEnemyMeshFactory({ assets, twoPi }) {
  const {
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
  } = assets;

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

  function createWormMesh(options = {}) {
    const {
      bodyMaterialTemplate = wormMaterial,
      headMaterialTemplate = wormHeadMaterial,
      scale = 1,
    } = options;
    const group = new THREE.Group();
    group.scale.setScalar(scale);
    const segments = [];
    for (let i = 0; i < 4; i += 1) {
      const geometry = i === 0 ? wormHeadGeometry : wormSegmentGeometry;
      const material = i === 0 ? headMaterialTemplate.clone() : bodyMaterialTemplate.clone();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = -i * 0.24;
      mesh.scale.y = 0.62;
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
    group.add(body);

    const shell = new THREE.Mesh(turtleShellGeometry, shellMaterial);
    shell.scale.set(1.08, 0.58, 0.95);
    shell.position.y = 0.08;
    group.add(shell);

    const head = new THREE.Mesh(wormHeadGeometry, bodyMaterial);
    head.scale.set(0.7, 0.58, 0.7);
    head.position.set(0.33, 0.03, 0);
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
      group.add(spike);
    }

    return { group, materials };
  }

  function createJellyfishMesh() {
    const group = new THREE.Group();
    const material = jellyfishMaterial.clone();
    const body = new THREE.Mesh(jellyfishBodyGeometry, material);
    body.scale.set(1, 0.7, 1);
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

  function createExplosiveMushroomMesh() {
    const group = new THREE.Group();
    const stemMaterial = mushroomStemMaterial.clone();
    const capMaterial = mushroomCapMaterial.clone();
    const spotMaterial = mushroomSpotMaterial.clone();

    const stem = new THREE.Mesh(mushroomStemGeometry, stemMaterial);
    stem.position.y = -0.08;
    group.add(stem);

    const cap = new THREE.Mesh(mushroomCapGeometry, capMaterial);
    cap.scale.set(1.25, 0.58, 1.25);
    cap.position.y = 0.11;
    group.add(cap);

    const spotPositions = [
      [0, 0.19, -0.2],
      [-0.14, 0.22, -0.06],
      [0.14, 0.22, -0.06],
      [-0.08, 0.24, 0.12],
      [0.11, 0.23, 0.13],
    ];
    for (const [x, y, z] of spotPositions) {
      const spot = new THREE.Mesh(mushroomSpotGeometry, spotMaterial);
      spot.position.set(x, y, z);
      spot.scale.y = 0.35;
      group.add(spot);
    }

    return { group, stemMaterial, capMaterial, spotMaterial };
  }

  function createPorcupineMesh() {
    const group = new THREE.Group();
    const material = porcupineMaterial.clone();
    const spikeMaterial = porcupineSpikeMaterial.clone();
    const body = new THREE.Mesh(porcupineBodyGeometry, material);
    body.scale.set(1.25, 0.55, 0.8);
    group.add(body);

    const head = new THREE.Mesh(wormHeadGeometry, material);
    head.scale.set(0.72, 0.62, 0.72);
    head.position.set(0.28, 0.03, 0);
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
    group.add(body);

    const shellMaterial = acidSnailShellMaterial.clone();
    const shell = new THREE.Mesh(acidSnailShellGeometry, shellMaterial);
    shell.scale.set(1, 0.7, 1);
    shell.position.set(-0.05, 0.1, 0);
    group.add(shell);

    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 6);
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(0.26, 0.1, 0.07);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat.clone());
    eyeR.position.set(0.26, 0.1, -0.07);
    group.add(eyeR);

    return { group, bodyMaterial, shellMaterial, body, shell };
  }

  return {
    createBatMesh,
    createSpikedBallMesh,
    createWormMesh,
    createTurtleMesh,
    createJellyfishMesh,
    createPufferBombMesh,
    createExplosiveMushroomMesh,
    createPorcupineMesh,
    createAcidSnailMesh,
  };
}
