const fireValue=document.getElementById('fireValue');
const fireMeter=document.getElementById('fireMeter');
const fireStatus=document.getElementById('fireStatus');
const addWood=document.getElementById('addWood');
const dayNightToggle=document.getElementById('dayNightToggle');
const skyModeLabel=document.getElementById('skyModeLabel');
const skyStateText=document.getElementById('skyStateText');
const islandScene=document.getElementById('islandScene');
const fireGlow=document.querySelector('.fire-glow');
const survivalMessage=document.getElementById('survivalMessage');
const newPlan=document.getElementById('newPlan');
const toast=document.getElementById('toast');

const plans=[
  '해 떨어지기 전에 장작부터 챙깁니다.',
  '오늘의 목표는 불을 60% 아래로 안 떨어뜨리는 것입니다.',
  '윌슨에게 상황 브리핑을 하고 장작을 다시 모읍니다.',
  '바람 불기 전에 불씨부터 안정시킵니다.',
  '구조 신호보다 먼저 모닥불 상태부터 점검합니다.',
  '불이 살아 있으면 오늘도 아직 희망은 있습니다.'
];

const state={fire:88,isDay:true,manualSky:false,toastTimer:null};

function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function realTimeIsDay(){const h=new Date().getHours();return h>=6&&h<18;}
function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>toast.classList.remove('show'),1700);}
function setRandomPlan(){let next=plans[Math.floor(Math.random()*plans.length)];if(next===survivalMessage.textContent)next=plans[(plans.indexOf(next)+1)%plans.length];survivalMessage.textContent=next;}

function applySky(isDay,{animate=false}={}){
  state.isDay=isDay;
  document.body.classList.toggle('is-day',isDay);
  document.body.classList.toggle('is-night',!isDay);

  // 낮→밤일 때 회전값을 줄여 반시계 방향으로 원호를 그리게 합니다.
  islandScene.style.setProperty('--sun-rotation',isDay?'60deg':'-120deg');
  islandScene.style.setProperty('--moon-rotation',isDay?'140deg':'-40deg');

  skyStateText.textContent=isDay?'낮':'밤';
  skyModeLabel.textContent=`${state.manualSky?'수동':'실시간'} ${isDay?'낮':'밤'}`;
  dayNightToggle.textContent=isDay?'🌙 밤으로 전환':'☀️ 낮으로 전환';
  if(animate)showToast(isDay?'해가 다시 떠올랐습니다.':'해가 지고 초승달이 떠오릅니다.');
}

function renderFire(){
  state.fire=clamp(state.fire,0,100);
  const level=Math.round(state.fire);
  const ratio=level/100;

  // 불 세기가 떨어지면 불꽃 크기, 광량, 불티가 동시에 눈에 띄게 감소합니다.
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

function decayFire(){
  if(state.fire<=0)return;
  const before=state.fire;
  state.fire=clamp(state.fire-6,0,100);
  renderFire();
  if(before>18&&state.fire<=18)showToast('불이 거의 꺼져갑니다. 장작이 필요합니다.');
  if(state.fire===0)showToast('불이 꺼졌습니다. 잔불만 남았습니다.');
}

addWood.addEventListener('click',()=>{
  const wasOut=state.fire<=0;
  state.fire=clamp(state.fire+24,0,100);
  renderFire();
  showToast(wasOut?'불씨가 다시 살아났습니다.':'장작 투입. 불이 확 살아납니다.');
});

dayNightToggle.addEventListener('click',()=>{
  state.manualSky=true;
  applySky(!state.isDay,{animate:true});
});

newPlan.addEventListener('click',()=>{setRandomPlan();showToast('오늘의 생존계획을 다시 정했습니다.');});

applySky(realTimeIsDay());
renderFire();
setRandomPlan();

setInterval(decayFire,1200);
setInterval(()=>{
  if(state.manualSky)return;
  const nowDay=realTimeIsDay();
  if(nowDay!==state.isDay)applySky(nowDay,{animate:true});
},60000);
