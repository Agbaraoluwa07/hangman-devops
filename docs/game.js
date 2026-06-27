// ===== COPY DONATION ADDRESS =====
function trackAnalyticsEvent(endpoint, payload) {
    fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(() => {});
}

function copyAddress(button) {
    const row = button.closest('.donation-address-row');
    const addressEl = row.querySelector('.address-value');
    const address = addressEl.dataset.address || addressEl.textContent;
    const section = button.closest('.donation-section');
    const confirm = section.querySelector('.copy-confirm');
    const addressType = addressEl.textContent.includes('0x') ? 'ETH' : 'SOL';

    navigator.clipboard.writeText(address).then(() => {
        confirm.textContent = `✅ ${addressType} address copied!`;
        confirm.classList.remove('hidden');
        trackAnalyticsEvent('analytics/copy', {
            username: playerName || 'anonymous',
            addressType
        });

        const originalText = button.textContent;
        button.textContent = '✓ Copied';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);

        setTimeout(() => {
            confirm.classList.add('hidden');
        }, 2000);
    });
}

function toggleDonation(button) {
    const section = button.closest('.donation-section');
    const rows = section.querySelectorAll('.donation-address-row');
    const isHidden = rows[0].classList.contains('hidden');

    rows.forEach(row => row.classList.toggle('hidden', !isHidden));
    button.textContent = isHidden ? 'Hide' : 'Donate';
}

// ===== WORD DATA =====
function generateEnglishWord() {
    const roots = [
        "about", "after", "again", "allow", "always", "among", "answer", "appear", "around", "arrive",
        "before", "begin", "believe", "better", "between", "beyond", "bring", "build", "careful", "change",
        "choose", "clear", "common", "complete", "consider", "contain", "create", "decide", "develop", "during",
        "enough", "enter", "event", "expect", "explain", "express", "follow", "friend", "future", "general",
        "gather", "gently", "happen", "however", "improve", "include", "increase", "indicate", "inside", "instead",
        "interest", "language", "learn", "little", "maintain", "manage", "measure", "member", "mention", "method",
        "moment", "notice", "offer", "often", "open", "opinion", "order", "organize", "people", "perform",
        "person", "point", "possible", "prepare", "present", "produce", "provide", "purpose", "realize", "receive",
        "record", "remain", "remember", "report", "require", "result", "return", "review", "school", "search",
        "section", "several", "should", "similar", "simple", "situation", "social", "special", "suggest", "support",
        "through", "together", "under", "understand", "unless", "without", "wonder", "worker", "write", "young"
    ];

    const suffixes = ["able", "ance", "ation", "ed", "ence", "er", "ful", "hood", "ible", "ing", "ion", "ish", "ity", "ive", "less", "ment", "ness", "ous", "ship", "tion", "ward", "wise", "y"];

    let word = roots[Math.floor(Math.random() * roots.length)];

    if (Math.random() > 0.6) {
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        if (!word.endsWith(suffix)) word += suffix;
    }

    if (word.length < 4 || word.length > 10) {
        word = word.slice(0, 6 + Math.floor(Math.random() * 3));
    }

    return word.toLowerCase();
}

function generateWordEntry() {
    let word = generateEnglishWord();
    let attempts = 0;

    while (!isWordEligible(word) && attempts < 20) {
        word = generateEnglishWord();
        attempts++;
    }

    return {
        word,
        category: "English grammatical words",
        hint: "",
        hint2: ""
    };
}

// ===== CONSTANTS =====
const GRID_SIZE = 9;
const maxWrong = 8;

const bodyParts = [
    "char-head", "char-eye-left", "char-eye-right", "char-mouth-sad",
    "char-body", "char-arm-left", "char-arm-right",
    "char-leg-left", "char-leg-right", "char-foot-left", "char-foot-right",
    "sweat1", "sweat2"
];

// ===== GAME STATE =====
let playerName = "";
let currentWord = "";
let currentHint = "";
let currentHint2 = "";
let currentCategory = "";
let guessedLetters = [];
let wrongGuesses = 0;
let score = 0;
let wordsCompleted = 0;
let usedWords = [];
let sessionTargetWords = 3;
let currentPlayerKey = "";
let currentPlayerBalance = 0;
let currentLives = 8;
let retryModalOpen = false;
const STORAGE_KEY = 'guessmaster-player-data';
const REWARD_PER_WORD = 100;
const LIFE_COST = 100;
const RETRY_PENALTY_COST = 50;
const REPEAT_GAP = 9999;
let wordAppearanceLog = [];
let wordLastSeenIndex = new Map();

