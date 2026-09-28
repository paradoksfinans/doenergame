"""Erzeugt alle Soundeffekte und die Hintergrundmusik synthetisch (numpy) – keine fremden Samples, keine Lizenzfragen.
Aufruf: python3 art/audio/make_audio.py  ->  art/audio/out/*.mp3
"""
import numpy as np, os, subprocess, wave

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

def t_(d): return np.arange(int(SR * d)) / SR
def env(n, a=0.005, d=0.1, s=0.0, r=0.05, dur=None):
    """einfache Hüllkurve (Attack, exponentielles Abklingen)"""
    x = np.arange(n) / SR
    e = np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / max(d, 1e-4))
    return e
def noise(d): return rng.uniform(-1, 1, int(SR * d))
def lp(x, a):   # einpoliger Tiefpass, a 0..1 (klein = dunkel)
    y = np.zeros_like(x); s = 0.0
    for i, v in enumerate(x): s += a * (v - s); y[i] = s
    return y
def hp(x, a): return x - lp(x, a)
def bp(x, lo, hi): return hp(lp(x, hi), lo)
def sine(f, d, ph=0):
    tt = t_(d)
    f = np.broadcast_to(f, tt.shape) if np.ndim(f) else np.full(tt.shape, f)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)
def mix(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o
def delay(x, sec, g=0.3, n=3):
    o = np.concatenate([x, np.zeros(int(SR * sec * n))])
    for k in range(1, n + 1):
        s = int(SR * sec * k); o[s:s + len(x)] += x * g ** k
    return o
def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x / m * peak
def fade(x, fin=0.002, fout=0.01):
    x = x.copy(); a = int(SR * fin); b = int(SR * fout)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x
def pluck(f, d, bright=0.5, decay=0.996):
    """Karplus-Strong gezupfte Saite (Saz/Bağlama-artig)"""
    n = int(SR * d); p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p) * 1.0
    buf = lp(buf, bright)
    o = np.zeros(n); idx = 0
    for i in range(n):
        o[i] = buf[idx]
        nxt = (idx + 1) % p
        buf[idx] = decay * 0.5 * (buf[idx] + buf[nxt])
        idx = nxt
    return o

