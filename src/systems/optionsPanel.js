import { parseClampedFloat, parseClampedAbsFloat, parseClampedInt } from './options.js';

export function createOptionsPanelSystem({
  refs,
  defaults,
  getState,
  setState,
  rebuildAmmoUI,
  getIsShooting,
  getSelectedWeapon,
}) {
  function setShootingImpulse(value) {
    const bulletImpulse = parseClampedFloat(value, 0, 12, defaults.defaultBulletImpulse);
    setState.bulletImpulse(bulletImpulse);
    refs.impulseInput.value = bulletImpulse.toFixed(1);
  }

  function setGravity(value) {
    const gravity = parseClampedFloat(value, -40, 0, defaults.defaultGravity);
    setState.gravity(gravity);
    refs.gravityInput.value = gravity.toFixed(1);
  }

  function setTerminalVelocity(value) {
    const terminalVelocity = parseClampedAbsFloat(value, 1, 80, defaults.defaultTerminalVelocity);
    setState.terminalVelocity(terminalVelocity);
    refs.terminalVelocityInput.value = terminalVelocity.toFixed(1);
  }

  function setStompImpulse(value) {
    const stompImpulse = parseClampedFloat(value, 0, 20, defaults.defaultStompImpulse);
    setState.stompImpulse(stompImpulse);
    refs.stompImpulseInput.value = stompImpulse.toFixed(1);
  }

  function setPlayerHitboxScale(value) {
    const playerHitboxScale = parseClampedFloat(value, 0.1, 1, defaults.defaultPlayerHitboxScale);
    setState.playerHitboxScale(playerHitboxScale);
    refs.hitboxScaleInput.value = playerHitboxScale.toFixed(2);
  }

  function setCannonChargeTime(value) {
    const cannonChargeTime = parseClampedFloat(value, 0.5, 10, defaults.defaultCannonChargeTime);
    setState.cannonChargeTime(cannonChargeTime);
    refs.cannonChargeInput.value = cannonChargeTime.toFixed(1);
  }

  function setCannonCooldown(value) {
    const cannonCooldown = parseClampedFloat(value, 0, 20, defaults.defaultCannonCooldown);
    setState.cannonCooldown(cannonCooldown);
    refs.cannonCooldownInput.value = cannonCooldown.toFixed(1);
  }

  function setLaserRingOnTime(value) {
    const laserRingOnTime = parseClampedFloat(value, 0.2, 10, defaults.defaultLaserRingOnTime);
    setState.laserRingOnTime(laserRingOnTime);
    refs.laserOnInput.value = laserRingOnTime.toFixed(1);
  }

  function setLaserRingOffTime(value) {
    const laserRingOffTime = parseClampedFloat(value, 0.2, 10, defaults.defaultLaserRingOffTime);
    setState.laserRingOffTime(laserRingOffTime);
    refs.laserOffInput.value = laserRingOffTime.toFixed(1);
  }

  function setCoinAttractionRadius(value) {
    const coinAttractionRadius = parseClampedFloat(value, 0.1, 5, defaults.defaultCoinAttractionRadius);
    setState.coinAttractionRadius(coinAttractionRadius);
    refs.coinAttractionInput.value = coinAttractionRadius.toFixed(2);
  }

  function setShotgunSpreadAngle(value) {
    const shotgunSpreadAngle = parseClampedFloat(value, 0, 25, defaults.defaultShotgunSpreadAngle);
    setState.shotgunSpreadAngle(shotgunSpreadAngle);
    refs.shotgunSpreadInput.value = shotgunSpreadAngle.toFixed(1);
  }

  function setShotgunFireInterval(value) {
    const shotgunFireInterval = parseClampedFloat(value, 0.1, 3, defaults.defaultShotgunFireInterval);
    setState.shotgunFireInterval(shotgunFireInterval);
    refs.shotgunIntervalInput.value = shotgunFireInterval.toFixed(2);
    if (getIsShooting() && getSelectedWeapon() === 'shotgun') {
      setState.fireCooldown(Math.min(getState.fireCooldown(), shotgunFireInterval));
    }
  }

  function setMaxAmmo(value) {
    const maxAmmo = parseClampedInt(value, 1, 20, defaults.defaultMaxAmmo);
    setState.maxAmmo(maxAmmo);
    setState.ammo(Math.min(getState.ammo(), maxAmmo));
    rebuildAmmoUI();
    refs.maxAmmoInput.value = String(maxAmmo);
  }

  function syncOptionsPanel() {
    refs.impulseInput.value = getState.bulletImpulse().toFixed(1);
    refs.fireIntervalInput.value = getState.fireInterval().toFixed(2);
    refs.shotgunSpreadInput.value = getState.shotgunSpreadAngle().toFixed(1);
    refs.shotgunIntervalInput.value = getState.shotgunFireInterval().toFixed(2);
    refs.maxAmmoInput.value = String(getState.maxAmmo());
    refs.gravityInput.value = getState.gravity().toFixed(1);
    refs.terminalVelocityInput.value = getState.terminalVelocity().toFixed(1);
    refs.stompImpulseInput.value = getState.stompImpulse().toFixed(1);
    refs.hitboxScaleInput.value = getState.playerHitboxScale().toFixed(2);
    refs.cannonChargeInput.value = getState.cannonChargeTime().toFixed(1);
    refs.cannonCooldownInput.value = getState.cannonCooldown().toFixed(1);
    refs.laserOnInput.value = getState.laserRingOnTime().toFixed(1);
    refs.laserOffInput.value = getState.laserRingOffTime().toFixed(1);
    refs.coinAttractionInput.value = getState.coinAttractionRadius().toFixed(2);
    refs.impulseBResetInput.value = getState.impulseBResetSpeed().toFixed(1);
    refs.impulseBShotgunInput.value = getState.impulseBShotgunImpulse().toFixed(1);
    refs.impulseCFactorInput.value = getState.impulseCfactor().toFixed(2);
    refs.impulseBResetLabel.hidden = getState.impulseMode() !== 'B';
    refs.impulseBShotgunLabel.hidden = getState.impulseMode() !== 'B';
    refs.impulseCFactorLabel.hidden = getState.impulseMode() !== 'C';
    refs.impulseAButton.classList.toggle('active', getState.impulseMode() === 'A');
    refs.impulseBButton.classList.toggle('active', getState.impulseMode() === 'B');
    refs.impulseCButton.classList.toggle('active', getState.impulseMode() === 'C');
    refs.twistBOffButton.classList.toggle('active', !getState.twistBMode());
    refs.twistBOnButton.classList.toggle('active', getState.twistBMode());
    refs.flyingModeBOffButton.classList.toggle('active', !getState.flyingModeB());
    refs.flyingModeBOnButton.classList.toggle('active', getState.flyingModeB());
  }

  return {
    setShootingImpulse,
    setGravity,
    setTerminalVelocity,
    setStompImpulse,
    setPlayerHitboxScale,
    setCannonChargeTime,
    setCannonCooldown,
    setLaserRingOnTime,
    setLaserRingOffTime,
    setCoinAttractionRadius,
    setShotgunSpreadAngle,
    setShotgunFireInterval,
    setMaxAmmo,
    syncOptionsPanel,
  };
}
