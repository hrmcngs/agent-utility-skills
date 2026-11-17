#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      stdin: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
      output: { type: 'string', short: 'o' }, format: { type: 'string' },
      size: { type: 'string', default: '512' }, margin: { type: 'string', default: '4' },
      dark: { type: 'string', default: '#000000' }, light: { type: 'string', default: '#ffffff' },
    },
  });
  if (values.help) {
    console.log('Usage: node generate.mjs [--output FILE] [--format png|svg] [--size PIXELS] [--margin MODULES] [--dark #RRGGBB] [--light #RRGGBB] -- TEXT\n       node generate.mjs --stdin [options] < payload.txt\nDefaults: qrcode.png, PNG, 512px, margin 4, black on white. Existing files are never overwritten.');
  } else {
    if ((values.stdin && positionals.length) || (!values.stdin && positionals.length !== 1)) {
      throw new Error('Supply exactly one text argument, or use --stdin without a text argument.');
    }
    let text = positionals[0];
    if (values.stdin) {
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      text = Buffer.concat(chunks).toString('utf8');
    }
    if (!text.length) throw new Error('The payload is empty.');
    const integer = (value, name, min, max) => {
      if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
        throw new Error(`${name} must be an integer between ${min} and ${max}.`);
      }
      return Number(value);
    };
    const width = integer(values.size, 'size', 1, 8192);
    const margin = integer(values.margin, 'margin', 0, 32);
    for (const key of ['dark', 'light']) {
      if (!/^#[0-9a-f]{6}$/i.test(values[key])) throw new Error(`${key} must be #RRGGBB.`);
    }
    if (values.dark.toLowerCase() === values.light.toLowerCase()) throw new Error('Dark and light colors must differ.');
    const extension = values.output ? path.extname(values.output).slice(1).toLowerCase() : '';
    const format = values.format || extension || 'png';
    if (!['png', 'svg'].includes(format)) throw new Error('Only PNG and SVG are supported.');
    if (extension && extension !== format) throw new Error('Output extension must match the format.');
    const minimum = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules.size + 2 * margin;
    if (width < minimum) throw new Error(`Size must be at least ${minimum}px for this payload and margin.`);
    const options = { width, margin, errorCorrectionLevel: 'M', color: { dark: values.dark, light: values.light } };
    const data = format === 'png' ? await QRCode.toBuffer(text, { ...options, type: 'png' }) : await QRCode.toString(text, { ...options, type: 'svg' });
    const output = path.resolve(values.output || `qrcode.${format}`);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, data, { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ output, format, size: width }));
  }
} catch (error) {
  console.error(`QR generation failed: ${error.message}`);
  process.exitCode = 1;
}
