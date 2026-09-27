"""Zweite Render-Runde: alle Figuren (einfärbbar) und die restlichen Objekte.

Figuren werden in EINER Beleuchtung gerendert, dann per ID-Render in Ebenen zerlegt:
  skin, shirt, hair, pants, cap  -> weiß/grau gerendert, im Spiel mit beliebiger Farbe multipliziert
  fixed                          -> feste Farben (Augen, Schuhe, Schürze) + Schatten
So reichen wenige Renderings für alle Farbkombinationen von Gästen, Personal und Outfits.

Aufruf:  python3 art/render2.py [chars] [objects]
"""
import bpy, math, json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render as R0
from render import reset, render, mat, box, cyl, sphere, H, R, OUT

LAYERS = ['fixed', 'skin', 'shirt', 'hair', 'pants', 'cap']
ID_COL = {1: (255, 0, 0), 2: (0, 255, 0), 3: (0, 0, 255), 4: (255, 255, 0), 5: (255, 0, 255)}
META = {}

def lmat(layer, rough=0.6):
    """Material einer Einfärbe-Ebene (hellgrau, wird im Spiel eingefärbt)."""
    m = mat('#f0f0f0', rough)
    m = m.copy(); m.name = 'L' + layer
    m['layer'] = LAYERS.index(layer)
    return m

def fast(sc, samples):
    sc.cycles.samples = samples

def id_pass(sc, co, path, target, res):
    """Gleiche Szene flach in ID-Farben rendern (ohne Kantenglättung)."""
    ids = {}
    for k, c in ID_COL.items():
        m = bpy.data.materials.new('ID%d' % k); m.use_nodes = True
        nt = m.node_tree; nt.nodes.clear()
        e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*[v / 255 for v in c], 1); e.inputs['Strength'].default_value = 1
        o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0])
        ids[k] = m
    black = bpy.data.materials.new('ID0'); black.use_nodes = True
    nt = black.node_tree; nt.nodes.clear()
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (0, 0, 0, 1)
    o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0])
    for ob in sc.objects:
        if ob.type != 'MESH': continue
        if getattr(ob, 'is_shadow_catcher', False):
            ob.hide_render = True; continue
        for s in ob.material_slots:
            k = s.material.get('layer', 0) if s.material else 0
            s.material = ids.get(k, black)
    sc.cycles.samples = 1; sc.cycles.use_denoising = False
    sc.cycles.filter_width = 0.01
    sc.view_settings.view_transform = 'Standard'
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

def split_layers(name, main_path, id_path, anchor):
    im = np.array(Image.open(main_path).convert('RGBA'))
    idm = np.array(Image.open(id_path).convert('RGBA'))
    lab = np.zeros(im.shape[:2], np.uint8)
    has = idm[..., 3] > 127
    for k, c in ID_COL.items():
        d = np.abs(idm[..., :3].astype(int) - np.array(c)).sum(-1)
        lab[has & (d < 120)] = k
    alpha = im[..., 3]
    ys, xs = np.nonzero(alpha > 24)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    used = []
    for k, lname in enumerate(LAYERS):
        sel = (lab == k)
        if not (sel & (alpha > 6)).any(): continue
        out = np.zeros_like(im); out[sel] = im[sel]
        if k:  # Einfärbe-Ebene: auf Graustufen bringen
            g = out[..., :3].mean(-1, keepdims=True)
            out[..., :3] = np.repeat(g, 3, -1).astype(np.uint8)
        Image.fromarray(out[y0:y1, x0:x1]).save(os.path.join(OUT, f'{name}__{lname}.png'), optimize=True)
        used.append(lname)
    META[name] = {'w': int(x1 - x0), 'h': int(y1 - y0), 'ax': round(anchor[0] - x0, 2), 'ay': round(anchor[1] - y0, 2), 'layers': used}
    os.remove(id_path); os.remove(main_path)

