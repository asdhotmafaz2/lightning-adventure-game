let keysPressed = {};

const GAME_WIDTH = 750;
const GAME_HEIGHT = 500;
const PLAYER_WIDTH = 80;
const PLAYER_HEIGHT = 100;
const LEVEL_THRESHOLD = 15;

const LEVEL_SPEEDS = {
    1: { playerSpeed: 3, spawnRate: 2000 },
    2: { playerSpeed: 4, spawnRate: 1500 },
    3: { playerSpeed: 5, spawnRate: 1000 }
};
let canvas;
let ctx;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // باقي اللعبة هنا
});
// ============================================
// متغيرات اللعبة
// ============================================


let gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    level: 1,
    gameOver: false,
    levelScore: 0
};

let player = {
    x: 20,
    y: GAME_HEIGHT / 2 - PLAYER_HEIGHT / 2,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    characterType: Math.floor(Math.random() * 4) + 1
};

let obstacles = [];
let lightnings = [];


let gameLoopId = null;
let spawnTimerId = null;

// ============================================
// تحميل الصور والأصوات
// ============================================

const imageCache = {};
const audioCache = {};

// استخدم مسارات محلية (ضع الصور في نفس المجلد)
const IMAGE_URLS = {
    player: 'player.png',
    obstacle1: 'obstacle1.png',
    obstacle2: 'obstacle2.png',
    lightning: 'lightning.png',
    background: 'background.jpg'
};

// استخدم مسارات محلية (ضع الأصوات في نفس المجلد)
const AUDIO_URLS = {
    collect: 'collect-sound-new.mp3',
    gameOver: 'gameover-sound-new.mp3'
};

function loadImage(src) {
    return new Promise((resolve, reject) => {
        if (imageCache[src]) {
            resolve(imageCache[src]);
            return;
        }
        const img = new Image();
        img.src = src;
        img.onload = () => {
            imageCache[src] = img;
            console.log(`✅ تم تحميل الصورة: ${src}`);
            resolve(img);
        };
        img.onerror = () => {
            console.warn(`⚠️ فشل تحميل الصورة: ${src}`);
            reject(new Error(`فشل تحميل: ${src}`));
        };
    });
}

function loadAudio(src) {
    if (audioCache[src]) {
        return audioCache[src];
    }
    const audio = new Audio(src);
    audio.volume = 0.5;
    audioCache[src] = audio;
    console.log(`✅ تم تحميل الصوت: ${src}`);
    return audio;
}

// تحميل جميع الموارد
async function loadResources() {
    try {
        console.log('🔄 جاري تحميل الموارد...');
       
        await Promise.all([
            loadImage(IMAGE_URLS.player),
            loadImage(IMAGE_URLS.obstacle1),
            loadImage(IMAGE_URLS.obstacle2),
            loadImage(IMAGE_URLS.lightning),
            loadImage(IMAGE_URLS.background)
        ]);
       
        loadAudio(AUDIO_URLS.collect);
        loadAudio(AUDIO_URLS.gameOver);
       
        console.log('✅ تم تحميل جميع الموارد بنجاح');
    } catch (err) {
        console.error('❌ خطأ في تحميل الموارد:', err);
        // اللعبة ستعمل بدون صور (رسومات بديلة)
    }
}

// ============================================
// معالجة الكيبورد
// ============================================

