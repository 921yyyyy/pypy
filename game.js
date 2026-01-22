const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    parent: 'game-container',
    backgroundColor: '#333',
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

// ゲーム設定
const ROWS = 12;
const COLS = 6;
const BLOCK_SIZE = 40;
const OFFSET_X = (360 - COLS * BLOCK_SIZE) / 2;
const OFFSET_Y = 80;

let grid = []; // 盤面データ
let activeGroup = null; // 操作中の3連ぷよ
let score = 0;
let bestScore = localStorage.getItem('pypy_best') || 0;
let scoreText, bestText;
let isGameOver = false;
let isProcessing = false; // 連鎖消去中フラグ
let gameMode = "normal"; // normal, bucho, kenty
let gameStartTime = 0;
let specialTriggered = false;

function preload() {
    // ぷよのテクスチャ生成
    const colors = [0xff4b4b, 0x4bff4b, 0x4b4bff, 0xffff4b, 0xbbbbbb]; // 赤,緑,青,黄,おじゃま
    colors.forEach((color, i) => {
        let graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(color, 1);
        graphics.fillCircle(18, 18, 18);
        graphics.lineStyle(2, 0xffffff, 0.5);
        graphics.strokeCircle(18, 18, 18);
        graphics.generateTexture(`puyo${i}`, 36, 36);
    });
}

function create() {
    const scene = this;
    gameStartTime = scene.time.now;

    // モード抽選
    let rand = Math.random();
    if (rand < 0.5) gameMode = "kenty";
    else if (rand < 0.5) gameMode = "bucho";

    // グリッド初期化
    for (let r = 0; r < ROWS; r++) {
        grid[r] = new Array(COLS).fill(null);
    }

    // UI描写
    this.add.rectangle(180, 320, COLS * BLOCK_SIZE + 10, ROWS * BLOCK_SIZE + 10, 0x555555); // 外枠
    this.add.rectangle(180, 320, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE, 0x000000); // 盤面内側
    this.add.text(180, 35, "楽しいpypy", { fontSize: '28px', fontStyle: 'bold' }).setOrigin(0.5);
    scoreText = this.add.text(20, 10, `SCORE: 0`, { fontSize: '18px' });
    bestText = this.add.text(20, 35, `BEST: ${bestScore}`, { fontSize: '14px', color: '#aaa' });

    // デッドライン表示
    this.add.text(OFFSET_X, OFFSET_Y - 15, "DEAD LINE", { fontSize: '10px', color: '#f00' });

    createControls.call(this);
    spawnPuyoGroup.call(this);

    // 落下タイマー
    this.time.addEvent({ delay: 1000, callback: dropStep, callbackScope: this, loop: true });
}

function update(time) {
    if (isGameOver || isProcessing) return;

    // 7秒後の特殊モード発動
    if (!specialTriggered && time - gameStartTime > 7000) {
        if (gameMode !== "normal") {
            triggerSpecial(this);
            specialTriggered = true;
        }
    }
}

// --- 操作・生成系 ---

function spawnPuyoGroup() {
    if (grid[0][2] || grid[0][3]) {
        gameOver(this);
        return;
    }
    const colors = [0, 1, 2, 3];
    activeGroup = {
        x: 2, y: 0,
        rotation: 0, // 0: 縦, 1: 横
        puyos: [
            this.add.sprite(0, 0, `puyo${Phaser.Math.RND.pick(colors)}`),
            this.add.sprite(0, 0, `puyo${Phaser.Math.RND.pick(colors)}`),
            this.add.sprite(0, 0, `puyo${Phaser.Math.RND.pick(colors)}`)
        ]
    };
    updatePuyoPositions();
}

function updatePuyoPositions() {
    if (!activeGroup) return;
    activeGroup.puyos.forEach((p, i) => {
        let rx = activeGroup.rotation === 0 ? 0 : i;
        let ry = activeGroup.rotation === 0 ? i : 0;
        p.x = OFFSET_X + (activeGroup.x + rx) * BLOCK_SIZE + 20;
        p.y = OFFSET_Y + (activeGroup.y + ry) * BLOCK_SIZE + 20;
    });
}

function createControls() {
    const s = this;
    const btn = (x, y, txt, cb) => {
        let b = s.add.text(x, y, txt, { fontSize: '40px', backgroundColor: '#444', padding: 10 }).setInteractive();
        b.on('pointerdown', cb);
    };
    // 左下：回転 / 右下：十字
    btn(50, 560, "🔄", rotateGroup);
    btn(180, 560, "⬅️", () => moveGroup(-1));
    btn(250, 560, "⬇️", dropStep);
    btn(310, 560, "➡️", () => moveGroup(1));
}

function moveGroup(dx) {
    if (isProcessing || isGameOver) return;
    let newX = activeGroup.x + dx;
    let limit = activeGroup.rotation === 0 ? COLS - 1 : COLS - 3;
    if (newX >= 0 && newX <= limit) {
        activeGroup.x = newX;
        updatePuyoPositions();
    }
}

function rotateGroup() {
    if (isProcessing || isGameOver) return;
    activeGroup.rotation = activeGroup.rotation === 0 ? 1 : 0;
    if (activeGroup.rotation === 1 && activeGroup.x > COLS - 3) activeGroup.x = COLS - 3;
    updatePuyoPositions();
}

