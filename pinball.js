// =========================================================
//  Pepe Pinball : 옛날 윈도우 3D 핀볼처럼, 가운데 페페를 괴롭혀서 점수 벌기
//  - index.html 의 <div id="pinball-root"> 안에 게임을 자동으로 만들어요
//  - script.js 는 건드리지 않아도 돼요 (script.js 다음 줄에서 불러오기)
//  - 사이트 소리 버튼(음소거)을 그대로 따라가요
//
//  조작 : Z / ←          왼쪽 플리퍼
//         / (슬래시) / → 오른쪽 플리퍼
//         스페이스 꾹 → 떼기   공 발사 (오래 누를수록 세게)
//         마우스·터치     테이블 왼쪽 절반 = 왼쪽, 오른쪽 절반 = 오른쪽 플리퍼, 발사 레인 누르기 = 발사
//
//  테이블 장치
//  - 가운데 큰 페페 : 맞히면 울고 멘탈이 깎임. 멘탈 0 = 멘탈 붕괴 (페페 점수 3배)
//  - 왼쪽 궤도 + 스피너 : 왼쪽 벽 통로로 끝까지 올라가면 가운데 페페가 한 바퀴 빙글
//  - 왼쪽 손 흔드는 꼬마 페페 범퍼 2개 (맞으면 잠깐 멈추고 울음) · 놀리기 과녁 3개
//  - 위쪽 P E P E 통로 (다 켜면 배율 +1) · 꼬마 페페 범퍼 4개
//  - 오른쪽 리턴 레인 · 꼬마 페페 과녁 3개 (다 울리면 보너스) · 새총 구멍 (공을 잡았다가 페페를 저격)
//  - 미션을 깰 때마다 괴롭힘 등급이 올라가요 (오른쪽 점수판)
// =========================================================
(() => {
'use strict';

const root = document.getElementById('pinball-root');
if (!root) return;
const win = root.closest('.window');          // 사이트 창 (없으면 항상 켜진 상태로 동작)

/* ▼ 그림 경로 : 파일만 바꾸면 돼요 (꼬마 페페도 같은 그림을 작게 써요) */
const IMG = Object.assign({
    idle : 'images/pinball-pepe-idle.png',    // 평소
    hurt : 'images/pinball-pepe-hurt.png',    // 공이 가까이 올 때 · 빙글빙글 · 저격당하기 직전 (식은땀)
    cry  : 'images/pinball-pepe-cry.png',     // 맞았을 때 · 멘탈 붕괴 (울음)
    happy: 'images/pinball-pepe-happy.png',   // 공이 빠졌을 때 · 게임이 끝났을 때 (안도의 미소)
    miniIdle: 'images/pinball-pepe-mini-idle.png',   // 오른쪽 꼬마 페페 과녁 : 평소 (웃는 얼굴)
    miniHit : 'images/pinball-pepe-mini-hit.png',    // 오른쪽 꼬마 페페 과녁 : 맞았을 때 (울상)
    wave : 'images/pinball-pepe-wave.png',    // 왼쪽 범퍼 2개 : 손 흔드는 꼬마 페페 (움짤 6장을 가로로 이어 붙임)
}, window.PINBALL_IMG || {});
// 그림이 없는 표정은 평소 그림으로 대신해요 (맞았을 땐 빨갛게, 울 땐 파랗게 물들임)

/* ▼ 점수 */
const PTS = {
    pepe: 1000,        // 가운데 페페 맞힘
    breakdownMul: 3,   // 멘탈 붕괴 중엔 페페 점수 몇 배
    bumper: 100,       // 꼬마 페페 범퍼
    sling: 10,         // 플리퍼 위 삼각형
    lane: 500,         // 위쪽 P E P E 통로
    word: 20000,       // P E P E 다 켜짐 (배율도 +1)
    target: 750,       // 놀리기 과녁 하나
    bank: 10000,       // 놀리기 과녁 3개 다 쓰러뜨림
    mini: 1500,        // 꼬마 페페 과녁 하나
    minis: 15000,      // 꼬마 페페 과녁 3개 다 울림
    spin: 100,         // 스피너 한 바퀴
    orbit: 5000,       // 왼쪽 궤도 한 바퀴
    rlane: 1000,       // 오른쪽 리턴 레인
    saucer: 2500,      // 새총 구멍
    mission: 25000,    // 미션 완료 (등급이 오를수록 커짐)
};
const BALLS = 3;                 // 공 개수
const MENTAL_PER_HIT = 9;        // 한 번 맞을 때 줄어드는 멘탈 (세게 맞으면 더)
const MENTAL_RECOVER = 3;        // 안 맞으면 1초에 회복되는 멘탈
const BREAKDOWN_SEC = 12;        // 멘탈 붕괴 지속 시간

/* ▼ 미션 (순서대로 하나씩) · 괴롭힘 등급 */
const MISSIONS = [
    { id: 'mini',   text: '꼬마 페페 3명 다 울리기',      need: 1 },
    { id: 'orbit',  text: '왼쪽 궤도로 페페 2바퀴 돌리기', need: 2 },
    { id: 'saucer', text: '새총 구멍으로 페페 저격 2번',   need: 2 },
    { id: 'bank',   text: '놀리기 과녁 다 쓰러뜨리기',     need: 1 },
    { id: 'break',  text: '페페 멘탈 붕괴시키기',          need: 1 },
];
const RANKS = ['장난꾸러기', '골목대장', '얄미운 녀석', '악당', '대마왕', '전설의 악당'];

/* =========================================================
   화면 만들기
   ========================================================= */
root.innerHTML = `
    <div class="pb-table">
        <canvas class="pb-canvas" aria-label="페페 핀볼 테이블"></canvas>
        <div class="pb-pause" hidden>일시정지<small>창을 누르면 계속해요</small></div>
    </div>
    <div class="pb-side">
        <div class="pb-logo"><b>PEPE</b><span>PINBALL</span></div>
        <div class="pb-lcd">
            <div class="pb-line"><span>BALL <b data-k="ball">-</b></span><span>배율 <b data-k="mult">x1</b></span></div>
            <div class="pb-score" data-k="score">0</div>
            <div class="pb-msg" data-k="msg"></div>
        </div>
        <div class="pb-box">
            <div class="pb-label"><span>페페 멘탈</span><b data-k="mentalTxt">100%</b></div>
            <div class="pb-bar"><i data-k="mentalBar"></i></div>
        </div>
        <div class="pb-box pb-mission">
            <div class="pb-label"><span>미션</span><b data-k="rank">-</b></div>
            <div class="pb-mtext" data-k="mission">-</div>
            <div class="pb-mprog" data-k="mprog"></div>
        </div>
        <div class="pb-box pb-stats">
            <div><span>괴롭힌 횟수</span><b data-k="hits">0</b></div>
            <div><span>멘탈 붕괴</span><b data-k="breaks">0</b></div>
            <div><span>최고 점수</span><b data-k="best">0</b></div>
        </div>
        <div class="pb-btns">
            <button class="btn" data-act="new" type="button">새 게임</button>
            <button class="btn" data-act="launch" type="button">발사 (꾹)</button>
        </div>
        <div class="pb-help">Z ← 왼쪽 · / → 오른쪽<br>스페이스 꾹 → 떼기 : 발사</div>
    </div>`;

const canvas = root.querySelector('.pb-canvas');
const ctx = canvas.getContext('2d');
const pauseEl = root.querySelector('.pb-pause');
const ui = {};
root.querySelectorAll('[data-k]').forEach(el => ui[el.dataset.k] = el);

/* =========================================================
   테이블 (논리 좌표 600 x 780 : 가로로 넓은 판)
   ========================================================= */
const W = 600, H = 780, BR = 8;          // BR = 공 반지름
const GRAV = 1150, MAXV = 1900;
const CX = 285;                          // 플레이 영역 가운데 (발사 레인 제외)
const LANE_X = 550, OUT_X = 580;         // 발사 레인 안쪽 벽 · 바깥 벽
const segs = [], circles = [];

function seg(ax, ay, bx, by, o = {}) {
    const s = Object.assign({ ax, ay, bx, by, e: 0.45, kick: 0, kind: 'wall', on: true, draw: true, layer: 0 }, o);
    s.dx = bx - ax; s.dy = by - ay; s.len2 = s.dx * s.dx + s.dy * s.dy;
    segs.push(s); return s;
}
function chain(pts, o) { for (let i = 0; i < pts.length - 1; i++) seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], o); }

