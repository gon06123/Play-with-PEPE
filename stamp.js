// =========================================================
//  Stamp : 바탕화면에 페페 스티커 붙이기
//  - 바탕화면 Stamp 아이콘(data-action="stamp")을 더블클릭하면 스탬프 모드 켜짐
//  - script.js 는 건드리지 않아도 돼요 (script.js 다음 줄에서 불러오기)
//  - 사이트 소리 버튼(음소거)을 그대로 따라가요
//
//  조작 : 클릭           = 그 자리에 스티커 붙이기
//         마우스 휠       = 스티커 바꾸기 (맨 끝에 지우개 : 누른 채 문지르면 지워짐)
//         오른쪽 클릭      = 스탬프 모드 끄기 (Esc 는 전체화면이 풀려서 안 씀)
//  창·작업표시줄 위에서는 평소처럼 쓸 수 있고, 바탕화면 위에서만 스티커가 붙어요
// =========================================================
(() => {
'use strict';

const desktop = document.getElementById('desktop');
const icon = document.querySelector('.icon[data-action="stamp"]');
if (!desktop || !icon) return;

/* ▼ 탄산음료 캔 (픽셀 그림 : 글자 하나 = 한 칸 · 옛날 윈도우 아이콘처럼 밝은 면/그림자) */
const SODA_PIXELS = [
    '.....KKKKKKKKKK.....',
    '...KKWWWWSSSSSSKK...',
    '..KWWSSSSSDDSSSSGK..',
    '..KWSSSSSSSSSSSGGK..',
    '..KKKKKKKKKKKKKKKK..',
    '.KPWPRRRRRRRRRRMMDK.',
    '.KPWPRRRRRRRRRRMMDK.',
    '.KPWPRRRRRRRRRRMMDK.',
    '.KPWPRWWWRRRRRRMMDK.',
    '.KPWPWWRRWWRRRRMMDK.',
    '.KPWPWRRRRWWRRWMMDK.',
    '.KPWPRRRRRRWWWWMMDK.',
    '.KPWPRRRRRRRRRRMMDK.',
    '.KPWPRRRRRRRRRRMMDK.',
    '.KPWPRRRRRRRRRRMMDK.',
    '.KPWPRRRRRRRRRRMMDK.',
    '.KPWPRRRRRRRRRRMMDK.',
    '.KPWPRRRRRRRRRRMMDK.',
    '.KPWPRRRRRRRRRRMMDK.',
    '.KPWPRRRRRRRRRRMMDK.',
    '..KKKKKKKKKKKKKKKK..',
    '..KWSSSSSSSSSSSGGK..',
    '...KKSSSSSSSSSSKK...',
    '.....KKKKKKKKKK.....',
];
const SODA_COLORS = {
    K: '#000', W: '#fff', S: '#c3c3c3', G: '#808080', D: '#404040',   // 테두리·뚜껑
    R: '#e00000', P: '#ff7070', M: '#8f0000',                          // 빨강 · 밝은 면 · 그림자
};
const SODA = 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SODA_PIXELS[0].length} ${SODA_PIXELS.length}" shape-rendering="crispEdges">` +
    SODA_PIXELS.flatMap((row, y) => [...row].map((c, x) =>
        SODA_COLORS[c] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${SODA_COLORS[c]}"/>` : '')).join('') +
    `</svg>`);

/* ▼ 스티커 목록 : 그림 경로만 한 줄씩 추가 (배경이 투명한 png 가 제일 예쁨)
     { src: '경로', roll: true } 로 적으면 붙이는 대신 데굴데굴 굴러 떨어져서 화면 바닥에 멈춤
     { src: SODA, pour: true }   = 붙이는 대신 콜라를 쏟음 (픽셀이 화면 바닥으로 흘러내려 쌓임)
     { src: '경로', erase: true } = 지우개 (누른 채 문지르면 스티커·콜라가 지워짐)
     size : 그 스티커만 크기 따로 (rem, 안 적으면 SIZE) */
const STICKERS = [
    { src: SODA, pour: true, size: 4 },
    'images/pinball-pepe-happy.png',                            // 웃는 페페
    { src: 'images/pinball-pepe-mini-idle.png', roll: true },   // 웃는 페페 (작은 거)
    'images/pinball-pepe-cry.png',                              // 억울한 페페
    { src: 'images/pinball-pepe-mini-hit.png',  roll: true },   // 억울한 페페 (작은 거)
    { src: 'images/icon-eraser.png', erase: true, size: 3.5 },
].map(s => typeof s === 'string' ? { src: s } : s);
const ERASE = 2.5;     // 지우개가 지우는 반지름 (rem)
const SIZE = 7;        // 스티커 크기 (rem)
const TILT = 12;       // 붙일 때 랜덤으로 기울어지는 최대 각도 (0 = 똑바로)

/* ▼ 굴러 떨어지는 스티커 */
const ROLL = {
    gravity: 2600,     // 떨어지는 힘 (px/초²)
    push: [150, 380],  // 처음 옆으로 굴러가는 속도 범위 (방향은 랜덤)
    hop: 350,          // 처음 살짝 튀어 오르는 힘
    bounce: 0.45,      // 바닥에서 튕기는 정도 (0 = 안 튕김, 1 = 그대로 튕김)
    friction: 260,     // 바닥에서 느려지는 정도 (클수록 빨리 멈춤)
};

/* ▼ 콜라 쏟기 : 줄줄 흘러내려 바닥에 고이고, 물처럼 수평을 맞추며 옆으로 퍼짐 */
const SPILL = {
    pixel: 0.25,       // 픽셀 한 칸 크기 (rem)
    amount: [400, 550],// 한 번 쏟을 때 픽셀 개수 범위
    time: 0.8,         // 다 쏟아지는 데 걸리는 시간 (초)
    gravity: 2600,     // 떨어지는 힘 (px/초², 굴러가는 스티커와 같음)
    spray: 20,         // 줄기가 옆으로 흔들리는 정도 (px/초, 작을수록 가는 물줄기)
    thin: 3,           // 웅덩이가 이 두께(칸)가 될 때까지 옆으로 퍼짐 (작을수록 넓고 얇게)
    speed: 4,          // 퍼지는 속도 (한 프레임에 수평 맞추기 몇 번)
    reach: 40,         // 평평한 곳에서 더 낮은 데를 찾아보는 거리 (칸)
    color: '#7a3c12',  // 떨어지는 중인 콜라
    foam: '#e0bd92',   // 맨 위 한 칸 = 거품
    colors: ['#a0581c', '#7a3c12', '#6b3410', '#5a2a0b', '#4a2208'],   // 위 → 아래 (깊을수록 진함)
    bubbles: 0.04,     // 픽셀이 내려앉을 때 거품이 뽀글 올라올 확률
};

/* =========================================================
   화면 만들기
   ========================================================= */
// 붙인 스티커가 들어가는 층 : 바탕화면 그림 위, 아이콘 아래
const layer = document.createElement('div');
layer.id = 'stamp-layer';
desktop.prepend(layer);

// 콜라 픽셀 캔버스 2장 (스티커보다 아래) : 바닥에 쌓인 것 / 떨어지는 중인 것
const sodaCanvas = document.createElement('canvas');
const flyCanvas = document.createElement('canvas');
sodaCanvas.className = flyCanvas.className = 'soda-canvas';
layer.append(sodaCanvas, flyCanvas);
const sodaCtx = sodaCanvas.getContext('2d');
const flyCtx = flyCanvas.getContext('2d');

// 마우스를 따라다니는 스티커 (= 커서)
const cursor = document.createElement('img');
cursor.id = 'stamp-cursor';
cursor.alt = '';
document.body.appendChild(cursor);

// 안내 글 (스탬프 모드일 때만 화면 아래에)
const hint = document.createElement('div');
hint.id = 'stamp-hint';
hint.className = 'bevel';
hint.textContent = '클릭 = 붙이기 · 휠 = 스티커/지우개 바꾸기 · 오른쪽 클릭 = 그만';
document.body.appendChild(hint);

// 그림 미리 불러두기 (휠 돌릴 때 깜빡이지 않게)
STICKERS.forEach(s => { new Image().src = s.src; });

let on = false;
let cur = 0;
let lastWheel = 0;

const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
const sfx = (notes, opt) => { if (typeof tones === 'function') tones(notes, opt); };   // script.js 의 효과음

// 마우스가 바탕화면 위인지 (창·작업표시줄·시작 메뉴 위가 아닌지)
function onDesktop(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return !!el && desktop.contains(el) && !el.closest('.window, #sound-btn');
}

/* =========================================================
   켜기 / 끄기
   ========================================================= */
function setStamp(v) {
    on = v;
    document.body.classList.toggle('stamping', on);
    if (on) {
        setCursor();
        icons().forEach(i => i.classList.remove('selected'));
        sfx([[660, 0], [990, 0.07]], { dur: 0.12 });
    } else {
        sfx([[990, 0], [660, 0.07]], { dur: 0.12 });
    }
}
const icons = () => document.querySelectorAll('.icon');

// 커서를 지금 고른 스티커로 (크기는 스티커마다 따로 정할 수 있음)
function setCursor() {
    cursor.src = STICKERS[cur].src;
    cursor.style.width = (STICKERS[cur].size || SIZE) + 'rem';
}

icon.addEventListener('dblclick', () => setStamp(!on));

/* =========================================================
   스탬프 모드 조작
   ========================================================= */
function moveCursor(e) {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    // 창·작업표시줄 위에선 스티커 커서 숨기고 원래 커서
    cursor.classList.toggle('away', !onDesktop(e));
}
let erasing = false;   // 지우개를 누른 채 문지르는 중
addEventListener('pointermove', e => {
    if (!on) return;
    moveCursor(e);
    if (!erasing) return;
    if (onDesktop(e)) erase(e);
    else lastErase = null;   // 창 위를 지나갈 땐 끊었다가 다시 이어서
});
addEventListener('mouseup', () => { erasing = false; lastErase = null; });

// 바탕화면 클릭 = 붙이기 (아이콘 선택·드래그보다 먼저 가로챔)
addEventListener('mousedown', e => {
    if (!on) return;
    if (e.button === 2) { e.preventDefault(); setStamp(false); return; }
    if (e.button !== 0 || !onDesktop(e)) return;
    e.preventDefault();
    e.stopPropagation();
    stamp(e);
}, true);
// 붙일 때 아이콘 클릭(선택·효과음)도 막기
addEventListener('click', e => { if (on && onDesktop(e)) e.stopPropagation(); }, true);
addEventListener('dblclick', e => { if (on && onDesktop(e)) e.stopPropagation(); }, true);
addEventListener('contextmenu', e => { if (on) e.preventDefault(); });

function stamp(e) {
    const r = desktop.getBoundingClientRect();
    const rem = remPx();
    if (STICKERS[cur].pour) return spill(e.clientX - r.left, e.clientY - r.top);
    if (STICKERS[cur].erase) { erasing = true; lastErase = null; return erase(e); }

    const s = document.createElement('img');
    s.className = 'stamp';
    s.src = STICKERS[cur].src;
    s.alt = '';
    // rem 단위로 저장 → 창 크기가 바뀌어도 같은 자리
    s.style.left = (e.clientX - r.left) / rem + 'rem';
    s.style.top = (e.clientY - r.top) / rem + 'rem';
    s.style.width = (STICKERS[cur].size || SIZE) + 'rem';
    s.style.setProperty('--tilt', ((Math.random() * 2 - 1) * TILT).toFixed(1) + 'deg');
    layer.appendChild(s);

    if (STICKERS[cur].roll) {
        s.classList.add('rolling');
        s.decode().catch(() => {}).then(() => roll(s, e.clientX - r.left, e.clientY - r.top));
        sfx([[420, 0], [300, 0.06]], { dur: 0.08 });   // 또르르
    } else {
        sfx([[180, 0]], { type: 'square', vol: 0.12, dur: 0.08, sharp: true });   // 쿵
    }
}

/* =========================================================
   콜라 쏟기 : 캔이 기울어짐 → 줄줄 흘러 화면 바닥에 고임 → 물처럼 수평을 맞추며 퍼짐
   (좌표는 바탕화면 기준 px · 바닥에 쌓인 건 "칸" 단위로 저장해서 창 크기가 바뀌어도 그대로)
   ========================================================= */
const rand = (a, b) => a + Math.random() * (b - a);

// 바닥 = 지금 보이는 화면의 맨 아래 (작업표시줄 바로 위) · 굴러가는 스티커와 같은 바닥
function floorPx() {
    const screenEl = document.getElementById('screen') || desktop;
    return screenEl.getBoundingClientRect().bottom - desktop.getBoundingClientRect().top;
}
const cellPx = () => SPILL.pixel * remPx();                // 픽셀 한 칸 크기 (px)
const floorRow = cs => Math.floor(floorPx() / cs) - 1;     // 맨 아래 칸 줄 번호
const lastCol = cs => Math.floor(desktop.clientWidth / cs) - 1;

// 바닥에 고인 콜라 : 칸x → 높이(칸 수)
const sodaCols = new Map();
const height = cx => sodaCols.get(cx) || 0;
const setHeight = (cx, h) => { if (h > 0) sodaCols.set(cx, h); else sodaCols.delete(cx); };

// 한 줄(세로) 다시 그리기 : 맨 위 한 칸은 거품, 아래로 갈수록 진한 콜라색
function drawCol(cx, cs, fy) {
    const dpr = devicePixelRatio || 1;
    const x0 = Math.round(cx * cs * dpr), w = Math.round((cx + 1) * cs * dpr) - x0;
    sodaCtx.clearRect(x0, 0, w, sodaCanvas.height);
    const h = height(cx);
    for (let k = 0; k < h; k++) {
        const y0 = Math.round((fy - k) * cs * dpr), hh = Math.round((fy - k + 1) * cs * dpr) - y0;
        const fromTop = h - 1 - k;
        sodaCtx.fillStyle = fromTop ? SPILL.colors[Math.min(fromTop - 1, SPILL.colors.length - 1)] : SPILL.foam;
        sodaCtx.fillRect(x0, y0, w, hh);
    }
}

// 캔버스를 바탕화면 크기에 맞추고 다시 그림 (창 크기가 바뀌면 새 바닥 위로)
function fitSoda() {
    const dpr = devicePixelRatio || 1;
    flyCanvas.width = sodaCanvas.width = Math.round(layer.clientWidth * dpr);
    flyCanvas.height = sodaCanvas.height = Math.round(layer.clientHeight * dpr);
    const cs = cellPx(), fy = floorRow(cs);
    sodaCols.forEach((col, cx) => drawCol(cx, cs, fy));
}
addEventListener('resize', fitSoda);
fitSoda();

// 바닥(또는 고인 콜라 위)에 떨어짐 : 일단 그 자리에 한 칸 고이고, 퍼지는 건 flowStep 이 함
function land(cx, cs, fy) {
    setHeight(cx, height(cx) + 1);
    drawCol(cx, cs, fy);

    // 가끔 거품이 뽀글 올라왔다 톡 터짐
    if (Math.random() < SPILL.bubbles) {
        const rem = remPx(), b = document.createElement('b');
        b.className = 'soda-bubble';
        b.style.left = (cx + 0.5) * cs / rem + 'rem';
        b.style.top = (fy - height(cx) + 1) * cs / rem + 'rem';
        b.style.setProperty('--s', rand(0.3, 0.6).toFixed(2) + 'rem');
        b.addEventListener('animationend', () => b.remove());
        layer.appendChild(b);
    }
}

// 물처럼 수평 맞추기 : 줄마다 맨 위 한 칸이 옆쪽 더 낮은 곳으로 흘러감
//  - 바로 옆이 2칸 이상 낮으면 그쪽으로
//  - 바로 옆이 1칸 낮으면 그 평평한 곳을 따라가 보다가 더 낮은 데가 있으면 거기로 (그래서 윗면이 평평해짐)
//  - 빈 바닥으로는 웅덩이가 thin 보다 두꺼울 때만 퍼짐 (안 그러면 끝없이 얇아짐)
function flowStep(cs, fy, max) {
    let moved = false;
    const cols = [...sodaCols.keys()];
    for (let i = cols.length - 1; i > 0; i--) {   // 순서 섞기 (한쪽으로만 쏠리지 않게)
        const j = Math.floor(Math.random() * (i + 1));
        [cols[i], cols[j]] = [cols[j], cols[i]];
    }
    for (const cx of cols) {
        const h = height(cx);
        if (!h) continue;
        for (const d of Math.random() < 0.5 ? [-1, 1] : [1, -1]) {
            let to = -1;
            for (let j = 1; j <= SPILL.reach; j++) {
                const nx = cx + d * j;
                if (nx < 0 || nx > max) break;
                const n = height(nx);
                if (n >= h) break;                                         // 벽처럼 높은 곳 → 못 감
                if (n ? n <= h - 2 : h > SPILL.thin) { to = nx; break; }   // 더 낮은 곳 찾음
                if (!n || n !== h - 1) break;                              // 평평하게 이어지는 동안만 계속 찾아봄
            }
            if (to < 0) continue;
            setHeight(cx, h - 1);
            setHeight(to, height(to) + 1);
            drawCol(cx, cs, fy);
            drawCol(to, cs, fy);
            moved = true;
            break;
        }
    }
    return moved;
}

// 떨어지는 픽셀들 · 쏟는 중인 캔들 · 퍼지는 웅덩이 : 매 프레임 한 번에 움직임
let flying = [], pours = [], ticking = false, lastTick = 0;
function wake() {
    if (ticking) return;
    ticking = true;
    lastTick = performance.now();
    requestAnimationFrame(tick);
}
function tick(t) {
    const dt = Math.min(0.04, (t - lastTick) / 1000);
    lastTick = t;
    const cs = cellPx(), fy = floorRow(cs), max = lastCol(cs), right = (max + 1) * cs - 0.01;

    // 캔에서 이번 프레임 몫만큼 줄줄 흘러나옴
    pours = pours.filter(p => {
        for (let i = 0; i < p.perFrame && p.left > 0; i++, p.left--) {
            flying.push({ x: p.x + rand(-1, 1), y: p.y + rand(-2, 2), vx: rand(-SPILL.spray, SPILL.spray), vy: rand(-40, 0) });
        }
        return p.left > 0;
    });

    // 떨어지다가 쌓인 콜라 위(또는 바닥)에 닿으면 내려앉음
    flying = flying.filter(p => {
        p.vy += SPILL.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 0)     { p.x = 0;     p.vx = Math.abs(p.vx) * 0.5; }
        if (p.x > right) { p.x = right; p.vx = -Math.abs(p.vx) * 0.5; }
        const cx = Math.floor(p.x / cs);
        if (p.y < (fy - height(cx)) * cs) return true;
        land(cx, cs, fy);
        return false;
    });

    // 고인 콜라가 옆으로 퍼짐
    let flowing = false;
    for (let i = 0; i < SPILL.speed; i++) flowing = flowStep(cs, fy, max) || flowing;

    // 떨어지는 중인 픽셀 그리기
    const dpr = devicePixelRatio || 1, s = Math.max(1, Math.round(cs * dpr));
    flyCtx.clearRect(0, 0, flyCanvas.width, flyCanvas.height);
    flyCtx.fillStyle = SPILL.color;
    flying.forEach(p => flyCtx.fillRect(Math.round(p.x * dpr), Math.round(p.y * dpr), s, s));

    if (flying.length || pours.length || flowing) requestAnimationFrame(tick);
    else ticking = false;
}

/* =========================================================
   지우개 : 지나간 길을 따라 동그라미(ERASE 반지름) 안의 콜라 픽셀과 닿은 스티커를 지움
   (마우스를 빨리 움직여도 중간이 안 빠지게, 지난번 자리부터 촘촘히 이어서 지움)
   ========================================================= */
let lastSquish = 0, lastErase = null;
function erase(e) {
    const r = desktop.getBoundingClientRect();
    const rad = ERASE * remPx();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const from = lastErase || { x, y };
    const steps = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / (rad / 3)));
    let hit = false;
    for (let i = 1; i <= steps; i++) {
        hit = eraseAt(from.x + (x - from.x) * i / steps, from.y + (y - from.y) * i / steps, rad, r) || hit;
    }
    lastErase = { x, y };
    if (!hit) return;

    wake();   // 지운 자리로 옆 콜라가 흘러들어옴
    // 쓱쓱 소리 (너무 자주 안 나게)
    const now = performance.now();
    if (now - lastSquish > 90) {
        lastSquish = now;
        sfx([[rand(700, 900), 0]], { type: 'square', vol: 0.04, dur: 0.03, sharp: true });
    }
}

