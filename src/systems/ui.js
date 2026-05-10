export function updateHeartsUI(el, hp, maxHp) {
  el.textContent = `${'♥'.repeat(hp)}${'♡'.repeat(maxHp - hp)}`;
}

export function updateCoinsUI(el, coins) {
  el.textContent = `${coins} coins`;
}
