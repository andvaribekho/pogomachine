export function createLeaderboardFlow({
  finalScoreEl,
  gameOverEl,
  leaderboardPanelEl,
  leaderboardScoreLabel,
  leaderboardNameSection,
  leaderboardSubmittedEl,
  leaderboardListEl,
  leaderboardRankMsg,
  getScore,
  getIsGameOver,
  setIsGameOver,
  setScoreSubmittedToLeaderboard,
  getScoreSubmittedToLeaderboard,
  setLeaderboardPendingClose,
  stopShooting,
  stopInvulnerabilityMusic,
  updateComboSprite,
  loadScores,
  submitScoreToLeaderboard,
  getPlayerRank,
}) {
  function endGame() {
    setIsGameOver(true);
    stopShooting();
    stopInvulnerabilityMusic();
    updateComboSprite();
    finalScoreEl.textContent = String(getScore());
    gameOverEl.hidden = false;
    setScoreSubmittedToLeaderboard(false);
    setLeaderboardPendingClose(true);
    leaderboardPanelEl.hidden = true;
    setTimeout(() => {
      if (getIsGameOver()) {
        showLeaderboardPanel();
      }
    }, 2000);
  }

  async function showLeaderboardPanel() {
    leaderboardScoreLabel.textContent = `Score: ${getScore()}`;
    leaderboardNameSection.hidden = false;
    leaderboardSubmittedEl.hidden = true;
    leaderboardListEl.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
    leaderboardPanelEl.hidden = false;
    await fetchLeaderboard();
  }

  async function submitScore(playerName) {
    if (!playerName.trim() || getScoreSubmittedToLeaderboard()) return;
    setScoreSubmittedToLeaderboard(true);
    try {
      await submitScoreToLeaderboard(playerName.trim(), getScore());
      leaderboardNameSection.hidden = true;
      leaderboardSubmittedEl.hidden = false;
      const rank = await getPlayerRank(playerName.trim(), getScore());
      leaderboardRankMsg.textContent = `Score submitted! Rank: #${rank}`;
      await fetchLeaderboard();
    } catch (e) {
      leaderboardRankMsg.textContent = 'Submission failed. Retrying...';
      setScoreSubmittedToLeaderboard(false);
    }
  }

  async function fetchLeaderboard() {
    try {
      const scores = await loadScores();
      leaderboardListEl.innerHTML = '';
      let pos = 1;
      for (const entry of scores) {
        const row = document.createElement('div');
        row.className = 'leaderboard-row';
        if (pos <= 3) row.classList.add('top-3');
        if (pos === 1) row.classList.add('gold-rank');
        else if (pos === 2) row.classList.add('silver-rank');
        else if (pos === 3) row.classList.add('bronze-rank');
        row.innerHTML = `<span class="leaderboard-pos">#${pos}</span><span class="leaderboard-name">${entry.name}</span><span class="leaderboard-score">${entry.score}</span>`;
        leaderboardListEl.appendChild(row);
        pos += 1;
      }
      if (leaderboardListEl.children.length === 0) {
        leaderboardListEl.innerHTML = '<div class="leaderboard-loading">No scores yet. Be the first!</div>';
      }
    } catch (e) {
      leaderboardListEl.innerHTML = '<div class="leaderboard-loading">Could not load leaderboard</div>';
    }
  }

  return { endGame, showLeaderboardPanel, submitScore, fetchLeaderboard };
}
