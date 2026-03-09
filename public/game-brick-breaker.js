// Brick Breaker Game
// A classic arcade game implementation with modern features

// Game state
let gameState = {
    playing: false,
    paused: false,
    score: 0,
    level: 1,
    lives: 3,
    bricksDestroyed: 0,
    highScore: 0,
    user: null
};

// Canvas and context
let canvas;
let ctx;

// Game objects
let paddle = {
    x: 0,
    y: 0,
    width: 100,
    height: 15,
    speed: 8,
    dx: 0
};

let ball = {
    x: 0,
    y: 0,
    radius: 8,
    speed: 10,
    dx: 10,
    dy: -10,
    launched: false
};

let bricks = [];
const brickConfig = {
    rows: 5,
    cols: 8,
    width: 90,
    height: 25,
    padding: 10,
    offsetTop: 60,
    offsetLeft: 0,  // Will be calculated to center bricks
    colors: [
        { color: '#FF6B6B', points: 50 },  // Red - Top row
        { color: '#FFA500', points: 40 },  // Orange
        { color: '#FFD93D', points: 30 },  // Yellow
        { color: '#6BCF7F', points: 20 },  // Green
        { color: '#4ECDC4', points: 10 }   // Cyan - Bottom row
    ]
};

// Input handling
let keys = {};
let mouseX = 0;
let touchX = 0;
let usingTouch = false;

// Animation frame
let animationId;

// Audio context for sound effects
let audioContext;
let sounds = {
    initialized: false
};

// Initialize audio
function initAudio() {
    if (sounds.initialized) return;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        sounds.initialized = true;
    } catch (e) {
        console.log('Web Audio API not supported');
    }
}

// Play sound effect
function playSound(frequency, duration, type = 'sine') {
    if (!sounds.initialized || !audioContext) return;

    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Error playing sound:', e);
    }
}

// Sound effects
const sfx = {
    paddleHit: () => playSound(200, 0.1),
    brickHit: () => playSound(400, 0.1),
    wallHit: () => playSound(300, 0.1),
    loseLife: () => playSound(100, 0.3, 'sawtooth'),
    gameOver: () => playSound(150, 0.5, 'sawtooth'),
    levelUp: () => {
        playSound(523.25, 0.15);
        setTimeout(() => playSound(659.25, 0.15), 150);
        setTimeout(() => playSound(783.99, 0.15), 300);
    }
};

// Initialize game
async function initGame() {
    // Require authentication
    gameState.user = await window.userDataManager.requireAuth();
    if (!gameState.user) return;

    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Load high score
    loadHighScore();

    // Set up paddle
    paddle.x = canvas.width / 2 - paddle.width / 2;
    paddle.y = canvas.height - 30;

    // Set up ball
    resetBall();

    // Set up event listeners
    setupEventListeners();

    // Draw initial state
    draw();
}

// Load high score from API
async function loadHighScore() {
    try {
        const response = await fetch('/api/game-scores/brick-breaker/personal-best');
        if (response.ok) {
            const data = await response.json();
            const personalBest = data.score;
            gameState.highScore = (personalBest && typeof personalBest === 'object') ? personalBest.score : (personalBest || 0);
            document.getElementById('highScoreDisplay').textContent = gameState.highScore;
        }
    } catch (error) {
        console.error('Error loading high score:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;

        // Launch ball with spacebar
        if (e.key === ' ' && gameState.playing && !ball.launched) {
            launchBall();
            e.preventDefault();
        }

        // Pause with P or Escape
        if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && gameState.playing) {
            togglePause();
            e.preventDefault();
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    // Mouse controls
    canvas.addEventListener('mousemove', (e) => {
        if (usingTouch) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        mouseX = (e.clientX - rect.left) * scaleX;
    });

    // Touch controls
    canvas.addEventListener('touchstart', (e) => {
        usingTouch = true;
        e.preventDefault();
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        touchX = (e.touches[0].clientX - rect.left) * scaleX;
    });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (gameState.playing && !ball.launched) {
            launchBall();
        }
    });

    // Button controls
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('pauseButton').addEventListener('click', togglePause);
    document.getElementById('playAgainButton').addEventListener('click', () => {
        hideGameOverModal();
        startGame();
    });
    document.getElementById('closeModalButton').addEventListener('click', hideGameOverModal);
}

// Start game
function startGame() {
    initAudio();

    gameState.playing = true;
    gameState.paused = false;
    gameState.score = 0;
    gameState.level = 1;
    gameState.lives = 3;
    gameState.bricksDestroyed = 0;

    updateDisplay();
    createBricks();
    resetBall();

    document.getElementById('startButton').style.display = 'none';
    document.getElementById('pauseButton').style.display = 'inline-block';

    gameLoop();
}

// Toggle pause
function togglePause() {
    if (!gameState.playing) return;

    gameState.paused = !gameState.paused;

    if (gameState.paused) {
        document.getElementById('pauseButton').textContent = 'Resume';
        cancelAnimationFrame(animationId);
    } else {
        document.getElementById('pauseButton').textContent = 'Pause';
        gameLoop();
    }
}

