// =========================================================
//  Pepe Explorer : 옛날 인터넷 브라우저 + 페페 짤 검색 (GIPHY)
//  - index.html 의 <div id="explorer-root"> 안에 화면을 자동으로 만들어요
//  - script.js 는 건드리지 않아도 돼요 (script.js 다음 줄에서 불러오기)
//  - 사진 파일 없이 검색할 때마다 GIPHY 에서 짤을 받아와요
//
//  조작 : 검색창이나 주소창에 키워드 입력 → 앞에 "pepe" 를 붙여서 검색 (angry → pepe angry)
//         짤 클릭 = 크게 보기 · Back / Forward / Refresh / Home = 브라우저 버튼처럼
// =========================================================
(() => {
'use strict';

const root = document.getElementById('explorer-root');
if (!root) return;

/* ▼ GIPHY 설정 */
const API_KEY = 'eVzMS1kxlmbKHLcIgxajA9DtQ0UAB0TB';   // developers.giphy.com 에서 받은 키
const API_URL = 'https://api.giphy.com/v1/gifs/search';
const PREFIX = 'pepe';            // 검색어 앞에 자동으로 붙는 말 (이미 들어 있으면 안 붙임)
const RATING = 'g';               // 연령 등급 : g = 전체 이용가 (pg, pg-13, r 순으로 느슨해짐)
const PER_PAGE = 24;              // 한 페이지에 나오는 짤 개수

/* ▼ 첫 화면 */
const HOME_URL = 'http://www.pepesearch.com/';
const POPULAR = ['happy', 'sad', 'angry', 'smug', 'rich', 'dance', 'cry'];   // 인기 검색어

/* =========================================================
   화면 만들기
   ========================================================= */
root.innerHTML = `
    <div class="ex-toolbar">
        <button class="btn ex-back" type="button" disabled>&#9664; Back</button>
        <button class="btn ex-fwd" type="button" disabled>Forward &#9654;</button>
        <button class="btn ex-reload" type="button">Refresh</button>
        <button class="btn ex-home" type="button">Home</button>
        <div class="ex-throbber"><b>e</b></div>
    </div>
    <form class="ex-address">
        <span>Address</span>
        <input type="text" spellcheck="false" autocomplete="off">
        <button class="btn" type="submit">Go</button>
    </form>
    <div class="ex-frame">
        <div class="ex-page"></div>
        <div class="ex-view" hidden>
            <div class="ex-view-box bevel">
                <img alt="">
                <p class="ex-view-title"></p>
                <div class="ex-view-btns">
                    <button class="btn ex-save" type="button">갤러리에 저장</button>
                    <a class="btn" target="_blank" rel="noopener">GIPHY에서 보기</a>
                    <button class="btn ex-close" type="button">닫기</button>
                </div>
            </div>
        </div>
    </div>
    <div class="ex-status">
        <span class="ex-status-text">Done</span>
        <div class="ex-progress"><i></i></div>
        <span class="ex-giphy">Powered by GIPHY</span>
    </div>`;

const backBtn   = root.querySelector('.ex-back');
const fwdBtn    = root.querySelector('.ex-fwd');
const address   = root.querySelector('.ex-address input');
const page      = root.querySelector('.ex-page');
const view      = root.querySelector('.ex-view');
const viewImg   = view.querySelector('img');
const viewTitle = view.querySelector('.ex-view-title');
const viewLink  = view.querySelector('a');
const saveBtn   = view.querySelector('.ex-save');
const statusTxt = root.querySelector('.ex-status-text');
const progress  = root.querySelector('.ex-progress i');

// 검색어를 글자 그대로 보여주기 (태그로 안 읽히게)
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pageUrl = st => st.q ? `${HOME_URL}search?q=${encodeURIComponent(st.q)}${st.offset ? '&start=' + st.offset : ''}` : HOME_URL;

/* =========================================================
   방문 기록 (Back / Forward)
   ========================================================= */
const hist = [];   // { q: 검색어 (없으면 첫 화면), offset: 몇 번째 짤부터 }
let pos = -1;

function go(st) {
    hist.splice(pos + 1);
    hist.push(st);
    pos = hist.length - 1;
    load();
}

function load() {
    const st = hist[pos];
    backBtn.disabled = pos <= 0;
    fwdBtn.disabled = pos >= hist.length - 1;
    address.value = pageUrl(st);
    closeView();
    if (st.q) search(st); else home();
}

/* =========================================================
   불러오는 중 표시 : 아래 진행 막대가 차오르고 오른쪽 위 로고가 돎
   ========================================================= */
let progTimer = null;

function startLoading(text) {
    statusTxt.textContent = text;
    root.classList.add('loading');
    let p = 5;
    progress.style.width = p + '%';
    clearInterval(progTimer);
    progTimer = setInterval(() => {
        p += (90 - p) * 0.12;            // 90% 근처에서 기다림
        progress.style.width = p + '%';
    }, 120);
}

function endLoading(text) {
    clearInterval(progTimer);
    progress.style.width = '100%';
    statusTxt.textContent = text;
    root.classList.remove('loading');
    progTimer = setTimeout(() => { progress.style.width = '0'; }, 400);
}

/* =========================================================
   페이지들
   ========================================================= */
const searchForm = (q = '') => `
    <form class="ex-search">
        <input type="text" value="${esc(q)}" placeholder="키워드 입력 (예: angry)" spellcheck="false" autocomplete="off">
        <button class="btn" type="submit">Search</button>
    </form>`;

function home() {
    page.innerHTML = `
        <div class="ex-home-page">
            <h2 class="ex-brand">Pepe<b>Search</b></h2>
            ${searchForm()}
            <p class="ex-popular">인기 검색어 :
                ${POPULAR.map(w => `<a href="#" data-q="${w}">${w}</a>`).join(' · ')}</p>
        </div>`;
    page.scrollTop = 0;
    endLoading('Done');
}

let reqId = 0;   // 빨리 연달아 검색하면 마지막 검색 결과만 보여줌

async function search(st) {
    const id = ++reqId;
    const term = st.q.toLowerCase().includes(PREFIX) ? st.q : `${PREFIX} ${st.q}`;
    startLoading(`Opening page ${pageUrl(st)}...`);

    let json;
    try {
        const url = `${API_URL}?api_key=${API_KEY}&q=${encodeURIComponent(term)}` +
                    `&limit=${PER_PAGE}&offset=${st.offset}&rating=${RATING}&lang=en`;
        const res = await fetch(url);
        if (id !== reqId) return;
        if (!res.ok) throw new Error(res.status === 429 ? 'too-many' : 'http');
        json = await res.json();
    } catch (e) {
        if (id !== reqId) return;
        errorPage(e.message === 'too-many');
        return;
    }
    if (id !== reqId) return;

    const gifs = json.data || [];
    const total = Math.min(json.pagination ? json.pagination.total_count : gifs.length, 4999);   // GIPHY 는 5000개까지만 넘겨줌
    const from = st.offset + 1, to = st.offset + gifs.length;

    page.innerHTML = `
        <div class="ex-results">
            <div class="ex-results-head">
                <h2 class="ex-brand small">Pepe<b>Search</b></h2>
                ${searchForm(st.q)}
            </div>
            <p class="ex-count">${gifs.length
                ? `<b>"${esc(st.q)}"</b> 검색 결과 ${total.toLocaleString()}개 중 ${from}–${to}`
                : `<b>"${esc(st.q)}"</b> 에 맞는 페페 짤이 없어요. 다른 키워드로 찾아보세요.`}</p>
            <div class="ex-grid">
                ${gifs.map((g, i) => `
                    <button class="ex-item" type="button" data-i="${i}" title="${esc(g.title)}">
                        <img src="${g.images.fixed_width.url}" alt="${esc(g.title)}" loading="lazy">
                    </button>`).join('')}
            </div>
            <div class="ex-pager">
                <button class="btn" type="button" data-move="-1" ${st.offset ? '' : 'disabled'}>&#9664; 이전</button>
                <button class="btn" type="button" data-move="1" ${to < total ? '' : 'disabled'}>다음 &#9654;</button>
            </div>
        </div>`;
    page.scrollTop = 0;
    page.gifs = gifs;
    endLoading(gifs.length ? 'Done' : 'Done (0 results)');
}

// 인터넷이 끊기거나 검색 횟수를 다 쓴 경우 : 옛날 브라우저 오류 페이지
function errorPage(tooMany) {
    page.innerHTML = `
        <div class="ex-error">
            <h2>페이지를 표시할 수 없습니다</h2>
            <p>${tooMany
                ? '검색을 너무 많이 했어요. GIPHY 무료 키는 한 시간에 검색할 수 있는 횟수가 정해져 있어요. 잠시 뒤에 다시 시도해 주세요.'
                : '찾고 있는 페이지에 연결할 수 없어요. 인터넷 연결을 확인한 뒤 <b>Refresh</b> 를 눌러 주세요.'}</p>
        </div>`;
    endLoading('Error on page');
}

/* =========================================================
   크게 보기
   ========================================================= */
let viewing = null;   // 크게 보는 중인 짤

function openView(g) {
    viewing = g;
    viewImg.src = g.images.downsized.url || g.images.fixed_width.url;
    viewImg.alt = g.title;
    viewTitle.textContent = g.title || 'pepe';
    viewLink.href = g.url;
    saveBtn.textContent = '갤러리에 저장';
    saveBtn.disabled = false;
    view.hidden = false;
}
function closeView() {
    view.hidden = true;
    viewing = null;
    viewImg.removeAttribute('src');
}
view.addEventListener('click', e => {
    if (e.target === view || e.target.matches('.ex-close')) closeView();
});

// 갤러리에 저장 : gallery.js 에 짤 주소를 넘김 (이미 있으면 "이미 저장됨")
saveBtn.addEventListener('click', () => {
    if (!viewing) return;
    const title = (viewing.title || 'pepe').replace(/\s+GIF\b.*$/i, '').trim().slice(0, 40) || 'pepe';
    const detail = {
        src: viewing.images.downsized.url || viewing.images.fixed_width.url,
        thumb: viewing.images.fixed_width.url,
        name: title + '.gif',
    };
    document.dispatchEvent(new CustomEvent('gallery:add', { detail }));
    saveBtn.textContent = detail.result === 'exists' ? '이미 저장됨' : detail.result === 'saved' ? '저장됨 ✓' : '저장 실패';
    saveBtn.disabled = true;
    if (detail.result === 'saved') statusTxt.textContent = `${detail.name} → Gallery 에 저장됨`;
});

/* =========================================================
   버튼 · 입력
   ========================================================= */
page.addEventListener('submit', e => {
    e.preventDefault();
    go({ q: e.target.querySelector('input').value.trim(), offset: 0 });   // 빈칸이면 첫 화면
});

page.addEventListener('click', e => {
    const word = e.target.closest('[data-q]');
    const item = e.target.closest('.ex-item');
    const move = e.target.closest('[data-move]');
    if (word) {
        e.preventDefault();
        go({ q: word.dataset.q, offset: 0 });
    } else if (item) {
        openView(page.gifs[+item.dataset.i]);
    } else if (move) {
        const st = hist[pos];
        go({ q: st.q, offset: Math.max(0, st.offset + move.dataset.move * PER_PAGE) });
    }
});

// 주소창 : 주소(…?q=angry)를 넣으면 그 검색어로, 그냥 글자를 넣으면 검색어로
root.querySelector('.ex-address').addEventListener('submit', e => {
    e.preventDefault();
    const v = address.value.trim();
    const m = v.match(/[?&]q=([^&]*)/);
    const q = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : (v === HOME_URL || /^(https?:\/\/)?(www\.)?pepesearch\.com\/?$/i.test(v) ? '' : v);
    go({ q, offset: 0 });
});
address.addEventListener('focus', () => address.select());

backBtn.addEventListener('click', () => { if (pos > 0) { pos--; load(); } });
fwdBtn.addEventListener('click', () => { if (pos < hist.length - 1) { pos++; load(); } });
root.querySelector('.ex-reload').addEventListener('click', load);
root.querySelector('.ex-home').addEventListener('click', () => go({ q: '', offset: 0 }));

go({ q: '', offset: 0 });
})();
