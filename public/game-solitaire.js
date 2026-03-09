// Solitaire Game Implementation
// Klondike Solitaire with full game logic, scoring, and leaderboard integration

// Game State
let gameState = {
    deck: [],
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    score: 0,
    moves: 0,
    startTime: null,
    timerInterval: null,
    history: [],
    gameWon: false,
    drawCount: 3 // Draw 3 cards at a time
};

// Card suits and ranks
const SUITS = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
};

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_VALUES = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };

// Scoring constants
const SCORES = {
    WASTE_TO_TABLEAU: 5,
    WASTE_TO_FOUNDATION: 10,
    TABLEAU_TO_FOUNDATION: 10,
    TURN_OVER_TABLEAU: 5,
    FOUNDATION_TO_TABLEAU: -15,
    RECYCLE_WASTE: -20,
    UNDO_PENALTY: -5,
    HINT_PENALTY: -10,
    TIME_BONUS: 100 // Base bonus, decreases with time
};

// Initialize game
async function initGame() {
    // Require authentication
    const user = await window.userDataManager.requireAuth();
    if (!user) return;

    // Reset game state
    gameState = {
        deck: [],
        stock: [],
        waste: [],
        foundations: [[], [], [], []],
        tableau: [[], [], [], [], [], [], []],
        score: 0,
        moves: 0,
        startTime: Date.now(),
        timerInterval: null,
        history: [],
        gameWon: false,
        drawCount: 3
    };

    // Create and shuffle deck
    createDeck();
    shuffleDeck();
    dealCards();

    // Start timer
    startTimer();

    // Update UI
    updateScore();
    updateMoves();
    renderGame();

    // Enable undo button
    document.getElementById('undoBtn').disabled = true;
}

// Create a standard 52-card deck
function createDeck() {
    gameState.deck = [];
    const suitNames = Object.keys(SUITS);

    for (const suitName of suitNames) {
        for (const rank of RANKS) {
            gameState.deck.push({
                suit: suitName,
                suitSymbol: SUITS[suitName],
                rank: rank,
                value: RANK_VALUES[rank],
                color: (suitName === 'hearts' || suitName === 'diamonds') ? 'red' : 'black',
                faceUp: false,
                id: `${rank}-${suitName}-${Math.random()}`
            });
        }
    }
}

// Shuffle deck using Fisher-Yates algorithm
function shuffleDeck() {
    for (let i = gameState.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
    }
}

// Deal cards to tableau and stock
function dealCards() {
    // Deal to tableau (7 columns, increasing cards)
    for (let col = 0; col < 7; col++) {
        for (let row = 0; row <= col; row++) {
            const card = gameState.deck.pop();
            card.faceUp = (row === col); // Only top card is face up
            gameState.tableau[col].push(card);
        }
    }

    // Remaining cards go to stock
    gameState.stock = gameState.deck;
    gameState.deck = [];
}

// Timer functions
function startTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    gameState.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('timer').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

