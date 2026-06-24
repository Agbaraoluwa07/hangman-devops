// ===== GAME DATA =====
const data = {
    "🌍 Countries": {
        emoji: "🌍",
        words: [
            { word: "nigeria", hint: "Most populous country in Africa" },
            { word: "brazil", hint: "Home of the Amazon rainforest" },
            { word: "japan", hint: "Land of the rising sun" },
            { word: "canada", hint: "Second largest country in the world" },
            { word: "australia", hint: "Also a continent" },
            { word: "germany", hint: "Known for cars and engineering" },
            { word: "mexico", hint: "Famous for tacos and pyramids" },
            { word: "egypt", hint: "Home of the pyramids" },
            { word: "france", hint: "Home of the Eiffel Tower" },
            { word: "china", hint: "Most populous country in the world" }
        ]
    },
    "🏔️ Landmarks": {
        emoji: "🏔️",
        words: [
            { word: "everest", hint: "Highest mountain in the world" },
            { word: "sahara", hint: "Largest hot desert in the world" },
            { word: "amazon", hint: "Longest river in South America" },
            { word: "kilimanjaro", hint: "Highest mountain in Africa" },
            { word: "nile", hint: "Longest river in the world" },
            { word: "victoria", hint: "Largest lake in Africa" },
            { word: "himalaya", hint: "Mountain range in Asia" },
            { word: "pacific", hint: "Largest ocean in the world" },
            { word: "atlantic", hint: "Ocean between Africa and America" },
            { word: "antarctica", hint: "Coldest continent on Earth" }
        ]
    },
    "🏙️ Capitals": {
        emoji: "🏙️",
        words: [
            { word: "abuja", hint: "Capital of Nigeria" },
            { word: "london", hint: "Capital of England" },
            { word: "paris", hint: "Capital of France" },
            { word: "tokyo", hint: "Capital of Japan" },
            { word: "ottawa", hint: "Capital of Canada" },
            { word: "berlin", hint: "Capital of Germany" },
            { word: "cairo", hint: "Capital of Egypt" },
            { word: "beijing", hint: "Capital of China" },
            { word: "brasilia", hint: "Capital of Brazil" },
            { word: "canberra", hint: "Capital of Australia" }
        ]
    },
    "🌊 Oceans & Seas": {
        emoji: "🌊",
        words: [
            { word: "pacific", hint: "Largest ocean covering one third of Earth" },
            { word: "atlantic", hint: "Ocean separating Africa and America" },
            { word: "indian", hint: "Third largest ocean named after a country" },
            { word: "arctic", hint: "Smallest and shallowest ocean" },
            { word: "mediterranean", hint: "Sea surrounded by Europe Africa and Asia" },
            { word: "caribbean", hint: "Sea known for tropical islands" },
            { word: "caspian", hint: "Largest lake in the world" },
            { word: "bering", hint: "Sea between Russia and Alaska" },
            { word: "coral", hint: "Sea near Australia with famous reef" },
            { word: "red", hint: "Sea between Africa and Arabian Peninsula" }
        ]
    }
};

// ===== GAME STATE =====
let playerName = "";
let currentWord = "";
let currentHint = "";
let currentCategory = "";
let guessedLetters = [];
let wrongGuesses = 0;
let score = 0;
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
}

// ===== MAIN MENU =====
document.getElementById('how-to-play-btn').addEventListener('click', () => {
    showScreen('how-to-play');
});

document.getElementById('back-btn').addEventListener('click', () => {
    showScreen('main-menu');
});

document.getElementById('play-btn').addEventListener('click', () => {
    showScreen('player-screen');
});

// ===== PLAYER NAME =====
document.getElementById('start-game-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('player-name').value.trim();
    if (nameInput === '') {
        alert('Please enter your name to continue!');
        return;
    }
    playerName = nameInput;
    score = 0;
    showScreen('category-screen');
    loadCategories();
});

document.getElementById('player-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('start-game-btn').click();
    }
});

// ===== CATEGORIES =====
function loadCategories() {
    document.getElementById('category-greeting').textContent = `Hi ${playerName}! Choose a Category`;
    const categoryList = document.getElementById('category-list');
    categoryList.innerHTML = '';
    Object.keys(data).forEach(category => {
        const btn = document.createElement('button');
        btn.classList.add('category-btn');
        btn.innerHTML = `
            <span class="category-emoji">${data[category].emoji}</span>
            <span>${category.replace(/^\S+\s/, '')}</span>
        `;
        btn.addEventListener('click', () => startGame(category));
        categoryList.appendChild(btn);
    });
}

// ===== START GAME =====
function startGame(category) {
    currentCategory = category;
    const words = data[category].words;
    const randomWord = words[Math.floor(Math.random() * words.length)];
    currentWord = randomWord.word;
    currentHint = randomWord.hint;
    guessedLetters = [];
    wrongGuesses = 0;

    bodyParts.forEach(part => {
        document.getElementById(part).classList.add('hidden');
    });

    document.getElementById('health-hearts').textContent = '❤️'.repeat(maxWrong);
    document.getElementById('player-display').textContent = `👤 ${playerName}`;
    document.getElementById('score-display').textContent = `⭐ Score: ${score}`;
    document.getElementById('current-category').textContent = category;
    document.getElementById('hint-text').textContent = `Hint: ${currentHint}`;

    buildWordDisplay();
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
        if (guessedLetters.includes(letter)) {
            box.textContent = letter;
            box.classList.add('revealed');
        }
        wordDisplay.appendChild(box);
    });
}

// ===== KEYBOARD =====
function buildKeyboard() {
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';
    'abcdefghijklmnopqrstuvwxyz'.split('').forEach(letter => {
        const key = document.createElement('button');
        key.classList.add('key');
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

    if (currentWord.includes(letter)) {
        key.classList.add('correct');
        buildWordDisplay();
        checkWin();
    } else {
        key.classList.add('wrong');
        wrongGuesses++;
        document.getElementById(bodyParts[wrongGuesses - 1]).classList.remove('hidden');
        
        const hearts = '❤️'.repeat(maxWrong - wrongGuesses);
        document.getElementById('health-hearts').textContent = hearts || '💔';
        
        document.getElementById('hangman-drawing').classList.add('shake');
        setTimeout(() => {
            document.getElementById('hangman-drawing').classList.remove('shake');
        }, 300);

        checkLose();
    }
}

// ===== WIN/LOSE CHECK =====
function checkWin() {
    const allGuessed = currentWord.split('').every(letter => guessedLetters.includes(letter));
    if (allGuessed) {
        score += 100;
        setTimeout(() => {
            document.getElementById('win-word').textContent = `The word was: ${currentWord.toUpperCase()}`;
            document.getElementById('win-score').textContent = `⭐ Your Score: ${score}`;
            showScreen('win-screen');
        }, 500);
    }
}

function checkLose() {
    if (wrongGuesses >= maxWrong) {
        setTimeout(() => {
            document.getElementById('lose-word').textContent = `The word was: ${currentWord.toUpperCase()}`;
            document.getElementById('lose-score').textContent = `⭐ Your Score: ${score}`;
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

// ===== PLAY AGAIN =====
document.getElementById('play-again-win').addEventListener('click', () => {
    startGame(currentCategory);
});

document.getElementById('new-category-win').addEventListener('click', () => {
    showScreen('category-screen');
    loadCategories();
});

document.getElementById('play-again-lose').addEventListener('click', () => {
    startGame(currentCategory);
});

document.getElementById('new-category-lose').addEventListener('click', () => {
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