import { platformSpacing } from '../core/constants.js';

const platformBandIndex = new Map();

export function platformY(platform) {
  return platform.group.position.y;
}

export function clearPlatformBandIndex() {
  platformBandIndex.clear();
}

export function registerPlatformInBand(platform) {
  const y = platformY(platform);
  const band = Math.round(y / platformSpacing);
  if (!platformBandIndex.has(band)) platformBandIndex.set(band, []);
  platformBandIndex.get(band).push(platform);
}

export function unregisterPlatformFromBand(platform) {
  const y = platformY(platform);
  const band = Math.round(y / platformSpacing);
  const arr = platformBandIndex.get(band);
  if (!arr) return;
  const idx = arr.indexOf(platform);
  if (idx !== -1) arr.splice(idx, 1);
}

export function getPlatformsNearY(yMin, yMax) {
  const bandMin = Math.round(yMin / platformSpacing) - 1;
  const bandMax = Math.round(yMax / platformSpacing) + 1;
  const result = [];
  for (let b = bandMin; b <= bandMax; b += 1) {
    const arr = platformBandIndex.get(b);
    if (arr) {
      for (let i = 0; i < arr.length; i += 1) {
        result.push(arr[i]);
      }
    }
  }
  return result;
}
