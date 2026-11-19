# Gera /portrait.js: moldes SVG do retrato (m/f) com marcadores de cor trocados no navegador.
import json, sys
import portrait3 as P
P.SKINS['_'] = ('@Lt@', '@B@', '@S@', '@D@')
P.HAIRS['_'] = ('@h0@', '@h1@', '@h2@')
T = {g: P.portrait(g, '_', '_', '@AU@') for g in ('m', 'f')}
SK = {k: list(v) for k, v in P.SKINS.items() if k != '_'}
HR = {k: list(v) for k, v in P.HAIRS.items() if k != '_'}
js = '''/* ENGEFIT · retrato do avatar (estilo manhwa). Gerado por export_portrait.py — não editar à mão. */
(function(){
var T=%s,SKIN=%s,HAIR=%s,cache={};
function col(o,aura){var s=SKIN[o.skin]||SKIN.clara,g=o.g==='f'?'f':'m',h=HAIR[o.hair]||HAIR[g==='f'?'Castanho':'Grafite'];
  return T[g].replace(/@Lt@/g,s[0]).replace(/@B@/g,s[1]).replace(/@S@/g,s[2]).replace(/@D@/g,s[3]).replace(/@h0@/g,h[0]).replace(/@h1@/g,h[1]).replace(/@h2@/g,h[2]).replace(/@AU@/g,aura);}
function svg(o,aura,view){var s=col(o,aura);if(view==='head')s=s.replace('viewBox="0 0 400 440"','viewBox="112 22 176 176"');return s;}
function url(o,aura,view){var k=[o.g,o.skin,o.hair,aura,view].join('|');return cache[k]||(cache[k]='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg(o,aura,view)));}
function esc(t){return String(t).replace(/[&"<>]/g,function(c){return {'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[c];});}
function img(o,aura,view,label){return '<img class="ptr ptr-'+(view==='head'?'head':'bust')+'" src="'+url(o,aura,view)+'" alt="'+esc(label||'Avatar')+'" decoding="async"'+(view==='head'?' loading="lazy"':'')+'>';}
window.ENGEFIT_PORTRAIT={svg:svg,url:url,img:img,SKIN:SKIN,HAIR:HAIR};
})();
''' % (json.dumps(T, separators=(',', ':')), json.dumps(SK), json.dumps(HR))
open(sys.argv[1], 'w').write(js)
