// =========================================================
//  Pepe Chrome : 인터넷이 끊긴 브라우저 + 출근길 페페 달리기
//  - index.html 의 <div id="chrome-root"> 안에 화면을 자동으로 만들어요
//  - script.js 는 건드리지 않아도 돼요 (script.js 다음 줄에서 불러오기)
//  - 사이트 소리 버튼(음소거)을 그대로 따라가요
//
//  조작 : 스페이스 / ↑ / 화면 클릭 = 점프 (키보드는 이 창이 맨 앞일 때만)
//  장애물 : 땅 (바나나·웅덩이·꼬깔·쓰레기통) + 하늘 (까마귀 : 낮게 날면 점프, 높게 날면 점프하지 말고 밑으로)
//  규칙 : 장애물에 부딪히면 멘탈(하트) 1칸 감소 · 3칸 다 없어지면 끝
//         창을 내리거나 닫으면 일시정지
// =========================================================
(() => {
'use strict';

const root = document.getElementById('chrome-root');
if (!root) return;

const ADDRESS = 'pepe://offline';   // 주소창에 보이는 글

/* ▼ 픽셀 그림 : 글자 하나 = 픽셀 한 칸 (. = 빈칸) · 색은 COLORS */
const COLORS = {
    D: '#3d6e28',   // 진한 초록 (테두리)
    G: '#5b9a3c',   // 초록 (얼굴)
    W: '#ffffff',   // 눈 흰자
    B: '#111111',   // 눈동자
    M: '#b5652d',   // 입 (갈색)
    R: '#e0004a',   // 입술 빨강
    P: '#f2a0b4',   // 혀 분홍
    U: '#1546e8',   // 옷 파랑
    V: '#0a2aa8',   // 옷 진한 파랑
    T: '#6ec6ff',   // 눈물
    Y: '#ffd83d',   // 바나나 노랑
    O: '#b88a1a',   // 바나나 갈색
    A: '#4a8fd8',   // 웅덩이 파랑
    L: '#9fd0ff',   // 웅덩이 반짝
    C: '#ff7a1a',   // 꼬깔 주황
    E: '#ffffff',   // 꼬깔 흰 줄
    H: '#e00000',   // 하트
    K: '#4a4a4a',   // 쓰레기통 테두리 · 꼬깔 받침
    S: '#a7adb3',   // 쓰레기통 회색
    N: '#7d848a',   // 쓰레기통 줄무늬
    Q: '#535353',   // 크롬 회색 (다시하기 화살표)
    F: '#2b2b3a',   // 새 (까마귀 검정)
    I: '#ffb020',   // 새 부리
};

// 페페 얼굴 : 하트가 줄수록 다음 얼굴로 바뀌고 그대로 유지됨 (점점 일그러짐)
//   [0] 멀쩡 → [1] 시무룩 (눈꺼풀 내려오고 입 꾹) → [2] 울먹 (눈물 한 방울 · 입꼬리 내려감) → [3] 엉엉 (눈 질끈 · 눈물 줄줄 · 입 벌림)
const FACES = [
    [
        '....DDDD.DDDD...',
        '...DGGGGDGGGGD..',
        '..DGGWWWGWWWGD..',
        '..DGWWWBBWWBBD..',
        '..DGWWWBBWWBBD..',
        '.DGGGWWWGWWWGGD.',
        '.DGGGGGGGGGGGGD.',
        '.DGGMMMMMMMMMMD.',
        '..DGGMRPPPPRMD..',
        '...DGGMMMMMMD...',
    ],
    [
        '....DDDD.DDDD...',
        '...DGGGGDGGGGD..',
        '..DGGGGGGGGGGD..',
        '..DGWWWBBWWBBD..',
        '..DGWWWBBWWBBD..',
        '.DGGGWWWGWWWGGD.',
        '.DGGGGGGGGGGGGD.',
        '.DGGMMMMMMMMMMD.',
        '..DGGMMMMMMMMD..',
        '...DGGGGGGGGD...',
    ],
    [
        '....DDDD.DDDD...',
        '...DGGGGDGGGGD..',
        '..DGGGGGGGGGGD..',
        '..DGWWWWWWWWWD..',
        '..DGWWWBBWWBBD..',
        '.DGGGTWWGTWWGGD.',
        '.DGGGTGGGTGGGGD.',
        '.DGGGGMMMMMMGGD.',
        '..DGGMMGGGGMMD..',
        '...DGMGGGGGGD...',
    ],
    [
        '....DDDD.DDDD...',
        '...DGGGGDGGGGD..',
        '..DGGGGGGGGGGD..',
        '..DGDDDDGDDDDD..',
        '..DGGTGGGGTGGD..',
        '.DGGGTGGGGTGGGD.',
        '.DGGGTMMMMTMGGD.',
        '.DGGMTRRRRTMMGD.',
        '..DGGTRPPRTMD...',
        '...DGTMMMMTD....',
    ],
];
// 몸통 (옷) : 모든 얼굴에 공통
const BODY = [
    '....UUUUUUUUG...',
    '...UUUUUUUUUUG..',
    '..GUUUUUUUUUVG..',
    '...UUUUUUUUUV...',
    '...UUUUUUUUVV...',
    '...VUUUUUUUV....',
];
// 다리 : 달릴 때 두 장 번갈아 · 점프 중엔 JUMP
const LEGS_A    = ['...VV....VV.....', '...VV.....VV....'];
const LEGS_B    = ['....VV..VV......', '.....VV.VV......'];
const LEGS_JUMP = ['...VV...VV......', '..VV.....VV.....'];

// 장애물
const BANANA = [
    '......O.',
    '.....YY.',
    '....YYY.',
    'Y..YYY..',
    'YYYYY...',
    '.YYY....',
];
const PUDDLE = [
    '..AAAAAAAAAA..',
    '.AALLAAAAAAAA.',
    'AAAAAAAALLAAAA',
];
const CONE = [
    '....CC....',
    '....CC....',
    '...CEEC...',
    '...CCCC...',
    '..CCCCCC..',
    '..CEEEEC..',
    '.CCCCCCCC.',
    '.CCCCCCCC.',
    '.CEEEEEEC.',
    'CCCCCCCCCC',
    'KKKKKKKKKK',
    'KKKKKKKKKK',
];
const TRASH = [
    '...KKKK...',
    '.KKKKKKKK.',
    'KSSSSSSSSK',
    'KKKKKKKKKK',
    '.KSNSSNSK.',
    '.KSNSSNSK.',
    '.KSNSSNSK.',
    '.KSNSSNSK.',
    '.KSNSSNSK.',
    '.KSNSSNSK.',
    '.KSNSSNSK.',
    '.KSSSSSSK.',
    '..KKKKKK..',
];
// 하늘 장애물 : 개구리 천적 까마귀 (왼쪽 = 머리 · 날개 위/아래 두 장 번갈아 퍼덕퍼덕)
const BIRD_UP = [
    '.......FF.......',
    '.......FFF......',
    '........FFF.....',
    '..FF....FFFF....',
    'IFWBFFFFFFFFFF..',
    '.IIFFFFFFFFFFFFF',
    '...FFFFFFFFF.FF.',
    '......FF........',
    '................',
    '................',
];
const BIRD_DOWN = [
    '................',
    '................',
    '................',
    '..FF............',
    'IFWBFFFFFFFFFF..',
    '.IIFFFFFFFFFFFFF',
    '...FFFFFFFFF.FF.',
    '.......FFFF.....',
    '........FFF.....',
    '.........FF.....',
];
const HEART = [
    '.HH.HH.',
    'HHHHHHH',
    'HHHHHHH',
    '.HHHHH.',
    '..HHH..',
    '...H...',
];
// 게임 오버 때 뜨는 다시하기 화살표
const RESTART = [
    '...QQQQQ..Q.',
    '.QQQ...QQQQ.',
    '.QQ.....QQQ.',
    'QQ.....QQQQ.',
    'QQ..........',
    'QQ.........Q',
    'QQ........QQ',
    '.QQ......QQ.',
    '.QQQ...QQQ..',
    '...QQQQQ....',
];

/* ▼ 게임 설정 */
const PX = 4;               // 픽셀 한 칸 = 화면 4px (캔버스 기준)
const LIVES = 3;            // 멘탈 하트 개수
const GRAVITY = 2200;       // 떨어지는 힘
const JUMP = 640;           // 점프 힘
const SPEED_START = 380;    // 처음 달리는 속도 (px/초)
const SPEED_MAX = 1050;     // 최대 속도
const SPEED_UP = 14;        // 1초마다 빨라지는 양 (약 48초면 최대 속도)
// ▼ 난이도 : 속도가 오를수록 처음 값 → 최대 속도일 때 값으로 점점 바뀜
const GAP_MIN = [0.75, 0.6], GAP_MAX = [1.4, 0.85];   // 장애물 사이 간격 (초)
const DOUBLE = [0.2, 0.5];  // 장애물 두 개가 붙어서 나올 확률 (0 ~ 1)
const TRIPLE = [0, 0.25];   // 세 개가 붙어서 나올 확률 (속도가 절반 넘게 올라야 나옴 : 느릴 땐 못 넘어서)
const BIRD = [0.12, 0.3];   // 땅 장애물 대신 새가 날아올 확률
const BIRD_HIGH = 0.5;      // 그중 높이 나는 새 비율 : 높은 새 = 점프하면 부딪힘 (그냥 달려서 밑으로 지나가기)
                            //                         낮은 새 = 땅 장애물처럼 점프로 넘기
const HURT_SEC = 1;         // 부딪힌 뒤 무적 시간 (깜빡깜빡)
const INTRO_SEC = 0.5;      // 처음 시작할 때 땅이 화면 끝까지 쭉 펼쳐지는 시간
const GRAY = '#535353';     // 크롬 공룡 화면 회색 (땅 · 점수 · 글자)

/* =========================================================
   화면 만들기
   ========================================================= */
root.innerHTML = `
    <div class="chrome-bar">
        <span>주소</span>
        <div class="chrome-addr"><img src="images/icon-chrome.png" alt="">${ADDRESS}</div>
    </div>
    <div class="chrome-frame">
        <div class="chrome-page">
            <canvas class="chrome-canvas" width="600" height="200"></canvas>
            <div class="chrome-offline">
                <h1>인터넷에 연결되어 있지 않음</h1>
                <p>다음 방법을 시도해 보세요.</p>
                <ul>
                    <li>네트워크 케이블, 모뎀, 라우터 확인</li>
                    <li>Wi-Fi에 다시 연결</li>
                </ul>
                <div class="chrome-code">ERR_INTERNET_DISCONNECTED</div>
            </div>
        </div>
    </div>`;

const win = root.closest('.window');
const canvas = root.querySelector('.chrome-canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const GROUND = H - 14;                 // 땅 높이 (페페 발 위치)
const isMuted = () => typeof muted !== 'undefined' && muted;   // script.js 의 소리 끄기

/* =========================================================
   그림 미리 만들기 (픽셀 지도 → 작은 캔버스)
   ========================================================= */
function sprite(rows) {
    const c = document.createElement('canvas');
    c.width = rows[0].length * PX;
    c.height = rows.length * PX;
    const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (!COLORS[ch]) return;
        g.fillStyle = COLORS[ch];
        g.fillRect(x * PX, y * PX, PX, PX);
    }));
    return c;
}
// 얼굴마다 달리기 두 장 + 점프 자세
const PEPE = FACES.map(face => ({
    runA: sprite([...face, ...BODY, ...LEGS_A]),
    runB: sprite([...face, ...BODY, ...LEGS_B]),
    jump: sprite([...face, ...BODY, ...LEGS_JUMP]),
}));
const IMG = {
    heart: sprite(HEART),
    restart: sprite(RESTART),
};
// 장애물 : 같은 그림을 여러 번 넣으면 그만큼 자주 나옴 (키 큰 꼬깔·쓰레기통이 더 자주)
const OBSTACLES = [BANANA, PUDDLE, CONE, CONE, TRASH, TRASH].map(sprite);
const BIRD_FRAMES = [sprite(BIRD_UP), sprite(BIRD_DOWN)];
const BIRD_BODY = [3 * PX, 7 * PX];   // 새 몸통 줄 (부딪힘 판정 위·아래 · 날개는 판정 안 함)

