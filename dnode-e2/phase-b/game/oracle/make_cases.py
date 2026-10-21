"""Generate G03/G04/G05/G02 trace cases and the oracle's expected per-tick results.

Usage: python3 -I oracle/make_cases.py <outdir>
Writes <outdir>/cases.json (initial state + per-tick inputs) and <outdir>/expected.json (oracle result per tick).
Autopilot cases choose inputs from the ORACLE's state; the chosen inputs are then fixed data for the DNode run.
"""
import copy
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import policy as P  # noqa: E402

I = P.inp
N = P.NEUTRAL


def play_state(bx, by, vx, vy, pc=2400, bricks=None, lives=3):
    s = P.initial()
    s.update({"phase": "play", "resume": "serve", "bx": bx, "by": by, "vx": vx, "vy": vy, "pc": pc,
              "lives": lives})
    s["ctl"]["ap"] = pc
    if bricks is not None:
        s["bricks"] = bricks
        s["score"] = sum(1 for b in bricks if not b)
    return s


def only(*ids):
    return [i in ids for i in range(30)]


cases = []


def case(name, cat, initial, inputs, note=""):
    cases.append({"name": name, "category": cat, "note": note, "initial": initial, "inputs": inputs})


# ---------------------------------------------------------------- G-T3 a-d
case("GT3a_joint_25_26", "G-T3", play_state(1660, 2224, 16, -36), [N], "joint of bricks 25/26: only 25 removed, vertical")
case("GT3b_diag_corner_29", "G-T3", play_state(4662, 2222, -32, -24), [N], "diagonal corner of 29: vertical response")
case("GT3c_touch_bottom_25_nohit", "G-T3", play_state(1290, 2256, 16, -36), [N], "ball top ends exactly at y1=2160: no hit")
case("GT3c_touch_bottom_25_then_hit", "G-T3", play_state(1290, 2256, 16, -36), [N, N], "next microstep overlaps and hits")
case("GT3c_touch_side_0_nohit", "G-T3", play_state(124, 1000, 16, -24), [N], "ball right edge ends exactly at x0=200: no hit")
case("GT3c_touch_side_0_then_hit", "G-T3", play_state(124, 1000, 16, -24), [N, N], "then horizontal hit on brick 0")
no25 = [i != 25 for i in range(30)]
case("GT3c_touch_bottom_19_nohit", "G-T3", play_state(1290, 1976, 16, -36, bricks=no25), [N], "25 removed; ball top ends at y1=1880 of 19: no hit")
case("GT3c_touch_bottom_19_then_hit", "G-T3", play_state(1290, 1976, 16, -36, bricks=no25), [N, N], "then vertical hit on 19")
case("GT3c_touch_top_1_nohit", "G-T3", play_state(1290, 704, 16, 36), [N], "ball bottom ends exactly at y0=800: no hit")
case("GT3c_touch_top_1_then_hit", "G-T3", play_state(1290, 704, 16, 36), [N, N], "then vertical hit on brick 1 from above")
case("GT3c_touch_right_5_nohit", "G-T3", play_state(4676, 1000, -16, -24), [N], "ball left edge ends exactly at x1=4600: no hit")
case("GT3c_touch_right_5_then_hit", "G-T3", play_state(4676, 1000, -16, -24), [N, N], "then horizontal hit on brick 5")
case("GT3d_lowest_id_18_24", "G-T3", play_state(130, 1900, 32, -24), [N], "left faces of 18/24 at joint: 18 removed, horizontal")
case("GT3_pocket_three", "G-T3", play_state(1660, 1944, 16, -36), [N, N, N], "joint 19/20 then 25/26 region")

# ---------------------------------------------------------------- paddle zone boundaries
for d in (-560, -559, -301, -300, -101, -100, 0, 100, 101, 300, 301, 559, 560):
    for vx in (16, -16):
        bx = 2400 + d - vx // 4
        case("zone_d%+d_vx%+d" % (d, vx), "zone", play_state(bx, 5640, vx, 36), [N, N],
             "crossing microstep has nx-pc=%d" % d)
