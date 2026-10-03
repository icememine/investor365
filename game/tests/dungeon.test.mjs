// Headless checks for Hầm Ma, the action-RPG mode. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {Dungeon, generateFloor, flowField, floorPassable as passable, makeItem, rng, xpForLevel, isBossFloor, MAP_W, TILE, ENEMIES} from '../src/dungeon.mjs';

const clearFloor = d => { d.enemies = []; d.drops = []; };
const put = (d, type, dx, dy, opts = {}) => { const e = d.spawn(type, d.p.x + dx, d.p.y + dy, 1); Object.assign(e, opts); return e; };
const run = (d, seconds, input = {}) => { for (let t = 0; t < seconds; t += 0.05) d.step(0.05, input); };

test('generated floors are fully connected, with stairs far from the start', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const f = generateFloor(1 + seed % 9, seed * 131);
    assert.ok(f.rooms.length >= 5, `seed ${seed}: only ${f.rooms.length} rooms`);
    const field = flowField(f, f.rooms[0].cx, f.rooms[0].cy);
    for (const r of f.rooms) assert.ok(field[r.cy * MAP_W + r.cx] >= 0, `seed ${seed}: room unreachable`);
    assert.ok(passable(f, f.start.x, f.start.y), `seed ${seed}: start blocked`);
    assert.ok(passable(f, f.stairs.x, f.stairs.y), `seed ${seed}: stairs blocked`);
    assert.notEqual(f.stairsRoom, 0);
  }
});

test('floors are deterministic per seed', () => {
  assert.deepEqual(generateFloor(2, 77).tiles, generateFloor(2, 77).tiles);
});

test('the flashlight hits performers in front, not behind', () => {
  const d = new Dungeon(1); clearFloor(d);
  const front = put(d, 'sheet', 60, 0), back = put(d, 'sheet', -60, 0);
  d.cast('flash', {x: d.p.x + 100, y: d.p.y});
  assert.ok(front.hp < front.maxHp);
  assert.equal(back.hp, back.maxHp);
});

test('breaking a performer gives XP and coins; levels raise courage', () => {
  const d = new Dungeon(2); clearFloor(d);
  const e = put(d, 'sheet', 50, 0);
  d.damage(e, 999);
  assert.equal(e.state, 'defeated');
  assert.equal(d.p.xp, e.xp);
  assert.ok(d.drops.some(x => x.kind === 'gold'), 'performers always drop something worth picking up when lucky; this seed drops coins');
  d.gainXp(xpForLevel(1));
  assert.equal(d.p.level, 2);
  assert.equal(d.derived.maxCourage, 110);
  assert.equal(d.p.courage, 110);
});

test('candy flies and hits the first performer in its path', () => {
  const d = new Dungeon(3); clearFloor(d);
  const e = put(d, 'sheet', 150, 0);
  e.aggro = false; e.cd = 99;
  d.cast('candy', {x: d.p.x + 200, y: d.p.y});
  assert.equal(d.p.battery, 92);
  run(d, 0.6);
  assert.ok(e.hp < e.maxHp);
  assert.equal(d.projectiles.length, 0);
});

test('skills unlock by level and cost battery', () => {
  const d = new Dungeon(4); clearFloor(d);
  assert.equal(d.cast('bell'), false);
  d.p.level = 3;
  assert.equal(d.cast('bell'), true);
  assert.equal(d.cast('bell'), false, 'on cooldown');
  d.p.level = 5; d.p.battery = 10;
  assert.equal(d.cast('spotlight'), false, 'not enough battery');
});

test('the bell stuns nearby performers so their windup is cancelled', () => {
  const d = new Dungeon(5); clearFloor(d); d.p.level = 3;
  const e = put(d, 'sheet', 30, 0, {aggro: true, state: 'windup', t: .3});
  d.cast('bell');
  assert.ok(e.stun > 0);
  assert.notEqual(e.state, 'windup');
  const courage = d.p.courage;
  run(d, 0.5);
  assert.equal(d.p.courage, courage);
});

test('performers chase and scare an idle player; armor softens the scare', () => {
  const d = new Dungeon(6); clearFloor(d);
  put(d, 'sheet', 120, 0);
  run(d, 4);
  const lost = 100 - d.p.courage;
  assert.ok(lost > 0, 'the performer reached and scared the player');
  const tough = new Dungeon(6); clearFloor(tough);
  tough.equipped.coat = makeItem(rng(1), 1, 0, 'coat'); tough.equipped.coat.stats = {armor: 100};
  put(tough, 'sheet', 120, 0);
  run(tough, 4);
  assert.ok(100 - tough.p.courage < lost);
});

test('dashing makes you untouchable', () => {
  const d = new Dungeon(7); clearFloor(d);
  d.cast('dash');
  assert.equal(d.hurt(50), false);
  run(d, 0.3);
  assert.equal(d.hurt(10), true);
});

