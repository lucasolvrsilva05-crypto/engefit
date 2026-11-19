# Retrato v3: estilo manhwa de ação (proporções realistas, sombreado pintado, mechas de cabelo, luz dramática).
# Personagens originais do ENGEFIT. Olhos brilham na cor do rank.
import math, random, sys

W, H = 400, 440
LINE = '#1a0f0c'

SKINS = {  # luz, base, sombra, sombra funda
    'clara':  ('#fbe3d3', '#efc6ad', '#c99479', '#8d5c48'),
    'media':  ('#f2d0b2', '#d9a684', '#ad7656', '#6f4532'),
    'morena': ('#deb08a', '#b98057', '#8a5636', '#55321f'),
    'escura': ('#a97052', '#7f4c33', '#5a3222', '#341b11'),
}
HAIRS = {'Grafite': ('#15161d', '#2c2f3d', '#5c6178'), 'Castanho': ('#24160f', '#4a2e1d', '#86593a'),
         'Preto': ('#0b0b10', '#1d1e27', '#454a5c'), 'Vinho': ('#260a12', '#4f1424', '#8e3550'),
         'Loiro': ('#7a5428', '#b88a4b', '#ecd096'), 'Prata': ('#5d6270', '#9aa1b0', '#e9edf5')}

def mx(x): return 400 - x

def lock(rx, ry, tx, ty, w, bend=0.0):
    """Mecha afinando da raiz (rx,ry) até a ponta (tx,ty)."""
    dx, dy = tx - rx, ty - ry; L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L, dx / L
    a = (rx - w / 2, ry); b = (rx + w / 2, ry)
    c1 = ((a[0] + tx) / 2 + nx * bend - w * .15, (a[1] + ty) / 2 + ny * bend)
    c2 = ((b[0] + tx) / 2 + nx * bend + w * .15, (b[1] + ty) / 2 + ny * bend)
    return f'M{a[0]:.1f},{a[1]:.1f} Q{c1[0]:.1f},{c1[1]:.1f} {tx:.1f},{ty:.1f} Q{c2[0]:.1f},{c2[1]:.1f} {b[0]:.1f},{b[1]:.1f} Z'

def spindle(rx, ry, tx, ty, w, bend=0.0):
    dx, dy = tx - rx, ty - ry; L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L, dx / L; mx_, my_ = (rx + tx) / 2 + nx * bend, (ry + ty) / 2 + ny * bend
    return (f'M{rx:.1f},{ry:.1f} Q{mx_ - nx*w:.1f},{my_ - ny*w:.1f} {tx:.1f},{ty:.1f} '
            f'Q{mx_ + nx*w:.1f},{my_ + ny*w:.1f} {rx:.1f},{ry:.1f} Z')

def spiky(cx, cy, r1, r2, a0, a1, n, seed, jit=6):
    rnd = random.Random(seed); pts = []
    for i in range(n * 2 + 1):
        a = math.radians(a0 + (a1 - a0) * i / (n * 2))
        r = (r2 + rnd.uniform(-jit, jit)) if i % 2 else (r1 + rnd.uniform(-2, 2))
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    d = f'M{pts[0][0]:.1f},{pts[0][1]:.1f}'
    for i in range(1, len(pts), 2):
        p, q = pts[i], pts[i + 1] if i + 1 < len(pts) else pts[i]
        d += f' Q{p[0]:.1f},{p[1]:.1f} {q[0]:.1f},{q[1]:.1f}' if i % 2 == 0 else f' L{p[0]:.1f},{p[1]:.1f} L{q[0]:.1f},{q[1]:.1f}'
    return d

