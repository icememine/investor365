# policy.py — an independent implementation of the declared Breakout collision policy (apps/game/bk_physics.node header),
# written from the policy text, not from the DNode source. It plays event traces and writes the expected final states.
# usage: python3 policy.py  →  traces.json (traces + expected outcomes); run_traces.js compares the engine against them.
import json, os
W, H, R = 32000, 48000, 600
PW, HPW, PH, PY, PMAX, PSPEED = 6000, 3000, 1000, 44000, 26000, 600
ROWS, COLS, BW, BH, HBW, HBH, PX, PYT, WL, WT = 5, 6, 4200, 1600, 2100, 800, 5500, 2900, 150, 6000
MAXV, MAXVX, MINVY, SPEEDUP, SVY, SVX_STEP = 700, 500, 250, 10, 450, 100
def clamp(v, lo, hi): return max(lo, min(hi, v))
def fdiv(a, b):  # DNode div rounds toward negative infinity
    return a // b
def wall(): return [{'a': r, 'b': c, 'alive': True} for r in range(ROWS) for c in range(COLS)]
def on_paddle(px, launches):
    k = (launches % 5) - 2
    return {'x': px + HPW, 'y': PY - R, 'vx': k * SVX_STEP, 'vy': -SVY}
def initial(): return {'phase': 'title', 'resume_to': 'play', 'paddle': {'x': 13000}, 'ball': on_paddle(13000, 0), 'bricks': wall(), 'score': 0, 'lives': 3, 'launches': 0, 'ticks': 0, 'last': 'none', 'bursts': []}
def move_paddle(px, move, target):
    want = clamp(target, HPW, W - HPW) - HPW if target >= 0 else px + move * PSPEED
    d = clamp(want - px, -PSPEED, PSPEED)
    return clamp(px + d, 0, PMAX)
def tick(s, move, target):
    s = json.loads(json.dumps(s))
    if s['phase'] == 'serve':
        px = move_paddle(s['paddle']['x'], move, target)
        s['paddle']['x'] = px; s['ball'] = on_paddle(px, s['launches']); s['ticks'] += 1; s['last'] = 'none'
        s['bursts'] = [dict(u, age=u['age'] + 1) for u in s['bursts'] if u['age'] + 1 < 8]
        return s
    if s['phase'] != 'play':
        s['last'] = 'none'; return s
    px = move_paddle(s['paddle']['x'], move, target)
    b = dict(s['ball']); ovx, ovy = b['vx'], b['vy']
    nx, ny = b['x'] + b['vx'], b['y'] + b['vy']
    if nx < R: b['vx'] = abs(b['vx'])
    elif nx > W - R: b['vx'] = -abs(b['vx'])
    if ny < R: b['vy'] = abs(b['vy'])
    b['x'] = clamp(nx, R, W - R); b['y'] = R if ny < R else ny
    wall_hit = b['vx'] != ovx or b['vy'] != ovy
    # paddle
    pcx = px + HPW
    touching = b['vy'] > 0 and abs(b['x'] - pcx) <= HPW + R and b['y'] + R >= PY and b['y'] - R <= PY + PH
    if touching:
        speed = max(MINVY, min(MAXV, abs(b['vy']) + SPEEDUP))
        spin = clamp(fdiv((b['x'] - pcx) * MAXVX, HPW), -MAXVX, MAXVX)
        b = {'x': b['x'], 'y': PY - R, 'vx': spin, 'vy': -speed}
    # bricks
    xs = ys = 0; bursts = [dict(u, age=u['age'] + 1) for u in s['bursts'] if u['age'] + 1 < 8]; bricks = []
    for c in s['bricks']:
        cx = WL + c['b'] * PX + HBW; cy = WT + c['a'] * PYT + HBH
        pxd = HBW + R - abs(b['x'] - cx); pyd = HBH + R - abs(b['y'] - cy)
        hit = c['alive'] and pxd >= 0 and pyd >= 0
        if hit:
            if pxd < pyd: xs += 1
            else: ys += 1
            bursts.append({'x': cx, 'y': cy, 'age': 0})
        bricks.append({'a': c['a'], 'b': c['b'], 'alive': c['alive'] and not hit})
    if xs: b['vx'] = -b['vx']
    if ys: b['vy'] = -b['vy']
    broke = xs + ys > 0
    gone = b['y'] - R > H
    lives = s['lives'] - 1 if gone else s['lives']
    intact = sum(1 for c in bricks if c['alive'])
    cleared = intact == 0
    phase = 'won' if cleared else ('lost' if gone and lives == 0 else 'serve' if gone else 'play')
    ball = on_paddle(px, s['launches']) if gone else b
    last = 'win' if cleared else 'lost' if gone else 'brick' if broke else 'paddle' if touching else 'wall' if wall_hit else 'none'
    return {'phase': phase, 'resume_to': 'play', 'paddle': {'x': px}, 'ball': ball, 'bricks': bricks, 'score': 30 - intact, 'lives': lives, 'launches': s['launches'], 'ticks': s['ticks'] + 1, 'last': last, 'bursts': bursts}
