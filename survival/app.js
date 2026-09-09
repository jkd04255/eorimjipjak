const fireValue = document.getElementById('fireValue');
const fireMeter = document.getElementById('fireMeter');
const fireStatus = document.getElementById('fireStatus');
const fireScene = document.getElementById('fireScene');
const addWood = document.getElementById('addWood');
const waterStatus = document.getElementById('waterStatus');
const dirtyValue = document.getElementById('dirtyValue');
const cleanValue = document.getElementById('cleanValue');
const dirtyWater = document.getElementById('dirtyWater');
const cleanWater = document.getElementById('cleanWater');
const purifierScene = document.getElementById('purifierScene');
const filterWater = document.getElementById('filterWater');
const toast = document.getElementById('toast');
const survivalMessage = document.getElementById('survivalMessage');
const newPlan = document.getElementById('newPlan');
const dayCount = document.getElementById('dayCount');

let fire = 78;
let dirty = 1.5;
let clean = 0.4;
let purifying = false;
let day = 1;

const plans = [
  '불을 지키고 물을 모읍니다.',
  '그늘을 만들고 구조 신호를 준비합니다.',
  '쓸 만한 나뭇가지를 모읍니다.',
  '오늘도 코코넛은 과신하지 않습니다.',
  '해 질 무렵 연기 신호를 준비합니다.',
  '체력을 아끼고 물부터 확보합니다.'
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function renderFire() {
  fire = clamp(fire, 0, 100);
  fireValue.textContent = `${Math.round(fire)}%`;
  fireMeter.style.width = `${fire}%`;
  fireScene.classList.toggle('fire-low', fire > 0 && fire < 35);
  fireScene.classList.toggle('fire-dead', fire <= 0);

  if (fire <= 0) {
    fireStatus.textContent = '꺼짐';
    fireStatus.classList.remove('alive');
  } else if (fire < 35) {
    fireStatus.textContent = '위태위태';
    fireStatus.classList.remove('alive');
  } else if (fire > 85) {
    fireStatus.textContent = '활활';
    fireStatus.classList.add('alive');
  } else {
    fireStatus.textContent = '타닥타닥';
    fireStatus.classList.add('alive');
  }
}

function renderWater() {
  dirtyValue.textContent = `${dirty.toFixed(1)} L`;
  cleanValue.textContent = `${clean.toFixed(1)} L`;
  dirtyWater.style.height = `${clamp((dirty / 1.5) * 62, 0, 62)}%`;
  cleanWater.style.height = `${clamp((clean / 2.0) * 88, 8, 88)}%`;
}

addWood.addEventListener('click', () => {
  const before = fire;
  fire = clamp(fire + 22, 0, 100);
  renderFire();
  showToast(before >= 98 ? '이미 충분히 뜨겁습니다.' : '장작 투입. 불이 다시 살아납니다.');
});

filterWater.addEventListener('click', () => {
  if (purifying) return;
  if (dirty < 0.5) {
    showToast('정수할 물이 부족합니다.');
    return;
  }

  purifying = true;
  filterWater.disabled = true;
  purifierScene.classList.add('purifying');
  waterStatus.textContent = '정수 중…';
  waterStatus.classList.add('alive');

  setTimeout(() => {
    dirty = clamp(dirty - 0.5, 0, 9.9);
    clean = clamp(clean + 0.45, 0, 9.9);
    renderWater();
    purifierScene.classList.remove('purifying');
    waterStatus.textContent = '완료';
    filterWater.disabled = false;
    purifying = false;
    showToast('0.45L 확보. 약간의 손실은 생존의 맛입니다.');

    setTimeout(() => {
      if (!purifying) {
        waterStatus.textContent = '대기 중';
        waterStatus.classList.remove('alive');
      }
    }, 1300);
  }, 1800);
});

newPlan.addEventListener('click', () => {
  let next = plans[Math.floor(Math.random() * plans.length)];
  if (next === survivalMessage.textContent) {
    next = plans[(plans.indexOf(next) + 1) % plans.length];
  }
  survivalMessage.textContent = next;
  showToast('생존계획을 다시 세웠습니다.');
});

setInterval(() => {
  fire -= fire > 0 ? 1 : 0;
  renderFire();
}, 8000);

setInterval(() => {
  day += 1;
  dayCount.textContent = day;
}, 120000);

renderFire();
renderWater();
