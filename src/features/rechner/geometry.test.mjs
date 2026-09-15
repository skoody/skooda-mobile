import { solvePythagoras, fmtGeo } from './geometry.js';
import assert from 'node:assert/strict';

const r = solvePythagoras({ a: 3, b: 4 });
assert.equal(r.ok, true);
assert.equal(r.solved, 'c');
assert.ok(Math.abs(r.c - 5) < 1e-10);
assert.equal(r.area, 6);
assert.ok(Math.abs(r.perimeter - 12) < 1e-10);
assert.match(r.used, /c = √/);

const a = solvePythagoras({ b: 4, c: 5 });
assert.equal(a.ok, true);
assert.equal(a.solved, 'a');
assert.ok(Math.abs(a.a - 3) < 1e-10);

const b = solvePythagoras({ a: 3, c: 5 });
assert.equal(b.ok, true);
assert.equal(b.solved, 'b');
assert.ok(Math.abs(b.b - 4) < 1e-10);

assert.equal(solvePythagoras({ a: 3 }).ok, false);
assert.equal(solvePythagoras({ a: -3, b: 4 }).ok, false);
assert.equal(solvePythagoras({ a: 5, c: 3 }).ok, false);
assert.match(solvePythagoras({ a: 5, c: 3 }).error, /größer/);

const all = solvePythagoras({ a: 3, b: 4, c: 5 });
assert.equal(all.ok, true);
assert.equal(all.solved, null);

const bad = solvePythagoras({ a: 2, b: 3, c: 10 });
assert.equal(bad.ok, false);

assert.equal(fmtGeo(0), '0');
console.log('geometry tests ok');
