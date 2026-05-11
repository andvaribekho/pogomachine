import * as THREE from 'three';

export function parseClampedFloat(value, min, max, fallback) {
  const nextValue = Number.parseFloat(value);
  return Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(nextValue, min, max)
    : fallback;
}

export function parseClampedAbsFloat(value, min, max, fallback) {
  const nextValue = Number.parseFloat(value);
  return Number.isFinite(nextValue)
    ? THREE.MathUtils.clamp(Math.abs(nextValue), min, max)
    : fallback;
}

export function parseClampedInt(value, min, max, fallback) {
  const nextValue = Math.floor(Number(value) || fallback);
  return Math.max(min, Math.min(max, nextValue));
}
