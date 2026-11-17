/* ENGEFIT · demonstrações dos exercícios
   Ilustrações próprias, desenhadas por código: um boneco de linhas (vista lateral ou frontal)
   que vai da posição inicial (a) à final (b) e volta. Sem imagens de terceiros. */
(function(){
'use strict';
var L={torso:34,neck:3,head:6.5,ua:19,fa:17,th:25,sh:25,ft:9};
var GY=112;
function rad(d){return d*Math.PI/180;}
function pt(o,len,ang){return [o[0]+len*Math.cos(rad(ang)),o[1]-len*Math.sin(rad(ang))];}
function add(a,b){return [a[0]+b[0],a[1]+b[1]];}
function dist(a,b){return Math.hypot(b[0]-a[0],b[1]-a[1]);}
function toward(a,b,len){var d=dist(a,b)||1;return [a[0]+(b[0]-a[0])*len/d,a[1]+(b[1]-a[1])*len/d];}
function angOf(a,b){return Math.atan2(-(b[1]-a[1]),b[0]-a[0])*180/Math.PI;}
function ik(root,target,l1,l2,bend){
  var dx=target[0]-root[0],dy=target[1]-root[1],d=Math.hypot(dx,dy);
  d=Math.max(Math.abs(l1-l2)+0.01,Math.min(l1+l2-0.01,d));
  var a=Math.atan2(dy,dx),c=(l1*l1+d*d-l2*l2)/(2*l1*d);c=Math.max(-1,Math.min(1,c));
  var al=Math.acos(c)*(bend||1);
  var j=[root[0]+l1*Math.cos(a+al),root[1]+l1*Math.sin(a+al)];
  return [j,toward(j,target,l2)];
}
function lerpV(a,b,t){
  if(typeof a==='number'&&typeof b==='number')return a+(b-a)*t;
  if(Array.isArray(a)&&Array.isArray(b))return a.map(function(x,i){return lerpV(x,b[i],t);});
  if(a&&b&&typeof a==='object'&&typeof b==='object'){var o={};for(var k in a)o[k]=(k in b)?lerpV(a[k],b[k],t):a[k];return o;}
  return t<0.5?a:b;
}

/* ---------- Cálculo das articulações ---------- */
function limbSide(root,spec,l1,l2,ref){
  if(!spec)return null;
  var j,e;
  if(spec.ang){j=pt(root,l1,spec.ang[0]);e=pt(j,l2,spec.ang[1]);}
  else if(spec.kneeTo){j=toward(root,spec.kneeTo,l1);e=pt(j,l2,spec.shinAng);}
  else{
    var tg=spec.rel?add(ref[spec.relTo||'sh'],spec.rel):spec.to;
    var r=ik(root,tg,l1,l2,spec.bend);j=r[0];e=r[1];
  }
  return {j:j,e:e,far:!!spec.far,fa:spec.fa};
}
function solveSide(p){
  var o={},torsoAng;
  o.hip=p.hip;
  o.sh=p.shp?p.shp:pt(p.hip,L.torso,p.torso);
  torsoAng=angOf(o.hip,o.sh);
  o.head=pt(o.sh,L.neck+L.head,torsoAng+(p.nod||0));
  o.legs=[];o.arms=[];
  (p.legs||[]).forEach(function(lg){
    var r=limbSide(o.hip,lg,L.th,L.sh,o);if(!r)return;
    var la=angOf(r.j,r.e);
    var toe=pt(r.e,L.ft,lg.fa!=null?lg.fa:(lg.ftRel!=null?la+lg.ftRel:0));
    o.legs.push({knee:r.j,ank:r.e,toe:toe,far:r.far});
  });
  (p.arms||[]).forEach(function(ar){
    var r=limbSide(o.sh,ar,L.ua,L.fa,o);if(!r)return;
    o.arms.push({elb:r.j,hand:r.e,far:r.far});
  });
  return o;
}
function solveFront(p){
  var cx=p.cx||80,o={front:1,cx:cx},sy=p.sy,hy=p.hy;
  o.neck=[cx,sy-3];o.head=[cx,sy-3-L.head-1];
  o.sho=[[cx+10,sy],[cx-10,sy]];o.hips=[[cx+6,hy],[cx-6,hy]];
  o.arms=[];o.legs=[];
  [1,-1].forEach(function(s,i){
    var a=(i===0?p.armR:p.armL)||p.arm;
    if(a){
      var sh=o.sho[i],elb,hand;
      if(a.to){var tg=[cx+s*(a.to[0]-cx),a.to[1]];var r=ik(sh,tg,L.ua,L.fa,s*(a.bend||1));elb=r[0];hand=r[1];}
      else{var u=a.ang[0],f=a.ang[1]!=null?a.ang[1]:u;elb=[sh[0]+s*L.ua*Math.sin(rad(u)),sh[1]+L.ua*Math.cos(rad(u))];hand=[elb[0]+s*L.fa*Math.sin(rad(f)),elb[1]+L.fa*Math.cos(rad(f))];}
      o.arms.push({elb:elb,hand:hand});
    }
    var lg=(i===0?p.legR:p.legL)||p.leg;
    if(lg){
      var hp=o.hips[i],knee,ank;
      if(lg.knee){knee=[cx+s*(lg.knee[0]-cx),lg.knee[1]];ank=[knee[0]+s*(lg.shinOut||0),knee[1]+(lg.shin||23)];}
      else{var la=lg.ang||0;knee=[hp[0]+s*L.th*Math.sin(rad(la)),hp[1]+L.th*Math.cos(rad(la))];var lb=lg.ang2!=null?lg.ang2:la;ank=[knee[0]+s*L.sh*Math.sin(rad(lb)),knee[1]+L.sh*Math.cos(rad(lb))];}
      o.legs.push({knee:knee,ank:ank,toe:[ank[0]+s*6,ank[1]+1]});
    }
  });
  return o;
}

/* ---------- Desenho ---------- */
function f(n){return Math.round(n*10)/10;}
function line(a,b,cls,w,extra){return '<line x1="'+f(a[0])+'" y1="'+f(a[1])+'" x2="'+f(b[0])+'" y2="'+f(b[1])+'" class="'+cls+'"'+(w?' stroke-width="'+w+'"':'')+(extra||'')+'/>';}
function poly(ps,cls,w,extra){return '<polyline points="'+ps.map(function(q){return f(q[0])+','+f(q[1]);}).join(' ')+'" class="'+cls+'"'+(w?' stroke-width="'+w+'"':'')+(extra||'')+'/>';}
function circ(c,r,cls){return '<circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="'+r+'" class="'+cls+'"/>';}
function rect(x,y,w,h,cls,rx){return '<rect x="'+f(x)+'" y="'+f(y)+'" width="'+f(w)+'" height="'+f(h)+'" rx="'+(rx==null?2:rx)+'" class="'+cls+'"/>';}
function refPt(o,k){
  if(Array.isArray(k))return k;
  var m={hand:o.arms[0]&&o.arms[0].hand,hand2:o.arms[1]&&o.arms[1].hand,sh:o.sh,hip:o.hip,head:o.head,
    ank:o.legs[0]&&o.legs[0].ank,ank2:o.legs[1]&&o.legs[1].ank,knee:o.legs[0]&&o.legs[0].knee,knee2:o.legs[1]&&o.legs[1].knee,toe:o.legs[0]&&o.legs[0].toe};
  return m[k];
}
function drawProp(pr,o){
  var s='',P=function(k){return refPt(o,k);};
  switch(pr.t){
    case 'bench':s+=rect(pr.x1,pr.y,pr.x2-pr.x1,6,'eq-b')+line([pr.x1+6,pr.y+6],[pr.x1+6,GY],'eq-l',2.5)+line([pr.x2-6,pr.y+6],[pr.x2-6,GY],'eq-l',2.5);break;
    case 'box':s+=rect(pr.x1,pr.y,pr.x2-pr.x1,GY-pr.y,'eq-b',2);break;
    case 'pad':s+=rect(pr.x,pr.y,pr.w,pr.h,'eq-b',3);break;
    case 'back':var a=pr.from,b=pt(a,pr.len,pr.ang);s+=line(a,b,'eq-pad',7);break;
    case 'post':s+=line([pr.x,pr.y1||-14],[pr.x,GY],'eq-l',3);break;
    case 'pull':s+=line([pr.x1,pr.y],[pr.x2,pr.y],'eq-l',3);break;
    case 'wall':s+=line([pr.x,-14],[pr.x,GY],'eq-l',3);break;
    case 'step':s+=rect(pr.x1,pr.y,pr.x2-pr.x1,GY-pr.y,'eq-b',1);break;
    case 'mat':s+=rect(pr.x1,GY-3,pr.x2-pr.x1,3,'eq-mat',1.5);break;
    case 'cable':var a2=P(pr.from)||pr.from,b2=P(pr.to);if(b2)s+=line(a2,b2,'eq-c')+circ(a2,3,'eq-pul');break;
    case 'lever':var b3=P(pr.to);if(b3)s+=line(pr.from,b3,'eq-l',3.5)+circ(pr.from,2.5,'eq-pul');break;
    case 'bar':var c=P(pr.at);if(c){c=add(c,pr.off||[0,0]);s+=circ(c,9,'eq-plate')+circ(c,2.2,'eq-hub');}break;
    case 'db':(pr.at.split?pr.at.split(','):pr.at).forEach(function(k){var c2=P(k);if(c2)s+=circ(c2,4.6,'eq-db');});break;
    case 'roller':var c3=P(pr.at);if(c3)s+=circ(add(c3,pr.off||[0,0]),4,'eq-roll');break;
    case 'platform':var c4=P(pr.at);if(c4){var mid=add(c4,pr.off||[0,0]);s+=line(pt(mid,16,pr.ang),pt(mid,16,pr.ang+180),'eq-l',4);}break;
    case 'handle':var c5=P(pr.at);if(c5)s+=line(add(c5,[0,-4]),add(c5,[0,4]),'eq-l',3);break;
  }
  return s;
}
function drawSide(o){
  var s='',ink='fig',far='fig far';
  o.legs.filter(function(l){return l.far;}).forEach(function(l){s+=poly([o.hip,l.knee,l.ank,l.toe],far,5);});
  o.arms.filter(function(a){return a.far;}).forEach(function(a){s+=poly([o.sh,a.elb,a.hand],far,4.6);});
  s+=line(o.hip,o.sh,ink,7);
  s+=line(o.sh,toward(o.sh,o.head,L.neck+1),ink,4.5);
  s+=circ(o.head,L.head,'fig-head');
  o.legs.filter(function(l){return !l.far;}).forEach(function(l){s+=poly([o.hip,l.knee,l.ank,l.toe],ink,5.4);});
  o.arms.filter(function(a){return !a.far;}).forEach(function(a){s+=poly([o.sh,a.elb,a.hand],ink,4.8);});
  return s;
}
function drawFront(o){
  var s='',ink='fig',mid=[(o.hips[0][0]+o.hips[1][0])/2,o.hips[0][1]];
  o.legs.forEach(function(l,i){s+=poly([o.hips[i],l.knee,l.ank,l.toe],ink,5.4);});
  s+=line([o.cx,o.sho[0][1]],mid,ink,7)+line(o.sho[0],o.sho[1],ink,5)+line(o.hips[0],o.hips[1],ink,5);
  s+=line([o.cx,o.sho[0][1]],o.neck,ink,4.5)+circ(o.head,L.head,'fig-head');
  o.arms.forEach(function(a,i){s+=poly([o.sho[i],a.elb,a.hand],ink,4.8);});
  return s;
}
function refPtFront(o,k){
  var m={hand:o.arms[0]&&o.arms[0].hand,hand2:o.arms[1]&&o.arms[1].hand,knee:o.legs[0]&&o.legs[0].knee,knee2:o.legs[1]&&o.legs[1].knee,ank:o.legs[0]&&o.legs[0].ank,ank2:o.legs[1]&&o.legs[1].ank};
  return Array.isArray(k)?k:m[k];
}
function render(def,t){
  var p=lerpV(def.a,def.b,t),o=p.front?solveFront(p):solveSide(p);
  var pr=(def.props||[]).concat(p.props||[]);
  var back='',fore='';
  pr.forEach(function(x){
    var oo=o;
    if(o.front){oo={arms:o.arms,legs:o.legs,sh:o.sho[0],hip:o.hips[0],head:o.head};oo.arms=o.arms;}
    var str=drawProp(x,o.front?{arms:o.arms,legs:o.legs,sh:o.sho[0],hip:o.hips[0],head:o.head}:o);
    if(x.front)fore+=str;else back+=str;
  });
  return '<line x1="4" y1="'+GY+'" x2="156" y2="'+GY+'" class="gnd"/>'+back+(o.front?drawFront(o):drawSide(o))+fore;
}

/* ---------- Posições base ---------- */
var UP=[[0,0]];
var STAND={hip:[76,60],torso:90,legs:[{to:[78,109],bend:-1}]};
var SEAT={hip:[66,84],torso:92,legs:[{to:[92,109],bend:-1}]};
var SEATP={t:'bench',x1:42,x2:82,y:88};
function M(base,over){var o=JSON.parse(JSON.stringify(base));for(var k in over)o[k]=over[k];return o;}
function hang(){return {rel:[2,36],relTo:'sh',bend:1};}
var LIE={hip:[92,80],torso:180,legs:[{to:[116,109],bend:-1,fa:0}]};
var LIEB={t:'bench',x1:30,x2:108,y:86};

/* ---------- Exercícios ---------- */
var D={
'supino-reto-barra':{a:M(LIE,{arms:[{to:[60,62],bend:1}]}),b:M(LIE,{arms:[{to:[59,45],bend:1}]}),props:[LIEB,{t:'bar',at:'hand',front:1}]},
'supino-reto-halter':{a:M(LIE,{arms:[{to:[62,64],bend:1}]}),b:M(LIE,{arms:[{to:[59,45],bend:1}]}),props:[LIEB,{t:'db',at:'hand',front:1}]},
'supino-inclinado-halter':{a:{hip:[92,88],torso:145,legs:[{to:[116,109],bend:-1}],arms:[{to:[66,52],bend:1}]},b:{hip:[92,88],torso:145,legs:[{to:[116,109],bend:-1}],arms:[{to:[64,30],bend:1}]},props:[{t:'pad',x:80,y:90,w:24,h:6},{t:'back',from:[86,96],ang:145,len:46},{t:'db',at:'hand',front:1}]},
'supino-maquina':{a:M(SEAT,{arms:[{to:[82,48],bend:-1}]}),b:M(SEAT,{arms:[{to:[99,48],bend:-1}]}),props:[SEATP,{t:'back',from:[58,88],ang:94,len:40},{t:'lever',from:[128,48],to:'hand'},{t:'post',x:128,y1:20}]},
'crucifixo-maquina':{a:{front:1,sy:46,hy:80,arm:{to:[122,32],bend:-1},leg:{knee:[92,86]}},b:{front:1,sy:46,hy:80,arm:{to:[88,38],bend:-1},leg:{knee:[92,86]}},props:[{t:'pad',x:62,y:40,w:36,h:44},{t:'pad',x:58,y:84,w:44,h:6},{t:'handle',at:'hand',front:1},{t:'handle',at:'hand2',front:1}]},
'crossover':{a:{front:1,sy:26,hy:60,arm:{to:[116,22],bend:1},leg:{ang:6}},b:{front:1,sy:26,hy:60,arm:{to:[86,62],bend:1},leg:{ang:6}},props:[{t:'cable',from:[150,-6],to:'hand'},{t:'cable',from:[10,-6],to:'hand2'},{t:'post',x:150},{t:'post',x:10}]},
'flexao':{a:{hip:[95.2,99.2],shp:[62,92],legs:[{to:[136,108],bend:1,fa:-60}],arms:[{to:[62,110],bend:-1}]},b:{hip:[91,87.9],shp:[60,74],legs:[{to:[136,108],bend:1,fa:-60}],arms:[{to:[62,110],bend:-1}]},props:[]},
'puxada-frontal':{a:M(SEAT,{torso:96,arms:[{to:[66,10],bend:-1}]}),b:M(SEAT,{torso:96,arms:[{to:[72,44],bend:-1}]}),props:[SEATP,{t:'pad',x:84,y:72,w:16,h:7},{t:'cable',from:[68,-14],to:'hand'}]},
'remada-curvada':{a:{hip:[70,62],torso:28,legs:[{to:[88,109],bend:-1}],arms:[{to:[100,82],bend:1}]},b:{hip:[70,62],torso:28,legs:[{to:[88,109],bend:-1}],arms:[{to:[84,64],bend:-1}]},props:[{t:'bar',at:'hand',front:1}]},
'remada-baixa':{a:{hip:[50,92],torso:88,legs:[{to:[100,96],bend:-1,fa:80}],arms:[{to:[86,60],bend:1}]},b:{hip:[50,92],torso:92,legs:[{to:[100,96],bend:-1,fa:80}],arms:[{to:[66,68],bend:1}]},props:[{t:'pad',x:30,y:96,w:36,h:6},{t:'pad',x:104,y:84,w:5,h:26},{t:'cable',from:[150,72],to:'hand'}]},
'remada-unilateral':{a:{hip:[60,66],torso:6,legs:[{to:[74,109],bend:-1},{to:[34,86],bend:-1,far:1,fa:180}],arms:[{to:[95,97],bend:1},{to:[98,88],bend:1,far:1}]},b:{hip:[60,66],torso:6,legs:[{to:[74,109],bend:-1},{to:[34,86],bend:-1,far:1,fa:180}],arms:[{to:[80,70],bend:-1},{to:[98,88],bend:1,far:1}]},props:[{t:'bench',x1:24,x2:110,y:88},{t:'db',at:'hand',front:1}]},
'barra-fixa':{a:{front:1,sy:46,hy:80,arm:{to:[102,10],bend:1},leg:{ang:3}},b:{front:1,sy:24,hy:58,arm:{to:[102,10],bend:1},leg:{ang:3}},props:[{t:'pull',x1:30,x2:130,y:10}]},
'levantamento-terra':{a:{hip:[62,86],torso:35,legs:[{to:[84,109],bend:-1}],arms:[{to:[88,103],bend:1}]},b:{hip:[76,60],torso:90,legs:[{to:[84,109],bend:-1}],arms:[{to:[80,62],bend:1}]},props:[{t:'bar',at:'hand',front:1}]},
'pulldown-braco-reto':{a:{hip:[72,60],torso:78,legs:[{to:[80,109],bend:-1}],arms:[{ang:[50,50]}]},b:{hip:[72,60],torso:78,legs:[{to:[80,109],bend:-1}],arms:[{ang:[-72,-72]}]},props:[{t:'cable',from:[140,-8],to:'hand'},{t:'post',x:140}]},
'desenv-halter':{a:M(SEAT,{arms:[{to:[80,46],bend:1}]}),b:M(SEAT,{arms:[{to:[68,14],bend:1}]}),props:[SEATP,{t:'back',from:[58,88],ang:94,len:42},{t:'db',at:'hand',front:1}]},
'desenv-barra':{a:M(STAND,{arms:[{to:[84,28],bend:1}]}),b:M(STAND,{arms:[{to:[79,-9],bend:1}]}),props:[{t:'bar',at:'hand',front:1}]},
'elev-lateral':{a:{front:1,sy:26,hy:60,arm:{ang:[12,12]},leg:{ang:4}},b:{front:1,sy:26,hy:60,arm:{ang:[86,86]},leg:{ang:4}},props:[{t:'db',at:'hand,hand2',front:1}]},
'elev-lateral-cabo':{a:{front:1,sy:26,hy:60,armR:{ang:[14,14]},armL:{ang:[18,40]},leg:{ang:4}},b:{front:1,sy:26,hy:60,armR:{ang:[86,86]},armL:{ang:[18,40]},leg:{ang:4}},props:[{t:'cable',from:[18,108],to:'hand'},{t:'post',x:18,y1:60}]},
'crucifixo-inverso':{a:{front:1,sy:46,hy:80,arm:{to:[90,42],bend:-1},leg:{knee:[92,86]}},b:{front:1,sy:46,hy:80,arm:{to:[124,40],bend:-1},leg:{knee:[92,86]}},props:[{t:'pad',x:58,y:84,w:44,h:6},{t:'handle',at:'hand',front:1},{t:'handle',at:'hand2',front:1}]},
'face-pull':{a:M(STAND,{arms:[{to:[110,32],bend:1}]}),b:M(STAND,{arms:[{to:[88,20],bend:-1}]}),props:[{t:'cable',from:[150,28],to:'hand'},{t:'post',x:150}]},
'rosca-direta':{a:M(STAND,{arms:[{ang:[-92,-90]}]}),b:M(STAND,{arms:[{ang:[-92,100]}]}),props:[{t:'bar',at:'hand',front:1}]},
'rosca-alternada':{a:M(STAND,{arms:[{ang:[-92,-90]},{ang:[-92,100],far:1}]}),b:M(STAND,{arms:[{ang:[-92,100]},{ang:[-92,-90],far:1}]}),props:[{t:'db',at:'hand,hand2',front:1}]},
'rosca-martelo':{a:M(STAND,{arms:[{ang:[-92,-90]},{ang:[-92,-90],far:1}]}),b:M(STAND,{arms:[{ang:[-92,96]},{ang:[-92,96],far:1}]}),props:[{t:'db',at:'hand,hand2',front:1}]},
'rosca-scott':{a:M(SEAT,{torso:84,arms:[{ang:[-38,-42]}]}),b:M(SEAT,{torso:84,arms:[{ang:[-38,78]}]}),props:[SEATP,{t:'back',from:[74,66],ang:-38,len:24},{t:'bar',at:'hand',front:1}]},
'rosca-cabo':{a:M(STAND,{arms:[{ang:[-92,-80]}]}),b:M(STAND,{arms:[{ang:[-92,100]}]}),props:[{t:'cable',from:[128,108],to:'hand'},{t:'post',x:128,y1:70}]},
'triceps-corda':{a:M(STAND,{torso:84,arms:[{ang:[-100,24]}]}),b:M(STAND,{torso:84,arms:[{ang:[-100,-86]}]}),props:[{t:'cable',from:[112,-10],to:'hand'},{t:'post',x:120}]},
'triceps-testa':{a:M(LIE,{arms:[{ang:[100,186]}]}),b:M(LIE,{arms:[{ang:[100,100]}]}),props:[LIEB,{t:'bar',at:'hand',front:1}]},
'triceps-frances':{a:M(SEAT,{arms:[{ang:[96,262]}]}),b:M(SEAT,{arms:[{ang:[96,94]}]}),props:[SEATP,{t:'db',at:'hand',front:1}]},
'mergulho':{a:{hip:[58,98],torso:94,legs:[{to:[122,108],bend:1,fa:20}],arms:[{to:[48,82],bend:1}]},b:{hip:[56,80],torso:92,legs:[{to:[122,108],bend:1,fa:20}],arms:[{to:[48,82],bend:1}]},props:[{t:'bench',x1:14,x2:52,y:82}]},
'triceps-maquina':{a:M(SEAT,{arms:[{ang:[-96,12]}]}),b:M(SEAT,{arms:[{ang:[-96,-80]}]}),props:[SEATP,{t:'back',from:[58,88],ang:94,len:40},{t:'lever',from:[110,20],to:'hand'}]},
'agachamento':{a:{hip:[76,60],torso:88,legs:[{to:[84,109],bend:-1}],arms:[{rel:[-2,6],bend:1}]},b:{hip:[56,88],torso:50,legs:[{to:[84,109],bend:-1}],arms:[{rel:[-2,6],bend:1}]},props:[{t:'bar',at:'sh',off:[-7,3],front:1}]},
'agachamento-pc':{a:{hip:[76,60],torso:88,legs:[{to:[84,109],bend:-1}],arms:[{ang:[-6,-6]}]},b:{hip:[56,88],torso:56,legs:[{to:[84,109],bend:-1}],arms:[{ang:[8,8]}]},props:[]},
'leg-press':{a:{hip:[62,90],torso:150,legs:[{to:[86,66],bend:-1,ftRel:90}],arms:[{to:[68,94],bend:1}]},b:{hip:[62,90],torso:150,legs:[{to:[99,52],bend:-1,ftRel:90}],arms:[{to:[68,94],bend:1}]},props:[{t:'back',from:[66,98],ang:150,len:44},{t:'platform',at:'ank',ang:132,off:[3,-2]},{t:'post',x:140,y1:10}]},
'hack':{a:{hip:[76,60],torso:76,legs:[{to:[92,109],bend:-1}],arms:[{rel:[6,2],bend:1}]},b:{hip:[58,88],torso:64,legs:[{to:[92,109],bend:-1}],arms:[{rel:[6,2],bend:1}]},props:[{t:'pad',x:96,y:104,w:22,h:8}]},
'cadeira-extensora':{a:M(SEAT,{torso:98,legs:[{ang:[0,-90],fa:0}]}),b:M(SEAT,{torso:98,legs:[{ang:[0,-6],fa:84}]}),props:[SEATP,{t:'back',from:[58,88],ang:98,len:40},{t:'roller',at:'ank',off:[2,-3]}]},
'agachamento-bulgaro':{a:{hip:[70,58],torso:88,legs:[{to:[98,109],bend:-1},{to:[40,80],bend:1,fa:186,far:1}],arms:[hang()]},b:{hip:[70,80],torso:82,legs:[{to:[98,109],bend:-1},{to:[40,80],bend:1,fa:186,far:1}],arms:[hang()]},props:[{t:'bench',x1:16,x2:46,y:84},{t:'db',at:'hand',front:1}]},
'afundo':{a:{hip:[76,58],torso:90,legs:[{to:[100,109],bend:-1},{to:[52,104],bend:1,fa:-35,far:1}],arms:[hang()]},b:{hip:[76,82],torso:90,legs:[{to:[100,109],bend:-1},{to:[52,104],bend:1,fa:-35,far:1}],arms:[hang()]},props:[{t:'db',at:'hand',front:1}]},
'afundo-pc':{a:{hip:[76,58],torso:90,legs:[{to:[100,109],bend:-1},{to:[52,104],bend:1,fa:-35,far:1}],arms:[{rel:[6,30],relTo:'sh',bend:1}]},b:{hip:[76,82],torso:90,legs:[{to:[100,109],bend:-1},{to:[52,104],bend:1,fa:-35,far:1}],arms:[{rel:[6,30],relTo:'sh',bend:1}]},props:[]},
'stiff':{a:{hip:[76,60],torso:88,legs:[{to:[80,109],bend:-1}],arms:[{ang:[-90,-90]}]},b:{hip:[60,62],torso:20,legs:[{to:[80,109],bend:-1}],arms:[{ang:[-90,-90]}]},props:[{t:'bar',at:'hand',front:1}]},
'stiff-halter':{a:{hip:[76,60],torso:88,legs:[{to:[80,109],bend:-1}],arms:[{ang:[-90,-90]}]},b:{hip:[60,62],torso:20,legs:[{to:[80,109],bend:-1}],arms:[{ang:[-90,-90]}]},props:[{t:'db',at:'hand',front:1}]},
'mesa-flexora':{a:{hip:[88,80],torso:180,legs:[{ang:[0,0],fa:-90}],arms:[{to:[40,92],bend:-1}]},b:{hip:[88,80],torso:180,legs:[{ang:[0,104],fa:14}],arms:[{to:[40,92],bend:-1}]},props:[{t:'bench',x1:30,x2:120,y:86},{t:'roller',at:'ank',off:[0,-5]}]},
'cadeira-flexora':{a:M(SEAT,{torso:100,legs:[{ang:[0,-8],fa:82}]}),b:M(SEAT,{torso:100,legs:[{ang:[0,-112],fa:-22}]}),props:[SEATP,{t:'back',from:[58,88],ang:100,len:40},{t:'pad',x:80,y:74,w:18,h:6},{t:'roller',at:'ank',off:[0,4]}]},
'elevacao-pelvica':{a:{hip:[78,100],shp:[54,80],legs:[{to:[102,109],bend:-1}],arms:[{to:[78,92],bend:1}]},b:{hip:[88,80],shp:[54,80],legs:[{to:[102,109],bend:-1}],arms:[{to:[88,74],bend:1}]},props:[{t:'bench',x1:16,x2:56,y:84},{t:'bar',at:'hip',off:[0,-8],front:1}]},
'ponte-gluteo':{a:{hip:[80,106],shp:[48,104],legs:[{to:[98,109],bend:-1}],arms:[{to:[74,108],bend:1}]},b:{hip:[84,86],shp:[48,104],legs:[{to:[98,109],bend:-1}],arms:[{to:[74,108],bend:1}]},props:[{t:'mat',x1:22,x2:130}]},
'abdutora':{a:{front:1,sy:46,hy:80,arm:{to:[104,82],bend:1},leg:{knee:[90,88]}},b:{front:1,sy:46,hy:80,arm:{to:[104,82],bend:1},leg:{knee:[108,86],shinOut:4}},props:[{t:'pad',x:58,y:84,w:44,h:6},{t:'pad',x:58,y:38,w:44,h:44},{t:'roller',at:'knee',off:[4,0],front:1},{t:'roller',at:'knee2',off:[-4,0],front:1}]},
'coice-cabo':{a:{hip:[66,62],torso:70,legs:[{to:[74,109],bend:-1,far:1},{to:[64,102],bend:1}],arms:[{to:[106,40],bend:1}]},b:{hip:[66,62],torso:70,legs:[{to:[74,109],bend:-1,far:1},{to:[22,82],bend:1}],arms:[{to:[106,40],bend:1}]},props:[{t:'cable',from:[118,106],to:'ank2'},{t:'post',x:118,y1:20}]},
'panturrilha-pe':{a:{hip:[78,58],torso:90,legs:[{to:[80,107],bend:-1,fa:16}],arms:[{rel:[6,2],bend:1}]},b:{hip:[78,48],torso:90,legs:[{to:[80,97],bend:-1,fa:-44}],arms:[{rel:[6,2],bend:1}]},props:[{t:'step',x1:84,x2:104,y:104}]},
'panturrilha-pc':{a:{hip:[76,58],torso:90,legs:[{to:[78,107],bend:-1,fa:16}],arms:[{to:[112,40],bend:1}]},b:{hip:[76,48],torso:90,legs:[{to:[78,97],bend:-1,fa:-44}],arms:[{to:[112,30],bend:1}]},props:[{t:'step',x1:82,x2:100,y:104},{t:'wall',x:116}]},
'panturrilha-sentado':{a:M(SEAT,{legs:[{to:[92,105],bend:-1,fa:16}]}),b:M(SEAT,{legs:[{to:[92,98],bend:-1,fa:-40}]}),props:[SEATP,{t:'step',x1:94,x2:110,y:104},{t:'pad',x:82,y:74,w:20,h:6}]},
'prancha':{a:{hip:[87.2,96.1],shp:[54,89],legs:[{to:[138,107],bend:1,fa:-60}],arms:[{ang:[-90,180]}]},b:{hip:[87.2,95.1],shp:[54,88],legs:[{to:[138,107],bend:1,fa:-60}],arms:[{ang:[-90,180]}]},props:[{t:'mat',x1:30,x2:140}]},
'abdominal-cabo':{a:{hip:[70,82],torso:76,legs:[{ang:[-90,180]}],arms:[{rel:[8,-4],bend:-1}]},b:{hip:[70,82],torso:12,nod:-40,legs:[{ang:[-90,180]}],arms:[{rel:[8,-4],bend:-1}]},props:[{t:'cable',from:[96,-14],to:'hand'},{t:'mat',x1:30,x2:110}]},
'elevacao-pernas':{a:{hip:[84,104],torso:180,legs:[{ang:[0,0],fa:90}],arms:[{to:[72,108],bend:1}]},b:{hip:[84,104],torso:180,legs:[{ang:[84,84],fa:174}],arms:[{to:[72,108],bend:1}]},props:[{t:'mat',x1:26,x2:146}]},
'abdominal-maquina':{a:M(SEAT,{torso:96,arms:[{rel:[8,4],bend:-1}]}),b:M(SEAT,{torso:58,nod:-26,arms:[{rel:[8,4],bend:-1}]}),props:[SEATP]},
'abdominal-solo':{a:{hip:[82,104],torso:176,legs:[{to:[106,109],bend:-1}],arms:[{rel:[-4,-6],bend:1}]},b:{hip:[82,104],torso:146,nod:-14,legs:[{to:[106,109],bend:-1}],arms:[{rel:[-4,-6],bend:1}]},props:[{t:'mat',x1:26,x2:130}]},
'superman':{a:{hip:[86,104],torso:180,legs:[{ang:[0,0],fa:-90}],arms:[{ang:[180,180]}]},b:{hip:[86,104],torso:168,legs:[{ang:[10,10],fa:-80}],arms:[{ang:[166,166]}]},props:[{t:'mat',x1:6,x2:146}]},
'flexao-joelhos':{a:{hip:[87,102.2],shp:[54,94],legs:[{kneeTo:[110,108],shinAng:28,fa:28}],arms:[{to:[56,110],bend:-1}]},b:{hip:[83.3,92.3],shp:[54,75],legs:[{kneeTo:[110,108],shinAng:28,fa:28}],arms:[{to:[56,110],bend:-1}]},props:[{t:'mat',x1:40,x2:140}]},
'subida-banco':{a:{hip:[72,60],torso:88,legs:[{to:[100,82],bend:-1},{to:[66,109],bend:-1,far:1}],arms:[hang()]},b:{hip:[98,34],torso:90,legs:[{to:[100,82],bend:-1},{to:[96,62],bend:-1,far:1,fa:-30}],arms:[hang()]},props:[{t:'box',x1:86,x2:122,y:84}]},
'flexao-pike':{a:{hip:[94,70],shp:[68,94],legs:[{to:[124,108],bend:1,fa:-50}],arms:[{to:[60,110],bend:-1}],nod:0},b:{hip:[100,60],shp:[74,82],legs:[{to:[124,108],bend:1,fa:-50}],arms:[{to:[60,110],bend:-1}]},props:[]},
'escalador':{a:{hip:[94,84],shp:[60,74],legs:[{to:[126,106],bend:1,fa:-60},{to:[84,104],bend:1,fa:-40,far:1}],arms:[{to:[60,110],bend:-1}]},b:{hip:[94,84],shp:[60,74],legs:[{to:[84,104],bend:1,fa:-40},{to:[126,106],bend:1,fa:-60,far:1}],arms:[{to:[60,110],bend:-1}]},props:[]},
'polichinelo':{a:{front:1,sy:26,hy:60,arm:{ang:[14,14]},leg:{ang:3}},b:{front:1,sy:22,hy:56,arm:{ang:[164,164]},leg:{ang:16}},props:[]},
'prancha-lateral':null
};
delete D['prancha-lateral'];


/* ---------- Passo a passo ---------- */
var S={
'supino-reto-barra':['Deite no banco com os olhos abaixo da barra e os pés firmes no chão.','Segure a barra um pouco mais aberto que os ombros e tire do suporte com os braços estendidos.','Desça controlando até encostar de leve no meio do peito.','Empurre de volta até estender os braços, sem tirar o quadril do banco.'],
'supino-reto-halter':['Deite no banco com um halter em cada mão, apoiados nas coxas, e leve-os até o peito ao deitar.','Comece com os braços estendidos acima do peito.','Desça os halteres abrindo os cotovelos a cerca de 45° do corpo.','Empurre de volta, aproximando os halteres no alto.'],
'supino-inclinado-halter':['Ajuste o encosto entre 30° e 45° e sente com os halteres nas coxas.','Deite e posicione os halteres na altura do peito.','Empurre para cima até estender os braços.','Desça devagar até sentir o alongamento na parte de cima do peito.'],
'supino-maquina':['Ajuste o banco para as pegadas ficarem na altura do meio do peito.','Encoste as costas e segure as pegadas.','Empurre até quase estender os cotovelos.','Volte devagar, sem deixar o peso bater.'],
'crucifixo-maquina':['Ajuste o banco para os braços ficarem na altura dos ombros.','Apoie os antebraços ou segure as pegadas com os cotovelos levemente dobrados.','Feche os braços à frente do peito, contraindo o peitoral.','Abra devagar até sentir o alongamento no peito.'],
'crossover':['Posicione as polias no alto e segure uma pegada em cada mão.','Dê um passo à frente, incline levemente o tronco e mantenha os cotovelos semiflexionados.','Traga as mãos para baixo e para o centro, à frente do quadril.','Volte abrindo os braços devagar.'],
'flexao':['Apoie as mãos no chão um pouco mais abertas que os ombros e estenda as pernas.','Mantenha o corpo reto da cabeça aos calcanhares, com o abdômen firme.','Desça o peito até perto do chão, cotovelos a cerca de 45°.','Empurre o chão e volte à posição inicial.'],
'flexao-joelhos':['Apoie as mãos no chão e os joelhos atrás, num colchonete.','Mantenha o corpo reto dos ombros aos joelhos.','Desça o peito até perto do chão.','Empurre de volta, sem deixar o quadril cair.'],
'puxada-frontal':['Sente com as coxas presas sob o apoio e segure a barra com pegada aberta.','Incline o tronco levemente para trás e mantenha o peito aberto.','Puxe a barra até a parte de cima do peito, levando os cotovelos para baixo.','Suba devagar até estender os braços.'],
'remada-curvada':['Segure a barra com as mãos na largura dos ombros.','Dobre levemente os joelhos e incline o tronco à frente com a coluna reta.','Puxe a barra em direção ao umbigo, levando os cotovelos para trás.','Desça controlando, sem arredondar as costas.'],
'remada-baixa':['Sente com os pés apoiados na plataforma e os joelhos levemente dobrados.','Segure a pegada com os braços estendidos e o tronco ereto.','Puxe até o abdômen, juntando as escápulas.','Volte estendendo os braços, sem balançar o tronco.'],
'remada-unilateral':['Apoie um joelho e a mão do mesmo lado no banco.','Com o outro braço, segure o halter com o braço estendido e as costas retas.','Puxe o halter até a lateral do abdômen, cotovelo junto ao corpo.','Desça devagar e troque de lado ao terminar a série.'],
'barra-fixa':['Segure a barra com as palmas para a frente, um pouco mais aberto que os ombros.','Comece pendurado, com os braços estendidos.','Puxe até o queixo passar a barra, levando o peito em direção a ela.','Desça devagar até estender os braços.'],
'levantamento-terra':['Fique com os pés na largura do quadril e a barra sobre o meio dos pés.','Dobre quadril e joelhos e segure a barra com a coluna reta.','Empurre o chão e estenda quadril e joelhos juntos, com a barra rente às pernas.','Desça pelo mesmo caminho, levando o quadril para trás primeiro.'],
'pulldown-braco-reto':['Fique de frente para a polia alta, segurando a barra com os braços estendidos.','Incline levemente o tronco à frente.','Com os braços quase retos, puxe a barra até as coxas.','Volte devagar até a altura dos olhos.'],
'desenv-halter':['Sente com as costas apoiadas e os halteres na altura dos ombros.','Mantenha os punhos sobre os cotovelos.','Empurre os halteres para cima até quase estender os braços.','Desça devagar até a altura das orelhas.'],
'desenv-barra':['Em pé, segure a barra na altura da clavícula, mãos pouco além dos ombros.','Contraia o abdômen e os glúteos.','Empurre a barra acima da cabeça, passando o rosto.','Desça controlando até a clavícula.'],
'elev-lateral':['Em pé, segure um halter em cada mão ao lado do corpo.','Com os cotovelos levemente dobrados, eleve os braços para os lados.','Pare quando as mãos chegarem à altura dos ombros.','Desça devagar.'],
'elev-lateral-cabo':['Fique de lado para a polia baixa e segure a pegada com a mão mais distante.','Com o cotovelo levemente dobrado, eleve o braço para o lado.','Suba até a altura do ombro.','Volte devagar e troque de lado ao terminar a série.'],
'crucifixo-inverso':['Sente de frente para o encosto e segure as pegadas à frente do corpo.','Com os cotovelos levemente dobrados, abra os braços para trás.','Junte as escápulas no fim do movimento.','Volte devagar à frente.'],
'face-pull':['Coloque a polia na altura do rosto e use a corda.','Segure com as palmas para baixo e dê um passo para trás.','Puxe a corda em direção ao rosto, abrindo as mãos e levando os cotovelos para cima.','Volte estendendo os braços devagar.'],
'rosca-direta':['Em pé, segure a barra com as palmas para cima e os cotovelos junto ao corpo.','Suba a barra dobrando os cotovelos, sem balançar o tronco.','Contraia o bíceps no alto.','Desça devagar até estender os braços.'],
'rosca-alternada':['Em pé, segure um halter em cada mão ao lado do corpo.','Suba um halter girando a palma para cima, cotovelo parado.','Desça devagar e suba o outro.','Alterne os braços até completar as repetições.'],
'rosca-martelo':['Em pé, segure os halteres com as palmas viradas para o corpo.','Suba os halteres mantendo essa pegada, cotovelos junto ao corpo.','Pare quando os antebraços passarem da horizontal.','Desça devagar.'],
'rosca-scott':['Sente e apoie a parte de trás dos braços no apoio inclinado.','Segure a barra com as palmas para cima.','Suba dobrando os cotovelos, sem tirar os braços do apoio.','Desça devagar, sem travar os cotovelos no final.'],
'rosca-cabo':['Fique de frente para a polia baixa e segure a barra com as palmas para cima.','Mantenha os cotovelos junto ao corpo.','Suba a barra até perto dos ombros.','Desça devagar.'],
'triceps-corda':['Fique de frente para a polia alta e segure a corda.','Cole os cotovelos ao lado do corpo.','Empurre a corda para baixo até estender os braços, abrindo as pontas no final.','Volte até os antebraços passarem da horizontal.'],
'triceps-testa':['Deite no banco segurando a barra com os braços estendidos acima do peito.','Mantenha os cotovelos apontados para cima.','Dobre os cotovelos e desça a barra em direção à testa.','Estenda os braços de volta.'],
'triceps-frances':['Sente com as costas retas e segure um halter com as duas mãos acima da cabeça.','Mantenha os cotovelos apontados para cima, perto da cabeça.','Desça o halter atrás da cabeça dobrando os cotovelos.','Estenda os braços de volta.'],
'mergulho':['Apoie as mãos na borda de um banco ou cadeira firme, atrás do corpo.','Estique as pernas à frente, com os calcanhares no chão.','Desça dobrando os cotovelos até cerca de 90°.','Empurre de volta até estender os braços.'],
'triceps-maquina':['Sente e ajuste o aparelho para os cotovelos ficarem alinhados com o eixo.','Segure as pegadas com os cotovelos dobrados.','Empurre para baixo até estender os braços.','Volte devagar.'],
'agachamento':['Apoie a barra na parte de cima das costas, pés na largura dos ombros.','Contraia o abdômen e leve o quadril para trás e para baixo.','Desça até as coxas ficarem pelo menos paralelas ao chão, joelhos na direção dos pés.','Suba empurrando o chão.'],
'agachamento-pc':['Fique com os pés na largura dos ombros e os braços à frente.','Leve o quadril para trás e desça como se fosse sentar.','Mantenha o peito aberto e os joelhos na direção dos pés.','Suba empurrando o chão.'],
'leg-press':['Sente com as costas apoiadas e os pés na plataforma, na largura do quadril.','Destrave a plataforma e desça dobrando os joelhos em direção ao peito.','Pare antes do quadril sair do encosto.','Empurre de volta sem travar os joelhos.'],
'hack':['Encoste as costas e os ombros nos apoios, pés à frente na plataforma.','Destrave e desça dobrando os joelhos.','Desça até as coxas ficarem paralelas à plataforma.','Suba empurrando com o pé inteiro.'],
'cadeira-extensora':['Sente com as costas apoiadas e o rolo na frente dos tornozelos.','Alinhe os joelhos com o eixo do aparelho.','Estenda as pernas até ficarem retas.','Desça devagar.'],
'agachamento-bulgaro':['Fique de costas para um banco e apoie o peito de um pé sobre ele.','Com o outro pé à frente, segure os halteres ao lado do corpo.','Desça dobrando o joelho da frente até a coxa ficar paralela ao chão.','Suba empurrando com o pé da frente e troque de perna ao terminar.'],
'afundo':['Em pé, segure um halter em cada mão.','Dê um passo à frente.','Desça até os dois joelhos formarem cerca de 90°, sem o de trás tocar o chão.','Volte empurrando com o pé da frente e alterne as pernas.'],
'afundo-pc':['Em pé, com as mãos na cintura.','Dê um passo à frente.','Desça até os dois joelhos formarem cerca de 90°.','Volte empurrando com o pé da frente e alterne as pernas.'],
'stiff':['Em pé, segure a barra na frente das coxas, joelhos levemente dobrados.','Leve o quadril para trás, mantendo a coluna reta e a barra rente às pernas.','Desça até sentir o alongamento atrás das coxas.','Suba contraindo os glúteos.'],
'stiff-halter':['Em pé, segure um halter em cada mão na frente das coxas.','Leve o quadril para trás com a coluna reta e os joelhos levemente dobrados.','Desça os halteres rente às pernas até sentir o alongamento.','Suba contraindo os glúteos.'],
'mesa-flexora':['Deite de bruços com o rolo logo acima dos calcanhares.','Segure as pegadas e mantenha o quadril no banco.','Dobre os joelhos trazendo os calcanhares em direção aos glúteos.','Desça devagar.'],
'cadeira-flexora':['Sente com o rolo atrás dos tornozelos e trave as coxas sob o apoio.','Alinhe os joelhos com o eixo do aparelho.','Dobre os joelhos puxando o rolo para baixo e para trás.','Volte devagar.'],
'elevacao-pelvica':['Apoie a parte de cima das costas num banco, com a barra sobre o quadril.','Pés no chão, na largura do quadril, joelhos dobrados.','Suba o quadril até o tronco ficar alinhado com as coxas.','Desça controlando.'],
'ponte-gluteo':['Deite de costas com os joelhos dobrados e os pés no chão.','Braços ao lado do corpo.','Suba o quadril contraindo os glúteos, até alinhar ombros, quadril e joelhos.','Desça devagar.'],
'abdutora':['Sente com as costas apoiadas e os apoios do lado de fora dos joelhos.','Segure as pegadas.','Abra as pernas empurrando os apoios para fora.','Volte devagar.'],
'coice-cabo':['Prenda a tornozeleira na polia baixa e fique de frente para o aparelho.','Segure no aparelho e incline levemente o tronco.','Leve a perna para trás e para cima, contraindo o glúteo.','Volte devagar e troque de perna ao terminar.'],
'panturrilha-pe':['Apoie a ponta dos pés na plataforma, com os calcanhares para fora.','Posicione os ombros sob os apoios, joelhos estendidos.','Suba na ponta dos pés o máximo que conseguir.','Desça até sentir o alongamento da panturrilha.'],
'panturrilha-pc':['Apoie a ponta dos pés num degrau e uma mão na parede.','Deixe os calcanhares descerem um pouco.','Suba na ponta dos pés.','Desça devagar. Para ficar mais difícil, faça com uma perna de cada vez.'],
'panturrilha-sentado':['Sente com a ponta dos pés na plataforma e o apoio sobre os joelhos.','Destrave o aparelho.','Suba os calcanhares o máximo possível.','Desça até sentir o alongamento.'],
'prancha':['Apoie os antebraços no chão, cotovelos abaixo dos ombros.','Estenda as pernas e fique na ponta dos pés.','Mantenha o corpo reto, com abdômen e glúteos contraídos.','Segure o tempo combinado respirando normalmente (anote os segundos em Reps).'],
'abdominal-cabo':['Ajoelhe de frente para a polia alta e segure a corda ao lado da cabeça.','Mantenha o quadril parado.','Enrole o tronco para baixo, levando os cotovelos em direção às coxas.','Volte devagar.'],
'elevacao-pernas':['Deite de costas com as mãos ao lado do corpo.','Com as pernas estendidas, eleve-as até ficarem verticais.','Mantenha a lombar encostada no chão.','Desça devagar, sem encostar os pés no chão.'],
'abdominal-maquina':['Sente com os pés presos e segure as pegadas.','Mantenha o quadril parado.','Enrole o tronco à frente contraindo o abdômen.','Volte devagar.'],
'abdominal-solo':['Deite de costas com os joelhos dobrados e as mãos atrás da cabeça.','Sem puxar o pescoço, contraia o abdômen.','Tire os ombros do chão enrolando o tronco.','Desça devagar.'],
'superman':['Deite de bruços com os braços estendidos à frente.','Contraia glúteos e lombar.','Tire braços, peito e pernas do chão ao mesmo tempo.','Segure um segundo no alto e desça devagar.'],
'subida-banco':['Fique de frente para um banco ou degrau firme.','Apoie um pé inteiro sobre ele.','Suba empurrando com essa perna e leve o outro joelho para cima.','Desça controlando e alterne as pernas.'],
'flexao-pike':['Comece na posição de flexão e leve o quadril para cima, formando um V invertido.','Mantenha as pernas o mais estendidas possível.','Dobre os cotovelos e desça a cabeça em direção ao chão, entre as mãos.','Empurre de volta.'],
'escalador':['Comece na posição de flexão, braços estendidos.','Traga um joelho em direção ao peito.','Volte e troque a perna, num ritmo rápido.','Mantenha o quadril baixo e o abdômen firme (anote os segundos ou as repetições).'],
'polichinelo':['Em pé, com os pés juntos e os braços ao lado do corpo.','Salte abrindo as pernas e levando os braços acima da cabeça.','Salte de volta à posição inicial.','Mantenha um ritmo constante.']
};

var cache={};
function svg(id,t,cls){
  var d=D[id];if(!d)return '';
  var key=id+'|'+t;
  var inner=(t===0||t===1)?(cache[key]||(cache[key]=render(d,t))):render(d,t);
  return '<svg class="'+(cls||'demo')+'" viewBox="0 -20 160 134" role="img" aria-hidden="true">'+inner+'</svg>';
}
window.ENGEFIT_DEMOS={has:function(id){return !!D[id];},svg:svg,steps:function(id){return S[id]||null;},ids:Object.keys(D)};
})();
