export function onPointerDown(event, ctx) {
  if (ctx.steamDeckModeActive) return;
  if (ctx.isPaused || ctx.isLevelComplete) return;
  if (ctx.isGameOver) {
    if (ctx.leaderboardPendingClose) return;
    if (ctx.leaderboardPanelEl && !ctx.leaderboardPanelEl.hidden) {
      ctx.leaderboardPendingClose = false;
      return;
    }
    if (ctx.resetGame) ctx.resetGame();
    return;
  }

  if (ctx.controlMode === 'B' && event.pointerType === 'touch') {
    ctx.touchPointerIds.add(event.pointerId);
    if (ctx.touchPointerIds.size === 1) {
      if (ctx.stopShooting) ctx.stopShooting();
      ctx.drag.active = true;
      ctx.drag.x = event.clientX;
    }
    if (ctx.touchPointerIds.size >= 2) {
      ctx.drag.x = event.clientX;
      if (ctx.startShooting) ctx.startShooting();
    }
    return;
  }

  if (ctx.controlMode === 'B') {
    if (ctx.stopShooting) ctx.stopShooting();
    ctx.drag.active = true;
    ctx.drag.x = event.clientX;
    return;
  }

  if (ctx.stopShooting) ctx.stopShooting();
  ctx.drag.active = true;
  ctx.drag.x = event.clientX;
}

export function onPointerMove(event, ctx) {
  if (ctx.steamDeckModeActive) return;
  if (!ctx.drag.active || ctx.isGameOver || ctx.isPaused || ctx.isLevelComplete) return;
  const dx = event.clientX - ctx.drag.x;
  ctx.drag.x = event.clientX;
  ctx.drag.targetRotation += dx * 0.012 * ctx.timeScale;
}

export function onPointerUp(event, ctx) {
  if (ctx.steamDeckModeActive) return;
  if (ctx.controlMode === 'B' && event.pointerType === 'touch') {
    ctx.touchPointerIds.delete(event.pointerId);
    if (ctx.touchPointerIds.size < 2) {
      if (ctx.stopShooting) ctx.stopShooting();
    }
    if (ctx.touchPointerIds.size === 0) {
      ctx.drag.active = false;
    }
    return;
  }

  if (ctx.controlMode === 'B') {
    ctx.drag.active = false;
    return;
  }

  const wasDragging = ctx.drag.active;
  ctx.drag.active = false;
  if (wasDragging && !ctx.isGameOver && !ctx.isPaused && !ctx.isLevelComplete) {
    if (ctx.startShooting) ctx.startShooting();
  }
}

export function onPointerCancel(event, ctx) {
  if (ctx.steamDeckModeActive) return;
  if (ctx.controlMode === 'B' && event && event.pointerType === 'touch') {
    ctx.touchPointerIds.delete(event.pointerId);
    if (ctx.touchPointerIds.size < 2) ctx.stopShooting();
    if (ctx.touchPointerIds.size === 0) ctx.drag.active = false;
    return;
  }
  ctx.drag.active = false;
  if (ctx.stopShooting) ctx.stopShooting();
}

export function onKeyDown(event, ctx) {
  const target = event.target;
  const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
  if (ctx.steamDeckModeActive && !isTyping && event.code === 'Space') {
    event.preventDefault();
    return;
  }
  if (!isTyping && event.key === '1') {
    if (ctx.selectWeapon) ctx.selectWeapon('machinegun');
    return;
  }
  if (!isTyping && event.key === '2') {
    if (ctx.selectWeapon) ctx.selectWeapon('shotgun');
    return;
  }
  if (!isTyping && event.code === 'Space' && ctx.controlMode === 'B') {
    event.preventDefault();
    if (!ctx.isGameOver && !ctx.isPaused && !ctx.isLevelComplete) {
      if (ctx.startShooting) ctx.startShooting();
    }
    return;
  }
  if (event.key.toLowerCase() === 'p') {
    if (ctx.isGameOver) return;
    if (ctx.setPaused) ctx.setPaused(!ctx.isPaused);
  }
}

export function onKeyUp(event, ctx) {
  if (ctx.steamDeckModeActive) return;
  if (event.code === 'Space' && ctx.controlMode === 'B') {
    if (ctx.stopShooting) ctx.stopShooting();
  }
}

export function setupInputListeners(ctx) {
  const handlePointerDown = (e) => onPointerDown(e, ctx);
  const handlePointerMove = (e) => onPointerMove(e, ctx);
  const handlePointerUp = (e) => onPointerUp(e, ctx);
  const handlePointerCancel = (e) => onPointerCancel(e, ctx);
  const handleKeyDown = (e) => onKeyDown(e, ctx);
  const handleKeyUp = (e) => onKeyUp(e, ctx);

  window.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerCancel);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  return function cleanup() {
    window.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}
