const fireValue=document.getElementById('fireValue');
const fireMeter=document.getElementById('fireMeter');
const fireStatus=document.getElementById('fireStatus');
const addWood=document.getElementById('addWood');
const dayNightToggle=document.getElementById('dayNightToggle');
const skyModeLabel=document.getElementById('skyModeLabel');
const skyStateText=document.getElementById('skyStateText');
const weatherStateText=document.getElementById('weatherStateText');
const weatherBadge=document.getElementById('weatherBadge');
const islandScene=document.getElementById('islandScene');
const fireGlow=document.querySelector('.fire-glow');
const survivalMessage=document.getElementById('survivalMessage');
const newPlan=document.getElementById('newPlan');
const toast=document.getElementById('toast');
const fanButton=document.getElementById('fanButton');

const fireDecayRange=document.getElementById('fireDecayRange');
const fireDecayValue=document.getElementById('fireDecayValue');
const fireDecayCaption=document.getElementById('fireDecayCaption');
const rainIntensityRange=document.getElementById('rainIntensityRange');
const rainIntensityValue=document.getElementById('rainIntensityValue');
const rainIntensityCaption=document.getElementById('rainIntensityCaption');

const plans=[
  '해 떨어지기 전에 장작부터 챙깁니다.',
  '비구름이 오기 전에 불 세기부터 채워둡니다.',
  '윌슨 옆에서 마시멜로를 태우지 않을 만큼만 불을 유지합니다.',
  '비가 오면 선풍기로 구름부터 치웁니다.',
  '오늘의 목표는 불을 50% 아래로 오래 두지 않는 것입니다.',
  '야자수 그늘은 좋지만, 지금 더 중요한 건 모닥불입니다.'
];

function readStoredNumber(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    if(raw===null)return fallback;
    const value=Number(raw);
    return Number.isFinite(value)?value:fallback;
  }catch(_){return fallback;}
}

function saveSetting(key,value){
  try{localStorage.setItem(key,String(value));}catch(_){}
}

const state={
  fire:88,
  isDay:true,
  manualSky:false,
  isRaining:false,
  canStorm:true,
  toastTimer:null,
  fireDecay:readStoredNumber('island-fire-decay',55),
  rainIntensity:readStoredNumber('island-rain-intensity',55)
};

function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function realTimeIsDay(){const h=new Date().getHours();return h>=6&&h<18;}
function showToast(message){if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>toast.classList.remove('show'),1700);}
function setRandomPlan(){if(!survivalMessage)return;let next=plans[Math.floor(Math.random()*plans.length)];if(next===survivalMessage.textContent)next=plans[(plans.indexOf(next)+1)%plans.length];survivalMessage.textContent=next;}

function installFeedbackBar(){
  const footer=document.querySelector('.shell > footer');
  if(!footer||document.querySelector('.feedback-bar'))return;

  const bar=document.createElement('div');
  bar.className='feedback-bar';
  bar.innerHTML='<a class="feedback-link" href="mailto:jkd04255@khu.ac.kr?subject=%5B%EA%B0%9C%EB%98%A5%EB%8F%84%20%EC%93%B8%EB%AA%A8%EB%8A%94%20%EC%9E%88%EA%B2%A0%EC%A7%80%5D%20%EB%AC%B8%EC%9D%98%20%C2%B7%20%EC%98%A4%EB%A5%98%20%EC%A0%9C%EB%B3%B4">✉ 문의 · 오류 제보</a>';
  footer.insertAdjacentElement('afterend',bar);

  const style=document.createElement('style');
  style.textContent=`
    .feedback-bar{min-height:52px;display:flex;align-items:center;justify-content:center;border-top:1px solid var(--line);color:var(--muted);font-size:12px}
    .feedback-link{font-weight:650;color:inherit;text-decoration:none;transition:color .15s ease}
    .feedback-link:hover{color:var(--purple);text-decoration:underline}
    .feedback-link:focus-visible{outline:3px solid var(--purple);outline-offset:3px;border-radius:4px}
  `;
  document.head.appendChild(style);
}

function applySky(isDay,{animate=false}={}){
  state.isDay=isDay;
  document.body.classList.toggle('is-day',isDay);
  document.body.classList.toggle('is-night',!isDay);
  if(islandScene){
    islandScene.style.setProperty('--sun-rotation',isDay?'60deg':'-120deg');
    islandScene.style.setProperty('--moon-rotation',isDay?'140deg':'-40deg');
  }
  if(skyStateText)skyStateText.textContent=isDay?'낮':'밤';
  if(skyModeLabel)skyModeLabel.textContent=`${state.manualSky?'수동':'실시간'} ${isDay?'낮':'밤'}`;
  if(dayNightToggle)dayNightToggle.textContent=isDay?'🌙 밤으로 전환':'☀️ 낮으로 전환';
  if(animate)showToast(isDay?'해가 다시 떠올랐습니다.':'해가 지고 초승달이 떠오릅니다.');
}

