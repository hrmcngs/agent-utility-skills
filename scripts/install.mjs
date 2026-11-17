#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { lstat, mkdir, readlink, symlink, unlink } from 'node:fs/promises';
import path from 'node:path';

const source = fileURLToPath(new URL('../skills/qrcode-generator', import.meta.url));
try {
  const { values } = parseArgs({ options: {
    target: { type: 'string' }, tool: { type: 'string', default: 'both' },
    uninstall: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) {
    console.log('Usage: node scripts/install.mjs --target /path/to/project [--tool claude|codex|both] [--uninstall]\nCreates only skill symlinks. Does not change application files or install packages.');
  } else {
    if (!values.target) throw new Error('--target is required.');
    if (!['claude', 'codex', 'both'].includes(values.tool)) throw new Error('Unknown tool.');
    const target = path.resolve(values.target);
    if (!(await lstat(target)).isDirectory()) throw new Error('Target must be an existing project directory.');
    const tools = values.tool === 'both' ? ['claude', 'codex'] : [values.tool];
    const actions = [];
    // Check every destination before changing anything, so a conflict cannot cause a partial install.
    for (const tool of tools) {
      const destination = path.join(target, tool === 'claude' ? '.claude' : '.agents', 'skills', 'qrcode-generator');
      let exists = false;
      let ours = false;
      try {
        const stat = await lstat(destination);
        exists = true;
        ours = stat.isSymbolicLink() && path.resolve(path.dirname(destination), await readlink(destination)) === source;
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (exists && !ours) throw new Error(`Existing skill is not managed by this checkout: ${destination}`);
      actions.push({ destination, exists });
    }
    for (const { destination, exists } of actions) {
      if (values.uninstall) {
        if (exists) await unlink(destination);
        console.log(`Removed/absent: ${destination}`);
      } else {
        if (!exists) {
          await mkdir(path.dirname(destination), { recursive: true });
          await symlink(source, destination, 'dir');
        }
        console.log(`Installed: ${destination}`);
      }
    }
  }
} catch (error) {
  console.error(`Skill installation failed: ${error.message}`);
  process.exitCode = 1;
}
