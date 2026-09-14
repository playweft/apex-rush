import './style.css';
import {horizonRollTarget} from './camera-motion.js';
import {createWorld} from './world.js';
import {createRace,stepRace,position,formatTime,screenTilt,tiltSteer,clamp} from './physics.js';
import {createPlayweftSoloClient} from './playweft-solo-client.js';
const $=id=>document.getElementById(id);
// Keep long presses on the play surface from opening a browser menu.
$('game').addEventListener('contextmenu',event=>event.preventDefault());
let world;
try{world=createWorld($('track'));}catch(error){$('intro').textContent='无法启动 3D 画面。请使用支持 WebGL 的浏览器，并开启硬件加速后重新打开。';$('start').disabled=true;throw error;}
world.assetsReady.catch(()=>{$('notice').textContent='部分场景素材加载失败，可继续比赛或刷新重试。';});
const platform=createPlayweftSoloClient();
let race=createRace(world.length),phase='ready',beforePause='racing',count=3,keys={},last=performance.now(),accumulator=0,smoothedSteer=0,lap=1;
let gyro=false,sensorPending=false,neutral=null,lastTilt=null,lastSensor=0,sensorDeadline=0,orientation=screen.orientation?.angle??window.orientation??0;
const motionStatus=text=>$('motion-status').textContent=text;
function setGyro(enabled){gyro=enabled;$('motion').textContent=enabled?'关闭重力转向':'启用重力转向';$('calibrate').hidden=!enabled;$('recenter').hidden=!enabled;if(!enabled){neutral=null;smoothedSteer=0;}}
function calibrate(){neutral=lastTilt;smoothedSteer=0;motionStatus('已回正 · 左右倾斜转向 · 自动油门');}
$('calibrate').onclick=calibrate;$('recenter').onclick=calibrate;
$('motion').onclick=async()=>{
 if(gyro||sensorPending){sensorPending=false;setGyro(false);motionStatus('已切换为触控 / 键盘驾驶');return;}
 if(!window.isSecureContext||!window.DeviceOrientationEvent){motionStatus('此环境不支持重力转向，请使用下方触控按钮。');return;}
 $('motion').disabled=true;
 try{
  if(typeof DeviceOrientationEvent.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted'){motionStatus('未获得传感器权限，可继续使用触控按钮。');return;}
  neutral=null;lastTilt=null;sensorPending=true;sensorDeadline=performance.now()+4500;motionStatus('保持手机舒适握姿，正在校准…');
 }catch{motionStatus('传感器无法启用。请用手机浏览器直接打开，或使用触控。');}finally{$('motion').disabled=false;}
};
window.addEventListener('deviceorientation',event=>{
 if(!gyro&&!sensorPending)return;const nextOrientation=screen.orientation?.angle??window.orientation??0;
 if(nextOrientation!==orientation){orientation=nextOrientation;neutral=null;smoothedSteer=0;world.resetHorizon();if(phase==='racing'||phase==='countdown')pause();}
 const value=screenTilt(event.beta,event.gamma,orientation);if(value===null)return;
 lastTilt=value;lastSensor=performance.now();
 if(neutral===null){neutral=value;setGyro(true);sensorPending=false;motionStatus('重力转向已开启 · 自动油门 · 可随时回正');}
});
const mapping={ArrowUp:'gas',KeyW:'gas',ArrowDown:'brake',KeyS:'brake',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'boost'};
function clearInput(){keys={};document.querySelectorAll('.touch .active').forEach(b=>b.classList.remove('active'));smoothedSteer=0;}
window.addEventListener('keydown',event=>{if(event.target instanceof HTMLButtonElement&&(event.code==='Space'||event.code==='Enter'))return;if(mapping[event.code]){event.preventDefault();keys[mapping[event.code]]=true;}if(event.code==='Escape'&&!event.repeat)pause();});
window.addEventListener('keyup',event=>{if(mapping[event.code]){event.preventDefault();keys[mapping[event.code]]=false;}});
for(const button of document.querySelectorAll('[data-key]')){
 const release=event=>{event.preventDefault();keys[button.dataset.key]=false;button.classList.remove('active');};
 button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys[button.dataset.key]=true;button.classList.add('active');});
 button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
