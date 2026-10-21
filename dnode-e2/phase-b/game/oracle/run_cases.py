"""Run the oracle over any cases file (e.g. traces recorded in the browser and converted by tools/trace2cases.mjs).
Usage: python3 -I oracle/run_cases.py <cases.json> <expected.json>"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import policy as P  # noqa: E402


def run(c):
    s = c["initial"]
    out = []
    for i in c["inputs"]:
        try:
            s = P.tick(s, i)
            out.append({"ok": s})
        except P.Refuse as e:
            out.append({"refuse": e.code})
            break
        except P.Fault as e:
            out.append({"fault": e.code})
            break
    return out


if __name__ == "__main__":
    cases = json.load(open(sys.argv[1]))
    exp = {c["name"]: run(c) for c in cases}
    json.dump(exp, open(sys.argv[2], "w"), separators=(",", ":"), sort_keys=True)
    for c in cases:
        last = exp[c["name"]][-1].get("ok", {})
        ev = [e for r in exp[c["name"]] for e in r.get("ok", {}).get("events", [])]
        print("%-36s ticks=%-6d end=%-7s score=%-3s lives=%s bricks_ev=%d paddle_ev=%d life_ev=%d" % (
            c["name"], len(c["inputs"]), last.get("phase"), last.get("score"), last.get("lives"),
            sum(1 for e in ev if e.startswith("brick:")), ev.count("paddle"), ev.count("life")))