// GRID STATE — 9x9 array of cells
let grid = [];
let currentWordCells = []; // {row, col} positions of current word
let sharedCell = null; // {row, col} of the shared letter

// ===== INIT GRID =====
function initGrid() {
    grid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        grid.push([]);
        for (let c = 0; c < GRID_SIZE; c++) {
            grid[r].push({ letter: '', state: 'empty' });
        }
    }
}

// ===== SCREEN MANAGEMENT =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function formatMoney(value) {
    return `$${Number(value).toFixed(2)}`;
}

async function loadSponsoredAds() {
    try {
        const response = await fetch('/api/ads');
        if (!response.ok) return;
        const ads = await response.json();
        const activeAd = Array.isArray(ads) && ads.length ? ads[0] : null;
        const billboards = document.querySelectorAll('.ad-billboard');

        billboards.forEach(billboard => {
            const titleEl = billboard.querySelector('.ad-billboard-title');
            const box = billboard.querySelector('.ad-billboard-box');
            const textEl = box?.querySelector('.ad-billboard-text');
            const subtextEl = box?.querySelector('.ad-billboard-subtext');
            const imageEl = box?.querySelector('.ad-billboard-image');
            if (!box || !titleEl) return;

            if (activeAd) {
                if (textEl) textEl.textContent = activeAd.text || 'Your next favorite app is waiting.';
                if (subtextEl) subtextEl.textContent = activeAd.subtext || 'Ad space for partners and promotions.';
                if (imageEl) {
                    if (activeAd.imageUrl) {
                        imageEl.src = activeAd.imageUrl;
                        imageEl.alt = activeAd.title || 'Sponsored ad';
                        imageEl.style.display = 'block';
                    } else {
                        imageEl.style.display = 'none';
                    }
                }
                titleEl.textContent = (activeAd.title || 'Sponsored').toUpperCase();
                box.dataset.adId = activeAd.id;
                box.dataset.adLink = activeAd.link || '#';
                box.style.cursor = 'pointer';
                box.onclick = () => {
                    if (box.dataset.adId) {
                        fetch(`/api/ads/${box.dataset.adId}/click`, { method: 'POST' }).catch(() => {});
                    }
                    window.open(box.dataset.adLink, '_blank', 'noopener,noreferrer');
                };
            } else {
                titleEl.textContent = 'SPONSORED';
                if (textEl) textEl.textContent = 'Your next favorite app is waiting.';
                if (subtextEl) subtextEl.textContent = 'Ad space for partners and promotions.';
                if (imageEl) imageEl.style.display = 'none';
                box.onclick = null;
                box.style.cursor = 'default';
            }
        });
    } catch {
        // Ignore ad loading failures
    }
}

function getPlayers() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function savePlayers(players) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function renderUsernameSuggestions() {
    const list = document.getElementById('username-suggestions');
    if (!list) return;

    list.innerHTML = '';
    const players = getPlayers();
    Object.values(players).forEach(player => {
        const option = document.createElement('option');
        option.value = player.username;
        list.appendChild(option);
    });
}

function updatePlayerStatus(message) {
    const status = document.getElementById('player-status');
    if (status) status.textContent = message;
}

function saveCurrentPlayerProfile() {
    if (!currentPlayerKey) return;

    const players = getPlayers();
    players[currentPlayerKey] = {
        username: playerName,
        balance: Number(currentPlayerBalance.toFixed(2))
    };
    savePlayers(players);
    renderUsernameSuggestions();
}

// ===== MAIN MENU =====
document.getElementById('play-btn').addEventListener('click', () => showScreen('player-screen'));
document.getElementById('how-to-play-btn').addEventListener('click', () => showScreen('how-to-play'));
document.querySelectorAll('.donate-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleDonation(btn));
});
document.getElementById('buy-life-btn').addEventListener('click', buyLife);
renderUsernameSuggestions();
loadSponsoredAds();
let sessionStartTime = Date.now();
window.addEventListener('beforeunload', () => {
    const durationSeconds = Math.max(1, Math.floor((Date.now() - sessionStartTime) / 1000));
    trackAnalyticsEvent('analytics/session', {
        username: playerName || 'anonymous',
        durationSeconds
    });
});

// ===== PLAYER NAME =====
document.getElementById('start-game-btn').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim();
    if (!name) { alert('Please enter your name!'); return; }

    const players = getPlayers();
    const key = name.toLowerCase();

    if (players[key]) {
        playerName = players[key].username;
        currentPlayerKey = key;
        currentPlayerBalance = Number(players[key].balance || 0);
        updatePlayerStatus(`Welcome back ${playerName}! Balance: ${formatMoney(currentPlayerBalance)}`);
    } else {
        playerName = name;
        currentPlayerKey = key;
        currentPlayerBalance = 0;
        players[key] = { username: name, balance: 0 };
        savePlayers(players);
        renderUsernameSuggestions();
        updatePlayerStatus(`New player saved. Balance: ${formatMoney(currentPlayerBalance)}`);
    }

    startNewGame();
});

