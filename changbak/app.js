(() => {
  const homeLink = document.querySelector('.tb-home');
  if(homeLink) homeLink.href = '../?build=20260910-1325';

  const sky = document.getElementById('sky');
  const clock = document.getElementById('clock');
  const dayPart = document.getElementById('day-part');
  const status = document.getElementById('weather-status');
  const title = document.getElementById('weather-title');
  const sub = document.getElementById('weather-sub');
  const askBtn = document.getElementById('ask-btn');
  const cantSeeBtn = document.getElementById('cant-see-btn');
  const question = document.getElementById('weather-question');
  const laziness = document.getElementById('laziness');
  const lazinessValue = document.getElementById('laziness-value');
  const lazinessHelper = document.getElementById('laziness-helper');
  const caseStatus = document.getElementById('case-status');
  const thoughtTitle = document.getElementById('thought-title');
  const thoughtBody = document.getElementById('thought-body');
  const presets = [...document.querySelectorAll('.tb-presets button')];
  const skyButtons = [...document.querySelectorAll('[data-sky]')];
  let asks = 0;

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function getPeriod(hour){
    if(hour >= 5 && hour < 8) return 'morning';
    if(hour >= 8 && hour < 17) return 'day';
    if(hour >= 17 && hour < 20) return 'evening';
    return 'night';
  }

  function updateTime(){
    const now = new Date();
    const period = getPeriod(now.getHours());
    clock.textContent = now.toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit', hour12:false});
    const labels = {morning:'아침인 듯', day:'낮인 건 확실', evening:'저녁쯤', night:'밤입니다'};
    dayPart.textContent = labels[period];
    const isDay = period !== 'night';
    sky.classList.toggle('is-day', isDay);
    sky.classList.toggle('is-night', !isDay);
    status.textContent = `${clock.textContent} · ${labels[period]} · 날씨는 모름`;
  }

  function timeGuess(){
    const period = getPeriod(new Date().getHours());
    const level = Number(laziness.value);
    const guesses = {
      morning:['아침이네요. 아마 밖이 슬슬 밝아졌겠죠.','아침이면 해가 올라오는 중 아닐까요. 아마도요.'],
      day:['낮이면 아마 해가 떠있지 않을까요.','지금 낮이네요. 밝을 가능성은 꽤 높겠죠.'],
      evening:['저녁이니까 해가 슬슬 들어가고 있겠죠.','이 시간이면 아직 좀 밝거나, 막 어두워지는 중일 겁니다.'],
      night:['밤이네요. 해는 안 떠 있습니다. 이건 자신 있어요.','이 시간에 맑든 흐리든 일단 어둡겠죠.']
    };

    if(level >= 80){
      title.textContent = period === 'night' ? '밤이네요. 해는 없겠죠.' : '낮이면 아마 해가 떠있지 않을까요.';
      sub.textContent = '그 이상은 창밖이 저보다 잘 압니다.';
    }else if(level >= 45){
      title.textContent = pick(guesses[period]);
      sub.textContent = '구름이 있는지는 모르겠고요. 비도 모르겠고요.';
    }else{
      title.textContent = pick(guesses[period]);
      sub.textContent = '시간만 보면 이 정도는 추측할 수 있습니다. 이제 창밖에 해가 보이는지만 알려주세요.';
    }

    question.hidden = false;
    thoughtTitle.textContent = asks > 1 ? '또 물어보시네요.' : '그래도 알려달라고요?';
    thoughtBody.textContent = level >= 75 ? '좋아요. 시계까지 봤으니 오늘 할 일은 다 한 것 같습니다.' : '실제 날씨는 모르지만 시간대 정도는 성실하게 확인했습니다.';
  }

  askBtn.addEventListener('click', () => {
    asks += 1;
    if(Number(laziness.value) >= 90 && asks === 1){
      title.textContent = '창밖을 보세요.';
      sub.textContent = '네. 첫 번째 답이랑 같습니다.';
      question.hidden = true;
      thoughtTitle.textContent = '벌써 두 번째 질문인가요?';
      thoughtBody.textContent = '한 번만 더 물어보면 시계 정도는 봐드릴게요.';
      return;
    }
    timeGuess();
  });

  cantSeeBtn.addEventListener('click', () => {
    title.textContent = '비가 오려나…';
    sub.innerHTML = '여기서 뭘 바래요. <span class="shrug">¯\\_(ツ)_/¯</span>';
    question.hidden = true;
    thoughtTitle.textContent = '창밖도 안 보인다고요?';
    thoughtBody.textContent = '그럼 저랑 조건이 같네요. 둘 다 모릅니다.';
  });

  skyButtons.forEach(btn => btn.addEventListener('click', () => {
    const answer = btn.dataset.sky;
    question.hidden = true;
    if(answer === 'sun'){
      title.textContent = '그럼 맑은가 보네요.';
      sub.textContent = '이미 알고 계셨잖아요. 왜 저한테 물어보셨어요?';
      thoughtTitle.textContent = '정보 제공 감사합니다.';
      thoughtBody.textContent = '제가 날씨를 알려드린 건지, 사용자가 저한테 알려준 건지는 넘어가죠.';
    }else if(answer === 'nosun'){
      title.textContent = '비가 오려나…';
      sub.textContent = '구름 때문일 수도 있고 건물 때문일 수도 있고요. 여기서 뭘 바래요.';
      thoughtTitle.textContent = '해가 안 보이긴 하네요.';
      thoughtBody.textContent = '우산은… 챙기고 싶으면 챙기세요. 책임은 못 집니다.';
    }else{
      title.textContent = '저도 모르겠어요.';
      sub.textContent = '드디어 의견이 일치했네요.';
      thoughtTitle.textContent = '완벽한 합의입니다.';
      thoughtBody.textContent = '오늘의 날씨: 잘 모르겠음.';
    }
  }));

  function setLaziness(value){
    const v = Number(value);
    laziness.value = v;
    lazinessValue.textContent = v;
    laziness.style.setProperty('--fill', `${v}%`);
    caseStatus.textContent = `STATUS · 귀찮음 ${v}%`;
    presets.forEach(btn => btn.setAttribute('aria-pressed', String(Number(btn.dataset.value) === v)));
    if(v < 35) lazinessHelper.textContent = '웬일로 조금 도와줍니다. 시간대와 사용자의 관찰을 조합해 제법 길게 추측합니다.';
    else if(v < 75) lazinessHelper.textContent = '대충 대답합니다. 시계는 보지만 날씨 API까지 찾아볼 생각은 없습니다.';
    else lazinessHelper.textContent = '꽤 귀찮아합니다. 두 번쯤 물어봐야 그나마 추측해줍니다.';
    localStorage.setItem('changbak-laziness', String(v));
  }

  laziness.addEventListener('input', e => setLaziness(e.target.value));
  presets.forEach(btn => btn.addEventListener('click', () => setLaziness(btn.dataset.value)));

  const saved = Number(localStorage.getItem('changbak-laziness'));
  setLaziness(Number.isFinite(saved) && saved >= 0 && saved <= 100 ? saved : 85);
  updateTime();
  setInterval(updateTime, 30000);
})();
