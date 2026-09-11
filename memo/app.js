(() => {
  'use strict';

  const STORAGE_KEY = 'memohaenneunde-state-v1';
  const AUTO_MS = 45000;
  const $ = (id) => document.getElementById(id);

  const els = {
    list: $('note-list'), count: $('note-count'), fuzzyCount: $('fuzzy-count'),
    search: $('search-input'), empty: $('empty-state'), viewer: $('viewer'), editor: $('editor'),
    paperActions: $('paper-actions'), date: $('view-date'), title: $('view-title'), body: $('view-body'),
    status: $('memory-status'), dot: $('memory-status-dot'), message: $('memory-message-copy'),
    titleInput: $('title-input'), bodyInput: $('body-input'), importantInput: $('important-input'),
    error: $('editor-error'), probability: $('probability'), probabilityValue: $('probability-value'),
    auto: $('auto-memory'), toast: $('toast'), importFile: $('import-file'),
    confirm: $('confirm-dialog'), confirmTitle: $('confirm-title'), confirmCopy: $('confirm-copy')
  };

  const defaults = {
    notes: [],
    selectedId: null,
    settings: { probability: 35, modes: ['blur', 'rewrite', 'fragment'], auto: true }
  };

  let state = loadState();
  let editingId = null;
  let isCreating = false;
  let confirmAction = null;
  let toastTimer = null;
  let autoTimer = null;

  const thoughts = [
    ['적은 건 확실해요.', '뭘 적었는지는 조금 자신이 없네요.'],
    ['메모는 남아 있습니다.', '내용이 같은지는 별개의 문제고요.'],
    ['방금까진 기억났는데.', '정말입니다. 방금까진요.'],
    ['원본은 안전합니다.', '제 기억만 안전하지 않습니다.'],
    ['이게 맞았나…', '메모장이 메모를 의심하기 시작했습니다.']
  ];

  const rewritePairs = [
    [/우유/g, '두유'], [/두유/g, '우유'], [/회의/g, '티타임'], [/과제/g, '뭔가 제출할 것'],
    [/공부/g, '잠깐 정리'], [/운동/g, '산책'], [/병원/g, '어딘가 예약'], [/은행/g, '편의점'],
    [/교수님/g, '누군가'], [/친구/g, '아는 사람'], [/전화/g, '연락'], [/제출/g, '보내기'],
    [/구매/g, '구경'], [/약속/g, '일정'], [/점심/g, '간식'], [/저녁/g, '야식'],
    [/월요일/g, '화요일'], [/화요일/g, '수요일'], [/수요일/g, '목요일'], [/목요일/g, '금요일'],
    [/금요일/g, '토요일'], [/토요일/g, '일요일'], [/일요일/g, '월요일']
  ];

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(defaults));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return cloneDefaults();
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch (_) {
      return cloneDefaults();
    }
  }

  function normalizeState(raw) {
    const next = cloneDefaults();
    if (raw && Array.isArray(raw.notes)) {
      next.notes = raw.notes.map(normalizeNote).filter(Boolean);
    }
    if (raw && typeof raw.selectedId === 'string') next.selectedId = raw.selectedId;
    if (raw && raw.settings) {
      const p = Number(raw.settings.probability);
      if (Number.isFinite(p)) next.settings.probability = Math.max(0, Math.min(100, Math.round(p / 5) * 5));
      if (Array.isArray(raw.settings.modes)) {
        const valid = raw.settings.modes.filter((m) => ['blur', 'rewrite', 'fragment'].includes(m));
        if (valid.length) next.settings.modes = [...new Set(valid)];
      }
      if (typeof raw.settings.auto === 'boolean') next.settings.auto = raw.settings.auto;
    }
    if (!next.notes.some((n) => n.id === next.selectedId)) next.selectedId = next.notes[0]?.id || null;
    return next;
  }

  function normalizeNote(note) {
    if (!note || typeof note !== 'object') return null;
    const title = String(note.title || '').slice(0, 80).trim();
    const body = String(note.body || '').slice(0, 4000);
    if (!title && !body.trim()) return null;
    const id = typeof note.id === 'string' && note.id ? note.id : makeId();
    const createdAt = Number(note.createdAt) || Date.now();
    const updatedAt = Number(note.updatedAt) || createdAt;
    const important = Boolean(note.important);
    const memory = normalizeMemory(note.memory, title, body);
    return { id, title: title || '제목 없는 메모', body, important, createdAt, updatedAt, memory };
  }

  function normalizeMemory(memory, title, body) {
    const mode = memory && ['clear', 'blur', 'rewrite', 'fragment'].includes(memory.mode) ? memory.mode : 'clear';
    return {
      mode,
      title: mode === 'clear' ? title : String(memory?.title ?? title).slice(0, 120),
      body: mode === 'clear' ? body : String(memory?.body ?? body).slice(0, 5000),
      changedAt: Number(memory?.changedAt) || null
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (_) {
      toast('저장 공간이 부족해서 메모를 저장하지 못했습니다.');
      return false;
    }
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return `memo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function selectedNote() {
    return state.notes.find((n) => n.id === state.selectedId) || null;
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function shortDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  function renderAll() {
    syncSettingsUI();
    renderList();
    if (editingId !== null || isCreating) renderEditor();
    else renderViewer();
    updateAutoTimer();
  }

  function renderList() {
    const query = els.search.value.trim().toLowerCase();
    const rows = state.notes
      .filter((note) => !query || `${note.title}\n${note.body}`.toLowerCase().includes(query))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    els.list.innerHTML = '';
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'no-results';
      empty.textContent = state.notes.length ? '그런 메모는… 있었던가요?' : '아직 남겨둔 메모가 없어요.';
      els.list.appendChild(empty);
    }

    rows.forEach((note) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `note-item ${note.id === state.selectedId ? 'active' : ''} ${note.memory.mode !== 'clear' ? 'fuzzy' : ''} ${note.memory.mode === 'blur' ? 'blur' : ''}`;
      button.dataset.id = note.id;

      const top = document.createElement('div');
      top.className = 'note-item-top';
      const title = document.createElement('span');
      title.className = 'note-item-title';
      title.textContent = note.memory.mode === 'blur' ? note.title : note.memory.title || note.title;
      top.appendChild(title);
      if (note.important) {
        const pin = document.createElement('span');
        pin.className = 'pin';
        pin.textContent = '◆';
        pin.title = '꼭 기억할 메모';
        top.appendChild(pin);
      }

      const preview = document.createElement('div');
      preview.className = 'note-item-preview';
      preview.textContent = (note.memory.mode === 'clear' ? note.body : note.memory.body).replace(/\s+/g, ' ').trim() || '내용 없는 메모';

      const time = document.createElement('span');
      time.className = 'note-item-time';
      time.textContent = `${shortDate(note.updatedAt)} · ${memoryLabel(note)}`;

      button.append(top, preview, time);
      button.addEventListener('click', () => {
        state.selectedId = note.id;
        editingId = null;
        isCreating = false;
        saveState();
        renderAll();
      });
      els.list.appendChild(button);
    });

    els.count.textContent = `메모 ${state.notes.length}개`;
    const fuzzy = state.notes.filter((n) => n.memory.mode !== 'clear').length;
    els.fuzzyCount.textContent = `가물가물 ${fuzzy}개`;
  }

  function renderViewer() {
    const note = selectedNote();
    els.editor.hidden = true;
    if (!note) {
      els.empty.hidden = false;
      els.viewer.hidden = true;
      els.paperActions.hidden = true;
      setStatus(null);
      return;
    }

    els.empty.hidden = true;
    els.viewer.hidden = false;
    els.paperActions.hidden = false;
    els.date.textContent = `마지막 원본 수정 · ${formatDate(note.updatedAt)}`;

    const shownTitle = note.memory.mode === 'clear' ? note.title : note.memory.title;
    const shownBody = note.memory.mode === 'clear' ? note.body : note.memory.body;
    els.title.textContent = shownTitle || '제목이… 뭐였더라';
    els.body.textContent = shownBody || '분명 뭔가 적어뒀는데, 내용이 비어 있습니다.';

    els.title.className = 'memory-text';
    els.body.className = 'memory-body memory-text';
    if (note.memory.mode !== 'clear') {
      els.title.classList.add(note.memory.mode);
      els.body.classList.add(note.memory.mode);
    }

    $('remember-note').disabled = note.memory.mode === 'clear';
    $('remember-note').textContent = note.memory.mode === 'clear' ? '지금은 또렷하게 기억 중' : '원래 뭐였지? 다시 떠올리기';
    $('forget-note').disabled = note.important;
    $('forget-note').title = note.important ? '꼭 기억하기가 켜진 메모입니다.' : '';

    setStatus(note);
  }

  function setStatus(note) {
    els.dot.className = 'status-dot';
    if (!note) {
      els.status.textContent = '기억 상태';
      return;
    }
    if (note.important) {
      els.dot.classList.add('protected');
      els.status.textContent = '◆ 꼭 기억하는 메모';
      els.message.textContent = '이 메모는 꼭 기억하기가 켜져 있어서 멋대로 까먹지 않습니다.';
      return;
    }
    if (note.memory.mode === 'clear') {
      els.status.textContent = '또렷하게 기억 중';
      els.message.textContent = '이번에는 또렷하게 기억하고 있어요. 이 상태가 얼마나 갈지는 모르겠지만요.';
      return;
    }
    els.dot.classList.add('fuzzy');
    els.status.textContent = memoryLabel(note);
    const copy = {
      blur: '글씨가 왜 이렇게 흐렸죠? 원본은 멀쩡히 보관되어 있습니다.',
      rewrite: '이렇게 적었던 것 같기도 하고… 아닌 것 같기도 합니다.',
      fragment: '중간중간 기억이 비었습니다. 하필 필요한 부분만요.'
    };
    els.message.textContent = copy[note.memory.mode] || '기억이 조금 수상합니다.';
  }

  function renderEditor() {
    els.empty.hidden = true;
    els.viewer.hidden = true;
    els.editor.hidden = false;
    els.paperActions.hidden = true;
    const note = editingId ? state.notes.find((n) => n.id === editingId) : null;
    els.titleInput.value = note?.title || '';
    els.bodyInput.value = note?.body || '';
    els.importantInput.checked = note?.important || false;
    els.error.hidden = true;
    setStatus(note || null);
    requestAnimationFrame(() => els.titleInput.focus());
  }

  function memoryLabel(note) {
    if (note.important) return '꼭 기억함';
    return ({ clear: '또렷함', blur: '흐릿함', rewrite: '다르게 기억함', fragment: '일부만 기억함' })[note.memory.mode] || '또렷함';
  }

  function syncSettingsUI() {
    els.probability.value = String(state.settings.probability);
    els.probabilityValue.textContent = String(state.settings.probability);
    els.auto.checked = state.settings.auto;
    document.querySelectorAll('input[name="mode"]').forEach((input) => {
      input.checked = state.settings.modes.includes(input.value);
    });
    document.querySelectorAll('[data-rate]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.rate) === state.settings.probability);
    });
  }

  function beginCreate() {
    state.selectedId = null;
    editingId = null;
    isCreating = true;
    renderAll();
  }

  function beginEdit() {
    const note = selectedNote();
    if (!note) return;
    editingId = note.id;
    isCreating = false;
    renderAll();
  }

  function cancelEdit() {
    editingId = null;
    isCreating = false;
    if (!state.selectedId && state.notes.length) state.selectedId = state.notes[0].id;
    renderAll();
  }

  function submitEditor(event) {
    event.preventDefault();
    const title = els.titleInput.value.trim();
    const body = els.bodyInput.value.trimEnd();
    if (!title) return showEditorError('제목은 하나쯤 기억해 주세요.');
    if (!body.trim()) return showEditorError('내용이 비어 있으면 뭘 까먹어야 할지 모르겠어요.');

    const now = Date.now();
    if (editingId) {
      const note = state.notes.find((n) => n.id === editingId);
      if (!note) return;
      note.title = title;
      note.body = body;
      note.important = els.importantInput.checked;
      note.updatedAt = now;
      note.memory = { mode: 'clear', title, body, changedAt: null };
      state.selectedId = note.id;
      toast('원본 메모를 수정했습니다. 기억도 다시 또렷해졌어요.');
    } else {
      const note = {
        id: makeId(), title, body, important: els.importantInput.checked,
        createdAt: now, updatedAt: now,
        memory: { mode: 'clear', title, body, changedAt: null }
      };
      state.notes.push(note);
      state.selectedId = note.id;
      toast('메모해 뒀습니다. 아직은 기억하고 있어요.');
    }
    editingId = null;
    isCreating = false;
    saveState();
    renderAll();
  }

  function showEditorError(text) {
    els.error.textContent = text;
    els.error.hidden = false;
  }

  function enabledModes() {
    return state.settings.modes.length ? state.settings.modes : ['blur'];
  }

  function forgetNote(note, force = false) {
    if (!note || note.important) return false;
    if (!force && Math.random() * 100 >= state.settings.probability) return false;
    const modes = enabledModes();
    const mode = modes[Math.floor(Math.random() * modes.length)];
    const transformed = transform(note.title, note.body, mode);
    note.memory = { mode, title: transformed.title, body: transformed.body, changedAt: Date.now() };
    return true;
  }

  function transform(title, body, mode) {
    if (mode === 'blur') return { title, body };
    if (mode === 'fragment') return { title: fragmentText(title, 0.32), body: fragmentText(body, 0.24) };
    return { title: rewriteText(title, true), body: rewriteText(body, false) };
  }

  function fragmentText(text, ratio) {
    if (!text) return text;
    return text.split(/(\s+)/).map((part) => {
      if (!part.trim() || part.length < 2 || Math.random() > ratio) return part;
      const keep = Math.max(1, Math.floor(part.length * 0.35));
      return `${part.slice(0, keep)}${'…'.repeat(Math.min(3, Math.max(1, part.length - keep)))}`;
    }).join('');
  }

  function rewriteText(text, isTitle) {
    if (!text) return text;
    let out = text;
    const shuffled = [...rewritePairs].sort(() => Math.random() - 0.5);
    let replacements = 0;
    for (const [pattern, replacement] of shuffled) {
      if (pattern.test(out)) {
        pattern.lastIndex = 0;
        out = out.replace(pattern, replacement);
        replacements += 1;
        if (replacements >= (isTitle ? 1 : 2)) break;
      }
      pattern.lastIndex = 0;
    }

    out = out.replace(/(\d{1,2})\s*시/g, (_, n) => {
      const value = Number(n);
      if (!Number.isFinite(value) || value < 0 || value > 23 || Math.random() > 0.45) return `${n}시`;
      const delta = Math.random() < 0.5 ? -1 : 1;
      return `${(value + delta + 24) % 24}시`;
    });

    if (replacements === 0) {
      const words = out.split(/(\s+)/);
      const candidates = words.map((w, i) => ({ w, i })).filter(({ w }) => w.trim().length >= 2 && !/[.,!?~…]/.test(w));
      if (candidates.length) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)].i;
        words[pick] = Math.random() < 0.5 ? '뭔가' : '아마도';
        out = words.join('');
      } else if (out.trim()) {
        out = `${out}… 아마도`;
      }
    }
    return out;
  }

  function manualForgetCurrent() {
    const note = selectedNote();
    if (!note) return toast('먼저 메모를 하나 남겨주세요.');
    if (note.important) return toast('이 메모는 꼭 기억하기가 켜져 있습니다.');
    forgetNote(note, true);
    saveState();
    renderAll();
    randomThought();
    toast('방금 기억이 조금 수상해졌습니다.');
  }

  function shuffleForget() {
    const candidates = state.notes.filter((n) => !n.important);
    if (!candidates.length) return toast(state.notes.length ? '모든 메모를 꼭 기억하고 있어서 까먹을 수 없어요.' : '까먹을 메모부터 남겨주세요.');
    const note = candidates[Math.floor(Math.random() * candidates.length)];
    state.selectedId = note.id;
    editingId = null;
    isCreating = false;
    forgetNote(note, true);
    saveState();
    renderAll();
    randomThought();
    toast(`“${note.title}” 메모가 조금 가물가물해졌습니다.`);
  }

  function rememberCurrent() {
    const note = selectedNote();
    if (!note || note.memory.mode === 'clear') return;
    note.memory = { mode: 'clear', title: note.title, body: note.body, changedAt: null };
    saveState();
    renderAll();
    toast('아, 맞다. 원래 메모를 다시 떠올렸습니다.');
  }

  function autoForget() {
    if (!state.settings.auto || document.hidden || editingId !== null || isCreating) return;
    const candidates = state.notes.filter((n) => !n.important);
    if (!candidates.length) return;
    const note = candidates[Math.floor(Math.random() * candidates.length)];
    if (!forgetNote(note, false)) return;
    saveState();
    renderList();
    if (note.id === state.selectedId) renderViewer();
    randomThought();
  }

  function updateAutoTimer() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null;
    if (state.settings.auto) autoTimer = setInterval(autoForget, AUTO_MS);
  }

  function randomThought() {
    const [title, copy] = thoughts[Math.floor(Math.random() * thoughts.length)];
    $('thought-title').textContent = title;
    $('thought-copy').textContent = copy;
  }

  function askDelete() {
    const note = selectedNote();
    if (!note) return;
    confirmAction = () => {
      state.notes = state.notes.filter((n) => n.id !== note.id);
      state.selectedId = [...state.notes].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id || null;
      editingId = null;
      isCreating = false;
      saveState();
      renderAll();
      toast('원본 메모까지 삭제했습니다.');
    };
    els.confirmTitle.textContent = '정말 이 메모를 지울까요?';
    els.confirmCopy.textContent = `“${note.title}” 원본까지 완전히 삭제됩니다.`;
    els.confirm.showModal();
  }

  function exportNotes() {
    const payload = {
      app: '메모했는데',
      version: 1,
      exportedAt: new Date().toISOString(),
      state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memohaenneunde-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('백업 파일을 만들었습니다.');
  }

  async function importNotes(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = normalizeState(parsed.state || parsed);
      state = imported;
      editingId = null;
      isCreating = false;
      saveState();
      renderAll();
      toast(`메모 ${state.notes.length}개를 불러왔습니다.`);
    } catch (_) {
      toast('백업 파일을 읽지 못했습니다.');
    } finally {
      els.importFile.value = '';
    }
  }

  function toast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.hidden = false;
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2600);
  }

  function setProbability(value) {
    state.settings.probability = Math.max(0, Math.min(100, Number(value) || 0));
    saveState();
    syncSettingsUI();
  }

  $('new-note').addEventListener('click', beginCreate);
  $('new-note-bottom').addEventListener('click', beginCreate);
  $('empty-new').addEventListener('click', beginCreate);
  $('edit-note').addEventListener('click', beginEdit);
  $('cancel-edit').addEventListener('click', cancelEdit);
  $('editor').addEventListener('submit', submitEditor);
  $('delete-note').addEventListener('click', askDelete);
  $('forget-note').addEventListener('click', manualForgetCurrent);
  $('remember-note').addEventListener('click', rememberCurrent);
  $('shuffle-memory').addEventListener('click', shuffleForget);
  els.search.addEventListener('input', renderList);

  els.probability.addEventListener('input', () => setProbability(els.probability.value));
  document.querySelectorAll('[data-rate]').forEach((button) => button.addEventListener('click', () => setProbability(button.dataset.rate)));

  document.querySelectorAll('input[name="mode"]').forEach((input) => {
    input.addEventListener('change', () => {
      const selected = [...document.querySelectorAll('input[name="mode"]:checked')].map((el) => el.value);
      if (!selected.length) {
        input.checked = true;
        return toast('까먹는 방식은 하나쯤 남겨주세요.');
      }
      state.settings.modes = selected;
      saveState();
    });
  });

  els.auto.addEventListener('change', () => {
    state.settings.auto = els.auto.checked;
    saveState();
    updateAutoTimer();
    toast(state.settings.auto ? '이제 가끔 저절로 까먹습니다.' : '저절로 까먹기는 잠시 쉬어갑니다.');
  });

  $('export-notes').addEventListener('click', exportNotes);
  $('import-notes').addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', () => {
    const file = els.importFile.files?.[0];
    if (file) importNotes(file);
  });

  $('confirm-cancel').addEventListener('click', () => {
    confirmAction = null;
    els.confirm.close();
  });
  $('confirm-ok').addEventListener('click', () => {
    const action = confirmAction;
    confirmAction = null;
    els.confirm.close();
    if (action) action();
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && !els.editor.hidden) {
      event.preventDefault();
      els.editor.requestSubmit();
    }
    if (event.key === 'Escape' && !els.editor.hidden) cancelEdit();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateAutoTimer();
  });

  renderAll();
})();