document.getElementById('player-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('start-game-btn').click();
});

// ===== START NEW GAME =====
function startNewGame() {
    initGrid();
    usedWords = [];
    wrongGuesses = 0;
    wordsCompleted = 0;
    score = 0;
    sharedCell = null;
    currentWordCells = [];
    currentLives = 8;
    sessionTargetWords = Math.floor(Math.random() * 5) + 3;

    bodyParts.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.classList.add('hidden');
    });

    document.getElementById('char-mouth-happy').classList.remove('hidden');

    pickAndPlaceWord();
    renderGrid();
    showScreen('game-screen');
}

function isWordEligible(word) {
    const lastSeenIndex = wordLastSeenIndex.get(word);
    if (lastSeenIndex === undefined) return true;
    return wordAppearanceLog.length - lastSeenIndex >= REPEAT_GAP;
}

// ===== PICK AND PLACE WORD =====
function pickAndPlaceWord() {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 50) {
        attempts++;
        const picked = generateWordEntry();
        const sharedLetter = sharedCell ? grid[sharedCell.row][sharedCell.col].letter : null;

        if (sharedCell && sharedLetter && !picked.word.includes(sharedLetter)) {
            continue;
        }

        if (sharedCell === null) {
            // First word — place horizontally in center
            const row = Math.floor(GRID_SIZE / 2);
            const startCol = Math.floor((GRID_SIZE - picked.word.length) / 2);

            if (startCol >= 0 && startCol + picked.word.length <= GRID_SIZE) {
                currentWord = picked.word;
                currentCategory = picked.category;
                currentHint = picked.hint;
                currentHint2 = picked.hint2;
                currentWordCells = [];

                for (let i = 0; i < picked.word.length; i++) {
                    currentWordCells.push({ row, col: startCol + i });
                    grid[row][startCol + i] = { letter: picked.word[i], state: 'blank' };
                }
                placed = true;
            }
        } else {
            // Subsequent words — connect through shared letter
            const sharedLetter = grid[sharedCell.row][sharedCell.col].letter;
            const letterIdx = picked.word.indexOf(sharedLetter);
            if (letterIdx === -1) continue;

            // Try vertical placement from shared cell
            const startRow = sharedCell.row - letterIdx;
            const col = sharedCell.col;

            if (startRow >= 0 && startRow + picked.word.length <= GRID_SIZE) {
                // Check no conflicts
                let conflict = false;
                for (let i = 0; i < picked.word.length; i++) {
                    const r = startRow + i;
                    const cell = grid[r][col];
                    if (cell.state !== 'empty' && cell.letter !== picked.word[i]) {
                        conflict = true;
                        break;
                    }
                }

                if (!conflict) {
                    currentWord = picked.word;
                    currentCategory = picked.category;
                    currentHint = picked.hint;
                    currentHint2 = picked.hint2;
                    currentWordCells = [];

                    for (let i = 0; i < picked.word.length; i++) {
                        const r = startRow + i;
                        currentWordCells.push({ row: r, col });
                        if (grid[r][col].state === 'empty') {
                            grid[r][col] = { letter: picked.word[i], state: 'blank' };
                        }
                    }

                    // Mark shared cell
                    grid[sharedCell.row][sharedCell.col].state = 'shared';
                    placed = true;
                }
            }

            if (!placed) {
                // Try horizontal placement from shared cell
                const startCol = sharedCell.col - letterIdx;
                const row = sharedCell.row;

                if (startCol >= 0 && startCol + picked.word.length <= GRID_SIZE) {
                    let conflict = false;
                    for (let i = 0; i < picked.word.length; i++) {
                        const c = startCol + i;
                        const cell = grid[row][c];
                        if (cell.state !== 'empty' && cell.letter !== picked.word[i]) {
                            conflict = true;
                            break;
                        }
                    }

                    if (!conflict) {
                        currentWord = picked.word;
                        currentCategory = picked.category;
                        currentHint = picked.hint;
                        currentHint2 = picked.hint2;
                        currentWordCells = [];

                        for (let i = 0; i < picked.word.length; i++) {
                            const c = startCol + i;
                            currentWordCells.push({ row, col: c });
                            if (grid[row][c].state === 'empty') {
                                grid[row][c] = { letter: picked.word[i], state: 'blank' };
                            }
                        }

                        grid[sharedCell.row][sharedCell.col].state = 'shared';
                        placed = true;
                    }
                }
            }
        }
    }

    if (!placed) {
        // No more words fit — player wins!
        endGame(true);
        return;
    }

    wordAppearanceLog.push(currentWord);
    wordLastSeenIndex.set(currentWord, wordAppearanceLog.length - 1);
    usedWords.push(currentWord);
    guessedLetters = [];

    document.getElementById('player-display').textContent = `👤 ${playerName} • ${formatMoney(currentPlayerBalance)}`;
    document.getElementById('score-display').textContent = `⭐ Score: ${score}`;
    document.getElementById('health-hearts').textContent = '❤️'.repeat(currentLives);
    document.getElementById('life-balance').textContent = `Lives: ${currentLives}`;
    document.getElementById('category-badge').textContent = `${currentCategory} — Word ${wordsCompleted + 1}`;
    document.getElementById('session-target').textContent = `🎯 Target: ${sessionTargetWords} words`;
    document.getElementById('hint-text').textContent = '';
    document.getElementById('more-hint-btn').style.display = 'none';

    buildWordDisplay();
    buildKeyboard();
}