case("zone_equal_line_no_cross", "zone", play_state(2400, 5631, 16, 36), [N], "ny+60 == 5700 is not a crossing; next ms is")
case("paddle_upward_no_catch", "zone", play_state(2400, 5650, 16, -36), [N], "vy<0 never caught")
case("paddle_below_line_no_catch", "zone", play_state(2400, 5700, 16, 36), [N] * 3, "ball already below top line falls")
case("paddle_side_pass", "zone", play_state(1780, 5760, 32, 24), [N] * 8, "no side faces: passes the paddle side")
case("zone_edge_pc500", "zone", play_state(1050, 5640, -16, 36, pc=500), [N], "paddle at left clamp edge, d=546")
case("zone_edge_pc4300", "zone", play_state(3750, 5640, 16, 36, pc=4300), [N], "paddle at right clamp edge, d=-546")

# ---------------------------------------------------------------- max speed / walls / corners
case("maxspeed_brick_from_below", "maxspeed", play_state(2770, 2400, 32, -36), [N] * 12, "(32,-36) to brick row 4")
case("maxspeed_corner_top_right", "maxspeed", play_state(4736, 66, 32, -36), [N], "right+top wall in one microstep")
case("maxspeed_corner_top_left", "maxspeed", play_state(64, 66, -32, -36), [N], "left+top wall in one microstep")
case("maxspeed_left_wall_exact", "maxspeed", play_state(68, 3000, -32, 24), [N], "nx-60 == 0 touches, then wall")
case("maxspeed_right_wall_exact", "maxspeed", play_state(4732, 3000, 32, 24), [N], "nx+60 == 4800 touch")
case("maxspeed_paddle_vy36", "maxspeed", play_state(2400, 5600, 16, 36), [N] * 3, "vy=36 into paddle")
case("maxspeed_top_channel", "maxspeed", play_state(3000, 700, 32, -24), [N] * 60, "above the bricks at speed")
case("maxspeed_side_channel_up", "maxspeed", play_state(4700, 3000, 32, -36), [N] * 120, "right channel climb")

# ---------------------------------------------------------------- exit boundary
case("exit_exact_6400", "exit", play_state(1000, 6424, 16, 36, pc=3000), [N], "ny-60 == 6400 at ms4: exit")
case("exit_6399_then_exit", "exit", play_state(1000, 6423, 16, 36, pc=3000), [N, N], "6399 not an exit; next tick exits")
case("exit_last_life_lost", "exit", play_state(1000, 6424, 16, 36, pc=3000, lives=1), [N, N, I(restart=True)],
     "lives 1 -> lost; restart -> initial")
case("exit_then_relaunch_requires_action", "exit", play_state(1000, 6424, 16, 36, pc=3000),
     [N, N, N, I(action=True), N], "serve waits for explicit action")

# ---------------------------------------------------------------- last brick win
case("last_brick_win", "win", play_state(4662, 2222, -32, -24, bricks=only(29)),
     [N, N, I(right=True), I(pause="toggle"), I(action=True)], "29 removed -> won; paused ignored; action restarts")
case("last_brick_win_restart_key", "win", play_state(4662, 2222, -32, -24, bricks=only(29)), [N, I(restart=True)],
     "restart in won -> initial")

# ---------------------------------------------------------------- serve / launch
case("launch_from_initial", "serve", P.initial(), [I(action=True), N, N], "pc=2400 -> (-24,-32), moves next tick")
case("launch_pc_2399", "serve", P.initial(), [I(pointer={"active": True, "x": 2399}), I(action=True), N], "pc<2400 -> (+24,-32)")
case("serve_ball_follows_paddle", "serve", P.initial(), [I(left=True)] * 5 + [I(right=True)] * 3, "ball attached")
case("action_in_play_ignored", "serve", play_state(2400, 4000, 24, -32), [I(action=True)] * 3, "no relaunch in play")
case("restart_in_play_ignored", "serve", play_state(2400, 4000, 24, -32), [I(restart=True)] * 2, "C5")
case("restart_in_serve_ignored", "serve", P.initial(), [I(restart=True), I(left=True, restart=True)], "C5")

# ---------------------------------------------------------------- keyboard / mouse (G02)
case("kbd_full_left", "control", P.initial(), [I(left=True)] * 30, "reaches 500 and stays")
case("kbd_full_right", "control", P.initial(), [I(right=True)] * 30, "reaches 4300")
case("kbd_full_traverse", "control", P.initial(), [I(left=True)] * 25 + [I(right=True)] * 50, "500 -> 4300")
case("kbd_both_held", "control", P.initial(), [I(left=True, right=True)] * 3, "no move")
case("kbd_over_pointer", "control", P.initial(), [I(left=True, pointer={"active": True, "x": 4000})] * 3, "keyboard wins")
case("mouse_far_target", "control", P.initial(), [I(pointer={"active": True, "x": 4800})] * 15, "160/tick then clamp")
case("mouse_near_target", "control", P.initial(), [I(pointer={"active": True, "x": 2450})] * 2, "exact when within 160")
case("mouse_left_offfield", "control", P.initial(), [I(pointer={"active": True, "x": -300})] * 15, "clamp 500")
case("mouse_inactive", "control", P.initial(), [I(pointer={"active": False, "x": 100})] * 3, "no move")

