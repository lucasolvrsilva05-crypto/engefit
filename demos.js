/* ENGEFIT · demonstrações dos exercícios
   Ilustrações próprias, desenhadas por código: boneco cinza (vista lateral, frontal ou de costas)
   com os músculos trabalhados em vermelho, indo da posição inicial (a) à final (b) e volta. Sem imagens de terceiros. */
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

/* ---------- Desenho: boneco cinza com músculos em vermelho ---------- */
function f(n){return Math.round(n*100)/100;}
var OUT='#070b14',SK=['#c7cdd6','#9ea7b4','#77808f'],SKF=['#8d96a4','#77808e','#5d6573'];
var RED1='#e0283f',RED2='#f2788a',RED2F='#b85465',RED1F='#a8233a';
var uid=0;
function sub(a,b){return [a[0]-b[0],a[1]-b[1]];}
function mul(a,k){return [a[0]*k,a[1]*k];}
function len(a){return Math.hypot(a[0],a[1]);}
function nrm(a){var l=len(a)||1;return [a[0]/l,a[1]/l];}
function perp(a){return [-a[1],a[0]];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1];}
function lp(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
function P(p){return f(p[0])+','+f(p[1]);}
function path(d,fill,stroke,sw,extra){return '<path d="'+d+'" fill="'+(fill||'none')+'"'+(stroke?' stroke="'+stroke+'" stroke-width="'+(sw||0.5)+'" stroke-linejoin="round" stroke-linecap="round"':'')+(extra||'')+'/>';}
/* curva suave fechada por pontos (Catmull-Rom -> Bézier) */
function smooth(ps,closed){
  var n=ps.length,d='M'+P(ps[0]);
  for(var i=0;i<(closed?n:n-1);i++){
    var p0=ps[(i-1+n)%n],p1=ps[i],p2=ps[(i+1)%n],p3=ps[(i+2)%n];
    if(!closed){p0=ps[Math.max(i-1,0)];p3=ps[Math.min(i+2,n-1)];}
    var c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];
    d+=' C'+P(c1)+' '+P(c2)+' '+P(p2);
  }
  return d+(closed?' Z':'');
}
function limbD(A,B,wA,wB,bA,bB){
  // membro afunilado com ventre muscular; bA: volume do lado +p, bB: do lado -p
  var u=nrm(sub(B,A)),p=perp(u),m=lp(A,B,0.42),w=(wA+wB)/4;
  var a1=add(A,mul(p,wA/2)),b1=add(B,mul(p,wB/2)),b2=sub(B,mul(p,wB/2)),a2=sub(A,mul(p,wA/2));
  var c1=add(m,mul(p,w+(bA||0))),c2=sub(m,mul(p,w+(bB||0)));
  return 'M'+P(a1)+' Q'+P(c1)+' '+P(b1)+' A'+f(wB/2)+' '+f(wB/2)+' 0 0 0 '+P(b2)+' Q'+P(c2)+' '+P(a2)+' A'+f(wA/2)+' '+f(wA/2)+' 0 0 0 '+P(a1)+' Z';
}
/* faixa de músculo sobre um lado do membro (recortada pelo contorno) */
function band(A,B,side,t0,t1,w,inner){
  var u=nrm(sub(B,A)),L=len(sub(B,A)),q0=add(A,mul(u,L*t0)),q1=add(A,mul(u,L*t1)),qm=lp(q0,q1,0.5),i=inner==null?0.15:inner;
  var o0=add(q0,mul(side,-w*i)),o1=add(q1,mul(side,-w*i));
  return 'M'+P(o0)+' Q'+P(add(qm,mul(side,w*1.6)))+' '+P(o1)+' Q'+P(add(qm,mul(side,-w*i*0.6)))+' '+P(o0)+' Z';
}
function clipG(d,inner){var id='dc'+(++uid);return {def:'<clipPath id="'+id+'"><path d="'+d+'"/></clipPath>',g:'<g clip-path="url(#'+id+')">'+inner+'</g>'};}
function sideOf(u,dir){var p=perp(u);return dot(p,dir)>=0?p:mul(p,-1);}
function anterior(A,B,C,fall,flexAnt){
  var u=nrm(sub(B,A)),p=perp(u),dd=C?nrm(sub(C,B)):null,s=dd?dot(dd,p):0;
  if(Math.abs(s)>0.14){var side=s>0?p:mul(p,-1);return flexAnt?side:mul(side,-1);}
  return sideOf(u,fall);
}
function mcol(m,set,far){return set.p[m]?(far?RED1F:RED1):set.s[m]?(far?RED2F:RED2):null;}

