export function createCameraFrameSystem({
  scene,
  camera,
  pillar,
  shakeOffset,
  cameraBasePos,
  getBallY,
  getShakeIntensity,
  setShakeIntensity,
  getShakeDecay,
  setShakeDecay,
  getDamageSlowdownTimer,
  getGrayscaleAmount,
  setGrayscaleAmount,
}) {
  function triggerShake(intensity) {
    setShakeIntensity(intensity);
    setShakeDecay(12);
  }

  function updateDamageFrame(realDt) {
    const grayscaleTarget = getDamageSlowdownTimer() > 0 ? 1 : 0;
    const grayscaleAmount = getGrayscaleAmount() + (grayscaleTarget - getGrayscaleAmount()) * Math.min(1, realDt / 0.2);
    setGrayscaleAmount(grayscaleAmount);
    const _bgR = 0xee / 255;
    const _bgG = 0xf7 / 255;
    const _bgB = 0xff / 255;
    const _darkR = 0x2f / 255;
    const _darkG = 0x33 / 255;
    const _darkB = 0x38 / 255;
    scene.background.setRGB(
      _bgR + (_darkR - _bgR) * grayscaleAmount,
      _bgG + (_darkG - _bgG) * grayscaleAmount,
      _bgB + (_darkB - _bgB) * grayscaleAmount
    );
  }

  function updateCamera(dt) {
    const targetY = getBallY() - 4.2;
    camera.position.y += (targetY + 9.0 - camera.position.y) * 0.08;
    camera.lookAt(0, targetY, 0);
    pillar.position.y = targetY - 25;

    if (getShakeIntensity() > 0.01) {
      cameraBasePos.copy(camera.position);
      shakeOffset.set(
        (Math.random() - 0.5) * getShakeIntensity(),
        (Math.random() - 0.5) * getShakeIntensity(),
        0
      );
      camera.position.copy(cameraBasePos).add(shakeOffset);
      camera.position.z = 10.5;
      camera.position.x = 0;
      setShakeIntensity(getShakeIntensity() * Math.exp(-getShakeDecay() * dt));
    } else {
      setShakeIntensity(0);
      camera.position.z = 10.5;
      camera.position.x = 0;
    }
  }

  return { triggerShake, updateDamageFrame, updateCamera };
}
