// ===== GAME DATA =====
const data = {
    "DevOps": [
        "kubernetes", "docker", "pipeline", "jenkins", "ansible",
        "terraform", "monitoring", "deployment", "container", "automation"
    ],
    "Linux": [
        "permissions", "terminal", "directory", "scripting", "process",
        "filesystem", "kernel", "bashrc", "systemctl", "networking"
    ],
    "Git": [
        "repository", "commit", "branch", "merge", "clone",
        "push", "pull", "staging", "remote", "conflict"
    ],
    "Networking": [
        "protocol", "subnet", "gateway", "firewall", "bandwidth",
        "latency", "routing", "dns", "proxy", "packet"
    ]
};

// ===== GAME STATE =====
let currentWord = "";
let currentCategory = "";
let guessedLetters = [];
let wrongGuesses = 0;
let lastCorrectGuess = null;
const maxWrong = 8;

const bodyParts = [
    "head", "body", "left-arm", "right-arm",
    "left-leg", "right-leg", "left-foot", "right-foot"
];

// ===== SCREEN MANAGEMENT =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    toggleGameBackButton(screenId === 'game-screen');
}

function toggleGameBackButton(show) {
    document.getElementById('back-app-btn').style.display = show ? 'block' : 'none';
}

// ===== MAIN MENU =====
document.getElementById('how-to-play-btn').addEventListener('click', () => {
    showScreen('how-to-play');
});

document.getElementById('back-btn').addEventListener('click', () => {
    showScreen('main-menu');
});

document.getElementById('play-btn').addEventListener('click', () => {
    showScreen('category-screen');
    loadCategories();
});

// ===== CATEGORIES =====
function loadCategories() {
    const categoryList = document.getElementById('category-list');
    categoryList.innerHTML = '';
    Object.keys(data).forEach(category => {
        const btn = document.createElement('button');
        btn.textContent = category;
        btn.addEventListener('click', () => startGame(category));
        categoryList.appendChild(btn);
    });
}

// ===== START GAME =====
function startGame(category) {
    currentCategory = category;
    const words = data[category];
    currentWord = words[Math.floor(Math.random() * words.length)];
    guessedLetters = [];
    wrongGuesses = 0;

    // Reset hangman
    bodyParts.forEach(part => {
        document.getElementById(part).classList.add('hidden');
    });

    // Reset health
    document.getElementById('health-count').textContent = `❤️ ${maxWrong}`;

    // Build word display
    buildWordDisplay();

    // Build keyboard
    buildKeyboard();

    showScreen('game-screen');
}

// ===== WORD DISPLAY =====
function buildWordDisplay() {
    const wordDisplay = document.getElementById('word-display');
    wordDisplay.innerHTML = '';
    currentWord.split('').forEach(letter => {
        const box = document.createElement('div');
        box.classList.add('letter-box');
        box.dataset.letter = letter;
        const isRevealed = guessedLetters.includes(letter);
        box.textContent = isRevealed ? letter : '';
        if (isRevealed && letter === lastCorrectGuess) {
            box.classList.add('reveal');
        }
        wordDisplay.appendChild(box);
    });
}

// ===== KEYBOARD =====
function buildKeyboard() {
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';
    'abcdefghijklmnopqrstuvwxyz'.split('').forEach((letter, index) => {
        const key = document.createElement('button');
        key.classList.add('key', 'keyboard-key');
        key.style.animationDelay = `${index * 35}ms`;
        key.textContent = letter;
        key.dataset.letter = letter;
        key.addEventListener('click', () => handleGuess(letter));
        keyboard.appendChild(key);
    });
}

// ===== HANDLE GUESS =====
function handleGuess(letter) {
    if (guessedLetters.includes(letter)) return;
    guessedLetters.push(letter);

    const key = document.querySelector(`.key[data-letter="${letter}"]`);
    key.disabled = true;
    key.classList.add('animate');
    key.addEventListener('animationend', () => key.classList.remove('animate'), { once: true });

    if (currentWord.includes(letter)) {
        lastCorrectGuess = letter;
        key.classList.add('correct');
        buildWordDisplay();
        checkWin();
    } else {
        key.classList.add('wrong');
        wrongGuesses++;
        document.getElementById(bodyParts[wrongGuesses - 1]).classList.remove('hidden');
        document.getElementById('health-count').textContent = `❤️ ${maxWrong - wrongGuesses}`;
        checkLose();
    }
}

// ===== WIN/LOSE CHECK =====
function checkWin() {
    const allGuessed = currentWord.split('').every(letter => guessedLetters.includes(letter));
    if (allGuessed) {
        setTimeout(() => {
            document.getElementById('win-word').textContent = `The word was: ${currentWord}`;
            showScreen('win-screen');
        }, 500);
    }
}

function checkLose() {
    if (wrongGuesses >= maxWrong) {
        setTimeout(() => {
            document.getElementById('lose-word').textContent = `The word was: ${currentWord}`;
            showScreen('lose-screen');
        }, 500);
    }
}

// ===== PAUSE =====
document.getElementById('pause-btn').addEventListener('click', () => {
    showScreen('pause-screen');
});

document.getElementById('continue-btn').addEventListener('click', () => {
    showScreen('game-screen');
});

document.getElementById('new-category-btn').addEventListener('click', () => {
    showScreen('category-screen');
    loadCategories();
});

document.getElementById('quit-btn').addEventListener('click', () => {
    showScreen('main-menu');
});

document.getElementById('back-app-btn').addEventListener('click', () => {
    showScreen('category-screen');
    loadCategories();
});

toggleGameBackButton(false);

// ===== PLAY AGAIN =====
document.getElementById('play-again-win').addEventListener('click', () => {
    showScreen('category-screen');
    loadCategories();
});

document.getElementById('play-again-lose').addEventListener('click', () => {
    showScreen('category-screen');
    loadCategories();
});

// ===== KEYBOARD NAVIGATION =====
document.addEventListener('keydown', (e) => {
    const letter = e.key.toLowerCase();
    if (/^[a-z]$/.test(letter)) {
        const key = document.querySelector(`.key[data-letter="${letter}"]`);
        if (key && !key.disabled) {
            handleGuess(letter);
        }
    }
});