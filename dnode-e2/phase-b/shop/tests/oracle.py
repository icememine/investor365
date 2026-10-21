"""Independent oracle for BP-SHOP S02/S03/S05/S06 (computational parts).

Written from the BP-SHOP blueprint text, the Phase A handoff (C-S1, C-S3) and
owner rulings R-S1..R-S3, without consulting DNode outputs. It generates
random operation scenarios and the expected result after every operation.
tests/compare.mjs replays the same scenarios through the DNode roots and the
kit's simulatedBank, and compares.

Run: python3 -I tests/oracle.py > evidence/oracle-cases.json
"""
import json
import random
import sys

SEED = [("NOTEBOOK", "Notebook", 50000, 5), ("PEN", "Pen", 20000, 8), ("TOTE", "Tote bag", 120000, 2)]
SKUS = [s for s, _, _, _ in SEED]
PRICE = {s: p for s, _, p, _ in SEED}
OPEN = {"ready", "pending", "unknown"}
I_MAX = 9007199254740991


def money(n):
    """240000 -> '240.000 ₫' (C-S2 r2)."""
    assert 0 <= n <= I_MAX
    s = str(n)
    groups = []
    while len(s) > 3:
        groups.insert(0, s[-3:])
        s = s[:-3]
    groups.insert(0, s)
    return ".".join(groups) + " ₫"


class Model:
    def __init__(self):
        self.H = {s: h for s, _, _, h in SEED}
        self.R = {s: 0 for s in SKUS}
        self.orders = []  # dicts: key, lines{sku:q}, total, phase, inquiries
        self.seq = 1
        self.bank = {}  # id -> (amount, status)

    def snapshot(self):
        return {
            "H": dict(self.H), "R": dict(self.R),
            "phases": [o["phase"] for o in self.orders],
            "ledger": {k: {"amount": a, "status": st} for k, (a, st) in sorted(self.bank.items())},
        }

    # --- cart/intent
    @staticmethod
    def lines_problem(lines):
        if len(lines) == 0:
            return "EmptyCart"
        skus = [s for s, _ in lines]
        if len(lines) > 3 or len(set(skus)) != len(skus):
            return "InvalidLines"
        for s, q in lines:
            if s not in PRICE or not (1 <= q <= 9):
                return "InvalidLines"
        return None

    @staticmethod
    def total(lines):
        t = 0
        for s, q in sorted(lines):
            t += PRICE[s] * q
            assert t <= I_MAX
        return t

    def place(self, lines):
        p = self.lines_problem(lines)
        if p:
            return {"refuse": p}
        key = "ORD-%04d" % self.seq
        self.seq += 1  # a key is minted when review is entered, even if placing then fails
        for s, q in lines:
            if q > self.H[s] - self.R[s]:
                return {"refuse": "OutOfStock"}
        for s, q in lines:
            self.R[s] += q
        o = {"key": key, "lines": dict(lines), "total": self.total(lines), "phase": "ready", "inquiries": 0}
        self.orders.append(o)
        return {"ok": True, "key": key, "total": o["total"]}

    # --- simulator (kit SEMANTICS: one id -> immutable amount/outcome binding)
    def charge(self, iid, amount, mode):
        if iid in self.bank:
            assert self.bank[iid][0] == amount
        else:
            self.bank[iid] = (amount, "declined" if mode == "decline" else "confirmed")
        return "unknown" if mode == "lost" else self.bank[iid][1]

    def inquire(self, iid, mode):
        if mode == "unavailable":
            return "unknown"
        return self.bank[iid][1] if iid in self.bank else "unknown"

    def settle(self, o, reply):
        if o["phase"] not in ("pending", "unknown"):
            if (o["phase"], reply) in (("confirmed", "declined"), ("declined", "confirmed")):
                raise AssertionError("contradiction")
            return
        if reply == "confirmed":
            for s, q in o["lines"].items():
                self.H[s] -= q
                self.R[s] -= q
            o["phase"] = "confirmed"
        elif reply == "declined":
            for s, q in o["lines"].items():
                self.R[s] -= q
            o["phase"] = "declined"
        else:
            o["phase"] = "unknown"

    def pay(self, n, mode):
        o = self.orders[n]
        if o["phase"] == "cancelled":
            return {"refuse": "Cancelled"}
        if o["phase"] != "ready":
            return {"ok": True, "charges": 0}
        o["phase"] = "pending"
        reply = self.charge(o["key"] + "-P1", o["total"], mode)
        self.settle(o, reply)
        return {"ok": True, "charges": 1, "reply": reply}

    def check(self, n, mode):
        o = self.orders[n]
        if o["phase"] in ("ready", "cancelled"):
            return {"refuse": "NotSubmitted"}
        if o["phase"] not in ("pending", "unknown"):
            return {"ok": True, "inquiries": 0}
        o["inquiries"] += 1
        reply = self.inquire(o["key"] + "-P1", mode)
        self.settle(o, reply)
        return {"ok": True, "inquiries": 1, "reply": reply}

    def cancel(self, n):
        o = self.orders[n]
        if o["phase"] != "ready":
            return {"refuse": "NotCancellable"}
        for s, q in o["lines"].items():
            self.R[s] -= q
        o["phase"] = "cancelled"
        return {"ok": True}

    def replay(self, n):
        return {"ok": True, "key": self.orders[n]["key"], "created": False}

    def conflict(self, n, lines):
        o = self.orders[n]
        if dict(lines) == o["lines"]:
            return {"ok": True, "key": o["key"], "created": False}
        return {"refuse": "IntentConflict"}

    def import_(self, rows):
        # rows: list of (sku, qty) as they appear in the file; all syntactically valid.
        skus = [s for s, _ in rows]
        if set(skus) != set(SKUS):
            return {"refuse": "SkuSetMismatch"}
        new = dict(rows)
        if any(new[s] < self.R[s] for s in SKUS):
            return {"refuse": "BelowReserved"}
        for s in SKUS:
            self.H[s] = new[s]  # replaces H; R unchanged (physical unsold units incl. reserved)
        return {"ok": True}