function getElapsedTime() {
    return Math.floor((Date.now() - gameState.startTime) / 1000);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Save game state to history for undo
function saveState() {
    gameState.history.push({
        stock: JSON.parse(JSON.stringify(gameState.stock)),
        waste: JSON.parse(JSON.stringify(gameState.waste)),
        foundations: JSON.parse(JSON.stringify(gameState.foundations)),
        tableau: JSON.parse(JSON.stringify(gameState.tableau)),
        score: gameState.score,
        moves: gameState.moves
    });

    // Limit history to last 10 moves
    if (gameState.history.length > 10) {
        gameState.history.shift();
    }

    document.getElementById('undoBtn').disabled = false;
}

// Undo last move
function undoMove() {
    if (gameState.history.length === 0) return;

    const previousState = gameState.history.pop();
    gameState.stock = previousState.stock;
    gameState.waste = previousState.waste;
    gameState.foundations = previousState.foundations;
    gameState.tableau = previousState.tableau;
    gameState.score = previousState.score + SCORES.UNDO_PENALTY;
    gameState.moves = previousState.moves;

    if (gameState.history.length === 0) {
        document.getElementById('undoBtn').disabled = true;
    }

    updateScore();
    updateMoves();
    renderGame();
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = Math.max(0, gameState.score);
}

// Update moves display
function updateMoves() {
    document.getElementById('moves').textContent = gameState.moves;
}

// Add score
function addScore(points) {
    gameState.score += points;
    updateScore();
}

// Increment moves
function incrementMoves() {
    gameState.moves++;
    updateMoves();
}

// Check if card can be placed on tableau
function canPlaceOnTableau(card, targetColumn) {
    const column = gameState.tableau[targetColumn];

    if (column.length === 0) {
        // Only Kings can be placed on empty tableau
        return card.rank === 'K';
    }

    const topCard = column[column.length - 1];

    // Must be alternating colors and descending rank
    return topCard.color !== card.color && topCard.value === card.value + 1;
}

// Check if card can be placed on foundation
function canPlaceOnFoundation(card, foundationIndex) {
    const foundation = gameState.foundations[foundationIndex];

    if (foundation.length === 0) {
        // Only Aces can start a foundation
        return card.rank === 'A';
    }

    const topCard = foundation[foundation.length - 1];

    // Must be same suit and ascending rank
    return topCard.suit === card.suit && topCard.value === card.value - 1;
}

// Draw cards from stock
function drawFromStock() {
    if (gameState.stock.length === 0) {
        if (gameState.waste.length === 0) return;

        // Recycle waste back to stock
        saveState();
        gameState.stock = gameState.waste.reverse().map(card => {
            card.faceUp = false;
            return card;
        });
        gameState.waste = [];
        addScore(SCORES.RECYCLE_WASTE);
        incrementMoves();
        renderGame();
        return;
    }

    saveState();

    // Draw cards (up to drawCount)
    const drawNum = Math.min(gameState.drawCount, gameState.stock.length);
    for (let i = 0; i < drawNum; i++) {
        const card = gameState.stock.pop();
        card.faceUp = true;
        gameState.waste.push(card);
    }

    incrementMoves();
    renderGame();
}

// Move card(s) from one location to another
function moveCards(fromLocation, fromIndex, toLocation, toIndex, cardIndex = -1) {
    saveState();

    let cards = [];
    let scoreDelta = 0;

    // Get cards to move
    if (fromLocation === 'waste') {
        cards = [gameState.waste.pop()];

        if (toLocation === 'tableau') {
            scoreDelta = SCORES.WASTE_TO_TABLEAU;
        } else if (toLocation === 'foundation') {
            scoreDelta = SCORES.WASTE_TO_FOUNDATION;
        }
    } else if (fromLocation === 'tableau') {
        const column = gameState.tableau[fromIndex];
        if (cardIndex === -1) {
            cardIndex = column.length - 1;
        }
        cards = column.splice(cardIndex);

        // Flip the new top card if it exists and is face down
        if (column.length > 0 && !column[column.length - 1].faceUp) {
            column[column.length - 1].faceUp = true;
            scoreDelta += SCORES.TURN_OVER_TABLEAU;
        }

        if (toLocation === 'foundation') {
            scoreDelta += SCORES.TABLEAU_TO_FOUNDATION;
        }
    } else if (fromLocation === 'foundation') {
        cards = [gameState.foundations[fromIndex].pop()];
        scoreDelta = SCORES.FOUNDATION_TO_TABLEAU;
    }

    // Place cards
    if (toLocation === 'tableau') {
        gameState.tableau[toIndex].push(...cards);
    } else if (toLocation === 'foundation') {
        gameState.foundations[toIndex].push(...cards);
    }

    addScore(scoreDelta);
    incrementMoves();
    renderGame();

    // Check for win
    checkWin();
}

// Check if game is won
function checkWin() {
    const allFoundationsFull = gameState.foundations.every(foundation => foundation.length === 13);

    if (allFoundationsFull && !gameState.gameWon) {
        gameState.gameWon = true;
        stopTimer();

        // Calculate time bonus
        const elapsedTime = getElapsedTime();
        const timeBonus = Math.max(0, SCORES.TIME_BONUS - elapsedTime);
        addScore(timeBonus);

        // Show win modal
        setTimeout(() => showWinModal(), 500);
    }
}

// Auto-complete: move all possible cards to foundations
function autoComplete() {
    let moved = false;

    do {
        moved = false;

        // Try to move from waste
        if (gameState.waste.length > 0) {
            const card = gameState.waste[gameState.waste.length - 1];
            for (let i = 0; i < 4; i++) {
                if (canPlaceOnFoundation(card, i)) {
                    moveCards('waste', -1, 'foundation', i);
                    moved = true;
                    break;
                }
            }
        }

        // Try to move from tableau
        if (!moved) {
            for (let col = 0; col < 7; col++) {
                const column = gameState.tableau[col];
                if (column.length > 0) {
                    const card = column[column.length - 1];
                    if (card.faceUp) {
                        for (let i = 0; i < 4; i++) {
                            if (canPlaceOnFoundation(card, i)) {
                                moveCards('tableau', col, 'foundation', i);
                                moved = true;
                                break;
                            }
                        }
                    }
                }
                if (moved) break;
            }
        }
    } while (moved);
}

// Hint system: find and highlight a valid move
function showHint() {
    addScore(SCORES.HINT_PENALTY);

    // Try to find a valid move
    let hint = null;

    // Check waste to foundation
    if (gameState.waste.length > 0) {
        const card = gameState.waste[gameState.waste.length - 1];
        for (let i = 0; i < 4; i++) {
            if (canPlaceOnFoundation(card, i)) {
                hint = { from: 'waste', to: 'foundation', toIndex: i };
                break;
            }
        }
    }

    // Check waste to tableau
    if (!hint && gameState.waste.length > 0) {
        const card = gameState.waste[gameState.waste.length - 1];
        for (let col = 0; col < 7; col++) {
            if (canPlaceOnTableau(card, col)) {
                hint = { from: 'waste', to: 'tableau', toIndex: col };
                break;
            }
        }
    }

    // Check tableau to foundation
    if (!hint) {
        for (let col = 0; col < 7; col++) {
            const column = gameState.tableau[col];
            if (column.length > 0) {
                const card = column[column.length - 1];
                if (card.faceUp) {
                    for (let i = 0; i < 4; i++) {
                        if (canPlaceOnFoundation(card, i)) {
                            hint = { from: 'tableau', fromIndex: col, to: 'foundation', toIndex: i };
                            break;
                        }
                    }
                }
            }
            if (hint) break;
        }
    }

    // Check tableau to tableau
    if (!hint) {
        for (let fromCol = 0; fromCol < 7; fromCol++) {
            const column = gameState.tableau[fromCol];
            for (let cardIdx = 0; cardIdx < column.length; cardIdx++) {
                const card = column[cardIdx];
                if (card.faceUp) {
                    for (let toCol = 0; toCol < 7; toCol++) {
                        if (fromCol !== toCol && canPlaceOnTableau(card, toCol)) {
                            hint = { from: 'tableau', fromIndex: fromCol, to: 'tableau', toIndex: toCol, cardIndex: cardIdx };
                            break;
                        }
                    }
                }
                if (hint) break;
            }
            if (hint) break;
        }
    }

    // Check if we can draw from stock
    if (!hint && gameState.stock.length > 0) {
        hint = { from: 'stock' };
    }

    // Show hint
    if (hint) {
        if (hint.from === 'stock') {
            highlightElement('stock');
        } else if (hint.to === 'foundation') {
            highlightElement(`foundation-${hint.toIndex}`);
        } else if (hint.to === 'tableau') {
            highlightElement(`tableau-${hint.toIndex}`);
        }
    } else {
        alert('No valid moves available. Try drawing from the stock or recycling the waste.');
    }
}

// Highlight an element temporarily
function highlightElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('drop-zone');
        setTimeout(() => {
            element.classList.remove('drop-zone');
        }, 1500);
    }
}

