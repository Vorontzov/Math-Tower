import * as T from '../../vendor/three.module.js';
import {mat,mesh,ball,box,rod,explorer,guidebot,skitter,helicopter} from './actors.js';

export function createWorld(canvas){
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  const scene=new T.Scene();scene.background=new T.Color('#101d30');scene.fog=new T.FogExp2('#14253a',.012);
  const camera=new T.PerspectiveCamera(45,1,.1,180);camera.position.set(19,17,24);
  scene.add(new T.HemisphereLight('#a8dcff','#25394e',2));
  const key=new T.DirectionalLight('#ffdfaa',3);key.position.set(-8,18,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:70});key.shadow.bias=-.0005;scene.add(key);
  const fill=new T.DirectionalLight('#75d9ff',1.9);fill.position.set(15,9,-15);scene.add(fill);
  const roof=new T.Group(),museum=new T.Group();scene.add(roof,museum);museum.visible=false;
  const stone=mat('#466178',.65,.25),edge=mat('#1c3146',.55,.3),gold=mat('#c89e59',.32,.65),ivory=mat('#ded8be'),dark=mat('#0e2635'),teal=mat('#23525e',.42,.2);
  const glow=new T.MeshStandardMaterial({color:'#ffdd91',emissive:'#ffbb5c',emissiveIntensity:1.5});const cool=new T.MeshStandardMaterial({color:'#b7fff6',emissive:'#48dcc9',emissiveIntensity:2});
  function instances(parent,material,size,positions){const group=new T.InstancedMesh(new T.BoxGeometry(...size),material,positions.length),matrix=new T.Matrix4();positions.forEach((p,i)=>group.setMatrixAt(i,matrix.makeTranslation(...p)));group.receiveShadow=true;parent.add(group);return group;}
  function text(parent,str,pos,width=3,color='#f3d69b',size=80){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.font=`600 ${size}px Georgia`;if(ctx.measureText(str).width>980)ctx.font=`600 ${Math.floor(size*980/ctx.measureText(str).width)}px Georgia`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(str,512,128);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false});return mesh(parent,new T.PlaneGeometry(width,width/4),m,pos);}
  function lamp(parent,x,z,height=3){rod(parent,gold,[x,0,z],[x,height,z],.055);ball(parent,glow,[x,height,z],[.16,.22,.16]);const l=new T.PointLight('#ffd297',10,7,2);l.position.set(x,height-.2,z);parent.add(l);}
  function door(parent,x,z,title){const group=new T.Group();group.position.set(x,0,z);parent.add(group);for(const s of [-1,1]){box(group,edge,[s*1.65,2.2,-.25],[.4,4.4,.6]);box(group,gold,[s*1.65,2.2,.13],[.15,4.5,.2]);}box(group,edge,[0,4.35,-.25],[3.6,.4,.6]);box(group,gold,[0,4.4,.13],[3.5,.15,.2]);const leaf=box(group,teal,[0,2,.15],[2.9,4,.22]);for(let i=0;i<4;i++)box(leaf,gold,[0,(i-1.5)*.2,.6],[.8,.015,.1]);text(group,title,[0,5,.1],4);return {group,leaf};}
  function consoleProp(parent,x,z){const g=new T.Group();g.position.set(x,0,z);parent.add(g);box(g,edge,[0,.65,0],[.65,1.3,.55]);const top=box(g,gold,[0,1.35,0],[.9,.16,.7]);top.rotation.x=.2;const screen=box(g,cool,[0,1.45,.07],[.64,.04,.43]);screen.rotation.x=.2;const halo=mesh(g,new T.TorusGeometry(.5,.025,8,48),cool,[0,2.1,0]);g.userData.halo=halo;return g;}
  box(roof,edge,[0,-.5,0],[30,1,24]);
  const roofTiles=[];for(let x=-14;x<15;x+=2)for(let z=-11;z<12;z+=2)roofTiles.push([x,.005,z]);instances(roof,stone,[1.96,.05,1.96],roofTiles);
  for(const x of [-14.6,14.6]){box(roof,edge,[x,.65,0],[.35,1.3,23.5]);box(roof,gold,[x,1.33,0],[.38,.08,23.5]);}
  box(roof,edge,[0,.65,-11.6],[29.4,1.3,.35]);box(roof,edge,[0,.65,11.6],[29.4,1.3,.35]);
  const pad=mesh(roof,new T.TorusGeometry(4.2,.07,8,80),gold,[-6,.08,-1]);pad.rotation.x=-Math.PI/2;for(const x of [-7,-5])box(roof,ivory,[x,.08,-1],[.14,.02,3]);box(roof,ivory,[-6,.08,-1],[2,.02,.14]);
  for(const x of [4.9,11.1])box(roof,edge,[x,2.8,-9.4],[2.8,5.6,3]);box(roof,edge,[8,5,-9.4],[3.5,1.2,3]);box(roof,dark,[8,2,-11],[3.5,4,.2]);const roofDoor=door(roof,8,-7.8,'MUSEUM ACCESS');text(roof,'M A T H   T O W E R',[8,5.9,-7.7],7, '#d6b779',64);
  const roofConsole=consoleProp(roof,5,-6.4);lamp(roof,3,-7,3.5);lamp(roof,12,-7,3.5);lamp(roof,-13,8);lamp(roof,13,8);
  const obstacles=[{x:0,z:2,w:2.5,d:1.3,h:.7},{x:3,z:-1,w:1.3,d:1.3,h:.9}];
  for(const o of obstacles){box(roof,teal,[o.x,o.h/2,o.z],[o.w,o.h,o.d]);for(let i=0;i<3;i++)box(roof,gold,[o.x+(i-1)*.3,o.h+.02,o.z],[.07,.03,o.d]);}
  const heli=helicopter();heli.position.set(-6,.5,-1);heli.rotation.y=.4;roof.add(heli);
  const city=new T.Group();scene.add(city);
  const windows=[];for(let i=0;i<44;i++){const angle=i/44*Math.PI*2,r=39+(i%5)*6,h=4+(i*13%18),x=Math.cos(angle)*r,z=Math.sin(angle)*r;box(city,mat(i%2?'#182a3d':'#26394b'),[x,-16+h/2,z],[3+i%3,h,4]);for(let j=0;j<Math.floor(h/2);j++)for(let k=0;k<2;k++)windows.push([x-.7+k*1.4,-15+j*2,z+2.02]);}instances(city,glow,[.45,.6,.02],windows);
  ball(city,new T.MeshBasicMaterial({color:'#d7eff8'}),[-35,29,-65],[3,3,3]);
  const rainData=new Float32Array(500*3);for(let i=0;i<500;i++){rainData[i*3]=(i*17.17%44)-22;rainData[i*3+1]=i*1.33%28;rainData[i*3+2]=(i*9.31%40)-20;}const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainData,3));const rain=new T.Points(rainGeo,new T.PointsMaterial({color:'#a4d3df',size:.065,transparent:true,opacity:.5}));roof.add(rain);
  // One dimensional room: floor, colonnade, suspended machinery and clear routes.
  box(museum,edge,[0,-.4,0],[30,.8,26]);
  const lightTiles=[],darkTiles=[];for(let x=-14;x<15;x+=2)for(let z=-12;z<13;z+=2)((x+z)%4===0?lightTiles:darkTiles).push([x,0,z]);instances(museum,mat('#557278',.36,.35),[1.96,.04,1.96],lightTiles);instances(museum,mat('#3c5861',.36,.35),[1.96,.04,1.96],darkTiles);
  for(const x of [-12,12])box(museum,gold,[x,.035,0],[.06,.025,25]);for(const z of [-10,10])box(museum,gold,[0,.035,z],[28,.025,.06]);
  box(museum,dark,[-4,5,-12.8],[22,10,.6]);box(museum,dark,[13,5,-12.8],[4,10,.6]);box(museum,dark,[9,7.5,-12.8],[4,5,.6]);box(museum,dark,[-15,4,0],[.5,8,26]);box(museum,dark,[15,4,0],[.5,8,26]);
  for(const x of [-13,-8,-3,3,13]){box(museum,teal,[x,4,-12.35],[3,7,.2]);for(const s of [-1,1])box(museum,gold,[x+s*1.48,4,-12.1],[.08,7,.08]);text(museum,['π','∞','Σ','√','△'][[-13,-8,-3,3,13].indexOf(x)],[x,6,-12],2.2);}
  // The opening door reveals an actual deep set, with inverted floating geometry.
  box(museum,teal,[9,-.1,-20],[4,.2,18]);box(museum,dark,[6.9,3,-20],[.2,6,18]);box(museum,dark,[11.1,3,-20],[.2,6,18]);
  for(let i=0;i<6;i++){for(const x of [7.1,10.9])box(museum,gold,[x,2.8,-13-i*2.4],[.07,5.6,.08]);box(museum,gold,[9,5.6,-13-i*2.4],[4,.08,.08]);const shape=mesh(museum,new T.OctahedronGeometry(.45),cool,[9+Math.sin(i)*.6,2.8+Math.cos(i)*1.1,-15-i*2]);shape.rotation.z=i*.6;}
  for(const x of [-13,13])for(const z of [-9,-2,5]){mesh(museum,new T.CylinderGeometry(.35,.45,6,12),ivory,[x,3,z]);mesh(museum,new T.CylinderGeometry(.6,.6,.2,12),gold,[x,5.95,z]);lamp(museum,x*.95,z,3.4);}
  for(const z of [-9,-2,5]){const arch=mesh(museum,new T.TorusGeometry(13,.13,8,64,Math.PI),gold,[0,6,z]);arch.scale.y=.42;rod(museum,gold,[-13,6,z],[13,6,z],.04);}
  text(museum,'THE GEOMETRY OF THE IMPOSSIBLE',[0,9,-12.3],12,'#eed9ad',62);
  box(museum,edge,[0,.2,-1],[5,.4,5]);const mechanism=new T.Group();mechanism.position.set(0,3.5,-1);museum.add(mechanism);const rings=[];
  for(let i=0;i<3;i++){const ring=mesh(mechanism,new T.TorusGeometry(2.2+i*.32,.075,12,100),gold);ring.rotation.set(i*.9,.3+i*.7,0);rings.push(ring);}const core=mesh(mechanism,new T.IcosahedronGeometry(.85,0),cool);core.material=new T.MeshStandardMaterial({color:'#72c9d2',emissive:'#3ca8ae',emissiveIntensity:.8,metalness:.7,roughness:.2,flatShading:true});
  rod(museum,gold,[0,5,-1],[0,11,-1],.04);const pendulum=new T.Group();pendulum.position.set(-5,9,-2);museum.add(pendulum);rod(pendulum,gold,[0,0,0],[0,-6,0],.04);ball(pendulum,gold,[0,-6,0],[.6,.6,.6]);
  for(let i=0;i<7;i++){const x=(i%2?1:-1)*(5+i*.8),z=-5+i;const poly=mesh(museum,i%2?new T.OctahedronGeometry(.6):new T.IcosahedronGeometry(.6),i%2?gold:ivory,[x,5.3+(i%3),z]);poly.rotation.set(i,i*.7,0);rod(museum,gold,[x,poly.position.y+.5,z],[x,11,z],.018);}
  const exitDoor=door(museum,9,-10.5,'LOWER GALLERIES');const museumConsole=consoleProp(museum,6.5,-8);const robot=guidebot();robot.position.set(-4,0,2);robot.rotation.y=.5;museum.add(robot);
  const enemies=[[-7,-4],[7,-2],[3,-6]].map(([x,z],i)=>{const e=skitter();e.position.set(x,0,z);e.userData.phase=i*1.3;museum.add(e);return e;});
  const shards=[[8,6],[-10,-6],[4,-7]].map(([x,z])=>{const g=new T.Group();g.position.set(x,1.1,z);museum.add(g);mesh(g,new T.OctahedronGeometry(.27),cool);const ring=mesh(g,new T.TorusGeometry(.44,.018,6,40),gold);ring.rotation.x=.8;return g;});
  const player=explorer();scene.add(player);player.position.set(-6,0,4);
  const pulse=mesh(scene,new T.TorusGeometry(1,.04,8,64),new T.MeshBasicMaterial({color:'#9efde9',transparent:true,opacity:0}),[0,.6,0]);pulse.rotation.x=-Math.PI/2;
  const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};resize();
  return {renderer,scene,camera,roof,museum,city,player,heli,robot,enemies,shards,rings,core,pendulum,roofDoor,exitDoor,roofConsole,museumConsole,obstacles,rain,rainData,pulse,resize,
    enter(room){roof.visible=room==='roof';museum.visible=room==='museum';city.visible=room==='roof';scene.fog.density=room==='roof'?.012:.018;scene.background.set(room==='roof'?'#101d30':'#132b36');},
    animate(time,dt,room){heli.userData.rotor.rotation.y+=dt*30;heli.position.y=.5+Math.sin(time*2)*.035;rings.forEach((r,i)=>{r.rotation.y+=dt*(.15+i*.09);r.rotation.z+=dt*.07;});core.rotation.y=time*.3;pendulum.rotation.z=Math.sin(time*.9)*.35;robot.userData.head.rotation.z=Math.sin(time)*.1;shards.forEach((s,i)=>{s.rotation.y=time;s.position.y=1.1+Math.sin(time*2+i)*.14;});for(const p of [roofConsole,museumConsole]){p.userData.halo.rotation.y=time*.8;p.userData.halo.position.y=2.1+Math.sin(time*2)*.1;}if(room==='roof'){for(let i=1;i<rainData.length;i+=3){rainData[i]-=dt*12;if(rainData[i]<0)rainData[i]=25;}rain.geometry.attributes.position.needsUpdate=true;}}
  };
}
