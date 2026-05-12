export function createGameLoop({
  clock,
  scene,
  camera,
  renderer,
  world,
  ball,
  drag,
  getDamageSlowdownTimer,
  setDamageSlowdownTimer,
  getTimeScale,
  setTimeScale,
  getScaledTime,
  setScaledTime,
  getIsPaused,
  getIsGameOver,
  getIsLevelComplete,
  getBallVelocity,
  setBallVelocity,
  getGravity,
  getTerminalVelocity,
  updateDamageFrame,
  updateSteamDeckMode,
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
  updateLevelBoss,
  updateCannons,
  updateGoldBlocks,
  updateFallingCratesAndGold,
  updateCoinPickups,
  updateParticles,
  updateBounceCubes,
  recyclePlatforms,
  updateFloatingTexts,
  updateComboPosition,
  updateTileFlashes,
  updateCamera,
  updateBallVisual,
}) {
  function animate() {
    const realDt = Math.min(clock.getDelta(), 0.033);

    if (getDamageSlowdownTimer() > 0) {
      const nextTimer = Math.max(0, getDamageSlowdownTimer() - realDt);
      setDamageSlowdownTimer(nextTimer);
      if (nextTimer === 0) setTimeScale(1);
    }

    updateDamageFrame(realDt);

    const dt = realDt * getTimeScale();
    setScaledTime(getScaledTime() + dt);
    updateSteamDeckMode();

    if (!getIsPaused()) {
      const lerpFactor = 1 - Math.pow(1 - 0.22, getTimeScale());
      world.rotation.y += (drag.targetRotation - world.rotation.y) * lerpFactor;
    }

    if (!getIsGameOver() && !getIsPaused() && !getIsLevelComplete()) {
      updateShooting(dt);
      updatePowerups(dt);

      const previousY = ball.position.y;
      setBallVelocity(integrateBallPhysics({ ball, ballVelocity: getBallVelocity(), gravity: getGravity(), terminalVelocity: getTerminalVelocity(), dt }));

      scene.updateMatrixWorld(true);
      checkBallCrateHit(previousY);
      checkBallGoldBlockStomp(previousY);
      handlePlatformUndersideCollision(previousY);
      updateLevelBoss(dt);
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
      updateComboPosition();
      updateTileFlashes(dt);
      updateCamera(dt);
    }

    updateBallVisual();
    renderer.render(scene, camera);
  }

  return { animate };
}