// Render the game board
function renderGame() {
    // Render stock
    renderStock();

    // Render waste
    renderWaste();

    // Render foundations
    renderFoundations();

    // Render tableau
    renderTableau();
}

function renderStock() {
    const stockElement = document.getElementById('stock');
    stockElement.innerHTML = '';
    stockElement.className = 'card-pile';

    if (gameState.stock.length === 0 && gameState.waste.length === 0) {
        stockElement.classList.add('empty');
        return;
    }

    if (gameState.stock.length > 0) {
        const cardEl = createCardElement(gameState.stock[gameState.stock.length - 1], false);
        cardEl.style.position = 'static';
        stockElement.appendChild(cardEl);
    } else {
        // Show recycle icon
        stockElement.innerHTML = '<div style="color: white; font-size: 2rem; text-align: center; line-height: 140px;">↻</div>';
    }
}

function renderWaste() {
    const wasteElement = document.getElementById('waste');
    wasteElement.innerHTML = '';
    wasteElement.className = 'card-pile';

    if (gameState.waste.length === 0) {
        wasteElement.classList.add('empty');
        return;
    }

    // Show top card
    const topCard = gameState.waste[gameState.waste.length - 1];
    const cardEl = createCardElement(topCard, true);
    cardEl.style.position = 'static';
    cardEl.setAttribute('draggable', 'true');
    cardEl.setAttribute('data-location', 'waste');
    wasteElement.appendChild(cardEl);
}

