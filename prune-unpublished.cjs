// Drop plugin versions that have no npm dist-time (package unpublished or
// version never released), so every listed version is installable. Rebuilds
// `versions[]` from the publish-time map, keeping the newest release and
// never leaving an empty array (those plugins are dropped entirely).
const fs = require('node:fs')
const path = require('node:path')

const DIR = __dirname
const INDEX = process.argv[2] || process.env.INDEX || path.join(DIR, 'index.json')
const CACHE = process.argv[3] || process.env.TIMES_CACHE || path.join(DIR, 'times-cache.json')

const doc = JSON.parse(fs.readFileSync(INDEX, 'utf8'))
const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'))

const kept = []
const dropped = []
let droppedVersions = 0

for (const plugin of doc.plugins) {
  const map = cache[plugin.name]
  const live = map && typeof map === 'object' && !map.error ? map : {}
  const versions = []
  for (const version of plugin.versions) {
    const ts = live[version.version]
    if (!Number.isFinite(ts)) { droppedVersions++; continue }
    versions.push({ ...version, publishTimestamp: ts })
  }
  if (!versions.length) { dropped.push(plugin.name); continue }
  // Newest first; the parser requires descending SemVer order.
  versions.sort((a, b) => (a.version === b.version ? 0 : (a.version < b.version ? 1 : -1)))
  plugin.versions = versions
  kept.push(plugin)
}

doc.plugins = kept
fs.writeFileSync(INDEX, JSON.stringify(doc))
console.log(JSON.stringify({ kept: kept.length, droppedPlugins: dropped.length, droppedVersions, sampleDropped: dropped.slice(0, 10) }, null, 2))
