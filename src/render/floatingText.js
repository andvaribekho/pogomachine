import * as THREE from 'three';

export function createFloatingTextSystem({ scene, ball, ballRadius, floatingTexts }) {
  function spawnFloatingText(text, position, color = 0x2ecc71, followBall = false) {
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
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.position.y += ballRadius + 0.28;
    sprite.scale.set(1.35, 0.68, 1);
    sprite.renderOrder = 20;
    scene.add(sprite);
    floatingTexts.push({ sprite, material, texture, life: 1, startY: sprite.position.y, followBall });
  }

  function updateFloatingTexts(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
      const item = floatingTexts[i];
      item.life -= dt;
      const progress = 1 - Math.max(0, item.life);
      if (item.followBall) {
        item.sprite.position.copy(ball.position);
        item.sprite.position.y += ballRadius + 0.28 + progress * 1.1;
      } else {
        item.sprite.position.y = item.startY + progress * 1.1;
      }
      item.sprite.material.opacity = Math.max(0, item.life);
      const scale = 1 + progress * 0.22;
      item.sprite.scale.set(1.35 * scale, 0.68 * scale, 1);

      if (item.life <= 0) {
        item.sprite.removeFromParent();
        item.texture.dispose();
        item.material.dispose();
        floatingTexts.splice(i, 1);
      }
    }
  }

  function clearFloatingTexts() {
    while (floatingTexts.length) {
      const item = floatingTexts.pop();
      item.sprite.removeFromParent();
      item.texture.dispose();
      item.material.dispose();
    }
  }

  return { spawnFloatingText, updateFloatingTexts, clearFloatingTexts };
}