# ---------------------------------------------------------------- touch r2 (G02, G-C1)
T = lambda x, **kw: I(touch={"down": True, "x": x}, **kw)  # noqa: E731
U = I(touch={"down": False, "x": 0})
case("touch_anchor_no_jump", "touch", P.initial(), [T(1000), T(1000), T(1200), T(1100)], "touchdown does not move paddle; gain 1.5")
case("touch_negative_floor", "touch", P.initial(), [T(1000), T(999), T(997), T(1001)], "floor(3*(-1)/2) = -2")
case("touch_clamp_rebase_right", "touch", P.initial(), [T(1000), T(2000), T(2500), T(2490), T(2480)], "rebase at 4300, immediate return")
case("touch_clamp_rebase_left", "touch", P.initial(), [T(3000), T(1000), T(900), T(910)], "rebase at 500")
case("touch_full_range", "touch", P.initial(), [T(2400)] + [T(2400 - 40 * k) for k in range(1, 40)] +
     [T(840 + 60 * k) for k in range(1, 50)], "drag covers 500..4300")
case("touch_lift_reanchor", "touch", P.initial(), [T(1000), T(1200), U, T(4000), T(4100)], "new touch re-anchors")
case("touch_pause_reanchor", "touch", play_state(2400, 4000, 24, -32),
     [T(1000), T(1100), T(1150, pause="toggle"), T(3000), T(3500), T(3600, pause="toggle"), T(3700), T(3800)],
     "pause cancels drag; finger moved while paused; re-anchor after resume, no jump")
case("touch_keyboard_precedence", "touch", P.initial(), [T(1000), T(1200), T(1300, right=True), T(1300), T(1400)],
     "C1: keyboard tick clears was_down; re-anchor")
case("touch_over_mouse", "touch", P.initial(), [I(touch={"down": True, "x": 1000}, pointer={"active": True, "x": 4000}),
                                                 I(touch={"down": True, "x": 1100}, pointer={"active": True, "x": 4000})],
     "C2: touch takes precedence")
case("touch_in_won_lost_moves_paddle", "touch", play_state(1000, 6424, 16, 36, pc=3000, lives=1), [N, T(1000), T(1400)],
     "C13: paddle responds in lost")

# ---------------------------------------------------------------- pause / restart (G04)
mid = play_state(2000, 3000, 24, -32)
case("pause_1800_ticks", "pause", mid, [I(pause="toggle")] + [N] * 1800 + [I(pause="toggle"), N, N],
     "Gp constant for 1800 paused ticks; resume tick only changes phase; then one normal tick")
noisy = [I(left=(k % 3 == 0), right=(k % 5 == 0), action=(k % 7 == 0), pointer={"active": True, "x": 37 * k % 4800},
           touch={"down": k % 2 == 0, "x": 13 * k}) for k in range(300)]
case("pause_ignores_inputs", "pause", mid, [I(pause="force")] + noisy + [I(pause="force"), I(pause="toggle"), N],
     "levels and action ignored while paused; force while paused is a no-op")
case("pause_from_serve", "pause", P.initial(), [I(pause="toggle"), I(left=True), I(pause="toggle"), I(left=True)],
     "resume returns to serve")
case("restart_from_paused", "pause", mid, [I(pause="toggle"), N, I(restart=True), N], "restart -> exact initial")
case("restart_and_pause_same_tick", "pause", mid, [I(pause="toggle"), I(restart=True, pause="toggle")], "restart first")
case("pause_and_action_same_tick", "pause", P.initial(), [I(pause="toggle", action=True), N], "pause tick does nothing else")