// Create bricks
function createBricks() {
    bricks = [];
    const { rows, cols, width, height, padding, offsetTop, colors } = brickConfig;

    // Increase difficulty with level
    const actualRows = Math.min(rows + Math.floor((gameState.level - 1) / 2), 8);

    // Calculate centered offsetLeft based on canvas width
    const totalBrickWidth = cols * width + (cols - 1) * padding;
    const offsetLeft = (canvas.width - totalBrickWidth) / 2;

    for (let row = 0; row < actualRows; row++) {
        for (let col = 0; col < cols; col++) {
            const colorIndex = row % colors.length;
            bricks.push({
                x: offsetLeft + col * (width + padding),
                y: offsetTop + row * (height + padding),
                width: width,
                height: height,
                color: colors[colorIndex].color,
                points: colors[colorIndex].points,
                visible: true
            });
        }
    }
}

// Reset ball
function resetBall() {
    ball.launched = false;
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius - 5;

    // Increase ball speed with level (capped)
    const speedMultiplier = 1 + (gameState.level - 1) * 0.15;
    const baseSpeed = Math.min(4 * speedMultiplier, 8);

    ball.speed = baseSpeed;
    ball.dx = baseSpeed * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -baseSpeed;
}

// Launch ball
function launchBall() {
    ball.launched = true;
}

// Update game state
function update() {
    if (!gameState.playing || gameState.paused) return;

    // Move paddle
    if (usingTouch) {
        // Touch control
        paddle.x = touchX - paddle.width / 2;
    } else if (mouseX > 0) {
        // Mouse control
        paddle.x = mouseX - paddle.width / 2;
    } else {
        // Keyboard control
        if (keys['ArrowLeft']) {
            paddle.x -= paddle.speed;
        }
        if (keys['ArrowRight']) {
            paddle.x += paddle.speed;
        }
    }

    // Keep paddle in bounds
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }

    // Move ball if launched
    if (ball.launched) {
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall collision (left/right)
        if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
            ball.dx = -ball.dx;
            sfx.wallHit();
        }

        // Wall collision (top)
        if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
            sfx.wallHit();
        }

        // Paddle collision
        if (
            ball.y + ball.radius > paddle.y &&
            ball.y - ball.radius < paddle.y + paddle.height &&
            ball.x > paddle.x &&
            ball.x < paddle.x + paddle.width
        ) {
            // Calculate angle based on where ball hits paddle
            const hitPos = (ball.x - paddle.x) / paddle.width; // 0 to 1
            const angle = (hitPos - 0.5) * Math.PI * 0.6; // -54° to 54°

            ball.dy = -Math.abs(ball.dy); // Always go up
            ball.dx = ball.speed * Math.sin(angle);

            sfx.paddleHit();
        }

        // Bottom collision (lose life)
        if (ball.y + ball.radius > canvas.height) {
            loseLife();
        }

        // Brick collision
        for (let brick of bricks) {
            if (!brick.visible) continue;

            if (
                ball.x + ball.radius > brick.x &&
                ball.x - ball.radius < brick.x + brick.width &&
                ball.y + ball.radius > brick.y &&
                ball.y - ball.radius < brick.y + brick.height
            ) {
                // Determine collision side
                const ballCenterX = ball.x;
                const ballCenterY = ball.y;
                const brickCenterX = brick.x + brick.width / 2;
                const brickCenterY = brick.y + brick.height / 2;

                const dx = ballCenterX - brickCenterX;
                const dy = ballCenterY - brickCenterY;

                // Reflect ball based on collision side
                if (Math.abs(dx / brick.width) > Math.abs(dy / brick.height)) {
                    ball.dx = -ball.dx;
                } else {
                    ball.dy = -ball.dy;
                }

                brick.visible = false;
                gameState.score += brick.points;
                gameState.bricksDestroyed++;
                updateDisplay();
                sfx.brickHit();

                // Check for level completion
                if (bricks.every(b => !b.visible)) {
                    levelUp();
                }

                break;
            }
        }
    } else {
        // Ball follows paddle before launch
        ball.x = paddle.x + paddle.width / 2;
    }
}

// Draw game
function draw() {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw bricks
    for (let brick of bricks) {
        if (!brick.visible) continue;

        // Brick shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(brick.x + 2, brick.y + 2, brick.width, brick.height);

        // Brick
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

        // Brick highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height / 3);
    }

    // Draw paddle shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(paddle.x + 3, paddle.y + 3, paddle.width, paddle.height);

    // Draw paddle
    const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    // Draw ball shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw ball
    const ballGradient = ctx.createRadialGradient(
        ball.x - ball.radius / 3,
        ball.y - ball.radius / 3,
        0,
        ball.x,
        ball.y,
        ball.radius
    );
    ballGradient.addColorStop(0, '#ffffff');
    ballGradient.addColorStop(1, '#667eea');
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw "Click to Launch" text
    if (!ball.launched && gameState.playing) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '20px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('SPACE or CLICK to Launch', canvas.width / 2, canvas.height / 2);
    }

    // Draw pause overlay
    if (gameState.paused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);

        ctx.font = '20px Inter';
        ctx.fillText('Press P or ESC to Resume', canvas.width / 2, canvas.height / 2 + 40);
    }
}

