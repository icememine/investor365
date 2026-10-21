// Scratch profiling: patch Breakout sources IN MEMORY to see what dominates tick cost. Not shipped logic.
import {loadKit, appSources, compile, Runtime} from '../../tools/lib.mjs';
const kit = await loadKit();
const kitRoots = Object.entries(kit.texts).filter(([p]) => p.startsWith('roots/')).map(([, s]) => s);
const profile = JSON.parse(kit.texts['profiles/browser.json']);
const neutral = {left:false,right:false,action:false,pause:'none',restart:false,pointer:{active:false,x:0},touch:{down:false,x:0}};
function bench(label, patch) {
  const srcs = appSources().map(a => patch(a.text));
  const rt = new Runtime(compile([...kitRoots, ...srcs]), profile);
  const init = rt.run('game.initial', []).out;
  for (const [name, s0] of [['zone', {...init, phase:'play', bx:3000, by:1500, vx:32, vy:-24}], ['open', {...init, phase:'play', bx:2400, by:4000, vx:24, vy:-32}], ['serve', init]]) {
    for (let k = 0; k < 200; k++) rt.run('game.tick', [s0, neutral]);
    const t = performance.now(); for (let k = 0; k < 500; k++) rt.run('game.tick', [s0, neutral]);
    console.log(label.padEnd(28), name, ((performance.now() - t) / 500).toFixed(3), 'ms');
  }
}
bench('as-is', s => s);
bench('no pre/inv on tick', s => s.replace(' pre (game.valid s) InvalidGameState\n', '').replace(' inv (game.valid out)\n', ''));
bench('no brick scan', s => s.replace('(filter "phys.brick_candidate" (range BRICK_COUNT) {nx m2.nx ny m2.ny bricks s.bricks})', '[]'));
