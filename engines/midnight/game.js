import * as T from '../../vendor/three.module.js';
import {createWorld} from './world.js';
import {animateExplorer} from './actors.js';
import {createSound} from './audio.js';
import {midnightOpening as adventure} from '../../towers/tower-0001.js';
import {getProblem} from '../../math/bank.js';
import {progressFor,submit} from '../../math/guided-solutions.js';

const $=id=>document.getElementById(id),KEY='mathTower.midnight.opening.v1';
const keys=new Set(),sound=createSound();
let world;
try{world=createWorld($('world'));}catch(error){$('error').hidden=false;$('error-copy').textContent='This 3D opening needs WebGL. Try an up-to-date browser with graphics acceleration enabled. '+error.message;}
if(world)start();

function start(){
  let mode='title',room='museum',save=readSave(),time=0,last=performance.now(),saveClock=0,film=null,toastClock=0,vy=0,invulnerable=0,cooldown=0,pulseTime=0,doorOpen=0,galleryOpen=0,question=null,progress=null,gateIndex=0,priorMode='play';
  let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cameraTarget=new T.Vector3(),lookTarget=new T.Vector3(),look=new T.Vector3(0,2,0);
  $('reduced-motion').checked=reduced;
  world.enter('museum');world.player.position.set(4,0,5);world.player.rotation.y=.6;
  $('continue').hidden=!save||save.room==='complete';
  function fresh(){return {version:1,seed:crypto.getRandomValues(new Uint32Array(1))[0],bankId:$('bank').value,math:{},room:'roof',solved:[false,false],shards:[],health:3,position:{x:-6,z:4},intro:false};}
  function readSave(){try{const s=JSON.parse(localStorage.getItem(KEY));if(!s||s.version!==1||!['roof','museum','complete'].includes(s.room)||!['foundations','readiness'].includes(s.bankId)||!Number.isFinite(s.seed)||!s.math||typeof s.math!=='object'||Array.isArray(s.math)||!Array.isArray(s.solved)||s.solved.length!==2)return null;
    s.solved=s.solved.map(v=>v===true);s.shards=Array.isArray(s.shards)?[...new Set(s.shards.filter(i=>Number.isInteger(i)&&i>=0&&i<3))]:[];s.health=Number.isInteger(s.health)?Math.max(1,Math.min(3,s.health)):3;
    if(!s.position||!Number.isFinite(s.position.x)||!Number.isFinite(s.position.z))s.position=s.room==='roof'?{x:-6,z:4}:{x:-8,z:7};s.position.x=T.MathUtils.clamp(s.position.x,-12,12);s.position.z=T.MathUtils.clamp(s.position.z,-9,9);return s;}catch{return null;}}
  function persist(){if(!save)return;save.position={x:world.player.position.x,z:world.player.position.z};try{localStorage.setItem(KEY,JSON.stringify(save));$('save-warning').textContent='';}catch{$('save-warning').textContent='Browser storage is unavailable. This expedition remains playable, but progress will last only for this session.';}}
  function toast(text){$('toast').textContent=text;toastClock=4.5;$('toast').style.opacity=1;}
  function clearInput(){keys.clear();}
  function setMode(value){mode=value;$('title-screen').hidden=value!=='title';$('hud').hidden=!['play','math','pause'].includes(value);$('cinema').hidden=value!=='film';$('touch').hidden=value!=='play';clearInput();}
  function updateHud(){if(!save)return;$('location').textContent=room==='roof'?'The rooftop':'The museum';$('hearts').textContent=Array.from({length:3},(_,i)=>i<save.health?'◆':'◇').join(' ');$('hearts').setAttribute('aria-label',`${save.health} of 3 hearts`);$('inventory').textContent=room==='museum'?`${save.shards.length} / 3 memory fragments`:'';
    $('objective').textContent=room==='roof'?(save.solved[0]?'The roof door is open. Go inside.':'Reach the glowing relay beside the roof door.'):(save.shards.length<3?'Recover three memory fragments. Jump or stun the Skitters.':save.solved[1]?'The gallery is open. Find the way down.':'Use the alignment instrument to open the lower galleries.');}
  function loadRoom(next){room=next;world.enter(next);sound.setRoom(next);world.player.position.set(next==='roof'?-6:-8,0,next==='roof'?4:7);world.player.rotation.y=.6;vy=0;invulnerable=2;doorOpen=save.solved[0]?1:0;galleryOpen=save.solved[1]?1:0;world.roofDoor.leaf.position.y=2+doorOpen*4.2;world.exitDoor.leaf.position.y=2+galleryOpen*4.2;world.shards.forEach((s,i)=>s.visible=!save.shards.includes(i));world.enemies.forEach((e,i)=>{e.position.set([[-7,-4],[7,-2],[3,-6]][i][0],0,[[-7,-4],[7,-2],[3,-6]][i][1]);e.userData.stun=0;e.userData.phase=i*1.3;});updateHud();}
  function launch(resume=false){sound.start();save=resume&&save?save:fresh();$('bank').value=save.bankId;loadRoom(save.room==='complete'?'roof':save.room);
    if(resume){world.player.position.set(save.position.x,0,save.position.z);setMode('play');persist();$('world').focus();}else{save.intro=true;persist();runFilm('arrival',()=>{setMode('play');toast('Follow the amber lights to the roof relay. E operates nearby instruments.');persist();});}}
  $('begin').onclick=()=>launch(false);$('continue').onclick=()=>launch(true);
  function runFilm(name,done){film={name,shots:adventure.films[name],index:0,elapsed:0,done,announced:-1};setMode('film');sound.silence();$('world').focus();}
  function finishFilm(){if(!film)return;const done=film.done;film=null;sound.silence();world.player.visible=true;world.heli.position.y=.5;world.robot.rotation.z=-.15;done();$('world').focus();}
  $('skip').onclick=finishFilm;
  function filmFrame(dt){const shot=film.shots[film.index];if(film.announced!==film.index){film.announced=film.index;$('speaker').textContent=shot.speaker;$('line').textContent=shot.line;sound.say(shot.line);}
    film.elapsed+=dt;const f=T.MathUtils.smoothstep(film.elapsed/shot.seconds,0,1);cameraTarget.fromArray(shot.camera);if(!reduced)cameraTarget.lerp(new T.Vector3(...shot.end),f);world.camera.position.copy(cameraTarget);look.fromArray(shot.target);world.camera.lookAt(look);
    world.player.visible=shot.action!=='landing';
    if(shot.action==='landing')world.heli.position.y=.5+(1-f)*11;
    if(shot.action==='arrival'){world.player.rotation.y=.4;world.player.userData.head.rotation.y=.5;}
    if(shot.action==='greeting'){world.robot.userData.arms[0].rotation.z=-.8+Math.sin(time*5)*.3;world.robot.rotation.z=f>.75?-(f-.75):0;}
    if(shot.action==='skitters'){world.robot.userData.arms[0].rotation.z=0;world.enemies.forEach((e,i)=>{e.position.z=-3+Math.sin(time+i)*.2;e.userData.legs.forEach((l,j)=>l.rotation.y=Math.sin(time*10+j)*.3);});}
    if(shot.action==='align')world.rings.forEach((r,i)=>r.rotation.x=T.MathUtils.lerp(r.rotation.x,Math.PI/2+i*.1,.04));
    if(shot.action==='open')world.exitDoor.leaf.position.y=2+Math.min(1,f*2)*4.2;
    if(film.elapsed>=shot.seconds){film.index++;film.elapsed=0;if(film.index>=film.shots.length)finishFilm();}}
  function target(){const p=world.player.position,near=(x,z,r=2.1)=>Math.hypot(p.x-x,p.z-z)<r;
    if(room==='roof'){if(near(5,-6.4)&&!save.solved[0])return {label:'Restore the roof relay',kind:'math',index:0};if(near(8,-6.5,2.3))return {label:save.solved[0]?'Enter the museum':'Door locked · use the relay',kind:save.solved[0]?'enter':'locked'};}
    else{if(near(6.5,-8)&&!save.solved[1])return {label:save.shards.length===3?'Align the gallery instrument':'Recover the three memory fragments',kind:save.shards.length===3?'math':'fragments',index:1};if(near(9,-9,2))return {label:save.solved[1]?'Enter the lower galleries':'The gallery needs alignment',kind:save.solved[1]?'exit':'locked'};if(near(-4,2,2))return {label:'Listen to the Guidebot',kind:'robot'};}return null;}
  function interact(){if(mode!=='play')return;const t=target();if(!t)return;if(t.kind==='math')openMath(t.index);else if(t.kind==='enter'){save.room='museum';loadRoom('museum');persist();runFilm('welcome',()=>{setMode('play');toast('Three fragments are scattered through the exhibit. X sends a stun pulse.');persist();});}
    else if(t.kind==='exit')runFilm('ending',()=>{save.room='complete';persist();setMode('complete');$('complete').showModal();});else if(t.kind==='robot'){toast('“Nearest safe reality… That cannot be right.” The Guidebot points toward the glowing fragments.');sound.say('Nearest safe reality. That cannot be right.');}else toast(t.kind==='fragments'?'Find all three glowing fragments before aligning the gallery.':'A nearby instrument controls this door.');}
  function openMath(index){gateIndex=index;question=getProblem(save,'tower-0001',adventure.gates[index]);progress=progressFor(save,adventure.gates[index].id,question);setMode('math');$('math-title').textContent=adventure.gates[index].label;$('question').textContent=question.prompt;$('math-skill').textContent=question.skill;$('feedback').textContent='Take your time. The world is paused.';$('hint').hidden=true;$('hint').textContent=question.hint;$('answer').value=progress.draft;renderGuide();$('math').showModal();$('answer').focus();persist();}
  function renderGuide(){$('guided').hidden=!progress.guided;$('step-count').textContent=`STEP ${Math.min(progress.checked.length+1,question.steps.length)} OF ${question.steps.length}`;$('checked').replaceChildren();progress.checked.forEach((answer,i)=>{const li=document.createElement('li');li.textContent=question.steps[i].prompt+' → '+answer+' ✓';$('checked').append(li);});$('step-prompt').textContent=progress.solved?'All steps checked. The mechanism is ready.':question.steps[progress.checked.length]?.prompt||'';$('answer-form').hidden=progress.solved;$('activate').hidden=!progress.solved;$('help').hidden=progress.guided||progress.solved;$('answer-label').textContent=progress.guided?'This step’s answer':'Your answer';}
  $('answer').oninput=()=>{if(progress){progress.draft=$('answer').value;persist();}};
  $('answer-form').onsubmit=e=>{e.preventDefault();const result=submit(question,progress,$('answer').value);if(result.correct){sound.tone('solve');$('feedback').textContent=result.complete?'Correct. Activate the mechanism when you are ready.':'That step is correct. Now calculate the next one.';$('answer').value='';renderGuide();if(result.complete)$('activate').focus();else $('answer').focus();}else $('feedback').textContent='Not quite. Try again; there is no penalty. A hint or checked steps can help.';persist();};
  $('help').onclick=()=>{progress.guided=true;progress.checked=[];progress.draft='';$('answer').value='';renderGuide();$('answer').focus();persist();};
  $('hint-button').onclick=()=>{$('hint').hidden=false;};
  function leaveMath(){if(mode!=='math')return;$('math').close();setMode('play');persist();$('world').focus();}
  $('leave-math').onclick=leaveMath;$('math').addEventListener('cancel',e=>{e.preventDefault();leaveMath();});
  $('activate').onclick=()=>{if(!progress.solved)return;save.solved[gateIndex]=true;$('math').close();sound.tone('solve');updateHud();persist();if(gateIndex===0){setMode('play');toast('Relay restored. The roof door is opening.');}else runFilm('alignment',()=>{setMode('play');toast('The lower gallery is open. Something is moving beyond it.');persist();});$('world').focus();};
  function pause(){if(!['play','film'].includes(mode))return;priorMode=mode;setMode('pause');sound.silence();persist();$('pause-menu').showModal();}
  function resume(){$('pause-menu').close();setMode(priorMode);$('world').focus();}
  $('pause').onclick=pause;$('resume').onclick=resume;$('pause-menu').addEventListener('cancel',e=>{e.preventDefault();resume();});
  $('return-title').onclick=()=>{$('pause-menu').close();film=null;sound.silence();setMode('title');$('continue').hidden=false;};
  $('reduced-motion').onchange=()=>reduced=$('reduced-motion').checked;
  $('sound').onclick=()=>{const on=sound.toggle();$('sound').textContent=on?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(on));};
  $('voice').onclick=()=>{const on=sound.toggleVoice();$('voice').textContent=on?'Voice on':'Voice off';$('voice').setAttribute('aria-pressed',String(on));};
  $('replay').onclick=()=>{$('complete').close();launch(false);};$('complete').addEventListener('cancel',e=>e.preventDefault());
  function jump(){if(mode==='play'&&world.player.position.y<.04){vy=7.4;sound.tone('jump');}}
  function pulse(){if(mode!=='play'||cooldown>0)return;cooldown=1.4;pulseTime=.5;world.pulse.position.copy(world.player.position).add(new T.Vector3(0,.6,0));world.enemies.forEach(e=>{if(e.position.distanceTo(world.player.position)<4.5){e.userData.stun=4.5;e.position.add(e.position.clone().sub(world.player.position).setY(0).normalize().multiplyScalar(.45));}});sound.tone('pulse');}
  function press(code){if(mode==='play'){if(code==='Space')jump();if(code==='KeyX')pulse();if(code==='KeyE')interact();}if(code==='KeyP'||code==='Escape'){if(mode==='pause')resume();else pause();}}
  document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||mode==='math')return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(!keys.has(e.code))press(e.code);keys.add(e.code);});document.addEventListener('keyup',e=>keys.delete(e.code));
  document.querySelectorAll('[data-key]').forEach(button=>{button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);press(button.dataset.key);keys.add(button.dataset.key);});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.key));});
  window.addEventListener('blur',()=>{clearInput();pause();});document.addEventListener('visibilitychange',()=>{clearInput();if(document.hidden){pause();sound.suspend();}else sound.resume();});window.addEventListener('pagehide',persist);window.addEventListener('resize',world.resize);
  function blocked(x,z,y){if(x<-13.5||x>13.5||z<-11||z>10.5)return true;if(room==='roof'){if(z<-7.4&&x>3&&x<13)return true;return world.obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.3&&Math.abs(z-o.z)<o.d/2+.3&&y<o.h);}return Math.abs(x)<2.8&&Math.abs(z+1)<2.8;}
  function simulation(dt){cooldown=Math.max(0,cooldown-dt);invulnerable=Math.max(0,invulnerable-dt);const p=world.player.position;let x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));const len=Math.hypot(x,z);if(len){x/=len;z/=len;}const dx=(x*.825+z*.565)*5.3*dt,dz=(-x*.565+z*.825)*5.3*dt;
    if(!blocked(p.x+dx,p.z,p.y))p.x+=dx;if(!blocked(p.x,p.z+dz,p.y))p.z+=dz;
    if(len){const angle=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(angle-world.player.rotation.y),Math.cos(angle-world.player.rotation.y));world.player.rotation.y+=delta*Math.min(1,dt*13);}
    vy-=18*dt;p.y=Math.max(0,p.y+vy*dt);if(p.y===0)vy=0;
    animateExplorer(world.player,time,len?1:0,p.y);world.player.visible=true;
    if(room==='museum'){
      world.shards.forEach((s,i)=>{if(s.visible&&Math.hypot(p.x-s.position.x,p.z-s.position.z)<1){s.visible=false;save.shards.push(i);sound.tone('shard');toast(save.shards.length===3?'All three fragments recovered. Find the alignment instrument.':`Memory fragment ${save.shards.length} of 3 recovered.`);updateHud();persist();}});
      world.enemies.forEach((e,i)=>{const state=e.userData;state.stun=Math.max(0,state.stun-dt);if(state.stun){e.rotation.z=Math.sin(time*8)*.12;e.position.y=.08;return;}e.rotation.z=0;state.phase+=dt;const direction=p.clone().sub(e.position).setY(0),distance=direction.length();e.rotation.y=Math.atan2(direction.x,direction.z);const phase=state.phase%3.6,windup=phase>2.15&&phase<2.8,attack=phase>=2.8;const speed=windup?0:attack?5.4:1.1;if(distance<11&&distance>.65){direction.normalize().multiplyScalar(dt*speed);const nx=e.position.x+direction.x,nz=e.position.z+direction.z;if(!blocked(nx,nz,0)){e.position.x=nx;e.position.z=nz;}}
        e.position.y=windup?.06+Math.sin(time*24)*.04:Math.abs(Math.sin(time*9+i))*.06;e.scale.setScalar(windup?1.12:1);state.legs.forEach((l,j)=>l.rotation.y=Math.sin(time*(attack?18:8)+j)*.3);
        if(distance<.9&&p.y<.7&&invulnerable===0){save.health--;invulnerable=2.8;sound.tone('hurt');if(save.health<=0){save.health=3;p.set(-8,0,7);world.enemies.forEach((enemy,j)=>enemy.position.set(4+j*2,0,-5));toast('Back at the gallery entrance. Your fragments and math progress are safe.');}else toast('Space jumps over Skitters. X stuns nearby creatures.');updateHud();persist();}
      });
    }
    const t=target();$('prompt').hidden=!t;if(t)$('prompt').querySelector('span').textContent=t.label;
    if(save.solved[0])doorOpen=Math.min(1,doorOpen+dt*.55);if(save.solved[1])galleryOpen=Math.min(1,galleryOpen+dt*.55);world.roofDoor.leaf.position.y=2+doorOpen*4.2;world.exitDoor.leaf.position.y=2+galleryOpen*4.2;
    pulseTime=Math.max(0,pulseTime-dt);world.pulse.material.opacity=pulseTime*1.7;world.pulse.scale.setScalar(1+(1-pulseTime/.5)*4);saveClock+=dt;if(saveClock>2){saveClock=0;persist();}
  }
  function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;
    if(['play','film','title'].includes(mode)){time+=dt;world.animate(time,dt,room);}
    if(mode==='film'){animateExplorer(world.player,time,0,0,film?.shots[film.index]?.speaker==='THE EXPLORER');filmFrame(dt);}
    else if(mode==='play'){simulation(dt);const p=world.player.position;lookTarget.set(p.x,1.3,p.z);cameraTarget.copy(lookTarget).add(new T.Vector3(10,11,15));if(world.camera.aspect<.8)cameraTarget.add(new T.Vector3(3,5,5));const speed=reduced?1:Math.min(1,dt*2.8);world.camera.position.lerp(cameraTarget,speed);look.lerp(lookTarget,speed);world.camera.lookAt(look);}
    else if(mode==='title'){world.player.visible=true;animateExplorer(world.player,time);world.camera.position.set(15+Math.sin(time*.12)*1.5,9,17);world.camera.lookAt(0,3,-1);}
    if(toastClock>0&&mode==='play'){toastClock-=dt;if(toastClock<=0)$('toast').style.opacity=0;}
    world.renderer.render(world.scene,world.camera);requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