function dropStep() {
    if (isProcessing || isGameOver) return;
    let canDrop = true;
    activeGroup.puyos.forEach((p, i) => {
        let rx = activeGroup.rotation === 0 ? 0 : i;
        let ry = activeGroup.rotation === 0 ? i : 0;
        let tx = activeGroup.x + rx;
        let ty = activeGroup.y + ry + 1;
        if (ty >= ROWS || grid[ty][tx]) canDrop = false;
    });

    if (canDrop) {
        activeGroup.y++;
        updatePuyoPositions();
    } else {
        lockPuyos();
    }
}

function lockPuyos() {
    isProcessing = true;
    activeGroup.puyos.forEach((p, i) => {
        let rx = activeGroup.rotation === 0 ? 0 : i;
        let ry = activeGroup.rotation === 0 ? i : 0;
        grid[activeGroup.y + ry][activeGroup.x + rx] = p;
    });
    activeGroup = null;
    handleChains();
}

// --- 消去・連鎖ロジック ---

async function handleChains() {
    let changed = true;
    while (changed) {
        changed = await applyGravity();
        let matches = findMatches();
        if (matches.length > 0) {
            await deleteMatches(matches);
            changed = true;
        } else {
            changed = false;
        }
    }
    isProcessing = false;
    spawnPuyoGroup.call(game.scene.scenes[0]);
}

function applyGravity() {
    return new Promise(resolve => {
        let dropped = false;
        for (let x = 0; x < COLS; x++) {
            for (let y = ROWS - 2; y >= 0; y--) {
                if (grid[y][x] && !grid[y + 1][x]) {
                    let ty = y;
                    while (ty + 1 < ROWS && !grid[ty + 1][x]) {
                        grid[ty + 1][x] = grid[ty][x];
                        grid[ty][x] = null;
                        grid[ty + 1][x].y += BLOCK_SIZE;
                        ty++;
                        dropped = true;
                    }
                }
            }
        }
        setTimeout(() => resolve(dropped), 100);
    });
}

function findMatches() {
    let matched = [];
    let visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] && !visited[r][c]) {
                let color = grid[r][c].texture.key;
                if (color === 'puyo4') continue; // おじゃまは繋がらない
                let group = [];
                checkRecursive(r, c, color, group, visited);
                if (group.length >= 4) matched.push(...group);
            }
        }
    }
    return matched;
}

function checkRecursive(r, c, color, group, visited) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || visited[r][c] || !grid[r][c] || grid[r][c].texture.key !== color) return;
    visited[r][c] = true;
    group.push({ r, c });
    checkRecursive(r + 1, c, color, group, visited);
    checkRecursive(r - 1, c, color, group, visited);
    checkRecursive(r, c + 1, color, group, visited);
    checkRecursive(r, c - 1, color, group, visited);
}

function deleteMatches(matches) {
    return new Promise(resolve => {
        matches.forEach(m => {
            if (grid[m.r][m.c]) {
                grid[m.r][m.c].destroy();
                grid[m.r][m.c] = null;
                score += 10;
            }
        });
        scoreText.setText(`SCORE: ${score}`);
        setTimeout(resolve, 300);
    });
}

// --- 特殊モード演出 ---

function triggerSpecial(scene) {
    isProcessing = true;
    if (activeGroup) {
        scene.tweens.add({
            targets: activeGroup.puyos,
            alpha: 0, duration: 200, yoyo: true, repeat: 3,
            onComplete: () => {
                activeGroup.puyos.forEach(p => p.destroy());
                activeGroup = null;
                scene.time.delayedCall(1000, () => {
                    if (gameMode === "bucho") startBucho(scene);
                    else startKenty(scene);
                });
            }
        });
    }
}

function startBucho(scene) {
    let t = scene.add.text(180, 320, "腹括れや！！", { fontSize: '60px', color: '#f00', fontStyle: 'bold' }).setOrigin(0.5).setDepth(100);
    scene.time.delayedCall(2000, () => {
        t.destroy();
        isProcessing = false;
        // おじゃまぷよ地獄
        scene.time.addEvent({
            delay: 50,
            repeat: 100,
            callback: () => {
                let x = Phaser.Math.Between(0, COLS - 1);
                let p = scene.add.sprite(OFFSET_X + x * BLOCK_SIZE + 20, -50, 'puyo4');
                scene.tweens.add({ targets: p, y: 600, duration: 500 });
                if (x === 2) isGameOver = true; // 中央に落ちたら終了
            }
        });
    });
}

function startKenty(scene) {
    let bg = scene.add.rectangle(180, 320, 360, 640, 0x007700).setDepth(200);
    let txt = scene.add.text(180, 200, "九蓮宝燈聴牌！\nボタンを押せ！\n(6ピンツモで役満！)", { fontSize: '26px', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setDepth(201);
    let btn = scene.add.text(180, 450, " ツモ！ ", { fontSize: '50px', backgroundColor: '#d00', padding: 20 }).setOrigin(0.5).setInteractive().setDepth(201);
    
    btn.on('pointerdown', () => {
        txt.setText("先に6ピンツモであがられてしまった。\nゲームオーバー。\n次こそ九蓮宝燈！");
        txt.setColor('#ff0');
        btn.destroy();
        isGameOver = true;
    });
}

function gameOver(scene) {
    isGameOver = true;
    scene.add.text(180, 320, "GAME OVER", { fontSize: '50px', color: '#fff', backgroundColor: '#000' }).setOrigin(0.5);
    if (score > bestScore) localStorage.setItem('pypy_best', score);
}
