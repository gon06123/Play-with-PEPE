// =========================================================
//  Gallery : 옛날 윈도우 사진 폴더
//  - index.html 의 <div id="gallery-root"> 안 <ul class="gallery-src"> 목록을 읽어서 화면을 만들어요
//  - script.js 는 건드리지 않아도 돼요 (script.js 다음 줄에서 불러오기)
//  - Pepe Explorer 에서 "갤러리에 저장" 한 짤도 여기 들어와요 (브라우저에 저장돼서 새로고침해도 남음)
//
//  조작 : 썸네일 클릭 = 선택 · 더블클릭(또는 Enter) = 크게 보기
//         크게 보기에서 ◀ ▶ 버튼 또는 ← → 키 = 넘기기 · Esc / 닫기 = 폴더로
//         저장한 짤은 크게 보기의 "삭제" 버튼 또는 Delete 키로 지우기 (원래 목록 사진은 안 지워짐)
// =========================================================
(() => {
'use strict';

const root = document.getElementById('gallery-root');
if (!root) return;

const FOLDER = 'C:\\My Documents\\Gallery';   // 주소창에 보이는 폴더 경로
const SAVED_KEY = 'gallery-saved';            // 저장한 짤 목록 저장 이름

// 원래 목록 : <li data-src="사진">이름</li>
const builtIn = [...root.querySelectorAll('.gallery-src li')].map(li => ({
    src: li.dataset.src,
    name: li.textContent.trim() || li.dataset.src.split('/').pop(),
}));

// 저장한 짤 : { src, thumb(작은 그림, 없으면 src), name, saved: true }
let saved = [];
try { saved = JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch (e) {}
const keep = () => { try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); } catch (e) {} };

let photos = [];

/* =========================================================
   화면 만들기
   ========================================================= */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

root.innerHTML = `
    <div class="gal-address">
        <span>Address</span>
        <div class="gal-path"><img src="images/icon-gallery.png" alt="">${esc(FOLDER)}</div>
    </div>
    <div class="gal-frame">
        <div class="gal-grid"></div>
        <div class="gal-view" hidden>
            <div class="gal-view-pic"><img alt=""></div>
            <div class="gal-view-bar">
                <button class="btn gal-prev" type="button">&#9664;</button>
                <span class="gal-view-name"></span>
                <button class="btn gal-next" type="button">&#9654;</button>
                <button class="btn gal-del" type="button">삭제</button>
                <button class="btn gal-close" type="button">닫기</button>
            </div>
        </div>
    </div>
    <div class="gal-status">
        <span class="gal-status-text"></span>
        <span>My Computer</span>
    </div>`;

const win      = root.closest('.window');
const grid     = root.querySelector('.gal-grid');
const view     = root.querySelector('.gal-view');
const viewImg  = view.querySelector('img');
const viewName = root.querySelector('.gal-view-name');
const delBtn   = root.querySelector('.gal-del');
const status   = root.querySelector('.gal-status-text');

let items = [];
let selected = -1;
let current = -1;   // 크게 보는 중인 사진 (-1 = 폴더 화면)

// 썸네일 격자 다시 그리기 (원래 목록 → 저장한 짤 순서)
function render() {
    photos = [...builtIn, ...saved];
    grid.innerHTML = photos.map((p, i) => `
        <button class="gal-item${p.saved ? ' saved' : ''}" type="button" data-i="${i}">
            <span class="gal-thumb"><img src="${esc(p.thumb || p.src)}" alt="" loading="lazy"></span>
            <span class="gal-name">${esc(p.name)}</span>
        </button>`).join('');
    items = [...grid.children];
}

function showStatus(msg) {
    status.textContent = msg || (selected >= 0
        ? `${photos[selected].name} 선택됨`
        : `${photos.length}개 개체`);
}

/* =========================================================
   선택 · 크게 보기
   ========================================================= */
function select(i) {
    items.forEach((el, n) => el.classList.toggle('selected', n === i));
    selected = i;
    showStatus();
}

function openView(i) {
    current = (i + photos.length) % photos.length;   // 끝에서 넘기면 처음으로
    const p = photos[current];
    viewImg.src = p.src;
    viewImg.alt = p.name;
    viewName.textContent = `${p.name}  (${current + 1} / ${photos.length})`;
    delBtn.hidden = !p.saved;
    view.hidden = false;
    select(current);
}

function closeView() {
    view.hidden = true;
    current = -1;
    items[selected]?.focus();
}

// 저장한 짤 지우기
function remove(i) {
    const p = photos[i];
    if (!p || !p.saved) return;
    saved.splice(saved.indexOf(p), 1);
    keep();
    render();
    if (current >= 0) {
        if (photos.length) openView(Math.min(i, photos.length - 1)); else closeView();
    } else {
        select(-1);
    }
    showStatus(`${p.name} 삭제됨`);
}

grid.addEventListener('click', e => {
    const item = e.target.closest('.gal-item');
    select(item ? +item.dataset.i : -1);
});
grid.addEventListener('dblclick', e => {
    const item = e.target.closest('.gal-item');
    if (item) openView(+item.dataset.i);
});

root.querySelector('.gal-prev').addEventListener('click', () => openView(current - 1));
root.querySelector('.gal-next').addEventListener('click', () => openView(current + 1));
root.querySelector('.gal-close').addEventListener('click', closeView);
delBtn.addEventListener('click', () => remove(current));

// 키보드 : 이 창이 맨 앞(active)일 때만
document.addEventListener('keydown', e => {
    if (!win || !win.classList.contains('active')) return;
    if (current >= 0) {
        if (e.key === 'ArrowLeft') openView(current - 1);
        else if (e.key === 'ArrowRight') openView(current + 1);
        else if (e.key === 'Escape') closeView();
        else if (e.key === 'Delete') remove(current);
        else return;
        e.preventDefault();
    } else if (selected >= 0) {
        if (e.key === 'Enter') openView(selected);
        else if (e.key === 'Delete') remove(selected);
        else return;
        e.preventDefault();
    }
});

// 창이 닫히면 다음에 열 때 폴더 화면부터
new IntersectionObserver(([en]) => { if (!en.isIntersecting && current >= 0) closeView(); }).observe(root);

/* =========================================================
   다른 앱에서 저장 : document.dispatchEvent(new CustomEvent('gallery:add', { detail: { src, thumb, name } }))
   → 저장되면 detail.result = 'saved', 이미 있으면 'exists'
   ========================================================= */
document.addEventListener('gallery:add', e => {
    const { src, thumb, name } = e.detail;
    if (photos.some(p => p.src === src)) { e.detail.result = 'exists'; return; }
    saved.push({ src, thumb, name, saved: true });
    keep();
    render();
    select(selected);   // 다시 그려도 고르던 사진은 그대로 (새 짤은 맨 뒤에 붙음)
    showStatus(`${name} 저장됨`);
    e.detail.result = 'saved';
});

render();
showStatus();
})();