function drawLeg(H,l,ms,far,nT,defs){
  var c=far?SKF:SK,s='',th=[9.2,6.6],sh=[6.4,3.6];
  var toeDir=nrm(sub(l.toe,l.ank));
  var aT=anterior(H,l.knee,l.ank,toeDir,false);
  var aS=sideOf(nrm(sub(l.ank,l.knee)),toeDir);
  if(Math.abs(dot(nrm(sub(l.ank,l.knee)),toeDir))>0.93)aS=sideOf(nrm(sub(l.ank,l.knee)),aT);
  var uT=nrm(sub(l.knee,H)),pT=perp(uT),bq=dot(pT,aT)>0;
  var tD=limbD(H,l.knee,th[0],th[1],bq?1.4:1,bq?1:1.4);
  var uS=nrm(sub(l.ank,l.knee)),pS=perp(uS),bc=dot(pS,aS)<0;
  var sD=limbD(l.knee,l.ank,sh[0],sh[1],bc?2:0.4,bc?0.4:2);
  // pé
  var fu=toeDir,fp=sideOf(fu,mul(aS,-1)),heel=add(add(l.ank,mul(fu,-2.4)),mul(fp,1.2)),toe=l.toe;
  var fD='M'+P(add(l.ank,mul(aS,1.8)))+' Q'+P(add(lp(l.ank,toe,0.55),mul(fp,-1.9)))+' '+P(add(toe,mul(fp,-0.2)))+' Q'+P(add(toe,mul(fp,1.4)))+' '+P(add(lp(l.ank,toe,0.7),mul(fp,1.9)))+' L'+P(add(heel,mul(fp,0.8)))+' Q'+P(add(heel,mul(fu,-1.2)))+' '+P(add(l.ank,mul(aS,-1.8)))+' Z';
  s+=path(fD,c[0],OUT,0.45);
  // canela
  s+=path(sD,c[0],OUT,0.5);
  var mc=mcol('calves',ms,far),ins='';
  ins+=path(band(l.knee,l.ank,mul(aS,-1),0.06,0.95,sh[0]*0.55,0.5),c[1],null);
  if(mc)ins+=path(band(l.knee,l.ank,mul(aS,-1),0.08,0.7,sh[0]*0.62,0.05),mc,OUT,0.3);
  var k=clipG(sD,ins);defs.push(k.def);s+=k.g+path(sD,null,OUT,0.5);
  // coxa
  s+=path(tD,c[0],OUT,0.5);
  ins=path(band(H,l.knee,mul(aT,-1),0.04,0.98,th[0]*0.5,0.55),c[1],null);
  var q=mcol('quads',ms,far),hm=mcol('hamstrings',ms,far),ad=mcol('adductors',ms,far);
  if(hm)ins+=path(band(H,l.knee,mul(aT,-1),0.12,0.9,th[0]*0.5,0.02),hm,OUT,0.3);
  if(q){ins+=path(band(H,l.knee,aT,0.1,0.92,th[0]*0.52,0.05),q,OUT,0.3);
    ins+=path(band(H,l.knee,aT,0.62,0.94,th[0]*0.3,0.3),far?'#8f1d31':'#b81a32',null,0,' opacity=".8"');
    ins+=path('M'+P(add(lp(H,l.knee,0.2),mul(aT,th[0]*0.25)))+' Q'+P(add(lp(H,l.knee,0.55),mul(aT,th[0]*0.42)))+' '+P(add(lp(H,l.knee,0.86),mul(aT,th[1]*0.3))),null,'#ffb3bd',0.35,' opacity=".6"');}
  if(ad&&!q)ins+=path(band(H,l.knee,aT,0.1,0.6,th[0]*0.4,0.1),ad,OUT,0.3);
  k=clipG(tD,ins);defs.push(k.def);s+=k.g+path(tD,null,OUT,0.5);
  s+=path('M'+P(add(l.knee,mul(aT,th[1]*0.36)))+' q'+P(mul(add(uT,aT),0.9))+' '+P(mul(uS,1.6)),null,c[2],0.4);
  return s;
}
function drawArm(S,a,ms,far,nT,defs){
  var c=far?SKF:SK,s='',ua=[5.6,4.2],fa=[4.4,2.8];
  var aU=anterior(S,a.elb,a.hand,nT,true),uF=nrm(sub(a.hand,a.elb)),aF=sideOf(uF,aU);
  var uU=nrm(sub(a.elb,S)),pU=perp(uU),bb=dot(pU,aU)>0;
  var uD=limbD(S,a.elb,ua[0],ua[1],bb?1.1:0.9,bb?0.9:1.1),fD=limbD(a.elb,a.hand,fa[0],fa[1],dot(perp(uF),aF)>0?0.9:0.3,dot(perp(uF),aF)>0?0.3:0.9);
  // antebraço e mão
  s+=path(fD,c[0],OUT,0.45);
  var ins=path(band(a.elb,a.hand,mul(aF,-1),0.05,0.95,fa[0]*0.45,0.5),c[1],null),fm=mcol('forearm',ms,far);
  if(fm)ins+=path(band(a.elb,a.hand,aF,0.05,0.7,fa[0]*0.55,0.1),fm,OUT,0.3);
  var k=clipG(fD,ins);defs.push(k.def);s+=k.g+path(fD,null,OUT,0.45);
  var hc=add(a.hand,mul(uF,1.6));
  s+='<ellipse cx="'+f(hc[0])+'" cy="'+f(hc[1])+'" rx="2.5" ry="1.9" transform="rotate('+f(Math.atan2(uF[1],uF[0])*180/Math.PI)+' '+f(hc[0])+' '+f(hc[1])+')" fill="'+c[0]+'" stroke="'+OUT+'" stroke-width=".45"/>';
  // braço
  s+=path(uD,c[0],OUT,0.45);
  ins=path(band(S,a.elb,mul(aU,-1),0.05,0.95,ua[0]*0.45,0.5),c[1],null);
  var bi=mcol('biceps',ms,far),tr=mcol('triceps',ms,far);
  if(bi)ins+=path(band(S,a.elb,aU,0.18,0.9,ua[0]*0.55,0.05),bi,OUT,0.3);
  if(tr)ins+=path(band(S,a.elb,mul(aU,-1),0.12,0.92,ua[0]*0.55,0.05),tr,OUT,0.3);
  k=clipG(uD,ins);defs.push(k.def);s+=k.g+path(uD,null,OUT,0.45);
  return s;
}
function delt(S,nT,u,ms,far){
  // ombro (deltoide) como capuz arredondado sobre a articulação
  var c=far?SKF:SK,r=3.9,ctr=add(S,mul(u,0.6)),s='';
  var d='M'+P(add(ctr,[r,0]))+' A'+r+' '+r+' 0 1 1 '+P(add(ctr,[-r,0]))+' A'+r+' '+r+' 0 1 1 '+P(add(ctr,[r,0]))+' Z';
  s+=path(d,c[0],OUT,0.45);
  var fd=mcol('frontDelt',ms,far),sd=mcol('sideDelt',ms,far),rd=mcol('rearDelt',ms,far),ins='';
  var pp=perp(nT);
  function half(dir,col){var a0=add(ctr,mul(pp,r*1.2)),a1=sub(ctr,mul(pp,r*1.2));ins+=path('M'+P(a0)+' L'+P(add(a0,mul(dir,r*1.4)))+' L'+P(add(a1,mul(dir,r*1.4)))+' L'+P(a1)+' Z',col,null);}
  if(sd){ins+=path(d,sd,null);}
  if(fd)half(nT,fd);
  if(rd)half(mul(nT,-1),rd);
  if(ins){var k=clipG(d,ins);s=s+k.g+path(d,null,OUT,0.45);return {s:s,def:k.def};}
  return {s:s,def:''};
}
function drawTorso(o,ms,nT,defs){
  var H=o.hip,S=o.sh,u=nrm(sub(S,H)),Lt=len(sub(S,H)),n=nT;
  function at(t,off){return add(add(H,mul(u,Lt*t)),mul(n,off));}
  var A=[[-0.16,3.2],[-0.02,5.4],[0.25,5.2],[0.5,5.4],[0.72,7],[0.9,6.6],[1.03,4.2]];
  var B=[[1.07,-3.2],[0.9,-6.6],[0.7,-6.2],[0.45,-5.4],[0.22,-5.2],[0.02,-6.8],[-0.12,-6.8],[-0.2,-3.6]];
  var pts=A.map(function(x){return at(x[0],x[1]);}).concat(B.map(function(x){return at(x[0],x[1]);}));
  var d=smooth(pts,true),s=path(d,SK[0],OUT,0.55),ins='';
  // sombra do lado de trás
  ins+=path(smooth([at(-0.2,-8),at(0.4,-7.6),at(1.1,-7.6),at(1.1,-3.4),at(0.5,-3.4),at(-0.2,-3)],true),SK[1],null);
  function reg(t0,t1,o0,o1,col){ins+=path(smooth([at(t0,o0),at((t0+t1)/2,o0+(o1-o0)*0.2),at(t1,o0),at(t1,o1),at((t0+t1)/2,o1*1.1),at(t0,o1)],true),col,OUT,0.3);}
  var m;
  if(m=mcol('chest',ms))reg(0.6,0.98,1,9,m);
  if(m=mcol('abs',ms))reg(0.04,0.58,1.4,7.5,m);
  if(m=mcol('obliques',ms))ins+=path(smooth([at(0.08,0.4),at(0.3,2),at(0.55,1),at(0.5,-2),at(0.25,-2.4),at(0.06,-1.4)],true),m,OUT,0.3);
  if(m=mcol('lats',ms))reg(0.3,0.86,-0.6,-8.6,m);
  if(m=mcol('upperBack',ms))reg(0.66,1.06,-1,-8.6,m);
  if(m=mcol('lowerBack',ms))reg(0.02,0.38,-0.8,-8.6,m);
  if(m=mcol('glutes',ms))ins+=path(smooth([at(-0.22,-1),at(-0.2,-8),at(0.0,-8.4),at(0.12,-5.4),at(0.06,-1.2)],true),m,OUT,0.3);
  // linhas de anatomia
  if(!mcol('abs',ms)){[0.22,0.36,0.5].forEach(function(t){ins+=path('M'+P(at(t,4))+' L'+P(at(t,5.6)),null,SK[2],0.35);});}
  ins+=path('M'+P(at(0.62,5.2))+' Q'+P(at(0.7,7))+' '+P(at(0.86,6.6)),null,SK[2],0.4);
  var k=clipG(d,ins);defs.push(k.def);s+=k.g+path(d,null,OUT,0.55);
  return s;
}
function drawHead(o,nT,u,flipFace){
  var c=SK,h=o.head,s='',ang=Math.atan2(u[1],u[0])*180/Math.PI+90;
  // pescoço
  var nb=add(o.sh,mul(u,1)),nt=add(o.sh,mul(u,4.8));
  s+=path(limbD(nb,nt,4,3.6,0,0),c[0],OUT,0.45);
  var face=nT;
  var e='<g transform="translate('+f(h[0])+','+f(h[1])+') rotate('+f(ang)+')">';
  // em coordenadas locais: -y = topo, +x = rosto (se o rosto aponta para +x local)
  var ar=ang*Math.PI/180,fx=dot(face,[Math.cos(ar),Math.sin(ar)])>=0?1:-1;
  e+='<g transform="scale('+fx+',1)">';
  e+=path('M-5.4,1.4 C-6.4,-3.6 -3.8,-7.4 0.4,-7.2 C4.2,-7 6.2,-4 5.8,-0.6 L6.9,1.6 C7,2 6.8,2.2 6.3,2.2 L5.9,2.3 C6,3 5.8,3.6 5.3,3.9 C5.2,5.4 4.2,6.4 2.4,6.4 C0.4,6.4 -1.2,6 -2.4,5.2 C-3.8,4.4 -5,3.2 -5.4,1.4 Z',c[0],OUT,0.45);
  e+=path('M-5.4,1.4 C-6.4,-3.6 -3.8,-7.4 0.4,-7.2 C-2.8,-5.4 -3.8,-1.6 -2.6,2.4 C-2,4 -1.4,5 -0.6,5.8 C-1.2,5.6 -1.8,5.4 -2.4,5.2 C-3.8,4.4 -5,3.2 -5.4,1.4 Z',c[1],null);
  e+=path('M-1.6,0.2 C-0.6,-0.4 0.4,0.2 0.3,1.2 C0.2,2.2 -0.6,2.8 -1.5,2.5 C-2,1.8 -2.1,0.8 -1.6,0.2 Z',c[1],c[2],0.3);
  e+=path('M2.6,0.6 C3.2,0.9 3.9,0.9 4.4,0.5',null,c[2],0.35);
  e+=path('M-1.4,-6 C1,-6.8 3.4,-6.2 4.6,-4.4',null,'#ffffff',0.45,' opacity=".35"');
  e+='</g></g>';
  return s+e;
}
function drawSide(o,ms,flip,defs){
  var u=nrm(sub(o.sh,o.hip)),nT=rotFront(u);if(flip)nT=mul(nT,-1);
  var s='';
  o.legs.filter(function(l){return l.far;}).forEach(function(l){s+=drawLeg(o.hip,l,ms,true,nT,defs);});
  o.arms.filter(function(a){return a.far;}).forEach(function(a){var d=delt(o.sh,nT,u,ms,true);defs.push(d.def);s+=drawArm(o.sh,a,ms,true,nT,defs)+d.s;});
  s+=drawHead(o,nT,u);
  s+=drawTorso(o,ms,nT,defs);
  o.legs.filter(function(l){return !l.far;}).forEach(function(l){s+=drawLeg(o.hip,l,ms,false,nT,defs);});
  o.arms.filter(function(a){return !a.far;}).forEach(function(a){var d=delt(o.sh,nT,u,ms,false);defs.push(d.def);s+=d.s+drawArm(o.sh,a,ms,false,nT,defs);});
  return s;
}
/* frente do corpo na vista lateral: tronco de pé (ombro acima do quadril) olha para +x */
function rotFront(u){return [-u[1],u[0]];}

