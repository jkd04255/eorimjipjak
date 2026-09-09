(function (root) {
  'use strict';
  const percent = (value, fallback) => Number.isFinite(Number(value))
    ? Math.min(100, Math.max(0, Math.round(Number(value)))) : fallback;

  function settings(urgency, volume) {
    const level = percent(urgency, 60);
    return {
      urgency: level,
      volume: percent(volume, 80),
      // Deliberately slow, local light pulses. No full-screen flashing.
      pulseSeconds: Number((3.8 - level * 0.028).toFixed(2)),
      ringOpacity: Number((0.18 + level * 0.0034).toFixed(2)),
      label: level < 40 ? '훈련 중' : level < 85 ? '출동 중' : '초긴급',
      actualVolume: 0
    };
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(total % 3600 / 60);
    const remainder = total % 60;
    const pair = n => String(n).padStart(2, '0');
    return hours ? `${pair(hours)}:${pair(minutes)}:${pair(remainder)}` : `${pair(minutes)}:${pair(remainder)}`;
  }

  function thought(running, urgency, volume, hasRun) {
    if (!running) return hasRun
      ? ['휴, 아무도 못 들었겠죠?', '성공적인 무음 출동이었어요.\n주변은 처음부터 평온했고요.']
      : ['목청은 마음속에 있어요.', '긴급한 분위기는 제가 낼게요.\n평온한 분위기도 제가 낼게요.'];
    if (volume === 0) return ['무음에 무음을 더했어요.', '볼륨까지 꺼주셨네요.\n더없이 완벽한 침묵입니다.'];
    if (volume >= 100) return ['이게 제일 큰 침묵이에요.', '음량을 끝까지 올렸습니다.\n달라진 건 제 마음가짐뿐.'];
    if (urgency >= 85) return ['마음만은 이미 현장이에요.', '지금 아주 다급합니다.\n조용히 다급한 중입니다.'];
    if (urgency < 40) return ['오늘은 마음속으로 훈련.', '불빛은 천천히 돌리고,\n고요함은 빈틈없이 지킵니다.'];
    return ['위—우—. 읽어주시면 돼요.', '저는 불빛을 맡을게요.\n소리는 상상에 맡깁니다.'];
  }

  root.SilentSiren = Object.freeze({ settings, formatTime, thought });
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SilentSiren;
})(typeof window !== 'undefined' ? window : globalThis);
