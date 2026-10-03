// Headless checks of the simulation rules described in GAME-DESIGN.md. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {SPOTS, BLOCKS, distance, passable, findPath, Simulation} from '../src/sim.mjs';

const spot = id => SPOTS.find(s => s.id === id);
const standAt = (sim, id) => { const s = spot(id); sim.p.x = s.x; sim.p.y = s.y + 20; };
const run = (sim, seconds, input = {}) => { for (let t = 0; t < seconds; t += 0.05) sim.step(0.05, input); };
// Park the vampire far away so it does not interfere with tests about other rules.
const parkGhost = sim => { Object.assign(sim.monster, {x: 120, y: 500, state: 'rest', t: 999, path: []}); };

test('rejects unknown roles', () => {
  assert.throws(() => new Simulation('ghost'));
});

test('pathfinding stays on walkable floor and routes around the table', () => {
  const path = findPath({x: 380, y: 300}, {x: 660, y: 300});
  assert.ok(path.length > 0);
  for (const n of path) assert.ok(passable(n.x, n.y), `node ${n.x},${n.y} is blocked`);
  const table = BLOCKS[0];
  assert.ok(path.some(n => n.y > table.y + table.h), 'path should detour below the table');
});

test('objects cannot be used from far away; tapping queues navigation', () => {
  const sim = new Simulation('visitor'); parkGhost(sim);
  assert.equal(sim.interact('bell'), false);
  sim.navigate(spot('bell').x, spot('bell').y, 'bell');
  run(sim, 6);
  assert.ok(sim.objectCooldowns.bell > 0, 'bell should have been rung on arrival');
});

test('clues are collected once and unlock nothing without all three', () => {
  const sim = new Simulation('visitor'); parkGhost(sim);
  standAt(sim, 'portrait'); sim.interact('portrait');
  standAt(sim, 'portrait'); sim.interact('portrait');
  assert.deepEqual(sim.clues, ['name']);
  assert.equal(sim.mystery, false);
});

test('repeated prop use is weaker and respects cooldown', () => {
  const sim = new Simulation('visitor');
  standAt(sim, 'bell');
  assert.ok(sim.effect('bell', spot('bell')));
  const first = sim.monster.effectDuration;
  assert.equal(sim.effect('bell', spot('bell')), false, 'still cooling down');
  sim.objectCooldowns.bell = 0;
  sim.effect('bell', spot('bell'));
  assert.ok(Math.abs(first - sim.monster.effectDuration - 0.65) < 1e-9);
});

test('flashlight aimed at the ghost stuns it; aimed away does nothing', () => {
  const sim = new Simulation('visitor');
  Object.assign(sim.p, {x: 500, y: 450});
  Object.assign(sim.monster, {x: 700, y: 450, state: 'patrol', path: []});
  sim.p.face = Math.PI; // facing left, away from the ghost
  sim.action(); sim.step(0.05);
  assert.notEqual(sim.monster.state, 'stunned');
  sim.p.face = 0;
  sim.step(0.05);
  assert.equal(sim.monster.state, 'stunned');
});

test('max fear sends the visitor to rest without losing clues', () => {
  const sim = new Simulation('visitor'); parkGhost(sim);
  sim.clues.push('ticket'); sim.monster.state = 'patrol'; sim.monster.t = 0;
  sim.fear = 100; sim.stepVisitor(0.05);
  assert.equal(sim.fear, 40);
  assert.equal(sim.resting, true);
  assert.deepEqual(sim.clues, ['ticket']);
});

test('visitor exit endings depend on time and clues', () => {
  const quick = new Simulation('visitor'); standAt(quick, 'door'); quick.interact('door');
  assert.equal(quick.ending, 'leave');
  const found = new Simulation('visitor'); found.clues.push('tape'); standAt(found, 'door'); found.interact('door');
  assert.equal(found.ending, 'tricks');
});

test('An appears with all clues after 20 s, and the table resolves the ticket', () => {
  const sim = new Simulation('visitor'); parkGhost(sim);
  sim.clues.push('name', 'tape', 'ticket');
  sim.time = 19; sim.tryMystery(); assert.equal(sim.mystery, false);
  sim.time = 20; sim.tryMystery(); assert.equal(sim.mystery, true);
  standAt(sim, 'ticket'); sim.interact('ticket');
  assert.equal(sim.ending, 'ticket');
});

test('wardrobe invites An onto the staff once the story is active', () => {
  const sim = new Simulation('visitor');
  sim.clues.push('name', 'tape', 'ticket'); sim.time = 25; sim.tryMystery();
  standAt(sim, 'wardrobe'); sim.interact('wardrobe');
  assert.equal(sim.ending, 'new');
});

test('employee places at most three spaced speakers', () => {
  const sim = new Simulation('employee');
  for (const x of [200, 300, 400, 500]) { sim.p.x = x; sim.p.y = 450; sim.place(); }
  assert.equal(sim.props.length, 3);
  assert.equal(sim.stamina, 85);
  sim.props.length = 0; sim.p.x = 200; sim.place(); sim.p.x = 230; sim.place();
  assert.equal(sim.props.length, 1, 'too close to the first speaker');
});

test('employee admits one group at a time and guests act on their own', () => {
  const sim = new Simulation('employee');
  standAt(sim, 'door'); sim.interact('door');
  assert.equal(sim.npcs.length, 2);
  const before = sim.npcs.map(n => ({x: n.x, y: n.y}));
  standAt(sim, 'door'); sim.interact('door');
  assert.equal(sim.wave, 1, 'second group must wait');
  Object.assign(sim.p, {x: 150, y: 500});
  run(sim, 3);
  assert.ok(sim.npcs.some((n, i) => distance(n, before[i]) > 20), 'guests should move while player idles');
});

test('surprise scare scores more than a seen scare, repeats score little', () => {
  const sim = new Simulation('employee');
  standAt(sim, 'door'); sim.interact('door');
  const g = sim.npcs[0];
  Object.assign(g, {x: 500, y: 450, face: Math.PI, caution: 0.1, path: []});
  sim.npcs[1].gone = true;
  Object.assign(sim.p, {x: 600, y: 450});
  sim.action(); // guest faces away -> surprise
  assert.equal(sim.score, 25);
  sim.cooldown = 0; g.flee = 0; g.face = 0; // now facing the performer and cautious
  sim.action();
  assert.equal(sim.score, 35);
  sim.cooldown = 0; g.flee = 0;
  sim.action();
  assert.equal(sim.score, 38);
});

test('speaker pulls each guest only once', () => {
  const sim = new Simulation('employee');
  standAt(sim, 'door'); sim.interact('door');
  Object.assign(sim.p, {x: 700, y: 450}); sim.place();
  assert.equal(sim.npcs.filter(n => distance(n, sim.props[0]) <= 300).length > 0, true);
  sim.secondary();
  const pulled = sim.distracted;
  assert.ok(pulled > 0);
  sim.propCooldown = 0; sim.secondary();
  assert.equal(sim.distracted, pulled);
});

test('finished runs stop advancing', () => {
  const sim = new Simulation('employee');
  sim.finish('together');
  const t = sim.time; sim.step(0.05);
  assert.equal(sim.time, t);
});