// ===== RENDER GRID =====
function renderGrid() {
    const gridEl = document.getElementById('grid-cells');
    gridEl.innerHTML = '';

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            const data = grid[r][c];

            cell.classList.add(data.state);

            if (data.state === 'solved' || data.state === 'shared') {
                cell.textContent = data.letter.toUpperCase();
            } else if (data.state === 'active') {
                cell.textContent = data.letter.toUpperCase();
            } else if (data.state === 'blank') {
                cell.textContent = '';
            } else {
                cell.textContent = '';
            }

            gridEl.appendChild(cell);
        }
    }
}

// ===== WORD DISPLAY =====
function buildWordDisplay() {
    const display = document.getElementById('word-display');
    display.innerHTML = '';
    currentWord.split('').forEach(letter => {
        const box = document.createElement('div');
        box.classList.add('letter-box');
        if (guessedLetters.includes(letter) || (sharedCell && letter === grid[sharedCell.row][sharedCell.col].letter)) {
            box.textContent = letter;
        }
        display.appendChild(box);
    });
}

// ===== KEYBOARD =====
function buildKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';
    'abcdefghijklmnopqrstuvwxyz'.split('').forEach(letter => {
        const key = document.createElement('button');
        key.classList.add('key');
        key.textContent = letter;
        key.dataset.letter = letter;
        key.addEventListener('click', () => handleGuess(letter));
        kb.appendChild(key);
    });
}

// ===== HANDLE GUESS =====
function handleGuess(letter) {
    if (guessedLetters.includes(letter)) return;
    guessedLetters.push(letter);

    const key = document.querySelector(`.key[data-letter="${letter}"]`);
    if (key) key.disabled = true;

    if (currentWord.includes(letter)) {
        key.classList.add('correct');
        showReaction('😄');

        // Update grid cells for this letter
        currentWordCells.forEach(({ row, col }) => {
            if (grid[row][col].letter === letter && grid[row][col].state === 'blank') {
                grid[row][col].state = 'active';
            }
        });

        renderGrid();
        buildWordDisplay();
        checkWin();
    } else {
        key.classList.add('wrong');
        wrongGuesses++;
        showReaction('😰');

        const part = bodyParts[wrongGuesses - 1];
        if (part) {
            const el = document.getElementById(part);
            if (el) el.classList.remove('hidden');
        }

        const hearts = currentLives - 1;
        currentLives = hearts;
        document.getElementById('health-hearts').textContent = hearts > 0 ? '❤️'.repeat(hearts) : '💔';
        document.getElementById('life-balance').textContent = `Lives: ${currentLives}`;

        document.getElementById('hangman-center').classList.add('shake');
        setTimeout(() => document.getElementById('hangman-center').classList.remove('shake'), 300);

        if (currentLives <= 0) {
            setTimeout(() => endGame(false), 500);
        }
    }
}

// ===== REACTION =====
function showReaction(emoji) {
    const r = document.getElementById('reaction');
    r.textContent = emoji;
    r.classList.remove('hidden');
    setTimeout(() => r.classList.add('hidden'), 800);
}