# ---------------------------------------------------------------- malformed
bad_input = copy.deepcopy(N)
bad_input["pause"] = "pause"
case("malformed_pause_value", "malformed", P.initial(), [bad_input], "C12 InputShape")
bad_state = P.initial()
bad_state["vx"] = "24"
case("malformed_text_velocity", "malformed", bad_state, [N], "C12 InputShape")
bad_state2 = P.initial()
bad_state2["bricks"] = [True] * 29
case("invalid_29_bricks", "malformed", bad_state2, [N], "C10 InvalidGameState")
bad_state3 = P.initial()
bad_state3["pc"] = 4400
bad_state3["bx"] = 4400
case("invalid_pc_out_of_range", "malformed", bad_state3, [N], "C10 InvalidGameState")
bad_state4 = play_state(2000, 3000, 20, -32)
case("invalid_velocity_20", "malformed", bad_state4, [N], "C10 InvalidGameState")


# ---------------------------------------------------------------- autopilot play-throughs (G03 high-volume)
def lcg(seed):
    x = seed
    while True:
        x = (1103515245 * x + 12345) % (1 << 31)
        yield x


def autopilot(name, seed, mode, max_ticks, lose=False, pause_every=0):
    rnd = lcg(seed)
    s = P.initial()
    inputs = []
    offset = 0
    t = 0
    while t < max_ticks:
        r = next(rnd)
        i = copy.deepcopy(N)
        if s["phase"] in ("won", "lost"):
            break
        if s["phase"] == "serve":
            if r % 7 == 0:
                i["action"] = True
            else:
                i["pointer"] = {"active": True, "x": 400 + r % 4000} if mode == "mouse" else i["pointer"]
        elif s["phase"] == "play":
            if s["events"] and "paddle" in s["events"]:
                offset = [-450, -250, -60, 60, 250, 450][r % 6]
            target = s["bx"] - offset
            if lose:
                target = s["bx"] + (2400 if s["bx"] < 2400 else -2400)
            if mode == "mouse":
                i["pointer"] = {"active": True, "x": target}
            elif mode == "keys":
                if target < s["pc"] - 40:
                    i["left"] = True
                elif target > s["pc"] + 40:
                    i["right"] = True
            elif mode == "touch":
                # finger x such that the r2 rule lands near target; host-style integer finger positions
                ctl = s["ctl"]
                if ctl["was_down"]:
                    fx = ctl["af"] + (2 * (P.clamp(target, 500, 4300) - ctl["ap"])) // 3
                else:
                    fx = 2000
                i["touch"] = {"down": (r % 97) != 0, "x": fx}
        if pause_every and t % pause_every == pause_every - 1:
            i["pause"] = "toggle"
        if s["phase"] == "paused" and r % 13 == 0:
            i["pause"] = "toggle"
        inputs.append(i)
        s = P.tick(s, i)
        t += 1
    case(name, "autopilot", P.initial(), inputs, "%s autopilot seed %d; ended phase %s after %d ticks" %
         (mode, seed, s["phase"], t))


autopilot("auto_mouse_s1", 1, "mouse", 60000)
autopilot("auto_mouse_s7", 7, "mouse", 60000)
autopilot("auto_keys_s3", 3, "keys", 60000)
autopilot("auto_touch_s5", 5, "touch", 60000)
autopilot("auto_mouse_pauses_s11", 11, "mouse", 60000, pause_every=97)
autopilot("auto_lose_three_lives", 2, "mouse", 20000, lose=True)


# ---------------------------------------------------------------- expected
def run(c, stats):
    s = c["initial"]
    out = []
    for i in c["inputs"]:
        try:
            s = P.tick(s, i, stats)
            out.append({"ok": s})
        except P.Refuse as e:
            out.append({"refuse": e.code})
            break
        except P.Fault as e:
            out.append({"fault": e.code})
            break
    return out


if __name__ == "__main__":
    outdir = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
    stats = {}
    expected = {}
    summary = []
    for c in cases:
        res = run(c, stats)
        expected[c["name"]] = res
        last = res[-1]
        end = last.get("ok", {}).get("phase", last.get("refuse") or last.get("fault"))
        summary.append((c["name"], len(c["inputs"]), end, last.get("ok", {}).get("score"), last.get("ok", {}).get("lives")))
    with open(os.path.join(outdir, "cases.json"), "w") as f:
        json.dump(cases, f, separators=(",", ":"), sort_keys=True)
    with open(os.path.join(outdir, "expected.json"), "w") as f:
        json.dump(expected, f, separators=(",", ":"), sort_keys=True)
    for row in summary:
        print("%-40s ticks=%-6d end=%-8s score=%s lives=%s" % row)
    print("cases", len(cases), "ticks", sum(len(c["inputs"]) for c in cases), "oracle stats", stats)