function fireDecayLabel(value){
  if(value<=15)return '거의 안 꺼짐';
  if(value<=35)return '느긋함';
  if(value<=65)return '보통';
  if(value<=85)return '빠르게 약해짐';
  return '눈 깜빡하면 재';
}

function rainIntensityLabel(value){
  if(value<=15)return '안개비';
  if(value<=35)return '보슬비';
  if(value<=65)return '제법 내림';
  if(value<=85)return '굵은 빗줄기';
  return '앞이 안 보임';
}

function syncPresetButtons(selector,value,attribute){
  document.querySelectorAll(selector).forEach(button=>{
    button.setAttribute('aria-pressed',Number(button.dataset[attribute])===value?'true':'false');
  });
}

function applyTuning({persist=false}={}){
  state.fireDecay=clamp(Math.round(state.fireDecay/5)*5,0,100);
  state.rainIntensity=clamp(Math.round(state.rainIntensity/5)*5,0,100);

  if(fireDecayRange){
    fireDecayRange.value=state.fireDecay;
    fireDecayRange.style.setProperty('--fill',`${state.fireDecay}%`);
  }
  if(fireDecayValue)fireDecayValue.textContent=state.fireDecay;
  if(fireDecayCaption)fireDecayCaption.textContent=fireDecayLabel(state.fireDecay);

  if(rainIntensityRange){
    rainIntensityRange.value=state.rainIntensity;
    rainIntensityRange.style.setProperty('--fill',`${state.rainIntensity}%`);
  }
  if(rainIntensityValue)rainIntensityValue.textContent=state.rainIntensity;
  if(rainIntensityCaption)rainIntensityCaption.textContent=rainIntensityLabel(state.rainIntensity);

  syncPresetButtons('[data-fire-decay]',state.fireDecay,'fireDecay');
  syncPresetButtons('[data-rain-intensity]',state.rainIntensity,'rainIntensity');

  if(islandScene){
    const rainRatio=state.rainIntensity/100;
    const opacity=(0.10+rainRatio*0.78).toFixed(2);
    const speed=(0.84-rainRatio*0.48).toFixed(2);
    const spacing=Math.round(39-rainRatio*17);
    const spacing2=Math.round(58-rainRatio*22);
    islandScene.style.setProperty('--rain-opacity',opacity);
    islandScene.style.setProperty('--rain-speed',`${speed}s`);
    islandScene.style.setProperty('--rain-spacing',`${spacing}px`);
    islandScene.style.setProperty('--rain-spacing-2',`${spacing2}px`);
  }

  if(persist){
    saveSetting('island-fire-decay',state.fireDecay);
    saveSetting('island-rain-intensity',state.rainIntensity);
  }
  renderWeather();
}

function renderWeather(){
  if(islandScene)islandScene.classList.toggle('rainy',state.isRaining);
  const rainText=state.isRaining?`비 오는 중 · ${state.rainIntensity}%`:'맑음';
  if(weatherStateText)weatherStateText.textContent=rainText;
  if(weatherBadge)weatherBadge.textContent=state.isRaining?`먹구름 + 비 ${state.rainIntensity}%`:'맑음';
}

function renderFire(){
  state.fire=clamp(state.fire,0,100);
  const level=Math.round(state.fire);
  const ratio=level/100;
  if(islandScene){
    islandScene.style.setProperty('--fire-scale',(ratio*1.17).toFixed(3));
    islandScene.style.setProperty('--glow-scale',(0.18+ratio*1.02).toFixed(3));
    islandScene.style.setProperty('--fire-brightness',(0.35+ratio*0.95).toFixed(3));
    islandScene.style.setProperty('--spark-opacity',ratio.toFixed(3));
    islandScene.style.setProperty('--ember-opacity',(0.10+ratio*0.90).toFixed(3));
  }
  if(fireGlow)fireGlow.style.opacity=(0.05+ratio*0.82).toFixed(3);
  if(fireValue)fireValue.textContent=`${level}%`;
  if(fireMeter)fireMeter.style.width=`${level}%`;

  if(!fireStatus)return;
  if(level>=75){fireStatus.textContent='활활';fireStatus.className='status alive';}
  else if(level>=40){fireStatus.textContent='타닥타닥';fireStatus.className='status alive';}
  else if(level>=15){fireStatus.textContent='약해짐';fireStatus.className='status warning';}
  else if(level>0){fireStatus.textContent='꺼져감';fireStatus.className='status danger';}
  else{fireStatus.textContent='재만 남음';fireStatus.className='status danger';}
}

