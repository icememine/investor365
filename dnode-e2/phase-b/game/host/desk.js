// Test desk (?desk=1): identities, tick timing, replay-from-initial (IDENTICAL/DIFFERENT), trace download/upload,
// render/audio fault injection, long-frame and clock-jump injection. Host-level instruments only: nothing here can
// set game state.
export function buildDesk(root, {api, stats, identities, getState, sha, canon}) {
  root.innerHTML = `
  <button id="dk-collapse" style="float:right">Hide</button>
  <h3>Admission</h3><div class="ok res">Kit verified (verifyBundle + trust key) · app roots match manifest</div>
  <details><summary>Identities</summary><pre id="dk-ids"></pre></details>
  <h3>Simulation</h3>
  <div>Phase <b id="dk-phase"></b> · ticks <b id="dk-ticks"></b> · state hash <code id="dk-hash"></code></div>
  <div>ms per game.tick (last 1200): mean <b id="dk-mean"></b> · p95 <b id="dk-p95"></b> · max <b id="dk-max"></b></div>
  <div>Frames at 5-tick cap: <b id="dk-cap"></b> · discarded ticks: <b id="dk-disc"></b> · last frame: <b id="dk-last"></b></div>
  <h3>G05 replay</h3>
  <button id="dk-replay">Replay from initial</button><button id="dk-dl">Download trace</button>
  <label><input id="dk-file" type="file" accept=".json" style="width:170px"></label>
  <div>Result: <span id="dk-res" class="res">—</span></div><pre id="dk-resd"></pre>
  <h3>G05 fault injection</h3>
  <label><input type="checkbox" id="dk-rf"> Render fault (renderer throws, attempts to write ball x)</label><br>
  <label><input type="checkbox" id="dk-af"> Audio fault</label><br>
  <button id="dk-probe">Render-fault probe</button> <span id="dk-probe-res" class="res"></span>
  <h3>G04 timing injection</h3>
  <label>Long frame <input id="dk-ms" type="number" value="500" min="0" step="50"> ms</label> <button id="dk-long">Inject</button><br>
  <button id="dk-jump">Jump clock +30 s</button>
  <div id="dk-inj"></div>`;
  const q = s => root.querySelector(s);
  q('#dk-ids').textContent = JSON.stringify(identities, null, 1);
  q('#dk-collapse').onclick = () => { root.classList.toggle('collapsed'); q('#dk-collapse').textContent = root.classList.contains('collapsed') ? 'Show' : 'Hide'; };
  const show = (r) => {
    const el = q('#dk-res'); el.textContent = r.result; el.className = 'res ' + (r.result === 'IDENTICAL' ? 'ok' : 'bad');
    q('#dk-resd').textContent = JSON.stringify(r, null, 1);
  };
  q('#dk-replay').onclick = async () => {
    q('#dk-res').textContent = 'replaying…';
    const t = await api.exportTrace();
    show(await api.replayTrace(t, (n, total) => { q('#dk-res').textContent = `replaying ${n}/${total}`; }));
  };
  q('#dk-dl').onclick = () => api.downloadTrace();
  q('#dk-file').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { show(await api.replayTrace(JSON.parse(await f.text()))); } catch (err) { show({result: 'DIFFERENT', reason: 'unreadable trace: ' + err.message}); }
  };
  q('#dk-rf').onchange = e => api.setRenderFault(e.target.checked);
  q('#dk-af').onchange = e => api.setAudioFault(e.target.checked);
  q('#dk-probe').onclick = async () => {
    const r = await api.renderFaultProbe();
    const el = q('#dk-probe-res'); el.textContent = r.unchanged ? 'state UNCHANGED' : 'state CHANGED'; el.className = 'res ' + (r.unchanged ? 'ok' : 'bad');
  };
  q('#dk-long').onclick = () => { const ms = Number(q('#dk-ms').value) || 0; api.injectLongFrame(ms); q('#dk-inj').textContent = `injected ${ms} ms frame`; };
  q('#dk-jump').onclick = () => { api.jumpClock(30000); q('#dk-inj').textContent = 'clock jumped +30 s'; };
  let n = 0;
  return {
    async tick() {
      if (++n % 15) return;
      const s = getState(), t = [...stats.tickMs].sort((a, b) => a - b);
      q('#dk-phase').textContent = s.phase;
      q('#dk-ticks').textContent = stats.ticksTotal;
      if (t.length) {
        q('#dk-mean').textContent = (t.reduce((a, b) => a + b, 0) / t.length).toFixed(2);
        q('#dk-p95').textContent = t[Math.floor(0.95 * (t.length - 1))].toFixed(2);
        q('#dk-max').textContent = t[t.length - 1].toFixed(2);
      }
      q('#dk-cap').textContent = stats.catchUpFrames; q('#dk-disc').textContent = stats.discardedTotal;
      const f = stats.frames[stats.frames.length - 1]; if (f) q('#dk-last').textContent = `${f.ticks} ticks, ${f.simMs} ms`;
      if (n % 60 === 0) q('#dk-hash').textContent = (await sha(canon(s))).slice(0, 16);
    },
  };
}
