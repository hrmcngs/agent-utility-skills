import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../skills/qrcode-generator/package.json', import.meta.url));
const { PNG } = require('pngjs');
const jsQR = require('jsqr');
const generator = path.join(root, 'skills/qrcode-generator/scripts/generate.mjs');
const installer = path.join(root, 'scripts/install.mjs');
const run = (file, args, options = {}) => spawnSync(process.execPath, [file, ...args], { encoding: 'utf8', ...options });
const temporary = async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'qr-skill-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
};

for (const text of ['https://example.com/?a=1&b=two#section', 'こんにちは QR コード\n改行・空白 も保存 $(echo test)']) {
  test(`PNG round trip: ${JSON.stringify(text)}`, async (t) => {
    const cwd = await temporary(t);
    const result = run(generator, ['--stdin'], { cwd, input: text });
    assert.equal(result.status, 0, result.stderr);
    const png = PNG.sync.read(await readFile(path.join(cwd, 'qrcode.png')));
    assert.equal(png.width, 512);
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    assert.ok(decoded);
    assert.equal(decoded.data, text);
  });
}

test('SVG format, custom colors and nested path', async (t) => {
  const cwd = await temporary(t);
  const output = path.join(cwd, 'nested', 'custom.svg');
  const result = run(generator, ['--output', output, '--size', '256', '--dark', '#112233', '--light', '#eeeeff', '--', 'hello']);
  assert.equal(result.status, 0, result.stderr);
  const svg = await readFile(output, 'utf8');
  assert.match(svg, /<svg/);
  assert.match(svg, /width="256"/);
  assert.match(svg, /#112233/);
  assert.match(svg, /#eeeeff/);
});

test('existing output survives and invalid requests fail', async (t) => {
  const cwd = await temporary(t);
  await writeFile(path.join(cwd, 'qrcode.png'), 'keep me');
  for (const args of [['--', 'hello'], ['--size', '1', '--', 'hello'], ['--format', 'pdf', '--', 'hello'], ['--dark', 'red', '--', 'hello'], ['--output', 'bad.svg', '--format', 'png', '--', 'hello'], ['--', ''], []]) {
    const result = run(generator, args, { cwd });
    assert.notEqual(result.status, 0);
  }
  assert.equal(await readFile(path.join(cwd, 'qrcode.png'), 'utf8'), 'keep me');
});

test('installer is repeatable, links same skill and removes only links', async (t) => {
  const cwd = await temporary(t);
  const args = ['--target', cwd];
  for (let i = 0; i < 2; i++) assert.equal(run(installer, args).status, 0);
  for (const dir of ['.claude', '.agents']) {
    const skill = path.join(cwd, dir, 'skills/qrcode-generator');
    assert.ok((await lstat(skill)).isSymbolicLink());
    assert.equal(await readFile(path.join(skill, 'SKILL.md'), 'utf8'), await readFile(path.join(root, 'skills/qrcode-generator/SKILL.md'), 'utf8'));
  }
  await writeFile(path.join(cwd, 'app.txt'), 'preserve');
  assert.equal(run(installer, [...args, '--uninstall']).status, 0);
  assert.equal(run(installer, [...args, '--uninstall']).status, 0);
  assert.equal(await readFile(path.join(cwd, 'app.txt'), 'utf8'), 'preserve');
});

test('installer preserves conflicting skills without partial install', async (t) => {
  const cwd = await temporary(t);
  await mkdir(path.join(cwd, '.agents/skills/qrcode-generator'), { recursive: true });
  const result = run(installer, ['--target', cwd]);
  assert.notEqual(result.status, 0);
  await assert.rejects(lstat(path.join(cwd, '.claude/skills/qrcode-generator')), { code: 'ENOENT' });
  assert.ok((await lstat(path.join(cwd, '.agents/skills/qrcode-generator'))).isDirectory());
});