// 위쪽 둥근 지붕 (타원)
const ARC = [];
for (let i = 0; i <= 36; i++) { const a = Math.PI + Math.PI * i / 36; ARC.push([300 + Math.cos(a) * 280, 230 + Math.sin(a) * 210]); }
chain(ARC, { e: 0.3 });
seg(20, 230, 20, 600);                          // 왼쪽 벽
seg(20, 600, 211, 690, { kind: 'guide' });      // 왼쪽 아래 경사 (플리퍼 축 바로 위에서 끝나야 공이 플리퍼로 굴러감)
seg(OUT_X, 230, OUT_X, 780);                    // 오른쪽 바깥 벽
seg(LANE_X, 280, LANE_X, 780);                  // 발사 레인 안쪽 벽
seg(LANE_X, 600, 359, 690, { kind: 'guide' });  // 오른쪽 아래 경사
// 발사 레인 출구 문 : 위로는 통과, 위에서 내려오는 공은 막음
const gate = seg(OUT_X, 250, LANE_X, 280, { kind: 'gate', e: 0.2 });
{ const nx = -gate.dy, ny = gate.dx, l = Math.hypot(nx, ny); gate.oneWay = ny < 0 ? { x: nx / l, y: ny / l } : { x: -nx / l, y: -ny / l }; }
seg(LANE_X, 752, OUT_X, 752, { e: 0.15, draw: false, kind: 'plunger' });   // 발사대 윗면
const BALL_HOME = [565, 742];

// 왼쪽 궤도 : 바깥벽과 안쪽 레일 사이 통로로 공이 위까지 돌아감
const ORBIT_X = 60, ORBIT_Y0 = 440;
const ORBIT = [];
for (let i = 0; i <= 12; i++) { const a = Math.PI + 0.927 * i / 12; ORBIT.push([300 + Math.cos(a) * 240, 230 + Math.sin(a) * 170]); }
seg(ORBIT_X, ORBIT_Y0, ORBIT_X, 230, { kind: 'rail', e: 0.3 });
chain(ORBIT, { kind: 'rail', e: 0.3 });
const SPIN = { y: 420, x0: 20, x1: ORBIT_X, ang: 0, v: 0, acc: 0 };      // 궤도 입구 스피너

// 위쪽 P E P E 통로 기둥
const POSTS = [230, 270, 310, 350, 390];
POSTS.forEach(x => seg(x, 70, x, 104, { kind: 'post', e: 0.4 }));
const lanes = [0, 0, 0, 0];

// 오른쪽 리턴 레인 칸막이 (꼬마 페페 과녁 뒤 통로로 이어짐)
seg(520, 236, 520, 288, { kind: 'rail', e: 0.35 });
const RLANE = { y: 262, x0: 524, x1: LANE_X, lit: 0 };

// 슬링샷 (플리퍼 위 삼각형) : 안쪽 면이 공을 튕겨냄
const slings = [
    { a: [80, 520], b: [80, 588], c: [156, 624], flash: 0 },     // 아랫변은 경사와 나란히 → 그 사이로 공이 굴러감
    { a: [490, 520], b: [490, 588], c: [414, 624], flash: 0 },
];
slings.forEach(s => {
    const dx = s.c[0] - s.a[0], dy = s.c[1] - s.a[1], l = Math.hypot(dx, dy);
    s.n = [dy / l, -dx / l];
    if ((CX - s.a[0]) * s.n[0] + (450 - s.a[1]) * s.n[1] < 0) s.n = [-s.n[0], -s.n[1]];
    seg(s.a[0], s.a[1], s.c[0], s.c[1], { kind: 'sling', e: 0.4, kick: 280, draw: false, sling: s });
    seg(s.a[0], s.a[1], s.b[0], s.b[1], { kind: 'slingside', draw: false });
    seg(s.b[0], s.b[1], s.c[0], s.c[1], { kind: 'slingside', draw: false });
});

// 놀리기 과녁 3개 (궤도 레일 바깥쪽 면)
const bank = { x: 66, col: '#ff5fa2', t: [] };
[330, 362, 394].forEach(y => bank.t.push(seg(bank.x, y, bank.x, y + 26, { kind: 'target', e: 0.35, draw: false })));

// 꼬마 페페 범퍼 : 위쪽 4개 + 왼쪽 2개
const bumpers = [
    { x: 265, y: 180, r: 19, ring: '#e8304f' }, { x: 355, y: 180, r: 19, ring: '#e8304f' }, { x: 310, y: 140, r: 19, ring: '#e8304f' },
    { x: 462, y: 190, r: 18, ring: '#e8304f' },
    { x: 96, y: 248, r: 16, ring: '#21b6e0', wave: true }, { x: 96, y: 300, r: 16, ring: '#21b6e0', wave: true },   // 손 흔드는 페페
].map(p => { const c = Object.assign(p, { e: 0.6, kick: 260, kind: 'bumper', flash: 0, cool: 0, cry: 0 }); circles.push(c); return c; });
// 꼬마 페페 과녁 3개 (오른쪽, 뒤로는 리턴 레인 통로)
const minis = [300, 338, 376].map(y => {
    const c = { x: 516, y, r: 13, e: 0.5, kick: 60, kind: 'mini', lit: false, cry: 0, wob: 0 }; circles.push(c); return c;
});
// 새총 구멍 : 공을 잡았다가 가운데 페페 쪽으로 쏨
const SAUCER = { x: 470, y: 470, r: 11, cool: 0, ejectAt: 0 };

// 가운데 페페
const PEPE = { x: 310, y: 335, r: 66, e: 0.75, kick: 150, kind: 'pepe', size: 190, cool: 0 };
circles.push(PEPE);


// 플리퍼
const flippers = [
    { px: 213, py: 708, len: 64, r1: 11, r2: 5.5, rest: 0.55, act: -0.5, ang: 0.55, om: 0, up: false },
    { px: 357, py: 708, len: 64, r1: 11, r2: 5.5, rest: Math.PI - 0.55, act: Math.PI + 0.5, ang: Math.PI - 0.55, om: 0, up: false },
];

/* =========================================================
   게임 상태
   ========================================================= */
let state = 'attract';     // attract(첫 화면) · play · over
let ball = null, score = 0, ballNo = 0, ballsLeft = 0, mult = 1, hits = 0, breaks = 0;
let mental = 100, breakdown = 0, gt = 0;   // gt = 게임 시계(초, 일시정지 중엔 멈춤)
let saveUntil = 0, pulling = false, power = 0, stuckT = 0, serveAt = 0, lastLane = -1, shakeT = 0, shakeAmp = 0;
let orbitArm = 0, orbits = 0, mIdx = 0, mProg = 0, rank = -1;
let best = 0; try { best = +localStorage.getItem('pepePinballBest') || 0; } catch (e) {}
let msgText = '', msgUntil = 0;

const fx = { sq: 0, sqv: 0, rot: 0, rotv: 0, flash: 0, spin: 0 };   // 페페 찌그러짐·흔들림·번쩍·빙글
const tears = [], pops = [];
const face = { cry: 0, hurt: 0, happy: 0 };   // 표정 타이머 (초) : 울음 · 식은땀 · 안도
let slingStreak = 0;                           // 슬링샷끼리 연달아 튕긴 횟수

const newBall = () => ({ x: BALL_HOME[0], y: BALL_HOME[1], vx: 0, vy: 0, held: false, layer: 0 });
function msg(t, sec = 3) { msgText = t; msgUntil = gt + sec; }
function addScore(n, x, y) {
    score += n;
    if (x != null) pops.push({ x, y, text: '+' + n.toLocaleString('en-US'), t: 0 });
}

function newGame() {
    score = 0; ballsLeft = BALLS; ballNo = 0; mult = 1; hits = 0; breaks = 0;
    mental = 100; breakdown = 0; lanes.fill(0); orbits = 0; mIdx = 0; mProg = 0; rank = 0; RLANE.lit = 0;
    bank.t.forEach(t => t.on = true); minis.forEach(m => { m.lit = false; m.cry = 0; });
    state = 'play'; tears.length = 0; pops.length = 0;
    serve(); face.cry = face.hurt = face.happy = 0;
    sfx.jingle();
}
function serve() {
    ballNo++; ball = newBall();
    saveUntil = 0; stuckT = 0; serveAt = 0; slingStreak = 0; orbitArm = 0;
    msg('스페이스를 꾹 눌렀다 떼면 발사!', 99);
}
function launch() {
    if (!ball || !inLane() || Math.abs(ball.vy) > 80 || ball.y < 700) return;
    ball.vy = -(1000 + 850 * power); ball.vx = 0;
    saveUntil = gt + 6;            // 발사 후 6초 안에 빠지면 공을 돌려줌
    sfx.launch(); msg('페페를 노려요!', 2);
}
const inLane = () => ball && ball.layer === 0 && ball.x > LANE_X;