def step(s, e):
    k = e['kind']
    if k == 'tick': return tick(s, e['move'], e['target'])
    s = json.loads(json.dumps(s))
    if k == 'launch':
        if s['phase'] not in ('title', 'serve'): raise ValueError('WrongPhase')
        s['phase'] = 'play'; s['resume_to'] = 'play'; s['ball'] = on_paddle(s['paddle']['x'], s['launches']); s['launches'] += 1; s['last'] = 'launch'; return s
    if k == 'pause':
        if s['phase'] not in ('play', 'serve'): raise ValueError('WrongPhase')
        s['resume_to'] = s['phase']; s['phase'] = 'paused'; s['last'] = 'none'; return s
    if k == 'resume':
        if s['phase'] != 'paused': raise ValueError('WrongPhase')
        s['phase'] = s['resume_to']; s['last'] = 'none'; return s
    if k == 'restart': return initial()
    s['last'] = 'none'; return s
def run(events, start=None):
    s = start or initial(); refused = 0
    for e in events:
        try: s = step(s, e)
        except ValueError: refused += 1
    return s, refused
T = lambda n, move=0, target=-1: [{'kind': 'tick', 'move': move, 'target': target}] * n
traces = {}
# 1. launch and let the ball fly straight into the wall and back: top-row hits, ceiling, paddle
traces['straight_rally'] = {'events': [{'kind': 'launch'}] + T(400), 'start': None}
# 2. drive the paddle hard left while the ball flies: side-wall corners
traces['corner_left'] = {'events': [{'kind': 'launch'}] + T(60, -1) + T(300, 1) + T(300, -1), 'start': None}
# 3. high speed: a state with the ball at the speed ceiling aimed at the brick wall from the side
hs = initial(); hs['phase'] = 'play'; hs['launches'] = 1; hs['ball'] = {'x': 1000, 'y': 7000, 'vx': 700, 'vy': -100}
traces['high_speed_side'] = {'events': T(200), 'start': hs}
# 4. a grazing shot straight up a brick gap (gap 1300 > ball 1200): the ball should pass between columns and reflect off the ceiling
gap = initial(); gap['phase'] = 'play'; gap['launches'] = 1; gap['ball'] = {'x': WL + BW + 650, 'y': 30000, 'vx': 0, 'vy': -700}
traces['gap_pass'] = {'events': T(120), 'start': gap}
# 5. pause mid-flight, ticks delivered while paused must do nothing, resume continues
traces['pause_resume'] = {'events': [{'kind': 'launch'}] + T(50) + [{'kind': 'pause'}] + T(100, 1) + [{'kind': 'resume'}] + T(50), 'start': None}
# 6. lose all three lives with the paddle parked far right
traces['three_lives'] = {'events': [{'kind': 'launch'}] + T(400, 0, 31000) + [{'kind': 'launch'}] + T(400, 0, 31000) + [{'kind': 'launch'}] + T(400, 0, 31000), 'start': None}
# 7. restart after a loss gives the initial state
traces['restart'] = {'events': [{'kind': 'launch'}] + T(400, 0, 31000) + [{'kind': 'restart'}], 'start': None}
# 8. bottom-row brick struck from below at a corner of the brick: axis of least penetration, tie goes to y
corner = initial(); corner['phase'] = 'play'; corner['launches'] = 1
cx = WL + 2 * PX + HBW; cy = WT + 4 * PYT + HBH
corner['ball'] = {'x': cx + HBW + 400, 'y': cy + HBH + 400 + 450, 'vx': 0, 'vy': -450}
traces['brick_corner_tie'] = {'events': T(3), 'start': corner}
out = {}
for name, t in traces.items():
    final, refused = run(t['events'], t['start'])
    out[name] = {'start': t['start'], 'events': t['events'], 'expected': {'phase': final['phase'], 'score': final['score'], 'lives': final['lives'], 'ticks': final['ticks'], 'ball': final['ball'], 'paddle': final['paddle'], 'intact': sum(1 for c in final['bricks'] if c['alive']), 'refused': refused}}
    print(f"{name:18} → phase {final['phase']:6} score {final['score']:2} lives {final['lives']} ticks {final['ticks']:4} ball {final['ball']} refused {refused}")
json.dump(out, open(os.path.join(os.path.dirname(__file__), 'traces.json'), 'w'), indent=1)