// 한 자리 지우기 (x, y = 바탕화면 기준 px) · 뭔가 지웠으면 true
function eraseAt(x, y, rad, r) {
    let hit = false;

    // 스티커 : 지우개 동그라미가 스티커 네모에 닿으면 톡 사라짐
    layer.querySelectorAll('.stamp').forEach(s => {
        const b = s.getBoundingClientRect();
        const nx = Math.max(b.left - r.left, Math.min(x, b.right - r.left));
        const ny = Math.max(b.top - r.top, Math.min(y, b.bottom - r.top));
        if (Math.hypot(x - nx, y - ny) > rad) return;
        s.remove();
        hit = true;
    });

    // 콜라 : 동그라미 안에 들어온 칸만큼 그 줄을 낮춤
    const cs = cellPx(), fy = floorRow(cs);
    for (let cx = Math.floor((x - rad) / cs); cx <= Math.floor((x + rad) / cs); cx++) {
        const h = height(cx);
        let gone = 0;
        for (let k = 0; k < h; k++) if (Math.hypot((cx + 0.5) * cs - x, (fy - k + 0.5) * cs - y) <= rad) gone++;
        if (!gone) continue;
        setHeight(cx, h - gone);
        drawCol(cx, cs, fy);
        hit = true;
    }

    // 떨어지는 중인 픽셀도
    const before = flying.length;
    flying = flying.filter(p => Math.hypot(p.x - x, p.y - y) > rad);
    return hit || flying.length < before;
}