function drain() {
    if (gt < saveUntil) {                       // 공 살려 주기
        ball = newBall(); saveUntil = 0;
        msg('공을 돌려줬어요', 2.5); face.hurt = 0.8; sfx.save(); return;
    }
    ball = null; ballsLeft--; sfx.drain();
    face.happy = 2.5;                  // 공이 빠지면 페페는 안도
    if (ballsLeft <= 0) return gameOver();
    msg(`공을 잃었어요… 남은 공 ${ballsLeft}`, 2); serveAt = gt + 1.2;
}
function gameOver() {
    state = 'over'; ball = null; breakdown = 0; tears.length = 0;
    if (score > best) { best = score; try { localStorage.setItem('pepePinballBest', best); } catch (e) {} }
    msg(`GAME OVER · 페페를 ${hits}번 괴롭혔어요`, 99);
}

/* ---------- 미션 ---------- */
function mission(id) {
    if (state !== 'play') return;
    const m = MISSIONS[mIdx % MISSIONS.length];
    if (m.id !== id) return;
    mProg++;
    if (mProg >= m.need) {
        addScore(PTS.mission * (rank + 1), PEPE.x, PEPE.y - 110);
        rank = Math.min(RANKS.length - 1, rank + 1);
        mIdx++; mProg = 0;
        msg(`미션 완료! 괴롭힘 등급 : ${RANKS[rank]}`, 3.5);
        face.cry = 1.4; fx.sqv += 8; sfx.mission();
    }
}

/* ---------- 득점 이벤트 ---------- */
function hurtPepe(amount) {
    if (breakdown > 0) return;
    mental = Math.max(0, mental - amount);
    if (mental <= 0) startBreakdown();
}
function onPepe(impact, x, y) {
    if (PEPE.cool > gt) return;
    PEPE.cool = gt + 0.12;
    hits++;
    const pts = PTS.pepe * mult * (breakdown > 0 ? PTS.breakdownMul : 1);
    addScore(pts, x, y - 14);
    fx.sqv += 10 + Math.min(14, impact / 70);
    fx.rotv += (Math.random() < 0.5 ? -1 : 1) * (4 + impact / 160);
    fx.flash = 1;
    for (let i = 0; i < 4 + Math.min(8, impact / 150); i++) addTear(PEPE.x, PEPE.y, 76);
    if (impact > 900) { shakeT = 0.18; shakeAmp = 5; }
    hurtPepe(MENTAL_PER_HIT + impact / 140);
    face.cry = 0.9; face.happy = 0;   // 맞으면 울음
    sfx.ouch(impact);
}
function startBreakdown() {
    breakdown = BREAKDOWN_SEC; breaks++; mental = 0;
    msg(`멘탈 붕괴! ${BREAKDOWN_SEC}초 동안 페페 점수 ${PTS.breakdownMul}배`, 4);
    for (let i = 0; i < 18; i++) addTear(PEPE.x, PEPE.y, 76);
    sfx.breakdown();
    mission('break');
}
// 손 흔드는 페페 움짤 : 장수 · 한 장당 시간(초, 클수록 느림 / 원본 움짤은 0.1)
const WAVE_FRAMES = 6, WAVE_SEC = 0.2, WAVE_STOP = 1.8;
function onBumper(c) {
    c.flash = 1; c.cry = 0.5;
    if (c.wave) {                                     // 맞은 순간 모습 그대로 잠깐 멈추고 울음
        if (!(c.stopUntil > gt)) c.frozen = Math.floor(gt / WAVE_SEC) % WAVE_FRAMES;
        c.stopUntil = gt + WAVE_STOP; c.cry = WAVE_STOP;
        if (c.cool < gt) for (let i = 0; i < 2; i++) addTear(c.x, c.y, 16);
    }
    if (c.cool < gt) { c.cool = gt + 0.06; addScore(PTS.bumper * mult, c.x, c.y - 28); sfx.bumper(); }
}
function onMini(c) {
    c.cry = 1.2; c.wob = 1;
    hits++;
    for (let i = 0; i < 3; i++) addTear(c.x, c.y, 14);
    if (c.lit) { addScore(PTS.bumper * mult, c.x - 22, c.y); sfx.squeak(); return; }
    c.lit = true; addScore(PTS.mini * mult, c.x - 26, c.y); sfx.squeak();
    if (minis.every(m => m.lit)) {
        addScore(PTS.minis * mult, 480, 270);
        msg('꼬마 페페 3명 다 울렸어요!', 3); sfx.jingle();
        face.cry = 1; hurtPepe(12);
        mission('mini');
        setTimeout(() => minis.forEach(m => m.lit = false), 1500);
    }
}
function onLane(i) {
    if (lanes[i]) return;
    lanes[i] = 1; addScore(PTS.lane * mult, POSTS[i] + 20, 86); sfx.lane();
    if (lanes.every(Boolean)) {
        addScore(PTS.word * mult, PEPE.x, 120);
        mult = Math.min(5, mult + 1);
        msg(`P E P E 완성! 배율 x${mult}`, 3); face.cry = 0.9; sfx.jingle();
        setTimeout(() => lanes.fill(0), 700);
    }
}
function onTarget(t) {
    t.on = false; addScore(PTS.target * mult, t.ax + 22, t.ay); sfx.target();
    if (bank.t.every(x => !x.on)) {
        addScore(PTS.bank * mult, 110, 380);
        msg('페페 놀리기 완료!', 3); face.cry = 0.9; sfx.jingle();
        fx.sqv += 6; fx.flash = 0.6;
        hurtPepe(15);
        mission('bank');
        setTimeout(() => bank.t.forEach(x => x.on = true), 1200);
    }
}
function onOrbit() {
    orbits++; orbitArm = 0;
    addScore(PTS.orbit * mult, 190, 120);
    fx.spin = Math.PI * 2;                 // 가운데 페페가 한 바퀴 빙글
    face.hurt = 1.1;
    msg('빙글빙글! 페페가 어지러워해요', 2.5); sfx.orbit();
    hurtPepe(10);
    mission('orbit');
}
function onRightLane() {
    RLANE.lit = 1.5;
    addScore(PTS.rlane * mult, 535, 240); sfx.lane();
}
function captureSaucer() {
    ball.held = true; ball.vx = ball.vy = 0; ball.x = SAUCER.x; ball.y = SAUCER.y;
    SAUCER.ejectAt = gt + 1.1;
    addScore(PTS.saucer * mult, SAUCER.x, SAUCER.y - 22);
    msg('새총 장전… 페페 조준!', 1.6); sfx.thunk();
    face.hurt = 1.2;
}
function ejectSaucer() {
    // 가운데 페페 쪽으로 발사 (살짝 위를 노려서 중력만큼 보정)
    const tx = PEPE.x + (Math.random() - 0.5) * 30, ty = PEPE.y - 34;
    const dx = tx - SAUCER.x, dy = ty - SAUCER.y, l = Math.hypot(dx, dy);
    ball.held = false; ball.vx = dx / l * 1000; ball.vy = dy / l * 1000;
    SAUCER.cool = gt + 0.7; sfx.pew();
    mission('saucer');
}
function addTear(x, y, spread) {
    tears.push({ x: x + (Math.random() - 0.5) * spread, y: y - 20 + Math.random() * 20,
                 vx: (Math.random() - 0.5) * 160, vy: -120 - Math.random() * 160, life: 1 });
}

