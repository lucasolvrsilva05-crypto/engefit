/* ENGEFIT · ilustrações de exercícios com o avatar do perfil.
   Arte vetorial original: máquina em perspectiva + personagem de perfil, músculos em destaque.
   ENGEFIT_EXART.svg(id, {g, skin, hair, fat, mus, t, muscles}) -> string SVG. t = fase 0..1 do movimento. */
(function(){
var AV=window.ENGEFIT_AVATAR||{};
var SKIN=AV.SKIN||{clara:['#f3cba8','#dca37f','#c4876a']};
var HAIR=AV.HAIR||{Grafite:['#3a3348','#211c2c','#6c6488']};
var OUT='#070b14';
var KX=0.5,KY=-0.36,S=2.6;           // projeção: z (para o observador) vai para a direita e para baixo
var uid=Math.floor(Math.random()*1e5)*1000;
function f(v){return Math.round(v*100)/100;}
function add(a,b){return [a[0]+b[0],a[1]+b[1]];}
function sub(a,b){return [a[0]-b[0],a[1]-b[1]];}
function mul(a,k){return [a[0]*k,a[1]*k];}
function len(a){return Math.hypot(a[0],a[1]);}
function nrm(a){var l=len(a)||1;return [a[0]/l,a[1]/l];}
function perp(a){return [-a[1],a[0]];}
function lerp(a,b,t){return a+(b-a)*t;}
function lp(a,b,t){return [lerp(a[0],b[0],t),lerp(a[1],b[1],t)];}
function rot(a,deg){var r=deg*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return [a[0]*c-a[1]*s,a[0]*s+a[1]*c];}
function P3(x,y,z){return [x+KX*z,y+KY*z];}
function pt(p){return f(p[0])+','+f(p[1]);}
function poly(ps){return 'M'+ps.map(pt).join(' L')+' Z';}
function path(d,fill,stroke,sw,extra){return '<path d="'+d+'" fill="'+fill+'"'+(stroke?' stroke="'+stroke+'" stroke-width="'+(sw||0.5)+'" stroke-linejoin="round" stroke-linecap="round"':'')+(extra||'')+'/>';}
function at(z){return ' transform="translate('+f(KX*z)+','+f(KY*z)+')"';}
function ease(t){return 0.5-0.5*Math.cos(Math.PI*2*t);}   // 0 -> 1 -> 0 no ciclo

/* ---------- metal, estofado e anilhas ---------- */
var STEEL=['#f4f7fb','#c3cbd6','#8a94a3','#5a6372'];
function gradAcross(a,b,w,stops,defs){
  var id='g'+(++uid),m=lp(a,b,0.5),pp=nrm(perp(sub(b,a))),p1=add(m,mul(pp,w/2)),p2=sub(m,mul(pp,w/2));
  defs.push('<linearGradient id="'+id+'" gradientUnits="userSpaceOnUse" x1="'+f(p1[0])+'" y1="'+f(p1[1])+'" x2="'+f(p2[0])+'" y2="'+f(p2[1])+'">'+stops.map(function(c,i){return '<stop offset="'+f(i/(stops.length-1))+'" stop-color="'+c+'"/>';}).join('')+'</linearGradient>');
  return 'url(#'+id+')';
}
/* tubo quadrado entre dois pontos 3D */
function tube(a3,b3,w,defs,o){
  o=o||{};var a=P3(a3[0],a3[1],a3[2]),b=P3(b3[0],b3[1],b3[2]),u=nrm(sub(b,a)),p=perp(u),h=w/2;
  var q=[add(a,mul(p,h)),add(b,mul(p,h)),sub(b,mul(p,h)),sub(a,mul(p,h))];
  var s=path(poly(q),gradAcross(a,b,w,o.stops||STEEL,defs),OUT,0.42);
  s+=path('M'+pt(add(a,mul(p,h*0.55)))+' L'+pt(add(b,mul(p,h*0.55))),'none','#ffffff',0.35,' opacity=".55"');
  if(o.capA)s+=cap(a,u,p,h);if(o.capB)s+=cap(b,mul(u,-1),p,h);
  return s;
}
function cap(c,u,p,h){var q=[add(c,mul(p,h*1.15)),add(add(c,mul(p,h*1.15)),mul(u,-2.4)),add(sub(c,mul(p,h*1.15)),mul(u,-2.4)),sub(c,mul(p,h*1.15))];return path(poly(q),'#1d222b',OUT,0.4);}
/* caixa: origem o(3D), eixos e1,e2,e3 (3D); desenha as faces visíveis (+z, +y, -x) */
function box(o,e1,e2,e3,cols,defs){
  function W(a,b,c){return [o[0]+e1[0]*a+e2[0]*b+e3[0]*c,o[1]+e1[1]*a+e2[1]*b+e3[1]*c,o[2]+e1[2]*a+e2[2]*b+e3[2]*c];}
  var D=[-KX,-KY,1],C=W(0.5,0.5,0.5);
  var faces=[[[0,0,0],[1,0,0],[1,1,0],[0,1,0]],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],[[0,1,0],[1,1,0],[1,1,1],[0,1,1]],[[0,0,0],[0,1,0],[0,1,1],[0,0,1]],[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]];
  var s='';
  faces.forEach(function(F,i){
    var v=F.map(function(q){return W(q[0],q[1],q[2]);});
    var a1=[v[1][0]-v[0][0],v[1][1]-v[0][1],v[1][2]-v[0][2]],a2=[v[3][0]-v[0][0],v[3][1]-v[0][1],v[3][2]-v[0][2]];
    var n=[a1[1]*a2[2]-a1[2]*a2[1],a1[2]*a2[0]-a1[0]*a2[2],a1[0]*a2[1]-a1[1]*a2[0]];
    var fc=[(v[0][0]+v[2][0])/2-C[0],(v[0][1]+v[2][1])/2-C[1],(v[0][2]+v[2][2])/2-C[2]];
    if(n[0]*fc[0]+n[1]*fc[1]+n[2]*fc[2]<0)n=[-n[0],-n[1],-n[2]];
    if(n[0]*D[0]+n[1]*D[1]+n[2]*D[2]<=1e-6)return;
    var q=v.map(function(w){return P3(w[0],w[1],w[2]);});
    var col=cols[i]||cols[0];
    s+=path(poly(q),typeof col==='function'?col(q):col,OUT,0.42);
  });
  return s;
}
function plate(c3,r,z0,z1,defs){
  // anilha de pé (face paralela ao plano xy): aparece como círculo; espessura ao longo de z
  var s='',n=6;
  for(var i=0;i<=n;i++){var z=lerp(z0,z1,i/n),c=P3(c3[0],c3[1],z);s+='<circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="'+f(r)+'" fill="'+(i<n?'#1a1e26':'#262c36')+'" stroke="'+OUT+'" stroke-width="'+(i===0||i===n?0.45:0)+'"/>';}
  var c=P3(c3[0],c3[1],z1),id='pl'+(++uid);
  defs.push('<radialGradient id="'+id+'" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="#3b4350"/><stop offset=".7" stop-color="#232933"/><stop offset="1" stop-color="#15191f"/></radialGradient>');
  s+='<circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="'+f(r-0.3)+'" fill="url(#'+id+')" stroke="'+OUT+'" stroke-width=".45"/>';
  s+='<circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="'+f(r*0.8)+'" fill="none" stroke="#4a5363" stroke-width=".7"/>';
  s+='<circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="'+f(r*0.62)+'" fill="none" stroke="#141820" stroke-width="1.2"/>';
  s+='<circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="'+f(r*0.2)+'" fill="#9aa4b3" stroke="'+OUT+'" stroke-width=".45"/>';
  s+='<circle cx="'+f(c[0])+'" cy="'+f(c[1])+'" r="'+f(r*0.09)+'" fill="#2a303a"/>';
  s+='<path d="M'+pt(add(c,[-r*0.55,r*0.62]))+' A'+f(r*0.83)+' '+f(r*0.83)+' 0 0 1 '+pt(add(c,[r*0.62,r*0.5]))+'" fill="none" stroke="#ffffff" stroke-width=".6" opacity=".18"/>';
  return s;
}

/* ---------- personagem de perfil ---------- */
function limbD(A,B,wA,wB,bf,bb){
  var u=nrm(sub(B,A)),p=perp(u),m=lp(A,B,0.45);
  var a1=add(A,mul(p,wA/2)),b1=add(B,mul(p,wB/2)),b2=sub(B,mul(p,wB/2)),a2=sub(A,mul(p,wA/2));
  var c1=add(m,mul(p,(wA+wB)/4+bf)),c2=sub(m,mul(p,(wA+wB)/4+bb));
  return 'M'+pt(a1)+' Q'+pt(c1)+' '+pt(b1)+' A'+f(wB/2)+' '+f(wB/2)+' 0 0 0 '+pt(b2)+' Q'+pt(c2)+' '+pt(a2)+' A'+f(wA/2)+' '+f(wA/2)+' 0 0 0 '+pt(a1)+' Z';
}
function limb(A,B,wA,wB,bf,bb,fill,sw){
  var u=nrm(sub(B,A)),p=perp(u),L=len(sub(B,A)),m=lp(A,B,0.45);
  var a1=add(A,mul(p,wA/2)),b1=add(B,mul(p,wB/2)),b2=sub(B,mul(p,wB/2)),a2=sub(A,mul(p,wA/2));
  var c1=add(m,mul(p,(wA+wB)/4+bf)),c2=sub(m,mul(p,(wA+wB)/4+bb));
  var d='M'+pt(a1)+' Q'+pt(c1)+' '+pt(b1)+' A'+f(wB/2)+' '+f(wB/2)+' 0 0 0 '+pt(b2)+' Q'+pt(c2)+' '+pt(a2)+' A'+f(wA/2)+' '+f(wA/2)+' 0 0 0 '+pt(a1)+' Z';
  return path(d,fill,OUT,sw||0.55);
}
function shadeSide(A,B,wA,wB,bb,side,col,k){
  // faixa de sombra ao longo de um lado do membro
  var u=nrm(sub(B,A)),p=mul(perp(u),side),m=lp(A,B,0.45);k=k||0.42;
  var a1=add(A,mul(p,wA/2)),b1=add(B,mul(p,wB/2)),c1=add(m,mul(p,(wA+wB)/4+bb));
  var a0=add(A,mul(p,wA/2*(1-k*2))),b0=add(B,mul(p,wB/2*(1-k*2))),c0=add(m,mul(p,((wA+wB)/4+bb)*(1-k*1.6)));
  return path('M'+pt(a1)+' Q'+pt(c1)+' '+pt(b1)+' L'+pt(b0)+' Q'+pt(c0)+' '+pt(a0)+' Z',col,null);
}
function ik(A,B,L1,L2,side){
  var d=sub(B,A),D=Math.min(len(d),L1+L2-0.01),u=nrm(d),c=(L1*L1+D*D-L2*L2)/(2*L1*D),ang=Math.acos(Math.max(-1,Math.min(1,c)));
  return add(A,mul(rot(u,side*ang*180/Math.PI),L1));
}
function ang(v){return Math.atan2(v[1],v[0])*180/Math.PI;}

/* cabeça de perfil em coordenadas locais: +x = rosto, +y = topo; altura ~25 */
function headProfile(g,sk,h,o){
  var s='';
  // cabelo de trás
  if(g==='f'){
    s+=path('M-6,9 C-14,10 -19,3 -18,-6 C-17,-14 -12,-19 -6,-21 L-2,-14 C-8,-10 -9,-2 -6,9 Z',h[1],OUT,0.5);
    // rabo de cavalo deitado sobre o encosto (em direção ao topo)
    s+=path('M-11,8 C-19,13 -24,22 -22,33 C-21,40 -15,46 -9,47 C-14,40 -15,31 -11,24 C-9,19 -6,15 -3,12 Z',h[0],OUT,0.5);
    s+=path('M-14,16 C-18,24 -18,33 -14,41',null||'none',h[2],0.6,' opacity=".7"');
    s+=path('M-12,9 C-10,8 -7,9 -6,11 L-9,13 Z',h[1],OUT,0.4);
  }
  // nuca, crânio e rosto
  s+=path('M-10,6 C-12,-2 -11,-10 -4,-14 C2,-17 9,-15 12,-9 C13.2,-6.5 13.4,-4 13.2,-1.5 L15.6,3.6 C15.9,4.4 15.4,4.9 14.6,5 L13.4,5.2 C13.7,6.1 13.6,6.9 13,7.3 C13.4,8 13.3,8.7 12.6,9.2 C12.6,11 11.8,12.6 9.6,13.1 C7.4,13.6 5.2,13.4 3.2,12.4 C1.8,13.8 0.8,15.6 0.6,17.6 L-6,17.2 C-6.4,14 -7.4,10.6 -10,6 Z',sk[0],OUT,0.55);
  // sombra do maxilar e pescoço
  s+=path('M3.2,12.4 C1.8,13.8 0.8,15.6 0.6,17.6 L-6,17.2 C-6.4,14.6 -7,12.4 -8.2,10 C-4,12 0,12.8 3.2,12.4 Z',sk[1],null);
  s+=path('M9.6,13.1 C7.4,13.6 5.2,13.4 3.2,12.4',null||'none',OUT,0.45);
  // orelha
  s+=path('M-3.2,-1.6 C-0.6,-3 1.6,-1.2 1.4,1.6 C1.2,4.4 -0.8,6 -3,5.2 C-4.2,3.4 -4.4,0.4 -3.2,-1.6 Z',sk[0],OUT,0.5);
  s+=path('M-1.9,-0.4 C-0.4,0.4 -0.4,2.6 -1.8,3.8',null||'none',sk[2],0.5);
  // olho de perfil (sério)
  s+=path('M7.4,-1.6 C8.8,-2.4 10.4,-2.2 11.6,-1.3 C11,0.4 9.8,1.3 8.4,1.1 C7.6,0.5 7.2,-0.6 7.4,-1.6 Z','#f2f7ff',OUT,0.45);
  s+=path('M8.6,-2 C9.9,-1.9 10.6,-1.2 10.6,-0.2 C10.4,0.7 9.4,1.1 8.6,1 Z',o.eye||'#3fb8ff',null);
  s+=path('M9,-1.4 L9.9,-1.3 L9.6,-0.5 Z','#ffffff',null);
  s+=path('M7,-2.1 C8.6,-3.1 10.6,-3 12,-1.8',null||'none',OUT,0.9);
  s+=path('M6.6,-4.2 C8.6,-5 11,-4.8 12.6,-3.6',null||'none',h[1],1.15);   // sobrancelha séria
  if(g==='f')s+=path('M11.4,-1.8 L12.6,-2.6',null||'none',OUT,0.5);
  s+=path('M11.6,8.4 C12.2,8.4 12.6,8.6 12.6,9',null||'none',OUT,0.45);    // boca fechada
  s+=path('M14.2,4.2 C14.6,4.4 14.6,4.8 14.2,5',null||'none',sk[2],0.4);
  // cabelo da frente
  if(g==='f'){
    s+=path('M-11,3 C-13,-8 -8,-16 0,-18 C6,-19.5 11.6,-16.6 13.6,-10.6 C11.6,-11.2 9.6,-10.8 8.4,-9.4 C9.6,-7.4 10,-5.4 9.6,-3.4 C7.4,-6 5.4,-8.4 2.4,-9.4 C0,-7 -1.6,-4 -2.4,-0.6 C-4.4,-2.6 -6.4,-0.2 -6.6,3.6 Z',h[0],OUT,0.55);
    s+=path('M-4,-13 C1,-16 7,-16 11,-12.6',null||'none',h[2],0.7,' opacity=".8"');
    s+=path('M-9,0 C-9.6,-6 -6.6,-11 -1.6,-13.4',null||'none',h[2],0.55,' opacity=".6"');
  }else{
    s+=path('M-11.6,4.4 C-14.2,0 -15,-5.6 -12.8,-10.6 L-17.6,-12.4 L-11.2,-14 L-13.4,-19.4 L-6.6,-17.2 L-5.4,-23.4 L-0.4,-18.6 L3.6,-22.6 L5.2,-17.4 L11,-19 L10,-14.2 L15.6,-12.8 L11.4,-10.2 C10.6,-8.6 10.2,-6.8 10.4,-5 C8.4,-6.8 6.6,-8.6 4,-9.4 C3,-7.4 2,-5 1.6,-2.6 C-0.2,-4.4 -2.4,-5 -4.6,-4.4 C-5.6,-2 -6.4,1.2 -6.6,4.4 Z',h[0],OUT,0.55);
    s+=path('M-8,-12.4 C-3,-16.4 3.4,-16.8 9,-14.2',null||'none',h[2],0.7,' opacity=".8"');
    s+=path('M-11,-4 C-11,-8 -9,-11 -6,-12.6',null||'none',h[1],0.7);
    s+=path('M2,-10 C3.6,-12.4 6.6,-13.6 9.6,-13.2',null||'none',h[1],0.6);
  }
  return s;
}

/* cabeça de boneco (sem cabelo), perfil: +x rosto, -y topo (convenção de tela) */
function headMannequin(sk){
  var s='';
  s+=path('M-10,6 C-13,-3 -11.4,-12.6 -4.6,-16.2 C1.6,-19.2 9.4,-17 12.4,-10.4 C13.4,-7.8 13.6,-4.8 13.2,-2 L15.4,3.4 C15.7,4.3 15.2,4.9 14.4,5 L13.4,5.2 C13.7,6.1 13.6,6.9 13,7.3 C13.4,8 13.3,8.7 12.6,9.2 C12.6,11 11.8,12.6 9.6,13.1 C7.4,13.6 5.2,13.4 3.2,12.4 C1.8,13.8 0.8,15.6 0.6,17.6 L-6,17.2 C-6.4,14 -7.4,10.6 -10,6 Z',sk[0],OUT,0.55);
  s+=path('M-10,6 C-13,-3 -11.4,-12.6 -4.6,-16.2 C-8,-11 -8.6,-3 -5.4,4 C-4,8 -2,11 0.8,13.2 C0.6,14.6 0.6,16 0.6,17.6 L-6,17.2 C-6.4,14 -7.4,10.6 -10,6 Z',sk[1],null);
  s+=path('M-3.4,-14.6 C1.6,-17 7.6,-16 10.8,-11.4','none','#ffffff',0.7,' opacity=".35"');
  s+=path('M3.2,12.4 C1.8,13.8 0.8,15.6 0.6,17.6','none',OUT,0.45);
  s+=path('M-2.6,-0.4 C-0.8,-1.4 0.6,0 0.5,1.8 C0.4,3.6 -0.8,4.6 -2.4,4.2 C-3.2,2.8 -3.4,0.8 -2.6,-0.4 Z',sk[1],sk[2],0.4);
  s+=path('M7.8,-0.6 C9,-0.1 10.4,-0.1 11.4,-0.8','none',sk[2],0.6);
  s+=path('M7.4,-3.4 C9,-4 10.8,-3.9 12.2,-3','none',sk[2],0.5);
  s+=path('M11.4,8.4 C12,8.5 12.4,8.6 12.6,9','none',sk[2],0.45);
  return s;
}

/* ---------- Leg Press 45° ---------- */
function legPress(o){
  o=o||{};
  var g='m',sk=['#c7cdd6','#9ea7b4','#77808f'],h=sk;
  var F=Math.max(+o.fat||0,0),Fn=Math.min(+o.fat||0,0),M=Math.max(-1,Math.min(1,+o.mus||0));
  var fem=g==='f',show=o.muscles!==false,defs=[],out='';
  var ph=o.t==null?0:o.t,e=o.e!=null?Math.max(0,Math.min(1,+o.e)):ease(ph);              // 0 = pernas estendidas, 1 = joelhos flexionados
  // ----- geometria (cm) -----
  var BA=31,a=rot([-1,0],-BA),pn=mul(perp(a),-1);           // a: direção do encosto (para a cabeça); pn: normal da superfície (para cima)
  var H=[0,52];                                      // quadril
  var U=nrm([1,1]),Nn=perp(U);                       // U: trilho a 45°; Nn: perpendicular (para cima-esquerda)
  var LT=fem?43:45,LS=fem?42:44;
  var D=lerp(LT+LS-1.5,61,e);                          // distância quadril-tornozelo
  var A=add(add(H,mul(U,D)),mul(Nn,9));              // tornozelo
  var K=ik(H,A,LT,LS,1);                             // joelho (dobra para o peito)
  var sole=add(A,mul(U,4.2));                        // planta do pé encostada na plataforma
  // tronco ao longo do encosto
  var TL=fem?44:47,Sh=add(add(H,mul(a,TL)),mul(pn,fem?4:5));
  var neck=add(Sh,mul(a,5)),Hc=add(add(Sh,mul(a,15.5)),mul(pn,4));
  // mãos nas pegadas laterais ao lado do quadril
  var G=add(H,[9,-2]),E=ik(Sh,G,fem?27:29,fem?25:27,-1);
  // ----- larguras com forma do corpo -----
  var kth=1+0.22*F+0.10*Fn+0.16*M,kar=1+0.16*F+0.08*Fn+0.24*M,ktor=1+0.2*F+0.08*Fn+0.08*M;
  var thW=(fem?15.5:16.5)*kth,knW=(fem?9.6:10.4)*(1+0.1*F),caW=(fem?10:11)*(1+0.12*F+0.12*M),anW=5.6;
  var uaW=(fem?7.6:9.2)*kar,elW=(fem?5.8:6.8)*kar,faW=(fem?6.2:7.6)*kar,wrW=4.6;

  // ----- fundo -----
  var body='';
  var floorC=P3(55,0,0);
  body+='<ellipse cx="'+f(floorC[0])+'" cy="'+f(floorC[1]-2)+'" rx="128" ry="18" fill="#000" opacity=".35"/>';

  // ----- máquina: lado de trás (z negativo) -----
  var ZR=21,ZB=21;
  var R0=[20,55],R1=[136,171];                      // trilhos
  function rail(z){return tube([R0[0],R0[1],z],[R1[0],R1[1],z],5.2,defs,{capA:true,capB:true});}
  function frame(z){
    var s='';
    s+=tube([-78,2.6,z],[R1[0]+10,2.6,z],5.2,defs,{capA:true,capB:true});          // base no chão
    s+=tube([R1[0]+4,2,z],[R1[0]+4,R1[1]+4,z],5.4,defs,{capB:true});          // coluna traseira
    s+=tube([84,2,z],[84,R0[1]+(84-R0[0])-3,z],4.6,defs);                     // apoio do meio
    s+=tube([R0[0]+2,2,z],[R0[0]+2,R0[1]-2,z],5,defs);                        // pé do trilho
    return s;
  }
  // sled
  var sl=sub(sole,mul(U,0)),ZP=25;
  var plC=add(add(sole,mul(U,13)),mul(Nn,-14));       // pino das anilhas
  body+=frame(-ZB)+rail(-ZR);
  body+=tube([plC[0],plC[1],-ZP],[plC[0],plC[1],-ZP-16],4.4,defs);
  body+=plate([plC[0],plC[1]],20,-ZP-13,-ZP-4,defs);
  body+=plate([plC[0],plC[1]],15,-ZP-4.5,-ZP+0.5,defs);
  // travessas do chão
  body+=tube([-78,2.6,-ZB],[-78,2.6,ZB],5,defs);
  body+=tube([R0[0]+2,2.6,-ZB],[R0[0]+2,2.6,ZB],4.6,defs);

  // carro do sled (atrás da plataforma)
  var c0=add(sole,mul(Nn,-17)),c1=add(sole,mul(Nn,30));
  var cc=STEEL;
  body+=box([sole[0]+U[0]*1.5-Nn[0]*17,sole[1]+U[1]*1.5-Nn[1]*17,-ZP],[U[0]*14,U[1]*14,0],[Nn[0]*10,Nn[1]*10,0],[0,0,2*ZP],['#6f7a8a','#6f7a8a','#99a3b2','#c7cfda','#5b6573','#8a95a5'],defs);
  // rolamentos do carro sobre os trilhos (lado de lá)
  var brg=function(z){var s2='';[2,13].forEach(function(k){var c=add(add(sole,mul(U,1.5+k)),mul(Nn,-17.6)),q=P3(c[0],c[1],z);s2+='<circle cx="'+f(q[0])+'" cy="'+f(q[1])+'" r="2.6" fill="#1a1e26" stroke="'+OUT+'" stroke-width=".4"/><circle cx="'+f(q[0])+'" cy="'+f(q[1])+'" r="1" fill="#8a94a3"/>';});return s2;};
  body+=brg(-ZR+0.5);
  // plataforma dos pés
  var PL0=add(sole,mul(Nn,-15)),plw=46;
  body+=box([PL0[0],PL0[1],-ZP],[U[0]*3.2,U[1]*3.2,0],[Nn[0]*plw,Nn[1]*plw,0],[0,0,2*ZP],[
    '#3a4250','#3a4250',
    '#56606f',
    '#c9d1dc',
    function(q){var id='pf'+(++uid);defs.push('<linearGradient id="'+id+'" gradientUnits="userSpaceOnUse" x1="'+f(q[0][0])+'" y1="'+f(q[0][1])+'" x2="'+f(q[1][0])+'" y2="'+f(q[1][1])+'"><stop offset="0" stop-color="#4b5462"/><stop offset="1" stop-color="#2c333e"/></linearGradient>');return 'url(#'+id+')';},
    '#a9b3c1'],defs);
  // faixa antiderrapante e detalhe azul do Sistema na plataforma
  var pf=function(a1,b1,z){return P3(PL0[0]+Nn[0]*a1-U[0]*0.1,PL0[1]+Nn[1]*a1-U[1]*0.1,z);};
  body+=path(poly([pf(4,0,-ZP+2),pf(plw-4,0,-ZP+2),pf(plw-4,0,ZP-2),pf(4,0,ZP-2)]),'none','#1c222b',0.5);
  body+=path('M'+pt(pf(plw-2.2,0,-ZP+3))+' L'+pt(pf(plw-2.2,0,ZP-3)),'none','#3fb8ff',0.7,' opacity=".9"');

  // encosto e assento (estofado)
  var B0=[-5,43.5];
  var padT=9;
  function pad(o0,dir,L,col1,col2){
    var e1=[dir[0]*L,dir[1]*L,0],e2=[-pn2(dir)[0]*padT,-pn2(dir)[1]*padT,0],e3=[0,0,42];
    var oo=[o0[0],o0[1],-21];
    return box(oo,e1,e2,e3,[col2,col2,'#20252e',function(q){var id='pd'+(++uid);defs.push('<linearGradient id="'+id+'" gradientUnits="userSpaceOnUse" x1="'+f(q[0][0])+'" y1="'+f(q[0][1])+'" x2="'+f(q[3][0])+'" y2="'+f(q[3][1])+'"><stop offset="0" stop-color="#2a303b"/><stop offset=".5" stop-color="#3a4250"/><stop offset="1" stop-color="#262b35"/></linearGradient>');return 'url(#'+id+')';},col1,'#2a303b'],defs);
  }
  function pn2(d){var q=perp(d);return q[1]<0?mul(q,-1):q;}
  // estrutura do banco (central)
  body+=tube([-4,2.6,0],[-4,38,0],5.2,defs);
  body+=tube([-58,2.6,0],[-50,58,0],5,defs);
  body+=tube([-4,30,0],[R0[0]+2,R0[1]-4,0],4.6,defs);
  body+=tube([-4,2.6,-ZB],[-4,2.6,ZB],4.6,defs);
  body+=tube([-58,2.6,-ZB],[-58,2.6,ZB],4.6,defs);
  body+=pad(B0,a,86,'#1b2029','#14181f');
  var st=function(p0,dir,L){var q0=add(p0,mul(pn2(dir),-1.4)),q1=add(q0,mul(dir,L));var A3=P3(q0[0],q0[1],21),B3=P3(q1[0],q1[1],21);return path('M'+pt(A3)+' L'+pt(B3),'none','#4b5361',0.35,' stroke-dasharray="1.2 1"');};
  body+=st([B0[0]+a[0]*2,B0[1]+a[1]*2],a,82);
  var seatD=nrm([1,0.36]);
  body+=pad([-5,43.5],seatD,22,'#1b2029','#14181f');

  // ----- personagem -----
  var J='#1b2644',JS='#111a31',JL='#2b3d66',GL='#3fb8ff',PA='#171e30',PS='#0d121e',PL='#232d45';
  var RED=['#ff5a6a','#e0283f','#a3122a'],SEC='#f2788a',SEC2='#c95a6b';
  var gq='mq'+(++uid);defs.push('<linearGradient id="'+gq+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+RED[0]+'"/><stop offset=".55" stop-color="'+RED[1]+'"/><stop offset="1" stop-color="'+RED[2]+'"/></linearGradient>');
  function leg(z,near){
    var s='',sk0=near?sk[0]:sk[1],sk1=near?sk[1]:sk[2];
    var uT=nrm(sub(K,H)),pT=perp(uT),uS=nrm(sub(A,K)),pS=perp(uS);
    // coxa
    var tD=limbD(H,K,thW,knW,(fem?2.2:2.6)*kth,1.4*kth),cid='ct'+(++uid);
    defs.push('<clipPath id="'+cid+'"><path d="'+tD+'"/></clipPath>');
    s+=path(tD,sk0,OUT,0.55);
    s+=shadeSide(H,K,thW,knW,1.4*kth,-1,sk1,0.36);
    if(show){
      s+='<g clip-path="url(#'+cid+')">';
      // quadríceps (principal)
      var q1=add(add(H,mul(uT,9)),mul(pT,thW*0.08)),q2=add(K,mul(uT,-4.5));
      var qm=add(lp(q1,q2,0.45),mul(pT,thW*0.5+2.2*kth));
      s+=path('M'+pt(add(q1,mul(pT,thW*0.42)))+' Q'+pt(qm)+' '+pt(add(q2,mul(pT,knW*0.42)))+' C'+pt(add(q2,mul(pT,-knW*0.05)))+' '+pt(add(lp(q1,q2,0.6),mul(pT,-thW*0.05)))+' '+pt(add(q1,mul(pT,-thW*0.1)))+' Z','url(#'+gq+')',OUT,0.4,near?'':' opacity=".85"');
      s+=path('M'+pt(add(lp(q1,q2,0.12),mul(pT,thW*0.3)))+' Q'+pt(add(lp(q1,q2,0.55),mul(pT,thW*0.28)))+' '+pt(add(q2,mul(pT,knW*0.16))),'none','#7a0d1f',0.5,' opacity=".8"');
      s+=path('M'+pt(add(lp(q1,q2,0.3),mul(pT,thW*0.12)))+' Q'+pt(add(lp(q1,q2,0.7),mul(pT,thW*0.08)))+' '+pt(add(q2,mul(pT,-knW*0.02))),'none','#ffb3bc',0.4,' opacity=".55"');
      // posteriores (secundário)
      s+=path('M'+pt(add(lp(H,K,0.28),mul(pT,-thW*0.48)))+' Q'+pt(add(lp(H,K,0.6),mul(pT,-thW*0.62)))+' '+pt(add(lp(H,K,0.9),mul(pT,-knW*0.5)))+' L'+pt(add(lp(H,K,0.84),mul(pT,-knW*0.18)))+' Q'+pt(add(lp(H,K,0.55),mul(pT,-thW*0.25)))+' '+pt(add(lp(H,K,0.3),mul(pT,-thW*0.2)))+' Z',SEC,null,0,' opacity=".9"');
      // vasto medial (gota acima do joelho)
      s+=path('M'+pt(add(lp(H,K,0.62),mul(pT,-thW*0.05)))+' Q'+pt(add(lp(H,K,0.86),mul(pT,-knW*0.3)))+' '+pt(add(K,add(mul(uT,-2.4),mul(pT,knW*0.05))))+' Q'+pt(add(lp(H,K,0.8),mul(pT,knW*0.2)))+' '+pt(add(lp(H,K,0.62),mul(pT,-thW*0.05)))+' Z','#c81e3a',OUT,0.3,' opacity=".9"');
      s+=path(tD,'none','#ffffff',0.8,' opacity=".12" transform="translate(-0.5,0.6)"');
      s+='</g>';
      s+=path(tD,'none',OUT,0.55);
    }else s+=path('M'+pt(add(lp(H,K,0.3),mul(pT,thW*0.2)))+' Q'+pt(add(lp(H,K,0.6),mul(pT,thW*0.32)))+' '+pt(add(K,mul(pT,knW*0.15))),'none',sk[2],0.5);
    // joelho
    s+=path('M'+pt(add(K,mul(pT,knW*0.42)))+' q'+pt(mul(add(uT,pT),1.6))+' '+pt(mul(uS,3)),'none',sk[2],0.5);
    // canela e panturrilha
    s+=limb(K,A,knW*0.95,anW,0.6,(fem?2.6:3)*(1+0.1*F+0.15*M),sk0);
    s+=shadeSide(K,A,knW*0.95,anW,(fem?2.6:3),-1,sk1,0.4);
    if(show)s+=path('M'+pt(add(lp(K,A,0.12),mul(pS,-knW*0.5)))+' Q'+pt(add(lp(K,A,0.36),mul(pS,-caW*0.62-2)))+' '+pt(add(lp(K,A,0.7),mul(pS,-anW*0.5)))+' L'+pt(add(lp(K,A,0.6),mul(pS,-anW*0.1)))+' Q'+pt(add(lp(K,A,0.34),mul(pS,-caW*0.2)))+' '+pt(add(lp(K,A,0.15),mul(pS,-knW*0.15)))+' Z',SEC,null,0,' opacity=".85"');
    s+=path('M'+pt(add(lp(K,A,0.15),mul(pS,knW*0.3)))+' L'+pt(add(lp(K,A,0.8),mul(pS,anW*0.25))),'none',sk[2],0.45,' opacity=".7"');
    // pé descalço do boneco: sola na plataforma, dedos para cima
    var toe=add(add(sole,mul(Nn,13.6)),mul(U,-2.4)),heel=add(add(sole,mul(Nn,-3.8)),mul(U,-1));
    var foot='M'+pt(add(A,mul(pS,anW*0.5)))+' C'+pt(add(add(A,mul(U,-3.6)),mul(Nn,3)))+' '+pt(add(add(toe,mul(U,-5.6)),mul(Nn,-3)))+' '+pt(add(add(toe,mul(U,-3.2)),mul(Nn,0.6)))+' C'+pt(add(add(toe,mul(U,-1.6)),mul(Nn,1.6)))+' '+pt(add(toe,mul(U,0.4)))+' '+pt(add(add(toe,mul(U,0.4)),mul(Nn,-1.4)))+' L'+pt(add(heel,mul(U,0.4)))+' C'+pt(add(add(heel,mul(U,-1.4)),mul(Nn,-1.8)))+' '+pt(add(add(heel,mul(U,-3.4)),mul(Nn,-1.2)))+' '+pt(add(A,mul(pS,-anW*0.5)))+' Z';
    s+=path(foot,sk0,OUT,0.55);
    s+=path('M'+pt(add(add(toe,mul(U,-2.6)),mul(Nn,-2.6)))+' L'+pt(add(add(toe,mul(U,-0.6)),mul(Nn,-3.4))),'none',sk[2],0.4);
    return s;
  }
  function shorts(z,near,only){
    // quadril e glúteo do boneco; glúteo em vermelho claro (músculo auxiliar)
    var uT=nrm(sub(K,H)),pT=perp(uT),E1=lp(H,K,0.3),w1=thW*1.02;
    var d='M'+pt(add(add(H,mul(a,9)),mul(pn,8)))+' L'+pt(add(E1,mul(pT,w1/2)))+' L'+pt(add(E1,mul(pT,-w1/2)))+' C'+pt(add(add(H,mul(pT,-thW*0.7)),mul(uT,2)))+' '+pt(add(add(H,mul(a,4)),mul(pn,-9)))+' '+pt(add(add(H,mul(a,12)),mul(pn,-8.6)))+' Z';
    var s=only?'':path(d,near?sk[0]:sk[1],null);
    if(only===false)return s;
    if(show)s+=path('M'+pt(add(add(H,mul(a,3)),mul(pn,-8.6)))+' C'+pt(add(add(H,mul(uT,5)),mul(pT,-thW*0.66)))+' '+pt(add(lp(H,E1,0.85),mul(pT,-w1*0.48)))+' '+pt(add(E1,mul(pT,-w1*0.42)))+' C'+pt(add(lp(H,E1,0.6),mul(pT,-thW*0.05)))+' '+pt(add(H,mul(a,5)))+' '+pt(add(add(H,mul(a,9)),mul(pn,-5)))+' Z',near?SEC:SEC2,OUT,0.4);
    s+=path('M'+pt(add(add(H,mul(a,12)),mul(pn,-8.6)))+' C'+pt(add(add(H,mul(a,4)),mul(pn,-9)))+' '+pt(add(add(H,mul(pT,-thW*0.7)),mul(uT,2)))+' '+pt(add(E1,mul(pT,-w1/2))),'none',OUT,0.55);
    return s;
  }
  function arm(near){
    var s='',sk0=near?sk[0]:sk[1],sk1=near?sk[1]:sk[2];
    s+=limb(Sh,E,uaW,elW,1.6*kar,0.8,sk0);
    s+=shadeSide(Sh,E,uaW,elW,0.8,-1,sk1,0.38);
    s+=limb(E,G,elW,wrW,1.6*kar,0.6,sk0);
    s+=shadeSide(E,G,elW,wrW,0.6,-1,sk1,0.38);
    var uF=nrm(sub(G,E)),pF=perp(uF);
    s+=path('M'+pt(add(G,mul(pF,2.6)))+' C'+pt(add(add(G,mul(uF,4)),mul(pF,3.4)))+' '+pt(add(add(G,mul(uF,6.4)),mul(pF,0.4)))+' '+pt(add(add(G,mul(uF,5.4)),mul(pF,-2.4)))+' C'+pt(add(add(G,mul(uF,3)),mul(pF,-3.2)))+' '+pt(add(G,mul(pF,-2.6)))+' '+pt(add(G,mul(pF,-2.2)))+' Z',sk0,OUT,0.5);
    return s;
  }
  // pegadas laterais
  function handle(z){var g0=add(G,[2.2,0.4]);return tube([g0[0]-7,g0[1]-6,z],[g0[0]+3,g0[1]+1,z],2.6,defs,{stops:['#5d6674','#262c36','#121519'],capB:true})+tube([-6,34,z],[g0[0]-7,g0[1]-6,z],3.6,defs);}
  function torso(){
    var s='';var tw=(fem?18:23)*ktor,bw=(fem?14.5:17)*ktor;
    var back0=add(add(H,mul(a,4)),mul(pn,-8.6)),back1=add(add(Sh,mul(a,3)),mul(pn,-7.4));
    var ch=add(add(Sh,mul(a,-6)),mul(pn,tw*0.62)),bel=add(add(H,mul(a,12)),mul(pn,bw*0.5+5*F));
    var top=add(add(Sh,mul(a,4)),mul(pn,5)),hp=add(add(H,mul(a,8)),mul(pn,8));
    // tronco nu do boneco
    var d='M'+pt(back0)+' L'+pt(back1)+' C'+pt(add(back1,mul(a,3)))+' '+pt(add(top,mul(pn,-4)))+' '+pt(top)+' C'+pt(add(top,mul(pn,4)))+' '+pt(add(ch,mul(a,4)))+' '+pt(ch)+' C'+pt(add(lp(ch,bel,0.5),mul(pn,2+3*F)))+' '+pt(add(bel,mul(a,4)))+' '+pt(bel)+' L'+pt(hp)+' C'+pt(add(H,mul(pn,2)))+' '+pt(add(back0,mul(pn,4)))+' '+pt(back0)+' Z';
    s+=path(d,sk[0],OUT,0.6);
    s+=path('M'+pt(add(back1,mul(pn,2.4)))+' C'+pt(add(lp(back1,back0,0.5),mul(pn,3.2)))+' '+pt(add(back0,mul(pn,3)))+' '+pt(add(back0,mul(pn,3))),'none',sk[1],4.2,' opacity=".9"');
    // peitoral e abdômen
    s+=path('M'+pt(add(top,add(mul(a,-1),mul(pn,2))))+' C'+pt(add(ch,add(mul(a,2),mul(pn,-1))))+' '+pt(add(ch,add(mul(a,-3),mul(pn,-1.6))))+' '+pt(add(ch,add(mul(a,-5),mul(pn,-4.4)))),'none',sk[2],0.55);
    [0.3,0.5,0.7].forEach(function(k){var q=lp(ch,bel,k);s+=path('M'+pt(add(q,mul(pn,-1.2)))+' L'+pt(add(q,mul(pn,-4.2))),'none',sk[2],0.45,' opacity=".8"');});
    s+=path('M'+pt(add(lp(ch,bel,0.25),mul(pn,-0.6)))+' C'+pt(add(lp(ch,bel,0.55),mul(pn,0.6)))+' '+pt(add(bel,mul(pn,-0.8)))+' '+pt(add(bel,mul(pn,-1))),'none','#ffffff',0.7,' opacity=".3"');
    // ombro / deltóide (pele)
    var sh0=add(Sh,mul(pn,1));
    s+=path('M'+pt(add(sh0,add(mul(a,4),mul(pn,-4.6))))+' C'+pt(add(sh0,add(mul(a,6),mul(pn,2.6))))+' '+pt(add(sh0,add(mul(a,1),mul(pn,6.6*kar))))+' '+pt(add(sh0,add(mul(a,-5.6),mul(pn,4.6*kar))))+' L'+pt(add(sh0,add(mul(a,-4),mul(pn,-3))))+' Z',sk[0],OUT,0.55);
    // pescoço
    s+=limb(add(Sh,mul(pn,1)),add(neck,mul(pn,2.6)),fem?8:10,fem?7:9,0.2,0.2,sk[0]);
    s+=path('M'+pt(add(Sh,mul(pn,-2.4)))+' L'+pt(add(neck,mul(pn,-0.4))),'none',sk[1],2.2,' opacity=".9"');
    return s;
  }
  var person='';
  // lado de lá (perna e braço esquerdos)
  person+='<g'+at(-9)+'>'+handle(-1)+arm(false)+shorts(-9,false,false)+leg(-9,false)+shorts(-9,false,true)+'</g>';
  person+=torso();
  // cabeça
  var hang=ang(a)-90;                                // topo da cabeça aponta para "a"
  person+='<g transform="translate('+pt(Hc)+') rotate('+f(ang(a)-90)+') scale(1,-1)">'+headMannequin(sk)+'</g>';
  person+='<g'+at(9)+'>'+shorts(9,true,false)+leg(9,true)+shorts(9,true,true)+'</g>';
  person+='<g'+at(13)+'>'+arm(true)+handle(1)+'</g>';
  body+=person;

  // ----- máquina: lado da frente -----
  body+=rail(ZR);
  body+=brg(ZR+0.5);
  // batentes de segurança no trilho
  [[R0[0]+14,0]].forEach(function(k){var c=[k[0],R0[1]+(k[0]-R0[0])+3.4];body+=box([c[0]-3,c[1]-2.6,ZR-3.2],[6,6,0],[-2.4,2.4,0],[0,0,6.4],['#c79a1f','#e3b23c','#8a6a12','#f2c75a','#a9821a','#d6a92e'],defs);});
  body+=frame(ZB);
  body+=tube([plC[0],plC[1],ZP],[plC[0],plC[1],ZP+16],4.4,defs,{capB:true});
  body+=plate([plC[0],plC[1]],15,ZP-0.5,ZP+4.5,defs);
  body+=plate([plC[0],plC[1]],20,ZP+4,ZP+13,defs);
  body+=tube([R1[0]+4,2.6,-ZB],[R1[0]+4,2.6,ZB],4.6,defs,{});
  body+=tube([R1[0]+4,R1[1]+3,-ZB],[R1[0]+4,R1[1]+3,ZB],4.6,defs,{});
  body+=tube([R0[0]+2,R0[1]-3,-ZB],[R0[0]+2,R0[1]-3,ZB],4.6,defs,{});
  // trava de segurança (alavanca) perto da mão
  var lk=add(G,[3,-1]);
  body+=tube([lk[0]+4,lk[1]-10,22],[lk[0]+1,lk[1]+5,22],2.2,defs,{stops:['#ffd36b','#e3a51c','#8a5d08'],capB:true});

  // ----- montagem -----
  var W=o.w||800,Hh=o.h||560;
  var bg='<defs><radialGradient id="bgx" cx="50%" cy="78%" r="70%"><stop offset="0" stop-color="#11284a"/><stop offset=".55" stop-color="#0a1426"/><stop offset="1" stop-color="#060b16"/></radialGradient><pattern id="gridx" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#3fb8ff" stroke-opacity=".06"/></pattern>'+defs.join('')+'</defs>';
  var scene='<rect width="'+W+'" height="'+Hh+'" fill="url(#bgx)"/><rect width="'+W+'" height="'+Hh+'" fill="url(#gridx)"/>'+
    '<g transform="translate('+f(W*0.37)+','+f(Hh*0.945)+') scale('+S+',-'+S+')" stroke-width="0.5">'+body+'</g>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="'+(o.label||'Leg press 45°')+'">'+bg+scene+'</svg>';
}

var EX={'leg-press':legPress};
window.ENGEFIT_EXART={svg:function(id,o){var fn=EX[id];return fn?fn(o||{}):'';},has:function(id){return !!EX[id];},ids:Object.keys(EX)};
})();