/* ---------- vista de frente (ou de costas) ---------- */
function drawFront(o,ms,back,defs){
  var s='',cx=o.cx,sy=o.sho[0][1],hy=o.hips[0][1],my=(sy+hy)/2;
  // pernas
  o.legs.forEach(function(l,i){
    var sd=i===0?1:-1,H=o.hips[i],th=[9.4,6.6],sh=[6.2,3.6];
    var tD=limbD(H,l.knee,th[0],th[1],0.8,0.8),sD=limbD(l.knee,l.ank,sh[0],sh[1],1,1);
    var foot='M'+P(add(l.ank,[-2.4*sd,-0.6]))+' Q'+P(add(l.ank,[0,3.4]))+' '+P(add(l.ank,[4.6*sd,2.2]))+' L'+P(add(l.ank,[3.8*sd,0]))+' Q'+P(add(l.ank,[1.6*sd,-1.6]))+' '+P(add(l.ank,[-2.4*sd,-0.6]))+' Z';
    s+=path(foot,SK[0],OUT,0.45);
    var ins=path(band(l.knee,l.ank,[-sd,0],0,1,sh[0]*0.4,0.45),SK[1],null),m;
    if(m=mcol('calves',ms)){ins+=path(band(l.knee,l.ank,[sd,0],0.08,0.62,sh[0]*0.45,0.1),m,OUT,0.3);ins+=path(band(l.knee,l.ank,[-sd,0],0.08,0.62,sh[0]*0.45,0.1),m,OUT,0.3);}
    s+=path(sD,SK[0],OUT,0.5);var k=clipG(sD,ins);defs.push(k.def);s+=k.g+path(sD,null,OUT,0.5);
    ins=path(band(H,l.knee,[-sd,0],0,1,th[0]*0.36,0.45),SK[1],null);
    if(!back&&(m=mcol('quads',ms)))ins+=path(band(H,l.knee,[sd,0],0.12,0.95,th[0]*0.5,0.45),m,OUT,0.3);
    if(back&&(m=mcol('hamstrings',ms)))ins+=path(band(H,l.knee,[sd,0],0.12,0.92,th[0]*0.5,0.45),m,OUT,0.3);
    if(m=mcol('adductors',ms))ins+=path(band(H,l.knee,[-sd,0],0.04,0.62,th[0]*0.42,0.05),m,OUT,0.3);
    if(m=mcol('abductors',ms))ins+=path(band(H,l.knee,[sd,0],-0.06,0.42,th[0]*0.46,0.05),m,OUT,0.3);
    s+=path(tD,SK[0],OUT,0.5);k=clipG(tD,ins);defs.push(k.def);s+=k.g+path(tD,null,OUT,0.5);
    s+=path('M'+P(add(l.knee,[-1.4,0.4]))+' q1.4,1.4 2.8,0',null,SK[2],0.4);
  });
  // braços
  var armS='',deltS='';
  o.arms.forEach(function(a,i){var s='';
    var S=o.sho[i],sd=i===0?1:-1,ua=[5.8,4.2],fa=[4.4,2.8];
    var uD=limbD(S,a.elb,ua[0],ua[1],0.8,0.8),fD=limbD(a.elb,a.hand,fa[0],fa[1],0.5,0.5);
    var ins2=path(band(a.elb,a.hand,[-sd,0],0,1,fa[0]*0.4,0.5),SK[1],null),mm;
    if(mm=mcol('forearm',ms))ins2+=path(band(a.elb,a.hand,[sd,0],0.04,0.7,fa[0]*0.6,0.4),mm,OUT,0.3);
    s+=path(fD,SK[0],OUT,0.45);var kk=clipG(fD,ins2);defs.push(kk.def);s+=kk.g+path(fD,null,OUT,0.45);
    var uF=nrm(sub(a.hand,a.elb)),hc=add(a.hand,mul(uF,1.6));
    s+='<ellipse cx="'+f(hc[0])+'" cy="'+f(hc[1])+'" rx="2.5" ry="1.9" transform="rotate('+f(Math.atan2(uF[1],uF[0])*180/Math.PI)+' '+f(hc[0])+' '+f(hc[1])+')" fill="'+SK[0]+'" stroke="'+OUT+'" stroke-width=".45"/>';
    ins2=path(band(S,a.elb,[-sd,0],0,1,ua[0]*0.4,0.5),SK[1],null);
    if(!back&&(mm=mcol('biceps',ms)))ins2+=path(band(S,a.elb,[sd,0],0.2,0.9,ua[0]*0.5,0.4),mm,OUT,0.3);
    if(mm=mcol('triceps',ms))ins2+=path(back?band(S,a.elb,[sd,0],0.15,0.92,ua[0]*0.55,0.4):band(S,a.elb,[sd,0],0.2,0.85,ua[0]*0.3,-0.2),mm,OUT,0.3);
    s+=path(uD,SK[0],OUT,0.45);kk=clipG(uD,ins2);defs.push(kk.def);s+=kk.g+path(uD,null,OUT,0.45);
    var r=4.2,c0=add(S,[sd*0.6,0.4]),dd='M'+P(add(c0,[r,0]))+' A'+r+' '+r+' 0 1 1 '+P(add(c0,[-r,0]))+' A'+r+' '+r+' 0 1 1 '+P(add(c0,[r,0]))+' Z';
    var dm=mcol('sideDelt',ms)||(!back&&mcol('frontDelt',ms))||(back&&mcol('rearDelt',ms));
    deltS+=path(dd,dm||SK[0],OUT,0.45);armS+=s;
  });
  if(back)s+=armS;
  // tronco
  var L0=[cx-11,sy-1],R0=[cx+11,sy-1];
  var pts=[[cx,sy-2.6],[cx+7,sy-2.2],[cx+12.4,sy+0.6],[cx+11,sy+8],[cx+8.4,my+3],[cx+8.6,hy-1],[cx+9.6,hy+3],[cx+6,hy+5.4],[cx,hy+4],[cx-6,hy+5.4],[cx-9.6,hy+3],[cx-8.6,hy-1],[cx-8.4,my+3],[cx-11,sy+8],[cx-12.4,sy+0.6],[cx-7,sy-2.2]];
  var d=smooth(pts,true),ins='',m;
  ins+=path(smooth([[cx+9,sy+2],[cx+13,sy+8],[cx+10,hy+4],[cx+6,hy+2],[cx+7.6,my]],true),SK[1],null,0,' opacity=".8"');
  ins+=path(smooth([[cx-9,sy+2],[cx-13,sy+8],[cx-10,hy+4],[cx-6,hy+2],[cx-7.6,my]],true),SK[1],null,0,' opacity=".8"');
  function lens(c0,rx,ry,col){ins+='<ellipse cx="'+f(c0[0])+'" cy="'+f(c0[1])+'" rx="'+rx+'" ry="'+ry+'" fill="'+col+'" stroke="'+OUT+'" stroke-width=".3"/>';}
  if(!back){
    if(m=mcol('chest',ms)){lens([cx+5,sy+4.6],5.4,4,m);lens([cx-5,sy+4.6],5.4,4,m);}
    if(m=mcol('abs',ms))ins+=path(smooth([[cx-3.6,sy+9.4],[cx+3.6,sy+9.4],[cx+4,hy-2],[cx,hy+2.4],[cx-4,hy-2]],true),m,OUT,0.3);
    if(m=mcol('obliques',ms)){ins+=path(smooth([[cx+4.6,my-3],[cx+9,my],[cx+8.6,hy],[cx+5,hy-2]],true),m,OUT,0.3);ins+=path(smooth([[cx-4.6,my-3],[cx-9,my],[cx-8.6,hy],[cx-5,hy-2]],true),m,OUT,0.3);}
    if(m=mcol('lats',ms)){ins+=path(smooth([[cx+9.6,sy+5],[cx+11.6,sy+9],[cx+8.8,my+3],[cx+8,sy+9]],true),m,OUT,0.3);ins+=path(smooth([[cx-9.6,sy+5],[cx-11.6,sy+9],[cx-8.8,my+3],[cx-8,sy+9]],true),m,OUT,0.3);}
    ins+=path('M'+P([cx,sy+2])+' L'+P([cx,sy+8.6]),null,SK[2],0.4);
    ins+=path('M'+P([cx-9,sy+8.4])+' Q'+P([cx-4,sy+10])+' '+P([cx,sy+8.6])+' Q'+P([cx+4,sy+10])+' '+P([cx+9,sy+8.4]),null,SK[2],0.4);
    if(!mcol('abs',ms))[my-1,my+3,hy-3].forEach(function(y){ins+=path('M'+P([cx-3.4,y])+' L'+P([cx+3.4,y]),null,SK[2],0.35);});
    if(!mcol('abs',ms))ins+=path('M'+P([cx,sy+10])+' L'+P([cx,hy-1]),null,SK[2],0.35);
  }else{
    if(m=mcol('upperBack',ms))ins+=path(smooth([[cx-8,sy+1],[cx+8,sy+1],[cx+6,sy+10],[cx,my+2],[cx-6,sy+10]],true),m,OUT,0.3);
    if(m=mcol('lats',ms)){ins+=path(smooth([[cx+6,sy+5],[cx+12,sy+7],[cx+9,my+5],[cx+3,hy-4],[cx+3,my]],true),m,OUT,0.3);ins+=path(smooth([[cx-6,sy+5],[cx-12,sy+7],[cx-9,my+5],[cx-3,hy-4],[cx-3,my]],true),m,OUT,0.3);}
    if(m=mcol('lowerBack',ms))ins+=path(smooth([[cx-3.6,my+2],[cx+3.6,my+2],[cx+3.4,hy],[cx-3.4,hy]],true),m,OUT,0.3);
    if(m=mcol('glutes',ms)){lens([cx+4.4,hy+2.4],4.6,3.6,m);lens([cx-4.4,hy+2.4],4.6,3.6,m);}
    if(m=mcol('abductors',ms)){lens([cx+8.4,hy+0.6],2.4,3,m);lens([cx-8.4,hy+0.6],2.4,3,m);}
    ins+=path('M'+P([cx,sy])+' L'+P([cx,hy+1]),null,SK[2],0.45);
    ins+=path('M'+P([cx-7.4,sy+3])+' Q'+P([cx-4,sy+8])+' '+P([cx-3.4,sy+10])+' M'+P([cx+7.4,sy+3])+' Q'+P([cx+4,sy+8])+' '+P([cx+3.4,sy+10]),null,SK[2],0.4);
    ins+=path('M'+P([cx-7,hy+4.6])+' Q'+P([cx-3.6,hy+6])+' '+P([cx,hy+4.4])+' Q'+P([cx+3.6,hy+6])+' '+P([cx+7,hy+4.6]),null,SK[2],0.4);
  }
  s+=path(d,SK[0],OUT,0.55);var k=clipG(d,ins);defs.push(k.def);s+=k.g+path(d,null,OUT,0.55);
  // trapézio / pescoço / cabeça
  s+=path(limbD([cx,sy],o.neck,5,4.2,0,0),SK[0],OUT,0.45);
  if(m=mcol('upperBack',ms)||mcol('traps',ms))s+=path(smooth([[cx-3,sy-4],[cx+3,sy-4],[cx+8,sy-1.6],[cx,sy-0.8],[cx-8,sy-1.6]],true),m,OUT,0.3);
  var h=o.head;
  s+='<ellipse cx="'+f(h[0])+'" cy="'+f(h[1])+'" rx="5.4" ry="6.6" fill="'+SK[0]+'" stroke="'+OUT+'" stroke-width=".45"/>';
  s+='<ellipse cx="'+f(h[0]-1.4)+'" cy="'+f(h[1]-2.4)+'" rx="2.4" ry="2.6" fill="#fff" opacity=".22"/>';
  s+='<ellipse cx="'+f(h[0]+5.2)+'" cy="'+f(h[1]+0.6)+'" rx="1" ry="1.8" fill="'+SK[1]+'" stroke="'+OUT+'" stroke-width=".3"/><ellipse cx="'+f(h[0]-5.2)+'" cy="'+f(h[1]+0.6)+'" rx="1" ry="1.8" fill="'+SK[1]+'" stroke="'+OUT+'" stroke-width=".3"/>';
  if(!back)s+=path('M'+P([h[0]-2.6,h[1]+0.2])+' q1,.6 2,0 M'+P([h[0]+0.6,h[1]+0.2])+' q1,.6 2,0',null,SK[2],0.35);
  if(!back)s+=armS;
  s+=deltS;
  return s;
}

