import * as THREE from 'three';

export function createComboSystem({
  scene,
  ball,
  ballRadius,
  comboShieldThreshold,
  getCombo,
  setCombo,
  getComboShieldUnlocked,
  getComboShieldAwardedThisCombo,
  setComboShieldAwardedThisCombo,
  getHasShield,
  setHasShield,
  shieldMesh,
  spawnFloatingText,
}) {
  let comboSprite = null;
  let comboTexture = null;
  let comboMaterial = null;

  function updateComboSprite() {
    const combo = getCombo();
    if (combo <= 0) {
      if (comboSprite) {
        comboSprite.removeFromParent();
        comboTexture.dispose();
        comboMaterial.dispose();
        comboSprite = null;
        comboTexture = null;
        comboMaterial = null;
      }
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = '900 64px Inter, Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = 8;
    context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    context.strokeText(String(combo), canvas.width / 2, canvas.height / 2);
    context.fillStyle = '#ffc107';
    context.fillText(String(combo), canvas.width / 2, canvas.height / 2);
    if (comboTexture) comboTexture.dispose();
    if (comboMaterial) comboMaterial.dispose();
    if (comboSprite) comboSprite.removeFromParent();
    comboTexture = new THREE.CanvasTexture(canvas);
    comboMaterial = new THREE.SpriteMaterial({ map: comboTexture, transparent: true, depthTest: false });
    comboSprite = new THREE.Sprite(comboMaterial);
    comboSprite.position.copy(ball.position);
    comboSprite.position.y += ballRadius + 0.28;
    comboSprite.scale.set(1.35, 0.68, 1);
    comboSprite.renderOrder = 20;
    scene.add(comboSprite);
  }

  function increaseCombo() {
    const combo = getCombo() + 1;
    setCombo(combo);
    updateComboSprite();
    if (getComboShieldUnlocked() && combo >= comboShieldThreshold && !getComboShieldAwardedThisCombo()) {
      setComboShieldAwardedThisCombo(true);
      if (!getHasShield()) {
        setHasShield(true);
        shieldMesh.visible = true;
        spawnFloatingText('COMBO SHIELD', ball.position, 0x80deea, true);
      }
    }
  }

  function resetCombo(showLoss = true) {
    if (getCombo() <= 0) return;
    setCombo(0);
    setComboShieldAwardedThisCombo(false);
    updateComboSprite();
    updateComboSprite();
    if (showLoss) {
      spawnFloatingText('Combo Loss', ball.position, 0xff7043, true);
    }
  }

  function updateComboPosition() {
    if (comboSprite) {
      comboSprite.position.copy(ball.position);
      comboSprite.position.y += ballRadius + 0.28;
    }
  }

  return { updateComboSprite, increaseCombo, resetCombo, updateComboPosition };
}