/* =========================================================
   게임
   ========================================================= */
let state = 'ready';   // ready → play (⇄ pause) → over
let pepe, obstacles, speed, dist, lives, hurt, nextGap, groundX, best = 0, last = 0;
let intro = 0;         // 땅 펼쳐짐 (0 = 페페 발밑만 · 1 = 화면 끝까지) : 맨 처음 한 번만
let visible = false, loopId = null;

function reset() {
    pepe = { x: 60, y: GROUND, vy: 0 };
    obstacles = [];
    speed = SPEED_START;
    dist = 0;
    lives = LIVES;
    hurt = 0;
    nextGap = 250;
    groundX = 0;
}

function jump() {
    if (state === 'pause') { state = 'play'; return; }
    if (state === 'ready') { reset(); state = 'play'; pepe.vy = -JUMP; beep(520, .08); return; }   // 크롬처럼 폴짝 뛰면서 시작
    if (state === 'over') { reset(); state = 'play'; return; }
    if (pepe.y >= GROUND) { pepe.vy = -JUMP; beep(520, .08); }
}

function update(dt) {
    if (state !== 'play') return;

    intro = Math.min(1, intro + dt / INTRO_SEC);
    speed = Math.min(SPEED_MAX, speed + SPEED_UP * dt);
    dist += speed * dt / 40;           // 화면 40px = 1m
    groundX = (groundX + speed * dt) % 24;
    if (hurt > 0) hurt -= dt;

    // 점프
    pepe.vy += GRAVITY * dt;
    pepe.y = Math.min(GROUND, pepe.y + pepe.vy * dt);
    if (pepe.y >= GROUND) pepe.vy = 0;

    // 장애물 : 일정 시간마다 새 한 마리 또는 땅 장애물 1~3개 (붙어 나오면 한 번에 넘어야 함)
    //          빨라질수록 간격은 좁아지고 여러 개 붙어 나올 확률은 올라감
    nextGap -= speed * dt;
    if (nextGap <= 0) {
        const lv = (speed - SPEED_START) / (SPEED_MAX - SPEED_START);   // 난이도 0 ~ 1
        const at = ([a, b]) => a + (b - a) * lv;
        const pick = () => OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
        let x = W;
        const r = Math.random();
        if (Math.random() < at(BIRD)) {
            // 새는 혼자 날아옴 · 높은 새는 서 있는 페페 머리 바로 위, 낮은 새는 점프로 넘을 높이
            const [b1, b2] = BIRD_BODY;
            const bottom = Math.random() < BIRD_HIGH ? GROUND - 76 : GROUND - 24;   // 몸통 아랫면
            const img = BIRD_FRAMES[0];
            obstacles.push({ img, frames: BIRD_FRAMES, x, y: bottom - b2, box: [4, b1, img.width - 4, b2], hit: false });
            x += img.width;
        } else {
            const tri = lv > 0.5 ? at(TRIPLE) : 0;   // 느릴 땐 세 개짜리 없음 (한 번에 못 넘음)
            const count = r < tri ? 3 : r < tri + at(DOUBLE) ? 2 : 1;
            for (let i = 0; i < count; i++) {
                const img = pick();
                obstacles.push({ img, x, y: GROUND - img.height, box: [4, 4, img.width - 4, img.height], hit: false });
                x += img.width + 4;
            }
        }
        const gMin = at(GAP_MIN), gMax = at(GAP_MAX);
        nextGap = (x - W) + speed * (gMin + Math.random() * (gMax - gMin));
        nextGap += speed * 0.25;   // 다음 게 높은 새일 수도 있어서 : 점프하고 착지할 여유 조금 더
    }
    obstacles.forEach(o => o.x -= speed * dt);
    obstacles = obstacles.filter(o => o.x + o.img.width > 0);

    // 부딪힘 (그림보다 조금 작은 상자로 판정해서 억울하지 않게)
    const pw = PEPE[0].runA.width, ph = PEPE[0].runA.height;
    const px1 = pepe.x + 12, px2 = pepe.x + pw - 16, py1 = pepe.y - ph + 8, py2 = pepe.y;
    obstacles.forEach(o => {
        if (o.hit || hurt > 0) return;
        const ox1 = o.x + o.box[0], oy1 = o.y + o.box[1], ox2 = o.x + o.box[2], oy2 = o.y + o.box[3];
        if (px2 > ox1 && px1 < ox2 && py2 > oy1 && py1 < oy2) {
            o.hit = true;
            lives--;
            hurt = HURT_SEC;
            beep(160, .25, 'square');
            if (lives <= 0) {
                state = 'over';
                best = Math.max(best, Math.floor(dist));
            }
        }
    });
}

