import './style.css';
import {horizonRollTarget} from './camera-motion.js';
import {createWorld} from './world.js';
import {createRace,stepRace,position,formatTime,screenTilt,tiltSteer,clamp,NITRO_MINIMUM} from './physics.js';
import {createPlayweftSoloClient} from './playweft-solo-client.js';
const $=id=>document.getElementById(id);
// Keep long presses on the play surface from opening a browser menu.
$('game').addEventListener('contextmenu',event=>event.preventDefault());
let world;
try{world=createWorld($('track'));}catch(error){$('intro').textContent='无法启动 3D 画面。请使用支持 WebGL 的浏览器，并开启硬件加速后重新打开。';$('start').disabled=true;throw error;}
world.assetsReady.catch(()=>{$('asset-status').hidden=false;$('asset-status').textContent='部分场景未加载，可继续比赛或刷新重试。';});
const platform=createPlayweftSoloClient();
let race=createRace(world.length),phase='ready',beforePause='racing',count=3,keys={},last=performance.now(),accumulator=0,smoothedSteer=0,lap=1,lapNoticeUntil=0;
let gyro=false,sensorPending=false,neutral=null,lastTilt=null,sensorDeadline=0,orientation=screen.orientation?.angle??window.orientation??0;
const motionStatus=text=>$('motion-status').textContent=text;
function setGyro(enabled){gyro=enabled;document.body.classList.toggle('motion-on',enabled);$('motion').setAttribute('aria-pressed',String(enabled));$('motion').textContent=enabled?'关闭重力转向':'启用重力转向';$('calibrate').hidden=!enabled;$('recenter').hidden=!enabled;if(!enabled){neutral=null;smoothedSteer=0;}}
function calibrate(){if(lastTilt===null){motionStatus('等待方向数据，请轻轻倾斜手机后再回正。');return;}neutral=lastTilt;smoothedSteer=0;motionStatus('已回正 · 自动油门');}
$('calibrate').onclick=calibrate;$('recenter').onclick=calibrate;
$('motion').onclick=async()=>{
 if(gyro||sensorPending){sensorPending=false;setGyro(false);motionStatus('已切换为手动驾驶');return;}
 if(!window.isSecureContext||!window.DeviceOrientationEvent){motionStatus('当前设备不支持，请使用触控。');return;}
 $('motion').disabled=true;
 try{
  if(typeof DeviceOrientationEvent.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted'){motionStatus('未获授权，请使用触控。');return;}
  neutral=null;lastTilt=null;sensorPending=true;sensorDeadline=performance.now()+4500;motionStatus('保持握姿，正在校准…');
 }catch{motionStatus('传感器无法启用。请用手机浏览器直接打开，或使用触控。');}finally{$('motion').disabled=false;}
};
window.addEventListener('deviceorientation',event=>{
 if(document.hidden||(!gyro&&!sensorPending))return;const nextOrientation=screen.orientation?.angle??window.orientation??0;
 if(nextOrientation!==orientation){orientation=nextOrientation;neutral=null;smoothedSteer=0;world.resetHorizon();if(phase==='racing'||phase==='countdown')pause();}
 const value=screenTilt(event.beta,event.gamma,orientation);if(value===null)return;
 lastTilt=value;
 if(neutral===null){neutral=value;setGyro(true);sensorPending=false;motionStatus('重力转向已开启 · 自动油门');}
});
const mapping={ArrowUp:'gas',KeyW:'gas',ArrowDown:'brake',KeyS:'brake',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'boost'};
function clearInput(){keys={};document.querySelectorAll('.touch .active').forEach(b=>b.classList.remove('active'));smoothedSteer=0;}
window.addEventListener('keydown',event=>{
 if(event.code==='Escape'&&!event.repeat){event.preventDefault();pause();return;}
 if(!$('overlay').hidden){
   if(event.key==='Tab'){
     const controls=[...$('overlay').querySelectorAll('button:not(:disabled),summary,a[href]')].filter(el=>el.getClientRects().length>0);
     const first=controls[0],lastControl=controls.at(-1);
     if(event.shiftKey&&(document.activeElement===first||!$('overlay').contains(document.activeElement))){event.preventDefault();lastControl?.focus();}
     else if(!event.shiftKey&&(document.activeElement===lastControl||!$('overlay').contains(document.activeElement))){event.preventDefault();first?.focus();}
   }
   return;
 }
 if(event.target instanceof HTMLButtonElement&&(event.code==='Space'||event.code==='Enter'))return;
 if(mapping[event.code]){event.preventDefault();keys[mapping[event.code]]=true;}
});
window.addEventListener('keyup',event=>{if(mapping[event.code]){event.preventDefault();keys[mapping[event.code]]=false;}});
for(const button of document.querySelectorAll('[data-key]')){
 const release=event=>{event.preventDefault();keys[button.dataset.key]=false;button.classList.remove('active');};
 button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys[button.dataset.key]=true;button.classList.add('active');});
 button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
