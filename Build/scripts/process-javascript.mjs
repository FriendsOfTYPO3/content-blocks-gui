/**
 * Standalone Rollup post-processor for Content Blocks GUI.
 * Ported from TYPO3 core Gruntfile process-javascript task.
 *
 * Reads tsc output from JavaScript/friendsoftypo3/, rewrites imports,
 * minifies Lit templates, and writes to Resources/Public/JavaScript/content-blocks-gui/
 */

import { rollup } from 'rollup';
import { minify } from 'rollup-plugin-esbuild';
import { mapImports } from '../lib/map-import.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, relative, dirname } from 'path';
import { globSync } from 'fs';

// Use glob from node:fs or fallback
let glob;
try {
  glob = (await import('glob')).globSync;
} catch {
  // Node 22+ has glob in fs
  const fs = await import('node:fs');
  glob = (pattern) => {
    const { globSync } = fs;
    return globSync(pattern);
  };
}

const ROOT = resolve(import.meta.dirname, '..');
const INPUT_DIR = resolve(ROOT, 'JavaScript/friendsoftypo3/content-blocks-gui');
const OUTPUT_DIR = resolve(ROOT, '..', 'Resources/Public/JavaScript/content-blocks-gui');

const banner = `/*
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */`;

async function processJavaScript() {
  // Find all JS files in the tsc output directory
  const { readdirSync, statSync } = await import('fs');

  function findJsFiles(dir) {
    const files = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findJsFiles(fullPath));
      } else if (entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const input = findJsFiles(INPUT_DIR);
  if (input.length === 0) {
    console.log('No JavaScript files found in', INPUT_DIR);
    return;
  }

  console.log(`Processing ${input.length} JavaScript files...`);

  const MagicString = (await import('magic-string')).default;

  const loadSource = {
    name: 'load source',
    load(id) {
      const code = readFileSync(id, 'utf-8');
      const ast = this.parse(code);
      return { code, ast, map: null };
    },
  };

  const fixDecorate = {
    name: 'fix __decorate',
    transform(code, file) {
      const ms = new MagicString(code);
      ms.replace('__decorate = (this && this.__decorate) || function', '__decorate=function');
      return { code: ms.toString(), map: ms.generateMap({ file, includeContent: true, hires: true }) };
    },
  };

  const skipEmptyModules = {
    name: 'skip empty modules',
    generateBundle(options, bundle) {
      for (const [fileName, outputAsset] of Object.entries(bundle)) {
        const ast = this.parse(outputAsset.code);
        if (ast?.type === 'Program' && ast?.body.length === 0) {
          delete bundle[fileName];
        }
      }
    }
  };

  const modules = await rollup({
    input,
    external: () => true,
    treeshake: false,
    makeAbsoluteExternalsRelative: false,
    plugins: [
      loadSource,
      fixDecorate,
      mapImports,
      skipEmptyModules,
      minify({
        sourceMap: false,
        target: 'es2023',
        banner,
      }),
    ],
  });

  const { output } = await modules.generate({
    format: 'es',
    compact: true,
    entryFileNames: (chunk) => {
      return relative(INPUT_DIR, chunk.facadeModuleId);
    },
    sourcemap: false,
  });

  for (const file of output) {
    const outputPath = resolve(OUTPUT_DIR, file.fileName);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, file.code);
    console.log(`  ${file.fileName}`);
  }

  console.log(`Done. ${output.length} files written to Resources/Public/JavaScript/content-blocks-gui/`);
}

processJavaScript().catch((e) => {
  console.error(e);
  process.exit(1);
});
