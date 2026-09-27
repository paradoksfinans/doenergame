"""Rendert die Spiel-Grafiken mit Blender (bpy) im exakten Isometrie-Winkel des Spiels.

Aufruf:  python3 art/render.py   ->  schreibt art/out/*.png und art/out/meta.json

Koordinaten: Das Spiel nutzt x (nach rechts unten) und y (nach links unten), Höhen in Pixeln.
Blender: bx = Spiel-y, by = Spiel-x, bz = Höhe. 1 Spielfeld = 1 Blender-Einheit.
Projektion: 2:1-Isometrie, 1 Feld = 32 px waagerecht / 16 px senkrecht, 1 Einheit Höhe = 39,19 px.
Gerendert wird doppelt so groß (für scharfe Darstellung auf Handys), das Spiel zeichnet mit Faktor 0,5.
"""
import bpy, bmesh, math, json, os, random
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)
PX_H = 39.19            # Pixel pro Höhen-Einheit bei 1x
S2 = 2 * 32 / math.cos(math.radians(45))   # Pixel pro Einheit in der Bildebene bei 2x (= 90,51)
H = lambda px: px / PX_H  # Pixelhöhe aus dem Spiel -> Blender-Einheiten
R = lambda px: px / 45.2548  # waagerechte Pixel (Radius) -> Einheiten

def hexcol(h, a=1.0):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]  # sRGB -> linear
    return (*c, a)

_mats = {}
def mat(hex_, rough=0.65, emit=None, metal=0.0):
    key = (hex_, rough, emit, metal)
    if key in _mats: return _mats[key]
    m = bpy.data.materials.new('m' + hex_ + str(len(_mats)))
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexcol(hex_)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = hexcol(emit[0])
        b.inputs['Emission Strength'].default_value = emit[1]
    _mats[key] = m
    return m

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear()
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 48
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_percentage = 100
    w = bpy.data.worlds.new('w'); sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = hexcol('#fff1dc')
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.55
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.2; sun.angle = math.radians(8)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    # Licht von oben links (aus Spielersicht), wirft Schatten nach rechts unten
    so.rotation_euler = (math.radians(28), 0, math.radians(20))
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.rotation_euler = (math.radians(60), 0, math.radians(135))
    # Schattenfänger-Boden
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
    pl = bpy.context.active_object; pl.is_shadow_catcher = True
    return sc, co

def aim(sc, co, target, res):
    """Kamera so setzen, dass `target` (Blender-Koordinate) in der Bildmitte liegt."""
    d = Vector((math.sin(math.radians(135)) * -1, math.cos(math.radians(135)), 0))
    fwd = co.rotation_euler.to_matrix() @ Vector((0, 0, -1))
    co.location = Vector(target) - fwd * 20
    sc.render.resolution_x, sc.render.resolution_y = res
    co.data.ortho_scale = max(res) / S2

