import * as THREE from 'three';

export function createCoinPickupSystem({
  camera,
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
  const pickupWorldPosition = new THREE.Vector3();

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

  function spawnCoinPickup(worldPos, platformGroup) {
    const mesh = new THREE.Mesh(coinPickupGeometry, coinPickupMaterial);
    coinLocalPosition.copy(worldPos);
    platformGroup.worldToLocal(coinLocalPosition);
    coinLocalPosition.y = platformThickness / 2 + 0.04;
    mesh.position.copy(coinLocalPosition);
    platformGroup.add(mesh);
    coinPickups.push({ mesh, value: 5, collected: false, platformGroup });
  }

  function updateCoinPickups(dt) {
    for (let i = coinPickups.length - 1; i >= 0; i -= 1) {
      const pickup = coinPickups[i];
      if (pickup.collected) continue;
      pickup.mesh.rotation.y += dt * 3;

      pickup.mesh.getWorldPosition(pickupWorldPosition);
      const dx = ball.position.x - pickupWorldPosition.x;
      const dy = ball.position.y - pickupWorldPosition.y;
      const dz = ball.position.z - pickupWorldPosition.z;
      if (dx * dx + dy * dy + dz * dz <= (ballRadius + 0.25) * (ballRadius + 0.25)) {
        pickup.collected = true;
        setCoins(getCoins() + pickup.value);
        updateCoinsUI(coinsEl, getCoins());
        spawnCoinPickupAnimation(pickupWorldPosition);
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

  function removeCoinPickupsForPlatform(platformGroup) {
    for (let c = coinPickups.length - 1; c >= 0; c -= 1) {
      if (coinPickups[c].platformGroup !== platformGroup) continue;
      coinPickups[c].mesh.removeFromParent();
      coinPickups[c].mesh.geometry.dispose();
      coinPickups.splice(c, 1);
    }
  }

  return {
    spawnCoinPickupAnimation,
    spawnCoinPickup,
    updateCoinPickups,
    clearCoinPickups,
    removeCoinPickupsForPlatform,
  };
}