def save(name, x, peak=0.9, br='96k'):
    x = fade(norm(x, peak))
    wav = os.path.join(OUT, name + '.wav')
    with wave.open(wav, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
    mp3 = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-b:a', br, mp3], check=True)
    os.remove(wav)
    print(name, os.path.getsize(mp3), 'B')

# ------------------------------------------------------------------ Effekte
def sfx():
    # pop: Döner aufnehmen (kurzer runder Plopp, Tonhöhe wird im Spiel variiert)
    d = 0.12; f = 520 * np.exp(-t_(d) * 18) + 300
    save('pop', sine(f, d) * env(len(t_(d)), 0.002, 0.035) + 0.15 * bp(noise(d), 0.2, 0.6) * env(len(t_(d)), 0.001, 0.01))
    # stack: auf die Theke stellen (Holz-Klock)
    d = 0.14
    save('stack', mix(sine(260 * np.exp(-t_(d) * 6), d) * env(len(t_(d)), 0.001, 0.03),
                      0.6 * sine(780, d) * env(len(t_(d)), 0.001, 0.012),
                      0.35 * bp(noise(d), 0.1, 0.5) * env(len(t_(d)), 0.001, 0.008)))
    # serve: Teller-Klirren
    d = 0.35
    save('serve', mix(*[0.5 / (k + 1) * sine(f0, d) * env(len(t_(d)), 0.001, 0.09 / (k + 1)) for k, f0 in enumerate([2350, 3170, 4020, 5310])],
                      0.3 * hp(noise(0.02), 0.5)), peak=0.6)
    # trash: in den Müll (dumpfer Rumms + Rascheln)
    d = 0.25
    save('trash', mix(sine(110 * np.exp(-t_(d) * 5), d) * env(len(t_(d)), 0.002, 0.06),
                      0.5 * bp(noise(d), 0.05, 0.4) * env(len(t_(d)), 0.002, 0.05)))
    # cash: Registrierkasse (Klack + Glocke)
    d = 0.9
    bell = mix(*[g * sine(f0, d) * env(len(t_(d)), 0.002, dec) for f0, g, dec in [(2093, 1, 0.35), (4186, 0.4, 0.2), (2637, 0.5, 0.25), (6272, 0.15, 0.1)]])
    klack = mix(bp(noise(0.05), 0.2, 0.8) * env(len(t_(0.05)), 0.001, 0.01), 0.6 * sine(180, 0.05) * env(len(t_(0.05)), 0.001, 0.015))
    save('cash', mix(klack, np.concatenate([np.zeros(int(SR * 0.06)), bell])), peak=0.7)
    # coin: Münze auf Ausbaufeld
    d = 0.18
    save('coin', mix(sine(1760, d) * env(len(t_(d)), 0.001, 0.05), np.concatenate([np.zeros(int(SR * 0.05)), 0.8 * sine(2637, d - 0.05) * env(len(t_(d - 0.05)), 0.001, 0.06)])), peak=0.55)
    # click: UI-Tippen
    d = 0.04
    save('click', sine(1400 * np.exp(-t_(d) * 30) + 600, d) * env(len(t_(d)), 0.0005, 0.01), peak=0.5)
    # buy: Ausbau gekauft (Whoosh + Glöckchen hoch)
    d = 0.6
    wh = bp(noise(d), 0.02, 0.3) * np.sin(np.linspace(0, np.pi, len(t_(d)))) ** 2
    ch = mix(*[np.concatenate([np.zeros(int(SR * (0.12 + 0.07 * i))), 0.7 * sine(f0, 0.3) * env(len(t_(0.3)), 0.001, 0.12)]) for i, f0 in enumerate([1047, 1319, 1568, 2093])])
    save('buy', mix(0.6 * wh, ch), peak=0.75)
    # fanfare: Level geschafft (Blechbläser-artig, 5 Töne)
    notes = [(523, 0, 0.14), (659, 0.13, 0.14), (784, 0.26, 0.14), (1047, 0.39, 0.5), (988, 0.39, 0.5)]
    parts = []
    for f0, st, du in notes:
        tt = t_(du)
        vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * tt)
        tone = sum((0.9 ** h) * np.sin(2 * np.pi * f0 * h * np.cumsum(vib) / SR) for h in range(1, 7))
        e = np.minimum(1, tt / 0.02) * np.exp(-tt / (du * 0.9))
        parts.append(np.concatenate([np.zeros(int(SR * st)), lp(tone * e, 0.35)]))
    save('fanfare', delay(mix(*parts), 0.11, 0.25, 2), peak=0.7)
    # ding: fertig (Pommes / Tutorial)
    d = 0.5
    save('ding', mix(sine(1568, d) * env(len(t_(d)), 0.001, 0.18), 0.3 * sine(3136, d) * env(len(t_(d)), 0.001, 0.08)), peak=0.5)
    # bad: Gast geht wütend (tiefes Brummen, fallend)
    d = 0.45
    f = 190 * np.exp(-t_(d) * 1.5)
    save('bad', lp(np.sign(sine(f, d)) * 0.5 + sine(f * 1.01, d), 0.15) * env(len(t_(d)), 0.01, 0.2), peak=0.55)
    # carhorn: Hupe Drive-In
    d = 0.32
    h = (np.sign(sine(415, d)) + np.sign(sine(523, d))) * 0.5
    save('carhorn', lp(h, 0.25) * np.minimum(1, t_(d) / 0.01) * np.exp(-t_(d) / 0.6), peak=0.45)
    # shiphorn: Hamburg Schiffshorn / Istanbul Fähre
    d = 1.6
    tt = t_(d)
    tone = sum((0.8 ** h) * np.sin(2 * np.pi * 98 * h * tt) for h in range(1, 9))
    e = np.minimum(1, tt / 0.15) * np.minimum(1, (d - tt) / 0.3)
    save('shiphorn', lp(tone * e, 0.08), peak=0.7)
    # party: Partytröte + Jubel
    d = 0.6
    f = 600 + 250 * np.minimum(1, t_(d) / 0.15)
    tro = lp(np.sign(sine(f, d)), 0.3) * env(len(t_(d)), 0.01, 0.35) * 0.5
    crowd = bp(noise(d), 0.03, 0.2) * np.sin(np.linspace(0, np.pi, len(t_(d)))) * 0.6
    save('party', mix(tro, crowd), peak=0.6)
    # rush: Alarmglocke
    d = 0.9
    ring = mix(*[g * sine(f0, d) * env(len(t_(d)), 0.001, 0.4) for f0, g in [(1180, 1), (2950, 0.4), (4400, 0.2)]]) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 14 * t_(d))))
    save('rush', ring, peak=0.55)
    # moped: Roller-Hupe
    d = 0.22
    save('moped', lp(np.sign(sine(740, d)), 0.3) * env(len(t_(d)), 0.005, 0.15), peak=0.35)
    # sizzle: Grill-Brutzeln (Schleife, 2 s)
    d = 2.0
    cr = rng.uniform(0, 1, int(SR * d)) > 0.9985
    crack = lp(cr.astype(float) * rng.uniform(-1, 1, len(cr)), 0.6)
    hiss = hp(noise(d), 0.3) * 0.08
    x = mix(crack * 0.9, hiss)
    # nahtlose Schleife: Enden überblenden
    k = int(SR * 0.2); x[:k] = x[:k] * np.linspace(0, 1, k) + x[-k:] * np.linspace(1, 0, k); x = x[:-k]
    save('sizzle', x, peak=0.5, br='64k')

