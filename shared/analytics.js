(() => {
  'use strict';

  const NAMESPACE = 'eorimjipjak-jkd04255';
  const BASE = 'https://counterapi.com';
  const PRODUCTION_HOST = 'jkd04255.github.io';
  const REPO_PREFIX = '/eorimjipjak';
  const POPULARITY_WINDOW = '7d';

  if (location.hostname !== PRODUCTION_HOST) return;

  function keyFromPath(pathname) {
    let path = pathname || '/';
    if (path.startsWith(REPO_PREFIX)) path = path.slice(REPO_PREFIX.length);
    path = path.replace(/^\/+|\/+$/g, '');
    if (!path) return 'home';

    const first = path.split('/')[0] || 'home';
    return first.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 80) || 'other';
  }

  function track(action, key) {
    const url = new URL(`${BASE}/pixel.gif`);
    url.searchParams.set('ns', NAMESPACE);
    url.searchParams.set('action', action);
    url.searchParams.set('key', key);
    url.searchParams.set('_', `${Date.now()}-${Math.random().toString(36).slice(2)}`);

    try {
      fetch(url.toString(), {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        keepalive: true,
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      }).catch(() => {});
    } catch (_) {
      const img = new Image(1, 1);
      img.referrerPolicy = 'no-referrer';
      img.src = url.toString();
    }
  }

  async function readPopularity(key) {
    const params = new URLSearchParams({
      readOnly: 'true',
      timeline: POPULARITY_WINDOW,
      unique: 'true',
      _: Date.now().toString()
    });
    const url = `${BASE}/api/${encodeURIComponent(NAMESPACE)}/launch/${encodeURIComponent(key)}?${params}`;

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      });
      if (response.status === 404) return 0;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const value = typeof data.value === 'number' ? data.value : Number(String(data.value || '0').replace(/,/g, ''));
      return Number.isFinite(value) ? value : 0;
    } catch (_) {
      return null;
    }
  }

  function injectBadgeStyles() {
    if (document.getElementById('toolbox-live-badge-styles')) return;
    const style = document.createElement('style');
    style.id = 'toolbox-live-badge-styles';
    style.textContent = `
      .tool-top .status-cluster{margin-left:auto;display:flex;align-items:flex-start;justify-content:flex-end;gap:6px;flex-wrap:wrap;max-width:64%}
      .tool-top .status-cluster>.tag{margin:0}
      .live-badge{display:inline-flex;align-items:center;justify-content:center;min-height:23px;padding:4px 9px;border-radius:6px;font-size:10px;font-weight:900;line-height:1;letter-spacing:.25px;box-shadow:0 2px 0 rgba(34,35,44,.12);white-space:nowrap}
      .live-badge.popular{background:#ef4444;color:#fff;transform:rotate(-2deg)}
      .live-badge.new{background:#ffd84d;color:#4d3b00;transform:rotate(2deg)}
      @media(max-width:720px){.tool-top .status-cluster{max-width:68%;gap:5px}.live-badge{padding:4px 8px;font-size:9px}}
    `;
    document.head.appendChild(style);
  }

  function prepareClusters(cards) {
    injectBadgeStyles();
    cards.forEach((card) => {
      const top = card.querySelector('.tool-top');
      const tag = top && top.querySelector(':scope > .tag');
      if (!top || !tag || top.querySelector(':scope > .status-cluster')) return;

      const cluster = document.createElement('div');
      cluster.className = 'status-cluster';
      top.insertBefore(cluster, tag);
      cluster.appendChild(tag);
    });
  }

  function clearLiveBadges(cards) {
    cards.forEach((card) => card.querySelectorAll('.live-badge').forEach((badge) => badge.remove()));
  }

  function addBadge(card, type, text) {
    const cluster = card.querySelector('.status-cluster');
    if (!cluster) return;
    const badge = document.createElement('span');
    badge.className = `live-badge ${type}`;
    badge.textContent = text;
    badge.setAttribute('aria-label', text);
    cluster.appendChild(badge);
  }

  async function refreshHomeRanking(state) {
    const { grid, cards, newestCard, comingCard } = state;
    if (!grid || cards.length === 0) return;

    const scores = await Promise.all(cards.map(async (card) => {
      const key = keyFromPath(new URL(card.href, location.href).pathname);
      const score = await readPopularity(key);
      return {
        card,
        key,
        score,
        originalIndex: Number(card.dataset.originalIndex || 0)
      };
    }));

    const hasAnyResponse = scores.some((item) => item.score !== null);
    if (!hasAnyResponse) return;

    scores.forEach((item) => {
      if (item.score === null) item.score = 0;
    });

    const popularityOrder = [...scores].sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);
    const popularTop2 = popularityOrder.filter((item) => item.score > 0).slice(0, 2).map((item) => item.card);

    const withoutNewest = popularityOrder.filter((item) => item.card !== newestCard);
    const finalOrder = [...withoutNewest];
    const insertAt = Math.min(2, finalOrder.length);
    if (newestCard) finalOrder.splice(insertAt, 0, newestCard);

    finalOrder.forEach((item) => grid.appendChild(item.card));
    if (comingCard) grid.appendChild(comingCard);

    clearLiveBadges(cards);
    popularTop2.forEach((card) => addBadge(card, 'popular', '인기'));
    if (newestCard) addBadge(newestCard, 'new', 'NEW');
  }

  function setupHomeRanking() {
    const grid = document.querySelector('main.grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll(':scope > a.tool-card[href]'));
    const comingCard = grid.querySelector(':scope > .tool-card.coming');
    if (cards.length === 0) return;

    cards.forEach((card, index) => {
      card.dataset.originalIndex = String(index);
    });

    const newestCard = cards[cards.length - 1] || null;
    prepareClusters(cards);

    const state = { grid, cards, newestCard, comingCard };
    refreshHomeRanking(state);

    // 홈을 계속 열어둔 경우에도 최신 인기 순서를 주기적으로 반영합니다.
    setInterval(() => {
      if (!document.hidden) refreshHomeRanking(state);
    }, 60000);
  }

  track('pageview', keyFromPath(location.pathname));

  document.addEventListener('click', (event) => {
    const card = event.target.closest && event.target.closest('a.tool-card[href]');
    if (!card || card.classList.contains('coming')) return;

    try {
      const target = new URL(card.href, location.href);
      if (target.hostname !== location.hostname) return;
      const key = keyFromPath(target.pathname);
      track('launch', key);
      track('launch', 'any');
    } catch (_) {
      // 잘못된 링크 하나 때문에 페이지 동작이 깨지지 않도록 무시합니다.
    }
  }, { capture: true });

  setupHomeRanking();
})();
