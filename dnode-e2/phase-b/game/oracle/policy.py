"""Independent Breakout policy oracle (R-G3).

Written from handoff/PHASE_A_BP-GAME.md (D-G4.1..D-G4.4, D-G5.1 r1 keyboard/mouse, r2 touch) and
oracle/SPEC_CLARIFICATIONS.md ONLY, before any DNode output existed. It deliberately does not import or read
the DNode roots. Plain Python, integers only. Run with `python3 -I`.
"""
import copy

W, H = 4800, 6400
R = 60                      # ball AABB half-size
PAD_HALF, PAD_TOP = 500, 5700
PC_MIN, PC_MAX = 500, 4300
SERVE_Y = 5640
KEY_STEP, MOUSE_STEP = 80, 160
VXS = {16, 24, 32}
VYS = {24, 32, 36}
PHASES = ("serve", "play", "paused", "won", "lost")
PAUSES = ("none", "toggle", "force")


class Fault(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


class Refuse(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


def brick_rect(i):
    r, c = divmod(i, 6)
    x0 = 200 + 740 * c
    y0 = 800 + 280 * r
    return x0, x0 + 700, y0, y0 + 240


def initial():
    return {"phase": "serve", "resume": "serve", "pc": 2400, "bx": 2400, "by": SERVE_Y, "vx": 0, "vy": 0,
            "bricks": [True] * 30, "score": 0, "lives": 3,
            "ctl": {"was_down": False, "af": 0, "ap": 2400}, "events": []}


def clamp(x, lo, hi):
    return min(max(x, lo), hi)


# ---------------------------------------------------------------- shapes (C12)
def _int(v):
    return type(v) is int and -9007199254740991 <= v <= 9007199254740991


def _bool(v):
    return type(v) is bool


def _rec(v, spec):
    if type(v) is not dict or set(v.keys()) != set(spec.keys()):
        return False
    return all(chk(v[k]) for k, chk in spec.items())


def state_shape(s):
    return _rec(s, {
        "phase": lambda v: v in PHASES and type(v) is str, "resume": lambda v: v in PHASES and type(v) is str,
        "pc": _int, "bx": _int, "by": _int, "vx": _int, "vy": _int,
        "bricks": lambda v: type(v) is list and all(_bool(b) for b in v),
        "score": _int, "lives": _int,
        "ctl": lambda v: _rec(v, {"was_down": _bool, "af": _int, "ap": _int}),
        "events": lambda v: type(v) is list and all(type(e) is str for e in v)})


def input_shape(i):
    return _rec(i, {
        "left": _bool, "right": _bool, "action": _bool,
        "pause": lambda v: type(v) is str and v in PAUSES, "restart": _bool,
        "pointer": lambda v: _rec(v, {"active": _bool, "x": _int}),
        "touch": lambda v: _rec(v, {"down": _bool, "x": _int})})


# ---------------------------------------------------------------- validity (C9, C10)
def valid(s):
    b = s["bricks"]
    if len(b) != 30:
        return False
    if s["score"] != sum(1 for x in b if not x):
        return False
    if not (0 <= s["lives"] <= 3 and PC_MIN <= s["pc"] <= PC_MAX):
        return False
    if s["resume"] not in ("serve", "play"):
        return False
    if (s["phase"] == "won") != (s["score"] == 30):
        return False
    if (s["phase"] == "lost") != (s["lives"] == 0):
        return False
    moving = s["phase"] == "play" or (s["phase"] == "paused" and s["resume"] == "play")
    if moving:
        if abs(s["vx"]) not in VXS or abs(s["vy"]) not in VYS:
            return False
        if not (60 <= s["bx"] <= 4740 and 60 <= s["by"] <= 6459):
            return False
    else:
        if s["vx"] != 0 or s["vy"] != 0:
            return False
    attached = s["phase"] == "serve" or (s["phase"] == "paused" and s["resume"] == "serve")
    if attached and (s["bx"] != s["pc"] or s["by"] != SERVE_Y):
        return False
    return True


# ---------------------------------------------------------------- paddle control (D-G5.1 r1 + r2, C1, C2)
def control(s, inp):
    s = copy.deepcopy(s)
    ctl = s["ctl"]
    if inp["left"] or inp["right"]:
        d = (KEY_STEP if inp["right"] else 0) - (KEY_STEP if inp["left"] else 0)
        s["pc"] = clamp(s["pc"] + d, PC_MIN, PC_MAX)
        ctl["was_down"] = False
        return s
    t = inp["touch"]
    if t["down"]:
        if not ctl["was_down"]:
            ctl["af"] = t["x"]
            ctl["ap"] = s["pc"]
        raw = ctl["ap"] + (3 * (t["x"] - ctl["af"])) // 2       # Python // is floor division
        tgt = clamp(raw, PC_MIN, PC_MAX)
        if raw != tgt:
            ctl["ap"] = tgt
            ctl["af"] = t["x"]
        s["pc"] = tgt
        ctl["was_down"] = True
        return s
    ctl["was_down"] = False
    p = inp["pointer"]
    if p["active"]:
        s["pc"] = clamp(s["pc"] + clamp(p["x"] - s["pc"], -MOUSE_STEP, MOUSE_STEP), PC_MIN, PC_MAX)
    return s


# ---------------------------------------------------------------- physics (D-G4.2, D-G4.3)
def zone(d, vx):
    if d <= -301:
        return -32, -24
    if d <= -101:
        return -24, -32
    if d <= 100:
        return (16 if vx > 0 else -16), -36
    if d <= 300:
        return 24, -32
    return 32, -24


def overlaps(nx, ny, i):
    x0, x1, y0, y1 = brick_rect(i)
    return nx + R > x0 and nx - R < x1 and ny + R > y0 and ny - R < y1


def microstep(s, stats=None):
    if s["phase"] != "play":
        return s
    ev = s["events"]
    px, py = s["bx"], s["by"]
    vx, vy = s["vx"], s["vy"]
    assert vx % 4 == 0 and vy % 4 == 0
    nx, ny = px + vx // 4, py + vy // 4
    # walls
    if nx - R < 0:
        nx, vx = R, abs(vx)
        ev.append("wall")
    if nx + R > W:
        nx, vx = W - R, -abs(vx)
        ev.append("wall")
    if ny - R < 0:
        ny, vy = R, abs(vy)
        ev.append("wall")
    # paddle: top-line crossing only
    pc = s["pc"]
    if vy > 0 and py + R <= PAD_TOP < ny + R and nx + R > pc - PAD_HALF and nx - R < pc + PAD_HALF:
        ny = PAD_TOP - R
        vx, vy = zone(nx - pc, vx)
        ev.append("paddle")
    # bricks: lowest id only
    hits = [i for i in range(30) if s["bricks"][i] and overlaps(nx, ny, i)]
    if stats is not None and len(hits) > 1:
        stats["multi_overlap"] = stats.get("multi_overlap", 0) + 1
    if hits:
        b = hits[0]
        x0, x1, y0, y1 = brick_rect(b)
        if py <= y0 - R or py >= y1 + R:
            ny = y1 + R if vy < 0 else y0 - R
            vy = -vy
        else:
            nx = x0 - R if vx > 0 else x1 + R
            vx = -vx
        s["bricks"][b] = False
        s["score"] += 1
        ev.append("brick:%d" % b)
    s["bx"], s["by"], s["vx"], s["vy"] = nx, ny, vx, vy
    if s["score"] == 30:
        s["phase"] = "won"
        s["vx"] = s["vy"] = 0
        ev.append("won")
        return s
    if ny - R >= H:
        s["lives"] -= 1
        ev.append("life")
        s["phase"] = "lost" if s["lives"] == 0 else "serve"
        if s["lives"] == 0:
            ev.append("lost")
        s["bx"], s["by"], s["vx"], s["vy"] = pc, SERVE_Y, 0, 0
    return s


# ---------------------------------------------------------------- tick (D-G4.4, C5..C8)
def tick(state, inp, stats=None):
    if not state_shape(state) or not input_shape(inp):
        raise Fault("InputShape")
    if not valid(state):
        raise Refuse("InvalidGameState")
    s = copy.deepcopy(state)
    s["events"] = []
    ph = s["phase"]
    # 1. restart / action in won-lost
    if (inp["restart"] and ph in ("paused", "won", "lost")) or (inp["action"] and ph in ("won", "lost")):
        return initial()
    # 2. pause
    if ph not in ("won", "lost"):
        if ph in ("serve", "play") and inp["pause"] in ("toggle", "force"):
            s["resume"] = ph
            s["phase"] = "paused"
            s["ctl"]["was_down"] = False
            return s
        if ph == "paused" and inp["pause"] == "toggle":
            s["phase"] = s["resume"]
            return s
    # 3. paused
    if s["phase"] == "paused":
        return s
    # 4. paddle (C13: no phase guard in D-G4.4, so it also runs in won/lost)
    s = control(s, inp)
    # 5. serve
    if s["phase"] == "serve":
        s["bx"], s["by"] = s["pc"], SERVE_Y
        if inp["action"]:
            s["phase"] = "play"
            s["vx"], s["vy"] = (24, -32) if s["pc"] < 2400 else (-24, -32)
        return s
    # 6. play: four microsteps
    if s["phase"] == "play":
        for _ in range(4):
            s = microstep(s, stats)
    return s


NEUTRAL = {"left": False, "right": False, "action": False, "pause": "none", "restart": False,
           "pointer": {"active": False, "x": 0}, "touch": {"down": False, "x": 0}}


def inp(**kw):
    i = copy.deepcopy(NEUTRAL)
    for k, v in kw.items():
        i[k] = v
    return i