def box(x0, y0, z0, x1, y1, z1, m, bevel=0.0):
    """Quader in SPIEL-Koordinaten (x, y waagerecht, z in Einheiten)."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.scale = ((y1 - y0), (x1 - x0), (z1 - z0))
    o.location = ((y0 + y1) / 2, (x0 + x1) / 2, (z0 + z1) / 2)
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        mod = o.modifiers.new('b', 'BEVEL'); mod.width = bevel; mod.segments = 2
    o.data.materials.append(m)
    return o

def cyl(x, y, z0, z1, r0, m, r1=None, seg=16, rot=0.0):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r0, radius2=r1 if r1 is not None else r0,
                                    depth=z1 - z0, location=(y, x, (z0 + z1) / 2))
    o = bpy.context.active_object
    o.rotation_euler[2] = rot
    o.data.materials.append(m)
    return o

def sphere(x, y, z, r, m, seg=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=(y, x, z))
    o = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    o.data.materials.append(m)
    return o

def render(sc, co, name, anchor_game, res=(420, 420)):
    ax, ay, az = anchor_game
    target = (ay, ax, az)
    aim(sc, co, target, res)
    path = os.path.join(OUT, name + '.png')
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    p = world_to_camera_view(sc, co, Vector(target))
    return path, (p.x * res[0], (1 - p.y) * res[1])

META = {}
def crop_and_store(name, path, anchor_px):
    from PIL import Image
    im = Image.open(path)
    bb = im.getchannel('A').point(lambda a: 255 if a > 6 else 0).getbbox()
    im = im.crop(bb)
    im.save(path, optimize=True)
    META[name] = {'w': im.width, 'h': im.height, 'ax': round(anchor_px[0] - bb[0], 2), 'ay': round(anchor_px[1] - bb[1], 2)}

# ------------------------------------------------------------------ Theke (1 Segment)
def counter():
    sc, co = reset()
    red, red2, top, white = mat('#c0392f'), mat('#962a22'), mat('#f1ece4', 0.35), mat('#f7f3ea', 0.5)
    h = H(34)
    box(0.02, 0.02, 0, 0.98, 0.68, h - 0.06, red, 0.01)
    box(0.0, 0.0, h - 0.06, 1.0, 0.7, h, top, 0.012)          # Arbeitsplatte
    box(0.04, 0.66, h * 0.45, 0.96, 0.685, h * 0.55, white)    # weißer Zierstreifen vorne
    box(0.04, 0.66, 0.0, 0.96, 0.69, 0.05, red2)               # Sockel
    path, a = render(sc, co, 'counter', (0, 0, 0))
    crop_and_store('counter', path, a)

# ------------------------------------------------------------------ Dönerspieß (4 Drehstufen)
def spit():
    rnd = random.Random(7)
    for f in range(4):
        sc, co = reset()
        steel, steel2, dark = mat('#a8b0b4', 0.35, metal=0.6), mat('#6d767c', 0.4, metal=0.5), mat('#3a3340')
        glow = mat('#ff8a3a', 0.4, emit=('#ff6a1a', 6.0))
        box(0.0, 0.05, 0, 1.0, 0.95, H(14), steel, 0.02)                     # Sockel
        box(0.06, 0.05, H(14), 0.94, 0.17, H(14 + 72), steel2, 0.01)         # Heizwand
        for k in range(5):                                                   # glühende Heizstäbe
            z = H(14 + 12 + k * 12)
            box(0.14, 0.17, z, 0.86, 0.2, z + 0.05, glow)
        # Fleischkegel aus Scheiben, facettiert, mit zufälligen Farbflecken -> sichtbare Drehung
        cx, cy = 0.5, 0.55
        z0, z1 = H(20), H(76)
        slices = 9
        browns = ['#7a4020', '#9a5a2e', '#b06a36', '#8a4a24', '#c47a3e']
        for i in range(slices):
            za = z0 + (z1 - z0) * i / slices
            zb = z0 + (z1 - z0) * (i + 1) / slices
            ra = R(8) + (R(16) - R(8)) * i / slices
            rb = R(8) + (R(16) - R(8)) * (i + 1) / slices
            o = cyl(cx, cy, za, zb, ra, mat(browns[i % 2 + 1], 0.8), rb, seg=12, rot=math.radians(f * 7.5 + i * 11))
            # Facetten einzeln einfärben
            me = o.data
            for c in browns: me.materials.append(mat(c, 0.8))
            for poly in me.polygons:
                poly.material_index = 1 + rnd.randrange(len(browns))
            for poly in me.polygons: poly.use_smooth = False
        cyl(cx, cy, z1, z1 + 0.04, R(16), mat('#a8653a', 0.8), R(15), seg=12)   # Deckel
        cyl(cx, cy, z1, z1 + H(12), 0.025, mat('#dfe5e8', 0.2, metal=1.0))      # Spieß
        cyl(cx, cy, H(14), z0, 0.05, mat('#dfe5e8', 0.2, metal=1.0))
        path, a = render(sc, co, f'spit{f}', (0, 0, 0))
        crop_and_store(f'spit{f}', path, a)

# ------------------------------------------------------------------ Tisch mit zwei Hockern
def table():
    sc, co = reset()
    wood, wood2, red, metal = mat('#9a6444', 0.55), mat('#6e4430', 0.6), mat('#c0392f', 0.5), mat('#4a4450', 0.4, metal=0.6)
    cyl(0, 0, H(22), H(26), R(19), wood, seg=24)
    cyl(0, 0, 0, H(22), 0.05, wood2, seg=10)
    cyl(0, 0, 0, 0.03, 0.2, wood2, seg=16)
    path, a = render(sc, co, 'table', (0, 0, 0))
    crop_and_store('table', path, a)

def stool():
    sc, co = reset()
    red, metal = mat('#c0392f', 0.5), mat('#4a4450', 0.4, metal=0.6)
    for k in range(3):
        an = k * 2 * math.pi / 3
        cyl(math.cos(an) * 0.08, math.sin(an) * 0.08, 0, H(9), 0.018, metal, seg=6)
    cyl(0, 0, H(9), H(12), R(8), red, seg=16)
    path, a = render(sc, co, 'stool', (0, 0, 0), res=(160, 160))
    crop_and_store('stool', path, a)

# ------------------------------------------------------------------ Spielerfigur mit Laufzyklus
def player():
    frames = [('idle', 0, False)] + [(f'walk{i}', i, False) for i in range(8)] + [('cidle', 0, True)] + [(f'cwalk{i}', i, True) for i in range(8)]
    for name, i, carry in frames:
        sc, co = reset()
        skin, shirt, apron, pants, cap, cap2, shoe, eye = (mat('#e0ac80', 0.6), mat('#f2b134', 0.6), mat('#f7f3ea', 0.6),
            mat('#3b3440', 0.7), mat('#d8342b', 0.5), mat('#a8261f', 0.5), mat('#231a24', 0.6), mat('#111111', 0.3))
        walking = name.startswith('walk') or name.startswith('cwalk')
        ph = (i / 8) * 2 * math.pi
        sw = math.sin(ph) * (0.5 if walking else 0)       # Beinschwung (rad)
        bob = abs(math.sin(ph)) * 0.03 if walking else 0
        root = bpy.data.objects.new('root', None); sc.collection.objects.link(root)
        parts = []
        # Beine: um die Hüfte drehen (Blickrichtung = Spiel +x = Blender +y)
        hip = H(12)
        for side, s in ((-1, sw), (1, -sw)):
            bpy.ops.mesh.primitive_cube_add(size=1)
            leg = bpy.context.active_object
            leg.scale = (0.1, 0.11, hip); bpy.ops.object.transform_apply(scale=True)
            for v in leg.data.vertices: v.co.z -= hip / 2
            leg.location = (side * 0.075, 0, hip + bob)
            leg.rotation_euler[0] = s
            leg.data.materials.append(pants)
            foot = box(-0.055, -0.07, 0, 0.09, 0.07, 0.045, shoe)
            foot.parent = leg; foot.location = (side * 0.0, 0, -hip)
            foot.location = (0, 0.02, -hip)
            parts.append(leg)
        # Körper
        body = box(-0.13, -0.17, hip + bob, 0.13, 0.17, hip + H(21) + bob, shirt, 0.05)
        box(0.12, -0.12, hip + 0.04 + bob, 0.14, 0.12, hip + H(17) + bob, apron)     # Schürze vorne
        # Arme
        sh = hip + H(19) + bob
        for side in (-1, 1):
            bpy.ops.mesh.primitive_cube_add(size=1)
            arm = bpy.context.active_object
            arm.scale = (0.075, 0.075, H(15)); bpy.ops.object.transform_apply(scale=True)
            for v in arm.data.vertices: v.co.z -= H(15) / 2
            arm.location = (side * 0.21, 0, sh)
            arm.rotation_euler[0] = (1.25 if carry else -side * sw * 0.8)
            arm.data.materials.append(shirt)
            sphere(0, 0, 0, 0.05, skin).parent = arm
            arm.children[0].location = (0, 0, -H(15))
        # Kopf, Kappe, Augen
        hz = hip + H(21) + 0.19 + bob
        sphere(0, 0, hz, 0.19, skin, seg=16)
        cyl(0, 0, hz + 0.09, hz + 0.2, 0.185, cap, 0.16, seg=20)
        box(0.08, -0.12, hz + 0.09, 0.33, 0.12, hz + 0.115, cap2)                 # Schirm nach vorn
        for side in (-1, 1):
            sphere(0.165, side * 0.075, hz + 0.01, 0.034, eye, seg=10)
        box(0.17, -0.04, hz - 0.08, 0.19, 0.04, hz - 0.065, mat('#8a3a2e', 0.6))    # Mund
        path, a = render(sc, co, 'pl_' + name, (0, 0, 0), res=(300, 360))
        crop_and_store('pl_' + name, path, a)

if __name__ == '__main__':
    import sys
    which = sys.argv[1:] or ['counter', 'spit', 'table', 'stool', 'player']
    for w in which: globals()[w]()
    mp = os.path.join(OUT, 'meta.json')
    old = json.load(open(mp)) if os.path.exists(mp) else {}
    old.update(META)
    json.dump(old, open(mp, 'w'), indent=1)
    print('fertig:', ', '.join(META))
