import * as THREE from 'three';
import { angleInArc } from '../core/utils.js';
import { platformY } from './platforms.js';

export function createBounceCubeSystem({
  scene,
  world,
  ball,
  ballRadius,
  platforms,
  bounceCubes,
  bounceCubeGeometry,
  bounceCubePoolSize,
  gameplayLaneRadius,
  platformThickness,
  platformInnerRadius,
  platformOuterRadius,
  twoPi,
  getCoinAttractionRadius,
  getTileAtWorldPoint,
  collectBounceCube,
}) {
  const bounceCubeLocalPosition = new THREE.Vector3();
  let nextBounceCubeOrder = 1;

  function ensureBounceCubePool() {
    if (bounceCubes.length > 0) return;

    for (let i = 0; i < bounceCubePoolSize; i += 1) {
      const material = new THREE.MeshStandardMaterial({ color: 0xffc107, roughness: 0.5 });
      const mesh = new THREE.Mesh(bounceCubeGeometry, material);
      mesh.visible = false;
      scene.add(mesh);
      bounceCubes.push({
        mesh,
        material,
        velocity: new THREE.Vector3(),
        active: false,
        grounded: false,
        platform: null,
        value: 1,
        collected: false,
        order: 0,
        angle: 0,
        angularVelocity: 0,
        freeFlight: false,
      });
    }
  }

  function getPooledBounceCube() {
    ensureBounceCubePool();
    const inactiveCube = bounceCubes.find(cube => !cube.active);
    if (inactiveCube) return inactiveCube;

    return bounceCubes.reduce((oldest, cube) => cube.order < oldest.order ? cube : oldest, bounceCubes[0]);
  }

  function spawnBounceCubes(position, count = 3, color = 0xffc107, value = 1) {
    ensureBounceCubePool();

    for (let i = 0; i < count; i += 1) {
      const cube = getPooledBounceCube();
      resetBounceCube(cube, position, color, value);
    }
  }

  function resetBounceCube(cube, position, color = 0xffc107, value = 1) {
    if (cube.mesh.parent && cube.mesh.parent !== scene) cube.mesh.parent.remove(cube.mesh);
    if (cube.mesh.parent !== scene) scene.add(cube.mesh);

    cube.mesh.visible = true;
    cube.mesh.position.copy(position);
    cube.mesh.position.y += 0.1;
    cube.mesh.rotation.set(0, 0, 0);
    cube.material.color.setHex(color);

    const radial = Math.hypot(position.x, position.z) || 1;
    cube.mesh.position.x = (position.x / radial) * gameplayLaneRadius;
    cube.mesh.position.z = (position.z / radial) * gameplayLaneRadius;

    cube.angle = Math.atan2(cube.mesh.position.z, cube.mesh.position.x);
    const tangentialSpeed = 1.5 + Math.random() * 2;
    cube.angularVelocity = (Math.random() < 0.5 ? -1 : 1) * tangentialSpeed / gameplayLaneRadius;

    cube.velocity.set(0, 2.5 + Math.random() * 2, 0);

    cube.active = true;
    cube.grounded = false;
    cube.platform = null;
    cube.collected = false;
    cube.value = value;
    cube.order = nextBounceCubeOrder;
    nextBounceCubeOrder += 1;
  }

  function updateBounceCubes(dt) {
    const collectRadius = (ballRadius + 0.14) * (ballRadius + 0.14);
    const attractRadiusSq = getCoinAttractionRadius() * getCoinAttractionRadius();
    const attractStrength = 11;
    const cubeHalfSize = 0.07;

    for (const cube of bounceCubes) {
      if (!cube.active || cube.collected) continue;

      const worldPos = getBounceCubeWorldPosition(cube);
      const dx = ball.position.x - worldPos.x;
      const dy = ball.position.y - worldPos.y;
      const dz = ball.position.z - worldPos.z;
      const distanceSq = dx * dx + dy * dy + dz * dz;

      if (distanceSq <= attractRadiusSq && distanceSq > collectRadius) {
        const direction = new THREE.Vector3(dx, dy, dz).normalize();
        detachBounceCubeToScene(cube, worldPos);
        cube.grounded = false;
        cube.platform = null;
        cube.freeFlight = true;
        cube.velocity.addScaledVector(direction, attractStrength * dt);
        cube.velocity.multiplyScalar(Math.max(0, 1 - 1.8 * dt));
      }

      if (!cube.grounded) {
        const previousY = cube.mesh.position.y;
        cube.velocity.y -= 14 * dt;

        if (cube.freeFlight) {
          cube.mesh.position.addScaledVector(cube.velocity, dt);
        } else {
          cube.angle += cube.angularVelocity * dt;
          cube.mesh.position.x = Math.cos(cube.angle) * gameplayLaneRadius;
          cube.mesh.position.z = Math.sin(cube.angle) * gameplayLaneRadius;
          cube.mesh.position.y += cube.velocity.y * dt;
        }

        cube.mesh.rotation.x += dt * 5;
        cube.mesh.rotation.z += dt * 3;

        for (const platform of platforms) {
          const platformTop = platformY(platform) + platformThickness / 2;
          const bottomBefore = previousY - cubeHalfSize;
          const bottomNow = cube.mesh.position.y - cubeHalfSize;
          if (bottomBefore >= platformTop && bottomNow <= platformTop && cube.velocity.y < 0) {
            const landingWorldPos = cube.mesh.position.clone();
            landingWorldPos.y = platformTop + cubeHalfSize;

            if (!cube.freeFlight) {
              landingWorldPos.x = Math.cos(cube.angle) * gameplayLaneRadius;
              landingWorldPos.z = Math.sin(cube.angle) * gameplayLaneRadius;
            }

            const tile = getTileAtWorldPoint(platform, landingWorldPos);
            if (!tile) continue;

            const tangentX = -Math.sin(cube.angle || Math.atan2(landingWorldPos.z, landingWorldPos.x));
            const tangentZ = Math.cos(cube.angle || Math.atan2(landingWorldPos.z, landingWorldPos.x));
            const tangentialSpeed = cube.freeFlight
              ? (-landingWorldPos.z * cube.velocity.x + landingWorldPos.x * cube.velocity.z) / (Math.hypot(landingWorldPos.x, landingWorldPos.z) || 1)
              : (cube.angularVelocity || 0) * gameplayLaneRadius;

            const localNext = landingWorldPos.clone();
            localNext.x += tangentX * tangentialSpeed * 0.7;
            localNext.z += tangentZ * tangentialSpeed * 0.7;

            cube.mesh.removeFromParent();
            world.add(cube.mesh);
            cube.mesh.position.copy(landingWorldPos);
            world.worldToLocal(cube.mesh.position);
            world.worldToLocal(localNext);
            cube.grounded = true;
            cube.platform = platform;
            cube.freeFlight = false;
            cube.angularVelocity = 0;
            cube.angle = 0;
            cube.velocity.set(
              (localNext.x - cube.mesh.position.x) * 0.7,
              0,
              (localNext.z - cube.mesh.position.z) * 0.7
            );
            cube.mesh.rotation.set(0, 0, 0);
            break;
          }
        }
      } else {
        cube.mesh.position.x += cube.velocity.x * dt;
        cube.mesh.position.z += cube.velocity.z * dt;
        if (cube.platform) {
          cube.mesh.position.y = cube.platform.group.position.y + platformThickness / 2 + cubeHalfSize;
          const localRadial = Math.hypot(cube.mesh.position.x, cube.mesh.position.z);
          if (localRadial > 0.01) {
            cube.mesh.position.x = (cube.mesh.position.x / localRadial) * gameplayLaneRadius;
            cube.mesh.position.z = (cube.mesh.position.z / localRadial) * gameplayLaneRadius;
          }
        }
        cube.velocity.x *= Math.max(0, 1 - 4 * dt);
        cube.velocity.z *= Math.max(0, 1 - 4 * dt);
      }

      const nextWorldPos = getBounceCubeWorldPosition(cube);
      const nextDx = ball.position.x - nextWorldPos.x;
      const nextDy = ball.position.y - nextWorldPos.y;
      const nextDz = ball.position.z - nextWorldPos.z;
      if (nextDx * nextDx + nextDy * nextDy + nextDz * nextDz <= collectRadius) {
        collectBounceCube(cube, nextWorldPos);
      }
    }
  }

  function getBounceCubeWorldPosition(cube) {
    if (!cube.mesh.parent || cube.mesh.parent === scene) return cube.mesh.position;
    const worldPos = cube.mesh.position.clone();
    cube.mesh.parent.localToWorld(worldPos);
    return worldPos;
  }

  function detachBounceCubeToScene(cube, worldPos = getBounceCubeWorldPosition(cube)) {
    if (cube.mesh.parent === scene) return;
    if (cube.mesh.parent) {
      const worldNext = cube.mesh.position.clone().add(cube.velocity);
      cube.mesh.parent.localToWorld(worldNext);
      cube.velocity.copy(worldNext.sub(worldPos));
      cube.mesh.parent.remove(cube.mesh);
    }
    scene.add(cube.mesh);
    cube.mesh.position.copy(worldPos);
  }

  function deactivateBounceCube(cube) {
    if (cube.mesh.parent && cube.mesh.parent !== scene) cube.mesh.parent.remove(cube.mesh);
    if (cube.mesh.parent !== scene) scene.add(cube.mesh);
    cube.mesh.visible = false;
    cube.velocity.set(0, 0, 0);
    cube.active = false;
    cube.grounded = false;
    cube.platform = null;
    cube.collected = false;
    cube.order = 0;
    cube.angle = 0;
    cube.angularVelocity = 0;
    cube.freeFlight = false;
  }

  function deactivateAllBounceCubes() {
    ensureBounceCubePool();
    for (const cube of bounceCubes) {
      deactivateBounceCube(cube);
    }
  }

  function detachBounceCubesFromPlatform(platform) {
    for (const cube of bounceCubes) {
      if (!cube.active || cube.platform !== platform) continue;

      detachBounceCubeToScene(cube);
      cube.platform = null;
      cube.grounded = false;
      cube.freeFlight = true;
      cube.velocity.set(0, -0.2, 0);
    }
  }

  function detachBounceCubesFromTile(platform, tile) {
    for (const cube of bounceCubes) {
      if (!cube.active || !cube.grounded || cube.platform !== platform) continue;

      const worldPos = getBounceCubeWorldPosition(cube);
      bounceCubeLocalPosition.copy(worldPos);
      platform.group.worldToLocal(bounceCubeLocalPosition);
      const radius = Math.hypot(bounceCubeLocalPosition.x, bounceCubeLocalPosition.z);
      const angle = (Math.atan2(bounceCubeLocalPosition.z, bounceCubeLocalPosition.x) + twoPi) % twoPi;
      if (radius < platformInnerRadius || radius > platformOuterRadius || !angleInArc(angle, tile.start, tile.end)) continue;

      detachBounceCubeToScene(cube, worldPos);
      cube.platform = null;
      cube.grounded = false;
      cube.freeFlight = true;
      cube.velocity.set(0, -0.2, 0);
    }
  }

  return {
    ensureBounceCubePool,
    getPooledBounceCube,
    spawnBounceCubes,
    resetBounceCube,
    updateBounceCubes,
    getBounceCubeWorldPosition,
    detachBounceCubeToScene,
    deactivateBounceCube,
    deactivateAllBounceCubes,
    detachBounceCubesFromPlatform,
    detachBounceCubesFromTile,
  };
}
