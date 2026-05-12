import * as THREE from 'three';

const MAX_COINS = 256;
const COIN_HIT_RADIUS = 0.25;

export function createCoinPickupSystem({
  camera,
  world,
  ball,
  ballRadius,
  coinsEl,
  coinPickups,
  coinPickupGeometry,
  coinPickupMaterial,
  platformThickness,
  getCoins,
  setCoins,
  updateCoinsUI,
}) {
  const coinLocalPosition = new THREE.Vector3();
  const ballInWorldLocal = new THREE.Vector3();
  const coinSceneWorld = new THREE.Vector3();

  const tmpMatrix = new THREE.Matrix4();
  const tmpPos = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpScale = new THREE.Vector3(1, 1, 1);
  const upAxis = new THREE.Vector3(0, 1, 0);
  const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

  const instancedMesh = new THREE.InstancedMesh(coinPickupGeometry, coinPickupMaterial, MAX_COINS);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  instancedMesh.count = MAX_COINS;
  instancedMesh.frustumCulled = false;
  world.add(instancedMesh);
  for (let i = 0; i < MAX_COINS; i += 1) instancedMesh.setMatrixAt(i, zeroMatrix);
  instancedMesh.instanceMatrix.needsUpdate = true;

  const freeSlots = [];
  for (let i = MAX_COINS - 1; i >= 0; i -= 1) freeSlots.push(i);

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

  function setCoinMatrix(slotIndex, x, y, z, rotY) {
    tmpQuat.setFromAxisAngle(upAxis, rotY);
    tmpPos.set(x, y, z);
    tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
    instancedMesh.setMatrixAt(slotIndex, tmpMatrix);
  }

  function releaseSlot(slotIndex) {
    instancedMesh.setMatrixAt(slotIndex, zeroMatrix);
    freeSlots.push(slotIndex);
  }

  function spawnCoinPickup(sceneWorldPos, platformGroup) {
    coinLocalPosition.copy(sceneWorldPos);
    platformGroup.worldToLocal(coinLocalPosition);
    coinLocalPosition.y = platformThickness / 2 + 0.04;
    const wlx = platformGroup.position.x + coinLocalPosition.x;
    const wly = platformGroup.position.y + coinLocalPosition.y;
    const wlz = platformGroup.position.z + coinLocalPosition.z;

    const slotIndex = freeSlots.pop();
    if (slotIndex === undefined) return;

    setCoinMatrix(slotIndex, wlx, wly, wlz, 0);
    instancedMesh.instanceMatrix.needsUpdate = true;

    coinPickups.push({
      slotIndex, value: 5, collected: false, platformGroup,
      x: wlx, y: wly, z: wlz, rotation: 0,
    });
  }

  function updateCoinPickups(dt) {
    if (coinPickups.length === 0) return;
    world.updateMatrixWorld();
    ballInWorldLocal.copy(ball.position);
    world.worldToLocal(ballInWorldLocal);

    const collectRadius = ballRadius + COIN_HIT_RADIUS;
    const collectRadiusSq = collectRadius * collectRadius;
    let dirty = false;

    for (let i = coinPickups.length - 1; i >= 0; i -= 1) {
      const pickup = coinPickups[i];
      if (pickup.collected) continue;
      pickup.rotation += dt * 3;
      setCoinMatrix(pickup.slotIndex, pickup.x, pickup.y, pickup.z, pickup.rotation);
      dirty = true;

      const dx = ballInWorldLocal.x - pickup.x;
      const dy = ballInWorldLocal.y - pickup.y;
      const dz = ballInWorldLocal.z - pickup.z;
      if (dx * dx + dy * dy + dz * dz <= collectRadiusSq) {
        pickup.collected = true;
        setCoins(getCoins() + pickup.value);
        updateCoinsUI(coinsEl, getCoins());
        coinSceneWorld.set(pickup.x, pickup.y, pickup.z);
        coinSceneWorld.applyMatrix4(world.matrixWorld);
        spawnCoinPickupAnimation(coinSceneWorld);
        releaseSlot(pickup.slotIndex);
        coinPickups.splice(i, 1);
      }
    }

    if (dirty) instancedMesh.instanceMatrix.needsUpdate = true;
  }

  function clearCoinPickups() {
    while (coinPickups.length) {
      const pickup = coinPickups.pop();
      releaseSlot(pickup.slotIndex);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
  }

  function removeCoinPickupsForPlatform(platformGroup) {
    let dirty = false;
    for (let c = coinPickups.length - 1; c >= 0; c -= 1) {
      if (coinPickups[c].platformGroup !== platformGroup) continue;
      releaseSlot(coinPickups[c].slotIndex);
      coinPickups.splice(c, 1);
      dirty = true;
    }
    if (dirty) instancedMesh.instanceMatrix.needsUpdate = true;
  }

  return {
    spawnCoinPickupAnimation,
    spawnCoinPickup,
    updateCoinPickups,
    clearCoinPickups,
    removeCoinPickupsForPlatform,
  };
}