def defs(aura, skin):
    Lt, B, S, D = skin
    return f'''<defs>
 <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0c18"/><stop offset="1" stop-color="#040408"/></linearGradient>
 <radialGradient id="fog" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="{aura}" stop-opacity=".55"/><stop offset="1" stop-color="{aura}" stop-opacity="0"/></radialGradient>
 <linearGradient id="skinL" x1="0" y1="0" x2="1" y2="0"><stop offset=".25" stop-color="{S}" stop-opacity="0"/><stop offset=".62" stop-color="{S}" stop-opacity=".55"/><stop offset="1" stop-color="{D}" stop-opacity=".75"/></linearGradient>
 <linearGradient id="cloth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3f4f"/><stop offset=".45" stop-color="#1d202a"/><stop offset="1" stop-color="#0c0d12"/></linearGradient>
 <radialGradient id="iris" cx="50%" cy="65%" r="60%"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="{aura}"/><stop offset="1" stop-color="#0a0a18"/></radialGradient>
 <filter id="s1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter>
 <filter id="s3" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5"/></filter>
 <filter id="s8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
 <filter id="mist"><feTurbulence type="fractalNoise" baseFrequency=".012 .02" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 -.35"/></filter>
 <clipPath id="frame"><rect width="{W}" height="{H}" rx="22"/></clipPath>
 <linearGradient id="rg" x1="0" y1="0" x2="1" y2="0"><stop offset=".52" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity="1"/></linearGradient>
 <mask id="rimR" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="url(#rg)"/></mask>
</defs>'''

def background(aura, seed=3):
    rnd = random.Random(seed)
    s = f'<rect width="{W}" height="{H}" fill="url(#bg)"/>'
    s += f'<ellipse cx="300" cy="150" rx="190" ry="170" fill="url(#fog)"/><ellipse cx="80" cy="380" rx="160" ry="110" fill="url(#fog)" opacity=".6"/>'
    s += f'<g opacity=".22"><rect width="{W}" height="{H}" filter="url(#mist)" fill="{aura}"/></g>'
    s += f'<rect width="{W}" height="{H}" fill="{aura}" opacity=".06"/>'
    for _ in range(46):
        x, y, r = rnd.uniform(0, W), rnd.uniform(0, H * .8), rnd.uniform(.6, 2.2)
        s += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" fill="{aura}" opacity="{rnd.uniform(.25,.9):.2f}"/>'
    return s

def rim(d, aura, w=2.4):
    # desenhado ANTES do preenchimento: só a metade de fora do traço aparece (luz de recorte)
    return (f'<g mask="url(#rimR)"><path d="{d}" fill="none" stroke="{aura}" stroke-width="{w*5}" opacity=".5" filter="url(#s3)"/>'
            f'<path d="{d}" fill="none" stroke="{aura}" stroke-width="{w*2}" stroke-linejoin="round"/></g>')

def eye(cx, cy, w, h, aura, side, fem=False):
    ox, ix = cx + side * w / 2, cx - side * w / 2
    up = f'M{ix},{cy+1} C{ix + side*w*.25},{cy-h} {cx + side*w*.2},{cy-h*1.15} {ox},{cy-h*.35}'
    lo = f'C{cx + side*w*.25},{cy+h*.75} {cx - side*w*.2},{cy+h*.85} {ix},{cy+1} Z'
    shape = up + ' ' + lo
    cid = f'e{int(cx)}'
    s = f'<ellipse cx="{cx}" cy="{cy}" rx="{w*.5}" ry="{h*1.2}" fill="{aura}" opacity=".22" filter="url(#s3)"/>'
    s += f'<clipPath id="{cid}"><path d="{shape}"/></clipPath><path d="{shape}" fill="#e9e4ea"/>'
    s += f'<g clip-path="url(#{cid})"><circle cx="{cx+side}" cy="{cy}" r="{h*1.15}" fill="url(#iris)"/>'
    s += f'<ellipse cx="{cx+side}" cy="{cy-.5}" rx="{h*.32}" ry="{h*.55}" fill="#05050c"/>'
    s += f'<rect x="{cx-w}" y="{cy-h*2}" width="{w*2}" height="{h*1.25}" fill="#000" opacity=".35" filter="url(#s1)"/>'
    s += f'<circle cx="{cx+side - h*.4}" cy="{cy - h*.45}" r="{h*.22}" fill="#fff"/></g>'
    s += f'<circle cx="{cx+side}" cy="{cy}" r="{h*1.3}" fill="{aura}" opacity=".35" filter="url(#s1)"/>'
    lw = 3.2 if fem else 2.6
    s += f'<path d="{up} l{side*3},{1.5}" fill="none" stroke="{LINE}" stroke-width="{lw}" stroke-linecap="round" stroke-linejoin="round"/>'
    s += f'<path d="M{ix + side*2},{cy-h*.9} C{cx},{cy-h*1.9} {ox - side*2},{cy-h*1.2} {ox},{cy-h*.9}" fill="none" stroke="{LINE}" stroke-width="1" opacity=".55"/>'
    s += f'<path d="M{ox - side*1},{cy-h*.2} C{cx + side*w*.2},{cy+h*.8} {cx - side*w*.15},{cy+h*.8} {ix + side*3},{cy+h*.3}" fill="none" stroke="{LINE}" stroke-width=".9" opacity=".5"/>'
    if fem:
        for k in range(3):
            s += f'<path d="M{ox - side*k*3},{cy-h*.4 - k*.6} l{side*(4-k*.4)},{-3+k*.2}" stroke="{LINE}" stroke-width="1.6" stroke-linecap="round"/>'
    return s