/* ---------- aparelhos ---------- */
var STEEL='url(#dmSteel)',STEELV='url(#dmSteelV)',PAD='url(#dmPad)';
function tubeS(a,b,w){var u=nrm(sub(b,a)),p=perp(u),h=w/2,id='dt'+(++uid),m=lp(a,b,0.5);
  var g='<linearGradient id="'+id+'" gradientUnits="userSpaceOnUse" x1="'+P(add(m,mul(p,h))).replace(',','" y1="')+'" x2="'+P(sub(m,mul(p,h))).replace(',','" y2="')+'"><stop offset="0" stop-color="#f4f7fb"/><stop offset=".35" stop-color="#c3cbd6"/><stop offset=".75" stop-color="#8a94a3"/><stop offset="1" stop-color="#5a6372"/></linearGradient>';
  return g+path('M'+P(add(a,mul(p,h)))+' L'+P(add(b,mul(p,h)))+' L'+P(sub(b,mul(p,h)))+' L'+P(sub(a,mul(p,h)))+' Z','url(#'+id+')',OUT,0.4);}
function padBox(x,y,w,h){return '<rect x="'+f(x)+'" y="'+f(y)+'" width="'+f(w)+'" height="'+f(h)+'" rx="'+f(Math.min(2.4,h/2))+'" fill="'+PAD+'" stroke="'+OUT+'" stroke-width=".45"/>'+(w>8&&h>3?'<path d="M'+f(x+1.6)+','+f(y+1.2)+' H'+f(x+w-1.6)+'" stroke="#4b5361" stroke-width=".35" stroke-dasharray="1 .8"/>':'');}
function plateS(c,r){return '<circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="'+r+'" fill="url(#dmPlate)" stroke="'+OUT+'" stroke-width=".5"/><circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="'+f(r*0.78)+'" fill="none" stroke="#4a5363" stroke-width=".5"/><circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="'+f(r*0.58)+'" fill="none" stroke="#141820" stroke-width=".9"/><circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="'+f(r*0.22)+'" fill="#b5bdc9" stroke="'+OUT+'" stroke-width=".4"/>';}
function pulley(c){return '<circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="3" fill="#1b2029" stroke="'+OUT+'" stroke-width=".45"/><circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="1.6" fill="none" stroke="#3fb8ff" stroke-width=".6"/><circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r=".7" fill="#c3cbd6"/>';}
function stack(x){var s=tubeS([x-5,GY],[x-5,-12],2.6)+tubeS([x+5,GY],[x+5,-12],2.6)+tubeS([x-6.4,-12],[x+6.4,-12],2.6);
  for(var i=0;i<6;i++)s+='<rect x="'+f(x-4.2)+'" y="'+f(GY-4-i*3.2)+'" width="8.4" height="3" rx=".6" fill="'+(i===5?'#3fb8ff':'#2a303b')+'" stroke="'+OUT+'" stroke-width=".35"/>';
  return s;}