/* =========================================================
   물리 (작은 시간으로 여러 번 쪼개서 계산 → 빠른 공도 안 뚫고 지나감)
   ========================================================= */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function inTri(px, py, a, b, c) {
    const side = (p1x, p1y, p2, p3) => (p1x - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1y - p3[1]);
    const d1 = side(px, py, a, b), d2 = side(px, py, b, c), d3 = side(px, py, c, a);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

function hitSeg(s) {
    if (!s.on || s.layer !== ball.layer) return;
    let t = ((ball.x - s.ax) * s.dx + (ball.y - s.ay) * s.dy) / s.len2;
    t = clamp(t, 0, 1);
    const qx = s.ax + s.dx * t, qy = s.ay + s.dy * t;
    let nx = ball.x - qx, ny = ball.y - qy;
    const d2 = nx * nx + ny * ny;
    if (d2 >= BR * BR) return;
    const d = Math.sqrt(d2) || 1e-6; nx /= d; ny /= d;
    if (s.oneWay && nx * s.oneWay.x + ny * s.oneWay.y <= 0) return;   // 아래에서 올라오는 공은 통과
    ball.x = qx + nx * BR; ball.y = qy + ny * BR;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn >= 0) return;
    ball.vx -= (1 + s.e) * vn * nx; ball.vy -= (1 + s.e) * vn * ny;
    const impact = -vn;
    if (s.kind === 'sling' && impact > 60) {
        // 양쪽 슬링샷이 공을 끝없이 주고받지 않게 :
        // 튕기는 방향을 살짝 흔들고, 다른 데 안 닿고 연달아 튕길수록 약하게
        slingStreak++;
        const k = s.kick * (slingStreak >= 3 ? 0.2 : slingStreak === 2 ? 0.6 : 1);
        const a = (Math.random() - 0.5) * 0.4, ca = Math.cos(a), sa = Math.sin(a);
        ball.vx += (nx * ca - ny * sa) * k; ball.vy += (nx * sa + ny * ca) * k;
        s.sling.flash = 1; addScore(PTS.sling * mult); sfx.sling();
    } else if (s.kind === 'target' && impact > 40) onTarget(s);
}
function hitCircle(c) {
    let nx = ball.x - c.x, ny = ball.y - c.y;
    const R = BR + c.r, d2 = nx * nx + ny * ny;
    if (d2 >= R * R) return;
    const d = Math.sqrt(d2) || 1e-6; nx /= d; ny /= d;
    ball.x = c.x + nx * R; ball.y = c.y + ny * R;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn >= 0) return;
    ball.vx -= (1 + c.e) * vn * nx; ball.vy -= (1 + c.e) * vn * ny;
    ball.vx += nx * c.kick; ball.vy += ny * c.kick;
    const impact = -vn;
    slingStreak = 0;
    if (c.kind === 'bumper') onBumper(c);
    else if (c.kind === 'mini') { if (impact > 50) onMini(c); }

    else if (c.kind === 'pepe') onPepe(impact, c.x + nx * c.r, c.y + ny * c.r);
}
function hitFlipper(f) {
    const tx = f.px + Math.cos(f.ang) * f.len, ty = f.py + Math.sin(f.ang) * f.len;
    const dx = tx - f.px, dy = ty - f.py;
    const t = clamp(((ball.x - f.px) * dx + (ball.y - f.py) * dy) / (dx * dx + dy * dy), 0, 1);
    const qx = f.px + dx * t, qy = f.py + dy * t, rr = f.r1 + (f.r2 - f.r1) * t;
    let nx = ball.x - qx, ny = ball.y - qy;
    const d = Math.hypot(nx, ny);
    if (d >= BR + rr || d === 0) return;
    nx /= d; ny /= d;
    ball.x = qx + nx * (BR + rr); ball.y = qy + ny * (BR + rr);
    // 닿은 지점의 플리퍼 속도 (돌고 있으면 공을 쳐 올림)
    const cx = qx + nx * rr - f.px, cy = qy + ny * rr - f.py;
    const svx = -f.om * cy, svy = f.om * cx;
    let rvx = ball.vx - svx, rvy = ball.vy - svy;
    const vn = rvx * nx + rvy * ny;
    if (vn >= 0) return;
    rvx -= 1.25 * vn * nx; rvy -= 1.25 * vn * ny;
    ball.vx = rvx + svx; ball.vy = rvy + svy;
    slingStreak = 0;
}

function physics(h) {
    flippers.forEach(f => {
        const target = f.up && state === 'play' ? f.act : f.rest;
        const sp = f.up ? 24 : 14, diff = target - f.ang;
        const stp = Math.sign(diff) * Math.min(Math.abs(diff), sp * h);
        f.om = stp / h; f.ang += stp;
    });
    if (!ball) return;
    if (ball.held) { ball.x = SAUCER.x; ball.y = SAUCER.y; ball.vx = ball.vy = 0; return; }   // 새총에 잡혀 있음
    const px = ball.x, py = ball.y;
    ball.vy += GRAV * h;
    // 새총 구멍 근처에선 살짝 빨려 들어감
    if (ball.layer === 0) {
        const sdx = SAUCER.x - ball.x, sdy = SAUCER.y - ball.y, sd = Math.hypot(sdx, sdy);
        if (sd < 18 && gt > SAUCER.cool) { ball.vx += sdx / sd * 2200 * h; ball.vy += sdy / sd * 2200 * h; }
    }
    const sp = Math.hypot(ball.vx, ball.vy);
    if (sp > MAXV) { ball.vx *= MAXV / sp; ball.vy *= MAXV / sp; }
    ball.x += ball.vx * h; ball.y += ball.vy * h;


    for (const s of segs) hitSeg(s);
    if (ball.layer === 0) {
        for (const c of circles) hitCircle(c);
        for (const f of flippers) hitFlipper(f);
        // 혹시 공이 삼각형 안으로 파고들면 바깥으로 꺼냄
        for (const s of slings) if (inTri(ball.x, ball.y, s.a, s.b, s.c)) {
            const d = (ball.x - s.a[0]) * s.n[0] + (ball.y - s.a[1]) * s.n[1];
            ball.x += s.n[0] * (BR + 1 - d); ball.y += s.n[1] * (BR + 1 - d);
            const vn = ball.vx * s.n[0] + ball.vy * s.n[1]; if (vn < 0) { ball.vx -= vn * s.n[0]; ball.vy -= vn * s.n[1]; }
        }
        // 새총 구멍에 쏙
        if (Math.hypot(ball.x - SAUCER.x, ball.y - SAUCER.y) < 9 && gt > SAUCER.cool && Math.hypot(ball.vx, ball.vy) < 1100) { captureSaucer(); return; }
        // 스피너 (궤도 입구를 지나가면 빙글빙글) + 궤도 출발 기록
        if (ball.x > SPIN.x0 && ball.x < SPIN.x1 && (py - SPIN.y) * (ball.y - SPIN.y) <= 0 && py !== ball.y) {
            SPIN.v = Math.min(60, Math.abs(ball.vy) / 18);
            if (ball.vy < 0) orbitArm = gt;
        }
        // 궤도를 끝까지 돌아서 위쪽으로 나오면 성공
        if (orbitArm && ball.x > 170 && ball.y < 80) { if (gt - orbitArm < 2.5) onOrbit(); else orbitArm = 0; }
        // 오른쪽 리턴 레인
        if (ball.x > RLANE.x0 && ball.x < RLANE.x1 && py < RLANE.y && ball.y >= RLANE.y) onRightLane();
        // 위쪽 통로 통과
        let li = -1;
        if (ball.y > 70 && ball.y < 104) for (let i = 0; i < 4; i++) if (ball.x > POSTS[i] && ball.x < POSTS[i + 1]) li = i;
        if (li !== lastLane && li >= 0) onLane(li);
        lastLane = li;
    }

    if (ball.y > 660) slingStreak = 0;
    if (ball.y > H + 30) drain();
}

/* =========================================================
   매 프레임
   ========================================================= */
const isOpen = () => !win || win.classList.contains('open');
const isActive = () => !win || (win.classList.contains('open') && win.classList.contains('active'));

function update(dt) {
    gt += dt;
    if (pulling) power = Math.min(1, power + dt / 0.9);
    if (state === 'play') {
        if (!ball && serveAt && gt >= serveAt) { serveAt = 0; serve(); }
        if (ball && ball.held && gt >= SAUCER.ejectAt) ejectSaucer();
        if (breakdown > 0) {
            breakdown -= dt;
            if (Math.random() < dt * 14) addTear(PEPE.x, PEPE.y, 76);
            if (breakdown <= 0) { breakdown = 0; mental = 60; msg('페페가 겨우 진정했어요', 2.5); }
        } else mental = Math.min(100, mental + MENTAL_RECOVER * dt);

        // 공이 끼어서 안 움직이면 살짝 흔들어 줌 (플리퍼로 잡고 있을 땐 그대로)
        if (ball && !ball.held && !inLane() && Math.hypot(ball.vx, ball.vy) < 10 && !flippers.some(f => f.up)) {
            stuckT += dt;
            if (stuckT > 2.5) { stuckT = 0; ball.vy -= 380; ball.vx += (Math.random() - 0.5) * 300; msg('공이 끼었어요. 살짝 흔들었어요', 2); }
        } else stuckT = 0;

        // 공이 가까이 오면 페페가 식은땀 흘리며 움찔
        if (ball && ball.layer === 0 && Math.hypot(ball.x - PEPE.x, ball.y - PEPE.y) < 125) {
            face.hurt = Math.max(face.hurt, 0.3);
            if (Math.random() < dt * 3) fx.rotv += (Math.random() - 0.5) * 4;
        }
    }
    if (state !== 'play') mental = Math.min(100, mental + MENTAL_RECOVER * 4 * dt);
    const N = Math.max(1, Math.ceil(dt * 480)), h = dt / N;
    for (let i = 0; i < N; i++) physics(h);

    // 스피너 : 돌아간 만큼 점수
    if (SPIN.v > 0.05) {
        SPIN.ang += SPIN.v * dt; SPIN.acc += SPIN.v * dt; SPIN.v *= Math.pow(0.35, dt);
        while (SPIN.acc >= Math.PI) { SPIN.acc -= Math.PI; addScore(PTS.spin * mult); sfx.tick(); }
    } else SPIN.v = 0;

    // 페페 스프링 (찌그러졌다 돌아옴) · 빙글
    fx.sqv += (-170 * fx.sq - 11 * fx.sqv) * dt; fx.sq += fx.sqv * dt;
    fx.rotv += (-140 * fx.rot - 9 * fx.rotv) * dt; fx.rot += fx.rotv * dt;
    fx.spin = Math.max(0, fx.spin - dt * 8);
    fx.flash = Math.max(0, fx.flash - dt * 3.5);
    bumpers.forEach(b => { b.flash = Math.max(0, b.flash - dt * 6); b.cry = Math.max(0, b.cry - dt); });
    minis.forEach(m => { m.cry = Math.max(0, m.cry - dt); m.wob = Math.max(0, m.wob - dt * 3); });
    slings.forEach(s => s.flash = Math.max(0, s.flash - dt * 6));
    RLANE.lit = Math.max(0, RLANE.lit - dt);
    shakeT = Math.max(0, shakeT - dt);
    for (let i = tears.length - 1; i >= 0; i--) {
        const p = tears[i]; p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 0.9;
        if (p.life <= 0 || p.y > H) tears.splice(i, 1);
    }
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 0.9) pops.splice(i, 1); }
    for (const k in face) face[k] = Math.max(0, face[k] - dt);
}

