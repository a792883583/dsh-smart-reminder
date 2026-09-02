import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-schema-form',
]

const clientBanner = `window.__ModuleLoader__.load({
  id: "dsh-smart-reminder",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
`
const clientFooter = `    return module.exports;
  }
});`

mkdirSync(dirname(`${root}/lib/client.js`), { recursive: true })

await Promise.all([
  build({
    entryPoints: [`${root}/src/index.ts`],
    outfile: `${root}/lib/index.js`,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    external: [
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-host-webserver',
      '@deepseek-ai/dsh-tools',
      '@deepseek-ai/schemastery',
    ],
    sourcemap: true,
    logLevel: 'warning',
  }),

  build({
    entryPoints: [`${root}/src/client/index.ts`],
    outfile: `${root}/lib/client.js`,
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    external: PLATFORM_MODULES,
    banner: { js: clientBanner },
    footer: { js: clientFooter },
    sourcemap: true,
    logLevel: 'warning',
  }),
])

console.log('✅ build done: lib/index.js + lib/client.js')