# ------------------------------------------------------------------ Figuren
def figure(sc, pose, i, carry, hair, apron, cap_on):
    skin, shirt, hairm, pants, capm = lmat('skin'), lmat('shirt'), lmat('hair', 0.8), lmat('pants', 0.7), lmat('cap', 0.5)
    shoe, eye, apronm, mouth = mat('#231a24', 0.6), mat('#111111', 0.3), mat('#f7f3ea', 0.6), mat('#8a3a2e', 0.6)
    walking = pose == 'walk'
    sitting = pose == 'sit'
    ph = (i / 8) * 2 * math.pi
    sw = math.sin(ph) * (0.5 if walking else 0)
    bob = abs(math.sin(ph)) * 0.03 if walking else 0
    hip = H(12)
    for side, s in ((-1, sw), (1, -sw)):
        bpy.ops.mesh.primitive_cube_add(size=1)
        leg = bpy.context.active_object
        leg.scale = (0.1, 0.11, hip); bpy.ops.object.transform_apply(scale=True)
        for v in leg.data.vertices: v.co.z -= hip / 2
        leg.location = (side * 0.075, 0, hip + bob)
        leg.rotation_euler[0] = (1.45 if sitting else s)
        leg.data.materials.append(pants)
        foot = box(-0.055, -0.07, 0, 0.09, 0.07, 0.045, shoe)
        foot.parent = leg; foot.location = (0, 0.02, -hip)
    box(-0.13, -0.17, hip + bob, 0.13, 0.17, hip + H(21) + bob, shirt, 0.05)
    if apron: box(0.12, -0.12, hip + 0.04 + bob, 0.14, 0.12, hip + H(17) + bob, apronm)
    sh = hip + H(19) + bob
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cube_add(size=1)
        arm = bpy.context.active_object
        arm.scale = (0.075, 0.075, H(15)); bpy.ops.object.transform_apply(scale=True)
        for v in arm.data.vertices: v.co.z -= H(15) / 2
        arm.location = (side * 0.21, 0, sh)
        arm.rotation_euler[0] = (1.25 if carry else (0.5 if sitting else -side * sw * 0.8))
        arm.data.materials.append(shirt)
        hnd = sphere(0, 0, 0, 0.05, skin); hnd.parent = arm; hnd.location = (0, 0, -H(15))
    hz = hip + H(21) + 0.19 + bob
    sphere(0, 0, hz, 0.19, skin, seg=16)
    for side in (-1, 1): sphere(0.165, side * 0.075, hz + 0.01, 0.034, eye, seg=10)
    box(0.17, -0.04, hz - 0.08, 0.19, 0.04, hz - 0.065, mouth)
    if cap_on:
        cyl(0, 0, hz + 0.09, hz + 0.2, 0.185, capm, 0.16, seg=20)
        box(0.08, -0.12, hz + 0.09, 0.33, 0.12, hz + 0.115, capm)
    else:
        # Haare: Kalotte hinten/oben
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.205, location=(-0.025, 0, hz + 0.025))
        hh = bpy.context.active_object; hh.scale = (1.0, 1.0, 0.9)
        bpy.ops.object.shade_smooth(); hh.data.materials.append(hairm)
        # vordere Hälfte unterhalb der Stirn wegschneiden: Würfel-Boolean
        cut = box(0.09, -0.3, hz - 0.3, 0.4, 0.3, hz + 0.02, hairm)
        mod = hh.modifiers.new('cut', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = cut
        bpy.context.view_layer.objects.active = hh; bpy.ops.object.modifier_apply(modifier='cut')
        bpy.data.objects.remove(cut)
        if hair == 'long':
            box(-0.2, -0.17, hz - 0.28, -0.08, 0.17, hz + 0.05, hairm, 0.03)
    if sitting:
        pass

def chars():
    variants = {
        'pl': dict(hair='short', apron=True, cap_on=True, carry=True),
        'sts': dict(hair='short', apron=True, cap_on=False, carry=True),
        'stl': dict(hair='long', apron=True, cap_on=False, carry=True),
        'cus': dict(hair='short', apron=False, cap_on=False, carry=False),
        'cul': dict(hair='long', apron=False, cap_on=False, carry=False),
    }
    only = [a for a in sys.argv[1:] if a in variants]
    for vn, v in variants.items():
        if only and vn not in only: continue
        frames = [('idle', 'idle', 0, False)] + [(f'walk{i}', 'walk', i, False) for i in range(8)]
        if v['carry']: frames += [('cidle', 'idle', 0, True)] + [(f'cwalk{i}', 'walk', i, True) for i in range(8)]
        else: frames += [('sit', 'sit', 0, False)]
        for fname, pose, i, carry in frames:
            sc, co = reset(); fast(sc, 24)
            figure(sc, pose, i, carry, v['hair'], v['apron'], v['cap_on'])
            name = f'{vn}_{fname}'
            path, a = render(sc, co, name, (0, 0, 0), res=(300, 360))
            idp = os.path.join(OUT, name + '_id.png')
            id_pass(sc, co, idp, (0, 0, 0), (300, 360))
            split_layers(name, path, idp, a)
            print('ok', name, flush=True)

# ------------------------------------------------------------------ Objekte
def store(name, path, a):
    R0.META.clear(); R0.crop_and_store(name, path, a); META.update(R0.META)

def fryer():
    sc, co = reset()
    steel, steel2 = mat('#b9c1c5', 0.35, metal=0.6), mat('#6d767c', 0.4, metal=0.5)
    oil = mat('#e0a42a', 0.15, emit=('#ffb43a', 0.6))
    box(0.05, 0.05, 0, 0.95, 0.17, H(72), steel2, 0.01)
    box(0.0, 0.15, 0, 1.0, 1.0, H(30), steel, 0.02)
    box(0.15, 0.3, H(30) - 0.02, 0.85, 0.85, H(30) + 0.005, oil)
    for bx in (0.3, 0.62):   # zwei Körbe mit Griff
        box(bx - 0.12, 0.38, H(30), bx + 0.12, 0.78, H(30) + 0.08, mat('#3a3340', 0.5, metal=0.4))
        box(bx - 0.02, 0.75, H(30) + 0.08, bx + 0.02, 1.02, H(30) + 0.12, mat('#231a24', 0.5))
    path, a = render(sc, co, 'fryer', (0, 0, 0)); store('fryer', path, a)

def stands():
    awns = ['#d8342b', '#2f5f93', '#3f7fbf', '#8a2f5a', '#c0392f']
    for k, awn in enumerate(awns):
        sc, co = reset()
        body, dark = mat('#e8e1d6', 0.5), mat('#3a3438', 0.6)
        glow = mat('#ff8c3c', 0.5, emit=('#ff6a1a', 2.5))
        box(0, 0, 0, 1, 1, H(32), body, 0.02)
        box(0.1, 0.1, 0, 0.9, 0.9, 0.04, mat(awn, 0.6))
        cyl(0.5, 0.5, H(32), H(32) + 0.02, 0.36, dark, seg=20)
        cyl(0.5, 0.5, H(32) + 0.02, H(32) + 0.03, 0.3, glow, seg=20)
        for px, py in ((0.03, 0.03), (0.97, 0.03), (0.03, 0.97), (0.97, 0.97)):
            cyl(px, py, H(32), H(70), 0.025, mat('#8d969b', 0.3, metal=0.8), seg=6)
        for i in range(5):   # gestreifte Markise
            box(-0.05, -0.05 + i * 0.22, H(70), 1.05, 0.17 + i * 0.22, H(70) + 0.1, mat(awn if i % 2 == 0 else '#fff6e8', 0.6))
        path, a = render(sc, co, f'stand{k}', (0, 0, 0)); store(f'stand{k}', path, a)

def drivewin():
    sc, co = reset()
    red, top, white = mat('#c0392f'), mat('#f1ece4', 0.35), mat('#f7f3ea', 0.5)
    box(0.02, 0.02, 0, 0.68, 1.58, H(34) - 0.06, red, 0.01)
    box(0, 0, H(34) - 0.06, 0.7, 1.6, H(34), top, 0.012)
    box(0.66, 0.1, H(34) * 0.45, 0.69, 1.5, H(34) * 0.55, white)
    box(0.3, 0.05, H(34), 0.4, 1.55, H(34) + 0.55, mat('#bfe0f0', 0.1, emit=('#bfe0f0', 0.2)))   # Glasscheibe
    path, a = render(sc, co, 'drivewin', (0, 0, 0)); store('drivewin', path, a)

def delivshelf():
    sc, co = reset()
    blue, blue2, wood = mat('#3f7fbf'), mat('#2f5f93'), mat('#e8e1d6', 0.5)
    box(0, 0, 0, 1, 0.6, H(30), blue, 0.02)
    box(-0.01, -0.01, H(30), 1.01, 0.61, H(30) + 0.035, wood, 0.01)
    box(0.05, 0.56, 0.1, 0.95, 0.61, H(30) - 0.12, blue2)
    path, a = render(sc, co, 'delivshelf', (0, 0, 0)); store('delivshelf', path, a)

def binobj():
    sc, co = reset()
    g1, g2 = mat('#5a6368', 0.5, metal=0.3), mat('#3b4247', 0.5)
    cyl(0, 0, 0, H(26), 0.22, g1, 0.25, seg=20)
    cyl(0, 0, H(26), H(26) + 0.04, 0.26, g2, seg=20)
    box(-0.08, -0.02, H(26) + 0.04, 0.08, 0.02, H(26) + 0.09, g2)
    path, a = render(sc, co, 'bin', (0, 0, 0), res=(200, 220)); store('bin', path, a)

def plant():
    sc, co = reset()
    pot, soil = mat('#b86b3e', 0.6), mat('#4a2e1c', 0.9)
    cyl(0, 0, 0, H(14), 0.13, pot, 0.16, seg=16)
    cyl(0, 0, H(14) - 0.02, H(14), 0.14, soil, seg=16)
    greens = ['#3f7a3a', '#5da049', '#4f9a58', '#6fb35a']
    import random
    rnd = random.Random(3)
    for i in range(9):
        a = rnd.random() * 6.28; r = rnd.random() * 0.14
        sphere(math.cos(a) * r, math.sin(a) * r, H(14) + 0.12 + rnd.random() * 0.3, 0.1 + rnd.random() * 0.05, mat(greens[i % 4], 0.7), seg=10)
    path, a = render(sc, co, 'plant', (0, 0, 0), res=(200, 260)); store('plant', path, a)

def car():
    sc, co = reset()
    body = lmat('shirt', 0.35)
    glass, tyre, rim, light = mat('#3b5068', 0.1), mat('#1b1b1f', 0.8), mat('#8d969b', 0.3, metal=0.8), mat('#ff5040', 0.3, emit=('#ff3020', 2))
    box(-0.42, -0.8, 0.12, 0.42, 0.8, 0.45, body, 0.06)
    box(-0.36, -0.42, 0.45, 0.36, 0.38, 0.75, body, 0.06)
    box(-0.33, -0.44, 0.47, 0.33, -0.4, 0.72, glass)
    box(-0.37, -0.38, 0.5, 0.37, 0.34, 0.7, glass)
    for wx in (-0.42, 0.42):
        for wy in (-0.5, 0.5):
            bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.15, depth=0.1, location=(wy, wx, 0.15), rotation=(0, math.radians(90), 0))
            o = bpy.context.active_object; o.data.materials.append(tyre)
    box(-0.3, 0.79, 0.3, -0.18, 0.81, 0.38, light); box(0.18, 0.79, 0.3, 0.3, 0.81, 0.38, light)
    sc2 = sc
    name = 'car'
    path, a = render(sc, co, name, (0, 0, 0), res=(360, 360))
    idp = os.path.join(OUT, name + '_id.png')
    id_pass(sc, co, idp, (0, 0, 0), (360, 360))
    split_layers(name, path, idp, a)

def objects():
    fs = (fryer, stands, drivewin, delivshelf, binobj, plant, car)
    only = [a for a in sys.argv[1:] if a in [f.__name__ for f in fs]]
    for f in fs:
        if only and f.__name__ not in only: continue
        f(); print('ok', f.__name__, flush=True)

if __name__ == '__main__':
    what = [a for a in sys.argv[1:] if a in ('chars', 'objects')] or ['objects', 'chars']
    for w in what: globals()[w]()
    mp = os.path.join(OUT, 'meta.json')
    old = json.load(open(mp)) if os.path.exists(mp) else {}
    old.update(META)
    json.dump(old, open(mp, 'w'), indent=1)
    print('fertig', len(META), flush=True)
