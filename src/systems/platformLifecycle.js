import { platformY } from '../entities/platforms.js';

export function createPlatformLifecycleSystem({
  world,
  ball,
  platforms,
  enemies,
  spikeTraps,
  platformThickness,
  platformSpacing,
  scoreEl,
  getScore,
  setScore,
  getNextPlatformId,
  setNextPlatformId,
  getPlatformsPassedThisLevel,
  setPlatformsPassedThisLevel,
  getLevelTarget,
  setBounceVelocity,
  createPlatform,
  updateLevelUI,
  detachBounceCubesFromPlatform,
  removeGoldBlocksForPlatform,
  disposeEnemy,
  removeCoinPickupsForPlatform,
  unregisterPlatformFromBand,
}) {
  const rollingPlatformAheadCount = 12;

  function generatePlatformsThrough(maxPlatformId) {
    const target = getLevelTarget();
    const cappedMaxId = Math.min(target, maxPlatformId);
    while (getNextPlatformId() <= cappedMaxId) {
      const nextPlatformId = getNextPlatformId();
      createPlatform(-nextPlatformId * platformSpacing, nextPlatformId, { final: nextPlatformId === target });
      setNextPlatformId(nextPlatformId + 1);
    }
  }

  function recyclePlatforms() {
    for (let i = platforms.length - 1; i >= 0; i -= 1) {
      const platform = platforms[i];
      const y = platformY(platform);

      if (!platform.scored && ball.position.y < y - platformThickness) {
        platform.scored = true;
        const nextScore = getScore() + 10;
        setScore(nextScore);
        if (!platform.final) {
          setPlatformsPassedThisLevel(Math.min(getLevelTarget(), getPlatformsPassedThisLevel() + 1));
        }
        generatePlatformsThrough(getPlatformsPassedThisLevel() + rollingPlatformAheadCount);
        scoreEl.textContent = String(nextScore);
        updateLevelUI();
        setBounceVelocity(7.7 + Math.min(nextScore * 0.025, 0.8));
      }

      if (y > ball.position.y + 12) {
        detachBounceCubesFromPlatform(platform);
        removeGoldBlocksForPlatform(platform);
        for (let e = enemies.length - 1; e >= 0; e -= 1) {
          if (enemies[e].type === 'explosiveMushroom' && enemies[e].platformData === platform) {
            disposeEnemy(enemies[e]);
            enemies.splice(e, 1);
          }
        }
        for (let s = spikeTraps.length - 1; s >= 0; s -= 1) {
          if (spikeTraps[s].platformGroup === platform.group) spikeTraps.splice(s, 1);
        }
        removeCoinPickupsForPlatform(platform.group);
        unregisterPlatformFromBand(platform);
        world.remove(platform.group);
        platform.group.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        platforms.splice(i, 1);
      }
    }
  }

  return { recyclePlatforms };
}