function showOverlay(title,description,button){$('overlay').hidden=false;document.querySelector('h1').innerHTML=title;$('intro').textContent=description;$('start').innerHTML=button+' <span>↗</span>';}
function start(){
 clearInput();if(phase==='paused'){phase=beforePause;$('overlay').hidden=true;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','暂停游戏');last=performance.now();return;}
 race=createRace(world.length);lap=1;phase='countdown';count=3;accumulator=0;$('overlay').hidden=true;$('pause').disabled=false;document.body.classList.add('racing');$('notice').textContent='';$('start').blur();
}
function pause(){if(phase==='racing'||phase==='countdown'){beforePause=phase;phase='paused';clearInput();$('countdown').textContent='';showOverlay('歇一口气。<br><span>赛道等你回来。</span>','比赛已暂停。重力模式下可先把手机放稳，再点击回正校准。','继续比赛');$('pause').textContent='▶';$('pause').setAttribute('aria-label','继续比赛');}else if(phase==='paused')start();}
$('start').onclick=start;$('pause').onclick=pause;
window.addEventListener('blur',()=>{clearInput();if(phase==='racing'||phase==='countdown')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(phase==='racing'||phase==='countdown'))pause();});
$('track').addEventListener('webglcontextlost',event=>{event.preventDefault();pause();$('intro').textContent='3D 画面暂时中断，请重新加载页面。';$('start').textContent='重新加载';$('start').onclick=()=>location.reload();});
function finish(){phase='finished';$('pause').disabled=true;$('countdown').textContent='';const place=position(race);showOverlay(place===1?'漂亮的冠军。<br><span>再快一点？</span>':`第 ${place} 名冲线。<br><span>下次，抢占先机。</span>`,`完赛用时 ${formatTime(race.time)}。${place===1?'你击败了全部五位对手。':'弯前减速，保持在路面上，利用氮气完成超越。'}`,'再跑一场');}
function updateHUD(){const currentLap=Math.min(3,Math.floor(race.distance/race.length)+1);if(currentLap>lap&&!race.finished){lap=currentLap;$('notice').textContent=lap===3?'最后一圈！':'第 2 圈 · 保持节奏';setTimeout(()=>{if(!race.finished)$('notice').textContent='';},2000);}
 const corner=world.upcoming(race.distance);
 $('corner-hint').hidden=phase!=='racing'||corner.ahead>150;
 $('corner-hint').textContent=`${corner.name} · ${Math.ceil(corner.ahead/10)*10} m${race.speed>world.targetSpeed(race.distance)+3?' · 提前刹车':''}`;
 $('position').textContent=position(race);$('lap').textContent=currentLap;$('time').textContent=formatTime(race.time);$('speed').textContent=String(Math.round(race.speed*3.6)).padStart(3,'0');$('nitro').style.width=race.nitro+'%';$('progress').style.width=(race.distance/race.length/3*100)+'%';
 if(phase==='racing'&&Math.abs(race.lateral)>7.5)$('notice').textContent='驶回路面 · 路肩会降低速度';else if($('notice').textContent.startsWith('驶回'))$('notice').textContent='';
}
function tick(now){const dt=clamp((now-last)/1000,0,.05);last=now;
 if(sensorPending&&now>sensorDeadline){sensorPending=false;setGyro(false);motionStatus('未收到传感器数据。请在手机浏览器直接打开，或使用触控。');}
 if(gyro&&now-lastSensor>2500){setGyro(false);motionStatus('传感器已断开，已切换为触控驾驶。');if(phase==='racing')pause();}
 if(phase==='countdown'){count-=dt;$('countdown').textContent=count>0?Math.ceil(count):'GO';if(count<=-.6){phase='racing';$('countdown').textContent='';}}
 const tilt=gyro&&lastTilt!==null?tiltSteer(lastTilt,neutral):0;
 const desired=keys.left?-1:keys.right?1:tilt;smoothedSteer+=(desired-smoothedSteer)*(1-Math.exp(-dt*10));
 if(phase==='racing'){accumulator+=dt;while(accumulator>=1/120){stepRace(race,{steer:smoothedSteer,gas:keys.gas||gyro,brake:keys.brake,boost:keys.boost},1/120,world.curvature(race.distance),world);accumulator-=1/120;if(race.finished){finish();break;}}}
 updateHUD();world.draw(race,dt,phase==='ready'||phase==='finished',smoothedSteer,horizonRollTarget(lastTilt,neutral,gyro&&(phase==='racing'||phase==='countdown')));requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.addEventListener('pagehide',()=>platform.destroy(),{once:true});