def brow(cx, cy, side, col, fem=False):
    ix, ox = cx - side * 14, cx + side * 15
    if fem:
        return f'<path d="M{ix},{cy+1} C{cx},{cy-5} {ox - side*4},{cy-5} {ox},{cy-2} C{ox - side*5},{cy-2.5} {cx},{cy-2} {ix},{cy+3} Z" fill="{col}"/>'
    return f'<path d="M{ix},{cy+3} C{cx - side*2},{cy-2} {ox - side*5},{cy-5} {ox},{cy-4} C{ox - side*6},{cy-1} {cx},{cy+1} {ix},{cy+6} Z" fill="{col}"/>'

def portrait(g='m', skin='media', hair='Grafite', aura='#3fb8ff'):
    fem = g == 'f'
    sk = SKINS[skin]; Lt, B, S, D = sk; h0, h1, h2 = HAIRS[hair]
    o = [defs(aura, sk), '<g clip-path="url(#frame)">', background(aura)]

    # ---------- geometria ----------
    if fem:
        face = 'M148,110 C148,90 168,56 200,56 C232,56 252,90 252,110 C253,134 250,152 242,168 C232,186 216,200 200,203 C184,200 168,186 158,168 C150,152 147,134 148,110 Z'
        body = 'M178,226 C160,240 132,248 112,256 C90,266 80,290 78,330 L74,440 L326,440 L322,330 C320,290 310,266 288,256 C268,248 240,240 222,226 Z'
        neck = 'M182,182 C183,204 181,222 176,240 L224,240 C219,222 217,204 218,182 Z'
        eyes_y, ew, eh = 133, 27, 7.2
    else:
        face = 'M146,110 C146,84 166,52 200,52 C234,52 254,84 254,110 C255,132 252,152 246,168 C238,186 222,200 200,206 C178,200 162,186 154,168 C148,152 145,132 146,110 Z'
        body = 'M176,228 C150,242 116,250 92,258 C66,268 52,292 48,334 L42,440 L358,440 L352,334 C348,292 334,268 308,258 C284,250 250,242 224,228 Z'
        neck = 'M174,178 C176,204 174,226 164,246 L236,246 C226,226 224,204 226,178 Z'
        eyes_y, ew, eh = 130, 26, 5.6

    # cabelo de trás (longo na mulher)
    if fem:
        back = 'M146,92 C132,140 126,210 114,300 C112,320 120,336 136,338 L264,338 C280,336 288,320 286,300 C274,210 268,140 254,92 C250,52 228,34 200,34 C172,34 150,52 146,92 Z'
        o.append(rim(back, aura, 2))
        o.append(f'<path d="{back}" fill="{h0}"/><path d="{back}" fill="none" stroke="{h1}" stroke-width="1" opacity=".5"/>')
        for i, (a, b) in enumerate([(140, 300), (160, 320), (240, 320), (262, 300)]):
            o.append(f'<path d="M{a+(8 if a<200 else -8)},140 C{a},220 {a},270 {a},330" fill="none" stroke="{h1}" stroke-width="1.4" opacity=".6"/>')

    # pescoço
    o.append(rim(neck, aura, 1.6))
    o.append(f'<path d="{neck}" fill="{B}"/><path d="{neck}" fill="url(#skinL)"/>')
    o.append(f'<path d="M176,186 C186,206 214,206 224,186 L226,214 C212,226 188,226 174,214 Z" fill="{D}" opacity=".85" filter="url(#s3)"/>')
    o.append(f'<path d="M188,214 C190,226 192,234 194,242 M212,214 C210,226 208,234 206,242" stroke="{S}" stroke-width="2" opacity=".5" filter="url(#s1)"/>')

    # roupa
    o.append(rim(body, aura, 2.2))
    o.append(f'<path d="{body}" fill="url(#cloth)"/>')
    if fem:
        # jaqueta de treino com zíper, gola alta aberta
        o.append(f'<path d="M178,224 C182,262 192,290 200,320 C208,290 218,262 222,224 Z" fill="{B}"/>')
        o.append(f'<path d="M180,240 C188,264 196,288 200,316 C204,288 212,264 220,240" fill="none" stroke="{S}" stroke-width="3" opacity=".5" filter="url(#s3)"/>')
        o.append(f'<path d="M188,262 C192,266 196,266 198,262 M202,262 C204,266 208,266 212,262" stroke="{S}" stroke-width="1.4" opacity=".7"/>')
        o.append(f'<path d="M168,234 C166,250 184,288 200,322 L190,322 C176,292 160,258 162,238 Z" fill="#2b2f3c" stroke="{LINE}" stroke-width="1.2"/>'
                 f'<path d="M232,234 C234,250 216,288 200,322 L210,322 C224,292 240,258 238,238 Z" fill="#161820" stroke="{LINE}" stroke-width="1.2"/>')
        o.append(f'<path d="M200,322 L200,440" stroke="#555b6c" stroke-width="2"/><path d="M196,322 L200,322 L200,440" stroke="{aura}" stroke-width="1" opacity=".7"/>')
        o.append(f'<path d="M164,232 C140,260 116,300 104,350 M236,232 C260,260 284,300 296,350" fill="none" stroke="{aura}" stroke-width="1.6" opacity=".75"/>')
        o.append(f'<path d="M120,380 C116,400 114,420 112,440 M282,380 C286,400 288,420 290,440" stroke="#000" stroke-width="10" opacity=".35" filter="url(#s3)"/>')
    else:
        # camiseta de compressão (gola careca) com costura raglan na cor do rank
        o.append(f'<path d="M170,236 C182,256 218,256 230,236" fill="none" stroke="#0a0b10" stroke-width="7" stroke-linecap="round"/>')
        o.append(f'<path d="M170,236 C182,256 218,256 230,236" fill="none" stroke="#3b4152" stroke-width="2"/>')
        o.append(f'<path d="M180,250 C158,276 128,306 108,350 M220,250 C242,276 272,306 292,350" fill="none" stroke="{aura}" stroke-width="1.8" opacity=".8"/>')
        # peitoral e abdômen sob o tecido
        o.append(f'<path d="M122,318 C150,346 184,348 200,336 C216,348 250,346 278,318 L280,336 C252,362 216,362 200,352 C184,362 148,362 120,336 Z" fill="#000" opacity=".55" filter="url(#s3)"/>')
        o.append(f'<path d="M200,268 L200,350" stroke="#000" stroke-width="5" opacity=".45" filter="url(#s3)"/>')
        o.append(f'<path d="M134,282 C152,270 178,272 192,284 C176,286 152,292 138,302 Z" fill="#6b7287" opacity=".35" filter="url(#s3)"/>')
        o.append(f'<path d="M64,300 C76,280 96,270 112,272 C100,290 86,306 70,322 Z" fill="#6b7287" opacity=".35" filter="url(#s3)"/>')
        o.append(f'<path d="M104,330 C100,370 100,410 102,440 M296,330 C300,370 300,410 298,440" stroke="#000" stroke-width="9" opacity=".45" filter="url(#s3)"/>')
        o.append(f'<path d="M150,380 C170,392 186,394 198,390 M202,390 C214,394 230,392 250,380" stroke="#000" stroke-width="2" opacity=".35" filter="url(#s1)"/>')
    o.append(f'<path d="{body}" fill="none" stroke="{LINE}" stroke-width="1.6"/>')

    # orelhas
    for sd in (-1, 1):
        ex = 146 if not fem else 148
        d = f'M{ex},120 C{ex-11},114 {ex-14},132 {ex-10},146 C{ex-7},158 {ex-2},162 {ex+3},158'
        if sd == 1: d = d.replace(f'M{ex}', f'M{mx(ex)}').replace(f'{ex-11},', f'{mx(ex-11)},').replace(f'{ex-14},', f'{mx(ex-14)},').replace(f'{ex-10},', f'{mx(ex-10)},').replace(f'{ex-7},', f'{mx(ex-7)},').replace(f'{ex-2},', f'{mx(ex-2)},').replace(f'{ex+3},', f'{mx(ex+3)},')
        o.append(f'<path d="{d} Z" fill="{B if sd<0 else S}" stroke="{LINE}" stroke-width="1.3"/>')

    # rosto: base + gradiente de luz + sombras pintadas
    o.append(f'<clipPath id="fc"><path d="{face}"/></clipPath>')
    o.append(rim(face, aura, 1.8))
    o.append(f'<path d="{face}" fill="{B}"/><g clip-path="url(#fc)"><rect x="140" y="40" width="130" height="180" fill="url(#skinL)"/>')
    ey = eyes_y
    sh = [f'<ellipse cx="173" cy="{ey-2}" rx="17" ry="9" fill="{S}" opacity=".7" filter="url(#s3)"/>',
          f'<ellipse cx="227" cy="{ey-2}" rx="17" ry="9" fill="{S}" opacity=".85" filter="url(#s3)"/>',
          f'<path d="M230,{ey+16} C240,{ey+22} 246,{ey+34} 244,{ey+46} C236,{ey+40} 226,{ey+30} 222,{ey+20} Z" fill="{S}" opacity=".8" filter="url(#s3)"/>',
          f'<path d="M150,{ey+30} C156,{ey+52} 172,{ey+68} 198,{ey+76} L200,{ey+80} C170,{ey+74} 152,{ey+56} 148,{ey+34} Z" fill="{S}" opacity=".5" filter="url(#s3)"/>',
          f'<path d="M140,96 C170,92 230,92 262,96 L262,{ey-14} C230,{ey-22} 170,{ey-22} 140,{ey-14} Z" fill="{D}" opacity=".55" filter="url(#s3)"/>',
          f'<path d="M160,{ey+4} C170,{ey+10} 182,{ey+12} 190,{ey+10}" stroke="{Lt}" stroke-width="5" opacity=".5" filter="url(#s3)"/>']
    o += sh
    # nariz
    o.append(f'<path d="M202,{ey+2} C206,{ey+18} 211,{ey+28} 211,{ey+34} C207,{ey+38} 201,{ey+38} 196,{ey+36} C204,{ey+30} 205,{ey+16} 202,{ey+2} Z" fill="{S}" opacity=".85" filter="url(#s1)"/>')
    o.append(f'<path d="M196,{ey+4} C195,{ey+16} 194,{ey+24} 193,{ey+30}" stroke="{Lt}" stroke-width="2.4" opacity=".7" filter="url(#s1)"/>')
    o.append(f'<path d="M190,{ey+35} C192,{ey+37} 194,{ey+37} 196,{ey+36} M204,{ey+36} C206,{ey+37} 208,{ey+37} 210,{ey+35}" fill="none" stroke="{LINE}" stroke-width="1.4" opacity=".7"/>')
    # boca
    my = ey + (52 if not fem else 50)
    if fem:
        o.append(f'<path d="M187,{my} C193,{my-4} 198,{my-2} 200,{my-1.5} C202,{my-2} 207,{my-4} 213,{my} C206,{my+1} 194,{my+1} 187,{my} Z" fill="#b5615a"/>'
                 f'<path d="M188,{my} C194,{my+1.5} 206,{my+1.5} 212,{my} C208,{my+8} 192,{my+8} 188,{my} Z" fill="#c9786d"/>'
                 f'<path d="M195,{my+3.5} C198,{my+4.5} 202,{my+4.5} 205,{my+3.5}" stroke="#f3c0b2" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>'
                 f'<path d="M187,{my} C194,{my+1.2} 206,{my+1.2} 213,{my}" fill="none" stroke="#4a1c18" stroke-width="1.3"/>')
    else:
        o.append(f'<path d="M187,{my} C194,{my+1.5} 206,{my+1.5} 213,{my-1}" fill="none" stroke="#4a2820" stroke-width="2" stroke-linecap="round"/>'
                 f'<path d="M193,{my+6} C198,{my+7.5} 203,{my+7.5} 207,{my+6}" fill="none" stroke="{S}" stroke-width="2" opacity=".8" filter="url(#s1)"/>'
                 f'<path d="M190,{my+18} C196,{my+22} 206,{my+22} 212,{my+17}" fill="none" stroke="{S}" stroke-width="3" opacity=".5" filter="url(#s1)"/>')
    o.append('</g>')
    o.append(f'<path d="{face}" fill="none" stroke="{LINE}" stroke-width="1.6"/>')
    # olhos e sobrancelhas
    o.append(eye(173, ey, ew, eh, aura, -1, fem) + eye(227, ey, ew, eh, aura, 1, fem))
    o.append(brow(173, ey - (14 if fem else 12), -1, h0, fem) + brow(227, ey - (14 if fem else 12), 1, h0, fem))

    # ---------- cabelo da frente ----------
    rnd = random.Random(7 if fem else 5)
    if fem:
        mass = 'M146,132 C134,84 156,40 200,36 C246,40 268,84 254,132 C250,104 242,84 228,70 C214,68 200,80 186,96 C172,110 156,120 146,132 Z'
        top = []
        fr = [(206, 48, 146, 150, 30, -20), (210, 48, 156, 122, 26, -16), (212, 50, 170, 112, 22, -12),
              (214, 52, 186, 120, 18, -8), (220, 50, 248, 116, 24, 10), (226, 60, 260, 160, 22, 12),
              (160, 84, 140, 220, 22, -8), (240, 84, 266, 236, 22, 8), (196, 46, 150, 92, 22, -10), (230, 50, 256, 92, 20, 8)]
        hl = [(186, 46, 160, 100, 6, -6), (206, 44, 182, 92, 5, -6), (226, 48, 214, 86, 4, -4)]
    else:
        mass = 'M142,132 C134,82 160,40 200,38 C240,40 266,82 258,132 C254,108 246,92 234,84 L166,84 C154,92 146,108 142,132 Z'
        top = []
        for layer, (r0, r1, r2, wd) in enumerate([(30, 64, 78, 44), (24, 56, 68, 38)]):
            for ang in range(184 + layer * 6, 360, 12):
                t = math.radians(ang + rnd.uniform(-3, 3)); R = rnd.uniform(r1, r2)
                rx, ry = 200 + r0 * math.cos(t), 92 + r0 * math.sin(t)
                top.append((rx, ry, 200 + R * math.cos(t) * 1.06, 94 + R * math.sin(t), wd + rnd.uniform(-6, 4), rnd.uniform(4, 10) * (1 if math.cos(t) > 0 else -1)))
        fr = [(158, 82, 140, 160, 20, -5), (160, 68, 152, 124, 22, -6), (172, 62, 168, 118, 22, -5),
              (188, 60, 194, 138, 22, -3), (204, 60, 214, 122, 22, -3), (220, 62, 232, 118, 22, 2),
              (236, 66, 250, 128, 20, 4), (242, 80, 262, 160, 18, 5)]
        hl = [(180, 50, 166, 104, 5, -5), (198, 48, 196, 112, 4, -3), (214, 50, 224, 100, 4, 3), (170, 58, 154, 100, 4, -4)]
    parts = [lock(*t) for t in top] + [lock(*t) for t in fr]
    o.append(rim(mass + ' ' + ' '.join(parts), aura, 1.6))
    o.append(f'<path d="{mass}" fill="{h0}"/>')
    for d in parts:
        o.append(f'<path d="{d}" fill="{h0}"/>')
    for t in hl:
        o.append(f'<path d="{spindle(*t)}" fill="{h2}" opacity=".5"/>')
    for t in (top[:5] + fr[:4]):
        rx, ry, tx, ty, w, bb = t
        o.append(f'<path d="{spindle(rx, ry, tx, ty, w*.18, bb)}" fill="{h1}" opacity=".85"/>')
    # vinheta
    o.append(f'<rect width="{W}" height="{H}" fill="none" stroke="#000" stroke-width="60" opacity=".35" filter="url(#s8)"/>')
    o.append(f'<rect x="0" y="360" width="{W}" height="80" fill="#04040a" opacity=".35" filter="url(#s8)"/>')
    o.append('</g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">' + ''.join(o) + '</svg>'

if __name__ == '__main__':
    a = sys.argv[2:]
    open(sys.argv[1], 'w').write(portrait(*a))
