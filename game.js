const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    parent: 'game-container',
    backgroundColor: '#222',
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

// ゲーム定数
const COLS = 6;
const ROWS = 12;
const BLOCK_SIZE = 40;
const OFFSET_X = 60;
const OFFSET_Y = 80;

let puyoGroup;
let activePuyo = null;
let gameMode = "normal"; 
let isGameOver = false;
let score = 0;
let timer = 0;

function preload() {
    // 簡易的なぷよ（色のついた円）を作成
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0x888888];
    colors.forEach((color, i) => {
        graphics.clear();
        graphics.fillStyle(color, 1);
        graphics.fillCircle(15, 15, 15);
        graphics.generateTexture(`puyo${i}`, 30, 30);
    });
}

function create() {
    const scene = this;
    
    // モード抽選 (部長5%, ケンティー1%)
    let rand = Math.random();
    if (rand < 0.01) gameMode = "kenty";
    else if (rand < 0.06) gameMode = "bucho";

    // 盤面の枠
    this.add.rectangle(OFFSET_X + (COLS * BLOCK_SIZE) / 2, OFFSET_Y + (ROWS * BLOCK_SIZE) / 2, 
        COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE, 0x000000).setStrokeStyle(2, 0xffffff);
    
    // スコア表示
    let scoreText = this.add.text(20, 20, `Score: ${score}`, { fontSize: '20px', fill: '#fff' });
    this.add.text(180, 30, "楽しいpypy", { fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5);

    puyoGroup = this.add.group();

    // 最初のぷよを生成
    spawnPuyo.call(this);

    // 操作ボタン
    createControls.call(this);

    // 7秒後の特殊イベント
    this.time.delayedCall(7000, () => {
        if (gameMode !== "normal") triggerSpecialEvent(scene);
    });
}

function spawnPuyo() {
    if (isGameOver) return;
    const colorIdx = Math.floor(Math.random() * 4);
    activePuyo = this.add.sprite(OFFSET_X + BLOCK_SIZE * 2 + 20, OFFSET_Y + 20, `puyo${colorIdx}`);
    activePuyo.colorIdx = colorIdx;
}

function update(time, delta) {
    if (isGameOver || !activePuyo) return;

    timer += delta;
    if (timer > 800) { // 落下スピード
        activePuyo.y += BLOCK_SIZE;
        timer = 0;
        
        // 底に着いたか判定
        if (activePuyo.y > OFFSET_Y + (ROWS - 1) * BLOCK_SIZE) {
            activePuyo.y = OFFSET_Y + (ROWS - 1) * BLOCK_SIZE + 20;
            puyoGroup.add(activePuyo);
            spawnPuyo.call(this);
        }
    }
}

function createControls() {
    const scene = this;
    const btnStyle = { fontSize: '40px', backgroundColor: '#444', padding: 10 };

    // 回転（便宜上、色を変える処理にしています）
    this.add.text(40, 550, "🔄", btnStyle).setInteractive()
        .on('pointerdown', () => { 
            activePuyo.colorIdx = (activePuyo.colorIdx + 1) % 4;
            activePuyo.setTexture(`puyo${activePuyo.colorIdx}`);
        });

    // 左右移動
    this.add.text(180, 550, "⬅️", btnStyle).setInteractive()
        .on('pointerdown', () => { if(activePuyo.x > OFFSET_X + 40) activePuyo.x -= BLOCK_SIZE; });
    
    this.add.text(280, 550, "➡️", btnStyle).setInteractive()
        .on('pointerdown', () => { if(activePuyo.x < OFFSET_X + (COLS-1)*BLOCK_SIZE) activePuyo.x += BLOCK_SIZE; });
}

function triggerSpecialEvent(scene) {
    // 動きを止める
    isGameOver = true; 
    
    // 明滅
    scene.tweens.add({
        targets: activePuyo,
        alpha: 0,
        duration: 200,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
            activePuyo.destroy();
            if (gameMode === "bucho") {
                scene.time.delayedCall(1000, () => {
                    scene.add.text(180, 300, "腹括れや！！", { fontSize: '50px', color: '#f00', fontStyle: 'bold' }).setOrigin(0.5);
                    scene.time.delayedCall(2000, () => {
                        // おじゃまぷよ大量落下
                        for(let i=0; i<150; i++) {
                            scene.add.image(Phaser.Math.Between(50, 310), Phaser.Math.Between(-1000, 0), 'puyo4');
                        }
                    });
                });
            } else {
                startKentyEvent(scene);
            }
        }
    });
}

function startKentyEvent(scene) {
    scene.add.rectangle(180, 320, 360, 640, 0x006600).setDepth(10);
    scene.add.text(180, 200, "九蓮宝燈聴牌！\nボタンを押せ！", { fontSize: '30px', align: 'center' }).setOrigin(0.5).setDepth(11);
    let btn = scene.add.text(180, 400, " ツモ！ ", { fontSize: '40px', backgroundColor: '#f00' }).setOrigin(0.5).setInteractive().setDepth(11);
    
    btn.on('pointerdown', () => {
        scene.add.text(180, 320, "目の前でTKが\n6ピンをツモった。\n\nGame Over", { fontSize: '25px', color: '#ff0', align: 'center' }).setOrigin(0.5).setDepth(12);
    });
}
