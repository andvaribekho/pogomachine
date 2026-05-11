export function setupGameplayInputWiring({
  refs,
  handlers,
}) {
  const stopPropagation = event => event.stopPropagation();

  refs.pauseButton.addEventListener('pointerdown', stopPropagation);
  refs.pauseButton.addEventListener('click', (event) => {
    event.stopPropagation();
    handlers.togglePause();
  });

  refs.closePanelButton.addEventListener('pointerdown', stopPropagation);
  refs.closePanelButton.addEventListener('click', (event) => {
    event.stopPropagation();
    handlers.closePanel();
  });

  refs.extraButton.addEventListener('pointerdown', stopPropagation);
  refs.extraButton.addEventListener('click', (event) => {
    event.stopPropagation();
    handlers.openExtra();
  });

  refs.closeExtraButton.addEventListener('pointerdown', stopPropagation);
  refs.closeExtraButton.addEventListener('click', (event) => {
    event.stopPropagation();
    handlers.closeExtra();
  });

  refs.impulseAButton.addEventListener('click', handlers.selectImpulseA);
  refs.impulseBButton.addEventListener('click', handlers.selectImpulseB);
  refs.impulseCButton.addEventListener('click', handlers.selectImpulseC);
  refs.impulseCFactorInput.addEventListener('input', handlers.updateImpulseCFactor);
  refs.impulseBResetInput.addEventListener('input', handlers.updateImpulseBReset);
  refs.impulseBShotgunInput.addEventListener('input', handlers.updateImpulseBShotgun);
  refs.controlAButton.addEventListener('click', handlers.selectControlA);
  refs.controlBButton.addEventListener('click', handlers.selectControlB);
  refs.twistBOffButton.addEventListener('click', handlers.disableTwistB);
  refs.twistBOnButton.addEventListener('click', handlers.enableTwistB);
  refs.flyingModeBOffButton.addEventListener('click', handlers.disableFlyingModeB);
  refs.flyingModeBOnButton.addEventListener('click', handlers.enableFlyingModeB);

  refs.shopBulletBtn.addEventListener('click', handlers.buyShopBullet);
  refs.shopHpBtn.addEventListener('click', handlers.buyShopHp);
  refs.shopArmorBtn.addEventListener('click', handlers.buyShopArmor);
  refs.shopInvulnBtn.addEventListener('click', handlers.buyShopInvuln);
  refs.shopPiercingBtn.addEventListener('click', handlers.buyShopPiercing);
  refs.shopVampiricBtn.addEventListener('click', handlers.buyShopVampiric);
  refs.shopComboShieldBtn.addEventListener('click', handlers.buyShopComboShield);
  refs.closeShopButton.addEventListener('click', handlers.closeShop);
  refs.shopPanelEl.addEventListener('pointerdown', stopPropagation);
  refs.levelCompleteEl.addEventListener('pointerdown', stopPropagation);
  refs.rewardHpButton.addEventListener('click', handlers.rewardHp);
  refs.rewardAmmoButton.addEventListener('click', handlers.rewardAmmo);
  refs.buyInvulnerabilityButton.addEventListener('click', handlers.buyPendingInvulnerability);
  refs.buyShieldButton.addEventListener('click', handlers.buyPendingShield);
  refs.nextLevelButton.addEventListener('click', handlers.nextLevel);

  refs.impulseInput.addEventListener('input', handlers.updateImpulse);
  refs.leaderboardSubmitBtn.addEventListener('click', handlers.submitLeaderboard);
  refs.leaderboardNameInput.addEventListener('keydown', handlers.submitLeaderboardOnEnter);
  refs.leaderboardCloseBtn.addEventListener('click', handlers.closeLeaderboard);
  refs.leaderboardPanelEl.addEventListener('pointerdown', handlers.closeLeaderboardBackdrop);
  refs.fireIntervalInput.addEventListener('input', handlers.updateFireInterval);
  refs.shotgunSpreadInput.addEventListener('input', handlers.updateShotgunSpread);
  refs.shotgunIntervalInput.addEventListener('input', handlers.updateShotgunInterval);
  refs.maxAmmoInput.addEventListener('input', handlers.updateMaxAmmo);
  refs.gravityInput.addEventListener('input', handlers.updateGravity);
  refs.terminalVelocityInput.addEventListener('input', handlers.updateTerminalVelocity);
  refs.stompImpulseInput.addEventListener('input', handlers.updateStompImpulse);
  refs.rewardPiercingButton.addEventListener('click', handlers.rewardPiercing);
  refs.rewardVampiricButton.addEventListener('click', handlers.rewardVampiric);
  refs.rewardComboShieldButton.addEventListener('click', handlers.rewardComboShield);
  refs.hitboxScaleInput.addEventListener('input', handlers.updateHitboxScale);
  refs.cannonChargeInput.addEventListener('input', handlers.updateCannonCharge);
  refs.cannonCooldownInput.addEventListener('input', handlers.updateCannonCooldown);
  refs.laserOnInput.addEventListener('input', handlers.updateLaserOn);
  refs.laserOffInput.addEventListener('input', handlers.updateLaserOff);
  refs.coinAttractionInput.addEventListener('input', handlers.updateCoinAttraction);
}
