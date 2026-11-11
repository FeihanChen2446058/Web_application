// キャンバスの初期設定
const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false; 
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// ============================================
// 背景
// ============================================

const bgImg = new Image();
bgImg.src = "./assets/punyworld-overworld-tileset.png";

// 芝生
const pureGrass = [0, 0];

// 草の抽出
const grassTiles = [];
for (let y = 16; y < 48; y += 16) {
    for (let x = 16; x < 48; x += 16) {
        grassTiles.push([x, y]);
    }
}

// 石と黄色い花
const decoTiles = [[16, 416], [16, 448]];

// マップ設定
const mapGrid = [];
for (let i = 0; i < 2000; i++) {
    let rand = Math.random();
    
    if (rand < 0.92) {
        mapGrid.push({ base: pureGrass, overlay: null });
    } 
    else if (rand < 0.97) {
        let pGrass = grassTiles[Math.floor(Math.random() * grassTiles.length)];
        mapGrid.push({ base: pGrass, overlay: null });
    } 
    else {
    
        let deco = decoTiles[Math.floor(Math.random() * decoTiles.length)];
        mapGrid.push({ base: pureGrass, overlay: deco });
    }
}

// 描く
function drawBackground() {
    if (!bgImg.complete || bgImg.naturalWidth === 0) return;
    
    let index = 0;
    for (let y = 0; y < canvas.height; y += 48) {
        for (let x = 0; x < canvas.width; x += 48) {
            let cell = mapGrid[index++ % mapGrid.length];
            ctx.drawImage(bgImg, cell.base[0], cell.base[1], 16, 16, x, y, 48, 48);
            if (cell.overlay) {
                ctx.drawImage(bgImg, cell.overlay[0], cell.overlay[1], 16, 16, x, y, 48, 48);
            }
        }
    }
}

// ==========================================
// ゴブリン
// ==========================================
const orcIdle = new Image(); orcIdle.src = "./assets/Orc_Idle.png";
const orcHurt = new Image(); orcHurt.src = "./assets/Orc_Hurt.png";
const orcDeath = new Image(); orcDeath.src = "./assets/Orc_Death.png";

let goblins = [];
let score = 0;

// ゴブリン生成
function spawnGoblin() {
    if (goblins.length >= 10) return;

    goblins.push({
        x: 80 + Math.random() * (canvas.width - 160),
        y: 100 + Math.random() * (canvas.height - 200),
        facing: Math.random() < 0.5 ? 1 : -1, 
        state: "idle", 
        frame: 0,
        tick: 0
    });
}

setInterval(spawnGoblin, 1400);
spawnGoblin();
spawnGoblin();
spawnGoblin();

// ==============================
// 騎士
// ==============================

const imgIdle = new Image(); imgIdle.src = "./assets/Soldier_Idle.png";
const imgWalk = new Image(); imgWalk.src = "./assets/Soldier_Walk.png";
const imgAttack = new Image(); imgAttack.src = "./assets/Soldier_Attack01.png";

// ステータス
let knight = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    facing: 1,         
    frame: 0,          
    tick: 0,           
    isMoving: false,  
    isAttacking: false 
};
let stopTimer = null;

let targetX = canvas.width / 2;
let targetY = canvas.height / 2;

// 目標座標更新
window.addEventListener("mousemove", (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
});

//　攻撃
window.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;

    const guide = document.querySelector("#guide");
    if (guide) guide.style.display = "none";

    if (Math.abs(e.clientX - knight.x) > 1) {
        knight.facing = e.clientX >= knight.x ? 1 : -1;
    }
    knight.isAttacking = true;
    knight.frame = 0;
    knight.tick = 0;
    
    //判定
    for (let i = 0; i < goblins.length; i++) {
        let g = goblins[i];
        if (g.state !== "idle") continue; 

        let distFromKnight = Math.hypot(g.x - knight.x, g.y - knight.y);
        let distFromClick = Math.hypot(g.x - e.clientX, g.y - e.clientY);

        if (distFromKnight <= 110 && distFromClick <= 45) {
            g.state = "hurt"; 
            g.frame = 0;
            g.tick = 0;

            score++;
            const scoreEl = document.querySelector("#score");
            if (scoreEl) scoreEl.textContent = score;
            break; 
        }
    }
});

// メインループ
function loop() {
    // 背景
    drawBackground();

    // ゴブリンの更新
    for (let i = goblins.length - 1; i >= 0; i--) {
        let g = goblins[i];
        g.tick++;
        let gImg = orcIdle;

        if (g.state === "idle") {
            gImg = orcIdle; // 待機
            if (g.tick % 8 === 0) g.frame = (g.frame + 1) % 6;
        } 
        else if (g.state === "hurt") {
            gImg = orcHurt; // 被ダメージ
            if (g.tick % 5 === 0) g.frame++;
            if (g.frame >= 4) {
                g.state = "dead"; // 死亡
                g.frame = 0;
            }
        } 
        else if (g.state === "dead") {
            gImg = orcDeath; // 死亡
            if (g.tick % 7 === 0) g.frame++;
            if (g.frame >= 4) {
                goblins.splice(i, 1); // 消去
                continue;
            }
        }

        // ゴブリンの描画
        if (gImg.complete && gImg.naturalWidth > 0) {
            ctx.save();
            ctx.translate(g.x, g.y);
            ctx.scale(g.facing, 1);
            ctx.drawImage(gImg, g.frame * 100, 0, 100, 100, -120, -120, 240, 240);
            ctx.restore();
        }
    }
    
    // 状態
    knight.tick++;
    let currentImg = imgIdle;

    const speed = 0.1; 

    let dx = targetX - knight.x;
    let dy = targetY - knight.y;
    let dist = Math.hypot(dx, dy);

    // マウスに接近
    if (dist > 2) {
        knight.x += dx * speed;
        knight.y += dy * speed;
        knight.isMoving = true;

        if (!knight.isAttacking && Math.abs(dx) > 1) {
            knight.facing = dx >= 0 ? 1 : -1;
        }
    } else {
        knight.isMoving = false;
    }
    
    // 事件
    if (knight.isAttacking) {
        currentImg = imgAttack; // 攻撃
        if (knight.tick % 4 === 0) knight.frame++;
        if (knight.frame >= 6) {
            knight.isAttacking = false;
            knight.frame = 0;
        }
    } else if (knight.isMoving) {
        currentImg = imgWalk;   // 移動
        if (knight.tick % 5 === 0) knight.frame = (knight.frame + 1) % 8;
    } else {
        currentImg = imgIdle;   // 待機
        if (knight.tick % 8 === 0) knight.frame = (knight.frame + 1) % 6;
    }

    // 騎士を描画
    if (currentImg.complete && currentImg.naturalWidth > 0) {
        ctx.save();
        ctx.translate(knight.x, knight.y);
        ctx.scale(knight.facing, 1); // 左右
        ctx.drawImage(currentImg, knight.frame * 100, 0, 100, 100, -120, -120, 240, 240);
        ctx.restore();
    }

    requestAnimationFrame(loop);
}
loop();