window.addEventListener('keydown', (e) => {
    if (gameState.isRunning && ['arrowup', 'arrowdown', ' '].includes(e.key.toLowerCase())) e.preventDefault();
    keysPressed[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

// ============================================
// تشغيل الأصوات
// ============================================

function playSound(type) {
    try {
        if (type === 'collect') {
            const audio = audioCache[AUDIO_URLS.collect];
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch(() => console.log('لم يتمكن من تشغيل صوت جمع النقاط'));
            }
        } else if (type === 'gameOver') {
            const audio = audioCache[AUDIO_URLS.gameOver];
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch(() => console.log('لم يتمكن من تشغيل صوت الخسارة'));
            }
        }
    } catch (e) {
        console.error('خطأ في تشغيل الصوت:', e);
    }
}

// ============================================
// منطق اللعبة// ============================================

function spawnObstacles() {
    if (!gameState.isRunning || gameState.isPaused) return;

    const numObstacles = Math.floor(Math.random() * 2) + 1;
   
    for (let i = 0; i < numObstacles; i++) {
        const obstacleType = Math.floor(Math.random() * 4) + 1;
        const newObstacle = {
            id: Math.random().toString(36),
            x: GAME_WIDTH,
            y: Math.random() * (GAME_HEIGHT - 80),
            width: 60,
            height: 80,
            type: obstacleType
        };
        obstacles.push(newObstacle);
    }

    if (Math.random() > 0.5) {
        const lightning = {
            id: Math.random().toString(36),
            x: GAME_WIDTH,
            y: Math.random() * (GAME_HEIGHT - 40),
            width: 40,
            height: 40
        };
        lightnings.push(lightning);
    }
}
function checkCollision(rect1, rect2) {
    // تقليل منطقة التصادم بـ 15 بكسل من كل جهة لتكون أكثر دقة
    const padding = 15;
    return (
        rect1.x + padding < rect2.x + rect2.width - padding &&
        rect1.x + rect1.width - padding > rect2.x + padding &&
        rect1.y + padding < rect2.y + rect2.height - padding &&
        rect1.y + padding + (rect1.height - 2 * padding) > rect2.y + padding
    );
}

function updatePlayer() {
    if (!gameState.isRunning || gameState.isPaused) return;

    const step = LEVEL_SPEEDS[gameState.level].playerSpeed;

    if (keysPressed['arrowup'] || keysPressed['w']) {
        player.y = Math.max(0, player.y - step);
    }
    if (keysPressed['arrowdown'] || keysPressed['s']) {
        player.y = Math.min(GAME_HEIGHT - player.height, player.y + step);
    }
}

function updateObstacles() {
    if (!gameState.isRunning || gameState.isPaused) return;

    const step = LEVEL_SPEEDS[gameState.level].playerSpeed;

    // تحديث موضع العقبات
    obstacles = obstacles
        .map(obs => ({
            ...obs,
            x: obs.x - step
        }))
        .filter(obs => obs.x > -obs.width);

    // التحقق من الاصطدام
    for (const obs of obstacles) {
        if (checkCollision(player, obs)) {
            playSound('gameOver');
            endGame();
            return;
        }
    }
}

function updateLightnings() {
    if (!gameState.isRunning || gameState.isPaused) return;

    const step = LEVEL_SPEEDS[gameState.level].playerSpeed;

    // تحديث موضع الصواعق
    lightnings = lightnings
        .map(light => ({
            ...light,
            x: light.x - step
        }))
        .filter(light => light.x > -light.width);

    // التحقق من التقاط الصواعق
    for (let i = 0; i < lightnings.length; i++) {
        if (checkCollision(player, lightnings[i])) {
            playSound('collect');
            lightnings.splice(i, 1);
           
            gameState.score++;
            gameState.levelScore++;

            // التحقق من الانتقال للمرحلة التالية
            if (gameState.levelScore >= LEVEL_THRESHOLD && gameState.level < 3) {
                gameState.level++;
                gameState.levelScore = 0;
                if (spawnTimerId !== null) clearInterval(spawnTimerId);
                spawnTimerId = setInterval(spawnObstacles, LEVEL_SPEEDS[gameState.level].spawnRate);
                console.log(`🎉 انتقلت إلى المرحلة ${gameState.level}!`);
            }

            updateUI();
            break;
        }
    }
}

function gameLoop() {
    if (!gameState.isRunning) return;

    updatePlayer();
    updateObstacles();
    updateLightnings();
    draw();

    if (gameState.isRunning) gameLoopId = requestAnimationFrame(gameLoop);
}

// ============================================
// الرسم
// ============================================

function draw() {
   
    // ملء الخانة بلون أساسي أولاً
    ctx.fillStyle = '#FFB6D9';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
   
    // رسم الخلفية الريترو
    const bgImg = imageCache[IMAGE_URLS.background];
    if (bgImg) {
        // تمديد الصورة لملء كل الخانة
        ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    // رسم الخلفية الريترو (بدون تدرج)

    // رسم اللاعبconst playerImg = imageCache[IMAGE_URLS.player];
    // ============================================
    // رسم اللاعب (التصحيح للسطر 307 وما حوله)
    // ============================================
   
    // جلب الصورة من الذاكرة المؤقتة باستخدام المسار الصحيح
    const playerImg = imageCache[IMAGE_URLS.player];

    if (playerImg) {
        // إذا الصورة موجودة، ارسمها
        ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    } else {
        // إذا الصورة غير موجودة (فشل التحميل)، ارسم مربعاً بديلاً لكي لا تتوقف اللعبة
        ctx.fillStyle = '#4a3a7a';
        ctx.fillRect(player.x, player.y, player.width, player.height);
       
        // إضافة حرف P لتمييز اللاعب
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('P', player.x + player.width / 2, player.y + player.height / 2);
    }

    // رسم العقبات
    const obstacleUrls = [
        IMAGE_URLS.obstacle1,
        IMAGE_URLS.obstacle1,
        IMAGE_URLS.obstacle2,
        IMAGE_URLS.obstacle2
    ];

    obstacles.forEach(obs => {
        const img = imageCache[obstacleUrls[obs.type - 1]];
        if (img) {
            ctx.drawImage(img, obs.x, obs.y, obs.width, obs.height);
        } else {
            // رسم بديل
            ctx.fillStyle = '#5a4a8a';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('X', obs.x + obs.width / 2, obs.y + obs.height / 2);
        }
    });

    // رسم الصواعق
    const lightningImg = imageCache[IMAGE_URLS.lightning];
    lightnings.forEach(light => {
        if (lightningImg) {
            ctx.drawImage(lightningImg, light.x, light.y, light.width, light.height);
        } else {
            // رسم بديل
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(light.x, light.y, light.width, light.height);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⚡', light.x + light.width / 2, light.y + light.height / 2);
        }
    });
}

// ============================================
// إدارة اللعبة
// ============================================

function startGame() {
    // منع تكرار حلقات الرسم عند إعادة تشغيل اللعبة
    if (gameLoopId !== null) cancelAnimationFrame(gameLoopId);
    player = {
        x: 20,
        y: GAME_HEIGHT / 2 - PLAYER_HEIGHT / 2,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        characterType: Math.floor(Math.random() * 4) + 1
    };

    gameState = {
        isRunning: true,
        isPaused: false,
        score: 0,
        level: 1,
        gameOver: false,
        levelScore: 0
    };

    obstacles = [];
    lightnings = [];

    console.log('🎮 بدء اللعبة...');
    updateUI();
    updateButtons();

    gameLoopId = requestAnimationFrame(gameLoop);

    if (spawnTimerId) clearInterval(spawnTimerId);
    spawnTimerId = setInterval(spawnObstacles, LEVEL_SPEEDS[1].spawnRate);
}

function endGame() {
    // يمكن للمستخدم التمرير في الصفحة بعد انتهاء اللعب.
    gameState.isRunning = false;
    gameState.gameOver = true;

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    if (spawnTimerId) clearInterval(spawnTimerId);

    console.log(`💀 انتهت اللعبة! النقاط: ${gameState.score}, المرحلة: ${gameState.level}`);
    updateButtons();
    showGameOverMessage();
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    console.log(gameState.isPaused ? '⏸️ اللعبة موقوفة' : '▶️ اللعبة تعمل');
    updateButtons();
}

function resetGame() {
    startGame();
}

// ============================================
// تحديث الواجهة
// ============================================
 
function updateUI() {
    // تأكد أن الأسماء (ID) هنا تطابق الموجود في ملف HTML
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('level').textContent = gameState.level;
   
    // هذا السطر هو اللي يغير النص 0/15
    const levelScoreElement = document.getElementById('levelScore');
    if (levelScoreElement) {
        levelScoreElement.textContent = `${gameState.levelScore}/${LEVEL_THRESHOLD}`;
    }
}
function updateButtons() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const restartBtn = document.getElementById('restartBtn');

    if (!gameState.isRunning && !gameState.gameOver) {
        startBtn.style.display = 'flex';
        pauseBtn.style.display = 'none';
        restartBtn.style.display = 'none';
    } else if (gameState.isRunning) {
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'flex';
        pauseBtn.textContent = gameState.isPaused ? 'استئناف' : 'إيقاف';
        restartBtn.style.display = 'none';
    } else if (gameState.gameOver) {
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'none';
        restartBtn.style.display = 'flex';
    }
}

function showGameOverMessage() {
    const message = document.getElementById('gameOverMessage');
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalLevel').textContent = gameState.level;
    message.style.display = 'block';
}

function hideGameOverMessage() {
    document.getElementById('gameOverMessage').style.display = 'none';
}

// ============================================
// معالجات الأحداث
// ============================================

document.getElementById('startBtn').addEventListener('click', () => {
    hideGameOverMessage();
    startGame();
});

document.getElementById('pauseBtn').addEventListener('click', togglePause);

document.getElementById('restartBtn').addEventListener('click', () => {
    hideGameOverMessage();
    resetGame();
});

// ============================================
// البدء
// ============================================

window.addEventListener('load', async () => {
    console.log('🚀 جاري تحميل اللعبة...');
    await loadResources();
    draw();
    updateButtons();
    console.log('✅ اللعبة جاهزة!');
});
