import { readFileSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';
import typescript from '@rollup/plugin-typescript';

const pkg = JSON.parse(readFileSync(join(cwd(), 'package.json'), 'utf8'));

const entryExport = pkg.exports['.'] ?? pkg.exports;

export default {
  input: 'guest-js/index.ts',
  output: [
    {
      file: entryExport.import,
      format: 'esm',
    },
    {
      file: entryExport.require,
      format: 'cjs',
    },
  ],
  plugins: [
    typescript({
      declaration: true,
      declarationDir: `./${entryExport.import.split('/')[0]}`,
    }),
  ],
  external: [
    /^@tauri-apps\/api/,
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
};
