const steamDeckMouseSensitivity = 0.012;
const steamDeckTriggerThreshold = 0.5;

export function setupSteamDeckMode({ button, renderer, drag, getCanPlay, getTimeScale, setPaused, startShooting, stopShooting }) {
  let active = false;
  let rightTriggerHeld = false;
  let leftMouseHeld = false;

  function setButtonState(nextActive) {
    button.textContent = nextActive ? 'Steam Deck: On' : 'Steam Deck';
    button.setAttribute('aria-pressed', nextActive ? 'true' : 'false');
    document.body.classList.toggle('steam-deck-active', nextActive);
  }

  async function requestPointerLock() {
    try {
      const lockRequest = renderer.domElement.requestPointerLock({ unadjustedMovement: true });
      if (lockRequest?.then) await lockRequest;
      return true;
    } catch (_) {
      try {
        const fallbackRequest = renderer.domElement.requestPointerLock();
        if (fallbackRequest?.then) await fallbackRequest;
        return true;
      } catch (error) {
        return false;
      }
    }
  }

  function updateShooting() {
    if (!active || !getCanPlay()) {
      stopShooting();
      return;
    }

    if (rightTriggerHeld || leftMouseHeld) {
      startShooting('steamDeckFire');
    } else {
      stopShooting();
    }
  }

  async function start() {
    setPaused(false);
    active = true;
    rightTriggerHeld = false;
    leftMouseHeld = false;
    setButtonState(true);

    try {
      if (document.fullscreenElement !== renderer.domElement) {
        await renderer.domElement.requestFullscreen();
      }
      const pointerLocked = await requestPointerLock();
      if (!pointerLocked) stop();
    } catch (error) {
      stop({ exitFullscreen: false });
    }
  }

  function stop({ exitFullscreen = true } = {}) {
    if (!active) return;
    active = false;
    rightTriggerHeld = false;
    leftMouseHeld = false;
    stopShooting();
    setButtonState(false);

    if (document.pointerLockElement === renderer.domElement) {
      document.exitPointerLock();
    }
    if (exitFullscreen && document.fullscreenElement === renderer.domElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function handlePointerMove(event) {
    if (!active || document.pointerLockElement !== renderer.domElement) return;
    if (!getCanPlay()) return;
    drag.targetRotation += event.movementX * steamDeckMouseSensitivity * getTimeScale();
  }

  function handleMouseDown(event) {
    if (!active || event.button !== 0) return;
    event.preventDefault();
    leftMouseHeld = true;
    updateShooting();
  }

  function handleMouseUp(event) {
    if (!active || event.button !== 0) return;
    event.preventDefault();
    leftMouseHeld = false;
    updateShooting();
  }

  function handlePointerLockChange() {
    if (active && document.pointerLockElement !== renderer.domElement) {
      stop();
    }
  }

  function handleFullscreenChange() {
    if (active && document.fullscreenElement !== renderer.domElement) {
      stop({ exitFullscreen: false });
    }
  }

  function isRightTriggerPressed() {
    const gamepads = navigator.getGamepads?.();
    if (!gamepads) return false;

    for (const gamepad of gamepads) {
      if (!gamepad?.connected) continue;
      const rightTrigger = gamepad.buttons?.[7];
      if (rightTrigger?.pressed || rightTrigger?.value > steamDeckTriggerThreshold) {
        return true;
      }
    }

    return false;
  }

  function update() {
    if (!active) return;

    if (!getCanPlay()) {
      rightTriggerHeld = false;
      leftMouseHeld = false;
      updateShooting();
      return;
    }

    rightTriggerHeld = isRightTriggerPressed();
    updateShooting();
  }

  function toggle(event) {
    event.stopPropagation();
    if (active) {
      stop();
      return;
    }
    start();
  }

  button.addEventListener('pointerdown', event => event.stopPropagation());
  button.addEventListener('click', toggle);
  window.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('pointerlockchange', handlePointerLockChange);
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  return {
    update,
    isActive: () => active,
  };
}
