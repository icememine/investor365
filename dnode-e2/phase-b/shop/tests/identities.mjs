// Full SHA-256 identities of the kit, its runtime/roots and every shop source file.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {load, SHOP, KIT} from './load.mjs';
const h = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const {release, fingerprint} = await load();
const files = ['shop.core.node', 'shop.view.node', 'app.js', 'index.html', 'serve.mjs', 'app-lock.json', ...fs.readdirSync(path.join(SHOP, 'tests')).map(f => 'tests/' + f), ...fs.readdirSync(path.join(SHOP, 'fixtures')).map(f => 'fixtures/' + f)].sort();
const out = {
  kit: {distribution: release.attestation.distribution, specification: release.attestation.specification, runtimeIdentity: release.attestation.runtimeIdentity,
    rootHashes: release.attestation.rootHashes, trustKeyFingerprint: fingerprint, attestedFiles: release.attestation.files},
  kitZipInPackage: fs.existsSync(path.join(SHOP, '../handoff/package/dnode-e1-kit.zip')) ? h(path.join(SHOP, '../handoff/package/dnode-e1-kit.zip')) : null,
  shop: Object.fromEntries(files.map(f => [f, h(path.join(SHOP, f))])),
  note: 'Shop root identities are SHA-256 of the exact .node bytes. The kit derives its own rootHashes by an algorithm not shipped in the kit, so no kit-compatible identity can be computed for application roots (gap G-B4).',
};
fs.writeFileSync(path.join(SHOP, 'evidence/identities.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({runtimeIdentity: out.kit.runtimeIdentity, rootHashes: out.kit.rootHashes, kitZip: out.kitZipInPackage, ...Object.fromEntries(['shop.core.node', 'shop.view.node', 'app.js', 'index.html', 'serve.mjs'].map(f => [f, out.shop[f]]))}, null, 1));