/* =========================================================
   그리기
   ========================================================= */
function text(str, x, y, size, color = GRAY, align = 'center') {
    ctx.font = `${size}px "Pixelify Sans", "DotGothic16", monospace`;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
}
const pad = n => String(Math.floor(n)).padStart(5, '0');   // 크롬 점수처럼 00042

function draw(t) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    // 땅 : 처음엔 페페 발밑만 → 시작하면 화면 끝까지 펼쳐짐 · 선 + 흘러가는 자갈
    const groundW = PEPE[0].runA.width + pepe.x + 10;
    const gw = groundW + (W - groundW) * intro;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, gw, H);
    ctx.clip();
    ctx.fillStyle = GRAY;
    ctx.fillRect(0, GROUND, W, 2);
    for (let x = -groundX; x < W; x += 24) ctx.fillRect(x, GROUND + 5 + (x * 7 % 3) * 2, 6, 2);
    ctx.restore();

    // 장애물 (새는 날개 두 장 번갈아 퍼덕퍼덕)
    obstacles.forEach(o => {
        const img = o.frames ? o.frames[Math.floor(t / 150) % 2] : o.img;
        ctx.drawImage(img, Math.round(o.x), Math.round(o.y));
    });

    // 페페 : 잃은 하트만큼 얼굴이 일그러진 채로 유지 (끝나면 가장 많이 우는 얼굴)
    //        땅에서는 다리 두 장 번갈아, 공중에선 점프 자세
    const face = PEPE[Math.round((LIVES - lives) / LIVES * (PEPE.length - 1))];
    let img = pepe.y < GROUND ? face.jump : (Math.floor(t / 110) % 2 ? face.runA : face.runB);
    if (state === 'over') img = face.jump;
    if (state === 'ready' || state === 'pause') img = face.runA;
    const blink = hurt > 0 && state === 'play' && Math.floor(t / 80) % 2;
    if (!blink) ctx.drawImage(img, pepe.x, Math.round(pepe.y - img.height));

    // 시작 전엔 크롬처럼 페페만 (점수·하트 없음)
    if (state === 'ready') return;

    // 점수 (오른쪽 위, 크롬처럼 HI 최고점 + 지금 점수) · 그 밑에 멘탈 하트
    text(`${best ? `HI ${pad(best)}  ` : ''}${pad(dist)}`, W - 12, 24, 18, GRAY, 'right');
    for (let i = 0; i < LIVES; i++) {
        ctx.globalAlpha = i < lives ? 1 : 0.18;
        ctx.drawImage(IMG.heart, W - 12 - (LIVES - i) * 34 + 6, 34);
    }
    ctx.globalAlpha = 1;

    if (state === 'pause') {
        text('P A U S E', W / 2, H * 0.4, 22);
    }
    if (state === 'over') {
        text('G A M E   O V E R', W / 2, H * 0.32, 22);
        ctx.drawImage(IMG.restart, Math.round(W / 2 - IMG.restart.width / 2), Math.round(H * 0.32 + 16));
    }
}

