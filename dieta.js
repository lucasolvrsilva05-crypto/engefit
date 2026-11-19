/* ENGEFIT · Dieta: dados e cálculos (sem tela).
   Alimentos básicos: valores aproximados por 100 g, na linha da tabela TACO (Unicamp). Confira a embalagem quando precisar de precisão.
   Busca de produtos: Open Food Facts (dados abertos, licença ODbL), consultada pela internet. */
(function(){
'use strict';

var MEALS=['Café da manhã','Almoço','Jantar','Lanches'];
var MEAL_PCT=[25,35,30,10];

/* [nome, kcal, proteína g, carboidrato g, gordura g] por 100 g */
var RAW=[
['Arroz branco cozido',128,2.5,28.1,0.2],
['Arroz integral cozido',124,2.6,25.8,1.0],
['Feijão carioca cozido',76,4.8,13.6,0.5],
['Feijão preto cozido',77,4.5,14.0,0.5],
['Peito de frango grelhado',159,32.0,0,2.5],
['Peito de frango cozido',163,31.5,0,3.2],
['Patinho bovino grelhado',219,35.9,0,7.3],
['Ovo de galinha cozido',146,13.3,0.6,9.5],
['Batata-doce cozida',77,0.6,18.4,0.1],
['Batata inglesa cozida',52,1.2,11.9,0],
['Mandioca cozida',125,0.6,30.1,0.3],
['Macarrão cozido',102,3.4,19.9,0.5],
['Pão francês',300,8.0,58.6,3.1],
['Pão de forma integral',253,9.4,49.9,3.7],
['Farinha de mandioca',361,1.6,87.9,0.3],
['Aveia em flocos',394,13.9,66.6,8.5],
['Banana prata',98,1.3,26.0,0.1],
['Maçã',56,0.3,15.2,0],
['Laranja pera',37,1.0,8.9,0.1],
['Mamão papaia',40,0.5,10.4,0.1],
['Abacate',96,1.2,6.0,8.4],
['Leite integral',61,2.9,4.6,3.5],
['Iogurte natural',51,4.1,1.9,3.0],
['Queijo mussarela',330,22.6,3.0,25.2],
['Queijo minas frescal',264,17.4,3.2,20.2],
['Azeite de oliva',884,0,0,100],
['Alface',11,1.4,1.7,0.2],
['Tomate',15,1.1,3.1,0.2],
['Cenoura cozida',30,0.8,6.7,0.2],
['Brócolis cozido',25,2.1,4.4,0.5],
['Amendoim torrado',606,27.2,12.5,54.0],
['Castanha-do-pará',643,14.5,15.1,63.5],
['Açúcar refinado',387,0,99.5,0]
];
var FOODS=RAW.map(function(r,i){return {id:'t'+i,name:r[0],src:'taco',g:100,b:{k:r[1],p:r[2],c:r[3],f:r[4]}};});

function norm(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
function r1(n){return Math.round(n*10)/10;}

/* Valores de uma porção de g gramas a partir da base por 100 g. */
function scale(b,g){var k=g/100;return {k:Math.round(b.k*k),p:r1(b.p*k),c:r1(b.c*k),f:r1(b.f*k)};}

function sum(items){
  var t={k:0,p:0,c:0,f:0};
  (items||[]).forEach(function(i){t.k+=i.k||0;t.p+=i.p||0;t.c+=i.c||0;t.f+=i.f||0;});
  t.k=Math.round(t.k);t.p=r1(t.p);t.c=r1(t.c);t.f=r1(t.f);return t;
}

/* Metas em gramas a partir de kcal e porcentagens (carboidrato e proteína 4 kcal/g, gordura 9 kcal/g). */
function macroGrams(kcal,pc,pf,pp){return {c:Math.round(kcal*pc/100/4),f:Math.round(kcal*pf/100/9),p:Math.round(kcal*pp/100/4)};}

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

function searchLocal(q,extra){
  q=norm(q).trim();
  var all=(extra||[]).concat(FOODS);
  if(!q)return all.slice(0,40);
  var words=q.split(/\s+/);
  return all.filter(function(f){var n=norm(f.name);return words.every(function(w){return n.indexOf(w)>-1;});}).slice(0,40);
}

/* Open Food Facts: normaliza um produto para o formato do app; descarta os sem calorias. */
function fromOFF(p){
  var n=p&&p.nutriments||{};
  var k=n['energy-kcal_100g'];
  if(k==null&&n['energy_100g']!=null)k=n['energy_100g']/4.184;
  k=parseFloat(k);
  if(!p||!p.product_name||!isFinite(k))return null;
  function v(x){x=parseFloat(x);return isFinite(x)&&x>=0?x:0;}
  var sq=parseFloat(p.serving_quantity);
  return {id:'o'+(p.code||Math.random().toString(36).slice(2)),name:String(p.product_name).slice(0,80)+(p.brands?' · '+String(p.brands).split(',')[0].slice(0,30):''),
    src:'off',code:p.code||'',g:sq>0&&sq<=1000?Math.round(sq):100,b:{k:Math.round(k),p:r1(v(n.proteins_100g)),c:r1(v(n.carbohydrates_100g)),f:r1(v(n.fat_100g))}};
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

window.ENGEFIT_DIET={MEALS:MEALS,MEAL_PCT:MEAL_PCT,FOODS:FOODS,scale:scale,sum:sum,macroGrams:macroGrams,defaultGoal:defaultGoal,suggest:suggest,searchLocal:searchLocal,searchOFF:searchOFF};
})();
