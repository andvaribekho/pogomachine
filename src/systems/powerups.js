export function createPowerupSystem({
  ball,
  ballRadius,
  shieldMesh,
  heartsEl,
  maxHp,
  colors,
  getDamageCooldown,
  setDamageCooldown,
  getIsGameOver,
  getIsLevelComplete,
  getInvulnerabilityTimer,
  setInvulnerabilityTimer,
  getHasShield,
  setHasShield,
  getHp,
  setHp,
  getDamageFlashTimer,
  setDamageFlashTimer,
  getDamageSlowdownTimer,
  setDamageSlowdownTimer,
  setTimeScale,
  getAcidStompImmunity,
  setAcidStompImmunity,
  getAcidBurnCooldown,
  setAcidBurnCooldown,
  getReloadFlashTimer,
  setReloadFlashTimer,
  getPendingInvulnerability,
  setPendingInvulnerability,
  getPendingShield,
  setPendingShield,
  spawnFloatingText,
  playBounceSound,
  playFailSound,
  startInvulnerabilityMusic,
  updateInvulnerabilityMusic,
  stopInvulnerabilityMusic,
  updateHeartsUI,
  triggerShake,
  endGame,
}) {
  function applyDamage() {
    if (getDamageCooldown() > 0 || getIsGameOver() || getIsLevelComplete()) return;
    if (getInvulnerabilityTimer() > 0) {
      spawnFloatingText('NO HIT', ball.position);
      setDamageCooldown(0.45);
      return;
    }
    if (getHasShield()) {
      setHasShield(false);
      shieldMesh.visible = false;
      spawnFloatingText('SHIELD', ball.position);
      playBounceSound();
      setDamageCooldown(0.8);
      return;
    }

    const hp = getHp() - 1;
    setHp(hp);
    updateHeartsUI(heartsEl, hp, maxHp);
    setDamageFlashTimer(0.28);
    setDamageSlowdownTimer(2);
    setTimeScale(0.5);
    playFailSound();
    triggerShake(0.65);
    setDamageCooldown(1.1);

    if (hp <= 0) {
      endGame();
    }
  }

  function updatePowerups(dt) {
    if (getDamageCooldown() > 0) setDamageCooldown(Math.max(0, getDamageCooldown() - dt));
    if (getAcidStompImmunity() > 0) setAcidStompImmunity(Math.max(0, getAcidStompImmunity() - dt));
    if (getAcidBurnCooldown() > 0) setAcidBurnCooldown(Math.max(0, getAcidBurnCooldown() - dt));
    if (getDamageFlashTimer() > 0) setDamageFlashTimer(Math.max(0, getDamageFlashTimer() - dt));
    if (getReloadFlashTimer() > 0) setReloadFlashTimer(Math.max(0, getReloadFlashTimer() - dt));

    if (getHasShield()) {
      shieldMesh.visible = true;
      shieldMesh.position.copy(ball.position);
      shieldMesh.position.y += ballRadius + 0.34;
      shieldMesh.rotation.y += dt * 2.4;
    } else {
      shieldMesh.visible = false;
    }

    if (getInvulnerabilityTimer() > 0) {
      const nextTimer = Math.max(0, getInvulnerabilityTimer() - dt);
      setInvulnerabilityTimer(nextTimer);
      updateInvulnerabilityMusic();
      if (nextTimer === 0) {
        stopInvulnerabilityMusic();
      }
    }
  }

  function updateBallVisual() {
    if (getReloadFlashTimer() > 0) {
      ball.material.color.setHex(0xffffff);
    } else if (getInvulnerabilityTimer() > 0) {
      const hue = (performance.now() * 0.0008) % 1;
      ball.material.color.setHSL(hue, 0.95, 0.58);
    } else if (getDamageSlowdownTimer() > 0) {
      const blink = Math.floor(performance.now() / 80) % 2;
      ball.material.color.setHex(blink ? 0xff1744 : colors.ball);
    } else if (getHp() === 1) {
      const blink = Math.floor(performance.now() / 200) % 2;
      ball.material.color.setHex(blink ? 0xff1744 : colors.ball);
    } else if (getDamageFlashTimer() > 0) {
      ball.material.color.setHex(0xff1744);
    } else {
      ball.material.color.setHex(colors.ball);
    }
  }

  function activatePendingPowerups() {
    if (getPendingInvulnerability()) {
      setPendingInvulnerability(false);
      setInvulnerabilityTimer(10);
      startInvulnerabilityMusic();
    }
    if (getPendingShield()) {
      setPendingShield(false);
      setHasShield(true);
      shieldMesh.visible = true;
    }
  }

  return { applyDamage, updatePowerups, updateBallVisual, activatePendingPowerups };
}
