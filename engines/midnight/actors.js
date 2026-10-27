import * as T from '../../vendor/three.module.js';

export const mat = (color, roughness=.65, metalness=0) => new T.MeshStandardMaterial({color,roughness,metalness});
export function mesh(parent, geometry, material, pos=[0,0,0], scale=[1,1,1]) {
  const m=new T.Mesh(geometry,material);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export const ball=(p,m,pos,s=[1,1,1])=>mesh(p,new T.SphereGeometry(1,20,14),m,pos,s);
export const box=(p,m,pos,s)=>mesh(p,new T.BoxGeometry(1,1,1),m,pos,s);
export function rod(parent,material,a,b,r=.04){const start=new T.Vector3(...a),end=new T.Vector3(...b),d=end.clone().sub(start);const o=mesh(parent,new T.CylinderGeometry(r,r,d.length(),10),material,start.add(end).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}

export function explorer(){
  const root=new T.Group(),body=new T.Group();root.add(body);
  const teal=mat('#207f89'),dark=mat('#1b293a'),skin=mat('#dbaa7d'),hair=mat('#1c222d'),gold=mat('#dca33e'),white=mat('#fff4dc'),rubber=mat('#39434c');
  ball(body,teal,[0,1.18,0],[.39,.52,.25]);
  box(body,gold,[0,1.25,-.27],[.47,.58,.23]);
  for(const x of [-.24,.24]){rod(body,gold,[x,.95,.18],[x,1.55,.16],.033);ball(body,gold,[x,.96,.2],[.055,.08,.04]);}
  const head=new T.Group();head.position.set(0,1.91,0);body.add(head);
  ball(head,skin,[0,0,0],[.38,.4,.33]);ball(head,hair,[0,.2,-.045],[.4,.29,.34]);
  for(let i=0;i<7;i++){const h=ball(head,hair,[-.32+i*.1,.29+Math.sin(i*2)*.06,.12],[.13,.19,.2]);h.rotation.z=-.3+i*.1;}
  const eyes=[];
  for(const x of [-.15,.15]){ball(head,skin,[x*2.55,-.02,0],[.08,.13,.09]);const eye=ball(head,white,[x,.02,.294],[.105,.125,.05]);eyes.push(eye);ball(head,dark,[x+.015,.02,.335],[.05,.076,.028]);ball(head,white,[x+.035,.055,.36],[.019,.025,.01]);rod(head,hair,[x-.09,.18,.3],[x+.075,.2,.31],.027);}
  ball(head,skin,[0,-.08,.34],[.065,.065,.065]);
  const mouth=ball(head,mat('#804b40'),[0,-.22,.28],[.08,.025,.025]);
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.39,1.48,0);body.add(arm);ball(arm,teal,[side*.05,-.23,0],[.15,.3,.15]);ball(arm,skin,[side*.06,-.51,.025],[.12,.14,.12]);arms.push(arm);
    const leg=new T.Group();leg.position.set(side*.19,.82,0);body.add(leg);ball(leg,dark,[0,-.27,0],[.15,.33,.16]);ball(leg,rubber,[0,-.66,.1],[.17,.12,.25]);box(leg,white,[0,-.74,.1],[.3,.055,.42]);legs.push(leg);
  }
  root.userData={body,head,arms,legs,eyes,mouth};return root;
}
export function animateExplorer(root,time,speed=0,jump=0,talking=false){const {body,head,arms,legs,eyes,mouth}=root.userData;const stride=Math.sin(time*11)*Math.min(speed,1);body.position.y=Math.abs(stride)*.06;body.rotation.z=stride*.035;head.rotation.y=Math.sin(time*.8)*.08;head.rotation.z=Math.sin(time*.6)*.035;arms.forEach((a,i)=>{a.rotation.x=(i?1:-1)*stride*.7-(jump>.1?.7:0);a.rotation.z=(i?-.1:.1)*(1+(jump>.1?3:0));});legs.forEach((l,i)=>l.rotation.x=(i?-1:1)*stride*.65+(jump>.1?.35:0));const blink=time%4.7>4.57;eyes.forEach(e=>e.scale.y=blink?.018:.125);mouth.scale.y=talking?.025+Math.abs(Math.sin(time*16))*.04:.025;}

