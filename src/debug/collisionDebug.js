import * as THREE from 'three';
import { platformInnerRadius, platformOuterRadius, platformThickness, twoPi } from '../core/constants.js';
import { platformY } from '../entities/platforms.js';

function makeCircleLine(radius, color) {
  const points = [];
  for (let i = 0; i <= 96; i += 1) {
    const angle = (i / 96) * twoPi;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, depthTest: false })
  );
}

export function createCollisionDebug({ enabled, scene, world, ball, getWorldRotation }) {
  if (!enabled) {
    return { update: () => {} };
  }

  const panel = document.createElement('pre');
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 8),
    new THREE.MeshLambertMaterial({ color: 0xff00ff, depthTest: false })
  );
  const ring = new THREE.Group();
  const collisionPoint = new THREE.Vector3();

  panel.id = 'debug-panel';
  document.body.appendChild(panel);
  marker.renderOrder = 10;
  scene.add(marker);
  ring.add(makeCircleLine(platformInnerRadius, 0xff00ff));
  ring.add(makeCircleLine(platformOuterRadius, 0xff00ff));
  world.add(ring);

  function update(platform, contact, platformTop) {
    collisionPoint.set(contact.localX, platformThickness / 2 + 0.04, contact.localZ);
    platform.group.localToWorld(collisionPoint);
    marker.position.copy(collisionPoint);
    marker.visible = true;
    ring.position.y = platformY(platform) + platformThickness / 2 + 0.035;
    ring.visible = true;

    panel.textContent = [
      `platform=${platform.id}`,
      `tile=${contact.tile ? contact.tile.index : 'gap'} ${contact.tile ? contact.tile.type : ''}`,
      `angle=${contact.angle.toFixed(3)}`,
      `radius=${contact.radius.toFixed(3)}`,
      `ballY=${ball.position.y.toFixed(3)}`,
      `platformTop=${platformTop.toFixed(3)}`,
      `worldRotation=${getWorldRotation().toFixed(3)}`,
    ].join('\n');
  }

  return { update };
}
