const JSONBIN_BIN_ID = '69fd1176adc21f119a6b5071';
const JSONBIN_ACCESS_KEY = '$2a$10$rijn8M9JPA3wdQtJMc2IW.I3kZD/s1BYr1SePS8O9lrB2x78LhL92';

async function jsonbinFetch(endpoint, options = {}) {
  const url = `https://api.jsonbin.io/v3/${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Access-Key': JSONBIN_ACCESS_KEY,
  };
  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  return response.json();
}

export async function loadScores() {
  try {
    const data = await jsonbinFetch(`b/${JSONBIN_BIN_ID}/latest`);
    return data.record?.scores || [];
  } catch {
    return [];
  }
}

async function saveScores(scores) {
  await jsonbinFetch(`b/${JSONBIN_BIN_ID}`, {
    method: 'PUT',
    body: JSON.stringify({ scores }),
  });
}

export async function submitScoreToLeaderboard(playerName, playerScore) {
  const scores = await loadScores();
  scores.push({
    name: playerName.trim().toUpperCase().substring(0, 12),
    score: playerScore,
    timestamp: Date.now(),
  });
  scores.sort((a, b) => b.score - a.score);
  scores.splice(20);
  await saveScores(scores);
}

export async function getPlayerRank(playerName, playerScore) {
  const scores = await loadScores();
  const rank = scores.findIndex(s => s.name === playerName.trim().toUpperCase().substring(0, 12) && s.score === playerScore) + 1;
  return rank > 0 ? rank : scores.length + 1;
}