/* =========================================================
   그리기
   ========================================================= */
const FONT = '"Pixelify Sans","DotGothic16","Malgun Gothic",sans-serif';
let scale = 1, offX = 0, offY = 0, bg = null;
const pics = {};
Object.keys(IMG).forEach(key => {
    if (!IMG[key]) return;
    const im = new Image();
    im.onload = () => { pics[key] = im; };
    im.src = IMG[key];
});
// 그림을 한 가지 색으로 물들인 사본 (맞았을 때 번쩍 · 그림이 없을 때 대신 쓰기)
const tints = {};
function tinted(key, col) {
    const id = key + col;
    if (!tints[id]) {
        const im = pics[key], c = document.createElement('canvas');
        c.width = im.width; c.height = im.height;
        const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
        g.drawImage(im, 0, 0);
        g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
        tints[id] = c;
    }
    return tints[id];
}
// 표정 그림 고르기 (없으면 평소 그림)
const pickFace = want => pics[want] ? want : pics.idle ? 'idle' : Object.keys(pics)[0];
// 작은 페페 얼굴 (범퍼 · 과녁)
function smallFace(want, x, y, w) {
    const key = pickFace(want), im = key && pics[key];
    if (!im) return;
    const h = w * im.height / im.width;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, x - w / 2, y - h / 2, w, h);
    if (key !== want && want === 'cry') { ctx.globalAlpha = 0.55; ctx.drawImage(tinted(key, 'rgb(70,120,255)'), x - w / 2, y - h / 2, w, h); ctx.globalAlpha = 1; }
}

function resize() {
    // clientWidth 는 창 열기 모션(transform)과 상관없는 실제 크기
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    // 칸 비율이 판 비율과 달라도 잘리지 않게 : 작은 쪽에 맞추고 가운데 정렬
    scale = Math.min(canvas.width / W, canvas.height / H);
    offX = (canvas.width - W * scale) / 2; offY = (canvas.height - H * scale) / 2;
    bg = null;
}
new ResizeObserver(resize).observe(canvas);

function line(g, ax, ay, bx, by) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); }
const RAIL_COL = { wall: '#8fa2ff', guide: '#4cc9f0', rail: '#ff5fa2', post: '#ffd84d', gate: '#8fa2ff' };
function strokeWall(g, s) {
    g.lineCap = 'round';
    g.strokeStyle = '#08061a'; g.lineWidth = 8; line(g, s.ax, s.ay, s.bx, s.by);
    g.strokeStyle = RAIL_COL[s.kind] || '#8fa2ff'; g.lineWidth = 4.5; line(g, s.ax, s.ay, s.bx, s.by);
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.4; line(g, s.ax, s.ay, s.bx, s.by);
}
// 둥근 램프(불빛)
function lamp(g, x, y, r, on, col, label) {
    g.beginPath(); g.arc(x, y, r + 1.5, 0, 7); g.fillStyle = '#08061a'; g.fill();
    g.beginPath(); g.arc(x, y, r, 0, 7);
    if (on) { g.shadowColor = col; g.shadowBlur = 10; }
    g.fillStyle = on ? col : 'rgba(255,255,255,.1)'; g.fill(); g.shadowBlur = 0;
    if (label) { g.fillStyle = on ? '#08061a' : 'rgba(255,255,255,.35)'; g.font = `700 ${Math.round(r * 1.05)}px ${FONT}`; g.textAlign = 'center'; g.fillText(label, x, y + r * 0.38); }
}
// 화살표 램프
function arrowLamp(g, x, y, ang, on, col, size = 9) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath(); g.moveTo(size, 0); g.lineTo(-size * 0.7, -size * 0.75); g.lineTo(-size * 0.3, 0); g.lineTo(-size * 0.7, size * 0.75); g.closePath();
    if (on) { g.shadowColor = col; g.shadowBlur = 10; }
    g.fillStyle = on ? col : 'rgba(255,255,255,.1)'; g.fill(); g.shadowBlur = 0;
    g.lineWidth = 1.5; g.strokeStyle = '#08061a'; g.stroke();
    g.restore();
}

// 움직이지 않는 부분은 한 번만 그려 둠
function buildBg() {
    bg = document.createElement('canvas'); bg.width = canvas.width; bg.height = canvas.height;
    const g = bg.getContext('2d'); g.setTransform(scale, 0, 0, scale, offX, offY);
    g.fillStyle = '#07050f'; g.fillRect(0, 0, W, H);
    // 판 모양
    poly(g, ARC); g.lineTo(OUT_X, H); g.lineTo(20, H); g.closePath();
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2f1d66'); gr.addColorStop(0.55, '#1c1246'); gr.addColorStop(1, '#0e0826');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    // 성운 무늬
    [[110, 230, 170, 'rgba(255,95,162,.12)'], [500, 430, 160, 'rgba(76,201,240,.10)'], [290, 640, 180, 'rgba(125,255,106,.06)']].forEach(([x, y, r, c]) => {
        const n = g.createRadialGradient(x, y, 4, x, y, r); n.addColorStop(0, c); n.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = n; g.fillRect(x - r, y - r, r * 2, r * 2);
    });
    // 페페 뒤 햇살 무늬
    for (let i = 0; i < 24; i += 2) {
        const a0 = i / 24 * Math.PI * 2, a1 = (i + 1) / 24 * Math.PI * 2;
        g.beginPath(); g.moveTo(PEPE.x, PEPE.y);
        g.lineTo(PEPE.x + Math.cos(a0) * 300, PEPE.y + Math.sin(a0) * 300); g.lineTo(PEPE.x + Math.cos(a1) * 300, PEPE.y + Math.sin(a1) * 300);
        g.closePath(); g.fillStyle = 'rgba(255,255,255,.035)'; g.fill();
    }
    // 격자 + 별
    g.strokeStyle = 'rgba(140,120,255,.07)'; g.lineWidth = 1;
    for (let x = 0; x < W; x += 20) line(g, x, 0, x, H);
    for (let y = 0; y < H; y += 20) line(g, 0, y, W, y);
    let s = 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 90; i++) g.fillRect(Math.round(rnd() * W), Math.round(rnd() * H), 2, 2);
    // 페페 뒤 후광
    const glow = g.createRadialGradient(PEPE.x, PEPE.y, 10, PEPE.x, PEPE.y, 140);
    glow.addColorStop(0, 'rgba(120,255,140,.28)'); glow.addColorStop(1, 'rgba(120,255,140,0)');
    g.fillStyle = glow; g.fillRect(PEPE.x - 150, PEPE.y - 150, 300, 300);
    // 왼쪽 궤도 바닥 (분홍)
    g.beginPath(); g.moveTo(20, ORBIT_Y0); g.lineTo(20, 230);
    ARC.slice(0, 13).forEach(([x, y]) => g.lineTo(x, y));
    for (let i = ORBIT.length - 1; i >= 0; i--) g.lineTo(ORBIT[i][0], ORBIT[i][1]);
    g.lineTo(ORBIT_X, ORBIT_Y0); g.closePath();
    g.fillStyle = 'rgba(255,95,162,.13)'; g.fill();
    // 왼쪽 범퍼 자리 판
    g.beginPath(); g.arc(96, 274, 48, 0, 7); g.fillStyle = 'rgba(33,182,224,.1)'; g.fill();
    // 위쪽 범퍼 자리 판
    g.beginPath(); g.arc(310, 168, 68, 0, 7); g.fillStyle = 'rgba(232,48,79,.08)'; g.fill();
    g.beginPath(); g.arc(462, 190, 34, 0, 7); g.fillStyle = 'rgba(232,48,79,.08)'; g.fill();
    // 오른쪽 리턴 레인 · 꼬마 페페 자리 판
    g.fillStyle = 'rgba(76,201,240,.1)'; g.fillRect(498, 236, 52, 160);
    // 새총 구멍 주변 판
    g.beginPath(); g.arc(SAUCER.x, SAUCER.y, 26, 0, 7); g.fillStyle = 'rgba(255,216,77,.12)'; g.fill();
    // 발사 레인 화살표
    g.fillStyle = 'rgba(255,216,77,.22)';
    for (let y = 690; y > 320; y -= 36) { g.beginPath(); g.moveTo(565, y - 10); g.lineTo(573, y); g.lineTo(557, y); g.closePath(); g.fill(); }
    g.restore();

    // 새총 구멍
    g.beginPath(); g.arc(SAUCER.x, SAUCER.y, SAUCER.r + 3, 0, 7); g.fillStyle = '#08061a'; g.fill();
    g.beginPath(); g.arc(SAUCER.x, SAUCER.y, SAUCER.r + 3, 0, 7); g.lineWidth = 2.5; g.strokeStyle = '#ffd84d'; g.stroke();
    const hole = g.createRadialGradient(SAUCER.x - 2, SAUCER.y - 2, 1, SAUCER.x, SAUCER.y, SAUCER.r);
    hole.addColorStop(0, '#3a2a55'); hole.addColorStop(1, '#000'); g.beginPath(); g.arc(SAUCER.x, SAUCER.y, SAUCER.r, 0, 7); g.fillStyle = hole; g.fill();
    // 벽
    segs.filter(s => s.draw).forEach(s => strokeWall(g, s));

}

