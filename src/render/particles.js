import * as THREE from 'three';

const MAX_PARTICLES = 256;

export function createParticleSystem({ scene, particleGeometry }) {
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
  const instancedMesh = new THREE.InstancedMesh(particleGeometry, material, MAX_PARTICLES);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  instancedMesh.count = MAX_PARTICLES;
  instancedMesh.frustumCulled = false;
  scene.add(instancedMesh);

  const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < MAX_PARTICLES; i += 1) instancedMesh.setMatrixAt(i, zeroMatrix);
  instancedMesh.instanceMatrix.needsUpdate = true;

  const slots = [];
  const freeSlots = [];
  const activeSlots = [];
  for (let i = 0; i < MAX_PARTICLES; i += 1) {
    slots.push({
      active: false, life: 0, maxLife: 0.8, gravity: -3.5,
      vx: 0, vy: 0, vz: 0,
      x: 0, y: 0, z: 0,
      scale: 1, baseR: 1, baseG: 1, baseB: 1,
    });
    freeSlots.push(i);
  }

  const tmpMatrix = new THREE.Matrix4();
  const tmpPos = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpScale = new THREE.Vector3();
  const tmpColor = new THREE.Color();

  function spawnParticle({ position, color, velocity, life, maxLife = life, gravity = -3.5, opacity = 1, scale = 1 }) {
    let slotIdx = freeSlots.pop();
    if (slotIdx === undefined) {
      slotIdx = activeSlots.shift();
    }
    const slot = slots[slotIdx];
    slot.active = true;
    slot.life = life;
    slot.maxLife = maxLife ?? 0.8;
    slot.gravity = gravity;
    slot.vx = velocity.x; slot.vy = velocity.y; slot.vz = velocity.z;
    slot.x = position.x; slot.y = position.y; slot.z = position.z;
    slot.scale = scale;
    tmpColor.setHex(color);
    slot.baseR = tmpColor.r * opacity;
    slot.baseG = tmpColor.g * opacity;
    slot.baseB = tmpColor.b * opacity;
    activeSlots.push(slotIdx);
  }

  function updateParticles(dt) {
    for (let i = activeSlots.length - 1; i >= 0; i -= 1) {
      const slotIdx = activeSlots[i];
      const slot = slots[slotIdx];
      slot.life -= dt;
      if (slot.life <= 0) {
        slot.active = false;
        instancedMesh.setMatrixAt(slotIdx, zeroMatrix);
        activeSlots.splice(i, 1);
        freeSlots.push(slotIdx);
        continue;
      }
      slot.vy += slot.gravity * dt;
      slot.x += slot.vx * dt;
      slot.y += slot.vy * dt;
      slot.z += slot.vz * dt;
      slot.scale *= 0.965;

      const alpha = Math.max(0, Math.min(1, slot.life / slot.maxLife));
      tmpColor.setRGB(slot.baseR * alpha, slot.baseG * alpha, slot.baseB * alpha);
      tmpPos.set(slot.x, slot.y, slot.z);
      tmpScale.setScalar(slot.scale);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      instancedMesh.setMatrixAt(slotIdx, tmpMatrix);
      instancedMesh.setColorAt(slotIdx, tmpColor);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
  }

  function clearParticles() {
    for (const slotIdx of activeSlots) {
      slots[slotIdx].active = false;
      instancedMesh.setMatrixAt(slotIdx, zeroMatrix);
      freeSlots.push(slotIdx);
    }
    activeSlots.length = 0;
    instancedMesh.instanceMatrix.needsUpdate = true;
  }

  return { spawnParticle, updateParticles, clearParticles };
}
