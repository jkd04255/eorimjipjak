(() => {
  'use strict';

  const NAMESPACE = 'eorimjipjak-jkd04255';
  const BASE = 'https://counterapi.com';
  const PRODUCTION_HOST = 'jkd04255.github.io';
  const REPO_PREFIX = '/eorimjipjak';

  // 로컬 미리보기나 다른 호스트에서 테스트할 때는 통계를 올리지 않습니다.
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

    // 페이지 이동 직전 클릭도 최대한 놓치지 않도록 keepalive를 사용합니다.
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

  // 현재 페이지 조회 수. 지금은 홈에 연결되어 있고, 같은 스크립트를 다른 앱에
  // 추가하면 해당 앱의 직접 방문도 자동으로 집계됩니다.
  track('pageview', keyFromPath(location.pathname));

  // 홈의 앱 카드를 눌러 실행한 횟수.
  document.addEventListener('click', (event) => {
    const card = event.target.closest && event.target.closest('a.tool-card[href]');
    if (!card || card.classList.contains('coming')) return;

    try {
      const target = new URL(card.href, location.href);
      if (target.hostname !== location.hostname) return;
      track('launch', keyFromPath(target.pathname));
    } catch (_) {
      // 잘못된 링크 하나 때문에 페이지 동작이 깨지지 않도록 무시합니다.
    }
  }, { capture: true });
})();
