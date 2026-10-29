// =========================================================
//  Punch : 비명 → 한 대 → 울음 (원본 : uxmedia6week 파트5)
//  - index.html 의 <div id="punch-root"> 안에 화면을 자동으로 만들어요
//  - script.js 는 건드리지 않아도 돼요 (script.js 다음 줄에서 불러오기)
//  - 사이트 소리 버튼(음소거)을 그대로 따라가요
//
//  창 테두리 없이 페페 그림 + 오른쪽 세로 소리 바만 떠요 (소리 바의 VOLUME 을 끌면 이동 · × = 닫기)
//
//  조작 : 페페 클릭할 때마다 다음 단계
//         1) 비명 : REEE 소리가 점점 커지고, 페페가 커지며 덜덜 떨고, 화면이 빨개짐
//         2) 한 대 : 펀치 소리 + 맞은 페페
//         3) 울음 : 우는 페페 + 울음소리 반복
//         4) 처음으로
// =========================================================
(() => {
'use strict';

const root = document.getElementById('punch-root');
if (!root) return;

/* ▼ 그림·소리 경로 : 파일만 바꾸면 돼요 */
const IMG_SCREAM = 'images/pepescream.png';
const IMG_BEATEN = 'images/pepebeaten.png';
const IMG_CRY    = 'images/pepecry.png';
const SND_REEE   = 'sounds/pepe-reee.mp3';
const SND_PUNCH  = 'sounds/soraatwod-punch-416719.mp3';
const SND_CRY    = 'sounds/banana-cat-cry.mp3';

/* ▼ 픽셀 글러브 그림 : 글자 하나 = 픽셀 한 칸 (. = 빈칸) · 색은 아래 GLOVE_COLORS */
const GLOVE_PIXELS = [
    '....KKKKKKK.....',
    '...KRRRRRRRK....',
    '..KRWWRRRRRRK...',
    '.KRWRRRRRRRRRK..',
    '.KRRRRRRRRRRRK..',
    'KKKRRRRRRRRRRK..',
    'KRRKRRRRRRRRRK..',
    'KRRRKRRRRRRRDK..',
    'KRRRRKRRRRRRDK..',
    '.KRRRRRRRRRDDK..',
    '..KDDRRRRRDDK...',
    '...KKDDDDDDK....',
    '...KCCCCCCCK....',
    '...KCCCCCGGK....',
    '...KCCCCCGGK....',
    '...KKKKKKKKK....',
];
const GLOVE_COLORS = { K: '#000', R: '#e00000', D: '#8f0000', W: '#ff8a8a', C: '#fff', G: '#c3c3c3' };
const GLOVE_SIZE = 96;            // 글러브 크기 (px 기준, 96 = 6rem)

const SCREAM_MS = 8000;           // 비명이 최대치(소리·크기·빨강)까지 가는 시간
const SCREAM_SCALE = 0.75;        // 최대일 때 커지는 양 (0.75 → 1.75배)
const SCREAM_RED = 0.85;          // 최대일 때 페페 위 빨간 덮개 진하기 (0 ~ 1)
const BURST_RED = 0.75;           // 창 밖으로 번지는 빨강의 최대 진하기 (0 ~ 1)
const BURST_START = 0.15;         // 비명이 이만큼(0 ~ 1) 진행된 뒤부터 창 밖으로 번지기 시작
const WIN_SHAKE = 0.6;            // 비명 칠 때 창 전체가 떨리는 세기 (0 = 안 떨림, 1 = 페페만큼)
const VOL_BASE = 70;              // 소리 크기 기본값 (0 ~ 100) · 바꾼 값은 브라우저에 저장됨
const VOL_KEY = 'punch-volume';   // 소리 크기 저장 이름

/* =========================================================
   화면 만들기
   ========================================================= */
// 픽셀 글러브 → svg 그림 (사진 파일 없이)
const GLOVE = 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">` +
    GLOVE_PIXELS.flatMap((row, y) => [...row].map((c, x) =>
        GLOVE_COLORS[c] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${GLOVE_COLORS[c]}"/>` : '')).join('') +
    `</svg>`);

root.innerHTML = `
    <div class="punch-stage">
        <div class="punch-pepe">
            <img src="${IMG_SCREAM}" alt="" class="on">
            <img src="${IMG_BEATEN}" alt="">
            <img src="${IMG_CRY}" alt="">
            <div class="punch-red"></div>
        </div>
        <img class="punch-glove" src="${GLOVE}" alt="">
    </div>
    <div class="punch-vol bevel">
        <button class="btn punch-x" type="button" title="닫기">×</button>
        <span class="punch-grip" title="끌어서 옮기기">VOLUME</span>
        <label class="punch-slider" title="VOLUME"><input type="range" min="0" max="100" step="1" value="${VOL_BASE}" aria-label="VOLUME"></label>
        <output>${VOL_BASE}</output>
    </div>`;

// 창을 뚫고 화면 전체로 번지는 빨강 (창 밖에 있어야 해서 body 에 붙임)
const burst = document.createElement('div');
burst.className = 'punch-burst';
document.body.appendChild(burst);

const win   = root.closest('.window');
const stage = root.querySelector('.punch-stage');
const pepe  = root.querySelector('.punch-pepe');
const imgs  = [...pepe.querySelectorAll('img')];   // 0 비명 · 1 맞음 · 2 울음
const red   = root.querySelector('.punch-red');
const glove = root.querySelector('.punch-glove');
show(0);

const reee = new Audio(SND_REEE);
reee.loop = true;
const punchSnd = new Audio(SND_PUNCH);
const crySnd = new Audio(SND_CRY);
crySnd.loop = true;
document.body.append(reee, punchSnd, crySnd);   // 페이지에 붙여 둬야 소리 버튼(전체 음소거)이 나는 중에도 바로 끔
const isMuted = () => typeof muted !== 'undefined' && muted;   // script.js 의 소리 끄기

const volIn  = root.querySelector('.punch-vol input');
const volOut = root.querySelector('.punch-vol output');

// 창 테두리·제목줄이 없어서 : 오른쪽 세로 소리 바의 "VOLUME" 을 끌면 이동, × 로 닫기 (script.js 의 창 기능)
if (win) {
    makeDraggable(win, root.querySelector('.punch-grip'));
    root.querySelector('.punch-x').addEventListener('click', () => closeWindow(win));
}

let state = 'initial';  // initial → screaming → beaten → cry → initial
let animId = null;
let screamStart = 0;
let master = VOL_BASE / 100;   // 소리 크기 (모든 소리에 곱해짐)

function show(n) {
    imgs.forEach((img, i) => img.classList.toggle('on', i === n));
    // 빨간 막은 지금 그림 모양대로만 (배경이 투명해서 네모로 빨개지지 않게)
    red.style.webkitMaskImage = red.style.maskImage = `url("${imgs[n].getAttribute('src')}")`;
}

/* =========================================================
   소리 크기 바
   ========================================================= */
function setVolume() {
    volOut.textContent = volIn.value;
    master = volIn.value / 100;
    crySnd.volume = master;   // 울음소리는 나는 중에도 바로 바뀜 (비명은 scream 에서 매 프레임 반영)
    try { localStorage.setItem(VOL_KEY, volIn.value); } catch (e) {}
}
try {
    const saved = localStorage.getItem(VOL_KEY);
    if (saved !== null) volIn.value = saved;
} catch (e) {}
volIn.addEventListener('input', setVolume);
setVolume();

function play(snd, vol = 1) {
    snd.currentTime = 0;
    snd.volume = vol * master;
    snd.muted = isMuted();
    snd.play().catch(() => {});
}

function stop(snd) {
    snd.pause();
    snd.currentTime = 0;
}

/* =========================================================
   비명 : 소리·크기·떨림·빨강이 SCREAM_MS 동안 점점 세짐 (최대치에서도 계속 떨림)
   ========================================================= */
function scream(t) {
    if (state !== 'screaming') return;
    if (!screamStart) screamStart = t;
    const p = Math.min((t - screamStart) / SCREAM_MS, 1);

    reee.volume = Math.min(0.01 + 0.99 * Math.pow(p, 1.4), 1) * master;   // 처음엔 아주 작게
    reee.muted = isMuted();

    red.style.opacity = (p * SCREAM_RED).toFixed(3);

    const shake = 2 + 10 * p;
    const x = (Math.random() - 0.5) * shake * 2;
    const y = (Math.random() - 0.5) * shake * 2;
    const r = (Math.random() - 0.5) * p * 5;
    pepe.style.transform =
        `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) ` +
        `scale(${(1 + SCREAM_SCALE * p).toFixed(3)}) rotate(${r.toFixed(2)}deg)`;
    // 창 전체 떨기 : 열기/닫기 모션(transform)과 안 겹치게 translate·rotate 속성을 따로 씀
    if (win) {
        win.style.translate = `${(x * WIN_SHAKE).toFixed(1)}px ${(y * WIN_SHAKE).toFixed(1)}px`;
        win.style.rotate = `${(r * WIN_SHAKE).toFixed(2)}deg`;
    }

    // 창 가운데에서 빨간 원이 점점 커져 화면 끝까지 뒤덮음
    const b = Math.max(0, (p - BURST_START) / (1 - BURST_START));
    if (b > 0) {
        const s = stage.getBoundingClientRect();
        const cx = s.left + s.width / 2, cy = s.top + s.height / 2;
        const from = Math.max(s.width, s.height) / 2;
        const to = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
        const rad = from + (to - from) * b * b;
        burst.style.background =
            `radial-gradient(circle at ${cx.toFixed(0)}px ${cy.toFixed(0)}px, ` +
            `#f00 0, #f00 ${(rad * 0.55).toFixed(0)}px, transparent ${rad.toFixed(0)}px)`;
        burst.style.opacity = (b * BURST_RED).toFixed(3);
    }

    animId = requestAnimationFrame(scream);
}

// 비명 효과 전부 즉시 원래대로
function resetScream() {
    cancelAnimationFrame(animId);
    animId = null;
    stop(reee);
    red.style.opacity = 0;
    pepe.style.transform = '';
    burst.style.opacity = 0;
    if (win) win.style.translate = win.style.rotate = '';
}

/* =========================================================
   클릭할 때마다 다음 단계
   ========================================================= */
function next() {
    if (state === 'initial') {
        state = 'screaming';
        stop(crySnd);
        show(0);
        play(reee, 0.01);
        screamStart = 0;
        animId = requestAnimationFrame(scream);
    } else if (state === 'screaming') {
        state = 'beaten';
        resetScream();
        play(punchSnd);
        show(1);
    } else if (state === 'beaten') {
        state = 'cry';
        show(2);
        play(crySnd);
    } else {
        state = 'initial';
        stop(crySnd);
        show(0);
    }
}

// 처음 상태로 (창을 닫으면 소리도 같이 멈춤)
function reset() {
    resetScream();
    stop(crySnd);
    state = 'initial';
    show(0);
}

stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    // 글러브가 앞으로 쭉 뻗었다 돌아옴
    glove.classList.remove('hit');
    void glove.offsetWidth;
    glove.classList.add('hit');
    next();
});

new IntersectionObserver(([en]) => { if (!en.isIntersecting) reset(); }).observe(root);

/* =========================================================
   글러브 커서 : 페페 칸 안에서만 마우스를 따라다님
   ========================================================= */
function moveGlove(e) {
    const r = stage.getBoundingClientRect();
    glove.style.left = (e.clientX - r.left) + 'px';
    glove.style.top = (e.clientY - r.top) + 'px';
}
stage.addEventListener('pointermove', moveGlove);
stage.addEventListener('pointerenter', e => { moveGlove(e); stage.classList.add('gloved'); });
stage.addEventListener('pointerleave', () => stage.classList.remove('gloved'));
glove.style.width = GLOVE_SIZE / 16 + 'rem';
})();
