// Games management and score tracking
const GAMES = [
  {
    id: 'brick-breaker',
    name: 'Brick Breaker',
    icon: '🧱',
    description: 'Classic arcade game where you break bricks with a ball and paddle. Improve your reflexes and hand-eye coordination while having fun!',
    url: 'game-brick-breaker.html',
    available: true,
    difficulty: 'Medium',
    category: 'Arcade'
  },
  {
    id: 'solitaire',
    name: 'Solitaire (Klondike)',
    icon: '🃏',
    description: 'The classic card game that improves strategic thinking and patience. Perfect for a relaxing mental workout!',
    url: 'game-solitaire.html',
    available: true,
    difficulty: 'Easy',
    category: 'Card Game'
  },
  {
    id: 'tetris',
    name: 'Tetris',
    icon: '🟦',
    description: 'Arrange falling blocks to clear lines and increase your score. A timeless puzzle game that enhances spatial awareness!',
    url: 'game-tetris.html',
    available: false,
    difficulty: 'Medium',
    category: 'Puzzle'
  },
  {
    id: 'snake',
    name: 'Snake',
    icon: '🐍',
    description: 'Guide the snake to eat food and grow longer without hitting walls or yourself. A nostalgic classic!',
    url: 'game-snake.html',
    available: false,
    difficulty: 'Easy',
    category: 'Arcade'
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    icon: '🧠',
    description: 'Flip cards to find matching pairs. Great for improving memory and concentration!',
    url: 'game-memory.html',
    available: false,
    difficulty: 'Easy',
    category: 'Puzzle'
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: '💣',
    description: 'Use logic to uncover all safe squares without hitting mines. Perfect for developing problem-solving skills!',
    url: 'game-minesweeper.html',
    available: false,
    difficulty: 'Hard',
    category: 'Puzzle'
  }
];

let currentUser = null;
let userStats = {};

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  currentUser = await window.userDataManager?.getCurrentUser();

  if (!currentUser) {
    // Show login prompt
    document.getElementById('loginPrompt').style.display = 'block';
  }

  // Always render games, but disable unavailable ones
  await loadUserStats();
  renderGames();
});

async function loadUserStats() {
  if (!currentUser) return;

  // Fetch user stats for each game
  for (const game of GAMES) {
    if (game.available) {
      try {
        // Get personal best for each game
        const response = await fetch(`/api/game-scores/${game.id}/personal-best`);
        if (response.ok) {
          const data = await response.json();
          userStats[game.id] = {
            personalBest: data.score || 0,
            timesPlayed: 0 // We could add this to the API later
          };
        } else {
          userStats[game.id] = { personalBest: 0, timesPlayed: 0 };
        }
      } catch (error) {
        console.error(`Error loading stats for ${game.id}:`, error);
        userStats[game.id] = { personalBest: 0, timesPlayed: 0 };
      }
    }
  }
}

function renderGames() {
  const gamesGrid = document.getElementById('gamesGrid');

  gamesGrid.innerHTML = GAMES.map(game => {
    const stats = userStats[game.id] || { personalBest: 0, timesPlayed: 0 };

    return `
      <div class="game-card">
        <div class="game-icon">${game.icon}</div>
        <h3>${game.name}</h3>
        <p class="game-description">${game.description}</p>

        ${game.available && currentUser ? `
          <div class="game-stats">
            <div>
              <span class="stat-value">${stats.personalBest}</span>
              <span class="stat-label">Personal Best</span>
            </div>
            <div>
              <span class="stat-value">${game.difficulty}</span>
              <span class="stat-label">Difficulty</span>
            </div>
          </div>
        ` : ''}

        ${game.available ? `
          <a href="${game.url}" class="btn btn-primary">
            ${currentUser ? 'Play Now' : 'Login to Play'}
          </a>
        ` : `
          <span class="coming-soon">Coming Soon!</span>
        `}
      </div>
    `;
  }).join('');
}

// Utility function to format scores
function formatScore(score) {
  return score.toLocaleString();
}

// Utility function to format time (for games that track time)
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
