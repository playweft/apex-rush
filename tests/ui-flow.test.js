import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as physics from '../src/physics.js';
import {horizonRollTarget} from '../src/camera-motion.js';

// Execute the real UI controller against a small DOM adapter, without WebGL.
function harness(){
 const html=fs.readFileSync('index.html','utf8');
 let document;
 class Element{
  constructor(){this.textContent='';this.innerHTML='';this.hidden=false;this.disabled=false;this.style={};this.dataset={};this.attrs={};this.events={};this.classes=new Set();this.classList={toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name),remove:name=>this.classes.delete(name)};}
  addEventListener(name,fn){this.events[name]=fn;}
  setAttribute(name,value){this.attrs[name]=value;}
  focus(){document.activeElement=this;}
  blur(){document.activeElement=null;}
 }
 const nodes=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 const buttons=['left','right','gas','brake','boost'].map(key=>{const b=new Element();b.dataset.key=key;return b;});
 const extra={'.nitro':new Element(),'.nitro-meter':new Element(),'[data-key=boost]':buttons[4]};
 document={body:new Element(),hidden:false,activeElement:null,events:{},getElementById:id=>{assert.ok(nodes[id],`missing DOM node: ${id}`);return nodes[id];},querySelector:selector=>{assert.ok(extra[selector],selector);return extra[selector];},querySelectorAll:selector=>selector==='[data-key]'?buttons:[],addEventListener(name,fn){this.events[name]=fn;}};
 const window={events:{},addEventListener(name,fn){this.events[name]=fn;},isSecureContext:true};
 const context=vm.createContext({...physics,horizonRollTarget,document,window,screen:{orientation:{angle:0}},performance:{now:()=>0},HTMLButtonElement:Element,requestAnimationFrame(){},location:{reload(){}},createWorld:()=>({length:2600,assetsReady:Promise.resolve(),resetHorizon(){},draw(){},curvature:()=>0,upcoming:()=>({name:'发卡弯',ahead:100}),targetSpeed:()=>30}),createPlayweftSoloClient:()=>({destroy(){}})});
 vm.runInContext(fs.readFileSync('src/main.js','utf8').replace(/^import .*;$/gm,''),context);
 return {nodes,document,run:code=>vm.runInContext(code,context)};
}

test('race, pause, resume and finish show only the relevant controls',()=>{
 const h=harness();h.run('start()');assert.equal(h.document.body.dataset.phase,'countdown');assert.equal(h.nodes.overlay.hidden,true);assert.equal(h.nodes['race-ui'].inert,false);
 h.run('pause()');assert.equal(h.document.body.dataset.phase,'paused');assert.equal(h.nodes.overlay.hidden,false);assert.equal(h.nodes['race-ui'].inert,true);assert.equal(h.nodes.intro.hidden,true);assert.equal(h.nodes['menu-title'].textContent,'已暂停');assert.equal(h.document.activeElement,h.nodes.start);
 h.run('start()');assert.equal(h.nodes.overlay.hidden,true);
 h.run('race.time=82.5; finish()');assert.equal(h.document.body.dataset.phase,'finished');assert.equal(h.nodes.results.hidden,false);assert.equal(h.nodes['result-time'].textContent,'01:22.50');
 h.run('start()');assert.equal(h.nodes.results.hidden,true);assert.equal(h.document.body.dataset.phase,'countdown');
});

test('important race notices replace corner advice instead of overlapping it',()=>{
 const h=harness();h.run("setPhase('racing');race.lateral=9;updateHUD()");assert.equal(h.nodes.notice.textContent,'驶回路面');assert.equal(h.nodes['corner-hint'].hidden,true);
 h.run('race.lateral=0;updateHUD()');assert.equal(h.nodes.notice.textContent,'');assert.equal(h.nodes['corner-hint'].hidden,false);
});

test('motion mode updates control presentation and accessible toggle state',()=>{
 const h=harness();h.run('setGyro(true)');assert.ok(h.document.body.classes.has('motion-on'));assert.equal(h.nodes.motion.attrs['aria-pressed'],'true');
 h.run('setGyro(false)');assert.equal(h.document.body.classes.has('motion-on'),false);assert.equal(h.nodes.recenter.hidden,true);
});

test('menu keyboard input cannot accidentally hold the throttle',()=>{
 const h=harness();h.nodes.overlay.hidden=false;
 h.run("window.events.keydown({code:'ArrowUp',target:{},preventDefault(){}})");assert.equal(h.run('!!keys.gas'),false);
});
