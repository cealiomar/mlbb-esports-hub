import { build } from 'esbuild'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const sha = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()

/**
 * current-patch-meta.ts and hero-images.ts import JSON snapshots at module
 * load. The app downloads fresher data, so those imports become reads of
 * globalThis.__COACH_DATA__, which the host sets before evaluating Engine.js.
 */
const dataGlobals = {
  name: 'coach-data-globals',
  setup(build) {
    build.onResolve({ filter: /data\/snapshots\/(patch-meta|hero-catalog)\.json$/ }, (args) => ({
      path: args.path.endsWith('patch-meta.json') ? 'patchMeta' : 'heroCatalog',
      namespace: 'coach-data',
    }))
    build.onLoad({ filter: /.*/, namespace: 'coach-data' }, (args) => ({
      loader: 'js',
      contents: `const data = globalThis.__COACH_DATA__ && globalThis.__COACH_DATA__.${args.path};
if (!data) throw new Error('globalThis.__COACH_DATA__.${args.path} must be set before Engine.js is evaluated');
export default data;`,
    }))
  },
}

await build({
  entryPoints: [path.join(here, 'entry.ts')],
  bundle: true,
  format: 'iife',
  platform: 'neutral',
  target: ['safari17'],
  minify: true,
  sourcemap: false,
  outfile: path.join(here, 'dist/Engine.js'),
  tsconfig: path.join(root, 'tsconfig.json'),
  plugins: [dataGlobals],
  define: { __ENGINE_VERSION__: JSON.stringify(sha) },
  logLevel: 'info',
})
