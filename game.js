const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    parent: 'game-container',
    backgroundColor: '#222',
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let score = 0;
let bestScore = localStorage.getItem('bestScore') || 0;
let grid = [];
const ROWS = 12;
const COLS = 6;
const BLOCK_SIZE = 32;
let gameMode = "normal"; // normal, bucho, kenty
let isGameOver = false;

function preload() {
    // ぷよの代わり（本来は画像）
    this.load.image('puyo1', 'https://placehold.jp/30/ff0000/ffffff/32x32.png?text=赤');
    this.load.image('puyo2', 'https://placehold.jp/30/00ff00/ffffff/32x32.png?text=緑');
    this.load.image('puyo3', 'https://placehold.jp/30/0000ff/ffffff/32x32.png?text=青');
    this.load.image('puyo4', 'https://placehold.jp/30/ffff00/000000/32x32.png?text=黄');
    this.load.image('ojama', 'https://placehold.jp/30/888888/ffffff/32x32.png?text=危');
}

function create() {
    const scene = this;
    
    // --- 抽選 ---
    let rand = Math.random();
    if (rand < 0.01) gameMode = "kenty";
    else if (rand < 0.06) gameMode = "bucho";

    // --- 背景・UI ---
    this.add.rectangle(180, 240, COLS * BLOCK_SIZE + 4, ROWS * BLOCK_SIZE + 4, 0x444444); // 枠線
    this.add.rectangle(180, 240, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE, 0x000000); // 盤面
    
    let scoreText = this.add.text(10, 10, `Score: ${score}`, { fontSize: '18px', fill: '#fff' });
    let bestText = this.add.text(10, 35, `Best: ${bestScore}`, { fontSize: '14px', fill: '#aaa' });

    this.add.text(180, 50, "楽しいpypy", { fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5);

    // --- 操作ボタン (スマホ用) ---
    const btnStyle = { fontSize: '32px', backgroundColor: '#555', padding: 10 };
    // 左下：回転
    let rotateBtn = this.add.text(50, 550, "🔄", btnStyle).setInteractive();
    // 右下：十字
    let leftBtn = this.add.text(200, 550, "⬅️", btnStyle).setInteractive();
    let downBtn = this.add.text(260, 550, "⬇️", btnStyle).setInteractive();
    let rightBtn = this.add.text(320, 550, "➡️", btnStyle).setInteractive();

    // --- 特殊モードタイマー ---
    this.time.delayedCall(7000, () => {
        if (gameMode !== "normal") triggerSpecialMode(scene);
    });
}

function update() {
    if (isGameOver) return;
    // ぷよの落下・移動ロジック（簡略化）
}

function triggerSpecialMode(scene) {
    // 全停止・明滅
    scene.tweens.add({
        targets: [], // 画面上のぷよ全てを対象に
        alpha: 0,
        duration: 200,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
            // 消滅
            if (gameMode === "bucho") {
                startBuchoEvent(scene);
            } else if (gameMode === "kenty") {
                startKentyEvent(scene);
            }
        }
    });
}

function startBuchoEvent(scene) {
    scene.time.delayedCall(1000, () => {
        let txt = scene.add.text(180, 320, "腹括れや！！", { fontSize: '48px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5);
        scene.time.delayedCall(2000, () => {
            txt.destroy();
            // おじゃまぷよ大量落下（演出）
            for(let i=0; i<100; i++) {
                scene.add.image(Phaser.Math.Between(100, 260), -50 - (i*20), 'ojama');
            }
        });
    });
}

function startKentyEvent(scene) {
    scene.time.delayedCall(1000, () => {
        // 画面を雀卓に（緑の背景）
        scene.add.rectangle(180, 320, 360, 640, 0x006600).setDepth(100);
        let msg = scene.add.text(180, 200, "九蓮宝燈聴牌！\nボタンを押せ！\n(6ピンツモで役満！)", 
            { fontSize: '24px', align: 'center', color: '#fff' }).setOrigin(0.5).setDepth(101);
        
        let btn = scene.add.text(180, 400, "ツモ！！！", { fontSize: '40px', backgroundColor: '#f00', padding: 20 })
            .setOrigin(0.5).setInteractive().setDepth(101);

        btn.on('pointerdown', () => {
            msg.destroy();
            btn.destroy();
            scene.add.text(180, 320, "目の前でTKが\n6ピンをツモった。\n\nゲームオーバー。\n次こそ九蓮宝燈！", 
                { fontSize: '22px', align: 'center', color: '#ffea00' }).setOrigin(0.5).setDepth(102);
            isGameOver = true;
        });
    });
}