export function guidebot(){const g=new T.Group(),ivory=mat('#e2d4b7',.4,.2),brass=mat('#ae8546',.35,.7),ink=mat('#142c36',.25,.5),glow=new T.MeshStandardMaterial({color:'#9bf7e3',emissive:'#70e8d8',emissiveIntensity:2});
  ball(g,ivory,[0,.67,0],[.48,.5,.38]);box(g,brass,[0,.36,0],[.65,.2,.48]);
  const head=new T.Group();head.position.y=1.3;g.add(head);ball(head,ivory,[0,0,0],[.52,.42,.4]);ball(head,ink,[0,-.015,.3],[.42,.28,.12]);for(const x of [-.18,.18])ball(head,glow,[x,.01,.413],[.07,.11,.022]);
  const arms=[];for(const x of [-.55,.55]){const arm=new T.Group();arm.position.set(x,.96,0);g.add(arm);rod(arm,brass,[0,0,0],[x*.3,-.35,0],.07);ball(arm,ivory,[x*.3,-.4,0],[.14,.14,.14]);arms.push(arm);const wheel=mesh(g,new T.CylinderGeometry(.22,.22,.12,16),ink,[x*.65,.22,0]);wheel.rotation.z=Math.PI/2;}
  rod(g,brass,[0,1.65,0],[0,1.95,0],.025);ball(g,glow,[0,1.95,0],[.06,.06,.06]);g.userData={head,arms};return g;
}
export function skitter(){const g=new T.Group(),ink=mat('#172338',.3,.35),cyan=new T.MeshStandardMaterial({color:'#ccfaff',emissive:'#72c7ff',emissiveIntensity:1.6});ball(g,ink,[0,.37,0],[.43,.27,.49]);ball(g,ink,[0,.5,.34],[.3,.25,.3]);for(const x of [-.13,.13])ball(g,cyan,[x,.55,.6],[.065,.075,.04]);const legs=[];for(const s of [-1,1])for(let i=0;i<3;i++){const leg=new T.Group();leg.position.set(s*.23,.28,(i-1)*.28);g.add(leg);rod(leg,ink,[0,0,0],[s*.42,.2,-.1],.055);rod(leg,ink,[s*.42,.2,-.1],[s*.62,-.23,.1],.045);legs.push(leg);}g.userData={legs,phase:0,stun:0};return g;}

export function helicopter(){const g=new T.Group(),navy=mat('#233b47',.45,.5),glass=mat('#57a4b9',.13,.7),brass=mat('#dcad62',.3,.6),black=mat('#18222b');ball(g,navy,[0,1,0],[1.25,.95,2]);ball(g,glass,[0,1.16,1.2],[1.12,.76,.9]);box(g,navy,[0,1.1,1.65],[.09,1.3,.25]);rod(g,navy,[0,1.2,-1.3],[0,1.7,-5],.22);box(g,navy,[0,2.15,-4.6],[.12,1.4,.8]);for(const x of [-1,1]){rod(g,black,[x,.2,-1],[x,-.35,-1],.07);rod(g,black,[x,.2,1],[x,-.35,1],.07);rod(g,brass,[x,-.4,-1.8],[x,-.4,1.9],.07);}rod(g,black,[0,1.8,0],[0,2.7,0],.12);const rotor=new T.Group();rotor.position.y=2.7;g.add(rotor);box(rotor,black,[0,0,0],[9,.055,.18]);box(rotor,black,[0,0,0],[.18,.055,9]);g.userData.rotor=rotor;return g;}
