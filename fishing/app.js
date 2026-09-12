(()=>{
    const items=[
      {id:'bone',name:'물고기 뼈',icon:'🦴',rarity:'흔함',weight:18,speed:.64,jump:.035,note:'생선은 이미 누가 먹고 갔습니다. 낚시라고 하기엔 조금 늦었습니다.'},
      {id:'keyring',name:'금붕어 모양 키링',icon:'🔑',rarity:'흔함',weight:15,speed:.72,jump:.045,note:'가방에 달면 제법 귀엽습니다. 물속에서 건진 것만 빼면요.'},
      {id:'plate',name:'물고기 무늬 그릇',icon:'🥣',rarity:'흔함',weight:14,speed:.76,jump:.048,note:'그릇 안에는 물고기가 없습니다. 그릇 밖에도 없습니다.'},
      {id:'bread',name:'붕어빵',icon:'🥮',rarity:'흔함',weight:13,speed:.80,jump:.055,note:'낚자마자 살짝 눅눅합니다. 그래도 붕어보다 붕어빵이 낫죠.'},
      {id:'soap',name:'물고기 모양 비누',icon:'🧼',rarity:'보통',weight:9,speed:1.00,jump:.065,note:'잡을수록 미끄럽습니다. 놀랍게도 비누라서 그렇습니다.'},
      {id:'slipper',name:'물고기 슬리퍼 한 짝',icon:'🩴',rarity:'보통',weight:8,speed:1.10,jump:.07,note:'반대쪽은 어디 갔을까요. 다음 낚시에도 안 나올 가능성이 높습니다.'},
      {id:'pouch',name:'고등어 연필통',icon:'✏️',rarity:'보통',weight:7,speed:1.20,jump:.072,note:'지퍼를 열어봤지만 연필만 있습니다. 고등어는 역시 없습니다.'},
      {id:'saucer',name:'생선 모양 간장종지',icon:'🍶',rarity:'보통',weight:7,speed:1.20,jump:.075,note:'회는 없고 간장종지만 있습니다. 순서가 많이 잘못됐습니다.'},
      {id:'opener',name:'물고기 모양 병따개',icon:'🧲',rarity:'희귀',weight:5,speed:1.60,jump:.085,note:'병은 잘 따지만 바다의 비밀은 못 엽니다.'},
      {id:'sock',name:'물고기 자수 양말',icon:'🧦',rarity:'희귀',weight:5,speed:1.60,jump:.09,note:'젖은 양말을 낚았습니다. 이것보다 기분 나쁜 전리품도 드뭅니다.'},
      {id:'paperweight',name:'유리 물고기 문진',icon:'💎',rarity:'희귀',weight:4,speed:1.78,jump:.10,note:'빛에 비추면 예쁩니다. 수조에 넣어도 먹이는 필요 없습니다.'},
      {id:'wood',name:'목각 잉어 장식',icon:'🪵',rarity:'희귀',weight:3.7,speed:1.88,jump:.105,note:'힘차게 헤엄치는 척하지만 소재 특성상 전혀 헤엄치지 못합니다.'},
      {id:'stopper',name:'물고기 도어스토퍼',icon:'🚪',rarity:'매우 희귀',weight:2.5,speed:2.30,jump:.115,note:'문은 잘 잡습니다. 방금은 낚싯줄도 꽤 잘 잡았습니다.'},
      {id:'balloon',name:'금붕어 풍선',icon:'🎈',rarity:'매우 희귀',weight:2.1,speed:2.55,jump:.13,note:'물속에서 풍선을 낚았다는 부분은 깊이 생각하지 않는 편이 좋습니다.'},
      {id:'sign',name:'물고기 그림 낚시금지 표지판',icon:'🚫',rarity:'전설?',weight:1.2,speed:3.05,jump:.15,note:'표지판을 낚아버렸습니다. 이제 이곳에서 낚시해도 되는지는 더 애매해졌습니다.'}
    ];
    // Smaller spawn weights have higher speed multipliers. Keep the 15-item
    // collection separate so the bonus fish is never required to unlock itself.
    const GOLDEN_REPEAT_CHANCE = .005;
    const goldenFish = {id:'golden-fish',name:'황금 물고기',rarity:'황금',speed:3.50,jump:.17,note:'생활용품 15종을 다 건졌더니, 드디어 진짜 물고기가 나왔습니다. 물고기가 없다던 관리인은 잠시 자리를 비웠습니다.'};

    const $ = id => document.getElementById(id);
    const stage = $('fishing-stage'), mainBtn = $('main-btn'), againBtn = $('again-btn');
    const mini = $('mini-game'), holdBtn = $('hold-btn'), bar = $('catch-bar');
    const target = $('target'), lane = $('lane'), result = $('result-box');
    const statusMain = $('status-main'), statusSub = $('status-sub');
    const sceneTitle = $('scene-title'), sceneSub = $('scene-sub'), caseStatus = $('case-status');
    const progressFill = $('progress-fill'), progressValue = $('progress-value');
    const progressMeter = $('catch-progress'), trackingState = $('tracking-state');
    const activePointers = new Set();
    let state = 'ready', biteTimer = null, biteTimeout = null, raf = null, last = 0;
    let held = false, spaceDown = false, enterDown = false, keyboardHeld = false;
    const START_BAR_Y = 3, START_TARGET_Y = 4, START_PROGRESS = 24;
    let targetItem = null, barY = START_BAR_Y, barV = 0, targetY = START_TARGET_Y, targetV = 0;
    let targetGoal = START_TARGET_Y, progress = START_PROGRESS, displayedProgress = -1, wasInside = null;
    const scene = $('scene'), fishingLine = $('fishing-line');
    const rodTip = $('rod-tip'), floatTip = $('float-tip');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lineRaf = null;
    function syncLine() {
      if (state !== 'waiting' && state !== 'bite') return;
      const bounds = scene.getBoundingClientRect();
      const tip = rodTip.getBoundingClientRect(), float = floatTip.getBoundingClientRect();
      const scaleX = 1000 / scene.clientWidth, scaleY = 667 / scene.clientHeight;
      const x1 = (tip.left - bounds.left - scene.clientLeft) * scaleX;
      const y1 = (tip.top - bounds.top - scene.clientTop) * scaleY;
      const x2 = (float.left - bounds.left - scene.clientLeft) * scaleX;
      const y2 = (float.top - bounds.top - scene.clientTop) * scaleY;
      fishingLine.setAttribute('d', `M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + 10} ${x2} ${y2}`);
    }
    function animateLine() {
      lineRaf = null;
      if (document.hidden || (state !== 'waiting' && state !== 'bite')) return;
      syncLine();
      if (!reducedMotion.matches) lineRaf = requestAnimationFrame(animateLine);
    }
    function refreshLine() { cancelAnimationFrame(lineRaf); lineRaf = null; animateLine(); }
    window.addEventListener('resize', syncLine);
    reducedMotion.addEventListener('change', refreshLine);

    function readSaved(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    }
    function save(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Play remains available when storage is blocked. */ }
    }
    function savedCount(key) {
      const count = Number(readSaved(key, 0));
      return Number.isSafeInteger(count) && count >= 0 ? count : 0;
    }
    let catches = savedCount('fishing-catches'), misses = savedCount('fishing-misses');
    const savedCollection = readSaved('fishing-collection', []);
    const collection = new Set(Array.isArray(savedCollection) ? savedCollection.filter(id => id === goldenFish.id || items.some(item => item.id === id)) : []);
    $('catch-count').textContent = catches;
    $('miss-count').textContent = misses;

    const thoughts = [
      ['여긴 물고기가 없어요.', '근데 왜 자꾸 물고기 모양 물건이 나오는지는 저도 모릅니다.'],
      ['미끼는 정상입니다.', '문제는 이 연못이 생활용품 코너랑 연결돼 있다는 점입니다.'],
      ['방금 그건 입질이 맞아요.', '다만 입이 달린 생물이 아니었을 뿐입니다.'],
      ['낚시는 인내심입니다.', '그리고 이곳에서는 상식도 조금 내려놓으셔야 합니다.']
    ];
    function setThought() {
      if (goldenUnlocked()) {
        $('thought-title').textContent = collection.has(goldenFish.id) ? '정말 물고기가 있었네요.' : '물속에서 금빛이 보여요.';
        $('thought-copy').textContent = collection.has(goldenFish.id) ? '0%라고 적어둔 건… 일단 지우겠습니다.' : '도감을 다 채우셨군요. 다음에 걸리는 건 진짜 황금 물고기입니다!';
        return;
      }
      const thought = thoughts[Math.floor(Math.random() * thoughts.length)];
      $('thought-title').textContent = thought[0];
      $('thought-copy').textContent = thought[1];
    }
    function goldenUnlocked() { return items.every(item => collection.has(item.id)); }
    function goldenChance() {
      if (!goldenUnlocked()) return 0;
      return collection.has(goldenFish.id) ? GOLDEN_REPEAT_CHANCE : 1;
    }
    function weightedPick() {
      const chance = goldenChance();
      if (chance === 1 || (chance > 0 && Math.random() < chance)) return goldenFish;
      let r = Math.random() * items.reduce((sum, item) => sum + item.weight, 0);
      for (const item of items) { r -= item.weight; if (r <= 0) return item; }
      return items[0];
    }
    function itemArt(item) {
      if (item.id === goldenFish.id) {
        return '<svg class="golden-fish-art" viewBox="0 0 120 100" aria-hidden="true"><path d="M82 45 110 26v48L82 57" fill="#e6a824" stroke="#9d650c" stroke-width="3" stroke-linejoin="round"/><path d="M41 33 54 16l14 18M42 67l14 16 12-18" fill="#ffe08a" stroke="#9d650c" stroke-width="3" stroke-linejoin="round"/><ellipse cx="50" cy="50" rx="36" ry="24" fill="#f8ca51" stroke="#9d650c" stroke-width="3"/><path d="M36 32c12-3 27-1 36 8" fill="none" stroke="#fff0b5" stroke-width="6" stroke-linecap="round"/><path d="M50 42q-8 8 0 17m12-18q-8 9 0 18" fill="none" stroke="#d49b20" stroke-width="3"/><circle cx="29" cy="46" r="5" fill="#382b20"/><circle cx="28" cy="44" r="1.5" fill="#fff"/><path d="m20 14 2-7 2 7 7 2-7 2-2 7-2-7-7-2Zm69 66 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z" fill="#e5b13c"/></svg>';
      }
      const index = items.indexOf(item);
      return `<span class="item-art" aria-hidden="true" style="--sprite-x:${index % 5 * 25}%;--sprite-y:${Math.floor(index / 5) * 50}%"></span>`;
    }
    function renderCollection() {
      const count = items.filter(item => collection.has(item.id)).length;
      const unlocked = goldenUnlocked(), gotGolden = collection.has(goldenFish.id);
      $('collection-count').textContent = `${count} / ${items.length}`;
      $('collection-grid').innerHTML = items.map(item => {
        const got = collection.has(item.id);
        return `<div class="collection-item ${got ? '' : 'locked'}"><div class="ci-icon">${got ? itemArt(item) : '?'}</div><strong>${got ? item.name : '아직 모르는 물건'}</strong><span class="ci-rarity">${got ? item.rarity : '미발견'}</span></div>`;
      }).join('');
      const bonus = $('golden-bonus');
      bonus.dataset.state = gotGolden ? 'caught' : unlocked ? 'unlocked' : 'locked';
      $('golden-icon').innerHTML = unlocked || gotGolden ? itemArt(goldenFish) : '?';
      $('golden-title').textContent = gotGolden ? '황금 물고기까지 수집 완료!' : unlocked ? '황금 물고기 해금!' : '도감 완성 보상 · 황금 물고기';
      $('golden-note').textContent = gotGolden ? '기존 도감 15종 + 황금 물고기. 이후에도 0.5% 확률로 다시 등장합니다.' : unlocked ? '다음 낚시에 반드시 등장합니다. 놓쳐도 첫 포획까지 계속 도전할 수 있어요!' : `물건 ${items.length}종을 모두 모으면 진짜 황금 물고기가 등장합니다. 앞으로 ${items.length - count}종!`;
      $('fish-chance').textContent = `${goldenChance() * 100}%`;
      $('fish-chance-note').textContent = unlocked ? gotGolden ? '황금 물고기는 0.5% 확률로 다시 등장합니다.' : '도감 완성! 첫 황금 물고기를 잡을 때까지 반드시 등장합니다.' : '물건 도감 15종을 완성하면 황금 물고기가 해금됩니다.';
      $('pond-sticker').textContent = unlocked ? '황금 물고기가 나타났습니다.' : '아직 물고기는 없습니다.';
      $('case-note').textContent = gotGolden ? '생선 코너, 드디어 입고.' : unlocked ? '금빛 입질을 기다립니다.' : '생선 코너는 비어 있습니다.';
    }
    function setState(next, label, hint, outcome = '') {
      state = next;
      stage.dataset.state = next;
      stage.dataset.outcome = outcome;
      refreshLine();
      $('scene-state').textContent = label;
      const key = next === 'result' ? 'Enter' : 'Space';
      $('keyboard-hint').innerHTML = `<kbd>${key}</kbd> ${hint}`;
      mainBtn.setAttribute('aria-keyshortcuts', key);
    }
    function syncHold() {
      held = state === 'playing' && (keyboardHeld || activePointers.size > 0);
      holdBtn.classList.toggle('is-held', held);
      holdBtn.setAttribute('aria-pressed', String(held));
    }
    function releaseControls(resetKey = false) {
      keyboardHeld = false;
      activePointers.clear();
      if (resetKey) { spaceDown = false; enterDown = false; }
      syncHold();
    }
    function showStatus(main, sub, title, subtitle, code) {
      statusMain.textContent = main;
      statusSub.textContent = sub;
      sceneTitle.textContent = title;
      sceneSub.textContent = subtitle;
      caseStatus.textContent = `STATUS · ${code}`;
    }
    function clearRound() {
      cancelAnimationFrame(raf);
      clearTimeout(biteTimer);
      clearTimeout(biteTimeout);
      releaseControls();
    }
    function cast() {
      if (state !== 'ready' && state !== 'result') return;
      clearRound();
      result.classList.add('hidden');
      mini.classList.add('hidden');
      mainBtn.classList.remove('hidden', 'bite-action');
      mainBtn.disabled = true;
      mainBtn.textContent = '기다리는 중…';
      setState('waiting', '입질 기다리는 중', '키를 떼고, 입질이 오면 다시 누르세요.');
      showStatus('찌가 잠잠합니다.', '입질이 오면 빠르게 챔질!', '조용하네요.', goldenUnlocked() ? '물속 어딘가에서 금빛이 반짝입니다.' : '물속 생활용품이 다가오는 중입니다.', 'WAITING');
      biteTimer = setTimeout(bite, 900 + Math.random() * 1800);
    }
    function bite() {
      if (state !== 'waiting') return;
      setState('bite', '입질! 지금 챔질', '지금 누르거나, 챔질 버튼을 누르세요!');
      mainBtn.disabled = false;
      mainBtn.textContent = '!  지금 챔질!';
      mainBtn.classList.add('bite-action');
      showStatus('입질!', '지금 누르세요!', '뭔가 걸렸습니다!', goldenUnlocked() ? '황금 물고기일지도 모릅니다!' : '물고기일 가능성은 아직 0%입니다.', 'BITE');
      biteTimeout = setTimeout(failBite, 1500);
    }
    function recordMiss() {
      misses++;
      save('fishing-misses', misses);
      $('miss-count').textContent = misses;
    }
    function retryButton() {
      mainBtn.classList.remove('hidden', 'bite-action');
      mainBtn.disabled = false;
      mainBtn.textContent = '결과 확인 · 다시 던지기';
    }
    function failBite() {
      if (state !== 'bite') return;
      clearRound();
      setState('result', '놓쳤습니다', '또는 버튼으로 다시 낚아보세요.', 'missed');
      recordMiss();
      retryButton();
      showStatus('챔질이 늦었습니다.', '무언가가 물속으로 사라졌습니다.', '놓쳤네요.', goldenChance() === 1 ? '황금 물고기는 다음 낚시에도 다시 등장합니다.' : '다음 입질을 노려보세요.', 'TOO LATE');
      setThought();
    }
    function hook() {
      if (state !== 'bite') return;
      clearTimeout(biteTimeout);
      mainBtn.classList.remove('bite-action');
      mainBtn.classList.add('hidden');
      targetItem = weightedPick();
      startMini();
    }
    function drawMini(inside) {
      bar.style.bottom = `${barY}px`;
      target.style.bottom = `${targetY}px`;
      progressFill.style.width = `${progress}%`;
      const rounded = Math.round(progress);
      if (displayedProgress !== rounded) {
        progressValue.textContent = `${rounded}%`;
        progressMeter.setAttribute('aria-valuenow', rounded);
        displayedProgress = rounded;
      }
      if (wasInside !== inside) {
        bar.classList.toggle('hit', inside);
        trackingState.classList.toggle('is-inside', inside);
        trackingState.textContent = inside ? '잘 잡고 있어요!' : '따라잡으세요';
        wasInside = inside;
      }
    }
    function startMini() {
      setState('playing', '낚아 올리는 중', '누르면 올라가고, 떼면 내려가요.');
      mini.classList.remove('hidden');
      result.classList.add('hidden');
      releaseControls();
      barY = START_BAR_Y; barV = 0;
      targetY = START_TARGET_Y; targetV = 0; targetGoal = START_TARGET_Y;
      progress = START_PROGRESS; displayedProgress = -1; wasInside = null;
      target.classList.toggle('is-golden', targetItem.id === goldenFish.id);
      drawMini(true);
      showStatus('걸었습니다!', '초록 막대로 끝까지 버티세요.', '이제 놓치지 마세요.', `난이도: ${targetItem.rarity}`, 'REELING');
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    // Preserve bar controls and catch progress; speed scales acceleration,
    // dart strength, and the velocity cap so rarer catches move faster.
    function loop(now) {
      if (state !== 'playing') return;
      const dt = Math.min(32, now - last) / 16.67;
      last = now;
      const laneH = lane.clientHeight, barH = bar.offsetHeight, targetH = 25;
      const maxBar = laneH - barH - 6, maxTarget = laneH - targetH - 5;
      barV += (held ? .54 : -.38) * dt;
      barV *= Math.pow(.88, dt);
      barV = Math.max(-6.4, Math.min(5.4, barV));
      barY += barV * dt;
      if (barY < START_BAR_Y) { barY = START_BAR_Y; barV = Math.abs(barV) * .22; }
      if (barY > maxBar) { barY = maxBar; barV = -Math.abs(barV) * .25; }
      if (Math.random() < targetItem.jump * dt) {
        targetGoal = 18 + Math.random() * (maxTarget - 26);
        targetV += (Math.random() - .5) * 2.4 * targetItem.speed;
      }
      const direction = Math.sign(targetGoal - targetY);
      targetV += direction * .055 * targetItem.speed * dt;
      targetV *= Math.pow(.94, dt);
      targetV = Math.max(-3.8 * targetItem.speed, Math.min(3.8 * targetItem.speed, targetV));
      targetY += targetV * dt;
      if (targetY < START_TARGET_Y) { targetY = START_TARGET_Y; targetV = Math.abs(targetV); }
      if (targetY > maxTarget) { targetY = maxTarget; targetV = -Math.abs(targetV); }
      const center = targetY + targetH / 2, inside = center >= barY && center <= barY + barH;
      progress += inside ? .34 * dt : -.44 * dt;
      progress = Math.max(0, Math.min(100, progress));
      drawMini(inside);
      if (progress >= 100) { win(); return; }
      if (progress <= 0) { lose(); return; }
      raf = requestAnimationFrame(loop);
    }
    function win() {
      clearRound();
      setState('result', '낚았습니다!', '또는 확인 버튼으로 다음 낚시를 시작하세요. Space는 결과를 넘기지 않아요.', 'caught');
      const isNew = !collection.has(targetItem.id);
      const wasComplete = goldenUnlocked(), isGolden = targetItem.id === goldenFish.id;
      catches++;
      collection.add(targetItem.id);
      save('fishing-catches', catches);
      save('fishing-collection', [...collection]);
      $('catch-count').textContent = catches;
      renderCollection();
      mini.classList.add('hidden');
      result.classList.remove('hidden');
      const justUnlocked = !wasComplete && goldenUnlocked();
      $('result-kicker').textContent = isGolden ? '드디어, 진짜 물고기!' : justUnlocked ? '15종 도감 완성!' : isNew ? '새로운 물건 발견!' : '또 낚였습니다!';
      $('result-icon').innerHTML = itemArt(targetItem);
      $('rarity').textContent = targetItem.rarity;
      $('rarity').dataset.rarity = targetItem.rarity;
      result.dataset.rarity = targetItem.rarity;
      $('result-name').textContent = targetItem.name;
      $('result-note').textContent = targetItem.note;
      $('result-unlock').classList.toggle('hidden', !justUnlocked);
      showStatus('낚았습니다!', isGolden ? '이번에는 정말 물고기입니다!' : justUnlocked ? '황금 물고기가 해금되었습니다!' : '역시 물고기는 아닙니다.', `${targetItem.name} 획득!`, isGolden ? '물고기 없는 낚시터의 첫 생선입니다.' : '결과를 확인하고 다음 낚시를 시작하세요.', isGolden ? 'GOLDEN CATCH' : 'CAUGHT');
      setThought();
      result.focus({preventScroll: true});
    }
    function lose() {
      clearRound();
      setState('result', '빠져나갔습니다', '또는 버튼으로 다시 낚아보세요.', 'missed');
      recordMiss();
      mini.classList.add('hidden');
      retryButton();
      const isGolden = targetItem.id === goldenFish.id;
      showStatus('줄에서 빠졌습니다.', isGolden ? '황금 물고기가 빠져나갔습니다.' : `방금 것은 ${targetItem.rarity} 물건이었습니다.`, '아깝습니다.', isGolden && goldenChance() === 1 ? '괜찮아요. 잡을 때까지 다음 낚시에도 등장합니다.' : '다음 입질을 노려보세요.', 'ESCAPED');
      setThought();
    }
    function primaryAction() {
      if (state === 'ready' || state === 'result') cast();
      else if (state === 'bite') hook();
    }
    mainBtn.addEventListener('click', primaryAction);
    againBtn.addEventListener('click', primaryAction);
    holdBtn.addEventListener('pointerdown', event => {
      if (state !== 'playing' || event.button !== 0) return;
      event.preventDefault();
      activePointers.add(event.pointerId);
      holdBtn.setPointerCapture?.(event.pointerId);
      syncHold();
    });
    function releasePointer(event) {
      activePointers.delete(event.pointerId);
      syncHold();
    }
    holdBtn.addEventListener('pointerup', releasePointer);
    holdBtn.addEventListener('pointercancel', releasePointer);
    holdBtn.addEventListener('lostpointercapture', releasePointer);
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
    holdBtn.addEventListener('contextmenu', event => event.preventDefault());

    // A key press advances at most one action. Autorepeat must never hook or recast.
    function acceptsGameKey(event) {
      const element = event.target;
      if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return false;
      if (element?.isContentEditable || element?.closest?.('input, textarea, select, [role="textbox"]')) return false;
      const interactive = element?.closest?.('button, a, summary, [role="button"], [role="slider"], [role="checkbox"], [role="switch"]');
      return !interactive || [mainBtn, againBtn, holdBtn].includes(interactive);
    }
    function isSpace(event) { return event.code === 'Space' || event.key === ' '; }
    function isEnter(event) { return event.key === 'Enter'; }
    window.addEventListener('keydown', event => {
      if (isEnter(event)) {
        if (!acceptsGameKey(event) || (state !== 'result' && !enterDown)) return;
        event.preventDefault();
        if (event.repeat || enterDown) return;
        enterDown = true;
        primaryAction();
        return;
      }
      if (!isSpace(event) || !acceptsGameKey(event)) return;
      event.preventDefault(); // Also cancels the focused button's native Space click.
      if (event.repeat || spaceDown) return;
      spaceDown = true;
      if (state === 'result') return; // Read the result until click / Enter, even with the button focused.
      primaryAction();
      if (state === 'playing') { keyboardHeld = true; syncHold(); }
    });
    window.addEventListener('keyup', event => {
      if (isEnter(event)) {
        if (enterDown) event.preventDefault();
        enterDown = false;
        return;
      }
      if (!isSpace(event)) return;
      if (spaceDown || (state === 'result' && acceptsGameKey(event))) event.preventDefault();
      spaceDown = false;
      keyboardHeld = false;
      syncHold();
    });
    window.addEventListener('blur', () => releaseControls(true));
    window.addEventListener('pagehide', () => releaseControls(true));
    document.addEventListener('focusin', event => {
      if (!acceptsGameKey(event)) { keyboardHeld = false; syncHold(); }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) releaseControls(true);
      refreshLine();
    });
    renderCollection();
    setThought();
  })();
