(() => {
  'use strict';
  const { settings, formatTime, thought } = window.SilentSiren;
  const byId = id => document.getElementById(id);
  const device = byId('siren-case');
  const toggle = byId('toggle');
  const urgency = byId('urgency');
  const volume = byId('volume');
  const reduced = byId('reduced-motion');
  const presets = [...document.querySelectorAll('[data-urgency]')];
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let running = false;
  let starts = 0;
  let startedAt = 0;
  let elapsed = 0;
  let ticker = null;
  let userChangedMotion = false;

  // Silence is the product: no audio, speech, microphone, or vibration APIs.
  function updateTime() {
    if (running) elapsed = Math.max(0, performance.now() - startedAt);
    const seconds = Math.floor(elapsed / 1000);
    byId('elapsed').textContent = formatTime(seconds);
    byId('elapsed').setAttribute('aria-label', `작동 시간 ${seconds}초`);
  }

  function render() {
    const config = settings(urgency.value, volume.value);
    reduced.disabled = motionPreference.matches;
    reduced.title = motionPreference.matches ? '기기의 동작 줄이기 설정이 적용되어 있어요.' : '';
    urgency.value = String(config.urgency);
    volume.value = String(config.volume);
    device.dataset.running = String(running);
    device.dataset.reduced = String(reduced.checked || motionPreference.matches);
    device.style.setProperty('--pulse', `${config.pulseSeconds}s`);
    device.style.setProperty('--glow', config.ringOpacity);
    urgency.style.setProperty('--fill', `${config.urgency}%`);
    volume.style.setProperty('--fill', `${config.volume}%`);
    urgency.setAttribute('aria-valuetext', `${config.urgency}퍼센트, ${config.label}`);
    volume.setAttribute('aria-valuetext', `${config.volume}퍼센트, 실제 소리는 나지 않음`);
    byId('urgency-value').textContent = config.urgency;
    byId('volume-value').textContent = config.volume;
    presets.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.urgency) === config.urgency)));
    toggle.setAttribute('aria-pressed', String(running));
    byId('toggle-label').textContent = running ? '이제 그만 울리기' : '조용히 울리기';
    byId('state-tag').textContent = running ? config.label : '대기 중';
    byId('display-caption').textContent = running ? '들리지 않아도, 최선을 다하는 중.' : starts ? '아무 일도 없었던 것처럼.' : '눌러도 아무도 안 놀랍니다.';
    byId('stage-caption').textContent = running ? '경광등 작동 중 · 소리 출력 없음' : '고요할 준비 완료';
    byId('starts').textContent = String(starts).padStart(2, '0');
    const [title, copy] = thought(running, config.urgency, config.volume, starts > 0);
    byId('thought-title').textContent = title;
    byId('thought-copy').textContent = copy;
  }

  function setRunning(next) {
    if (running === next) return;
    if (next) {
      running = true;
      starts += 1;
      elapsed = 0;
      startedAt = performance.now();
      ticker = window.setInterval(updateTime, 250);
    } else {
      updateTime();
      running = false;
      window.clearInterval(ticker);
      ticker = null;
    }
    updateTime();
    render();
    byId('announcement').textContent = next ? '사이렌 작동 중. 실제 소리는 나지 않습니다.' : '사이렌을 멈췄습니다.';
  }

  toggle.addEventListener('click', () => setRunning(!running));
  urgency.addEventListener('input', render);
  volume.addEventListener('input', render);
  presets.forEach(button => button.addEventListener('click', () => {
    urgency.value = button.dataset.urgency;
    render();
  }));
  reduced.checked = motionPreference.matches;
  reduced.addEventListener('change', () => { userChangedMotion = true; render(); });
  const onMotionChange = () => {
    if (!userChangedMotion || motionPreference.matches) reduced.checked = motionPreference.matches;
    render();
  };
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', onMotionChange);
  else if (motionPreference.addListener) motionPreference.addListener(onMotionChange);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { setRunning(false); return; }
    if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
    if (event.target instanceof Element && event.target.closest('input,button,a,textarea,select,[contenteditable]')) return;
    event.preventDefault();
    setRunning(!running);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setRunning(false); });
  window.addEventListener('pagehide', () => setRunning(false));
  render();
  toggle.disabled = false;
})();
