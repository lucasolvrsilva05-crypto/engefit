/* ENGEFIT · Dieta: dados e cálculos (sem tela).
   Alimentos básicos: TACO (NEPA/UNICAMP, 4ª ed., 2011), carregada de taco.js.
   Produtos: Open Food Facts (dados abertos, licença ODbL), consultado pela internet. */
(function(){
'use strict';

var MEALS=['Café da manhã','Almoço','Jantar','Lanches'];
var MEAL_PCT=[25,35,30,10];

/* Base TACO: [nome, kcal, prot, carb, gord, fibra|null, sódio mg|null] por 100 g */
var RAW=Array.isArray(window.ENGEFIT_TACO)?window.ENGEFIT_TACO:[];
var FOODS=RAW.map(function(r,i){
  var b={k:r[1],p:r[2],c:r[3],f:r[4]};
  if(r[5]!=null)b.fi=r[5];
  if(r[6]!=null)b.na=r[6];
  return {id:'t'+i,name:r[0],src:'taco',g:100,b:b};
});

function norm(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
function r1(n){return Math.round(n*10)/10;}

/* Valores de uma porção de g gramas a partir da base por 100 g. fi, su (g) e na (mg) só existem se a base informar. */
function scale(b,g){
  var k=g/100,o={k:Math.round(b.k*k),p:r1(b.p*k),c:r1(b.c*k),f:r1(b.f*k)};
  if(b.fi!=null)o.fi=r1(b.fi*k);
  if(b.su!=null)o.su=r1(b.su*k);
  if(b.na!=null)o.na=Math.round(b.na*k);
  return o;
}

function sum(items){
  var t={k:0,p:0,c:0,f:0,fi:0,su:0,na:0};
  (items||[]).forEach(function(i){t.k+=i.k||0;t.p+=i.p||0;t.c+=i.c||0;t.f+=i.f||0;t.fi+=i.fi||0;t.su+=i.su||0;t.na+=i.na||0;});
  t.k=Math.round(t.k);t.p=r1(t.p);t.c=r1(t.c);t.f=r1(t.f);t.fi=r1(t.fi);t.su=r1(t.su);t.na=Math.round(t.na);return t;
}

/* Metas em gramas a partir de kcal e porcentagens (carboidrato e proteína 4 kcal/g, gordura 9 kcal/g). */
function macroGrams(kcal,pc,pf,pp){return {c:Math.round(kcal*pc/100/4),f:Math.round(kcal*pf/100/9),p:Math.round(kcal*pp/100/4)};}

/* Referências gerais (OMS): fibra 14 g por 1000 kcal (mínimo 25 g), açúcares livres até 10% das calorias, sódio até 2000 mg. */
function microGoals(kcal){return {fi:Math.max(25,Math.round(kcal/1000*14)),su:Math.round(kcal*0.10/4),na:2000};}

function defaultGoal(){return {kcal:2000,c:50,f:30,p:20,meals:MEAL_PCT.slice()};}

/* Estimativa de calorias diárias (Mifflin-St Jeor) com ajuste pelo objetivo. Retorna null sem dados suficientes. */
function suggest(o){
  var kg=+o.kg,cm=+o.cm,age=+o.age;
  if(!(kg>20&&kg<400&&cm>100&&cm<250&&age>=14&&age<=100))return null;
  var bmr=10*kg+6.25*cm-5*age+(o.sex==='f'?-161:5);
  var act={2:1.375,3:1.45,4:1.55,5:1.65,6:1.725}[o.days]||1.45;
  var tdee=bmr*act,adj=({emagrecer:-500,massa:300,forca:200})[o.goal]||0;
  var kcal=Math.round((tdee+adj)/50)*50;
  var floor=o.sex==='f'?1200:1500;
  if(kcal<floor)kcal=floor;
  var pp=o.goal==='massa'||o.goal==='forca'?25:o.goal==='emagrecer'?30:20;
  var pf=30,pc=100-pp-pf;
  return {kcal:kcal,c:pc,f:pf,p:pp,bmr:Math.round(bmr),tdee:Math.round(tdee)};
}

/* Busca local: todas as palavras precisam aparecer; quem começa pela primeira palavra vem antes. */
function searchLocal(q,extra){
  q=norm(q).trim();
  var all=(extra||[]).concat(FOODS);
  if(!q)return all.slice(0,40);
  var words=q.split(/\s+/),first=words[0];
  var hit=all.filter(function(f){var n=norm(f.name);return words.every(function(w){return n.indexOf(w)>-1;});});
  hit.sort(function(a,b){
    var sa=norm(a.name).indexOf(first)===0?0:1,sb=norm(b.name).indexOf(first)===0?0:1;
    return sa-sb||a.name.length-b.name.length;
  });
  return hit.slice(0,40);
}

/* Receita: ingredientes [{n,g,b}] e número de porções. Retorna a base por 100 g e o peso de uma porção. */
function recipe(ings,serv){
  serv=+serv;
  if(!ings||!ings.length||!(serv>=1&&serv<=100))return null;
  var totalG=0,t={k:0,p:0,c:0,f:0},fi=0,su=0,na=0,hasFi=false,hasSu=false,hasNa=false;
  ings.forEach(function(i){
    var v=scale(i.b,i.g);totalG+=i.g;t.k+=v.k;t.p+=v.p;t.c+=v.c;t.f+=v.f;
    if(v.fi!=null){fi+=v.fi;hasFi=true;}if(v.su!=null){su+=v.su;hasSu=true;}if(v.na!=null){na+=v.na;hasNa=true;}
  });
  if(!(totalG>0))return null;
  var f100=100/totalG,b={k:r1(t.k*f100),p:r1(t.p*f100),c:r1(t.c*f100),f:r1(t.f*f100)};
  if(hasFi)b.fi=r1(fi*f100);if(hasSu)b.su=r1(su*f100);if(hasNa)b.na=Math.round(na*f100);
  var g=Math.max(1,Math.round(totalG/serv));
  return {b:b,g:g,totalG:Math.round(totalG),perServ:scale(b,g),total:{k:Math.round(t.k),p:r1(t.p),c:r1(t.c),f:r1(t.f)}};
}

/* Open Food Facts: normaliza um produto para o formato do app; descarta os sem calorias. */
function fromOFF(p){
  var n=p&&p.nutriments||{};
  var k=n['energy-kcal_100g'];
  if(k==null&&n['energy_100g']!=null)k=n['energy_100g']/4.184;
  k=parseFloat(k);
  if(!p||!p.product_name||!isFinite(k))return null;
  function v(x){x=parseFloat(x);return isFinite(x)&&x>=0?x:0;}
  function has(x){x=parseFloat(x);return isFinite(x)&&x>=0;}
  var sq=parseFloat(p.serving_quantity);
  var b={k:Math.round(k),p:r1(v(n.proteins_100g)),c:r1(v(n.carbohydrates_100g)),f:r1(v(n.fat_100g))};
  if(has(n.fiber_100g))b.fi=r1(v(n.fiber_100g));
  if(has(n.sugars_100g))b.su=r1(v(n.sugars_100g));
  if(has(n.sodium_100g))b.na=Math.round(v(n.sodium_100g)*1000);
  else if(has(n.salt_100g))b.na=Math.round(v(n.salt_100g)/2.5*1000);
  return {id:'o'+(p.code||Math.random().toString(36).slice(2)),name:String(p.product_name).slice(0,80)+(p.brands?' · '+String(p.brands).split(',')[0].slice(0,30):''),
    src:'off',code:p.code||'',g:sq>0&&sq<=1000?Math.round(sq):100,b:b};
}
var OFF='https://world.openfoodfacts.org';
var FIELDS='code,product_name,brands,nutriments,serving_quantity';
function getJSON(url,signal){
  return fetch(url,{signal:signal,headers:{Accept:'application/json'}}).then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.json();});
}
function searchOFF(q,signal){
  q=String(q||'').trim();
  if(q.length<2)return Promise.resolve([]);
  if(/^\d{8,14}$/.test(q))
    return getJSON(OFF+'/api/v2/product/'+q+'.json?fields='+FIELDS,signal).then(function(j){var f=j&&j.status===1?fromOFF(j.product):null;return f?[f]:[];});
  return getJSON(OFF+'/cgi/search.pl?search_simple=1&action=process&json=1&page_size=20&lc=pt&fields='+FIELDS+'&search_terms='+encodeURIComponent(q),signal)
    .then(function(j){return (j.products||[]).map(fromOFF).filter(Boolean);});
}

window.ENGEFIT_DIET={MEALS:MEALS,MEAL_PCT:MEAL_PCT,FOODS:FOODS,scale:scale,sum:sum,macroGrams:macroGrams,microGoals:microGoals,defaultGoal:defaultGoal,suggest:suggest,searchLocal:searchLocal,recipe:recipe,searchOFF:searchOFF};
})();