// 창이 보일 때만 돌아감 (닫거나 내리면 멈춰서 컴퓨터가 쉼)
function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    update(dt);
    draw(t);
    loopId = visible ? requestAnimationFrame(frame) : null;
}

function startLoop() {
    if (loopId) return;
    loopId = requestAnimationFrame(t => { last = t; frame(t); });
}

/* =========================================================
   소리 (파일 없이 짧은 삑 소리)
   ========================================================= */
let ac = null;
function beep(freq, dur, type = 'triangle') {
    if (isMuted()) return;
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * (type === 'square' ? 0.5 : 1.6), ac.currentTime + dur);
    g.gain.setValueAtTime(0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
}

/* =========================================================
   조작
   ========================================================= */
// 키보드 : 이 창이 맨 앞(active)일 때만 (다른 앱 스페이스바와 안 겹치게)
document.addEventListener('keydown', e => {
    if (!visible || !win || !win.classList.contains('active')) return;
    if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); if (!e.repeat) jump(); }
});
canvas.addEventListener('pointerdown', e => { if (e.button === 0) jump(); });

// 창이 열리면 돌리고, 닫거나 내리면 일시정지
new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible) startLoop();
    else if (state === 'play') state = 'pause';
}).observe(root);

reset();
document.fonts.ready.then(() => { if (visible) startLoop(); else draw(0); });
})();
