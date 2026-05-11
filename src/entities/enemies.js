export function isWormTile(tile) {
  return !tile.broken && !tile.spikeTrap && (tile.type === 'blue' || tile.type === 'red' || tile.type === 'gray' || tile.type === 'crackedBlue');
}

export function isGroundEnemy(enemy) {
  return enemy.type === 'worm' || enemy.type === 'yellowWorm' || enemy.type === 'miniYellowWorm' || enemy.type === 'turtle' || enemy.type === 'porcupine' || enemy.type === 'acidSnail';
}