function renderFoundations() {
    for (let i = 0; i < 4; i++) {
        const foundationElement = document.getElementById(`foundation-${i}`);
        foundationElement.innerHTML = '';
        foundationElement.className = 'card-pile foundation';

        const foundation = gameState.foundations[i];

        if (foundation.length === 0) {
            foundationElement.classList.add('empty');
        } else {
            const topCard = foundation[foundation.length - 1];
            const cardEl = createCardElement(topCard, true);
            cardEl.style.position = 'static';
            cardEl.setAttribute('data-location', 'foundation');
            cardEl.setAttribute('data-index', i);
            foundationElement.appendChild(cardEl);
        }
    }
}

function renderTableau() {
    for (let col = 0; col < 7; col++) {
        const columnElement = document.getElementById(`tableau-${col}`);
        columnElement.innerHTML = '';

        const column = gameState.tableau[col];

        column.forEach((card, index) => {
            const cardEl = createCardElement(card, card.faceUp);
            cardEl.style.top = `${index * 25}px`;
            cardEl.setAttribute('data-location', 'tableau');
            cardEl.setAttribute('data-column', col);
            cardEl.setAttribute('data-index', index);

            if (card.faceUp) {
                cardEl.setAttribute('draggable', 'true');
            }

            columnElement.appendChild(cardEl);
        });
    }
}