function refPt(o,k){
  if(Array.isArray(k))return k;
  var m={hand:o.arms[0]&&o.arms[0].hand,hand2:o.arms[1]&&o.arms[1].hand,sh:o.sh,hip:o.hip,head:o.head,
    ank:o.legs[0]&&o.legs[0].ank,ank2:o.legs[1]&&o.legs[1].ank,knee:o.legs[0]&&o.legs[0].knee,knee2:o.legs[1]&&o.legs[1].knee,toe:o.legs[0]&&o.legs[0].toe};
  return m[k];
}
function drawProp(pr,o){
  var s='',Pt=function(k){return refPt(o,k);};
  switch(pr.t){
    case 'bench':s+=tubeS([pr.x1+6,pr.y+5],[pr.x1+6,GY],2.6)+tubeS([pr.x2-6,pr.y+5],[pr.x2-6,GY],2.6)+tubeS([pr.x1+3,GY-0.6],[pr.x1+9,GY-0.6],1.4)+tubeS([pr.x2-9,GY-0.6],[pr.x2-3,GY-0.6],1.4)+tubeS([pr.x1+4,pr.y+5.6],[pr.x2-4,pr.y+5.6],2)+padBox(pr.x1,pr.y,pr.x2-pr.x1,5.4);break;
    case 'box':s+='<rect x="'+pr.x1+'" y="'+pr.y+'" width="'+(pr.x2-pr.x1)+'" height="'+(GY-pr.y)+'" rx="1.4" fill="url(#dmBox)" stroke="'+OUT+'" stroke-width=".5"/><path d="M'+(pr.x1+1.5)+','+(pr.y+1.6)+' H'+(pr.x2-1.5)+'" stroke="#3fb8ff" stroke-width=".8"/>';break;
    case 'pad':s+=padBox(pr.x,pr.y,pr.w,pr.h);break;
    case 'back':var a=pr.from,b=pt(a,pr.len,pr.ang),u=nrm(sub(b,a)),p=perp(u);s+=path('M'+P(add(a,mul(p,3.4)))+' L'+P(add(b,mul(p,3.4)))+' L'+P(sub(b,mul(p,3.4)))+' L'+P(sub(a,mul(p,3.4)))+' Z',PAD,OUT,0.45)+path('M'+P(add(lp(a,b,0.05),mul(p,2.2)))+' L'+P(add(lp(a,b,0.95),mul(p,2.2))),null,'#4b5361',0.35,' stroke-dasharray="1 .8"');break;
    case 'post':s+=pr.cable?stack(pr.x):tubeS([pr.x,pr.y1||-14],[pr.x,GY],3.2);break;
    case 'pull':s+=tubeS([pr.x1,pr.y],[pr.x2,pr.y],2.4)+tubeS([pr.x1,pr.y],[pr.x1,GY],3)+tubeS([pr.x2,pr.y],[pr.x2,GY],3);break;
    case 'wall':s+='<rect x="'+pr.x+'" y="-20" width="44" height="'+(GY+20)+'" fill="#0e1a2e" stroke="#1e3352" stroke-width=".6"/>';break;
    case 'step':s+='<rect x="'+pr.x1+'" y="'+pr.y+'" width="'+(pr.x2-pr.x1)+'" height="'+(GY-pr.y)+'" rx=".8" fill="url(#dmBox)" stroke="'+OUT+'" stroke-width=".45"/>';break;
    case 'mat':s+='<rect x="'+pr.x1+'" y="'+(GY-2.4)+'" width="'+(pr.x2-pr.x1)+'" height="2.4" rx="1.2" fill="#1d3a66" stroke="'+OUT+'" stroke-width=".4"/><path d="M'+(pr.x1+1.4)+','+(GY-1.8)+' H'+(pr.x2-1.4)+'" stroke="#3fb8ff" stroke-width=".4" opacity=".7"/>';break;
    case 'cable':var a2=Pt(pr.from)||pr.from,b2=Pt(pr.to);if(b2)s+=path('M'+P(a2)+' L'+P(b2),null,'#1a1e26',1.1)+path('M'+P(a2)+' L'+P(b2),null,'#9aa4b3',0.45)+pulley(a2);break;
    case 'lever':var b3=Pt(pr.to);if(b3)s+=tubeS(pr.from,b3,3)+pulley(pr.from);break;
    case 'bar':var c=Pt(pr.at);if(c){c=add(c,pr.off||[0,0]);s+=plateS(c,9);}break;
    case 'db':(pr.at.split?pr.at.split(','):pr.at).forEach(function(k){var c2=Pt(k);if(c2)s+='<polygon points="'+[0,1,2,3,4,5].map(function(i){var an=Math.PI/3*i+Math.PI/6;return f(c2[0]+4.6*Math.cos(an))+','+f(c2[1]+4.6*Math.sin(an));}).join(' ')+'" fill="url(#dmPlate)" stroke="'+OUT+'" stroke-width=".5"/><circle cx="'+f(c2[0])+'" cy="'+f(c2[1])+'" r="1.4" fill="#b5bdc9" stroke="'+OUT+'" stroke-width=".35"/>';});break;
    case 'roller':var c3=Pt(pr.at);if(c3){c3=add(c3,pr.off||[0,0]);s+='<circle cx="'+f(c3[0])+'" cy="'+f(c3[1])+'" r="4" fill="url(#dmPad)" stroke="'+OUT+'" stroke-width=".45"/><circle cx="'+f(c3[0])+'" cy="'+f(c3[1])+'" r="1.1" fill="#c3cbd6" stroke="'+OUT+'" stroke-width=".3"/>';}break;
    case 'platform':var c4=Pt(pr.at);if(c4){var mid=add(c4,pr.off||[0,0]);s+=tubeS(pt(mid,16,pr.ang),pt(mid,16,pr.ang+180),4);}break;
    case 'sled':if(o.sh&&!o.front){var u2=nrm(sub(o.sh,o.hip)),n2=rotFront(u2),q0=add(add(o.hip,mul(u2,-2)),mul(n2,-8.4)),q1=add(add(o.sh,mul(u2,3)),mul(n2,-8.4));
      var r0=add(q0,mul(n2,-4)),k0=(GY-r0[1])/u2[1],g0=add(r0,mul(u2,k0)),g1=add(r0,mul(u2,-k0*0.0+60));
      s+=tubeS(add(g0,mul(n2,-1.5)),add(add(r0,mul(u2,70)),mul(n2,-1.5)),3)+tubeS([g0[0]-8,GY-1],[g0[0]+8,GY-1],2);
      var pp2=perp(u2);s+=path('M'+P(add(q0,mul(n2,2.7)))+' L'+P(add(q1,mul(n2,2.7)))+' L'+P(sub(q1,mul(n2,2.7)))+' L'+P(sub(q0,mul(n2,2.7)))+' Z',PAD,OUT,0.45);
      var sp=add(o.sh,mul(u2,3.4));s+='<rect x="'+f(sp[0]-5)+'" y="'+f(sp[1]-2.6)+'" width="10" height="3.6" rx="1.6" fill="'+PAD+'" stroke="'+OUT+'" stroke-width=".45"/>';}break;
    case 'yoke':if(o.sh){var yp=[o.sh[0],o.sh[1]-3];s+=tubeS([yp[0]-6,yp[1]-1],[yp[0]-6,-14],2.6)+'<rect x="'+f(yp[0]-6)+'" y="'+f(yp[1]-2.4)+'" width="11" height="4" rx="1.8" fill="'+PAD+'" stroke="'+OUT+'" stroke-width=".45"/>';}break;
    case 'handle':var c5=Pt(pr.at);if(c5)s+=tubeS(add(c5,[0,-4.4]),add(c5,[0,4.4]),2.2);break;
  }
  return s;
}
var DEFS='<radialGradient id="dmBg" cx="50%" cy="85%" r="75%"><stop offset="0" stop-color="#11284a"/><stop offset=".6" stop-color="#0a1426"/><stop offset="1" stop-color="#060b16"/></radialGradient>'+
  '<pattern id="dmGrid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#3fb8ff" stroke-opacity=".07" stroke-width=".3"/></pattern>'+
  '<linearGradient id="dmPad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4250"/><stop offset=".45" stop-color="#252b35"/><stop offset="1" stop-color="#14181f"/></linearGradient>'+
  '<linearGradient id="dmBox" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3d66"/><stop offset="1" stop-color="#121c33"/></linearGradient>'+
  '<radialGradient id="dmPlate" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="#3b4350"/><stop offset=".7" stop-color="#232933"/><stop offset="1" stop-color="#15191f"/></radialGradient>';