function drawSling(s) {
    const g = ctx;
    poly(g, [s.a, s.b, s.c]); g.closePath();
    g.fillStyle = '#3a2470'; g.fill();
    g.lineWidth = 3; g.strokeStyle = '#08061a'; g.stroke();
    g.lineCap = 'round'; g.strokeStyle = s.flash > 0 ? `rgba(255,255,255,${0.5 + s.flash / 2})` : '#ff5fa2'; g.lineWidth = 4 + s.flash * 3;
    line(g, s.a[0], s.a[1], s.c[0], s.c[1]);
    const cx = (s.a[0] + s.b[0] + s.c[0]) / 3, cy = (s.a[1] + s.b[1] + s.c[1]) / 3;
    lamp(g, cx, cy, 4, s.flash > 0, '#ff5fa2');
}
function drawBumper(b) {
    const g = ctx, bare = b.wave && pics.wave;      // 손 흔드는 페페는 테두리 원 없이 그림만
    if (!bare) {
        g.beginPath(); g.arc(b.x, b.y, b.r + 4, 0, 7); g.fillStyle = '#08061a'; g.fill();
        g.beginPath(); g.arc(b.x, b.y, b.r + 2, 0, 7); g.fillStyle = b.flash > 0 ? '#ffffff' : b.ring; g.fill();
        g.beginPath(); g.arc(b.x, b.y, b.r - 2, 0, 7); g.fillStyle = b.flash > 0 ? '#ffe066' : '#2a1858'; g.fill();
    }
    if (bare) {
        // 손 흔드는 페페 : 범퍼보다 조금 크게, 맞으면 멈춘 채 파랗게
        const im = pics.wave, fw = im.width / WAVE_FRAMES, fh = im.height, w = b.r * 3.4, h = w * fh / fw;
        const stopped = b.stopUntil > gt, f = stopped ? b.frozen : Math.floor(gt / WAVE_SEC) % WAVE_FRAMES;
        const x = b.x - w / 2 + (stopped ? Math.sin(gt * 45) * Math.max(0, b.stopUntil - gt - WAVE_STOP + 0.4) * 6 : 0), y = b.y - h / 2;
        g.imageSmoothingEnabled = false;
        g.drawImage(im, f * fw, 0, fw, fh, x, y, w, h);
        if (stopped) { g.globalAlpha = 0.5; g.drawImage(tinted('wave', 'rgb(70,120,255)'), f * fw, 0, fw, fh, x, y, w, h); g.globalAlpha = 1; }
    } else smallFace(b.cry > 0 ? 'cry' : 'idle', b.x, b.y + 1, (b.r - 1) * 2);
    if (b.flash > 0 && !bare) { g.beginPath(); g.arc(b.x, b.y, b.r + 7 + (1 - b.flash) * 10, 0, 7); g.strokeStyle = `rgba(255,255,255,${b.flash})`; g.lineWidth = 2; g.stroke(); }
}
function drawMini(m) {
    const g = ctx, wob = Math.sin(gt * 40) * m.wob * 3;
    const im = (m.lit || m.cry > 0) ? (pics.miniHit || pics.miniIdle) : pics.miniIdle;   // 테두리 원 없이 그림만
    if (im) {
        const w = m.r * 3.2, h = w * im.height / im.width;
        g.imageSmoothingEnabled = false;
        if (m.lit) { g.shadowColor = '#4cc9f0'; g.shadowBlur = 12; }
        g.drawImage(im, m.x - w / 2 + wob, m.y - h / 2, w, h); g.shadowBlur = 0;
    } else smallFace(m.lit || m.cry > 0 ? 'cry' : 'idle', m.x + wob, m.y + 1, m.r * 2.3);
    lamp(g, m.x - 25, m.y, 3.5, m.lit, '#4cc9f0');
}
function drawSpinner() {
    const g = ctx, w = (SPIN.x1 - SPIN.x0) - 8, c = Math.cos(SPIN.ang);
    const x0 = (SPIN.x0 + SPIN.x1) / 2;
    g.fillStyle = '#08061a'; g.fillRect(SPIN.x0 + 2, SPIN.y - 2, SPIN.x1 - SPIN.x0 - 4, 4);
    g.fillStyle = c > 0 ? '#ffd84d' : '#c9a000';
    const hh = Math.max(1.5, Math.abs(c) * 7);
    g.fillRect(x0 - w / 2, SPIN.y - hh / 2, w, hh);
}
function drawInserts() {
    const g = ctx;
    // 궤도 화살표 (돌린 횟수만큼 켜짐, 3번마다 다시)
    const lit = orbits % 3, armed = orbitArm && Math.floor(gt * 8) % 2;
    [396, 374, 352].forEach((y, i) => arrowLamp(g, 40, y, -Math.PI / 2, i < lit || armed, '#ff5fa2', 8));
    // 새총 → 페페 조준 화살표
    const holding = ball && ball.held, ang = Math.atan2(PEPE.y - SAUCER.y, PEPE.x - SAUCER.x);
    [0.3, 0.45].forEach((t, i) => arrowLamp(g, SAUCER.x + (PEPE.x - SAUCER.x) * t, SAUCER.y + (PEPE.y - SAUCER.y) * t, ang, holding ? Math.floor(gt * 10 + i) % 2 === 0 : false, '#ffd84d', 8));
    // 놀리기 과녁 옆 램프
    bank.t.forEach(t => lamp(g, t.ax + 16, t.ay + 13, 3.5, !t.on, bank.col));
    // 리턴 레인 램프
    lamp(g, 535, 300, 4, RLANE.lit > 0, '#4cc9f0');
    // 미션 램프 (이번 바퀴에서 깬 미션)
    const done = mIdx % MISSIONS.length;
    for (let i = 0; i < MISSIONS.length; i++) lamp(g, CX - 60 + i * 24, 586, 6, state === 'play' && (i < done || (i === done && Math.floor(gt * 3) % 2)), i < done ? '#7dff6a' : '#ffd84d');
    // 배율 램프
    [2, 3, 4, 5].forEach((n, i) => lamp(g, CX - 54 + i * 36, 620, 10, mult >= n, '#ffd84d', 'x' + n));
    // 공 살려 주는 중
    lamp(g, CX, 656, 8, gt < saveUntil && state === 'play' && Math.floor(gt * 4) % 2 === 0, '#ff3b3b');
}
function drawFlipper(f) {
    const g = ctx, tx = f.px + Math.cos(f.ang) * f.len, ty = f.py + Math.sin(f.ang) * f.len;
    const body = (w, col) => {
        g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = w; line(g, f.px, f.py, tx, ty);
        g.beginPath(); g.arc(f.px, f.py, f.r1 + (w - 2 * f.r2) / 2, 0, 7); g.fillStyle = col; g.fill();
    };
    body(f.r2 * 2 + 4, '#08061a');
    body(f.r2 * 2, '#f4f4f4');
    g.strokeStyle = '#e8304f'; g.lineWidth = 2; line(g, f.px, f.py, tx, ty);
    g.beginPath(); g.arc(f.px, f.py, 3, 0, 7); g.fillStyle = '#08061a'; g.fill();
}
function drawPepe() {
    const g = ctx;
    // 멘탈 표시등 (괴롭힐수록 빨간 불이 늘어남)
    const n = 18, lit = breakdown > 0 ? n : Math.round((100 - mental) / 100 * n);
    for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + i / n * Math.PI * 2, x = PEPE.x + Math.cos(a) * 106, y = PEPE.y + Math.sin(a) * 106;
        const on = i < lit, blink = breakdown > 0 && Math.floor(gt * 6) % 2;
        g.beginPath(); g.arc(x, y, 4, 0, 7);
        g.fillStyle = breakdown > 0 ? (blink ? '#4cc9f0' : '#1c3a8a') : on ? '#ff3b3b' : '#3a2a55'; g.fill();
        g.lineWidth = 1.5; g.strokeStyle = '#08061a'; g.stroke();
    }
    g.save();
    const sh = breakdown > 0 ? (Math.random() - 0.5) * 2.4 : 0;     // 멘탈 붕괴 중엔 덜덜 떪
    if (fx.spin > 0) {                                               // 빙글빙글 돌 때는 가운데를 축으로
        g.translate(PEPE.x, PEPE.y); g.rotate(fx.spin); g.translate(0, PEPE.size * 0.42);
    } else g.translate(PEPE.x + sh, PEPE.y + PEPE.size * 0.42);      // 평소엔 발밑 기준으로 찌그러짐
    g.rotate(clamp(fx.rot, -0.6, 0.6));
    g.scale(1 + clamp(fx.sq, -0.5, 0.5) * 0.28, 1 - clamp(fx.sq, -0.5, 0.5) * 0.3);
    g.imageSmoothingEnabled = false;
    // 표정 고르기 : 울음 > 식은땀 > 안도 > 평소
    const want = (breakdown > 0 || face.cry > 0) ? 'cry' : face.hurt > 0 ? 'hurt' : (state === 'over' || face.happy > 0) ? 'happy' : 'idle';
    const key = pickFace(want);
    const im = key && pics[key];
    if (im) {
        const ar = im.height / im.width, w = PEPE.size, h = w * ar, x = -w / 2, y = -PEPE.size * 0.42 - h / 2;
        g.drawImage(im, x, y, w, h);
        if (key !== want && want === 'cry')  { g.globalAlpha = 0.6; g.drawImage(tinted(key, 'rgb(70,120,255)'), x, y, w, h); }
        if (key !== want && want === 'hurt') { g.globalAlpha = 0.5; g.drawImage(tinted(key, 'rgb(255,40,40)'), x, y, w, h); }
        if (fx.flash > 0) { g.globalAlpha = fx.flash * 0.45; g.drawImage(tinted(key, 'rgb(255,30,30)'), x, y, w, h); }
        g.globalAlpha = 1;
    } else {
        g.beginPath(); g.arc(0, -PEPE.size * 0.42, PEPE.r, 0, 7); g.fillStyle = '#3c3'; g.fill();
    }
    g.restore();
}
function drawBall(up) {
    if (!ball) return;
    const g = ctx, r = BR, off = 3;
    g.beginPath(); g.arc(ball.x + off * 0.7, ball.y + off, r, 0, 7); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    const bg2 = g.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, r);
    bg2.addColorStop(0, '#ffffff'); bg2.addColorStop(0.45, '#c9d1e0'); bg2.addColorStop(1, '#4a5168');
    g.beginPath(); g.arc(ball.x, ball.y, r, 0, 7); g.fillStyle = bg2; g.fill();
    g.lineWidth = 1; g.strokeStyle = '#08061a'; g.stroke();
}
function bigText(t, sub, col) {
    const g = ctx; g.textAlign = 'center';
    g.fillStyle = 'rgba(8,6,26,.8)'; g.fillRect(CX - 225, 486, 450, sub ? 74 : 54);
    g.font = `700 40px ${FONT}`; g.lineWidth = 6; g.strokeStyle = '#08061a';
    g.strokeText(t, CX, 528); g.fillStyle = col; g.fillText(t, CX, 528);
    if (sub) { g.font = `700 15px ${FONT}`; g.fillStyle = '#fff'; g.fillText(sub, CX, 550); }
}