// Game loop
function gameLoop() {
    update();
    draw();

    if (gameState.playing && !gameState.paused) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Level up
function levelUp() {
    gameState.level++;
    gameState.score += gameState.level * 100; // Bonus for completing level

    // Increase ball speed by 10% per level, cap at 1.8x original speed
    const speedMultiplier = Math.min(1 + (gameState.level - 1) * 0.1, 1.8);
    const baseSpeed = 10;
    ball.speed = baseSpeed * speedMultiplier;

    updateDisplay();

    sfx.levelUp();

    // Show level up message
    gameState.paused = true;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 48px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${gameState.level}`, canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Inter';
    ctx.fillText('Get Ready!', canvas.width / 2, canvas.height / 2 + 30);

    setTimeout(() => {
        createBricks();
        resetBall();
        gameState.paused = false;
        gameLoop();
    }, 2000);
}

// Lose life
function loseLife() {
    gameState.lives--;
    updateDisplay();
    sfx.loseLife();

    if (gameState.lives <= 0) {
        gameOver();
    } else {
        resetBall();
    }
}

// Update display
function updateDisplay() {
    document.getElementById('scoreDisplay').textContent = gameState.score;
    document.getElementById('levelDisplay').textContent = gameState.level;
    document.getElementById('livesDisplay').textContent = gameState.lives;

    // Update lives indicator
    const lifeIcons = document.querySelectorAll('.life-icon');
    lifeIcons.forEach((icon, index) => {
        if (index < gameState.lives) {
            icon.classList.remove('lost');
        } else {
            icon.classList.add('lost');
        }
    });

    // Update high score if beaten
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        document.getElementById('highScoreDisplay').textContent = gameState.highScore;
    }
}

// Game over
async function gameOver() {
    gameState.playing = false;
    cancelAnimationFrame(animationId);

    sfx.gameOver();

    document.getElementById('startButton').style.display = 'inline-block';
    document.getElementById('pauseButton').style.display = 'none';

    // Submit score to API
    await submitScore();

    // Show game over modal
    showGameOverModal();
}

// Submit score to API
async function submitScore() {
    try {
        const response = await fetch('/api/game-scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: 'brick-breaker',
                score: gameState.score,
                metadata: {
                    level: gameState.level,
                    bricksDestroyed: gameState.bricksDestroyed
                }
            })
        });

        if (response.ok) {
            console.log('Score submitted successfully');
        } else {
            console.error('Failed to submit score');
        }
    } catch (error) {
        console.error('Error submitting score:', error);
    }
}

// Show game over modal
async function showGameOverModal() {
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalLevel').textContent = gameState.level;
    document.getElementById('finalBricks').textContent = gameState.bricksDestroyed;

    // Load leaderboard
    await loadLeaderboard();

    document.getElementById('gameOverModal').classList.add('show');
}

// Hide game over modal
function hideGameOverModal() {
    document.getElementById('gameOverModal').classList.remove('show');
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        const response = await fetch('/api/game-scores/brick-breaker/leaderboard');
        if (response.ok) {
            const data = await response.json();
            displayLeaderboard(data);
        } else {
            document.getElementById('leaderboardList').innerHTML =
                '<li class="leaderboard-item"><span>Unable to load leaderboard</span></li>';
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        document.getElementById('leaderboardList').innerHTML =
            '<li class="leaderboard-item"><span>Unable to load leaderboard</span></li>';
    }
}

// Display leaderboard
function displayLeaderboard(data) {
    const leaderboardList = document.getElementById('leaderboardList');
    const scores = data.scores || data;

    if (!scores || scores.length === 0) {
        leaderboardList.innerHTML =
            '<li class="leaderboard-item"><span>No scores yet. Be the first!</span></li>';
        return;
    }

    leaderboardList.innerHTML = scores.slice(0, 5).map((entry, index) => {
        const isPersonalBest = entry.userId === gameState.user.id;
        const className = isPersonalBest ? 'leaderboard-item personal-best' : 'leaderboard-item';
        const levelInfo = entry.metadata?.level ? ` (Lv ${entry.metadata.level})` : '';
        const scoreValue = typeof entry.score === 'object' ? entry.score.score : entry.score;

        return `
            <li class="${className}">
                <span>
                    <span class="leaderboard-rank">#${index + 1}</span>
                    ${isPersonalBest ? 'You' : 'Player'}${levelInfo}
                </span>
                <span class="leaderboard-score">${scoreValue}</span>
            </li>
        `;
    }).join('');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);
