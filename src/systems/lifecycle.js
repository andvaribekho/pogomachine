export function createLifecycleSystem({
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
  getIsLevelComplete,
  getScore,
  getNextPlatformId,
  getPlatformsPassedThisLevel,
  setScore,
  setCurrentLevel,
  setHp,
  setCoins,
  setMaxAmmo,
  setAmmo,
  setSelectedWeapon,
  setPendingInvulnerability,
  setPendingShield,
  setInvulnerabilityTimer,
  setHasShield,
  setAcidStompImmunity,
  setAcidBurnCooldown,
  setReloadFlashTimer,
  setRewardChosen,
  setDamageSlowdownTimer,
  setTimeScale,
  setGrayscaleAmount,
  setPiercingBulletsUnlocked,
  setVampiricLifeUnlocked,
  setComboShieldUnlocked,
  setVampiricKillCount,
  setComboShieldAwardedThisCombo,
  setScoreSubmittedToLeaderboard,
  setBallVelocity,
  setPlatformsPassedThisLevel,
  setNextPlatformId,
  setSpikePlatformsThisLevel,
  setGroundWormsSinceTurtle,
  setAcidSnailsThisLevel,
  setBounceVelocity,
  setCombo,
  setIsGameOver,
  setIsLevelComplete,
  setIsPaused,
  setDamageCooldown,
  setDamageFlashTimer,
  setShakeIntensity,
  setShakeDecay,
  setShopTilePlat,
  setShopTileRef,
  setShopUsed,
  clearPlatformBandIndex,
  clearBullets,
  disposeEnemy,
  clearParticles,
  clearFloatingTexts,
  clearShockwaves,
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
}) {
  const rollingPlatformAheadCount = 12;

  function generatePlatformsThrough(maxPlatformId) {
    const target = getLevelTarget();
    const cappedMaxId = Math.min(target, maxPlatformId);
    while (getNextPlatformId() <= cappedMaxId) {
      const nextPlatformId = getNextPlatformId();
      createPlatform(-nextPlatformId * platformSpacing, nextPlatformId, { final: nextPlatformId === target });
      setNextPlatformId(nextPlatformId + 1);
    }
  }

  function clearEnemiesAndParticles() {
    while (enemies.length) {
      disposeEnemy(enemies.pop());
    }
    clearParticles();
    clearFloatingTexts();
    clearShockwaves();
  }

  function clearTower() {
    clearPlatformBandIndex();
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
      const floater = floaters.pop();
      world.remove(floater.mesh);
      floater.mesh.geometry.dispose();
    }

    while (pillarLaserRings.length) {
      const ring = pillarLaserRings.pop();
      ring.mesh.removeFromParent();
      ring.mesh.material.dispose();
    }

    while (pillarSpikes.length) {
      const pillarSpike = pillarSpikes.pop();
      world.remove(pillarSpike.group);
      pillarSpike.group.traverse((child) => {
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
    setBallVelocity(0);
    setPlatformsPassedThisLevel(0);
    setNextPlatformId(0);
    setSpikePlatformsThisLevel(0);
    setGroundWormsSinceTurtle(0);
    setAcidSnailsThisLevel(0);
    clearAcidPuddles();
    setBounceVelocity(7.7);
    world.rotation.y = 0;
    drag.targetRotation = 0;
    setCombo(0);
    setIsGameOver(false);
    setIsLevelComplete(false);
    levelCompleteEl.hidden = true;
    pausePanelEl.hidden = true;
    setIsPaused(false);
    stopShooting();
    reloadAmmo();
    setDamageCooldown(0);
    setDamageFlashTimer(0);
    setShakeIntensity(0);
    setShakeDecay(0);
    setInvulnerabilityTimer(0);
    setAcidStompImmunity(0);
    setAcidBurnCooldown(0);
    setReloadFlashTimer(0);
    setShopTilePlat(null);
    setShopTileRef(null);
    setShopUsed(false);
    scoreEl.textContent = String(getScore());
    updateLevelUI();
    gameOverEl.hidden = true;
    ball.material.color.setHex(colors.ball);
    stopInvulnerabilityMusic();
    activatePendingPowerups();
    updateWeaponUI();

    generatePlatformsThrough(getPlatformsPassedThisLevel() + rollingPlatformAheadCount);
    ensureInitialLowerPlatformYellowWorm();
    ensureInitialLowerPlatformMushroom();
    spawnGoldBlocksForLevel();
    spawnPillarSpikesForLevel();
    spawnFloatersForLevel();
    spawnSawBladesForLevel();
    spawnPillarLaserRingsForLevel();
  }

  function resetGame() {
    setScore(0);
    setCurrentLevel(1);
    setHp(maxHp);
    setCoins(0);
    setMaxAmmo(defaultMaxAmmo);
    setAmmo(defaultMaxAmmo);
    setSelectedWeapon('machinegun');
    setPendingInvulnerability(false);
    setPendingShield(false);
    setInvulnerabilityTimer(0);
    setHasShield(false);
    setAcidStompImmunity(0);
    setAcidBurnCooldown(0);
    setReloadFlashTimer(0);
    setRewardChosen(false);
    shieldMesh.visible = false;
    setDamageSlowdownTimer(0);
    setTimeScale(1);
    setGrayscaleAmount(0);
    setPiercingBulletsUnlocked(false);
    setVampiricLifeUnlocked(false);
    setComboShieldUnlocked(false);
    setVampiricKillCount(0);
    setComboShieldAwardedThisCombo(false);
    setScoreSubmittedToLeaderboard(false);
    if (scene.background) scene.background.setHex(0xeef7ff);
    rebuildAmmoUI();
    updateWeaponUI();
    syncOptionsPanel();
    updatePersistentUI();
    startLevel();
  }

  function completeLevel() {
    if (getIsLevelComplete()) return;
    setIsLevelComplete(true);
    stopShooting();
    stopInvulnerabilityMusic();
    const nextScore = getScore() + 100;
    setScore(nextScore);
    scoreEl.textContent = String(nextScore);
    setRewardChosen(false);
    setPlatformsPassedThisLevel(getLevelTarget());
    updateLevelUI();
    setBallVelocity(0);
    levelCompleteEl.hidden = false;
    shopStatusEl.textContent = '';
    updateLevelCompleteUI();
  }

  return { clearEnemiesAndParticles, clearTower, startLevel, resetGame, completeLevel };
}