test('running out of courage sends you back to the floor start with your items, minus some coins', () => {
  const d = new Dungeon(8); clearFloor(d);
  d.p.gold = 100; const torch = d.equipped.torch;
  d.p.x += 200;
  d.hurt(999);
  assert.equal(d.p.gold, 90);
  assert.equal(d.p.x, d.floor.start.x);
  assert.equal(d.p.courage, d.derived.maxCourage);
  assert.equal(d.equipped.torch, torch);
  assert.equal(d.ending, null);
});

test('coins are picked up by walking over them; gear needs a pick-up', () => {
  const d = new Dungeon(9); clearFloor(d);
  d.drops.push({id: 900, kind: 'gold', amount: 7, x: d.p.x + 10, y: d.p.y});
  d.drops.push({id: 901, kind: 'item', item: makeItem(rng(2), 1), x: d.p.x + 12, y: d.p.y});
  d.step(0.05);
  assert.equal(d.p.gold, 7);
  assert.equal(d.inventory.length, 0);
  d.interact();
  assert.equal(d.inventory.length, 1);
});

test('equipping swaps gear and changes stats', () => {
  const d = new Dungeon(10);
  const torch = makeItem(rng(3), 5, 0, 'torch');
  d.inventory.push(torch);
  const before = d.derived.damage;
  d.equip(torch);
  assert.equal(d.equipped.torch, torch);
  assert.equal(d.inventory.length, 1, 'the old torch goes back in the bag');
  assert.ok(d.derived.damage > before);
});

test('Mr. D buys gear and sells snacks on floor 1', () => {
  const d = new Dungeon(11);
  assert.ok(d.vendor);
  Object.assign(d.p, {x: d.vendor.x, y: d.vendor.y + 20});
  const it = makeItem(rng(4), 1); d.inventory.push(it);
  assert.ok(d.sell(it));
  assert.equal(d.p.gold, it.value);
  d.p.gold = 25; const bread = d.potions.bread;
  assert.ok(d.buy('bread'));
  assert.equal(d.potions.bread, bread + 1);
  assert.equal(d.buy('bread'), false, 'not enough coins');
});

test('stairs lead down; every third floor a boss locks them until broken', () => {
  const d = new Dungeon(12); clearFloor(d);
  Object.assign(d.p, d.floor.stairs); d.interact();
  assert.equal(d.depth, 2);
  clearFloor(d); Object.assign(d.p, d.floor.stairs); d.interact();
  assert.equal(d.depth, 3);
  assert.ok(isBossFloor(3));
  const boss = d.enemies.find(e => e.boss);
  assert.equal(boss.type, 'zombie');
  Object.assign(d.p, d.floor.stairs); d.interact();
  assert.equal(d.depth, 3, 'locked');
  d.damage(boss, 99999);
  assert.equal(d.stairsLocked, false);
  assert.equal(d.drops.filter(x => x.kind === 'item').length, 3);
  d.drops = [];                            // the boss's loot lands by the stairs; E would pick it up first
  d.interact();
  assert.equal(d.depth, 4);
  assert.equal(d.floor.theme.id, 'dining');
});

test('Ma Cổ Dài drops her head where you stood: step away and it misses, stay and it lands', () => {
  for (const stay of [false, true]) {
    const d = new Dungeon(13);
    d.enterFloor(9);
    const boss = d.enemies.find(e => e.boss);
    assert.equal(boss.type, 'neck');
    d.enemies = [boss]; d.drops = [];
    Object.assign(boss, {x: d.p.x + 180, y: d.p.y, aggro: true, special: 0});
    d.step(0.05);
    d.marks = d.marks.slice(0, 1);          // keep only the mark under the player
    boss.special = 99;                       // no new marks during the test
    assert.ok(Math.hypot(d.marks[0].x - d.p.x, d.marks[0].y - d.p.y) < 1);
    const courage = d.p.courage;
    if (!stay) { d.cast('dash', {x: d.p.x, y: d.p.y + 200}); }
    run(d, 1.1);
    if (stay) assert.ok(d.p.courage < courage, 'standing still gets hit');
    else assert.ok(d.p.courage >= courage, 'stepping away avoids it');
  }
});

test('leaving by the up-ladder ends the run', () => {
  const d = new Dungeon(14);
  Object.assign(d.p, d.floor.exitUp);
  d.interact();
  assert.equal(d.ending, 'dungeon');
});

test('item rarity improves for bosses', () => {
  const r = rng(99), rank = {common: 0, magic: 1, rare: 2, legendary: 3};
  let normal = 0, boss = 0;
  for (let i = 0; i < 400; i++) { normal += rank[makeItem(r, 3, 0).rarity]; boss += rank[makeItem(r, 3, 1.6).rarity]; }
  assert.ok(boss > normal * 1.5);
});

test('every enemy type has the fields the simulation needs', () => {
  for (const [k, e] of Object.entries(ENEMIES)) for (const f of ['name', 'hp', 'dmg', 'speed', 'cd', 'windup', 'xp', 'r']) assert.ok(e[f] !== undefined, `${k}.${f}`);
  assert.equal(TILE, 32);
});