function render(def,t,id){
  var p=lerpV(def.a,def.b,t),o=p.front?solveFront(p):solveSide(p);
  var ms=MU[id]||{p:{},s:{}},view=VIEW[id]||{},defs=[];
  var pr=(def.props||[]).concat(p.props||[]),hasCable=pr.some(function(x){return x.t==='cable';});
  var back='',fore='';
  pr.forEach(function(x){
    if(x.t==='post'&&hasCable)x=Object.assign({},x,{cable:1});
    var str=drawProp(x,o.front?{arms:o.arms,legs:o.legs,sh:o.sho[0],hip:o.hips[0],head:o.head}:o);
    if(x.front)fore+=str;else back+=str;
  });
  var fig=o.front?drawFront(o,ms,!!view.back,defs):drawSide(o,ms,!!view.flip,defs);
  return {defs:defs.join(''),body:'<rect x="0" y="-20" width="160" height="134" fill="url(#dmBg)"/><rect x="0" y="-20" width="160" height="134" fill="url(#dmGrid)"/><ellipse cx="80" cy="'+(GY+1)+'" rx="70" ry="4" fill="#000" opacity=".35"/><path d="M2 '+GY+' H158" stroke="#3fb8ff" stroke-opacity=".25" stroke-width=".5"/>'+back+fig+fore};
}