function draw() {
    if (!bg) { if (!canvas.clientWidth) return; if (canvas.width === 300 && canvas.height === 150) resize(); buildBg(); }
    const g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#07050f'; g.fillRect(0, 0, canvas.width, canvas.height);
    const sx = shakeT > 0 ? (Math.random() - 0.5) * shakeAmp * 2 : 0, sy = shakeT > 0 ? (Math.random() - 0.5) * shakeAmp : 0;
    const view = () => g.setTransform(scale, 0, 0, scale, offX + sx * scale, offY + sy * scale);
    g.setTransform(1, 0, 0, 1, sx * scale, sy * scale); g.drawImage(bg, 0, 0);
    view();

    drawInserts();
    // P E P E 통로 글자
    g.textAlign = 'center'; g.font = `700 20px ${FONT}`;
    'PEPE'.split('').forEach((ch, i) => {
        const x = POSTS[i] + 20;
        g.fillStyle = lanes[i] ? '#ffd84d' : 'rgba(255,255,255,.18)';
        if (lanes[i]) { g.shadowColor = '#ffd84d'; g.shadowBlur = 10; }
        g.fillText(ch, x, 94); g.shadowBlur = 0;
    });
    // 놀리기 과녁
    bank.t.forEach(t => {
        g.fillStyle = '#08061a'; g.fillRect(t.ax - 2, t.ay - 1, 9, 28);
        g.fillStyle = t.on ? bank.col : 'rgba(255,255,255,.08)'; g.fillRect(t.ax - 1, t.ay, 6, 26);
    });
    drawSpinner();
    slings.forEach(drawSling);
    bumpers.forEach(drawBumper);
    minis.forEach(drawMini);
    drawPepe();
    // 눈물
    tears.forEach(p => {
        g.globalAlpha = clamp(p.life * 1.4, 0, 1); g.fillStyle = '#6fc3ff';
        g.beginPath(); g.arc(p.x, p.y, 3.2, 0, 7); g.fill();
        g.beginPath(); g.moveTo(p.x - 3, p.y - 1); g.lineTo(p.x, p.y - 7); g.lineTo(p.x + 3, p.y - 1); g.fill();
    });
    g.globalAlpha = 1;
    flippers.forEach(drawFlipper);
    // 발사대 (당길수록 내려감)
    const py = 752 + power * 20;
    g.fillStyle = '#08061a'; g.fillRect(LANE_X + 3, py, 24, H - py);
    g.fillStyle = '#c9d1e0'; g.fillRect(LANE_X + 5, py, 20, 5);
    g.strokeStyle = '#8fa2ff'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 6; i++) { const yy = py + 6 + i * (H - 4 - py - 6) / 6; g.lineTo(i % 2 ? LANE_X + 24 : LANE_X + 6, yy); } g.stroke();
    drawBall(false);
    // 점수 뜨는 글자
    g.font = `700 13px ${FONT}`; g.textAlign = 'center';
    pops.forEach(p => {
        g.globalAlpha = 1 - p.t / 0.9; g.fillStyle = '#fff'; g.strokeStyle = '#08061a'; g.lineWidth = 3;
        g.strokeText(p.text, p.x, p.y - p.t * 30); g.fillText(p.text, p.x, p.y - p.t * 30);
    });
    g.globalAlpha = 1;
    if (state === 'over') bigText('GAME OVER', '스페이스 또는 [새 게임]', '#ffd84d');
    if (state === 'attract') bigText('PEPE PINBALL', '스페이스 또는 [새 게임]으로 시작', '#7dff6a');
}

