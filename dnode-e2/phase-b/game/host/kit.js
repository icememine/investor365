// Admission before execution (R0.2). Verifies the frozen kit with the kit's own verifyBundle and the in-kit trust
// key (fingerprint pinned here; self-referential, recorded as a known limit), then checks the Breakout root files
// against app-manifest.json, and only then compiles. Any failure throws; the page refuses to run.
export const EXPECTED_TRUST_FINGERPRINT = '4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244';
export const ROOT_FILES = ['breakout.geometry.node', 'breakout.physics.node', 'breakout.control.node', 'breakout.game.node'];

async function fetchText(url) {
  const r = await fetch(url, {cache: 'no-store'});
  if (!r.ok) throw new Error('Missing ' + url);
  return r.text();
}

export async function bootKit({kitBase = 'kit/', appBase = 'dnode/', manifestUrl = 'app-manifest.json'} = {}) {
  // The verifier itself is kit code; importing it only defines functions (no node runs before verification).
  const engine = await import(new URL(kitBase + 'runtime/engine.js', document.baseURI).href);
  const admission = await import(new URL(kitBase + 'runtime/admission.js', document.baseURI).href);
  const key = JSON.parse(await fetchText(kitBase + 'generated/trust-key.json'));
  const fingerprint = await admission.sha(engine.json(key));
  if (fingerprint !== EXPECTED_TRUST_FINGERPRINT) throw new Error('AdmissionDenied: trust key fingerprint ' + fingerprint);
  const {release, texts} = await admission.verifyBundle(p => fetchText(kitBase + p), key);

  const manifest = JSON.parse(await fetchText(manifestUrl));
  const app = [];
  for (const f of ROOT_FILES) {
    const text = await fetchText(appBase + f);
    const h = await admission.sha(text);
    if (h !== manifest.roots[f]) throw new Error('AdmissionDenied: app root ' + f + ' is ' + h + ', manifest pins ' + manifest.roots[f]);
    app.push({file: f, text, sha256: h});
  }
  const kitRoots = Object.entries(texts).filter(([p]) => p.startsWith('roots/') && p.endsWith('.node')).map(([, s]) => s);
  const graph = engine.compile([...kitRoots, ...app.map(a => a.text)]);
  const profile = JSON.parse(texts['profiles/browser.json']);
  const makeRuntime = () => new engine.Runtime(graph, profile);
  const identities = {
    distribution: release.attestation.distribution,
    runtimeIdentity: release.attestation.runtimeIdentity,
    preludeRoot: release.attestation.rootHashes.prelude,
    browserProfileFile: release.attestation.files['profiles/browser.json'],
    trustFingerprint: fingerprint,
    appRoots: Object.fromEntries(app.map(a => [a.file, a.sha256])),
    appIdentity: manifest.appIdentity,
  };
  return {engine, admission, release, graph, profile, makeRuntime, identities, manifest};
}