/* ---------- Músculos: p = principal (vermelho forte), s = auxiliar (vermelho claro) ---------- */
function mm(p,s){var o={p:{},s:{}};p.split(' ').forEach(function(k){if(k)o.p[k]=1;});(s||'').split(' ').forEach(function(k){if(k)o.s[k]=1;});return o;}
var MU={
'supino-reto-barra':mm('chest','frontDelt triceps'),
'supino-reto-halter':mm('chest','frontDelt triceps'),
'supino-inclinado-halter':mm('chest','frontDelt triceps'),
'supino-maquina':mm('chest','frontDelt triceps'),
'crucifixo-maquina':mm('chest','frontDelt'),
'crossover':mm('chest','frontDelt'),
'flexao':mm('chest','frontDelt triceps abs'),
'flexao-joelhos':mm('chest','frontDelt triceps'),
'puxada-frontal':mm('lats','biceps upperBack rearDelt'),
'remada-curvada':mm('lats upperBack','biceps rearDelt lowerBack'),
'remada-baixa':mm('lats upperBack','biceps rearDelt'),
'remada-unilateral':mm('lats','upperBack biceps rearDelt'),
'barra-fixa':mm('lats','biceps upperBack forearm'),
'levantamento-terra':mm('glutes hamstrings lowerBack','quads upperBack forearm'),
'pulldown-braco-reto':mm('lats','triceps rearDelt'),
'desenv-halter':mm('frontDelt sideDelt','triceps upperBack'),
'desenv-barra':mm('frontDelt sideDelt','triceps upperBack'),
'elev-lateral':mm('sideDelt','traps'),
'elev-lateral-cabo':mm('sideDelt','traps'),
'crucifixo-inverso':mm('rearDelt','upperBack'),
'face-pull':mm('rearDelt','upperBack'),
'rosca-direta':mm('biceps','forearm'),
'rosca-alternada':mm('biceps','forearm'),
'rosca-martelo':mm('biceps forearm',''),
'rosca-scott':mm('biceps','forearm'),
'rosca-cabo':mm('biceps','forearm'),
'triceps-corda':mm('triceps',''),
'triceps-testa':mm('triceps',''),
'triceps-frances':mm('triceps',''),
'mergulho':mm('triceps','chest frontDelt'),
'triceps-maquina':mm('triceps',''),
'agachamento':mm('quads glutes','hamstrings lowerBack'),
'agachamento-pc':mm('quads glutes','hamstrings'),
'leg-press':mm('quads','glutes hamstrings'),
'hack':mm('quads','glutes'),
'cadeira-extensora':mm('quads',''),
'agachamento-bulgaro':mm('quads glutes','hamstrings'),
'afundo':mm('quads glutes','hamstrings'),
'afundo-pc':mm('quads glutes','hamstrings'),
'stiff':mm('hamstrings glutes','lowerBack'),
'stiff-halter':mm('hamstrings glutes','lowerBack'),
'mesa-flexora':mm('hamstrings','calves'),
'cadeira-flexora':mm('hamstrings','calves'),
'elevacao-pelvica':mm('glutes','hamstrings'),
'ponte-gluteo':mm('glutes','hamstrings'),
'abdutora':mm('abductors','glutes'),
'coice-cabo':mm('glutes','hamstrings'),
'panturrilha-pe':mm('calves',''),
'panturrilha-pc':mm('calves',''),
'panturrilha-sentado':mm('calves',''),
'prancha':mm('abs','obliques frontDelt'),
'abdominal-cabo':mm('abs','obliques'),
'elevacao-pernas':mm('abs','obliques quads'),
'abdominal-maquina':mm('abs','obliques'),
'abdominal-solo':mm('abs','obliques'),
'superman':mm('lowerBack','glutes hamstrings upperBack'),
'subida-banco':mm('quads glutes','hamstrings calves'),
'flexao-pike':mm('frontDelt','triceps upperBack'),
'escalador':mm('abs','frontDelt quads obliques'),
'polichinelo':mm('sideDelt calves abductors','quads glutes')
};
/* vistas: flip = de bruços/de frente para o chão; back = vista de costas */
var VIEW={'flexao':{flip:1},'flexao-joelhos':{flip:1},'flexao-pike':{flip:1},'prancha':{flip:1},'escalador':{flip:1},'mesa-flexora':{flip:1},'superman':{flip:1},'crucifixo-inverso':{back:1},'barra-fixa':{back:1}};
var MNAME={chest:'Peitoral',frontDelt:'Deltoide anterior',sideDelt:'Deltoide lateral',rearDelt:'Deltoide posterior',triceps:'Tríceps',biceps:'Bíceps',forearm:'Antebraço',lats:'Dorsal',upperBack:'Trapézio e romboides',traps:'Trapézio',lowerBack:'Lombar',abs:'Abdômen',obliques:'Oblíquos',glutes:'Glúteos',quads:'Quadríceps',hamstrings:'Posteriores da coxa',adductors:'Adutores',abductors:'Abdutores',calves:'Panturrilha'};

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
'supino-maquina':{a:M(SEAT,{arms:[{to:[80,50],bend:1}]}),b:M(SEAT,{arms:[{to:[99,49],bend:1}]}),props:[SEATP,{t:'back',from:[58,88],ang:94,len:40},{t:'lever',from:[128,48],to:'hand'},{t:'post',x:128,y1:20}]},
'crucifixo-maquina':{a:{front:1,sy:46,hy:80,arm:{to:[122,32],bend:-1},leg:{knee:[92,86]}},b:{front:1,sy:46,hy:80,arm:{to:[88,38],bend:-1},leg:{knee:[92,86]}},props:[{t:'pad',x:62,y:40,w:36,h:44},{t:'pad',x:58,y:84,w:44,h:6},{t:'handle',at:'hand',front:1},{t:'handle',at:'hand2',front:1}]},
'crossover':{a:{front:1,sy:26,hy:60,arm:{to:[116,22],bend:1},leg:{ang:6}},b:{front:1,sy:26,hy:60,arm:{to:[86,62],bend:1},leg:{ang:6}},props:[{t:'cable',from:[150,-6],to:'hand'},{t:'cable',from:[10,-6],to:'hand2'},{t:'post',x:150},{t:'post',x:10}]},
'flexao':{a:{hip:[95.2,99.2],shp:[62,92],legs:[{to:[136,108],bend:1,fa:-60}],arms:[{to:[62,110],bend:-1}]},b:{hip:[91,87.9],shp:[60,74],legs:[{to:[136,108],bend:1,fa:-60}],arms:[{to:[62,110],bend:-1}]},props:[]},
'puxada-frontal':{a:M(SEAT,{torso:96,arms:[{to:[66,10],bend:-1}]}),b:M(SEAT,{torso:96,arms:[{to:[72,44],bend:-1}]}),props:[SEATP,{t:'pad',x:84,y:72,w:16,h:7},{t:'cable',from:[68,-14],to:'hand'}]},
'remada-curvada':{a:{hip:[70,62],torso:28,legs:[{to:[88,109],bend:-1}],arms:[{to:[100,82],bend:1}]},b:{hip:[70,62],torso:28,legs:[{to:[88,109],bend:-1}],arms:[{to:[84,64],bend:-1}]},props:[{t:'bar',at:'hand',front:1}]},
'remada-baixa':{a:{hip:[50,92],torso:88,legs:[{to:[100,96],bend:-1,fa:80}],arms:[{to:[86,60],bend:1}]},b:{hip:[50,92],torso:92,legs:[{to:[100,96],bend:-1,fa:80}],arms:[{to:[66,68],bend:1}]},props:[{t:'pad',x:30,y:96,w:36,h:6},{t:'pad',x:104,y:84,w:5,h:26},{t:'cable',from:[150,72],to:'hand'}]},
'remada-unilateral':{a:{hip:[60,66],torso:6,legs:[{to:[74,109],bend:-1},{to:[34,86],bend:-1,far:1,fa:180}],arms:[{to:[95,97],bend:1},{to:[98,88],bend:1,far:1}]},b:{hip:[60,66],torso:6,legs:[{to:[74,109],bend:-1},{to:[34,86],bend:-1,far:1,fa:180}],arms:[{to:[80,70],bend:-1},{to:[98,88],bend:1,far:1}]},props:[{t:'bench',x1:24,x2:110,y:88},{t:'db',at:'hand',front:1}]},
'barra-fixa':{a:{front:1,sy:46,hy:80,arm:{to:[102,10],bend:1},leg:{ang:3}},b:{front:1,sy:24,hy:58,arm:{to:[102,10],bend:1},leg:{ang:3}},props:[{t:'pull',x1:30,x2:130,y:10}]},
'levantamento-terra':{a:{hip:[62,78],torso:28,legs:[{to:[84,109],bend:-1}],arms:[{to:[88,103],bend:1}]},b:{hip:[76,60],torso:90,legs:[{to:[84,109],bend:-1}],arms:[{to:[80,62],bend:1}]},props:[{t:'bar',at:'hand',front:1}]},
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
'hack':{a:{hip:[76,61],torso:64,legs:[{to:[92,109],bend:-1}],arms:[{rel:[6,2],bend:1}]},b:{hip:[63,88],torso:64,legs:[{to:[92,109],bend:-1}],arms:[{rel:[6,2],bend:1}]},props:[{t:'sled'},{t:'pad',x:84,y:107,w:24,h:5}]},
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
'panturrilha-pe':{a:{hip:[78,58],torso:90,legs:[{to:[80,107],bend:-1,fa:16}],arms:[{rel:[6,2],bend:1}]},b:{hip:[78,48],torso:90,legs:[{to:[80,97],bend:-1,fa:-44}],arms:[{rel:[6,2],bend:1}]},props:[{t:'yoke',front:1},{t:'step',x1:84,x2:104,y:104}]},
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
  if(id==='leg-press'&&window.ENGEFIT_EXART){var x=window.ENGEFIT_EXART.svg('leg-press',{e:1-t});return x.replace('<svg ','<svg class="'+(cls||'demo')+' wide" ');}
  var key=id+'|'+t,r=(t===0||t===1)&&cache[key]?cache[key]:render(d,t,id);
  if(t===0||t===1)cache[key]=r;
  return '<svg class="'+(cls||'demo')+'" viewBox="0 -20 160 134" role="img" aria-hidden="true"><defs>'+DEFS+r.defs+'</defs>'+r.body+'</svg>';
}
function muscles(id){var m=MU[id];if(!m)return null;return {p:Object.keys(m.p).map(function(k){return MNAME[k];}),s:Object.keys(m.s).map(function(k){return MNAME[k];})};}
window.ENGEFIT_DEMOS={has:function(id){return !!D[id];},svg:svg,steps:function(id){return S[id]||null;},muscles:muscles,ids:Object.keys(D)};
})();