function spill(x, y) {
    // 커서 캔이 꼴깍 기울어짐
    cursor.classList.remove('swap', 'tip');
    void cursor.offsetWidth;
    cursor.classList.add('tip');

    if (!sodaCanvas.width) fitSoda();

    // 매 프레임 몇 개씩 쏟아져 나와서 줄줄 흘러내리는 느낌
    const left = Math.round(rand(...SPILL.amount));
    pours.push({ x, y, left, perFrame: Math.ceil(left / (SPILL.time * 60)) });
    wake();
    fizz();
}

// 치이익 소리 (높은 잡음이 점점 작아짐) · 사이트 소리 버튼을 따름
let fizzCtx = null;
function fizz() {
    if (typeof muted !== 'undefined' && muted) return;
    try { fizzCtx = fizzCtx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const ac = fizzCtx, len = Math.floor(ac.sampleRate * 1.2);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
        // 잡음 + 가끔 톡톡 튀는 소리
        const pop = Math.random() < 0.002 ? 4 : 1;
        d[i] = (Math.random() * 2 - 1) * pop * Math.pow(1 - i / len, 2);
    }
    const src = ac.createBufferSource(), hp = ac.createBiquadFilter(), g = ac.createGain();
    hp.type = 'highpass';
    hp.frequency.value = 3500;
    g.gain.value = 0.18;
    src.buffer = buf;
    src.connect(hp).connect(g).connect(ac.destination);
    src.start();
}

