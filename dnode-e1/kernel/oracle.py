#!/usr/bin/env python3
"""oracle.py — independent expected values for the kernel conformance cases.
Computed with Python integers (arbitrary precision), never with the DNode natives under test.
Writes kernel/oracle.json; kernel.node examples are checked against it by compare_oracle.js."""
import json, math
M = 9007199254740991
I = lambda z: -M <= z <= M

def floor_div(a, b):
    return a // b  # Python floors toward negative infinity

def floor_mod(a, b):
    return a - b * (a // b)

def bounded(z):
    return z if I(z) else 'ArithmeticOverflow'

def exact_sum(xs):
    s = 0
    for x in xs:
        s = s + x
        if not I(s):
            return 'ArithmeticOverflow'
    return s

cases = {
  "div": [[(7, 2), floor_div(7, 2)], [(-7, 2), floor_div(-7, 2)], [(M, -3), floor_div(M, -3)], [(-M, 3), floor_div(-M, 3)], [(0, 5), 0], [(-1, M), floor_div(-1, M)]],
  "mod": [[(7, 5), floor_mod(7, 5)], [(-1, 5), floor_mod(-1, 5)], [(7, -3), floor_mod(7, -3)], [(M, -3), floor_mod(M, -3)], [(-M, 7), floor_mod(-M, 7)], [(6, 3), 0], [(6, -3), 0]],
  "add": [[(2, 3), 5], [(M, 1), bounded(M + 1)], [(-M, -1), bounded(-M - 1)], [(M, -M), 0]],
  "mul": [[(4, 5), 20], [(M, 2), bounded(M * 2)], [(-M, -1), M], [(94906265, 94906265), bounded(94906265 * 94906265)]],
  "sum": [[([1, 2, 3],), 6], [([M, 2, -2],), exact_sum([M, 2, -2])], [([M, -2, 2],), exact_sum([M, -2, 2])], [([],), 0], [([-M, -1],), exact_sum([-M, -1])]],
  "neg": [[(M,), -M], [(-M,), M], [(0,), 0]],
  "abs": [[(-M,), M], [(0,), 0]],
}
# the quotient/remainder relation itself, checked for every div/mod case: a = b*q + r, and 0<=r<b or b<r<=0
rel = []
for (a, b), q in cases["div"]:
    r = floor_mod(a, b)
    ok = (a == b * q + r) and ((b > 0 and 0 <= r < b) or (b < 0 and b < r <= 0))
    rel.append({"a": a, "b": b, "q": q, "r": r, "relation_holds": ok})
out = {"M": M, "cases": {k: [{"args": list(a), "expect": e} for a, e in v] for k, v in cases.items()}, "relation": rel}
json.dump(out, open(__file__.replace("oracle.py", "oracle.json"), "w"), indent=1)
print("oracle.json written;", sum(len(v) for v in cases.values()), "cases; relation holds for all:", all(x["relation_holds"] for x in rel))