def rand_lines(rng):
    k = rng.choice([0] + [1] * 6 + [2] * 5 + [3] * 3 + [4])
    pool = list(SKUS)
    rng.shuffle(pool)
    lines = []
    for i in range(k):
        s = pool[i % 3]
        if rng.random() < 0.05:
            s = "ERASER"
        if rng.random() < 0.05 and lines:
            s = lines[0][0]
        r = rng.random()
        q = 0 if r < 0.03 else 10 if r < 0.08 else rng.choice([1, 1, 1, 2, 2, 3, 5, 9])
        lines.append((s, q))
    return lines


def scenario(rng, steps):
    m = Model()
    ops, expect = [], []
    for _ in range(steps):
        kinds = ["place", "place", "place", "pay", "pay", "pay", "check", "check", "check", "cancel", "replay", "conflict", "import"]
        kind = rng.choice(kinds)
        if kind != "place" and kind != "import" and not m.orders:
            kind = "place"
        mode = rng.choice(["accept", "decline", "lost", "unavailable"])
        if kind == "place":
            lines = rand_lines(rng)
            op = {"op": "place", "lines": [{"sku": s, "qty": q} for s, q in lines]}
            res = m.place(lines)
        elif kind == "import":
            rows = [(s, rng.choice([0, 1, 2, 3, 5, 8, 12])) for s in SKUS]
            r = rng.random()
            if r < 0.1:
                rows = rows[:2]
            elif r < 0.15:
                rows = rows + [("ERASER", 4)]
            rng.shuffle(rows)
            op = {"op": "import", "rows": [{"sku": s, "qty": q} for s, q in rows]}
            res = m.import_(rows)
        else:
            n = rng.randrange(len(m.orders))
            if kind == "pay":
                op = {"op": "pay", "order": n, "mode": mode}
                res = m.pay(n, mode)
            elif kind == "check":
                op = {"op": "check", "order": n, "mode": mode}
                res = m.check(n, mode)
            elif kind == "cancel":
                op = {"op": "cancel", "order": n}
                res = m.cancel(n)
            elif kind == "replay":
                op = {"op": "replay", "order": n}
                res = m.replay(n)
            else:
                lines = rand_lines(rng)
                if rng.random() < 0.3:
                    lines = list(m.orders[n]["lines"].items())
                if m.lines_problem(lines):
                    lines = [("PEN", 1)] if m.orders[n]["lines"] != {"PEN": 1} else [("PEN", 2)]
                op = {"op": "conflict", "order": n, "lines": [{"sku": s, "qty": q} for s, q in lines]}
                res = m.conflict(n, lines)
        # invariant check of the model itself
        for s in SKUS:
            assert 0 <= m.R[s] <= m.H[s], (s, m.R[s], m.H[s])
            assert m.R[s] == sum(o["lines"].get(s, 0) for o in m.orders if o["phase"] in OPEN)
        ops.append(op)
        expect.append({"result": res, "after": m.snapshot()})
    return {"ops": ops, "expect": expect}


def main():
    rng = random.Random(20261021)
    scenarios = [scenario(rng, rng.randint(4, 16)) for _ in range(400)]
    money_cases = [[n, money(n)] for n in [0, 1, 999, 1000, 20000, 50000, 120000, 240000, 1000000, 1710000, 1000000000, I_MAX]]
    money_cases += [[x, money(x)] for x in (rng.randrange(0, I_MAX) for _ in range(200))]
    total_cases = []
    for _ in range(300):
        lines = rand_lines(rng)
        p = Model.lines_problem(lines)
        total_cases.append({"lines": [{"sku": s, "qty": q} for s, q in lines], "expect": {"refuse": p} if p else {"total": Model.total(lines)}})
    json.dump({"oracle": "tests/oracle.py", "seed": 20261021, "scenarios": scenarios, "money": money_cases, "totals": total_cases}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
