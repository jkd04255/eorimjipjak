(() => {
  'use strict';

  const NAMESPACE = 'eorimjipjak-jkd04255';
  const BASE = 'https://counterapi.com';
  const PRODUCTION_HOST = 'jkd04255.github.io';
  const REPO_PREFIX = '/eorimjipjak';
  const USAGE_TICK_SECONDS = 5;
  const USAGE_TICK_MS = USAGE_TICK_SECONDS * 1000;
  const APP_KEYS = new Set([
    'calculator', 'spell-checker', 'kkamppak', 'survival', 'siren',
    'what-to-eat', 'nunchi-timer', 'gugu-mackerel', 'broken-clock',
    'solar-charge', 'clock-out', 'seolleong-seolleong', 'changbak',
    'frequency', 'excuse', 'memory-test', 'fishing', 'late-alarm', 'memo'
  ]);

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

  // 앱 페이지에서만 세션과 활성 이용시간을 기록합니다.
  // 화면이 보이는 동안 5초마다 usage5 이벤트 1회를 쌓습니다.
  function setupUsageTracking(key) {
    if (!APP_KEYS.has(key)) return;

    track('usage-session', key);
    let timer = null;

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      if (timer !== null || document.hidden) return;
      timer = setInterval(() => {
        if (!document.hidden) track('usage5', key);
      }, USAGE_TICK_MS);
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });
    window.addEventListener('pagehide', stop);
    window.addEventListener('pageshow', start);
    start();
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

  function ensureMemoHomeCard() {
    const grid = document.querySelector('main.grid');
    if (!grid || grid.querySelector('a.tool-card[href^="memo/"]')) return;

    const card = document.createElement('a');
    card.className = 'tool-card';
    card.href = 'memo/';
    card.innerHTML = '<div class="tool-top"><div class="tool-icon">▤</div><span class="tag">적어둔 건 확실함</span></div><h3>메모했는데</h3><p>적어둔 원본은 멀쩡하지만 메모장이 가끔 내용을 흐리거나, 다르게 기억하거나, 중요한 부분만 까먹습니다.</p><div class="tool-footer"><span>까먹는 메모장</span><span class="arrow">→</span></div>';

    const coming = grid.querySelector('.tool-card.coming');
    grid.insertBefore(card, coming || null);
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
    const { grid, cards, newestCards, comingCard } = state;
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

    if (scores.every((item) => item.score === null)) return;

    const normalized = scores.map((item) => ({
      ...item,
      score: item.score === null ? 0 : item.score
    }));

    const popularityOrder = [...normalized].sort((a, b) =>
      b.score - a.score || a.originalIndex - b.originalIndex
    );

    const popularTop2 = popularityOrder
      .filter((item) => item.score > 0)
      .slice(0, 2)
      .map((item) => item.card);

    const newestSet = new Set(newestCards);
    const newestEntries = [...newestCards]
      .reverse()
      .map((card) => popularityOrder.find((item) => item.card === card))
      .filter(Boolean);
    const finalOrder = popularityOrder.filter((item) => !newestSet.has(item.card));
    newestEntries.forEach((entry, index) => {
      finalOrder.splice(Math.min(2 + index, finalOrder.length), 0, entry);
    });

    const fragment = document.createDocumentFragment();
    finalOrder.forEach((item) => fragment.appendChild(item.card));
    if (comingCard) fragment.appendChild(comingCard);
    grid.appendChild(fragment);

    clearLiveBadges(cards);
    popularTop2.forEach((card) => addBadge(card, 'popular', '인기'));
    newestCards.forEach((card) => addBadge(card, 'new', 'NEW'));
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

    const newestCards = cards.slice(-2);
    prepareClusters(cards);

    const state = { grid, cards, newestCards, comingCard };
    refreshHomeRanking(state);

    setInterval(() => {
      if (!document.hidden) refreshHomeRanking(state);
    }, 60000);
  }

  const pageKey = keyFromPath(location.pathname);
  track('pageview', pageKey);
  setupUsageTracking(pageKey);

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

  ensureMemoHomeCard();
  setupHomeRanking();
})();