function startStorm(){
  if(state.isRaining)return;
  state.isRaining=true;
  if(islandScene)islandScene.classList.remove('clearing');
  renderWeather();
  showToast(`먹구름이 몰려왔습니다. 비 세기 ${state.rainIntensity}%.`);
}

function clearStorm(){
  if(fanButton){
    fanButton.classList.add('spinning');
    setTimeout(()=>fanButton.classList.remove('spinning'),1100);
  }

  if(!state.isRaining){showToast('선풍기만 열심히 돌고 있습니다. 먹구름은 없습니다.');return;}

  state.isRaining=false;
  state.canStorm=false;
  if(islandScene)islandScene.classList.add('clearing');
  renderWeather();
  showToast('선풍기 바람으로 먹구름과 빗줄기를 함께 날려버렸습니다.');

  setTimeout(()=>{if(islandScene)islandScene.classList.remove('clearing');},1100);
  setTimeout(()=>{state.canStorm=true;},6500);
}

function decayFire(){
  if(state.fire<=0)return;
  const before=state.fire;

  // 0%에서도 완전히 멈추지 않도록 아주 작은 자연 감소를 남깁니다.
  const baseDecay=0.35+(state.fireDecay/100)*7.0;
  const rainMultiplier=state.isRaining?(1.25+(state.rainIntensity/100)*1.35):1;
  const decay=baseDecay*rainMultiplier;

  state.fire=clamp(state.fire-decay,0,100);
  renderFire();

  if(!state.isRaining&&before>18&&state.fire<=18)showToast('불이 거의 꺼져갑니다. 장작이 필요합니다.');
  if(state.isRaining&&before>24&&state.fire<=24)showToast('젖은 불씨가 빠르게 약해지고 있습니다.');
  if(state.fire===0)showToast('불이 꺼졌습니다. 잔불만 남았습니다.');
}

function maybeStartStorm(){
  if(!state.canStorm||state.isRaining)return;
  if(Math.random()<0.28)startStorm();
}

if(addWood)addWood.addEventListener('click',()=>{
  const wasOut=state.fire<=0;
  state.fire=clamp(state.fire+24,0,100);
  renderFire();
  showToast(wasOut?'불씨가 다시 살아났습니다.':'장작 투입. 불이 확 살아납니다.');
});

if(fanButton)fanButton.addEventListener('click',clearStorm);

if(dayNightToggle)dayNightToggle.addEventListener('click',()=>{
  state.manualSky=true;
  applySky(!state.isDay,{animate:true});
});

if(newPlan)newPlan.addEventListener('click',()=>{setRandomPlan();showToast('오늘의 생존계획을 다시 정했습니다.');});

if(fireDecayRange)fireDecayRange.addEventListener('input',event=>{
  state.fireDecay=Number(event.target.value);
  applyTuning({persist:true});
});

if(rainIntensityRange)rainIntensityRange.addEventListener('input',event=>{
  state.rainIntensity=Number(event.target.value);
  applyTuning({persist:true});
});

document.querySelectorAll('[data-fire-decay]').forEach(button=>button.addEventListener('click',()=>{
  state.fireDecay=Number(button.dataset.fireDecay);
  applyTuning({persist:true});
  showToast(`불 사그라듦을 ${state.fireDecay}%로 바꿨습니다.`);
}));

document.querySelectorAll('[data-rain-intensity]').forEach(button=>button.addEventListener('click',()=>{
  state.rainIntensity=Number(button.dataset.rainIntensity);
  applyTuning({persist:true});
  showToast(`비 세기를 ${state.rainIntensity}%로 바꿨습니다.`);
}));

applySky(realTimeIsDay());
applyTuning();
renderWeather();
renderFire();
setRandomPlan();
installFeedbackBar();

setInterval(decayFire,1200);
setInterval(maybeStartStorm,12000);
setInterval(()=>{
  if(state.manualSky)return;
  const nowDay=realTimeIsDay();
  if(nowDay!==state.isDay)applySky(nowDay,{animate:true});
},60000);

// 첫 폭풍은 페이지에 들어온 뒤 6~12초 사이에 한 번은 반드시 찾아옵니다.
const guaranteedFirstStormMs=6000+Math.floor(Math.random()*6001);
setTimeout(()=>{if(!state.isRaining)startStorm();},guaranteedFirstStormMs);