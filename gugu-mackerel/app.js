(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stage = $('shop-stage');
  const fish = $('fish');
  const fishScore = $('fish-score');
  const fishBtn = $('fish-btn');
  const flipBtn = $('flip-btn');
  const sellBtn = $('sell-btn');
  const speech = $('speech');
  const pigeon = $('pigeon');
  const pigeonWrap = $('pigeon-wrap');
  const caseStatus = $('case-status');
  const heatStatus = $('heat-status');
  const review = $('review');
  const pickiness = $('pickiness');
  const presets = [...document.querySelectorAll('.tb-presets button')];
  const thoughtTitle = $('thought-title');
  const thoughtBody = $('thought-body');
  const fill = $('meter-fill');
  const meter = $('cook-meter');
  const cookValue = $('cook-value');
  const flipCount = $('flip-count');
  const salePop = $('sale-pop');

  // Keep the original cooking speed, quality thresholds and prices.
  const COOK_SPEED = 0.0068;
  let cooking = false;
  let transitioning = false;
  let cook = 0;
  let flips = 0;
  let money = 0;
  let sold = 0;
  let burned = 0;
  let lastTime = 0;
  let frame = 0;
  let customerNo = 1;
  let lastPercent = -1;
  let tossTimer = 0;
  const pending = new Set();

  const customers = [
    ['구구. 껍질은 바삭하게요.', '적당히 노릇한 걸로 주세요.'],
    ['저 오늘 첫 끼예요. 구구.', '너무 태우지만 않으면 됩니다.'],
    ['소문 듣고 왔습니다.', '여기가 고등어 잘 굽는 집 맞죠?'],
    ['빵만 먹다가 질렸어요.', '오늘은 단백질로 갑니다. 구구.'],
    ['저 꽤 까다로운 새입니다.', '한 번만 제대로 뒤집어주세요.']
  ];

  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
  const won = n => Math.max(0, Math.round(n / 100) * 100).toLocaleString('ko-KR') + '원';

  function later(callback, delay) {
    const id = setTimeout(() => { pending.delete(id); callback(); }, delay);
    pending.add(id);
    return id;
  }

  function cancelPending() {
    pending.forEach(clearTimeout);
    pending.clear();
    tossTimer = 0;
  }

  function setMood(mood) {
    pigeon.dataset.mood = mood;
    const labels = {curious: '고등어를 기다리는 비둘기', happy: '기분 좋아 날개를 든 비둘기', grumpy: '눈을 가늘게 뜬 불만스러운 비둘기'};
    pigeon.setAttribute('aria-label', labels[mood]);
  }

  function setPickiness(value) {
    const n = clamp(Number(value) || 0, 0, 100);
    pickiness.value = n;
    $('pickiness-value').textContent = n;
    pickiness.style.setProperty('--fill', `${n}%`);
    presets.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.value) === n)));
  }

  function cookLabel() {
    if (!cooking && cook === 0) return '불판이 비어 있어요';
    if (cook < 24) return '아직 생생함';
    if (cook < 48) return '슬슬 익는 중';
    if (cook < 58) return '조금만 더';
    if (cook <= 82) return '지금! 노릇노릇';
    if (cook <= 100) return '앗, 타기 시작해요';
    return '고등어였던 것';
  }

  function renderCook() {
    const percent = clamp(cook, 0, 100);
    stage.style.setProperty('--cook', percent + '%');
    stage.style.setProperty('--golden', clamp((cook - 20) / 40).toFixed(3));
    stage.style.setProperty('--char', clamp((cook - 82) / 23).toFixed(3));
    fill.style.width = percent + '%';
    const rounded = Math.round(percent);
    if (rounded !== lastPercent) {
      cookValue.textContent = rounded;
      meter.setAttribute('aria-valuenow', rounded);
      lastPercent = rounded;
    }
    const label = cookLabel();
    if (fishScore.textContent !== label) fishScore.textContent = label;
    flipCount.textContent = `뒤집기 ${flips}회`;
    const nextState = !cooking ? 'idle' : cook > 82 ? 'burning' : cook >= 58 ? 'golden' : 'cooking';
    if (stage.dataset.state !== nextState) {
      stage.dataset.state = nextState;
      if (cooking) setMood(nextState === 'golden' ? 'happy' : nextState === 'burning' ? 'grumpy' : 'curious');
    }
    heatStatus.textContent = !cooking ? '불판 준비 완료' : cook > 100 ? '연기가 심상치 않아요' : cook > 82 ? '서둘러 꺼내주세요' : cook >= 58 ? '지금 판매하면 좋아요' : '지글지글 굽는 중';
  }

  function tick(now) {
    if (!cooking) return;
    if (!lastTime) lastTime = now;
    const dt = Math.min(80, now - lastTime);
    lastTime = now;
    cook += dt * COOK_SPEED;
    renderCook();
    if (cook >= 112) {
      burned++;
      $('burn-count').textContent = burned + '마리';
      review.innerHTML = '불판에서 연기가 납니다. <strong>비둘기가 한 발짝 뒤로 물러났습니다.</strong>';
      speech.innerHTML = '<strong>구구... 이건 숯 아닌가요?</strong>새 걸로 부탁드립니다.';
      thoughtTitle.textContent = '저걸 먹으라고요?';
      thoughtBody.textContent = '비둘기에게도 최소한의 기준은 있습니다. 구구.';
      setMood('grumpy');
      endFish(false);
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  function startFish() {
    if (cooking || transitioning) return;
    cancelPending();
    cook = 0; flips = 0; lastTime = 0; cooking = true;
    fish.classList.remove('flipped', 'tossing', 'served');
    fish.classList.add('active');
    salePop.classList.remove('visible');
    fishBtn.disabled = true; flipBtn.disabled = false; sellBtn.disabled = false;
    fishBtn.textContent = '굽는 중…';
    caseStatus.textContent = 'STATUS · 고등어 굽는 중';
    speech.innerHTML = '<strong>오, 시작했군요. 구구.</strong>저 지금 꽤 기대하고 있습니다.';
    setMood('curious');
    renderCook();
    frame = requestAnimationFrame(tick);
  }

  function flipFish() {
    if (!cooking) return;
    // Restart only this short animation; repeated taps still count as before.
    if (tossTimer) { clearTimeout(tossTimer); pending.delete(tossTimer); }
    fish.style.setProperty('--flip-from', flips % 2 ? '180deg' : '0deg');
    flips++;
    fish.classList.toggle('flipped', flips % 2 === 1);
    fish.classList.remove('tossing');
    void fish.offsetWidth;
    fish.classList.add('tossing');
    tossTimer = later(() => { fish.classList.remove('tossing'); tossTimer = 0; }, 560);
    flipCount.textContent = `뒤집기 ${flips}회`;
    if (flips === 1) speech.innerHTML = '<strong>좋아요. 그겁니다.</strong>한 번 뒤집는 게 중요하죠. 아마도.';
    else if (flips === 2) speech.innerHTML = '<strong>또 뒤집어요?</strong>뭐... 사장님만의 철학이 있겠죠.';
    else speech.innerHTML = '<strong>구구구구?</strong>고등어가 어지럽겠습니다.';
  }

  function evaluate() {
    const picky = Number(pickiness.value) / 100;
    const distance = Math.abs(cook - 70);
    let quality = Math.max(0, 100 - distance * (2.2 + picky * 1.5));
    if (flips === 1) quality += 12;
    else if (flips === 0) quality -= 8 + 18 * picky;
    else quality -= Math.min(24, (flips - 1) * (5 + 8 * picky));
    if (cook < 32) quality -= 35;
    if (cook > 96) quality -= 40;
    return clamp(quality, 0, 100);
  }

  function sellFish() {
    if (!cooking) return;
    const quality = evaluate();
    let price, title, comment;
    if (quality >= 88) { price = 3000; title = '구구! 완벽합니다.'; comment = '껍질도 좋고 속도 좋네요. 여기 단골할게요.'; }
    else if (quality >= 70) { price = 2500; title = '꽤 괜찮은데요?'; comment = '이 정도면 공원 친구들에게 소개할 수 있겠습니다.'; }
    else if (quality >= 45) { price = 2000; title = '먹을 만합니다. 구구.'; comment = '조금 애매하지만 고등어는 고등어니까요.'; }
    else if (quality >= 20) { price = 1000; title = '음... 구구.'; comment = '절반만 낼게요. 저도 입맛이 있습니다.'; }
    else { price = 0; title = '환불해주세요.'; comment = '이건 비둘기라고 아무거나 먹을 거라 생각한 결과죠?'; }
    money += price; sold++;
    $('sold-count').textContent = sold + '마리';
    $('money-total').textContent = won(money);
    $('wallet').textContent = won(money);
    review.innerHTML = `${customerNo}번째 손님 평가 · 굽기 ${Math.round(cook)}%, 뒤집기 ${flips}회. <strong>${title}</strong>`;
    speech.innerHTML = `<strong>${title}</strong>${comment}`;
    thoughtTitle.textContent = quality >= 70 ? '또 올게요. 구구.' : '다음엔 조금 더 잘 부탁해요.';
    thoughtBody.textContent = comment;
    setMood(quality >= 70 ? 'happy' : quality < 45 ? 'grumpy' : 'curious');
    salePop.textContent = price ? '+' + won(price) : '0원 · 구구…';
    salePop.dataset.good = String(price > 0);
    salePop.classList.add('visible');
    customerNo++;
    endFish(true);
  }

  function endFish(soldFish) {
    cooking = false; transitioning = true;
    cancelAnimationFrame(frame); lastTime = 0;
    if (tossTimer) { clearTimeout(tossTimer); pending.delete(tossTimer); tossTimer = 0; }
    fish.classList.remove('tossing');
    fishBtn.disabled = true; flipBtn.disabled = true; sellBtn.disabled = true;
    fishBtn.textContent = soldFish ? '다음 손님…' : '불판 정리 중…';
    heatStatus.textContent = soldFish ? '비둘기의 시식 시간' : '앗, 너무 익었어요';
    caseStatus.textContent = soldFish ? 'STATUS · 계산 완료' : 'STATUS · 불판 정리 중';
    if (soldFish) {
      stage.dataset.state = 'served';
      fish.classList.add('served');
      later(() => pigeonWrap.classList.add('away'), 1100);
      later(nextCustomer, 1600);
    } else {
      later(() => {
        clearGrill();
        fishBtn.textContent = '고등어 올리기';
        caseStatus.textContent = 'STATUS · 다시 도전해요';
      }, 1100);
    }
  }

  function clearGrill() {
    cook = 0; flips = 0; transitioning = false;
    fish.classList.remove('active', 'flipped', 'tossing', 'served');
    salePop.classList.remove('visible');
    fishBtn.disabled = false;
    renderCook();
  }

  function nextCustomer() {
    clearGrill();
    setMood('curious');
    pigeonWrap.classList.remove('away');
    const c = customers[Math.floor(Math.random() * customers.length)];
    speech.innerHTML = `<strong>${c[0]}</strong>${c[1]}`;
    $('customer-label').textContent = `${customerNo}번째 손님`;
    caseStatus.textContent = 'STATUS · 새 비둘기 입장';
    fishBtn.textContent = '고등어 올리기';
  }

  function resetShop() {
    cooking = false;
    cancelAnimationFrame(frame);
    cancelPending();
    money = 0; sold = 0; burned = 0; customerNo = 1; lastTime = 0;
    clearGrill();
    pigeonWrap.classList.remove('away');
    setMood('curious');
    flipBtn.disabled = true; sellBtn.disabled = true;
    fishBtn.textContent = '고등어 올리기';
    $('sold-count').textContent = '0마리'; $('money-total').textContent = '0원';
    $('burn-count').textContent = '0마리'; $('wallet').textContent = '0원';
    $('customer-label').textContent = '첫 번째 손님';
    review.innerHTML = '첫 손님이 기다리는 중입니다. <strong>비둘기라고 막 대하면 안 됩니다.</strong>';
    speech.innerHTML = '<strong>구구. 아직 안 구웠어요?</strong>적당히 노릇한 걸로 주세요.';
    thoughtTitle.textContent = '생선은 처음이지만요.';
    thoughtBody.textContent = '왠지 오늘은 고등어가 당기네요. 구구.';
    caseStatus.textContent = 'STATUS · 첫 장사 준비 중';
  }

  fishBtn.addEventListener('click', startFish);
  flipBtn.addEventListener('click', flipFish);
  sellBtn.addEventListener('click', sellFish);
  $('reset-btn').addEventListener('click', resetShop);
  pickiness.addEventListener('input', e => setPickiness(e.target.value));
  presets.forEach(b => b.addEventListener('click', () => setPickiness(b.dataset.value)));
  // Avoid a visual jump after returning from another tab.
  document.addEventListener('visibilitychange', () => { lastTime = 0; });
  setPickiness(35);
  renderCook();
})();