/* =========================================================
   굴러 떨어지기 : 떨어짐 → 보이는 화면 바닥에서 통통 튕김 → 옆으로 데굴데굴 굴러가다 멈춤
   (좌표는 바탕화면 기준 px, 그릴 때만 rem 으로 바꿈)
   ========================================================= */
function roll(s, x, y) {
    const w = s.offsetWidth, h = s.offsetHeight || w;
    const floor = floorPx() - h / 2;
    const right = desktop.clientWidth - w / 2, left = w / 2;
    const [p1, p2] = ROLL.push;
    let vx = (p1 + Math.random() * (p2 - p1)) * (Math.random() < 0.5 ? -1 : 1);
    let vy = -ROLL.hop;
    let rot = parseFloat(s.style.getPropertyValue('--tilt')) || 0;
    let last = performance.now();
    let bounces = 0;

    (function step(t) {
        const dt = Math.min(0.04, (t - last) / 1000);
        last = t;
        vy += ROLL.gravity * dt;
        x += vx * dt;
        y += vy * dt;

        // 바닥 : 튕기고, 닿아 있는 동안은 미끄러지며 느려짐
        if (y >= floor) {
            y = floor;
            if (vy > 120) {
                vy = -vy * ROLL.bounce;
                if (bounces++ < 3) sfx([[160 - bounces * 20, 0]], { type: 'square', vol: 0.06, dur: 0.05, sharp: true });   // 통
            } else {
                vy = 0;
            }
            const slow = ROLL.friction * dt;
            vx = Math.abs(vx) <= slow ? 0 : vx - Math.sign(vx) * slow;
        }
        // 양옆 벽에 부딪히면 반대로
        if (x < left)  { x = left;  vx = Math.abs(vx) * 0.6; }
        if (x > right) { x = right; vx = -Math.abs(vx) * 0.6; }

        // 굴러간 거리만큼 회전 (바퀴처럼)
        rot += (vx * dt) / (w / 2) * 180 / Math.PI;

        const rem = remPx();
        s.style.left = x / rem + 'rem';
        s.style.top = y / rem + 'rem';
        s.style.setProperty('--tilt', rot.toFixed(1) + 'deg');

        if (y < floor || vy !== 0 || vx !== 0) requestAnimationFrame(step);
    })(last);
}

// 휠 = 스티커 바꾸기 (스탬프 모드일 땐 바탕화면 스크롤 안 됨)
addEventListener('wheel', e => {
    if (!on) return;
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheel < 90 || !e.deltaY) return;   // 터치패드로 너무 빨리 넘어가지 않게
    lastWheel = now;
    cur = (cur + (e.deltaY > 0 ? 1 : -1) + STICKERS.length) % STICKERS.length;
    setCursor();
    cursor.classList.remove('swap', 'tip');
    void cursor.offsetWidth;
    cursor.classList.add('swap');
    sfx([[520 + cur * 40, 0]], { dur: 0.05 });
}, { passive: false });

setCursor();
})();
