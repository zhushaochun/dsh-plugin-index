// Commit the rebuilt index to the repo that GitHub Pages publishes.
//
// Usage: node publish.cjs
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const DIR = __dirname

function git(...args) {
  const res = spawnSync('git', args, { cwd: DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return { status: res.status, out: (res.stdout || '') + (res.stderr || '') }
}

// Refuse to clobber manual edits of index.json or times-cache.json.
const dirty = git('status', '--porcelain')
  .out.trim().split('\n').filter((line) => line && !line.startsWith('?? '))
if (dirty.length) {
  console.error('tracked changes present; commit or stash them first:\n' + dirty.join('\n'))
  process.exit(1)
}

const stamp = new Date().toISOString().slice(0, 10)
const add = git('add', 'index.json', 'times-cache.json')
if (add.status) throw new Error(add.out)

const commit = git(
  '-c', 'user.name=dsh-plugin-index-bot',
  '-c', 'user.email=dsh-plugin-index-bot@users.noreply.github.com',
  'commit', '-m', `daily index refresh ${stamp}`,
  '--allow-empty',
)
if (commit.status) throw new Error(commit.out)

const push = git('push', 'origin', 'HEAD')
if (push.status) throw new Error(push.out)

console.log(push.out.trim().split('\n').pop())
console.log('Pages rebuilds within seconds; verify with:')
console.log('  node probe-index.cjs https://zhushaochun.github.io/dsh-plugin-index/index.json')
