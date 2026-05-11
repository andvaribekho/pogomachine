export function updateHeartsUI(el, hp, maxHp) {
  el.textContent = `${'♥'.repeat(hp)}${'♡'.repeat(maxHp - hp)}`;
}

export function updateCoinsUI(el, coins) {
  el.textContent = `${coins} coins`;
}

export function rebuildAmmoUI(el, maxAmmo) {
  el.replaceChildren();
  return Array.from({ length: maxAmmo }, () => {
    const segment = document.createElement('div');
    segment.className = 'ammo-segment';
    el.appendChild(segment);
    return segment;
  });
}

export function updateAmmoUI(segments, ammo) {
  segments.forEach((segment, index) => {
    segment.classList.toggle('filled', index < ammo);
  });
}

export function updateWeaponUI(el, selectedWeapon) {
  el.textContent = selectedWeapon === 'shotgun' ? 'Weapon: Shotgun' : 'Weapon: Machinegun';
}

export function updateShopUI({
  shopCoinsEl, shopBulletBtn, shopHpBtn, shopArmorBtn, shopInvulnBtn,
  shopPiercingBtn, shopVampiricBtn, shopComboShieldBtn,
}, state) {
  shopCoinsEl.textContent = `${state.coins} coins`;
  shopBulletBtn.disabled = state.coins < 5;
  shopHpBtn.disabled = state.coins < 20 || state.hp >= state.maxHp;
  shopArmorBtn.disabled = state.coins < 20 || state.hasShield;
  shopInvulnBtn.disabled = state.coins < 30 || state.invulnerabilityTimer > 0;
  shopPiercingBtn.disabled = state.coins < state.piercingCost || state.piercingBulletsUnlocked;
  shopVampiricBtn.disabled = state.coins < state.vampiricCost || state.vampiricLifeUnlocked;
  shopComboShieldBtn.disabled = state.coins < state.comboShieldCost || state.comboShieldUnlocked;
}

export function updateLevelCompleteUI({
  completeSummaryEl, rewardHpButton, rewardAmmoButton, rewardPiercingButton,
  rewardVampiricButton, rewardComboShieldButton, nextLevelButton,
  buyInvulnerabilityButton, buyShieldButton,
}, state) {
  completeSummaryEl.textContent = `Level ${state.currentLevel} cleared. Coins: ${state.coins}. Choose one reward, then start Level ${state.currentLevel + 1}.`;
  rewardHpButton.disabled = state.rewardChosen || state.hp >= state.maxHp;
  rewardAmmoButton.disabled = state.rewardChosen;
  rewardPiercingButton.disabled = state.rewardChosen || state.piercingBulletsUnlocked;
  rewardVampiricButton.disabled = state.rewardChosen || state.vampiricLifeUnlocked;
  rewardComboShieldButton.disabled = state.rewardChosen || state.comboShieldUnlocked;
  nextLevelButton.disabled = !state.rewardChosen;
  buyInvulnerabilityButton.disabled = state.coins < state.invulnerabilityCost || state.pendingInvulnerability;
  buyShieldButton.disabled = state.coins < state.shieldCost || state.pendingShield || state.hasShield;
}
