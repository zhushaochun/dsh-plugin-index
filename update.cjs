// Daily rebuild of index.json: fetch the latest catalog from npm, re-run the
// pipeline, validate with the official parser, and write index.json in place.
//
// Usage: node update.cjs
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execFileSync, spawnSync } = require('node:child_process')

const DIR = __dirname
const INDEX = path.join(DIR, 'index.json')

// Every child script resolves its own paths from __dirname or CATALOG_SRC, and
// only npm (a .cmd on Windows) needs a shell — a shell mangles any argument
// containing the spaces in this workspace path.
function step(label, script) {
  process.stdout.write(`>> ${label}\n`)
  const res = spawnSync(process.execPath, [script], { stdio: 'inherit', cwd: DIR, shell: false })
  if (res.status !== 0) throw new Error(`${script} exited with ${String(res.status)}`)
}
function npm(args) {
  const res = spawnSync('npm.cmd', args, { stdio: 'inherit', cwd: DIR, shell: true })
  if (res.status !== 0) throw new Error(`npm ${args.join(' ')} exited with ${String(res.status)}`)
}

npm(['pack', 'dsh-plugin-catalog@latest', '--silent'])

// `npm pack` names the file <name>-<version>.tgz, so find it instead of guessing.
const TARBALL = fs.readdirSync(DIR).filter((f) => /^dsh-plugin-catalog-.*\.tgz$/.test(f)).sort().pop()
if (!TARBALL) throw new Error('no catalog tarball was produced by npm pack')

// Windows `tar.exe` (a System32 shim) cannot open a file relative to a non-ASCII
// working directory, and the workspace path contains Chinese characters. Extract
// into an ASCII temp dir, then hand the path to the copy step through the
// environment instead of an argument.
process.stdout.write('>> unpack catalogue\n')
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'dshcat-refresh-'))
fs.copyFileSync(path.join(DIR, TARBALL), path.join(stage, 'catalog.tgz'))
const untar = spawnSync('tar', ['-xzf', 'catalog.tgz'], { stdio: 'inherit', cwd: stage, shell: false })
if (untar.status !== 0) throw new Error('tar exited with ' + String(untar.status))

process.env.CATALOG_SRC = path.join(stage, 'package', 'plugins.json')
process.env.CATALOG = path.join(DIR, 'catalog', 'plugins.json')
process.env.INDEX = INDEX
process.env.TIMES_CACHE = path.join(DIR, 'times-cache.json')

step('keep plugins.json', 'copy-json.cjs')
step('build index', 'build-index.cjs')
step('fill publish timestamps', 'fetch-times.cjs')
step('apply top-level descriptions', 'fix-descriptions.cjs')
step('drop unpublished versions', 'prune-unpublished.cjs')
step('sort plugins by name', 'sort-plugins.cjs')

// Validate with the OFFICIAL parser, not our mirror of its rules. In CI it is
// installed as a devDependency; locally it is resolved out of the DSH install.
if (!fs.existsSync(path.join(DIR, 'node_modules', '@deepseek-ai', 'dsh-plugin-market-index'))) {
  process.env.VALIDATOR = 'D:\\APP\\DSH-Web\\runtime-npm\\node_modules\\@deepseek-ai\\dsh-plugin-market-index\\lib\\index.js'
}
step('validate with official parser', 'validate.cjs')

const doc = JSON.parse(fs.readFileSync(INDEX, 'utf8'))
console.log(`ok: format=${doc.format} plugins=${doc.plugins.length} bytes=${fs.statSync(INDEX).size}`)
