'use strict';

require('../common');
const fixtures = require('../common/fixtures');
const tmpdir = require('../common/tmpdir');
const { describe, it } = require('node:test');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const testFile = fixtures.path('test-runner/reporters.js');
tmpdir.refresh();

let tmpFiles = 0;
describe('node:test reporters', { concurrency: true }, () => {
  it('should default to outputing TAP to stdout', async () => {
    const child = spawnSync(process.execPath, ['--test', testFile]);
    assert.strictEqual(child.stderr.toString(), '');
    assert.match(child.stdout.toString(), /TAP version 13/);
    assert.match(child.stdout.toString(), /ok 1 - ok/);
    assert.match(child.stdout.toString(), /not ok 2 - failing/);
    assert.match(child.stdout.toString(), /ok 2 - top level/);
  });

  it('should default destination to stdout when passing a single reporter', async () => {
    const child = spawnSync(process.execPath, ['--test', '--test-reporter', 'dot', testFile]);
    assert.strictEqual(child.stderr.toString(), '');
    assert.strictEqual(child.stdout.toString(), '.XX.X\n');
  });

  it('should throw when passing reporters without a destination', async () => {
    const child = spawnSync(process.execPath, ['--test', '--test-reporter', 'dot', '--test-reporter', 'tap', testFile]);
    assert.match(child.stderr.toString(), /The argument '--test-reporter' must match the number of specified '--test-reporter-destination'\. Received \[ 'dot', 'tap' \]/);
    assert.strictEqual(child.stdout.toString(), '');
  });

  it('should throw when passing a destination without a reporter', async () => {
    const child = spawnSync(process.execPath, ['--test', '--test-reporter-destination', 'tap', testFile]);
    assert.match(child.stderr.toString(), /The argument '--test-reporter' must match the number of specified '--test-reporter-destination'\. Received \[\]/);
    assert.strictEqual(child.stdout.toString(), '');
  });

  it('should support stdout as a destination', async () => {
    const child = spawnSync(process.execPath,
                            ['--test', '--test-reporter', 'dot', '--test-reporter-destination', 'stdout', testFile]);
    assert.strictEqual(child.stderr.toString(), '');
    assert.strictEqual(child.stdout.toString(), '.XX.X\n');
  });

  it('should support stderr as a destination', async () => {
    const child = spawnSync(process.execPath,
                            ['--test', '--test-reporter', 'dot', '--test-reporter-destination', 'stderr', testFile]);
    assert.strictEqual(child.stderr.toString(), '.XX.X\n');
    assert.strictEqual(child.stdout.toString(), '');
  });

  it('should support a file as a destination', async () => {
    const file = path.join(tmpdir.path, `${tmpFiles++}.out`);
    const child = spawnSync(process.execPath,
                            ['--test', '--test-reporter', 'dot', '--test-reporter-destination', file, testFile]);
    assert.strictEqual(child.stderr.toString(), '');
    assert.strictEqual(child.stdout.toString(), '');
    assert.strictEqual(fs.readFileSync(file, 'utf8'), '.XX.X\n');
  });

  it('should support multiple reporters', async () => {
    const file = path.join(tmpdir.path, `${tmpFiles++}.out`);
    const file2 = path.join(tmpdir.path, `${tmpFiles++}.out`);
    const child = spawnSync(process.execPath,
                            ['--test',
                             '--test-reporter', 'dot', '--test-reporter-destination', file,
                             '--test-reporter', 'spec', '--test-reporter-destination', file2,
                             '--test-reporter', 'tap', '--test-reporter-destination', 'stdout',
                             testFile]);
    assert.match(child.stdout.toString(), /TAP version 13/);
    assert.match(child.stdout.toString(), /# duration_ms/);
    assert.strictEqual(fs.readFileSync(file, 'utf8'), '.XX.X\n');
    const file2Contents = fs.readFileSync(file2, 'utf8');
    assert.match(file2Contents, /▶ nested/);
    assert.match(file2Contents, /✔ ok/);
    assert.match(file2Contents, /✖ failing/);
  });

  ['js', 'cjs', 'mjs'].forEach((ext) => {
    it(`should support a '${ext}' file as a custom reporter`, async () => {
      const filename = `custom.${ext}`;
      const child = spawnSync(process.execPath,
                              ['--test', '--test-reporter', fixtures.path('test-runner/custom_reporters/', filename),
                               testFile]);
      assert.strictEqual(child.stderr.toString(), '');
      assert.strictEqual(child.stdout.toString(), `${filename} {"test:start":5,"test:pass":2,"test:fail":3,"test:plan":3,"test:diagnostic":7}`);
    });
  });
});
