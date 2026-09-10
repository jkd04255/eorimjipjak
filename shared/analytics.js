(() => {
  'use strict';

  const NAMESPACE = 'eorimjipjak-jkd04255';
  const BASE = 'https://counterapi.com';
  const PRODUCTION_HOST = 'jkd04255.github.io';
  const REPO_PREFIX = '/eorimjipjak';

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

  // 분석 페이지의 "누적 앱 실행" 값과 같은 기준을 사용합니다.
  async function readPopularity(key) {
    const params = new URLSearchParams({
      readOnly: 'true',
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
      const value = typeof data.value === 'number'
        ? data.value
        : Number(String(data.value || '0').replace(/,/g, ''));
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
      .tool-top .status-cluster{margin-left:auto;display:flex;align-items:flex-start;justify-content:flex-end;gap:6px;flex-wrap:wrap;max-width:68%}
      .tool-top .status-cluster>.tag{margin:0}
      .live-badge{display:inline-flex;align-items:center;justify-content:center;min-height:23px;padding:4px 9px;border-radius:6px;font-size:10px;font-weight:900;line-height:1;letter-spacing:.25px;box-shadow:0 2px 0 rgba(34,35,44,.12);white-space:nowrap}
      .live-badge.popular{background:#ef4444;color:#fff;transform:rotate(-2deg)}
      .live-badge.new{background:#ffd84d;color:#4d3b00;transform:rotate(2deg)}
      @media(max-width:720px){.tool-top .status-cluster{max-width:72%;gap:5px}.live-badge{padding:4px 8px;font-size:9px}}
    `;
    document.head.appendChild(style);
  }

  function prepareClusters(cards) {
    injectBadgeStyles();
    cards.forEach((card) => {
      const top = card.querySelector('.tool-top');
      if (!top) return;

      let cluster = top.querySelector('.status-cluster');
      if (cluster) return;

      const tag = top.querySelector('.tag');
      if (!tag) return;

      cluster = document.createElement('div');
      cluster.className = 'status-cluster';
      top.insertBefore(cluster, tag);
      cluster.appendChild(tag);
    });
  }

  function clearLiveBadges(cards) {
    cards.forEach((card) => {
      card.querySelectorAll('.live-badge').forEach((badge) => badge.remove());
    });
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

    // 통계를 전부 읽은 뒤 한 번에 DOM을 움직여 중간 실패로 순서가 깨지지 않게 합니다.
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

    // 통계 서버 전체가 실패하면 현재 화면 순서를 그대로 둡니다.
    if (scores.every((item) => item.score === null)) return;

    const normalized = scores.map((item) => ({
      ...item,
      score: item.score === null ? 0 : item.score
    }));

    const popularityOrder = [...normalized].sort((a, b) =>
      b.score - a.score || a.originalIndex - b.originalIndex
    );

    // 실제 누적 실행 수 1·2위에는 인기 배지를 붙입니다.
    const popularTop2 = popularityOrder
      .filter((item) => item.score > 0)
      .slice(0, 2)
      .map((item) => item.card);

    // 최신 앱은 순위와 무관하게 정확히 세 번째에 고정합니다.
    const newestEntry = popularityOrder.find((item) => item.card === newestCard) || null;
    const finalOrder = popularityOrder.filter((item) => item.card !== newestCard);
    if (newestEntry) finalOrder.splice(Math.min(2, finalOrder.length), 0, newestEntry);

    // 한 번에 전체 순서를 적용합니다.
    const fragment = document.createDocumentFragment();
    finalOrder.forEach((item) => fragment.appendChild(item.card));
    if (comingCard) fragment.appendChild(comingCard);
    grid.appendChild(fragment);

    clearLiveBadges(cards);
    popularTop2.forEach((card) => addBadge(card, 'popular', '인기'));
    if (newestCard) addBadge(newestCard, 'new', 'NEW');
  }

  function setupHomeRanking() {
    const grid = document.querySelector('main.grid');
    if (!grid) return;

    const cards = Array.from(grid.children).filter((el) =>
      el.matches && el.matches('a.tool-card[href]')
    );
    const comingCard = Array.from(grid.children).find((el) =>
      el.matches && el.matches('.tool-card.coming')
    ) || null;
    if (cards.length === 0) return;

    cards.forEach((card, index) => {
      card.dataset.originalIndex = String(index);
    });

    const newestCard = cards[cards.length - 1] || null;
    prepareClusters(cards);

    const state = { grid, cards, newestCard, comingCard };
    refreshHomeRanking(state);

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