/* ---------- 옆 패널 ---------- */
const shown = {};
function setUI(k, v) { if (shown[k] !== v) { shown[k] = v; ui[k].textContent = v; } }
function updateUI() {
    setUI('ball', state === 'play' ? `${Math.min(ballNo, BALLS)}/${BALLS}` : '-');
    setUI('mult', 'x' + mult);
    setUI('score', score.toLocaleString('en-US'));
    setUI('hits', hits.toLocaleString('en-US'));
    setUI('breaks', String(breaks));
    setUI('best', best.toLocaleString('en-US'));
    const m = Math.round(mental);
    setUI('mentalTxt', breakdown > 0 ? '붕괴!' : m + '%');
    const w = (breakdown > 0 ? 100 : m) + '%';
    if (shown.mw !== w) { shown.mw = w; ui.mentalBar.style.width = w; }
    const cls = breakdown > 0 ? 'broken' : m < 35 ? 'low' : '';
    if (shown.mc !== cls) { shown.mc = cls; ui.mentalBar.className = cls; }
    const mi = MISSIONS[mIdx % MISSIONS.length];
    setUI('rank', rank < 0 ? '-' : `등급 : ${RANKS[rank]}`);
    setUI('mission', state === 'attract' ? '게임을 시작하면 나와요' : mi.text);
    setUI('mprog', state === 'attract' ? '' : '■'.repeat(mProg) + '□'.repeat(mi.need - mProg));
    let t = gt < msgUntil ? msgText : '';
    if (!t) t = state === 'attract' ? '스페이스 또는 [새 게임]으로 시작' : state === 'over' ? 'GAME OVER' : breakdown > 0 ? `멘탈 붕괴! 페페 점수 ${PTS.breakdownMul}배` : '가운데 페페를 맞혀요';
    setUI('msg', t);
}

/* ---------- 루프 ---------- */
let last = performance.now();
function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!isOpen()) return;
    const act = isActive();
    pauseEl.hidden = !(state === 'play' && !act);
    if (act) update(dt);
    else { flippers.forEach(f => f.up = false); pulling = false; }
    draw(); updateUI();
}
requestAnimationFrame(loop);

/* =========================================================
   조작
   ========================================================= */
function flip(i, down) {
    if (state !== 'play') return;
    if (down && !flippers[i].up) {
        sfx.flip();
        // 플리퍼를 누르면 켜진 P E P E 불이 한 칸씩 이동 (옛날 핀볼처럼)
        if (lanes.some(Boolean) && !lanes.every(Boolean)) {
            if (i === 0) lanes.push(lanes.shift()); else lanes.unshift(lanes.pop());
        }
    }
    flippers[i].up = down;
}
function pullStart() {
    if (state !== 'play') { newGame(); return; }
    if (!inLane()) return;
    pulling = true; power = 0;
}
function pullEnd() {
    if (!pulling) return;
    pulling = false; launch(); power = 0;
}
const KEYS = { left: ['KeyZ', 'ArrowLeft'], right: ['Slash', 'ArrowRight', 'KeyM'], launch: ['Space', 'ArrowDown', 'Enter'] };
const role = code => Object.keys(KEYS).find(k => KEYS[k].includes(code));
document.addEventListener('keydown', e => {
    if (!isActive()) return;
    const r = role(e.code); if (!r) return;
    e.preventDefault();
    if (e.repeat) return;
    if (r === 'left') flip(0, true);
    else if (r === 'right') flip(1, true);
    else if (r === 'launch') pullStart();
});
document.addEventListener('keyup', e => {
    const r = role(e.code); if (!r) return;
    if (isActive()) e.preventDefault();
    if (r === 'left') flip(0, false);
    else if (r === 'right') flip(1, false);
    else if (r === 'launch') pullEnd();
});

// 마우스 · 터치
const ptrs = new Map();
canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    sfx.unlock();
    if (state !== 'play') { newGame(); return; }
    const r = canvas.getBoundingClientRect(), x = ((e.clientX - r.left) * canvas.width / r.width - offX) / scale;
    let what = x > LANE_X - 6 && inLane() ? 'launch' : x < CX ? 'left' : 'right';
    ptrs.set(e.pointerId, what);
    if (what === 'launch') pullStart(); else flip(what === 'left' ? 0 : 1, true);
});
const ptrUp = e => {
    const what = ptrs.get(e.pointerId); if (!what) return;
    ptrs.delete(e.pointerId);
    if (what === 'launch') pullEnd(); else flip(what === 'left' ? 0 : 1, false);
};
canvas.addEventListener('pointerup', ptrUp);
canvas.addEventListener('pointercancel', ptrUp);

root.querySelector('[data-act="new"]').addEventListener('click', () => { sfx.unlock(); newGame(); });
const lb = root.querySelector('[data-act="launch"]');
lb.addEventListener('pointerdown', e => { e.preventDefault(); sfx.unlock(); pullStart(); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(t => lb.addEventListener(t, pullEnd));

/* =========================================================
   효과음 (파일 없이 브라우저에서 만듦) · 사이트 소리 버튼을 따라감
   ========================================================= */
const sfx = (() => {
    let ac = null, noiseBuf = null;
    const isMuted = () => typeof muted !== 'undefined' && muted;   // script.js 의 소리 끄기
    function getAc() {
        if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
        if (ac.state === 'suspended') ac.resume();
        return ac;
    }
    function tone({ type = 'square', f = 440, f2 = 0, t = 0, dur = 0.1, vol = 0.08, vib = 0 }) {
        if (isMuted()) return; const a = getAc(); if (!a) return;
        const now = a.currentTime + t, o = a.createOscillator(), g = a.createGain();
        o.type = type; o.frequency.setValueAtTime(f, now);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur);
        if (vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = vib; lg.gain.value = f * 0.05; l.connect(lg).connect(o.frequency); l.start(now); l.stop(now + dur + 0.05); }
        g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(vol, now + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        o.connect(g).connect(a.destination); o.start(now); o.stop(now + dur + 0.05);
    }
    function noise({ t = 0, dur = 0.05, vol = 0.08, f = 2000, type = 'bandpass' }) {
        if (isMuted()) return; const a = getAc(); if (!a) return;
        if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
        const now = a.currentTime + t, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
        s.buffer = noiseBuf; fl.type = type; fl.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(vol, now + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        s.connect(fl).connect(g).connect(a.destination); s.start(now); s.stop(now + dur + 0.05);
    }
    return {
        unlock: () => { if (!isMuted()) getAc(); },
        flip:   () => { noise({ dur: 0.03, vol: 0.06, f: 1500 }); tone({ f: 140, f2: 90, dur: 0.05, vol: 0.05 }); },
        bumper: () => tone({ f: 720, f2: 320, dur: 0.08, vol: 0.06 }),
        sling:  () => tone({ type: 'triangle', f: 1000, f2: 700, dur: 0.04, vol: 0.07 }),
        ouch:   imp => { noise({ dur: 0.07, vol: 0.12, f: 380, type: 'lowpass' }); tone({ type: 'sawtooth', f: 760 + Math.random() * 160, f2: 230, dur: 0.24, vol: 0.06, vib: 24 }); },
        squeak: () => tone({ type: 'square', f: 1400 + Math.random() * 300, f2: 700, dur: 0.12, vol: 0.04, vib: 30 }),
        lane:   () => tone({ f: 1320, dur: 0.05, vol: 0.04 }),
        target: () => { tone({ f: 230, f2: 110, dur: 0.08, vol: 0.07 }); noise({ dur: 0.02, vol: 0.05, f: 3000 }); },
        tick:   () => noise({ dur: 0.015, vol: 0.05, f: 4000, type: 'highpass' }),
        orbit:  () => [400, 600, 800, 1000, 1200].forEach((f, i) => tone({ type: 'triangle', f, t: i * 0.04, dur: 0.08, vol: 0.05 })),
        thunk:  () => { tone({ f: 160, f2: 60, dur: 0.12, vol: 0.09 }); noise({ dur: 0.05, vol: 0.06, f: 600, type: 'lowpass' }); },
        pew:    () => tone({ type: 'square', f: 300, f2: 1600, dur: 0.15, vol: 0.05 }),
        mission:() => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone({ f, t: i * 0.08, dur: 0.12, vol: 0.05 })),
        jingle: () => [523, 659, 784, 1047].forEach((f, i) => tone({ f, t: i * 0.07, dur: 0.1, vol: 0.05 })),
        breakdown: () => [392, 370, 349, 330, 294].forEach((f, i) => tone({ type: 'triangle', f, t: i * 0.16, dur: i === 4 ? 0.6 : 0.18, vol: 0.09, vib: i === 4 ? 6 : 0 })),
        drain:  () => [[196, 0, 0.28], [185, 0.3, 0.28], [175, 0.6, 0.28], [165, 0.9, 0.9]].forEach(([f, t, dur], i) => tone({ type: 'triangle', f, t, dur, vol: 0.1, vib: i === 3 ? 5 : 0 })),
        launch: () => noise({ dur: 0.2, vol: 0.09, f: 900 }),
        save:   () => [784, 988].forEach((f, i) => tone({ f, t: i * 0.08, dur: 0.08, vol: 0.04 })),
    };
})();

// 다른 코드에서 쓸 수 있게 (예: PepePinball.newGame())
window.PepePinball = { newGame };
})();