// Create card HTML element
function createCardElement(card, faceUp) {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.color}`;
    cardEl.setAttribute('data-card-id', card.id);

    if (!faceUp) {
        cardEl.classList.add('face-down');
        return cardEl;
    }

    cardEl.innerHTML = `
        <div class="card-top">
            <span class="card-rank">${card.rank}</span>
            <span class="card-suit">${card.suitSymbol}</span>
        </div>
        <div class="card-center">
            <span class="card-suit-large">${card.suitSymbol}</span>
        </div>
        <div class="card-bottom">
            <span class="card-rank">${card.rank}</span>
            <span class="card-suit">${card.suitSymbol}</span>
        </div>
    `;

    return cardEl;
}

// Drag and drop functionality
let draggedCard = null;
let draggedFrom = null;

function setupDragAndDrop() {
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragend', handleDragEnd);
}

function handleDragStart(e) {
    if (!e.target.classList.contains('card') || e.target.classList.contains('face-down')) {
        return;
    }

    draggedCard = e.target;
    draggedCard.classList.add('dragging');

    const location = draggedCard.getAttribute('data-location');
    const column = draggedCard.getAttribute('data-column');
    const index = draggedCard.getAttribute('data-index');

    draggedFrom = { location, column: parseInt(column), index: parseInt(index) };

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedCard.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';

    const dropTarget = e.target.closest('.card-pile, .tableau-column');
    if (dropTarget) {
        // Visual feedback
        const canDrop = checkValidDrop(dropTarget);
        if (canDrop) {
            dropTarget.classList.add('drop-zone');
        } else {
            dropTarget.classList.add('invalid-drop');
        }
    }

    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    const dropTarget = e.target.closest('.card-pile, .tableau-column');
    if (!dropTarget || !draggedCard) return false;

    // Remove visual feedback
    document.querySelectorAll('.drop-zone, .invalid-drop').forEach(el => {
        el.classList.remove('drop-zone', 'invalid-drop');
    });

    // Get card info
    const cardId = draggedCard.getAttribute('data-card-id');
    let card = null;

    if (draggedFrom.location === 'waste') {
        card = gameState.waste[gameState.waste.length - 1];
    } else if (draggedFrom.location === 'tableau') {
        card = gameState.tableau[draggedFrom.column][draggedFrom.index];
    } else if (draggedFrom.location === 'foundation') {
        card = gameState.foundations[draggedFrom.column][gameState.foundations[draggedFrom.column].length - 1];
    }

    if (!card) return false;

    // Determine drop location
    if (dropTarget.classList.contains('foundation')) {
        const foundationIndex = parseInt(dropTarget.id.split('-')[1]);
        if (canPlaceOnFoundation(card, foundationIndex)) {
            moveCards(draggedFrom.location, draggedFrom.column, 'foundation', foundationIndex, draggedFrom.index);
        }
    } else if (dropTarget.classList.contains('tableau-column')) {
        const columnIndex = parseInt(dropTarget.getAttribute('data-column'));
        if (draggedFrom.location === 'tableau' && draggedFrom.column === columnIndex) {
            // Same column, ignore
            return false;
        }
        if (canPlaceOnTableau(card, columnIndex)) {
            moveCards(draggedFrom.location, draggedFrom.column, 'tableau', columnIndex, draggedFrom.index);
        }
    }

    return false;
}

function handleDragEnd(e) {
    if (draggedCard) {
        draggedCard.classList.remove('dragging');
    }

    document.querySelectorAll('.drop-zone, .invalid-drop').forEach(el => {
        el.classList.remove('drop-zone', 'invalid-drop');
    });

    draggedCard = null;
    draggedFrom = null;
}

function checkValidDrop(dropTarget) {
    if (!draggedCard || !draggedFrom) return false;

    const cardId = draggedCard.getAttribute('data-card-id');
    let card = null;

    if (draggedFrom.location === 'waste') {
        card = gameState.waste[gameState.waste.length - 1];
    } else if (draggedFrom.location === 'tableau') {
        card = gameState.tableau[draggedFrom.column][draggedFrom.index];
    } else if (draggedFrom.location === 'foundation') {
        card = gameState.foundations[draggedFrom.column][gameState.foundations[draggedFrom.column].length - 1];
    }

    if (!card) return false;

    if (dropTarget.classList.contains('foundation')) {
        const foundationIndex = parseInt(dropTarget.id.split('-')[1]);
        return canPlaceOnFoundation(card, foundationIndex);
    } else if (dropTarget.classList.contains('tableau-column')) {
        const columnIndex = parseInt(dropTarget.getAttribute('data-column'));
        if (draggedFrom.location === 'tableau' && draggedFrom.column === columnIndex) {
            return false;
        }
        return canPlaceOnTableau(card, columnIndex);
    }

    return false;
}

// Click handlers
function setupClickHandlers() {
    // Stock click
    document.getElementById('stock').addEventListener('click', drawFromStock);

    // Waste double-click for auto-move to foundation
    document.getElementById('waste').addEventListener('dblclick', () => {
        if (gameState.waste.length === 0) return;

        const card = gameState.waste[gameState.waste.length - 1];
        for (let i = 0; i < 4; i++) {
            if (canPlaceOnFoundation(card, i)) {
                moveCards('waste', -1, 'foundation', i);
                return;
            }
        }
    });

    // Tableau double-click for auto-move to foundation
    document.addEventListener('dblclick', (e) => {
        const cardEl = e.target.closest('.card');
        if (!cardEl) return;

        const location = cardEl.getAttribute('data-location');
        if (location !== 'tableau') return;

        const column = parseInt(cardEl.getAttribute('data-column'));
        const index = parseInt(cardEl.getAttribute('data-index'));
        const columnData = gameState.tableau[column];

        // Only allow double-click on top card
        if (index !== columnData.length - 1) return;

        const card = columnData[index];

        for (let i = 0; i < 4; i++) {
            if (canPlaceOnFoundation(card, i)) {
                moveCards('tableau', column, 'foundation', i);
                return;
            }
        }
    });

    // New game button
    document.getElementById('newGameBtn').addEventListener('click', () => {
        if (confirm('Start a new game? Current progress will be lost.')) {
            stopTimer();
            initGame();
        }
    });

    // Undo button
    document.getElementById('undoBtn').addEventListener('click', undoMove);

    // Hint button
    document.getElementById('hintBtn').addEventListener('click', showHint);
}

// Win modal functions
async function showWinModal() {
    const modal = document.getElementById('winModal');
    const elapsedTime = getElapsedTime();

    // Update final stats
    document.getElementById('finalScore').textContent = Math.max(0, gameState.score);
    document.getElementById('finalMoves').textContent = gameState.moves;
    document.getElementById('finalTime').textContent = formatTime(elapsedTime);

    // Submit score to API
    await submitScore();

    // Load and display leaderboard
    await loadLeaderboard();

    // Load personal best
    await loadPersonalBest();

    // Show modal
    modal.classList.add('show');
}

async function submitScore() {
    try {
        const user = await window.userDataManager.getCurrentUser();
        if (!user) return;

        const elapsedTime = getElapsedTime();

        const response = await fetch('/api/game-scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId: 'solitaire',
                score: Math.max(0, gameState.score),
                metadata: {
                    moves: gameState.moves,
                    time: elapsedTime,
                    timeFormatted: formatTime(elapsedTime)
                }
            })
        });

        if (!response.ok) {
            console.error('Failed to submit score');
        }
    } catch (error) {
        console.error('Error submitting score:', error);
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch('/api/game-scores/solitaire/leaderboard');

        if (!response.ok) {
            document.getElementById('leaderboardList').innerHTML =
                '<li class="leaderboard-item"><span>Failed to load leaderboard</span></li>';
            return;
        }

        const result = await response.json();
        const leaderboard = result.scores || [];
        const user = await window.userDataManager.getCurrentUser();

        if (leaderboard.length === 0) {
            document.getElementById('leaderboardList').innerHTML =
                '<li class="leaderboard-item"><span>No scores yet. You are the first!</span></li>';
            return;
        }

        const leaderboardHTML = leaderboard.map((entry, index) => {
            const time = entry.metadata?.timeFormatted || 'N/A';
            const moves = entry.metadata?.moves || 'N/A';
            const playerName = entry.userEmail || 'Player';
            const scoreValue = typeof entry.score === 'object' ? entry.score.score : entry.score;

            return `
                <li class="leaderboard-item">
                    <span>
                        <span class="leaderboard-rank">#${index + 1}</span>
                        ${playerName}
                    </span>
                    <span class="leaderboard-score">${scoreValue} pts - ${time} - ${moves} moves</span>
                </li>
            `;
        }).join('');

        document.getElementById('leaderboardList').innerHTML = leaderboardHTML;
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        document.getElementById('leaderboardList').innerHTML =
            '<li class="leaderboard-item"><span>Error loading leaderboard</span></li>';
    }
}

async function loadPersonalBest() {
    try {
        const response = await fetch('/api/game-scores/solitaire/personal-best');

        if (!response.ok) {
            document.getElementById('personalBestContainer').innerHTML = '';
            return;
        }

        const result = await response.json();
        const personalBest = result.score;

        if (personalBest) {
            const time = personalBest.metadata?.timeFormatted || 'N/A';
            const moves = personalBest.metadata?.moves || 'N/A';

            document.getElementById('personalBestContainer').innerHTML = `
                <div class="personal-best">
                    <div class="personal-best-label">Your Personal Best</div>
                    <div class="personal-best-value">${personalBest.score} pts</div>
                    <div style="font-size: 0.85rem; color: #856404; margin-top: 0.25rem;">
                        ${time} - ${moves} moves
                    </div>
                </div>
            `;
        } else {
            document.getElementById('personalBestContainer').innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading personal best:', error);
        document.getElementById('personalBestContainer').innerHTML = '';
    }
}

// Modal button handlers
document.getElementById('playAgainBtn').addEventListener('click', () => {
    document.getElementById('winModal').classList.remove('show');
    stopTimer();
    initGame();
});

document.getElementById('closeModalBtn').addEventListener('click', () => {
    document.getElementById('winModal').classList.remove('show');
});

// Initialize game on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const user = await window.userDataManager.requireAuth();
    if (!user) return;

    // Setup event handlers
    setupClickHandlers();
    setupDragAndDrop();

    // Start new game
    initGame();
});