function setPhase(value){
 phase=value;document.body.dataset.phase=value;
 const driving=value==='racing'||value==='countdown';
 $('race-ui').inert=!driving;
 $('overlay').hidden=driving;
 $('results').hidden=value!=='finished';
 $('intro').hidden=value==='paused'||value==='finished';
}
function showOverlay(title,description,button){
 $('overlay').hidden=false;$('menu-title').textContent=title;$('intro').textContent=description;
 $('start').innerHTML=button+' <span aria-hidden="true">↗</span>';
 $('instructions').open=false;
 $('start').focus({preventScroll:true});
}
function start(){
 if(gyro&&(lastTilt===null||neutral===null)){motionStatus('等待重新校准，请轻轻倾斜手机，或关闭重力转向使用触控。');return;}
 clearInput();if(phase==='paused'){setPhase(beforePause);$('start').blur();last=performance.now();return;}
 race=createRace(world.length);lap=1;lapNoticeUntil=0;setPhase('countdown');count=3;accumulator=0;$('overlay').hidden=true;$('pause').disabled=false;$('instructions').open=false;$('notice').textContent='';$('start').blur();
}
function pause(){if(phase==='racing'||phase==='countdown'){beforePause=phase;setPhase('paused');clearInput();$('countdown').textContent='';showOverlay('已暂停','','继续比赛');}else if(phase==='paused')start();}
$('start').onclick=start;$('pause').onclick=pause;
function suspendMotion(){
 clearInput();
 if(gyro){lastTilt=null;neutral=null;world.resetHorizon();motionStatus('返回后将重新校准。');}
 if(phase==='racing'||phase==='countdown')pause();
}
window.addEventListener('blur',suspendMotion);
window.addEventListener('focus',()=>{if(sensorPending)sensorDeadline=performance.now()+4500;});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden)suspendMotion();
 else{if(gyro){lastTilt=null;neutral=null;motionStatus('保持握姿，等待重新校准。');}if(sensorPending)sensorDeadline=performance.now()+4500;}
});
$('track').addEventListener('webglcontextlost',event=>{event.preventDefault();clearInput();setPhase('error');showOverlay('画面已中断','请重新加载页面。','重新加载');$('start').textContent='重新加载';$('start').onclick=()=>location.reload();});
function finish(){
 setPhase('finished');$('pause').disabled=true;$('countdown').textContent='';
 const place=position(race);$('result-position').textContent=`${place} / 6`;$('result-time').textContent=formatTime(race.time);
 showOverlay(place===1?'冠军！':'比赛完成','','再跑一场');
}
function updateHUD(){
 const currentLap=Math.max(1,Math.min(3,Math.floor(race.distance/race.length)+1));
 if(currentLap>lap&&!race.finished){lap=currentLap;lapNoticeUntil=race.time+2;}
 const corner=world.upcoming(race.distance);
 const active=phase==='racing';
 const notice=!active?'':race.collision>.4?'发生碰撞':Math.abs(race.lateral)>7.5?'驶回路面':race.time<lapNoticeUntil?(lap===3?'最后一圈':'第 2 圈'):'';
 if($('notice').textContent!==notice)$('notice').textContent=notice;
 $('corner-hint').hidden=!active||!!notice||corner.ahead>150;
 const braking=race.speed>world.targetSpeed(race.distance)+3;
 $('corner-hint').textContent=`${corner.name} · ${Math.ceil(corner.ahead/10)*10} m${braking?' · 刹车':''}`;
 $('corner-hint').classList.toggle('braking',braking);
 $('position').textContent=position(race);$('lap').textContent=currentLap;$('time').textContent=formatTime(race.time);
 $('speed').textContent=(race.forwardSpeed<-.5?'−':'')+Math.round(race.speed*3.6);
 $('nitro').style.width=race.nitro+'%';
 const low=race.nitro<NITRO_MINIMUM&&!race.boosting;
 document.querySelector('.nitro').classList.toggle('low',low);
 document.querySelector('[data-key=boost]').classList.toggle('unavailable',low);
 $('nitro-label').textContent=race.boosting?'加速中':race.nitroRemaining>0?'释放中':low?'蓄能中':'氮气';
 document.querySelector('.nitro-meter').setAttribute('aria-valuenow',Math.round(race.nitro));
}
function tick(now){const dt=clamp((now-last)/1000,0,.05);last=now;
 if(sensorPending&&!document.hidden&&now>sensorDeadline){sensorPending=false;setGyro(false);motionStatus('未收到传感器数据。请在手机浏览器直接打开，或使用触控。');}
 if(phase==='countdown'){count-=dt;$('countdown').textContent=count>0?Math.ceil(count):'GO';if(count<=-.6){setPhase('racing');$('countdown').textContent='';}}
 const tilt=gyro&&lastTilt!==null&&neutral!==null?tiltSteer(lastTilt,neutral):0;
 const desired=keys.left?-1:keys.right?1:tilt;smoothedSteer+=(desired-smoothedSteer)*(1-Math.exp(-dt*10));
 if(phase==='racing'){accumulator+=dt;while(accumulator>=1/120){stepRace(race,{steer:smoothedSteer,motion:gyro,gas:keys.gas||gyro,brake:keys.brake,boost:keys.boost},1/120,world.curvature(race.distance),world);accumulator-=1/120;if(race.finished){finish();break;}}}
 updateHUD();world.draw(race,dt,phase==='ready'||phase==='finished',smoothedSteer,horizonRollTarget(lastTilt,neutral,gyro&&(phase==='racing'||phase==='countdown')));requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.addEventListener('pagehide',()=>platform.destroy(),{once:true});
