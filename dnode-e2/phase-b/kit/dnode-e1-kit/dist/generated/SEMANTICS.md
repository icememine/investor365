# E1 execution bindings

Canonical encoding: UTF-8 JSON encoding of tagged trees from values.js. Tags b/i/s/l/r; integers represented as decimal strings, keys ordered by Unicode scalar sequence, strings preserved without normalization. SHA-256 uses full lowercase hex.

Game: 4800×6400 integer units, ten units per pixel. Paddle center 500..4300; width 1000, top 5700, height 140. Ball radius 60. Sixty ticks/second, four microsteps per tick; maximum absolute velocity 40 per tick (steps ≤10). Four-step bounded AABB collision, first overlapping brick by ID, vertical response when previous y was outside its expanded vertical interval, horizontal otherwise. Resolve walls, paddle then brick. Corner ties use this order. AABB ball is the declared approximation, not exact circle geometry. At most five catch-up ticks; excess wall time is dropped. Pause discards elapsed pause time.

Host: generic renderer/event bridge; Web Locks serialize one localStorage transaction record on a single origin. No distributed/power-loss guarantees. Payment simulator stores one id→immutable amount/outcome binding. Reports do not prove bank behavior.

Unsupported: recursion, floating point, dynamic function references, unrestricted regex, aliases, boundary-only checking, real payments, distributed transactions.
