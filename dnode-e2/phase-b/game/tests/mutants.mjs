// Sensitivity check for the oracle comparison: apply plausible single-point policy slips to the DNode sources
// IN MEMORY, run every oracle case, and count how many cases detect each mutant (first differing tick).
// A mutant nobody detects means the trace set has a blind spot. Output: evidence/mutants.json
import fs from 'node:fs';
import path from 'node:path';
import {loadKit, appSources, compile, Runtime, canon, GAME} from '../tools/lib.mjs';

const mutants = [
  ['tie_highest_id', 'breakout.physics.node', '(let b (if hit (at ids 0) -1))', ' let b (if hit (at ids (- (len ids) 1)) -1)'],
  ['corner_horizontal_priority', 'breakout.physics.node', ' let vert (or (<= m.py (- r.y0 BALL_R)) (>= m.py (+ r.y1 BALL_R)))', ' let vert (and (or (<= m.py (- r.y0 BALL_R)) (>= m.py (+ r.y1 BALL_R))) (and (> m.px (- r.x0 BALL_R)) (< m.px (+ r.x1 BALL_R))))'],
  ['overlap_non_strict_y0', 'breakout.geometry.node', '(> (+ ny BALL_R) y0)', '(>= (+ ny BALL_R) y0)'],
  ['overlap_non_strict_x0', 'breakout.geometry.node', '(> (+ nx BALL_R) x0)', '(>= (+ nx BALL_R) x0)'],
  ['overlap_non_strict_x1', 'breakout.geometry.node', '(< (- nx BALL_R) (+ x0 BRICK_W))', '(<= (- nx BALL_R) (+ x0 BRICK_W))'],
  ['overlap_non_strict_y1', 'breakout.geometry.node', '(< (- ny BALL_R) (+ y0 BRICK_H))', '(<= (- ny BALL_R) (+ y0 BRICK_H))'],
  ['zone_centre_off_by_one', 'breakout.physics.node', '(if (<= d 100) {vx', '(if (< d 100) {vx'],
  ['exit_strict', 'breakout.physics.node', '(>= (- m3.ny BALL_R) FIELD_H)', '(> (- m3.ny BALL_R) FIELD_H)'],
  ['touch_gain_round_toward_zero', 'breakout.control.node', '(div (* 3 (- t.x af)) 2)', '(* (div (- t.x af) 2) 3)'],
  ['pause_keeps_touch_anchor', 'breakout.game.node', '(with s phase "paused" resume s.phase ctl (with s.ctl was_down false))', '(with s phase "paused" resume s.phase)'],
  ['launch_boundary', 'breakout.game.node', '(if (< s.pc PC_START) 24 -24)', '(if (<= s.pc PC_START) 24 -24)'],
  ['restart_in_play', 'breakout.game.node', '(contains s.phase ["paused" "won" "lost"])', '(contains s.phase ["paused" "won" "lost" "play"])'],
  ['paddle_line_non_strict', 'breakout.physics.node', '(< PAD_TOP (+ m.ny BALL_R))', '(<= PAD_TOP (+ m.ny BALL_R))'],
  ['mouse_step_200', 'breakout.control.node', 'const MOUSE_STEP 160', 'const MOUSE_STEP 200'],
  ['keyboard_ignores_touch_anchor', 'breakout.control.node', 'ctl (with s.ctl was_down false))\n\nnode ctl.touch', ')\n\nnode ctl.touch'],
  ['no_wall_event', 'breakout.physics.node', ' let ev1 (if l (concat m.events ["wall"]) m.events)', ' let ev1 m.events'],
  ['remove_all_overlaps_score2', 'breakout.physics.node', ' let score (if hit (+ s.score 1) s.score)', ' let score (if hit (+ s.score (len ids)) s.score)'],
];
mutants[0][2] = ' let b (if hit (at ids 0) -1)';

const kit = await loadKit();
const kitRoots = Object.entries(kit.texts).filter(([p]) => p.startsWith('roots/')).map(([, s]) => s);
const profile = JSON.parse(kit.texts['profiles/browser.json']);
const cases = JSON.parse(fs.readFileSync(path.join(GAME, 'oracle/cases.json'), 'utf8'));
const expected = JSON.parse(fs.readFileSync(path.join(GAME, 'oracle/expected.json'), 'utf8'));
const results = [];
for (const [name, file, from, to] of mutants) {
  const srcs = appSources().map(a => {
    if (a.file !== file) return a.text;
    if (!a.text.includes(from)) throw new Error('mutant anchor missing: ' + name);
    return a.text.replace(from, to);
  });
  let rt, compileError = null;
  try { rt = new Runtime(compile([...kitRoots, ...srcs]), profile); } catch (e) { compileError = e.message; }
  const detectedBy = [];
  if (rt) for (const c of cases) {
    let s = c.initial;
    for (let k = 0; k < c.inputs.length; k++) {
      let got;
      try { s = rt.run('game.tick', [s, c.inputs[k]]).out; got = {ok: s}; }
      catch (e) { got = e.kind === 'refused' ? {refuse: e.code} : {fault: e.code ?? e.message}; }
      if (canon(got) !== canon(expected[c.name][k])) { detectedBy.push(c.name + '@' + k); break; }
      if (!('ok' in got)) break;
    }
  }
  results.push({mutant: name, compileError, detectedByCases: detectedBy.length, examples: detectedBy.slice(0, 6)});
  console.log(name.padEnd(32), compileError ? 'COMPILE ' + compileError : 'detected by ' + detectedBy.length + ' cases', detectedBy.slice(0, 3).join(' '));
}
fs.writeFileSync(path.join(GAME, 'evidence/mutants.json'), JSON.stringify({cases: cases.length, results}, null, 1));
