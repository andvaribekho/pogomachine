import * as THREE from 'three';

export function getLevelTarget(level) {
  return level * 10 + 10;
}

export function getLevelInfo(currentLevel, platformsPassedThisLevel) {
  const target = getLevelTarget(currentLevel);
  const progress = THREE.MathUtils.clamp(platformsPassedThisLevel / target, 0, 1);
  return { level: currentLevel, target, progress };
}
