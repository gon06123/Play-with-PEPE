// =========================================================
//  웬만하면 이 파일은 수정하지 않아도 됩니다.
//  아이콘·창 추가는 index.html 에서만 하면 자동으로 동작해요.
// =========================================================

let topZ = 10;
const tasks = document.getElementById('tasks');

// ---------- 창마다 제목줄 자동 생성 ----------
document.querySelectorAll('.window').forEach(win => {
    const bar = document.createElement('div');
    bar.className = 'title-bar';
    // 창에 data-close-only 를 적으면 _ □ 없이 × 만 (최소화·최대화 못 함)
    //       data-no-buttons 를 적으면 제목줄 버튼이 하나도 없음 (창 안의 버튼으로만 닫힘, Landwolf 메시지처럼)
    const noButtons = 'noButtons' in win.dataset;
    const closeOnly = noButtons || 'closeOnly' in win.dataset;
    bar.innerHTML = `
        <span class="title-text">${win.dataset.title || ''}</span>
        ${closeOnly ? '' : '<button class="btn btn-min"><i></i></button><button class="btn btn-max"><i></i></button>'}
        ${noButtons ? '' : '<button class="btn btn-close">×</button>'}`;
    win.prepend(bar);

    if (!noButtons) bar.querySelector('.btn-close').onclick = () => closeWindow(win);
    if (!closeOnly) {
        bar.querySelector('.btn-min').onclick = () => minimizeWindow(win);
        bar.querySelector('.btn-max').onclick = () => win.classList.toggle('maximized');
        bar.ondblclick = e => { if (!e.target.closest('.btn')) win.classList.toggle('maximized'); };
    }

    win.addEventListener('mousedown', () => focusWindow(win));
    makeDraggable(win, bar);
});

// ---------- 창 열기 / 닫기 / 최소화 / 포커스 ----------
function openWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    const wasOpen = win.classList.contains('open');
    win._anim?.cancel();          // 닫히는 중이었으면 닫기 취소
    win.classList.add('open');

    if (!win.taskBtn) {
        // 새로 열 때마다 화면 정중앙에 배치
        const area = document.getElementById('screen');
        win.style.left = Math.max(0, (area.clientWidth - win.offsetWidth) / 2) + 'px';
        win.style.top = Math.max(0, (area.clientHeight - win.offsetHeight) / 2) + 'px';

        const btn = document.createElement('button');
        btn.className = 'btn';
        // 같은 창을 여는 아이콘(바탕화면 → 없으면 시작 메뉴) 이미지를 작업표시줄 버튼에도 표시
        const iconImg = document.querySelector(`[data-window="${id}"] img`);
        if (iconImg) btn.appendChild(iconImg.cloneNode());
        btn.append(win.dataset.title || id);
        btn.onclick = () => {
            if (win.classList.contains('open') && win.classList.contains('active')) {
                if (!('closeOnly' in win.dataset || 'noButtons' in win.dataset)) minimizeWindow(win);   // 최소화 버튼 없는 창은 최소화 안 됨
            }
            else {
                // 최소화돼 있던 창 : 작업표시줄 버튼에서 튀어나옴
                if (!win.classList.contains('open')) { win.classList.add('open'); animateWindow(win, true, btn.getBoundingClientRect()); }
                focusWindow(win);
            }
        };
        tasks.appendChild(btn);
        win.taskBtn = btn;
    }
    focusWindow(win);
    if (!wasOpen) animateWindow(win, true, animSource(win));
}

function closeWindow(win) {
    const finish = () => {
        win.classList.remove('open', 'active', 'maximized');
        if (win.taskBtn) { win.taskBtn.remove(); win.taskBtn = null; }
        win._anim?.cancel();      // 끝 모습(작게 줄어든 상태)으로 멈춰 있던 모션 지우기
    };
    if (!win.classList.contains('open')) return finish();   // 최소화된 창은 모션 없이 바로
    animateWindow(win, false, animSource(win)).then(ok => ok && finish());
}

function minimizeWindow(win) {
    if (win.taskBtn) win.taskBtn.classList.remove('pressed');
    // 작업표시줄 버튼 쪽으로 들어감
    animateWindow(win, false, win.taskBtn ? win.taskBtn.getBoundingClientRect() : animSource(win)).then(ok => {
        if (!ok) return;
        win.classList.remove('open', 'active');
        win._anim.cancel();
    });
}