# ------------------------------------------------------------------ Musik
def music():
    bpm = 100; beat = 60 / bpm; bars = 16; L = bars * 4 * beat
    n = int(SR * L); tail = int(SR * 3)
    out = np.zeros(n + tail)
    def put(x, at, g=1.0):
        s = int(at * SR); e = min(len(out), s + len(x)); out[s:e] += g * x[:e - s]
    # Hicaz auf D: D Eb F# G A Bb C D
    base = 146.83
    scale = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19]
    def hz(deg, octv=0):
        o, k = divmod(deg, 7); semis = [0, 1, 4, 5, 7, 8, 10][k] + 12 * (o + octv)
        return base * 2 ** (semis / 12)
    # Akkordfolge (Grundton-Stufe je Takt): D D C D | G G C D ...
    prog = [0, 0, 6 - 7, 0, 3, 3, 6 - 7, 0, 0, 0, 5 - 7, 5 - 7, 3, 6 - 7, 4 - 7, 0]
    # Darbuka-Rhythmus (Maqsum): D T - T D - T -
    maq = [('D', 0), ('T', 0.5), ('T', 1.5), ('D', 2), ('T', 3), ('t', 3.5), ('t', 3.75)]
    def doum():
        d = 0.4; f = 120 * np.exp(-t_(d) * 8) + 70
        return sine(f, d) * env(len(t_(d)), 0.002, 0.12)
    def tek(g=1.0):
        d = 0.08
        return g * mix(bp(noise(d), 0.25, 0.9) * env(len(t_(d)), 0.0005, 0.018), 0.4 * sine(900, d) * env(len(t_(d)), 0.0005, 0.02))
    D, T, t2 = doum(), tek(), tek(0.5)
    for b in range(bars):
        for kind, off in maq:
            at = (b * 4 + off) * beat
            put(D if kind == 'D' else T if kind == 'T' else t2, at, 0.8 if kind == 'D' else 0.22)
        # Schellenkranz auf Achteln (leise)
        for e8 in range(8):
            d = 0.05; sh = hp(noise(d), 0.6) * env(len(t_(d)), 0.001, 0.015)
            put(sh, (b * 4 + e8 * 0.5 + 0.25) * beat, 0.05 if e8 % 2 else 0.03)
    # Bass (gezupft, tief)
    for b, deg in enumerate(prog):
        f = hz(deg, -1)
        for off, du in [(0, 1.5), (1.5, 0.5), (2, 1.5), (3.5, 0.5)]:
            x = pluck(f, du * beat + 0.3, bright=0.25, decay=0.998)
            put(lp(x, 0.2), (b * 4 + off) * beat, 0.5)
    # weicher Flächen-Akkord (Grundton + Quinte)
    for b, deg in enumerate(prog):
        du = 4 * beat; tt = t_(du)
        f1, f2 = hz(deg), hz(deg + 4)
        pad = (np.sin(2 * np.pi * f1 * tt) + 0.6 * np.sin(2 * np.pi * f2 * tt) + 0.3 * np.sin(2 * np.pi * f1 * 2.003 * tt))
        e = np.minimum(1, tt / 0.4) * np.minimum(1, (du - tt) / 0.4)
        put(lp(pad * e, 0.08), b * 4 * beat, 0.06)
    # Saz-Melodie: Motive im Hicaz, 2 Phrasen × 8 Takte, zweite Hälfte variiert
    motifs = [
        [(7, 0, .5), (8, .5, .5), (9, 1, 1), (8, 2, .5), (7, 2.5, .5), (5, 3, 1)],
        [(4, 0, .5), (5, .5, .5), (7, 1, .75), (5, 1.75, .25), (4, 2, .5), (2, 2.5, .5), (1, 3, 1)],
        [(0, 0, .5), (1, .5, .5), (2, 1, .5), (4, 1.5, .5), (5, 2, .5), (4, 2.5, .25), (5, 2.75, .25), (7, 3, 1)],
        [(8, 0, .75), (7, 0.75, .25), (5, 1, .5), (4, 1.5, .5), (2, 2, .5), (1, 2.5, .5), (0, 3, 1)],
    ]
    order = [0, 1, 2, 3, 0, 1, 3, None, 2, 0, 1, 3, 2, 1, 3, None]
    for b, mi in enumerate(order):
        if mi is None: continue
        for deg, off, du in motifs[mi]:
            f = hz(deg)
            x = pluck(f, du * beat + 0.6, bright=0.55, decay=0.9965)
            # Tremolo-Anschlag wie beim Saz auf langen Tönen
            put(x, (b * 4 + off) * beat, 0.32)
            if du >= 1:
                for r in (0.25, 0.5, 0.75):
                    put(pluck(f, 0.4, bright=0.5, decay=0.995), (b * 4 + off + r) * beat, 0.12)
    out = delay(out, beat * 0.75, 0.18, 2)[:len(out)]
    out = lp(out, 0.6)   # Höhen etwas zähmen, damit es auf Handylautsprechern nicht zischt
    # Nachklang ans Loop-Ende falten -> nahtlose Schleife
    loop = out[:n].copy(); loop[:tail] += out[n:n + tail]
    save('music', loop, peak=0.8, br='96k')

if __name__ == '__main__':
    import sys
    what = sys.argv[1:] or ['sfx']  # Musik wird nicht mehr verwendet (python3 make_audio.py music erzeugt sie bei Bedarf)
    if 'sfx' in what: sfx()
    if 'music' in what: music()