// ===== CHECK WIN =====
function checkWin() {
    const allGuessed = currentWord.split('').every(l =>
        guessedLetters.includes(l) ||
        (sharedCell && grid[sharedCell.row][sharedCell.col].letter === l)
    );

    if (!allGuessed) return;

    score += 100 + (maxWrong - wrongGuesses) * 10;
    wordsCompleted++;
    currentPlayerBalance = Number((currentPlayerBalance + REWARD_PER_WORD).toFixed(2));
    saveCurrentPlayerProfile();
    document.getElementById('player-display').textContent = `👤 ${playerName} • ${formatMoney(currentPlayerBalance)}`;
    showReaction('🎉');

    // Mark all current word cells as solved
    currentWordCells.forEach(({ row, col }) => {
        if (grid[row][col].state !== 'shared') {
            grid[row][col].state = 'solved';
        }
    });

    // Set new shared cell — last letter of current word
    const lastCell = currentWordCells[currentWordCells.length - 1];
    sharedCell = lastCell;
    grid[lastCell.row][lastCell.col].state = 'shared';

    renderGrid();

    document.getElementById('score-display').textContent = `⭐ Score: ${score}`;

    setTimeout(() => {
        if (wordsCompleted >= sessionTargetWords) {
            endGame(true);
            return;
        }

        pickAndPlaceWord();
        renderGrid();
        buildWordDisplay();
        buildKeyboard();
    }, 1000);
}

function buyLife() {
    if (!currentPlayerKey) return;
    if (currentPlayerBalance < LIFE_COST) {
        alert(`You need ${formatMoney(LIFE_COST)} to buy one life.`);
        return;
    }

    currentPlayerBalance = Number((currentPlayerBalance - LIFE_COST).toFixed(2));
    currentLives += 1;
    saveCurrentPlayerProfile();
    document.getElementById('player-display').textContent = `👤 ${playerName} • ${formatMoney(currentPlayerBalance)}`;
    document.getElementById('health-hearts').textContent = '❤️'.repeat(currentLives);
    document.getElementById('life-balance').textContent = `Lives: ${currentLives}`;
}

function openRetryModal() {
    if (!currentPlayerKey || currentPlayerBalance < RETRY_PENALTY_COST || retryModalOpen) return;

    const modal = document.getElementById('retry-modal');
    const message = document.getElementById('retry-modal-message');
    if (!modal || !message) return;

    message.textContent = `You lost this round in GuessMaster. Retry by paying ${formatMoney(RETRY_PENALTY_COST)} and keep the streak alive?`;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    retryModalOpen = true;
}

function closeRetryModal() {
    const modal = document.getElementById('retry-modal');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    retryModalOpen = false;
}

function confirmRetry() {
    closeRetryModal();
    if (!currentPlayerKey || currentPlayerBalance < RETRY_PENALTY_COST) return;

    currentPlayerBalance = Number((currentPlayerBalance - RETRY_PENALTY_COST).toFixed(2));
    if (currentPlayerBalance < 0) currentPlayerBalance = 0;
    saveCurrentPlayerProfile();
    startNewGame();
}

function askRetryAfterLoss() {
    openRetryModal();
}

// ===== END GAME =====
function endGame(won) {
    if (won) {
        document.getElementById('win-words').textContent = wordsCompleted;
        document.getElementById('win-score').textContent = score;
        document.getElementById('win-lives').textContent = maxWrong - wrongGuesses;
        showScreen('win-screen');
    } else {
        document.getElementById('lose-words').textContent = wordsCompleted;
        document.getElementById('lose-score').textContent = score;
        document.getElementById('lose-word').textContent = `The word was: ${currentWord.toUpperCase()}`;
        showScreen('lose-screen');
        setTimeout(() => askRetryAfterLoss(), 300);
    }
}

// ===== PAUSE =====
document.getElementById('pause-btn').addEventListener('click', () => showScreen('pause-screen'));
document.getElementById('continue-btn').addEventListener('click', () => showScreen('game-screen'));
document.getElementById('quit-btn').addEventListener('click', () => showScreen('main-menu'));

// ===== PLAY AGAIN =====
document.getElementById('play-again-win').addEventListener('click', startNewGame);
document.getElementById('play-again-lose').addEventListener('click', startNewGame);
document.getElementById('retry-confirm-btn').addEventListener('click', confirmRetry);
document.getElementById('retry-cancel-btn').addEventListener('click', closeRetryModal);
document.getElementById('retry-modal').addEventListener('click', e => {
    if (e.target.id === 'retry-modal') closeRetryModal();
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && retryModalOpen) closeRetryModal();
});

// ===== KEYBOARD NAVIGATION =====
document.addEventListener('keydown', e => {
    const letter = e.key.toLowerCase();
    if (/^[a-z]$/.test(letter)) {
        const key = document.querySelector(`.key[data-letter="${letter}"]`);
        if (key && !key.disabled) handleGuess(letter);
    }
});