// ---------- 창 열기 / 닫기 모션 (열 때·닫을 때 매번 랜덤) ----------
// 모션 하나 = { k: 키프레임, t: 시간(ms), e: 속도 곡선, o: 기준점 }
// 열기 모션은 창이 "나타나는" 방향으로 적음. 닫기 모션은 창이 "사라지는" 방향으로 적음
const P3 = 'perspective(1200px) ';
const OPEN_FX = {
    outline: 'outline',                                                                     // 윈도우 95식 점선 외곽선
    pop:    { k: [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.75 }, { transform: 'scale(1)' }], t: 260, e: 'steps(5)' },   // 픽셀 팝업
    crt:    { k: [{ transform: 'scale(.05, .004)', filter: 'brightness(4)' }, { transform: 'scale(1, .004)', filter: 'brightness(3)', offset: 0.45 }, { transform: 'scale(1, 1)', filter: 'brightness(1)' }], t: 320 },   // 브라운관 켜기
    spin:   { k: [{ transform: 'scale(0) rotate(-540deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: 1 }], t: 450, e: 'steps(8)' },       // 빙글빙글 돌며 커짐 (뚝뚝 끊기게)
    coin:   { k: [{ transform: P3 + 'rotateY(90deg)' }, { transform: P3 + 'rotateY(0deg)' }], t: 350 },                                                      // 동전 뒤집기
    door:   { k: [{ transform: P3 + 'rotateY(-95deg)', opacity: 0 }, { transform: P3 + 'rotateY(0deg)', opacity: 1 }], t: 420, o: 'left center' },          // 문 열기
    jelly:  { k: [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.15, .85)', opacity: 1, offset: 0.4 }, { transform: 'scale(.92, 1.08)', offset: 0.6 },
                  { transform: 'scale(1.04, .96)', offset: 0.8 }, { transform: 'scale(1)' }], t: 500, e: 'linear' },                                             // 말랑 젤리
    drop:   { k: [{ transform: 'translateY(-110vh)', easing: 'steps(5)' }, { transform: 'translateY(0)', offset: 0.6, easing: 'steps(2)' }, { transform: 'translateY(-4rem)', offset: 0.75, easing: 'steps(2)' },
                  { transform: 'translateY(0)', offset: 0.88, easing: 'steps(1)' }, { transform: 'translateY(-1rem)', offset: 0.94, easing: 'steps(1)' }, { transform: 'translateY(0)' }], t: 650, e: 'linear' },   // 위에서 뚝뚝 떨어져 통통
    shake:  { k: [{ transform: 'scale(.5) translateX(0)', opacity: 0 }, { transform: 'scale(1) translateX(-1.5rem)', opacity: 1, offset: 0.3 }, { transform: 'scale(1) translateX(1.2rem)', offset: 0.45 },
                  { transform: 'scale(1) translateX(-.8rem)', offset: 0.6 }, { transform: 'scale(1) translateX(.5rem)', offset: 0.75 }, { transform: 'scale(1) translateX(0)' }], t: 450, e: 'linear' },   // 부르르 떨기
    pixel:  { k: [{ filter: 'blur(1.5rem) saturate(3)', opacity: 0, transform: 'scale(1.08)' }, { filter: 'blur(0) saturate(1)', opacity: 1, transform: 'scale(1)' }], t: 400, e: 'steps(6)' },   // 흐린 모자이크 → 선명
    glitch: { k: [{ opacity: 0, transform: 'translate(-2rem, 0) skewX(20deg)', filter: 'hue-rotate(90deg) saturate(4)' },
                  { opacity: 1, transform: 'translate(1.5rem, -.5rem) skewX(-15deg)', filter: 'invert(1)', offset: 0.25 },
                  { transform: 'translate(-1rem, .3rem) skewX(0deg)', filter: 'hue-rotate(-90deg) saturate(3)', offset: 0.5 },
                  { transform: 'translate(.5rem, 0) skewX(5deg)', filter: 'invert(.3)', offset: 0.75 },
                  { transform: 'translate(0, 0) skewX(0deg)', filter: 'none' }], t: 320, e: 'steps(4)' },                                                       // 지지직 글리치
    swirl:  { k: [{ transform: 'translate(-60vw, -60vh) rotate(-200deg) scale(.2)', opacity: 0 }, { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 }], t: 550, e: 'steps(7)' },   // 구석에서 회오리 (뚝뚝 끊기게)
};
const CLOSE_FX = {
    outline: 'outline',
    pop:       { k: [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.3)', opacity: 0 }], t: 180, e: 'steps(5)' },                                 // 툭 줄어듦
    crt:       { k: [{ transform: 'scale(1, 1)', filter: 'brightness(1)' }, { transform: 'scale(1, .004)', filter: 'brightness(3)', offset: 0.55 }, { transform: 'scale(0, .004)', filter: 'brightness(4)' }], t: 260 },   // 브라운관 끄기
    blackhole: { k: [{ transform: 'scale(1) rotate(0deg)', opacity: 1 }, { transform: 'scale(0) rotate(720deg)', opacity: 0 }], t: 450, e: 'steps(8)' },      // 빙글 돌며 점으로
    fall:      { k: [{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translateY(110vh) rotate(25deg)' }], t: 500, e: 'steps(5)' },                  // 아래로 뚝뚝 떨어짐
    fly:       { k: [{ transform: 'translateY(0) scale(1) rotate(0deg)', opacity: 1 }, { transform: 'translateY(-110vh) scale(.5) rotate(-20deg)', opacity: 0 }], t: 450, e: 'steps(5)' },   // 위로 뚝뚝 날아감
    coin:      { k: [{ transform: P3 + 'rotateY(0deg)' }, { transform: P3 + 'rotateY(90deg)' }], t: 280, e: 'ease-in' },                                     // 뒤집혀 사라짐
    door:      { k: [{ transform: P3 + 'rotateY(0deg)', opacity: 1 }, { transform: P3 + 'rotateY(95deg)', opacity: 0 }], t: 380, e: 'ease-in', o: 'right center' },   // 문 닫힘
    squash:    { k: [{ transform: 'scale(1, 1)' }, { transform: 'scale(1.2, .1)', offset: 0.6 }, { transform: 'scale(0, 0)' }], t: 350, e: 'ease-in' },          // 납작하게 눌림
    glitch:    { k: [...OPEN_FX.glitch.k].reverse().map(({ offset, ...f }) => f), t: 300, e: 'steps(4)' },                                                  // 지지직 꺼짐
    pixel:     { k: [{ filter: 'blur(0) saturate(1)', opacity: 1 }, { filter: 'blur(1.5rem) saturate(3)', opacity: 0 }], t: 350, e: 'steps(6)' },              // 모자이크로 흐려짐
};
const pickFx = list => { const v = Object.values(list); return v[Math.floor(Math.random() * v.length)]; };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;   // 컴퓨터 설정에서 모션 줄이기를 켠 사람은 모션 없음

// 창이 나오고 들어가는 곳 : 바탕화면 아이콘 → 없으면 작업표시줄 버튼 → 없으면 창 가운데 작은 점
function animSource(win) {
    const el = document.querySelector(`.icon[data-window="${win.id}"]:not([hidden])`) || win.taskBtn;
    if (el) return el.getBoundingClientRect();
    const r = win.getBoundingClientRect();
    return new DOMRect(r.left + r.width / 2 - 10, r.top + r.height / 2 - 10, 20, 20);
}

const rectFrame = r => ({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });

// 모션 실행 (목록에서 랜덤으로 하나). 끝까지 가면 true, 중간에 취소되면 false
// 창에 data-fx="crt" 처럼 적어 두면 랜덤 대신 그 모션으로 고정
function animateWindow(win, opening, from) {
    win._anim?.cancel();
    const list = opening ? OPEN_FX : CLOSE_FX;
    const fx = list[win.dataset.fx] || pickFx(list);
    let anim;
    if (reduceMotion) {
        anim = win.animate([{}, {}], { duration: 0 });
    } else if (fx === 'outline') {
        // 점선 상자가 아이콘 ↔ 창 크기로 4단계 뚝뚝 변하는 동안 창은 숨김
        const box = document.body.appendChild(document.createElement('div'));
        box.className = 'win-outline';
        const frames = [rectFrame(from), rectFrame(win.getBoundingClientRect())];
        if (!opening) frames.reverse();
        win.style.visibility = 'hidden';
        anim = box.animate(frames, { duration: 240, easing: 'steps(4)', fill: 'forwards' });
        // 끝나면 상자 지우고 창 다시 보이게 (닫기는 같은 순간에 창이 닫혀서 깜빡이지 않음)
        const done = () => { box.remove(); win.style.visibility = ''; };
        anim.finished.then(done, done);
    } else {
        // 창 자체를 움직임. 닫기는 끝 모습(사라진 상태)으로 멈춰 있다가 창이 닫힘
        win.style.transformOrigin = fx.o || '';
        anim = win.animate(fx.k, { duration: fx.t, easing: fx.e || 'ease-out', fill: opening ? 'none' : 'forwards' });
        const done = () => { win.style.transformOrigin = ''; };
        anim.finished.then(done, done);
    }
    win._anim = anim;
    return anim.finished.then(() => true, () => false);
}

function focusWindow(win) {
    document.querySelectorAll('.window').forEach(w => {
        w.classList.remove('active');
        if (w.taskBtn) w.taskBtn.classList.remove('pressed');
    });
    win.classList.add('active');
    win.style.zIndex = ++topZ;
    if (win.taskBtn) win.taskBtn.classList.add('pressed');
}

// ---------- 드래그로 창 이동 ----------
function makeDraggable(win, handle) {
    handle.addEventListener('mousedown', e => {
        if (e.target.closest('.btn') || win.classList.contains('maximized')) return;
        const dx = e.clientX - win.offsetLeft;
        const dy = e.clientY - win.offsetTop;

        function move(e) {
            win.style.left = (e.clientX - dx) + 'px';
            win.style.top = Math.max(0, e.clientY - dy) + 'px';
        }
        function up() {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
        }
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    });
}

// ---------- 아이콘 격자 (실제 윈도우처럼 칸에 맞춰 정렬) ----------
// 숫자 단위는 rem (1rem = 화면 너비 1%)
const GRID = {
    left: 0.8,   // 첫 번째 열의 왼쪽 여백
    top: 0.6,    // 첫 번째 행의 위쪽 여백
    w: 9.3,      // 열 간격 (칸 너비)
    h: 10.5      // 행 간격 (칸 높이)
};
const DRAG_STEP = 12;  // 드래그할 때 몇 px 씩 끊어서 움직일지 (클수록 더 벅벅함, 1 = 부드러움)

const desktop = document.getElementById('desktop');
const icons = [...document.querySelectorAll('.icon')];
const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

// 바탕화면에 들어가는 열·행 개수
function gridSize() {
    const r = remPx();
    const iw = icons[0].offsetWidth / r, ih = icons[0].offsetHeight / r;
    return {
        cols: Math.floor((desktop.clientWidth / r - GRID.left - iw) / GRID.w) + 1,
        rows: Math.floor((desktop.clientHeight / r - GRID.top - ih) / GRID.h) + 1
    };
}

function placeIcon(icon, col, row) {
    icon.col = col;
    icon.row = row;
    icon.style.left = (GRID.left + col * GRID.w) + 'rem';
    icon.style.top = (GRID.top + row * GRID.h) + 'rem';
}

// (x, y) 위치(rem)에서 가장 가까운 빈 칸 찾기
function nearestFreeCell(x, y, self) {
    const { cols, rows } = gridSize();
    const taken = new Set(icons.filter(i => i !== self && i.col != null)
                               .map(i => i.col + ',' + i.row));
    let best = null, bestD = Infinity;
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (taken.has(c + ',' + r)) continue;
            const d = (GRID.left + c * GRID.w - x) ** 2 + (GRID.top + r * GRID.h - y) ** 2;
            if (d < bestD) { bestD = d; best = { c, r }; }
        }
    }
    return best;
}

// 처음 위치 : HTML 의 data-col / data-row (1부터 시작)
icons.forEach(icon => {
    placeIcon(icon, (+icon.dataset.col || 1) - 1, (+icon.dataset.row || 1) - 1);
});

// 드래그로 아이콘 이동
icons.forEach(icon => {
    icon.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        const startX = e.clientX, startY = e.clientY;
        const baseL = icon.offsetLeft, baseT = icon.offsetTop;
        let dragging = false;

        function move(e) {
            const dx = e.clientX - startX, dy = e.clientY - startY;
            if (!dragging && Math.hypot(dx, dy) < 5) return;  // 살짝 움직인 건 클릭으로 처리
            dragging = true;
            icon.classList.add('dragging');
            // 픽셀 단위로 끊어서 움직여 레트로하게 뚝뚝 끊기는 느낌
            icon.style.left = (baseL + Math.round(dx / DRAG_STEP) * DRAG_STEP) + 'px';
            icon.style.top = (baseT + Math.round(dy / DRAG_STEP) * DRAG_STEP) + 'px';
            // 휴지통 위에 올리면 휴지통이 선택된 것처럼 표시
            if (icon !== bin) bin.classList.toggle('selected', overBin(e));
        }
        function up(e) {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
            if (!dragging) return;
            icon.classList.remove('dragging');
            if (icon !== bin && overBin(e)) {
                bin.classList.remove('selected');
                trashIcon(icon);
                return;
            }
            const r = remPx();
            const cell = nearestFreeCell(icon.offsetLeft / r, icon.offsetTop / r, icon);
            if (cell) placeIcon(icon, cell.c, cell.r);
            else placeIcon(icon, icon.col, icon.row); // 빈 칸 없으면 제자리
        }
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    });
});

// ---------- 휴지통 ----------
const bin = document.getElementById('recycle-bin');
const binImg = bin.querySelector('img');
const binEmptySrc = binImg.getAttribute('src');
const binList = document.getElementById('bin-list');
const binEmptyMsg = document.getElementById('bin-empty-msg');
const trashed = [];   // 버린 아이콘 목록

// 마우스가 휴지통 위에 있는지
function overBin(e) {
    const r = bin.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
}

// 버리기
function trashIcon(icon) {
    const win = document.getElementById(icon.dataset.window);
    if (win) closeWindow(win);
    icon.hidden = true;
    icon.classList.remove('selected');
    icon.oldCol = icon.col;
    icon.oldRow = icon.row;
    icon.col = icon.row = null;   // 칸 비워주기
    trashed.push(icon);
    updateBin();
}

// 복원 : 원래 칸 (차 있으면 가장 가까운 빈 칸)
function restoreIcon(icon) {
    trashed.splice(trashed.indexOf(icon), 1);
    icon.hidden = false;
    const cell = nearestFreeCell(GRID.left + icon.oldCol * GRID.w, GRID.top + icon.oldRow * GRID.h, icon);
    if (cell) placeIcon(icon, cell.c, cell.r);
    updateBin();
}

// 휴지통 창 목록 + 휴지통 아이콘 사진 갱신
function updateBin() {
    binList.innerHTML = '';
    trashed.forEach(icon => {
        const item = document.createElement('div');
        item.className = 'bin-item';
        item.append(icon.querySelector('img').cloneNode(), icon.querySelector('span').cloneNode(true));
        item.onclick = () => {
            binList.querySelectorAll('.bin-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
        };
        item.ondblclick = () => restoreIcon(icon);
        item.icon = icon;
        binList.appendChild(item);
    });
    binEmptyMsg.hidden = trashed.length > 0;
    binImg.src = trashed.length && bin.dataset.full ? bin.dataset.full : binEmptySrc;
}
// 꽉 찬 휴지통 사진이 없으면 빈 휴지통 사진 그대로
binImg.onerror = () => { if (binImg.getAttribute('src') !== binEmptySrc) binImg.src = binEmptySrc; };

document.getElementById('bin-restore').onclick = () => {
    const sel = binList.querySelector('.bin-item.selected');
    if (sel) restoreIcon(sel.icon);
};

document.getElementById('bin-clear').onclick = () => {
    trashed.forEach(icon => {
        icons.splice(icons.indexOf(icon), 1);
        icon.remove();
    });
    trashed.length = 0;
    updateBin();
};

// ---------- 아이콘: 클릭 = 선택, 더블클릭 = 열기 ----------
icons.forEach(icon => {
    icon.addEventListener('click', e => {
        e.stopPropagation();
        clickSound();
        icons.forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');
    });
    icon.addEventListener('dblclick', () => {
        if (icon.dataset.action === 'vapor') toggleVapor();   // Landwolf : 창 대신 보라색 필터
        else openWindow(icon.dataset.window);
    });
});

// ---------- 효과음 (파일 없이 브라우저가 직접 만듦, 사이트 소리 버튼을 따름) ----------
let dingCtx;

// 음 여러 개 울리기 : notes = [[주파수, 시작 시각(초)], ...], vol = 크기, dur = 한 음 길이(초)
// sharp = true 면 부드럽게 줄어들지 않고 뚝 끊김 (기계음)
function tones(notes, { type = 'triangle', vol = 0.15, dur = 0.35, sharp = false } = {}) {
    if (muted) return;
    dingCtx ??= new AudioContext();
    const t = dingCtx.currentTime;
    notes.forEach(([hz, delay]) => {
        const o = dingCtx.createOscillator(), g = dingCtx.createGain(), s = t + delay;
        o.type = type;
        o.frequency.value = hz;
        if (sharp) { g.gain.setValueAtTime(vol, s); g.gain.setValueAtTime(0, s + dur); }
        else {
            g.gain.setValueAtTime(0.0001, s);
            g.gain.exponentialRampToValueAtTime(vol, s + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
        }
        o.connect(g).connect(dingCtx.destination);
        o.start(s); o.stop(s + dur + 0.05);
    });
}

// 아이콘 클릭 : 옛날 컴퓨터 같은 "삐빅" (더블클릭하면 두 번)
const clickSound = () => tones([[1800, 0], [2400, 0.035]], { type: 'square', vol: 0.05, dur: 0.025, sharp: true });

// Landwolf 메시지 창 뜰 때 : 윈도우 오류창 "띠링" (라 → 미). 음 높이를 매번 살짝 바꿔서 연달아 떠도 덜 단조로움
const errorDing = () => { const k = 1 + (Math.random() - 0.5) * 0.12; tones([[880 * k, 0], [1318.5 * k, 0.06]], { vol: 0.18 }); };

// 로그인할 때 : 윈도우 시작음 비슷한 화음 (도 미 솔 도)
const startupSound = () => tones([[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45]], { dur: 1.4 });

// ---------- Landwolf : 화면 전체 보라색 필터 + 담배 권하는 메시지 창 ----------
// 더블클릭 → 메시지 창 1개. "거절" 누를 때마다 창이 2개 → 3개 → 4개… 씩 늘어남
// "받기" = 메시지 창 전부 닫히고 보라색 필터 켜짐 / 필터·창이 있을 때 다시 더블클릭 = 전부 끔
const vaporFilter = document.getElementById('vapor-filter');
const smokeTpl = document.getElementById('smoke-tpl');
const SMOKE_MAX = 60;      // 창이 너무 많으면 느려져서 최대 개수 제한
let smokeZ = 15001;        // 필터(15000)보다 위
let smokeNo = 0;           // 거절한 횟수

function spawnSmoke() {
    if (document.querySelectorAll('.smoke-msg').length >= SMOKE_MAX) return;
    const first = !document.querySelector('.smoke-msg');   // 처음 하나는 가운데, 나머지는 화면 안 아무 데나
    const win = smokeTpl.content.firstElementChild.cloneNode(true);
    document.body.appendChild(win);
    const W = innerWidth - win.offsetWidth, H = innerHeight - win.offsetHeight;
    win.style.left = (first ? W / 2 : Math.random() * W) + 'px';
    win.style.top = (first ? H / 2 : Math.random() * H) + 'px';
    win.style.zIndex = ++smokeZ;

    win.addEventListener('mousedown', () => win.style.zIndex = ++smokeZ);   // 누른 창이 맨 앞으로
    makeDraggable(win, win.querySelector('.title-bar'));
    win.querySelector('.smoke-yes').onclick = () => {                          // 받기 = 창 전부 닫히고 보라색 필터 켜짐
        document.querySelectorAll('.smoke-msg').forEach(closeSmoke);
        setVapor(true);
    };
    win.querySelector('.smoke-no').onclick = () => {
        smokeNo++;
        for (let i = 0; i <= smokeNo; i++) setTimeout(spawnSmoke, i * 80);   // 하나씩 차례로 튀어나옴
    };
    animateWindow(win, true, animSource(win));
    errorDing();
}

function closeSmoke(win) {
    animateWindow(win, false, animSource(win)).then(ok => ok && win.remove());
}

// Landwolf 더블클릭 : 필터나 메시지 창이 있으면 전부 끄고, 없으면 메시지 창 하나 (필터는 "받기" 눌러야 켜짐)
function toggleVapor() {
    smokeNo = 0;
    const busy = vaporFilter.classList.contains('on') || document.querySelector('.smoke-msg');
    if (busy) {
        setVapor(false);
        document.querySelectorAll('.smoke-msg').forEach(w => w.remove());
    } else spawnSmoke();
}

// 보라색 필터 + 취한 효과(화면 일렁임) 같이 켜고 끄기 (style.css 의 #vapor-filter.on / body.drunk)
function setVapor(on) {
    vaporFilter.classList.toggle('on', on);
    document.body.classList.toggle('drunk', on);
}

// 화면 아무 곳 클릭 → 선택 해제 + 시작메뉴 닫기
document.addEventListener('click', e => {
    if (e.target.id === 'desktop') {
        icons.forEach(i => i.classList.remove('selected'));
    }
    if (!e.target.closest('#start-menu') && !e.target.closest('#start-btn')) closeStartMenu();
});

// ---------- 시작 메뉴 ----------
const startBtn = document.getElementById('start-btn');
const startMenu = document.getElementById('start-menu');

startBtn.addEventListener('click', () => {
    startMenu.classList.toggle('open');
    startBtn.classList.toggle('pressed');
});

function closeStartMenu() {
    startMenu.classList.remove('open');
    startBtn.classList.remove('pressed');
}

startMenu.querySelectorAll('li[data-window]').forEach(li => {
    li.addEventListener('click', () => {
        openWindow(li.dataset.window);
        closeStartMenu();
    });
});

// ---------- 전원 끄기 ----------
const shutdownWin = document.getElementById('win-shutdownpepe');
const offScreen = document.getElementById('off-screen');

document.getElementById('shutdown-cancel').onclick = () => closeWindow(shutdownWin);

document.getElementById('shutdown-ok').onclick = () => {
    closeWindow(shutdownWin);
    window.close();   // 탭 닫기 시도 (브라우저가 막으면 아무 일도 안 일어남)
    // 탭이 안 닫혔으면 꺼진 화면 보여주기
    setTimeout(() => offScreen.hidden = false, 300);
};

// 꺼진 화면 클릭 → 다시 켜기 (새로고침)
offScreen.onclick = () => location.reload();

// ---------- 부팅 화면 : BIOS 글자 → 로그인 → (클릭) 전체화면 + 시작음 → 바탕화면 ----------
// 브라우저는 클릭 같은 사용자 동작이 있어야 전체화면·소리를 허락해서, 로그인 클릭 때 같이 켬
const boot = document.getElementById('boot');
const bootBios = boot.querySelector('.boot-bios');
const bootLogin = boot.querySelector('.boot-login');
const BIOS_LINES = [
    '<span class="hi">PEPE BIOS v1.0</span>  (C) 2026 Pepe Megatrends Inc.',
    '',
    'CPU : Frog Pentium II  420 MHz',
    'Memory Test : {MEM}',
    '',
    'Detecting IDE Primary Master ... <span class="ok">PEPE-HDD 69GB</span>',
    'Detecting IDE Primary Slave  ... <span class="ok">CD-ROM (feels good)</span>',
    'Detecting Keyboard ........... <span class="ok">OK</span>',
    'Detecting Mouse .............. <span class="ok">OK</span>',
    '',
    'Loading PLAY WITH PEPE ...',
    '',
    '<span class="key">Press F11 or click to continue</span><span class="boot-blink">_</span>',
];
const BIOS_SPEED = 90;          // 한 줄 나오는 간격 (ms)
const BIOS_WAIT = 1500;         // 다 나온 뒤 로그인 화면으로 넘어가기까지 (ms)

// ▼ 부팅 화면(BIOS + 로그인) 켜기/끄기 : 수정 확인할 때 불편하면 false 로
const BOOT_ON = true;

let biosTimer, biosLine = 0, biosMem = 0;
const MEM_OK = '65536K <span class="ok">OK</span>';
if (!BOOT_ON) boot.hidden = true;
else biosTimer = setInterval(() => {
    const el = document.getElementById('boot-bios-text');
    if (BIOS_LINES[biosLine].includes('{MEM}') && biosMem < 65536) {      // 메모리 숫자가 쭉 올라감
        biosMem += 4096;
        const mem = biosMem < 65536 ? biosMem + 'K' : MEM_OK;
        el.innerHTML = BIOS_LINES.slice(0, biosLine + 1).join('\n').replace('{MEM}', mem);
        return;
    }
    el.innerHTML = BIOS_LINES.slice(0, biosLine + 1).join('\n').replace('{MEM}', MEM_OK);
    if (++biosLine >= BIOS_LINES.length) { clearInterval(biosTimer); setTimeout(showLogin, BIOS_WAIT); }
}, BIOS_SPEED);

function showLogin() {
    clearInterval(biosTimer);
    bootBios.hidden = true;
    bootLogin.hidden = false;
}
bootBios.addEventListener('click', showLogin);        // BIOS 는 클릭하면 건너뜀

// 로그인 : 전체화면(거절해도 그냥 진행) + 시작음 → 잠깐 "로그인하는 중..." → 서서히 사라짐
document.getElementById('boot-user').addEventListener('click', () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    startupSound();
    document.getElementById('boot-state').textContent = '로그인하는 중...';
    setTimeout(() => {
        boot.classList.add('out');
        setTimeout(() => boot.hidden = true, 800);
    }, 900);
});

// 취소 → 전원 끈 화면 (클릭하면 다시 켜짐)
document.getElementById('boot-off').addEventListener('click', () => {
    boot.hidden = true;
    offScreen.hidden = false;
});

// ---------- 시계 ----------
function updateClock() {
    document.getElementById('clock').textContent =
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
updateClock();
setInterval(updateClock, 10000);

// ---------- 소리 버튼 : 사이트 전체 소리 켜기 / 끄기 ----------
// 끄면 페이지 안의 모든 <audio>(Music · Brett 노래)가 음소거되고 효과음도 안 남. 노래는 멈추지 않고 소리만 꺼짐
const soundBtn = document.getElementById('sound-btn');
let muted = false;

soundBtn.addEventListener('click', () => {
    muted = !muted;
    soundBtn.classList.toggle('on', !muted);
    document.querySelectorAll('audio').forEach(a => a.muted = muted);
    medYTMute();                                    // Meditation 유튜브 플레이어도 같이
});

// ---------- 커스텀 스크롤바 ----------
const screenEl = document.getElementById('screen');
const track = document.getElementById('sb-track');
const thumb = document.getElementById('sb-thumb');
const STEP = 60; // 화살표 한 번에 움직이는 양(px)

function updateThumb() {
    const viewH = screenEl.clientHeight;
    const totalH = screenEl.scrollHeight;
    const trackH = track.clientHeight;
    const thumbH = Math.max(trackH * viewH / totalH, 20);
    const maxScroll = totalH - viewH;
    thumb.style.height = thumbH + 'px';
    thumb.style.top = (maxScroll > 0 ? screenEl.scrollTop / maxScroll * (trackH - thumbH) : 0) + 'px';
}
screenEl.addEventListener('scroll', updateThumb);
window.addEventListener('resize', updateThumb);
updateThumb();

// 화살표 버튼 (누르고 있으면 계속 스크롤)
function holdScroll(btn, dir) {
    let timer;
    btn.addEventListener('mousedown', () => {
        screenEl.scrollTop += STEP * dir;
        timer = setInterval(() => screenEl.scrollTop += STEP * dir, 80);
    });
    ['mouseup', 'mouseleave'].forEach(ev => btn.addEventListener(ev, () => clearInterval(timer)));
}
holdScroll(document.getElementById('sb-up'), -1);
holdScroll(document.getElementById('sb-down'), 1);

// 트랙 빈 곳 클릭 → 한 화면씩 이동
track.addEventListener('mousedown', e => {
    if (e.target !== track) return;
    const dir = e.offsetY < thumb.offsetTop ? -1 : 1;
    screenEl.scrollTop += screenEl.clientHeight * dir;
});

// 썸(막대) 드래그
thumb.addEventListener('mousedown', e => {
    e.preventDefault();
    const startY = e.clientY;
    const startScroll = screenEl.scrollTop;
    const ratio = (screenEl.scrollHeight - screenEl.clientHeight) / (track.clientHeight - thumb.offsetHeight || 1);

    function move(e) { screenEl.scrollTop = startScroll + (e.clientY - startY) * ratio; }
    function up() {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
});

// ---------- Pepe Coin 차트 (바이낸스 공개 데이터) ----------
const coinCanvas = document.getElementById('coin-canvas');
if (coinCanvas) {
    const cctx = coinCanvas.getContext('2d');
    const UP = '#40DE28';      // 오를 때 색
    const DOWN = '#e00000';    // 내릴 때 색
    const COUNT = 60;          // 화면에 보일 캔들 개수
    const REFRESH = 5000;      // 몇 ms 마다 새로 불러올지 (5000 = 5초)
    let interval = '1h';
    let candles = [];
    let coinUp = null;         // 24시간 기준 올랐는지 (null = 아직 모름)
    let bgPick = null;         // 버튼으로 직접 고른 배경 (true = 상승 gif, false = 하락 gif, null = 시세 따라 자동)
    const coinWin = document.getElementById('win-pepecoin');
    const bgBtn = document.getElementById('coin-bg');

    // 창이 열려 있는 동안 바탕화면에 gif 깔기 : 오르면 pepecoin1 / 내리면 pepecoin2 (style.css 의 #desktop.coin-up / coin-down)
    function updateCoinBg() {
        const open = coinWin.classList.contains('open');
        if (!open && !coinWin.taskBtn) bgPick = null;          // 창을 닫으면 다시 자동으로
        const up = bgPick ?? coinUp;
        desktop.classList.toggle('coin-up', open && up === true);
        desktop.classList.toggle('coin-down', open && up === false);
        bgBtn.textContent = up === false ? '배경 ▼' : '배경 ▲';   // 지금 깔린 gif
    }
    // 배경 전환 버튼 : 누를 때마다 상승 ↔ 하락 gif
    bgBtn.addEventListener('click', () => {
        bgPick = !(bgPick ?? coinUp ?? false);
        updateCoinBg();
    });
    // 창을 열고 닫을 때마다 배경 다시 확인
    new MutationObserver(updateCoinBg).observe(coinWin, { attributes: true, attributeFilter: ['class'] });

    // 1) 데이터 불러오기
    async function loadCoin() {
        try {
            const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=PEPEUSDT&interval=${interval}&limit=${COUNT}`);
            const data = await res.json();
            // 바이낸스 데이터 [시간, 시가, 고가, 저가, 종가, ...] → 쓰기 쉽게 정리
            candles = data.map(d => ({ open: +d[1], high: +d[2], low: +d[3], close: +d[4] }));

            const t = await (await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=PEPEUSDT')).json();
            const change = +t.priceChangePercent;
            document.getElementById('coin-price').textContent = '$' + (+t.lastPrice).toFixed(8);
            const changeEl = document.getElementById('coin-change');
            changeEl.textContent = (change >= 0 ? '▲ ' : '▼ ') + change.toFixed(2) + '%';
            changeEl.style.color = change >= 0 ? UP : DOWN;
            coinUp = change >= 0;

            drawCoin();
            updateCoinBg();
        } catch {
            document.getElementById('coin-price').textContent = '데이터를 불러올 수 없습니다';
        }
    }

    // 2) 캔들 그리기
    function drawCoin() {
        const w = coinCanvas.width = coinCanvas.clientWidth;
        const h = coinCanvas.height = coinCanvas.clientHeight;
        cctx.fillStyle = '#000';
        cctx.fillRect(0, 0, w, h);
        if (!candles.length || !w || !h) return;

        const max = Math.max(...candles.map(c => c.high));
        const min = Math.min(...candles.map(c => c.low));
        const pad = 10;
        const y = price => pad + (max - price) / (max - min || 1) * (h - pad * 2);   // 가격 → 세로 위치
        const step = w / candles.length;
        const bodyW = Math.max(Math.floor(step * 0.6), 1);

        candles.forEach((c, i) => {
            const x = Math.floor(i * step + step / 2);
            cctx.fillStyle = c.close >= c.open ? UP : DOWN;
            // 꼬리 (고가 ~ 저가)
            cctx.fillRect(x, Math.floor(y(c.high)), 1, Math.max(Math.floor(y(c.low) - y(c.high)), 1));
            // 몸통 (시가 ~ 종가)
            const top = Math.floor(y(Math.max(c.open, c.close)));
            const bottom = Math.floor(y(Math.min(c.open, c.close)));
            cctx.fillRect(x - Math.floor(bodyW / 2), top, bodyW, Math.max(bottom - top, 1));
        });
    }

    // 3) 기간 버튼
    const coinBtns = document.querySelectorAll('.coin-tools [data-interval]');   // 기간 버튼만 (배경 버튼 제외)
    coinBtns.forEach(btn => btn.addEventListener('click', () => {
        interval = btn.dataset.interval;
        coinBtns.forEach(b => b.classList.toggle('pressed', b === btn));
        loadCoin();
    }));

    // 4) 창이 열려 있을 때만 주기적으로 새로고침, 창 크기 바뀌면 다시 그리기
    setInterval(() => {
        if (coinWin.classList.contains('open')) loadCoin();
    }, REFRESH);
    new ResizeObserver(drawCoin).observe(coinCanvas.parentElement);
    loadCoin();
}

// ---------- 그림판 (BKpaint) ----------
const canvas = document.getElementById('paint-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const area = canvas.parentElement;
    const sizeSelect = document.getElementById('paint-size');
    const paint = { tool: 'pen', color: '#000000', size: +sizeSelect.value };   // 굵기 기본값 = index.html 에서 selected 된 값

    // 바탕화면 기본 배경 위에 그림 : 배경 사진은 그림판 칸 뒤에 깔고, 캔버스는 투명하게 그 위에서 그림
    // (사진을 캔버스에 직접 그리면 파일로 열었을 때 브라우저 보안 때문에 저장·페인트통이 막혀서 두 겹으로 나눔)
    const baseBg = getComputedStyle(desktop).backgroundImage;   // style.css 의 #desktop 배경 사진
    area.style.backgroundImage = baseBg;
    // 그림판 칸 비율을 바탕화면 비율과 똑같이 → 저장하면 그림이 배경 사진과 같은 자리에 딱 맞음
    const syncRatio = () => area.style.aspectRatio = `${desktop.clientWidth} / ${desktop.clientHeight}`;
    syncRatio();
    window.addEventListener('resize', syncRatio);

    // 창 크기가 바뀌면 캔버스도 맞춰서 키우고, 그려둔 그림은 같은 비율로 늘려서 유지
    new ResizeObserver(() => {
        const w = area.clientWidth, h = area.clientHeight;
        if (!w || !h || (w === canvas.width && h === canvas.height)) return;
        const old = document.createElement('canvas');
        old.width = canvas.width; old.height = canvas.height;
        if (old.width && old.height) old.getContext('2d').drawImage(canvas, 0, 0);
        canvas.width = w; canvas.height = h;
        if (old.width && old.height) ctx.drawImage(old, 0, 0, w, h);
    }).observe(area);

    // ----- 그리기 (마우스 + 터치) -----
    let drawing = false, lastX = 0, lastY = 0;
    canvas.addEventListener('pointerdown', e => {
        if (paint.tool === 'fill') { floodFill(e.offsetX, e.offsetY, paint.color); return; }
        drawing = true;
        canvas.setPointerCapture(e.pointerId);
        [lastX, lastY] = [e.offsetX, e.offsetY];
        drawLine(e.offsetX, e.offsetY);   // 클릭만 해도 점이 찍힘
    });
    canvas.addEventListener('pointermove', e => { if (drawing) drawLine(e.offsetX, e.offsetY); });
    canvas.addEventListener('pointerup', () => drawing = false);

    function drawLine(x, y) {
        const eraser = paint.tool === 'eraser';
        // 지우개 = 그린 것만 투명하게 지움 → 밑의 배경 사진이 다시 보임
        ctx.globalCompositeOperation = eraser ? 'destination-out' : 'source-over';
        ctx.strokeStyle = paint.color;
        ctx.lineWidth = eraser ? paint.size * 2 : paint.size;   // 지우개는 연필의 2배
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        [lastX, lastY] = [x, y];
    }

    // ----- 페인트통 : 클릭한 곳과 비슷한 색으로 이어진 영역을 채움 -----
    function floodFill(x, y, hex) {
        const w = canvas.width, h = canvas.height;
        // 마우스 좌표가 소수점일 수 있어서 정수 픽셀로 맞춤 (안 하면 무한 반복으로 멈춤)
        x = Math.floor(x * w / canvas.clientWidth);
        y = Math.floor(y * h / canvas.clientHeight);
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const img = ctx.getImageData(0, 0, w, h);
        const d = img.data;
        const start = (y * w + x) * 4;
        const target = [d[start], d[start + 1], d[start + 2], d[start + 3]];   // 투명도까지 비교 (빈 곳 = 투명)
        const fill = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
        const TOLERANCE = 60;   // 선 가장자리의 흐린 부분까지 채우기 위한 여유값
        const seen = new Uint8Array(w * h);
        const stack = [x + y * w];

        while (stack.length) {
            const p = stack.pop();
            if (seen[p]) continue;
            seen[p] = 1;
            const i = p * 4;
            const diff = Math.abs(d[i] - target[0]) + Math.abs(d[i + 1] - target[1]) + Math.abs(d[i + 2] - target[2]) + Math.abs(d[i + 3] - target[3]);
            if (diff > TOLERANCE) continue;
            d[i] = fill[0]; d[i + 1] = fill[1]; d[i + 2] = fill[2]; d[i + 3] = 255;
            const px = p % w;
            if (px > 0) stack.push(p - 1);
            if (px < w - 1) stack.push(p + 1);
            if (p >= w) stack.push(p - w);
            if (p < w * (h - 1)) stack.push(p + w);
        }
        ctx.putImageData(img, 0, 0);
    }

    // ----- 도구 선택 (연필 / 지우개 / 페인트통) -----
    const toolBtns = document.querySelectorAll('.paint-tools [data-tool]');
    function setTool(tool) {
        paint.tool = tool;
        toolBtns.forEach(b => b.classList.toggle('pressed', b.dataset.tool === tool));
    }
    toolBtns.forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));

    // 굵기
    sizeSelect.addEventListener('change', () => paint.size = +sizeSelect.value);

    // ----- 색 -----
    const current = document.getElementById('paint-current');
    const panel = document.getElementById('color-panel');

    function setColor(color) {
        paint.color = color;
        current.style.background = color;
        if (paint.tool === 'eraser') setTool('pen');   // 지우개 상태에서 색 고르면 연필로
    }

    // 팔레트 작은 색 칸
    document.querySelectorAll('.swatches i').forEach(sw => {
        sw.style.background = sw.dataset.color;
        sw.addEventListener('click', () => setColor(sw.dataset.color));
    });

    // ----- 색 선택 패널 (밝기·채도 사각형 + 색상 막대) -----
    // 브라우저 기본 색 선택창은 크기를 바꿀 수 없어서 같은 방식으로 크게 직접 만듦
    const sv = panel.querySelector('.cp-sv'), svDot = panel.querySelector('.cp-sv-dot');
    const hue = panel.querySelector('.cp-hue'), hueDot = panel.querySelector('.cp-hue-dot');
    const preview = panel.querySelector('.cp-preview'), hexInput = panel.querySelector('.cp-hex');
    const hsv = { h: 0, s: 0, v: 0 };

    function hsvToHex({ h, s, v }) {
        const f = n => {
            const k = (n + h / 60) % 6;
            return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
        };
        return '#' + [f(5), f(3), f(1)].map(n => n.toString(16).padStart(2, '0')).join('');
    }

    function hexToHsv(hex) {
        const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
        const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
        let h = 0;
        if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
    }

    // 패널 화면 갱신 + 고른 색 바로 적용
    function updatePicker() {
        const hex = hsvToHex(hsv);
        sv.style.background = `hsl(${hsv.h}, 100%, 50%)`;
        svDot.style.left = hsv.s * 100 + '%';
        svDot.style.top = (1 - hsv.v) * 100 + '%';
        hueDot.style.left = hsv.h / 360 * 100 + '%';
        preview.style.background = hex;
        hexInput.value = hex;
        setColor(hex);
    }

    // 사각형·막대 드래그
    function dragOn(el, onMove) {
        el.addEventListener('pointerdown', e => {
            el.setPointerCapture(e.pointerId);
            const move = e => {
                const r = el.getBoundingClientRect();
                const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
                const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
                onMove(x, y);
                updatePicker();
            };
            move(e);
            el.onpointermove = move;
            el.onpointerup = () => el.onpointermove = null;
        });
    }
    dragOn(sv, (x, y) => { hsv.s = x; hsv.v = 1 - y; });
    dragOn(hue, x => { hsv.h = x * 359.9; });

    // 색 코드 직접 입력
    hexInput.addEventListener('change', () => {
        if (/^#[0-9a-f]{6}$/i.test(hexInput.value)) Object.assign(hsv, hexToHsv(hexInput.value));
        updatePicker();
    });

    // 큰 색 칸 누르면 열기/닫기 (열 때 지금 색으로 맞춤)
    current.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
        if (!panel.hidden) { Object.assign(hsv, hexToHsv(paint.color)); updatePicker(); }
    });
    panel.querySelector('.color-close').addEventListener('click', () => panel.hidden = true);
    panel.querySelector('.cp-ok').addEventListener('click', () => panel.hidden = true);

    // ----- 버튼들 -----
    // 전체 지우기 (그린 것만 지움 → 배경 사진만 남음)
    document.getElementById('paint-clear').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // 저장 → 바탕화면 = 기본 배경 사진 위에 그린 그림 한 겹 (새로고침하면 원래대로)
    // 그림은 바탕화면 전체에 늘려 깔고, 배경 사진은 원래처럼 꽉 채움 → 그림판에서 본 그대로
    document.getElementById('paint-save').addEventListener('click', () => {
        desktop.style.backgroundImage = `url(${canvas.toDataURL('image/png')}), ${baseBg}`;
        desktop.style.backgroundSize = '100% 100%, cover';
        desktop.style.backgroundPosition = '0 0, center top';
        desktop.style.backgroundRepeat = 'no-repeat';
    });

    // 배경 취소 → style.css 에 정해둔 원래 배경으로
    document.getElementById('paint-reset').addEventListener('click', () => {
        ['backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat'].forEach(p => desktop.style[p] = '');
    });
}

// ---------- Meditation : 사진 클릭 → 화면 전체가 픽셀 원으로 퍼지며 새 사진 등장 ----------
const BG_COLOR = '#000924';   // 퍼지는 배경 색
const BLOCK = 75;             // 픽셀 칸 크기 (px) - 클수록 더 도트 느낌
const SPREAD_TIME = 600;      // 다 퍼지는 데 걸리는 시간 (ms, 1000 = 1초)

const bgCircle = document.getElementById('bg-circle');
const bgCtx = bgCircle.getContext('2d');
let spread = 0;               // 0 = 안 보임, 1 = 화면 다 덮음
let spreadDir = 0;            // +1 = 퍼지는 중, -1 = 줄어드는 중

// ----- 반딧불이 설정 -----
const FIREFLY_COUNT = 35;     // 반딧불이 개수
const FIREFLY_HUE = 142;      // 색상 (0 빨강 · 60 노랑 · 142 초록 · 200 하늘 · 280 보라)
const FIREFLY_SIZE = 2.0;     // 크기 배율 (1.0 = 원본 사이트 크기)
const FIREFLY_SPEED = 2.5;    // 움직임 속도 배율 (1.0 = 원본 사이트 속도)

// 반딧불이 만들기 : 위치(x, y 는 화면 비율 0~1), 속도·크기(rem), 밝기
// rem 값은 화면 너비 1920px 일 때 원본 사이트의 px 값과 같아지도록 맞춤
const fireflies = Array.from({ length: FIREFLY_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.031 * FIREFLY_SPEED,
    vy: (Math.random() - 0.5) * 0.031 * FIREFLY_SPEED,
    r: (Math.random() * 0.13 + 0.08) * FIREFLY_SIZE,
    alpha: Math.random(),
    alphaDir: Math.random() > 0.5 ? 1 : -1,
    alphaSpeed: Math.random() * 0.012 + 0.005
}));

// 반딧불이는 사진(img2) 위에도 보이도록 따로 위쪽 캔버스에 그림
const ffCanvas = document.getElementById('firefly-canvas');
const ffCtx = ffCanvas.getContext('2d');

// 지금 spread 값만큼 중앙에서 가까운 칸들을 칠하고, 그 안에 반딧불이 그림
function drawSpread() {
    const w = bgCircle.width = ffCanvas.width = innerWidth;
    const h = bgCircle.height = ffCanvas.height = innerHeight;
    const cx = w / 2, cy = h / 2;
    // 원 반지름도 칸 단위로 끊어서 계단처럼 커지게
    const radius = Math.round(spread * Math.hypot(cx, cy) / BLOCK) * BLOCK;
    const inside = (x, y) => Math.hypot(x - cx, y - cy) <= radius;

    bgCtx.fillStyle = BG_COLOR;
    for (let x = 0; x < w; x += BLOCK) {
        for (let y = 0; y < h; y += BLOCK) {
            if (inside(x + BLOCK / 2, y + BLOCK / 2)) bgCtx.fillRect(x, y, BLOCK, BLOCK);
        }
    }

    const rem = remPx();   // 1rem 이 지금 몇 px 인지 (rem → px 변환)
    fireflies.forEach(f => {
        // 이동 (벽에 닿으면 방향 반전)
        const x = f.x * w + f.vx * rem, y = f.y * h + f.vy * rem;
        const r = f.r * rem;
        if (x < 0 || x > w) f.vx *= -1;
        if (y < 0 || y > h) f.vy *= -1;
        f.x = x / w;
        f.y = y / h;

        // 깜빡임
        f.alpha += f.alphaDir * f.alphaSpeed;
        if (f.alpha >= 1) { f.alpha = 1; f.alphaDir = -1; }
        if (f.alpha <= 0.05) { f.alpha = 0.05; f.alphaDir = 1; }

        if (!inside(x, y)) return;   // 아직 배경이 안 퍼진 곳엔 안 보임

        // 퍼지는 빛
        const glow = ffCtx.createRadialGradient(x, y, 0, x, y, r * 5);
        glow.addColorStop(0, `hsla(${FIREFLY_HUE}, 100%, 85%, ${f.alpha})`);
        glow.addColorStop(0.4, `hsla(${FIREFLY_HUE}, 100%, 65%, ${f.alpha * 0.5})`);
        glow.addColorStop(1, `hsla(${FIREFLY_HUE}, 100%, 50%, 0)`);
        ffCtx.fillStyle = glow;
        ffCtx.beginPath();
        ffCtx.arc(x, y, r * 5, 0, Math.PI * 2);
        ffCtx.fill();

        // 가운데 밝은 점
        ffCtx.fillStyle = `hsla(${FIREFLY_HUE}, 100%, 95%, ${f.alpha})`;
        ffCtx.beginPath();
        ffCtx.arc(x, y, r, 0, Math.PI * 2);
        ffCtx.fill();
    });
}

// 퍼지기(+1) / 줄어들기(-1) 애니메이션
// 화면이 덮여 있는 동안은 반딧불이가 움직이도록 계속 다시 그림
let spreadLoop = false;
function playSpread(dir) {
    spreadDir = dir;
    if (spreadLoop) return;     // 이미 돌고 있으면 방향만 바꿈
    spreadLoop = true;
    let last = performance.now();
    requestAnimationFrame(function step(now) {
        const dt = Math.max(0, now - last);   // 첫 프레임은 시간 차이가 음수일 수 있어서 0 으로
        spread = Math.min(1, Math.max(0, spread + spreadDir * dt / SPREAD_TIME));
        last = now;
        drawSpread();
        // 퍼지는 중이거나 화면이 남아 있으면 계속, 줄어들어 완전히 사라지면 멈춤
        if (spreadDir > 0 || spread > 0) requestAnimationFrame(step);
        else spreadLoop = false;
    });
}

const medImg = document.getElementById('meditation-img');
const medImg2 = document.getElementById('bg-circle-img');

// 배경이 바뀌는 동안 나오는 음악 : 유튜브 영상(IFrame Player API)을 소리만 틀어줌 (플레이어는 투명, style.css 의 #med-yt-box)
// - 음악 파일을 사이트에 올리지 않고 유튜브에서 바로 재생 (영상 바꾸려면 MED_YT 만 바꾸면 됨)
// - 닫으면 서서히 작아지며 멈춤
const MED_YT = 'wDaqicVmpqo';             // https://www.youtube.com/watch?v=wDaqicVmpqo (Fireflies - Minecraft)
const MED_VOL = 70;                       // 유튜브 볼륨 0~100
let medYT = null, medYTReady = false, medWant = false, medFade;

// 처음 틀 때 유튜브 API 스크립트를 불러옴 (사이트 처음 열 때는 안 불러서 빠름)
function loadMedYT() {
    if (medYT) return;
    medYT = 'loading';
    window.onYouTubeIframeAPIReady = () => {
        medYT = new YT.Player('med-yt', {
            videoId: MED_YT,
            playerVars: { loop: 1, playlist: MED_YT, controls: 0, modestbranding: 1, playsinline: 1, rel: 0 },
            events: {
                onReady: () => { medYTReady = true; medYTMute(); if (medWant) medMusic(true); },
            },
        });
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
}

// 소리 버튼(전체 음소거)에 맞춤
function medYTMute() {
    if (!medYTReady) return;
    muted ? medYT.mute() : medYT.unMute();
}

function medMusic(on) {
    medWant = on;
    clearInterval(medFade);
    if (!medYTReady) { if (on) loadMedYT(); return; }   // 준비되면 onReady 에서 다시 불림
    if (on) {
        medYT.setVolume(MED_VOL);
        medYT.seekTo(0, true);
        medYT.playVideo();
        return;
    }
    let v = MED_VOL;
    medFade = setInterval(() => {                 // 0.6초 동안 작아짐
        v = Math.max(0, v - MED_VOL / 12);
        medYT.setVolume(v);
        if (v === 0) { clearInterval(medFade); medYT.pauseVideo(); }
    }, 50);
}

medImg.addEventListener('click', () => {
    // img2 를 img1 이 지금 화면에 있는 위치·크기에 그대로 겹치기
    const r = medImg.getBoundingClientRect();
    medImg2.style.left = r.left + 'px';
    medImg2.style.top = r.top + 'px';
    medImg2.style.width = r.width + 'px';
    medImg2.style.height = r.height + 'px';
    bgCircle.classList.add('on');
    medImg2.classList.add('on');
    playSpread(1);
    medMusic(true);
});

// 아무 데나 (배경이든 사진이든) 클릭하면 닫힘
[bgCircle, medImg2].forEach(el => el.addEventListener('click', () => {
    bgCircle.classList.remove('on');
    medImg2.classList.remove('on');
    playSpread(-1);
    medMusic(false);
}));

// ---------- Brett 리듬 게임 ----------
// 노래(mp3) 박자에 맞춰 개구리가 주먹을 흔듦. 박자에 맞춰 화면 클릭 / 스페이스바 → 판정
// 잘 맞출수록 스포트라이트 → 디스코볼이 나타나고, 그 빛이 바탕화면까지 퍼짐
const brettCanvas = document.getElementById('brett-canvas');
if (brettCanvas) {
    const ctx = brettCanvas.getContext('2d');
    const brettWin = document.getElementById('win-brett');
    const el = id => document.getElementById(id);
    const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
    const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
    const GLINT = [[0.414, 0.362], [0.647, 0.398]];      // 선글라스 반짝임 위치 (이미지 가로/세로 비율)

    // 노래 : 박자는 노래가 지금 몇 초째인지로 계산 → 개구리·판정·조명이 노래와 딱 맞음
    // 다른 노래로 바꾸려면 src·bpm·offset(첫 "쿵"이 나오는 초) 만 바꾸면 됨
    const SONG = { src: 'sounds/teknoaxe-funky-love-disco-pump.mp3', bpm: 115, offset: 0.025 };
    const song = new Audio(SONG.src);
    song.loop = true;
    song.volume = 0.8;
    song.muted = muted;
    document.body.appendChild(song);       // 페이지에 붙여 둬야 소리 버튼(전체 음소거)이 찾을 수 있음

    let bpm = SONG.bpm, E = 0.75;          // bpm = 지금 실제 빠르기 (템포 슬라이더로 바뀜)
    // 노래 위치(초). currentTime 은 띄엄띄엄 바뀌어서 그 사이는 흐른 시간으로 메꿔 부드럽게
    let syncCT = -1, syncT = 0;
    function songTime(now) {
        const ct = song.currentTime;
        if (song.paused) return ct;
        if (ct !== syncCT) { syncCT = ct; syncT = now; }
        return syncCT + (now - syncT) / 1000 * song.playbackRate;
    }
    const beatOf = now => (songTime(now) - SONG.offset) * SONG.bpm / 60;

    // 템포 : 노래 재생 속도를 바꿈 (음 높이는 그대로)
    el('brett-bpm').addEventListener('input', e => {
        bpm = +e.target.value; el('brett-bpm-out').textContent = bpm;
        song.playbackRate = bpm / SONG.bpm;
    });
    el('brett-eng').addEventListener('input', e => { E = +e.target.value / 100; el('brett-eng-out').textContent = e.target.value; });

    // 창을 열면 멈춘 화면 → 게임 화면을 한 번 클릭하면 시작. X 로 닫으면 다시 멈춤 (최소화 중에는 계속 재생)
    const STILL_BEAT = 0.5;              // 멈춰 있을 때 보여줄 박자 위치
    let started = false, stillT = performance.now();
    const clubDark = document.getElementById('club-dark');
    function start() {
        started = true;
        clubDark.classList.add('on');                          // 바탕화면 불 끄기
        document.body.classList.add('club');                   // Brett 창·조명만 어둠 위로
        song.currentTime = 0;
        song.play().catch(() => {});
    }
    new MutationObserver(() => {
        if (!brettWin.classList.contains('open') && !brettWin.taskBtn && started) {
            started = false; stillT = performance.now();
            song.pause(); song.currentTime = 0;
            clubDark.classList.remove('on');                   // 서서히 다시 밝아짐
            document.body.classList.remove('club');
            parts.length = 0; rings.length = 0; judge.t = -1e9;               // 다음에 열 때 깨끗하게
            lightOn = ballOn = false; lightLv = ballLv = 0; goodHits = 0;      // 조명·디스코볼 다시 숨김
        }
    }).observe(brettWin, { attributes: true, attributeFilter: ['class'] });

    // 그림
    const img = new Image();
    const S = 0.41, GROUND = 536, CX = 320;
    let IW = 1, IH = 1, ready = false;
    img.onload = () => { IW = img.width; IH = img.height; ready = true; };
    img.src = 'images/brett-dance.png';

    const stars = Array.from({ length: 36 }, () => ({ x: Math.random() * 640, y: Math.random() * 400, ph: Math.random() * 6.28 }));
    // 바탕화면까지 빛을 뿌리는 화면 전체 캔버스 (style.css 의 #disco-light)
    const lightCv = document.getElementById('disco-light');
    const lctx = lightCv.getContext('2d');

    // 디스코볼 : 천장 가운데에 매달려 돌면서 방 안에 빛 조각을 뿌림
    const BALL_X = 320, BALL_Y = 66, BALL_R = 40;
    const LIGHT_COLS = ['255,255,255', '255,77,141', '76,201,240', '255,216,77'];
    // 빛 조각 : 볼 둘레 각도(lon) + 높이(h). 볼이 돌면 같이 옆으로 흘러감
    const makeSpots = (n, colors) => Array.from({ length: n }, (_, i) => ({ lon: Math.random() * 6.28, h: Math.random(), c: colors[i % colors.length] }));
    const spots = makeSpots(28, LIGHT_COLS);   // 게임 화면 안
    // 게임 화면 밖 (바탕화면 전체) : 흰색 빼고 진한 색만 → 파란 바탕화면 위에서도 색이 또렷하게
    const screenSpots = makeSpots(40, ['255,40,140', '40,200,255', '255,210,40', '200,60,255', '60,255,150']);
    // 볼 표면 거울 칸 : 위도 BALL_LAT 줄 × 경도 BALL_LON 칸. 칸마다 색을 하나씩 정해 둠 (null = 은색)
    const BALL_LAT = 10, BALL_LON = 16;
    const tileCol = Array.from({ length: BALL_LAT }, () =>
        Array.from({ length: BALL_LON }, () => Math.random() < 0.4 ? LIGHT_COLS[1 + Math.floor(Math.random() * 3)] : null));

    // 스포트라이트 : [게임 화면 안 x 위치, 색, 흔들림 시작 각도] (파랑 · 핑크 · 보라)
    const SPOTS = [[150, '76,201,240', 0], [490, '255,77,141', 1.7], [320, '170,70,255', 3.4]];
    const SWING = 0.8;   // 좌우로 흔들리는 범위 (라디안, 0.8 ≈ 양쪽 46도)
    // 빛기둥 하나 : (ox, oy) 에서 각도 ang 으로 len 만큼 뻗음. 끝으로 갈수록 넓어지고 흐려짐
    function spotBeam(c, ox, oy, ang, len, topW, endW, col, alpha) {
        const tx = ox + Math.sin(ang) * len, ty = oy + Math.cos(ang) * len;
        const px = Math.cos(ang), py = -Math.sin(ang);            // 빛 방향에 수직인 방향 (폭)
        const gr = c.createLinearGradient(ox, oy, tx, ty);
        gr.addColorStop(0, `rgba(${col},${Math.min(1, alpha)})`);
        gr.addColorStop(0.6, `rgba(${col},${Math.min(1, alpha) * 0.4})`);
        gr.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = gr; c.beginPath();
        c.moveTo(ox - px * topW, oy - py * topW); c.lineTo(ox + px * topW, oy + py * topW);
        c.lineTo(tx + px * endW, ty + py * endW); c.lineTo(tx - px * endW, ty - py * endW);
        c.fill();
    }
    // 디스코볼(bx, by)에서 뻗는 빛줄기 + 떨어진 동그란 빛 (게임 화면 / 바탕화면 둘 다 사용)
    // spreadX = 좌우로 퍼지는 거리, yTop~yTop+yRange = 빛이 떨어지는 높이, size = 빛 크기, beam·core = 빛줄기·빛 진하기
    function drawLights(c, bx, by, list, rot, bright, spreadX, yTop, yRange, size, beam = 0.08, core = 0.35) {
        for (const s of list) {
            const ang = s.lon + rot, face = Math.cos(ang);
            if (face <= 0) continue;                                 // 공 뒤쪽 면은 안 비춤
            const x = bx + Math.sin(ang) * spreadX, y = yTop + s.h * yRange;
            const a = face * bright;
            c.fillStyle = `rgba(${s.c},${a * beam})`;               // 빛줄기
            c.beginPath(); c.moveTo(bx, by); c.lineTo(x - size * 0.5, y); c.lineTo(x + size * 0.5, y); c.fill();
            const r = size * (0.6 + face * 0.6);                    // 동그란 빛
            const g = c.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, `rgba(${s.c},${Math.min(1, a)})`);
            g.addColorStop(0.5, `rgba(${s.c},${Math.min(1, a * core)})`);
            g.addColorStop(1, `rgba(${s.c},0)`);
            c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
        }
    }
    const parts = [], rings = [];
    let lastBi = -1, boost = 0, earPos = 0, earV = 0, judge = { txt: '', t: -1e9, col: '#fff' }, glintT = -1e9;
    const noteCh = ['♪', '♫'], cols = ['#ff4d8d', '#4cc9f0', '#ffffff', '#ffd84d'];

    function burst(n, power, coinBias) {
        for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = (3 + Math.random() * 5) * power;
            const coin = Math.random() < coinBias;
            parts.push({ x: CX + (Math.random() - 0.5) * 300, y: GROUND - 200 + Math.random() * 80,
                vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1,
                col: coin ? '#ffd84d' : cols[i % 4], txt: coin ? '$' : (Math.random() < 0.5 ? noteCh[i % 2] : null),
                s: 6 + Math.floor(Math.random() * 3) * 4 });
        }
    }
    function onBeat(bi) {
        rings.push({ t: performance.now(), c: bi % 2 ? '#4cc9f0' : '#ff4d8d' });
        burst(Math.round(2 + 5 * E), 0.8 + E * 0.5, 0.15);
        if (bi % 4 === 0) glintT = performance.now();
    }

    // 보상 : 잘 맞춘 횟수(완벽·좋아요, 틀려도 줄지 않음)가 쌓이면 스포트라이트 → 디스코볼 (창 닫을 때까지 유지)
    const LIGHT_HITS = 2, BALL_HITS = 5;
    let goodHits = 0, lightOn = false, ballOn = false, lightLv = 0, ballLv = 0;   // Lv = 0(숨김) ~ 1(다 나옴)

    // 박자 맞추기 : 80ms 안 = 완벽, 200ms 안 = 좋아요
    function hit() {
        const now = performance.now(), b = beatOf(now), d = Math.abs(b - Math.round(b)) * 60000 / bpm;
        if (d < 80) { goodHits++; judge = { txt: '완벽!', t: now, col: '#ffd84d' }; boost = 1; glintT = now; burst(20, 1.4, 0.7); }
        else if (d < 200) { goodHits++; judge = { txt: '좋아요', t: now, col: '#4cc9f0' }; boost = 0.6; burst(9, 1, 0.4); }
        else judge = { txt: '아쉬워요', t: now, col: '#ff4d8d' };
        if (goodHits >= LIGHT_HITS) lightOn = true;
        if (goodHits >= BALL_HITS) ballOn = true;
    }
    brettCanvas.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (!started) start();           // 첫 클릭 = 시작
        else hit();
    });
    // 스페이스바는 시작한 뒤, Brett 창이 맨 앞(활성)일 때만
    document.addEventListener('keydown', e => {
        if (!started || e.code !== 'Space' || e.repeat || !brettWin.classList.contains('active')) return;
        if (e.target.matches('input[type=text], textarea')) return;
        e.preventDefault(); hit();
    });

    // 바닥 타일
    function floor(bi) {
        const ys = [GROUND, GROUND + 14, GROUND + 36, GROUND + 66, 640];
        const tw = y => 40 + (y - GROUND) * 0.55;
        for (let r = 0; r < 4; r++) {
            const y0 = ys[r], y1 = ys[r + 1], w0 = tw(y0), w1 = tw(y1);
            for (let i = -12; i < 12; i++) {
                const k = ((i + 12) * 3 + r * 7 + bi) % 7;
                ctx.fillStyle = k === 0 ? 'rgba(255,77,141,.8)' : k === 3 ? 'rgba(76,201,240,.75)' : k === 5 ? 'rgba(201,64,200,.55)' : '#1a0d3f';
                ctx.beginPath();
                ctx.moveTo(CX + i * w0 + 1, y0); ctx.lineTo(CX + (i + 1) * w0 - 1, y0);
                ctx.lineTo(CX + (i + 1) * w1 - 1, y1 - 1); ctx.lineTo(CX + i * w1 + 1, y1 - 1);
                ctx.fill();
            }
        }
    }

    // 매 프레임 (창이 안 보일 땐 그리지 않음)
    let prev = performance.now();
    function frame(t) {
        requestAnimationFrame(frame);
        const dt = Math.min(0.05, (t - prev) / 1000); prev = t;
        if (!brettWin.classList.contains('open')) {                // 창이 안 보이면 바탕화면 조명도 끔
            if (lightCv.width) lightCv.width = 0;
            return;
        }
        // 시작 전에는 시간이 멈춘 것처럼 : 같은 순간·같은 박자로 계속 그림
        const now = started ? t : stillT;
        const k = started ? dt * 60 : 0;
        const b = started ? beatOf(now) : STILL_BEAT, bi = Math.floor(b), p = b - bi;
        if (started && bi !== lastBi) { lastBi = bi; onBeat(bi); }
        boost *= Math.pow(0.94, k);
        const amp = (reduceMotion ? 0.35 : 1) * (0.3 + E * 0.7) * (1 + boost * 0.5);

        // 배경
        const g = ctx.createLinearGradient(0, 0, 0, 640);
        g.addColorStop(0, '#12062e'); g.addColorStop(1, '#2d1060');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 640);
        const pulse = Math.exp(-p * 5) * 0.22 * E;
        ctx.fillStyle = (bi % 2 ? `rgba(76,201,240,${pulse})` : `rgba(255,77,141,${pulse})`); ctx.fillRect(0, 0, 640, 640);
        // 별
        ctx.fillStyle = '#fff';
        for (const s of stars) { ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(now / 600 + s.ph)); ctx.fillRect(Math.round(s.x / 4) * 4, Math.round(s.y / 4) * 4, 4, 4); }
        ctx.globalAlpha = 1;
        // 보상 단계 : 스포트라이트는 1초에 걸쳐 켜지고, 디스코볼은 3초에 걸쳐 스르륵 내려옴
        lightLv = clamp(lightLv + (lightOn ? 1 : -1) * dt / 1, 0, 1);
        ballLv = clamp(ballLv + (ballOn ? 1 : -1) * dt / 3, 0, 1);
        const ballDrop = 1 - Math.pow(1 - ballLv, 3);                       // 처음엔 빠르게, 끝에서 천천히 멈춤
        const by = BALL_Y - (1 - ballDrop) * (BALL_Y + BALL_R + 10);        // 화면 위 밖 → 제자리
        const ballLight = smooth((ballLv - 0.6) / 0.4);                     // 거의 다 내려왔을 때 빛을 뿌리기 시작

        // 스포트라이트 : 박자에 맞춰 좌우로 흔들림. 바탕화면에도 같은 각도로 이어서 그림 (아래 "게임 화면 밖")
        if (lightLv > 0) {
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = lightLv;
            SPOTS.forEach(([ox, c, ph]) => {
                const a = Math.sin(b * Math.PI * 0.5 + ph) * SWING;
                spotBeam(ctx, ox, 0, a, GROUND * 1.15, 14, 160, c, 0.4 + pulse);
            });
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        }
        floor(bi);
        // 이퀄라이저 (양옆)
        for (let side = 0; side < 2; side++) for (let i = 0; i < 4; i++) {
            const hgt = 20 + (Math.sin(b * 3 + i * 1.9 + side) * 0.5 + 0.5) * 110 * E + Math.exp(-p * 5) * 50 * E;
            ctx.fillStyle = ['#ff4d8d', '#c940c8', '#4cc9f0', '#ffd84d'][(i + side) % 4];
            ctx.fillRect(side ? 640 - 22 - i * 24 : 8 + i * 24, GROUND - hgt, 18, hgt);
        }

        // 디스코볼 조명 : 빛줄기 + 벽/바닥에 떨어지는 동그란 빛 (템포가 빠를수록 빨리 돎)
        const rot = b * 0.4;
        const bright = (0.45 + pulse * 2) * (0.4 + E * 0.6);     // 박자마다 번쩍, 신남이 클수록 밝게
        if (ballLight > 0) {
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ballLight;
            drawLights(ctx, BALL_X, by, spots, rot, bright, 420, 150, 470, 14);
            // 볼 뒤 은은한 빛
            const glow = ctx.createRadialGradient(BALL_X, by, 0, BALL_X, by, BALL_R * 3);
            glow.addColorStop(0, `rgba(255,255,255,${0.25 + pulse})`); glow.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = glow; ctx.fillRect(BALL_X - BALL_R * 3, by - BALL_R * 3, BALL_R * 6, BALL_R * 6);
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        }

        // 디스코볼 본체 : 거울 칸을 하나하나 색으로 꽉 채워 그림. 돌면 칸들이 옆으로 흘러감
        if (ballLv > 0) {
            ctx.fillStyle = '#888'; ctx.fillRect(BALL_X - 1.5, 0, 3, Math.max(0, by - BALL_R));   // 매다는 줄
            ctx.fillStyle = '#1a1230';                                // 칸 사이 틈 색
            ctx.beginPath(); ctx.arc(BALL_X, by, BALL_R, 0, Math.PI * 2); ctx.fill();
            // 구 표면 한 점 (위도 la, 경도 lo) → 화면 좌표
            const P = (la, lo) => [BALL_X + BALL_R * Math.cos(la) * Math.sin(lo), by + BALL_R * Math.sin(la)];
            const dLa = Math.PI / BALL_LAT, dLo = Math.PI * 2 / BALL_LON;
            for (let i = 0; i < BALL_LAT; i++) {
                const la0 = -Math.PI / 2 + i * dLa, la1 = la0 + dLa;
                for (let j = 0; j < BALL_LON; j++) {
                    // 이 칸의 경도 범위 (-π ~ π 로 맞춤) → 앞쪽 반구(-π/2 ~ π/2)만 남김
                    let lo0 = ((j * dLo + rot) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
                    let lo1 = lo0 + dLo;
                    lo0 = Math.max(lo0, -Math.PI / 2); lo1 = Math.min(lo1, Math.PI / 2);
                    if (lo1 <= lo0) continue;
                    // 칸 모양 : 네 변을 따라 점을 찍어 이은 다각형
                    const pts = [];
                    for (let s = 0; s <= 4; s++) pts.push(P(la0, lo0 + (lo1 - lo0) * s / 4));
                    for (let s = 0; s <= 4; s++) pts.push(P(la1, lo1 - (lo1 - lo0) * s / 4));
                    // 밝기 : 칸이 왼쪽 위(조명 방향)를 볼수록 밝게
                    const lm = (la0 + la1) / 2, om = (lo0 + lo1) / 2;
                    const nx = Math.cos(lm) * Math.sin(om), ny = Math.sin(lm), nz = Math.cos(lm) * Math.cos(om);
                    const lit = clamp(0.25 + 0.75 * (-0.4 * nx - 0.5 * ny + 0.77 * nz), 0.15, 1);
                    const c = tileCol[i][j];
                    if (c) ctx.fillStyle = `rgba(${c},${clamp(lit * (0.75 + pulse * 2), 0, 1)})`;   // 조명 색 칸 : 박자마다 번쩍
                    else { const v = 60 + lit * 195 | 0; ctx.fillStyle = `rgb(${v * 0.92 | 0},${v * 0.92 | 0},${v})`; }   // 은색 칸
                    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
                    for (const q of pts) ctx.lineTo(q[0], q[1]);
                    ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = 'rgba(26,18,48,.6)'; ctx.lineWidth = 0.8; ctx.stroke();   // 칸 사이 틈
                }
            }
            ctx.strokeStyle = 'rgba(26,18,48,.7)'; ctx.lineWidth = 1;   // 공 테두리
            ctx.beginPath(); ctx.arc(BALL_X, by, BALL_R, 0, Math.PI * 2); ctx.stroke();
        }
        // 박자에 맞춰 반짝이는 별 (다 내려온 뒤)
        const tw = pulse * 90 * ballLight;
        if (tw > 2) {
            const sx = BALL_X - BALL_R * 0.4, sy = by - BALL_R * 0.45;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(sx, sy - tw); ctx.lineTo(sx + 3, sy - 3); ctx.lineTo(sx + tw, sy); ctx.lineTo(sx + 3, sy + 3);
            ctx.lineTo(sx, sy + tw); ctx.lineTo(sx - 3, sy + 3); ctx.lineTo(sx - tw, sy); ctx.lineTo(sx - 3, sy - 3);
            ctx.fill();
        }

        // 게임 화면 밖 (바탕화면 전체) 조명 : 화면에 보이는 디스코볼 위치에서 뻗어나감
        const W = innerWidth, H = innerHeight;
        if (lightCv.width !== W || lightCv.height !== H) { lightCv.width = W; lightCv.height = H; }
        lctx.clearRect(0, 0, W, H);
        const cr = brettCanvas.getBoundingClientRect(), sc = cr.width / 640;
        // 스포트라이트 : 게임 화면 위쪽에서 시작해 화면 맨 아래까지 크게 뻗음
        lctx.globalAlpha = lightLv;
        if (lightLv > 0) SPOTS.forEach(([ox, c, ph]) => {
            const a = Math.sin(b * Math.PI * 0.5 + ph) * SWING;
            spotBeam(lctx, cr.left + ox * sc, cr.top, a, H * 1.3, 14 * sc, Math.min(W, H) * 0.32, c, 0.3 + pulse * 1.5);
        });
        // 디스코볼 빛 : 겹쳐도 하얗게 날아가지 않도록 그냥 덮어 그림 (빛줄기·빛 진하게)
        lctx.globalAlpha = ballLight;
        if (ballLight > 0) drawLights(lctx, cr.left + BALL_X * sc, cr.top + by * sc, screenSpots, rot * 0.8, bright * 1.1, W * 0.9, H * 0.05, H * 0.95, Math.min(W, H) * 0.05, 0.16, 0.75);
        lctx.globalAlpha = 1;
        // 박자 링
        for (let i = rings.length - 1; i >= 0; i--) {
            const a = (now - rings[i].t) / 600;
            if (a >= 1) { rings.splice(i, 1); continue; }
            const r = 60 + a * 300;
            ctx.strokeStyle = rings[i].c; ctx.globalAlpha = (1 - a) * 0.55; ctx.lineWidth = 8;
            ctx.strokeRect(CX - r, GROUND - 170 - r * 0.7, r * 2, r * 1.4); ctx.globalAlpha = 1;
        }

        // 동작
        const dir = bi % 2 ? 1 : -1;
        const ease = 1 - Math.pow(1 - clamp(p * 2.5, 0, 1), 3);
        const tilt = dir * 0.07 * amp * (2 * ease - 1);                       // 몸통은 살짝만 기울기
        const hop = 4 * p * (1 - p) * 46 * amp;
        const sq = Math.exp(-p * 9) * 0.16 * amp;
        const st = 4 * p * (1 - p) * 0.05 * amp;
        const sx = 1 + sq * 0.9 - st * 0.6, sy = 1 - sq + st;
        const fist = Math.max(Math.exp(-p * 5), 0.9 * smooth((p - 0.7) / 0.3));  // 박자에 맞춰 주먹이 번쩍
        // 귀 : 몸이 뛰는 것보다 늦게 따라오는 스프링
        earV += (hop - earPos) * 0.16 * k; earV *= Math.pow(0.72, k); earPos += earV * k;

        // 그림자
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        ctx.beginPath(); ctx.ellipse(CX, GROUND + 14, 190 * (1 - hop / 160), 16, 0, 0, 7); ctx.fill();

        // 캐릭터 : 격자로 잘라 부위별로 따로 움직임 (주먹은 위로, 귀는 늦게 따라옴)
        if (ready) {
            ctx.save(); ctx.imageSmoothingEnabled = false;
            ctx.translate(CX, GROUND - hop); ctx.rotate(tilt); ctx.scale(sx, sy);
            const COLS = 40, ROWS = 32, cw = IW / COLS, rh = IH / ROWS, ARM = 46 * amp;
            const earDy = (hop - earPos) * 0.9;
            for (let r = 0; r < ROWS; r++) {
                const sy0 = r * rh, cy = sy0 + rh / 2;
                const ew = cy < 0.3 * IH ? Math.pow((0.3 * IH - cy) / (0.3 * IH), 1.4) : 0;
                const lw = clamp((0.92 * IH - cy) / (0.65 * IH), 0, 1);
                for (let c = 0; c < COLS; c++) {
                    const sx0 = c * cw, cx = sx0 + cw / 2;
                    const aw = 1 - smooth((cx / IW - 0.32) / 0.10);
                    const dy = -fist * aw * lw * ARM + earDy * ew;
                    const w = Math.min(cw + 1, IW - sx0), h = Math.min(rh + 1, IH - sy0);
                    ctx.drawImage(img, sx0, sy0, w, h, -IW * S / 2 + sx0 * S, (sy0 - IH) * S + dy, w * S, h * S);
                }
            }
            // 선글라스 반짝임
            const ga = (now - glintT) / 420;
            if (ga >= 0 && ga < 1) {
                const sz = Math.round(5 + 14 * Math.sin(ga * Math.PI));
                ctx.fillStyle = '#fff';
                GLINT.forEach(([fx, fy]) => {
                    const x = -IW * S / 2 + fx * IW * S, y = (fy - 1) * IH * S;
                    ctx.fillRect(x - sz, y - 2, sz * 2, 4); ctx.fillRect(x - 2, y - sz, 4, sz * 2);
                });
            }
            ctx.restore();
        }

        // 파티클 (음표, 코인)
        for (let i = parts.length - 1; i >= 0; i--) {
            const q = parts[i];
            q.x += q.vx * k; q.y += q.vy * k; q.vy += 0.18 * k; q.life -= 0.014 * k;
            if (q.life <= 0) { parts.splice(i, 1); continue; }
            ctx.globalAlpha = clamp(q.life * 1.5, 0, 1); ctx.fillStyle = q.col;
            if (q.txt) {
                ctx.font = `bold ${q.s * 4}px "Courier New",monospace`; ctx.lineWidth = 4; ctx.strokeStyle = '#000';
                if (q.txt === '$') ctx.strokeText(q.txt, Math.round(q.x), Math.round(q.y));
                ctx.fillText(q.txt, Math.round(q.x), Math.round(q.y));
            } else ctx.fillRect(Math.round(q.x / 4) * 4, Math.round(q.y / 4) * 4, q.s, q.s);
            ctx.globalAlpha = 1;
        }

        // 판정 글자
        const ja = (now - judge.t) / 700;
        if (ja < 1) {
            ctx.globalAlpha = 1 - ja; ctx.font = 'bold 56px "Courier New",monospace'; ctx.textAlign = 'center';
            ctx.lineWidth = 10; ctx.strokeStyle = '#000'; ctx.strokeText(judge.txt, CX, 84 - ja * 24);
            ctx.fillStyle = judge.col; ctx.fillText(judge.txt, CX, 84 - ja * 24);
            ctx.textAlign = 'start'; ctx.globalAlpha = 1;
        }

        // 시작 전 안내 : 화면을 살짝 어둡게 + 깜빡이는 글자
        if (!started) {
            ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, 640, 640);
            ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t / 300);
            ctx.font = 'bold 44px "Courier New",monospace'; ctx.textAlign = 'center';
            ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.strokeText('클릭해서 시작', CX, 330);
            ctx.fillStyle = '#fff'; ctx.fillText('클릭해서 시작', CX, 330);
            ctx.textAlign = 'start'; ctx.globalAlpha = 1;
        }
    }
    requestAnimationFrame(frame);
}

// ---------- Music 플레이어 ----------
// 플레이리스트(index.html 의 #music-list li) 를 차례로 재생. 액정 화면에 제목·시간·이퀄라이저 막대 표시
const musicAudio = document.getElementById('music-audio');
if (musicAudio) {
    const musicWin = document.getElementById('win-music');
    const items = [...document.querySelectorAll('#music-list li')];
    const titleEl = document.getElementById('music-title');
    const timeEl = document.getElementById('music-time');
    const stateEl = document.getElementById('music-state');
    const seek = document.getElementById('music-seek');
    const vol = document.getElementById('music-vol');
    const viz = document.getElementById('music-viz');
    const vctx = viz.getContext('2d');
    let cur = -1;

    const fmt = s => isFinite(s) ? String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '00:00';

    function setTitle(text) {
        titleEl.textContent = text;
        // 칸보다 길 때만 흐르게
        const box = titleEl.parentElement;
        box.classList.remove('scroll');
        box.classList.toggle('scroll', titleEl.offsetWidth > box.clientWidth);
    }

    function load(i) {
        cur = (i + items.length) % items.length;       // 맨 끝에서 다음 = 처음으로
        items.forEach((li, k) => li.classList.toggle('playing', k === cur));
        musicAudio.src = items[cur].dataset.src;
        setTitle(`${cur + 1}. ${items[cur].textContent.trim()}`);
    }
    function play(i) {
        if (i !== undefined || cur < 0) load(i ?? 0);
        musicAudio.play().catch(() => {});
    }

    musicAudio.volume = vol.value / 100;
    vol.addEventListener('input', () => { musicAudio.volume = vol.value / 100; updateIcons(); });

    // 재생 / 정지 버튼 하나 : 누를 때마다 번갈아 (정지하면 그 자리에서 멈춤)
    const playBtn = document.getElementById('music-play');
    playBtn.onclick = () => musicAudio.paused ? play() : musicAudio.pause();
    document.getElementById('music-prev').onclick = () => play(cur - 1);
    document.getElementById('music-next').onclick = () => play(cur + 1);
    musicAudio.addEventListener('ended', () => play(cur + 1));

    // 파일이 없으면 회색으로 표시하고 알려줌
    musicAudio.addEventListener('error', () => {
        if (cur < 0) return;
        items[cur].classList.add('missing');
        setTitle(`파일 없음 : ${items[cur].dataset.src}`);
    });

    // 플레이리스트 : 클릭 = 선택, 더블클릭 = 재생
    items.forEach((li, i) => {
        li.onclick = () => items.forEach(x => x.classList.toggle('selected', x === li));
        li.ondblclick = () => play(i);
    });

    // 재생 위치 막대 (드래그 중에는 자동으로 안 움직임)
    let seeking = false;
    seek.addEventListener('input', () => seeking = true);
    seek.addEventListener('change', () => {
        if (musicAudio.duration) musicAudio.currentTime = seek.value / 1000 * musicAudio.duration;
        seeking = false;
    });
    musicAudio.addEventListener('timeupdate', () => {
        timeEl.textContent = fmt(musicAudio.currentTime);
        if (!seeking && musicAudio.duration) seek.value = musicAudio.currentTime / musicAudio.duration * 1000;
    });

    // 곡의 data-icon 아이콘 사진을 재생 중에만 data-icon-src 로 바꿈 (원래 사진은 기억해 둠)
    function updateIcons() {
        items.forEach((li, k) => {
            if (!li.dataset.icon) return;
            const srcs = li.dataset.iconSrc.split(' ');
            const sizes = (li.dataset.iconScale || '').split(' ');   // 아이콘별 크기 배율 (없으면 1)
            li.dataset.icon.split(' ').forEach((id, n) => {
                const img = document.querySelector(`.icon[data-window="${id}"] img`);
                if (!img || !srcs[n]) return;
                img.dataset.orig ??= img.getAttribute('src');
                const on = k === cur && !musicAudio.paused;
                const src = on ? srcs[n] : img.dataset.orig;
                if (img.getAttribute('src') !== src) img.src = src;   // 같은 사진이면 gif 가 처음부터 다시 시작되지 않게
                // 바뀐 사진은 볼륨에 따라 크기도 변함 (볼륨 0 = 0.8배 ~ 100 = 3.5배)
                img.style.transform = on ? `scale(${(0.8 + musicAudio.volume * 2.7) * (+sizes[n] || 1)})` : '';
            });
        });
    }

    // 액정 상태 표시 (▶ 재생 / ❚❚ 일시정지 / ■ 처음) + 재생 버튼 모양 + 춤추는 아이콘
    const updateState = () => {
        stateEl.textContent = !musicAudio.paused ? '▶' : musicAudio.currentTime > 0 ? '❚❚' : '■';
        playBtn.textContent = musicAudio.paused ? '▶' : '❚❚';     // 버튼은 "누르면 할 일" 모양
        playBtn.classList.toggle('pressed', !musicAudio.paused);
        updateIcons();
    };
    ['play', 'pause', 'emptied', 'seeked'].forEach(ev => musicAudio.addEventListener(ev, updateState));

    // 이퀄라이저 막대 : 재생 중엔 출렁이고, 멈추면 천천히 내려앉음
    const BARS = 24, bars = new Array(BARS).fill(0);
    (function drawViz() {
        requestAnimationFrame(drawViz);
        if (!musicWin.classList.contains('open')) return;   // 창이 안 보이면 그리지 않음
        const w = viz.width = viz.clientWidth, h = viz.height = viz.clientHeight;
        const playing = !musicAudio.paused;
        const bw = w / BARS;
        for (let i = 0; i < BARS; i++) {
            const target = playing ? (0.25 + 0.75 * Math.random()) * (1 - i / BARS * 0.5) : 0;
            bars[i] += (target - bars[i]) * (playing ? 0.35 : 0.08);
            // 막대를 작은 칸으로 쌓아서 그림 (위쪽일수록 노랑 → 빨강)
            const cells = Math.round(bars[i] * 10);
            for (let c = 0; c < cells; c++) {
                vctx.fillStyle = c > 7 ? '#e00000' : c > 5 ? '#ffe600' : '#40DE28';
                vctx.fillRect(i * bw + 1, h - (c + 1) * (h / 10) + 1, bw - 2, h / 10 - 2);
            }
        }
    })();
}