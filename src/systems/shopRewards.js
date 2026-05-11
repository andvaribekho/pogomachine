export function createShopRewardSystem({
  colors,
  maxHp,
  piercingCost,
  vampiricCost,
  comboShieldCost,
  invulnerabilityCost,
  shieldCost,
  shopPanelEl,
  shopStatusEl,
  shopTileRef,
  shieldMesh,
  coinsEl,
  heartsEl,
  shopRefs,
  levelCompleteRefs,
  getCoins,
  setCoins,
  getHp,
  setHp,
  getMaxAmmo,
  setMaxAmmo,
  setAmmo,
  getHasShield,
  setHasShield,
  getInvulnerabilityTimer,
  setInvulnerabilityTimer,
  getPiercingBulletsUnlocked,
  setPiercingBulletsUnlocked,
  getVampiricLifeUnlocked,
  setVampiricLifeUnlocked,
  getComboShieldUnlocked,
  setComboShieldUnlocked,
  getPendingInvulnerability,
  setPendingInvulnerability,
  getPendingShield,
  setPendingShield,
  getRewardChosen,
  setRewardChosen,
  getCurrentLevel,
  setIsPaused,
  setShopTileRef,
  setShopTilePlat,
  setShopUsed,
  stopShooting,
  rebuildAmmoUI,
  syncOptionsPanel,
  renderShopUI,
  renderLevelCompleteUI,
  updateCoinsUI,
  updateHeartsUI,
  playRewardSound,
  startInvulnerabilityMusic,
}) {
  function updateShopUI() {
    renderShopUI(shopRefs, {
      coins: getCoins(), hp: getHp(), maxHp, hasShield: getHasShield(), invulnerabilityTimer: getInvulnerabilityTimer(), piercingCost,
      piercingBulletsUnlocked: getPiercingBulletsUnlocked(), vampiricCost, vampiricLifeUnlocked: getVampiricLifeUnlocked(),
      comboShieldCost, comboShieldUnlocked: getComboShieldUnlocked(),
    });
  }

  function openShop() {
    setShopUsed(true);
    setIsPaused(true);
    stopShooting();
    shopPanelEl.hidden = false;
    updateShopUI();
  }

  function closeShop() {
    shopPanelEl.hidden = true;
    setIsPaused(false);
    const tileRef = shopTileRef();
    if (tileRef) {
      tileRef.type = 'blue';
      tileRef.material.color.setHex(colors.blue);
      setShopTileRef(null);
    }
    setShopTilePlat(null);
  }

  function buyShopBullet() {
    if (getCoins() < 5) return;
    setCoins(getCoins() - 5);
    const maxAmmo = getMaxAmmo() + 1;
    setMaxAmmo(maxAmmo);
    setAmmo(maxAmmo);
    rebuildAmmoUI();
    syncOptionsPanel();
    updateCoinsUI(coinsEl, getCoins());
    updateShopUI();
    playRewardSound();
  }

  function buyShopHp() {
    if (getCoins() < 20 || getHp() >= maxHp) return;
    setCoins(getCoins() - 20);
    setHp(getHp() + 1);
    updateHeartsUI(heartsEl, getHp(), maxHp);
    updateCoinsUI(coinsEl, getCoins());
    updateShopUI();
    playRewardSound();
  }

  function buyShopArmor() {
    if (getCoins() < 20 || getHasShield()) return;
    setCoins(getCoins() - 20);
    setHasShield(true);
    shieldMesh.visible = true;
    updateCoinsUI(coinsEl, getCoins());
    updateShopUI();
    playRewardSound();
  }

  function buyShopInvuln() {
    if (getCoins() < 30 || getInvulnerabilityTimer() > 0) return;
    setCoins(getCoins() - 30);
    setInvulnerabilityTimer(10);
    startInvulnerabilityMusic();
    updateCoinsUI(coinsEl, getCoins());
    updateShopUI();
    playRewardSound();
  }

  function buyShopPiercing() {
    if (getCoins() < piercingCost || getPiercingBulletsUnlocked()) return;
    setCoins(getCoins() - piercingCost);
    setPiercingBulletsUnlocked(true);
    updateCoinsUI(coinsEl, getCoins());
    updateShopUI();
    playRewardSound();
  }

  function buyShopVampiric() {
    if (getCoins() < vampiricCost || getVampiricLifeUnlocked()) return;
    setCoins(getCoins() - vampiricCost);
    setVampiricLifeUnlocked(true);
    updateCoinsUI(coinsEl, getCoins());
    updateShopUI();
    playRewardSound();
  }

  function buyShopComboShield() {
    if (getCoins() < comboShieldCost || getComboShieldUnlocked()) return;
    setCoins(getCoins() - comboShieldCost);
    setComboShieldUnlocked(true);
    updateCoinsUI(coinsEl, getCoins());
    updateShopUI();
    playRewardSound();
  }

  function updateLevelCompleteUI() {
    renderLevelCompleteUI(levelCompleteRefs, {
      currentLevel: getCurrentLevel(), coins: getCoins(), rewardChosen: getRewardChosen(), hp: getHp(), maxHp,
      piercingBulletsUnlocked: getPiercingBulletsUnlocked(), vampiricLifeUnlocked: getVampiricLifeUnlocked(),
      comboShieldUnlocked: getComboShieldUnlocked(), invulnerabilityCost, pendingInvulnerability: getPendingInvulnerability(),
      shieldCost, pendingShield: getPendingShield(), hasShield: getHasShield(),
    });
  }

  function rewardHp() {
    if (getRewardChosen()) return;
    playRewardSound();
    if (getHp() < maxHp) {
      setHp(getHp() + 1);
      updateHeartsUI(heartsEl, getHp(), maxHp);
    }
    setRewardChosen(true);
    updateLevelCompleteUI();
  }

  function rewardAmmo() {
    if (getRewardChosen()) return;
    playRewardSound();
    const maxAmmo = getMaxAmmo() + 1;
    setMaxAmmo(maxAmmo);
    setAmmo(maxAmmo);
    rebuildAmmoUI();
    syncOptionsPanel();
    setRewardChosen(true);
    updateLevelCompleteUI();
  }

  function buyPendingInvulnerability() {
    if (getCoins() < invulnerabilityCost || getPendingInvulnerability()) return;
    setCoins(getCoins() - invulnerabilityCost);
    setPendingInvulnerability(true);
    updateCoinsUI(coinsEl, getCoins());
    shopStatusEl.textContent = 'Invulnerability will activate at the start of the next level.';
    updateLevelCompleteUI();
  }

  function buyPendingShield() {
    if (getCoins() < shieldCost || getPendingShield() || getHasShield()) return;
    setCoins(getCoins() - shieldCost);
    setPendingShield(true);
    updateCoinsUI(coinsEl, getCoins());
    shopStatusEl.textContent = 'Shield will activate at the start of the next level.';
    updateLevelCompleteUI();
  }

  function rewardPiercing() {
    if (getRewardChosen() || getPiercingBulletsUnlocked()) return;
    playRewardSound();
    setPiercingBulletsUnlocked(true);
    setRewardChosen(true);
    updateLevelCompleteUI();
  }

  function rewardVampiric() {
    if (getRewardChosen() || getVampiricLifeUnlocked()) return;
    playRewardSound();
    setVampiricLifeUnlocked(true);
    setRewardChosen(true);
    updateLevelCompleteUI();
  }

  function rewardComboShield() {
    if (getRewardChosen() || getComboShieldUnlocked()) return;
    playRewardSound();
    setComboShieldUnlocked(true);
    setRewardChosen(true);
    updateLevelCompleteUI();
  }

  return {
    updateShopUI,
    openShop,
    closeShop,
    buyShopBullet,
    buyShopHp,
    buyShopArmor,
    buyShopInvuln,
    buyShopPiercing,
    buyShopVampiric,
    buyShopComboShield,
    updateLevelCompleteUI,
    rewardHp,
    rewardAmmo,
    buyPendingInvulnerability,
    buyPendingShield,
    rewardPiercing,
    rewardVampiric,
    rewardComboShield,
  };
}
