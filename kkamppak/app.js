(function () {
  'use strict';
  const K = window.Kkamppak;
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'kkamppak.calendar.v1';
  const REFRESH_MS = 45000;
  const labels = { clear: '또렷해요', blur: '흐릿해요', rewrite: '이거였나?', fragment: '가물가물' };
  const todayKey = () => K.dateKey(new Date());
  let selected = todayKey(), view = K.parseDate(selected), events = [], demo = true;
  let settings = { probability: K.DEFAULTS.probability, modes: [...K.DEFAULTS.modes], auto: true };
  let epoch = Date.now(), revealed = new Set(), editingId = null, viewingId = null;
  let saveBlocked = false, toastTimer, confirmation = null, lastRefresh = Date.now(), dirty = false;
  const dialog = $('event-dialog'), confirmDialog = $('confirm-dialog');

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(className, text, action) {
    const node = element('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function notify(text) {
    clearTimeout(toastTimer); $('toast').textContent = text; $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4300);
  }
  function warn(message) { $('storage-warning').textContent = message; $('storage-warning').hidden = false; }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        try { const data = K.readBackup(raw); events = data.events; settings = data.settings; demo = false; }
        catch { saveBlocked = true; warn('저장된 일정을 읽지 못했어요. 기존 데이터를 덮어쓰지 않고 예시를 보여드려요. 저장해 둔 백업이 있다면 불러와 주세요.'); }
      }
    } catch { warn('브라우저 저장소를 사용할 수 없어요. 일정은 현재 화면에만 남으니 닫기 전에 백업을 저장해 주세요.'); }
  }
  function persist() {
    if (demo) return true;
    if (saveBlocked) { dirty = true; return false; }
    try {
      localStorage.setItem(STORAGE_KEY, K.backup(events, settings)); dirty = false; $('storage-warning').hidden = true; return true;
    } catch {
      dirty = true; warn('브라우저에 저장하지 못했어요. 이 화면의 일정은 유지됩니다. 닫기 전에 ‘백업 저장’을 눌러 보관해 주세요.'); return false;
    }
  }
  function allEvents() { return demo ? K.examples(new Date()) : events; }
  function byDate(date) { return allEvents().filter(e => e.date === date).sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title, 'ko')); }
  function find(id) { return allEvents().find(e => e.id === id); }
  function memory(e) { return K.memory(e, settings, epoch, revealed.has(e.id)); }
  function status(e, m) { return e.important ? '꼭 기억해요' : revealed.has(e.id) ? '떠올렸어요' : labels[m.kind]; }
  function longDate(key) { return K.parseDate(key).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }); }
  function showDialog() { if (!dialog.open) { dialog.showModal(); document.body.style.overflow = 'hidden'; } }
  function closeDialog() { dialog.close(); }
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; editingId = null; viewingId = null; lastRefresh = Date.now(); });
  document.querySelectorAll('.close-dialog').forEach(b => b.addEventListener('click', closeDialog));
  function ask(title, copy, okLabel, action) {
    $('confirm-title').textContent = title; $('confirm-copy').textContent = copy; $('confirm-ok').textContent = okLabel;
    confirmation = action; confirmDialog.showModal(); document.body.style.overflow = 'hidden';
  }
  $('confirm-cancel').addEventListener('click', () => confirmDialog.close());
  $('confirm-ok').addEventListener('click', () => { const action = confirmation; confirmDialog.close(); if (action) action(); });
  confirmDialog.addEventListener('close', () => { confirmation = null; if (!dialog.open) document.body.style.overflow = ''; lastRefresh = Date.now(); });

  function selectDay(key, focusDay = false) {
    const date = K.parseDate(key); if (!date) return;
    selected = key; view = date; render();
    if (focusDay) focusDate(key);
  }
  function focusDate(key) {
    const node = document.querySelector(`[data-day="${key}"]`); if (node) node.focus({ preventScroll: true });
  }
  function renderCalendar() {
    const year = view.getFullYear(), month = view.getMonth();
    $('year-label').textContent = `${year}년`;
    $('month-label').textContent = `${month + 1}월`;
    $('prev-month').disabled = year === 1 && month === 0;
    $('next-month').disabled = year === 9999 && month === 11;
    const fragment = document.createDocumentFragment();
    const today = todayKey();
    for (const date of K.monthDays(year, month)) {
      const key = K.dateKey(date), items = byDate(key);
      const cell = element('div', 'day-cell' + (date.getMonth() !== month ? ' outside' : '') + (key === selected ? ' selected' : ''));
      const day = button('day-number' + (key === today ? ' is-today' : ''), String(date.getDate()), () => selectDay(key, true));
      day.dataset.day = key; day.tabIndex = key === selected ? 0 : -1;
      day.setAttribute('aria-label', `${date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}, ${items.length ? '일정 ' + items.length + '개' : '일정 없음'}`);
      day.setAttribute('aria-pressed', String(key === selected)); if (key === today) day.setAttribute('aria-current', 'date');
      if (!K.parseDate(key)) day.disabled = true;
      cell.addEventListener('click', e => { if (e.target === cell) selectDay(key, true); });
      day.addEventListener('keydown', e => {
        const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
        if (delta === undefined) return;
        e.preventDefault(); const next = K.parseDate(key); next.setDate(next.getDate() + delta); selectDay(K.dateKey(next), true);
      });
      cell.append(day);
      items.slice(0, 2).forEach(event => {
        const m = memory(event);
        const chip = button('event-chip ' + (event.important ? 'pinned' : m.kind), undefined, () => { selectDay(event.date); openDetail(event.id); });
        chip.setAttribute('aria-label', `${event.time || '종일'} ${m.kind === 'blur' ? '흐릿한 일정' : m.title}, ${status(event, m)}. 상세 보기`);
        chip.append(element('span', 'chip-mark', event.important ? '◆' : '·'));
        const title = element('span', 'chip-title' + (m.kind === 'blur' ? ' blurred' : ''), m.title); title.setAttribute('aria-hidden', 'true'); chip.append(title); cell.append(chip);
      });
      if (items.length > 2) cell.append(button('more-events', `+${items.length - 2}개`, () => { selectDay(key); $('day-heading').scrollIntoView({ block: 'nearest' }); }));
      fragment.append(cell);
    }
    $('calendar').replaceChildren(fragment);
    const prefix = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-`;
    const items = allEvents().filter(e => e.date.startsWith(prefix));
    $('month-count').textContent = `이번 달 ${items.length}개의 ${demo ? '예시 ' : ''}일정`;
    const count = items.filter(e => memory(e).changed).length;
    $('memory-count').textContent = count ? `그중 ${count}개는 가물가물` : '지금은 모두 또렷해요';
  }
  function renderAgenda() {
    const date = K.parseDate(selected);
    $('day-heading').textContent = date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    const fragment = document.createDocumentFragment();
    const items = byDate(selected);
    if (!items.length) {
      const empty = element('div', 'empty-state'); empty.append(element('strong', '', '이날은 아직 빈칸이에요.'), element('span', '', '까먹기 전에, 일정을 하나 남겨볼까요?'), document.createElement('br'), button('text-btn', '＋ 이 날에 일정 남기기', () => openEditor())); fragment.append(empty);
    }
    for (const event of items) {
      const m = memory(event);
      const card = button('event-card', undefined, () => openDetail(event.id));
      const head = element('span', 'card-head'); const time = element('time', '', event.time || '종일');
      time.dateTime = event.time ? event.date + 'T' + event.time : event.date;
      head.append(time, element('span', 'status-tag ' + (event.important ? 'pinned' : m.kind), (event.important ? '◆ ' : '') + status(event, m)));
      const title = element('span', 'card-title' + (m.kind === 'blur' ? ' blurred' : ''), m.title); title.setAttribute('aria-hidden', 'true');
      card.append(head, title);
      if (m.place) { const place = element('span', 'card-place' + (m.kind === 'blur' ? ' blurred' : ''), m.place); place.setAttribute('aria-hidden', 'true'); card.append(place); }
      card.setAttribute('aria-label', `${event.time || '종일'}, ${m.kind === 'blur' ? '흐릿한 일정' : m.title}. ${status(event, m)}. 눌러서 원본을 확인할 수 있어요.`);
      fragment.append(card);
    }
    $('day-events').replaceChildren(fragment);
  }
  function renderSettings() {
    $('probability').value = settings.probability; $('probability-value').textContent = settings.probability;
    $('probability').style.setProperty('--fill', `${settings.probability}%`);
    $('probability').setAttribute('aria-valuetext', `까먹을 확률 ${settings.probability}퍼센트`);
    document.querySelectorAll('[data-rate]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.rate) === settings.probability)));
    document.querySelectorAll('[name="mode"]').forEach(c => { c.checked = settings.modes.includes(c.value); });
    $('auto-memory').checked = settings.auto;
    $('demo-banner').hidden = !demo;
    $('export').disabled = demo;
    $('thought-title').textContent = settings.probability === 0 ? '오늘은 기억력이 좀 좋네요.' : settings.probability === 100 ? '분명… 뭔가 하기로 했는데.' : '날짜만큼은 확실해요.';
    $('thought-copy').textContent = settings.probability === 0 ? '까먹을 확률이 0%예요. 모든 일정을 원래대로 보여드려요.' : '내용이 수상하면 일정을 눌러 ‘다시 떠올리기’를 해보세요.';
  }
  function render() { renderCalendar(); renderAgenda(); renderSettings(); }
  function shiftMonth(delta) {
    const date = new Date(view); date.setDate(1); date.setMonth(date.getMonth() + delta);
    if (date.getFullYear() < 1 || date.getFullYear() > 9999) return;
    selected = K.dateKey(date); view = date; render();
  }
  $('prev-month').addEventListener('click', () => shiftMonth(-1));
  $('next-month').addEventListener('click', () => shiftMonth(1));
  $('today').addEventListener('click', () => selectDay(todayKey()));
  $('new-event').addEventListener('click', () => openEditor());
  $('add-day').addEventListener('click', () => openEditor());
  $('start-empty').addEventListener('click', () => {
    demo = false; events = []; revealed.clear(); const saved = persist(); render();
    notify(saved ? '내 캘린더를 시작했어요. 첫 일정을 남겨보세요.' : '현재 화면에서 시작했어요. 저장 안내를 확인해 주세요.');
  });

  function openEditor(id) {
    if (id && demo) { notify('예시 일정은 수정하지 않아요. 내 일정을 새로 남겨보세요.'); return; }
    editingId = id || null; viewingId = null;
    $('event-form').reset(); $('form-error').hidden = true; $('event-detail').hidden = true; $('event-form').hidden = false;
    $('dialog-eyebrow').textContent = id ? '원본을 수정해요' : '기억을 남겨볼까요';
    $('dialog-title').textContent = id ? '일정 수정' : '새 일정';
    const event = id ? find(id) : null;
    $('event-title').value = event?.title || ''; $('event-date').value = event?.date || selected; $('event-time').value = event?.time || '';
    $('event-place').value = event?.place || ''; $('event-memo').value = event?.memo || ''; $('event-important').checked = !!event?.important;
    showDialog(); $('event-title').focus();
  }
  function openDetail(id) {
    const event = find(id); if (!event) return;
    viewingId = id; editingId = null; $('event-form').hidden = true; $('event-detail').hidden = false;
    $('dialog-eyebrow').textContent = demo ? '예시 일정 · 기억 들여다보기' : '기억 들여다보기'; $('dialog-title').textContent = '뭐 하기로 했더라?';
    $('detail-date').textContent = longDate(event.date) + ' · ' + (event.time || '종일');
    paintDetail(event); $('edit-event').hidden = demo; $('delete-event').hidden = demo;
    showDialog();
  }
  function paintDetail(event) {
    const m = memory(event); const blurred = m.kind === 'blur';
    $('detail-title').textContent = m.title; $('detail-place').textContent = m.place ? '장소 · ' + m.place : ''; $('detail-place').hidden = !m.place;
    $('detail-memo').textContent = m.memo || ''; $('detail-memo').hidden = !m.memo;
    $('detail-memory').classList.toggle('blurred', blurred);
    if (blurred) $('detail-memory').setAttribute('aria-hidden', 'true'); else $('detail-memory').removeAttribute('aria-hidden');
    $('detail-status').textContent = (event.important ? '◆ ' : '') + status(event, m);
    $('detail-status').className = 'status-tag ' + (event.important ? 'pinned' : m.kind);
    $('remember').disabled = !m.changed;
    $('remember').textContent = m.changed ? '다시 떠올리기' : event.important ? '꼭 기억하고 있어요' : revealed.has(event.id) ? '아, 이제 기억났어요!' : '원래 일정 그대로예요';
    $('remember-help').textContent = m.changed ? '누르면 처음 적은 제목·장소·메모를 확인할 수 있어요.' : event.important ? '까먹을 확률과 관계없이 원본을 보여드려요.' : revealed.has(event.id) ? '다음 기억 변화 전까지 이 일정은 또렷해요.' : '지금 보고 있는 내용이 저장한 원본이에요.';
  }
  $('remember').addEventListener('click', () => {
    const event = find(viewingId); if (!event) return;
    revealed.add(event.id); paintDetail(event); renderCalendar(); renderAgenda();
  });
  $('edit-event').addEventListener('click', () => openEditor(viewingId));
  $('delete-event').addEventListener('click', () => {
    const id = viewingId; if (demo || !find(id)) return;
    ask('이 일정을 지울까요?', '망각 연출이 아니라 원본 일정이 삭제돼요.', '삭제하기', () => {
      events = events.filter(e => e.id !== id); revealed.delete(id); const saved = persist(); closeDialog(); render();
      notify(saved ? '일정을 삭제했어요.' : '화면에서 삭제했어요. 브라우저 저장은 실패했어요.');
    });
  });
  $('event-form').addEventListener('submit', e => {
    e.preventDefault(); $('form-error').hidden = true;
    try {
      if (!editingId && !demo && events.length >= K.LIMIT) throw new Error(`일정은 최대 ${K.LIMIT}개까지 저장할 수 있어요.`);
      const id = editingId || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `event-${Date.now()}-${Math.random().toString(16).slice(2)}`);
      const event = K.cleanEvent({ id, title: $('event-title').value, date: $('event-date').value, time: $('event-time').value, place: $('event-place').value, memo: $('event-memo').value, important: $('event-important').checked });
      if (demo) { events = []; demo = false; }
      if (editingId) events = events.map(item => item.id === editingId ? event : item); else events.push(event);
      // 방금 기록한 일정은 다음 기억 변화까지 또렷하게 보입니다.
      revealed.add(id); selected = event.date; view = K.parseDate(selected);
      const saved = persist(); closeDialog(); render();
      notify(saved ? '기억해 뒀어요. 다음번엔 좀 가물가물할지도요.' : '화면에 남겼어요. 닫기 전에 백업을 저장해 주세요.');
    } catch (error) { $('form-error').textContent = error.message; $('form-error').hidden = false; }
  });

  function shuffle(manual) {
    if (dialog.open || confirmDialog.open) return;
    epoch += 1; revealed.clear(); lastRefresh = Date.now();
    const activeDate = document.activeElement?.dataset.day;
    renderCalendar(); renderAgenda();
    if (activeDate) focusDate(activeDate);
    if (manual) notify(settings.probability === 0 ? '0%라서 아무것도 까먹지 않았어요.' : '기억을 뒤적여봤어요. 뭐가 달라졌을까요?');
  }
  function setRate(value) {
    settings.probability = Number(value); revealed.clear(); lastRefresh = Date.now();
    persist(); render();
  }
  $('probability').addEventListener('input', e => setRate(e.target.value));
  document.querySelectorAll('[data-rate]').forEach(b => b.addEventListener('click', () => setRate(b.dataset.rate)));
  document.querySelectorAll('[name="mode"]').forEach(c => c.addEventListener('change', () => {
    const modes = [...document.querySelectorAll('[name="mode"]:checked')].map(x => x.value);
    if (!modes.length) { c.checked = true; notify('까먹는 방식을 하나 이상 골라주세요. 모두 끄려면 확률을 0%로 두세요.'); return; }
    settings.modes = modes; revealed.clear(); persist(); render();
  }));
  $('auto-memory').addEventListener('change', e => { settings.auto = e.target.checked; lastRefresh = Date.now(); persist(); });
  $('shuffle').addEventListener('click', () => shuffle(true));
  setInterval(() => {
    if (document.hidden || dialog.open || confirmDialog.open || !settings.auto) { lastRefresh = Date.now(); return; }
    if (Date.now() - lastRefresh >= REFRESH_MS) shuffle(false);
  }, 1000);
  document.addEventListener('visibilitychange', () => { lastRefresh = Date.now(); });

  $('export').addEventListener('click', () => {
    if (demo) return;
    const blob = new Blob([K.backup(events, settings)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
    const link = element('a'); link.href = url; link.download = `kkamppak-backup-${todayKey()}.json`; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); notify('다운로드한 백업에는 원본 일정이 담겨 있어요.');
  });
  $('import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('백업 파일은 1MB 이하만 불러올 수 있어요.');
      const data = K.readBackup(await file.text());
      ask('백업을 불러올까요?', `${data.events.length}개의 원본 일정을 불러와요.\n현재 ${demo ? '예시' : events.length + '개의'} 일정은 백업 내용으로 교체됩니다.${saveBlocked ? '\n읽지 못했던 브라우저 저장 데이터도 교체됩니다.' : ''}`, '불러오기', () => {
        events = data.events; settings = data.settings; demo = false; saveBlocked = false; revealed.clear(); lastRefresh = Date.now();
        const saved = persist(); selectDay(events[0]?.date || todayKey());
        notify(saved ? `${events.length}개의 일정을 불러왔어요.` : '일정을 불러왔지만 브라우저에 저장하지 못했어요.');
      });
    } catch (error) { notify(error.message); }
  });
  // 여러 탭의 동시 편집으로 다른 탭의 원본을 덮어쓰지 않도록 알려줍니다.
  window.addEventListener('storage', e => {
    if (e.key !== STORAGE_KEY) return;
    saveBlocked = true;
    warn('다른 탭에서 캘린더가 바뀌었어요. 이 탭의 내용은 그대로 두었어요. 필요한 일정은 백업하고 새로고침해 최신 내용을 불러와 주세요.');
  });
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  load();
  if (demo) {
    // 첫 방문의 예시는 현재 선택한 날에서 연출을 바로 볼 수 있게 합니다.
    for (let tries = 0; tries < 60 && !K.examples(new Date()).filter(e => e.date === selected).some(e => memory(e).changed); tries++) epoch += 1;
  }
  render();
})();
