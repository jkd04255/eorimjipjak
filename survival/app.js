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

const plans=[
  '해 떨어지기 전에 장작부터 챙깁니다.',
  '비구름이 오기 전에 불 세기부터 채워둡니다.',
  '윌슨 옆에서 마시멜로를 태우지 않을 만큼만 불을 유지합니다.',
  '비가 오면 선풍기로 구름부터 치웁니다.',
  '오늘의 목표는 불을 50% 아래로 오래 두지 않는 것입니다.',
  '야자수 그늘은 좋지만, 지금 더 중요한 건 모닥불입니다.'
];

const state={fire:88,isDay:true,manualSky:false,isRaining:false,canStorm:true,toastTimer:null};

function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function realTimeIsDay(){const h=new Date().getHours();return h>=6&&h<18;}
function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>toast.classList.remove('show'),1700);}
function setRandomPlan(){let next=plans[Math.floor(Math.random()*plans.length)];if(next===survivalMessage.textContent)next=plans[(plans.indexOf(next)+1)%plans.length];survivalMessage.textContent=next;}

function applySky(isDay,{animate=false}={}){
  state.isDay=isDay;
  document.body.classList.toggle('is-day',isDay);
  document.body.classList.toggle('is-night',!isDay);
  islandScene.style.setProperty('--sun-rotation',isDay?'60deg':'-120deg');
  islandScene.style.setProperty('--moon-rotation',isDay?'140deg':'-40deg');
  skyStateText.textContent=isDay?'낮':'밤';
  skyModeLabel.textContent=`${state.manualSky?'수동':'실시간'} ${isDay?'낮':'밤'}`;
  dayNightToggle.textContent=isDay?'🌙 밤으로 전환':'☀️ 낮으로 전환';
  if(animate)showToast(isDay?'해가 다시 떠올랐습니다.':'해가 지고 초승달이 떠오릅니다.');
}

function renderWeather(){
  islandScene.classList.toggle('rainy',state.isRaining);
  weatherStateText.textContent=state.isRaining?'비 오는 중':'맑음';
  weatherBadge.textContent=state.isRaining?'먹구름 + 비':'맑음';
}

function renderFire(){
  state.fire=clamp(state.fire,0,100);
  const level=Math.round(state.fire);
  const ratio=level/100;
  islandScene.style.setProperty('--fire-scale',(ratio*1.17).toFixed(3));
  islandScene.style.setProperty('--glow-scale',(0.18+ratio*1.02).toFixed(3));
  islandScene.style.setProperty('--fire-brightness',(0.35+ratio*0.95).toFixed(3));
  islandScene.style.setProperty('--spark-opacity',ratio.toFixed(3));
  islandScene.style.setProperty('--ember-opacity',(0.10+ratio*0.90).toFixed(3));
  fireGlow.style.opacity=(0.05+ratio*0.82).toFixed(3);
  fireValue.textContent=`${level}%`;
  fireMeter.style.width=`${level}%`;

  if(level>=75){fireStatus.textContent='활활';fireStatus.className='status alive';}
  else if(level>=40){fireStatus.textContent='타닥타닥';fireStatus.className='status alive';}
  else if(level>=15){fireStatus.textContent='약해짐';fireStatus.className='status warning';}
  else if(level>0){fireStatus.textContent='꺼져감';fireStatus.className='status danger';}
  else{fireStatus.textContent='재만 남음';fireStatus.className='status danger';}
}

function startStorm(){
  if(state.isRaining)return;
  state.isRaining=true;
  islandScene.classList.remove('clearing');
  renderWeather();
  showToast('먹구름이 몰려와 비가 내리기 시작했습니다.');
}

function clearStorm(){
  fanButton.classList.add('spinning');
  setTimeout(()=>fanButton.classList.remove('spinning'),1100);

  if(!state.isRaining){showToast('선풍기만 열심히 돌고 있습니다. 먹구름은 없습니다.');return;}

  state.isRaining=false;
  state.canStorm=false;
  islandScene.classList.add('clearing');
  renderWeather();
  showToast('선풍기 바람으로 먹구름을 날려버렸습니다.');

  setTimeout(()=>islandScene.classList.remove('clearing'),1100);
  setTimeout(()=>{state.canStorm=true;},6500);
}

function decayFire(){
  if(state.fire<=0)return;
  const before=state.fire;
  const decay=state.isRaining?12:6;
  state.fire=clamp(state.fire-decay,0,100);
  renderFire();

  if(!state.isRaining&&before>18&&state.fire<=18)showToast('불이 거의 꺼져갑니다. 장작이 필요합니다.');
  if(state.isRaining&&before>24&&state.fire<=24)showToast('비 때문에 불이 더 빠르게 죽고 있습니다.');
  if(state.fire===0)showToast('불이 꺼졌습니다. 잔불만 남았습니다.');
}

function maybeStartStorm(){
  if(!state.canStorm||state.isRaining)return;
  if(Math.random()<0.28)startStorm();
}

addWood.addEventListener('click',()=>{
  const wasOut=state.fire<=0;
  state.fire=clamp(state.fire+24,0,100);
  renderFire();
  showToast(wasOut?'불씨가 다시 살아났습니다.':'장작 투입. 불이 확 살아납니다.');
});

fanButton.addEventListener('click',clearStorm);

dayNightToggle.addEventListener('click',()=>{
  state.manualSky=true;
  applySky(!state.isDay,{animate:true});
});

newPlan.addEventListener('click',()=>{setRandomPlan();showToast('오늘의 생존계획을 다시 정했습니다.');});

applySky(realTimeIsDay());
renderWeather();
renderFire();
setRandomPlan();

setInterval(decayFire,1200);
setInterval(maybeStartStorm,12000);
setInterval(()=>{
  if(state.manualSky)return;
  const nowDay=realTimeIsDay();
  if(nowDay!==state.isDay)applySky(nowDay,{animate:true});
},60000);
