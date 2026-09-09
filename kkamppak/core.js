/* 일정 원본과 화면의 망각 연출을 분리합니다. 외부 통신은 하지 않습니다. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Kkamppak = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DEFAULTS = Object.freeze({ probability: 35, modes: ['blur', 'rewrite', 'fragment'], auto: true });
  const LIMIT = 500;
  function dateKey(date) {
    return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function parseDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (y < 1 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const result = new Date(2000, m - 1, d, 12);
    result.setFullYear(y);
    return dateKey(result) === value ? result : null;
  }
  function monthDays(year, month) {
    const first = new Date(2000, month, 1, 12); first.setFullYear(year);
    const start = new Date(first); start.setDate(1 - first.getDay());
    const last = new Date(first); last.setMonth(first.getMonth() + 1, 0);
    const size = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
    return Array.from({ length: size }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }
  function cleanEvent(event) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('일정 형식이 올바르지 않아요.');
    const validString = (v, max) => typeof v === 'string' && v.length <= max;
    if (!validString(event.id, 100) || !event.id || !validString(event.title, 80) || !event.title.trim() || !parseDate(event.date) ||
      !validString(event.time, 5) || (event.time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time)) ||
      !validString(event.place, 80) || !validString(event.memo, 500) || typeof event.important !== 'boolean') {
      throw new Error('일정의 제목·날짜·시간을 확인해 주세요.');
    }
    return { id: event.id, title: event.title.trim(), date: event.date, time: event.time, place: event.place, memo: event.memo, important: event.important };
  }
  function cleanSettings(settings) {
    if (!settings || !Number.isInteger(settings.probability) || settings.probability < 0 || settings.probability > 100 ||
      !Array.isArray(settings.modes) || settings.modes.length < 1 || settings.modes.some(m => !DEFAULTS.modes.includes(m)) || typeof settings.auto !== 'boolean') {
      throw new Error('기억 설정을 읽을 수 없어요.');
    }
    return { probability: settings.probability, modes: [...new Set(settings.modes)], auto: settings.auto };
  }
  function readBackup(raw) {
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('올바른 깜빡 백업 파일을 선택해 주세요.'); }
    if (!data || data.app !== 'kkamppak' || data.version !== 1 || !Array.isArray(data.events) || data.events.length > LIMIT) throw new Error('지원하지 않는 백업 형식이에요.');
    const events = data.events.map(cleanEvent);
    if (new Set(events.map(e => e.id)).size !== events.length) throw new Error('일정 번호가 중복된 백업이에요.');
    return { events, settings: cleanSettings(data.settings) };
  }
  function backup(events, settings) { return JSON.stringify({ app: 'kkamppak', version: 1, events: events.map(cleanEvent), settings: cleanSettings(settings) }, null, 2); }
  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rewrite(text, seed) {
    if (!text) return '';
    const pairs = [['팀플', '티타임'], ['회의', '회식'], ['공부', '공상'], ['과제', '과자'], ['발표', '박수'], ['수업', '수다'], ['운동', '운명'], ['도서관', '도서섬'], ['카페', '캠프'], ['병원', '공원'], ['친구', '친척'], ['점심', '간식'], ['저녁', '야식'], ['시험', '실험'], ['프로젝트', '피크닉'], ['미팅', '산책'], ['장보기', '장구경'], ['생일', '생강'], ['약속', '약과']];
    const matches = pairs.filter(([from]) => text.includes(from));
    if (matches.length) { const [from, to] = matches[seed % matches.length]; return text.replace(from, to); }
    const digits = text.match(/[0-9]/);
    if (digits) return text.replace(/[0-9]/, d => String((Number(d) + 1) % 10));
    return text + ['…였나?', ' 비슷한 무언가', ' (아마도)'][seed % 3];
  }
  function fragment(text) {
    if (!text) return '';
    const chars = Array.from(text);
    if (chars.length < 3) return '•••';
    return chars.slice(0, Math.max(1, Math.floor(chars.length / 3))).join('') + ' •••';
  }
  function memory(event, settings, epoch, revealed = false) {
    const roll = hash(`${event.id}/${epoch}/chance`) / 4294967296;
    const active = !event.important && !revealed && roll < settings.probability / 100;
    const seed = hash(`${event.id}/${epoch}/style`);
    const kind = active ? settings.modes[seed % settings.modes.length] : 'clear';
    const transform = kind === 'rewrite' ? t => rewrite(t, seed) : kind === 'fragment' ? fragment : t => t;
    return { kind, title: transform(event.title), place: transform(event.place), memo: transform(event.memo), changed: active };
  }
  function examples(today) {
    const offset = days => { const d = new Date(today); d.setDate(d.getDate() + days); return dateKey(d); };
    return [
      ['demo-1', '팀플 회의', 0, '14:00', '학교 도서관', '발표 순서 정하고 자료 나누기.', false],
      ['demo-2', '친구랑 저녁', 0, '18:30', '역 앞 파스타집', '오랜만에 만나서 수다 떨기.', false],
      ['demo-3', '과제 제출', 2, '23:00', '', '파일 이름과 첨부를 꼭 확인하기.', true],
      ['demo-4', '카페에서 공부', 4, '11:00', '동네 카페', '커피 한 잔과 밀린 공부.', false],
      ['demo-5', '운동 가기', -2, '19:00', '학교 운동장', '', false],
      ['demo-6', '프로젝트 발표', 7, '10:00', '강의실 302', '발표 자료 챙기기.', false],
      ['demo-7', '도서관 책 반납', 10, '', '도서관', '', false]
    ].map(([id, title, days, time, place, memo, important]) => ({ id, title, date: offset(days), time, place, memo, important }));
  }
  return { DEFAULTS, LIMIT, dateKey, parseDate, monthDays, cleanEvent, cleanSettings, readBackup, backup, hash, rewrite, fragment, memory, examples };
});
