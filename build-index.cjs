// Build a format-1 plugin-market index from the awesome-dsh-plugin catalog.
// Input : D:\DSH工作空间\会话\2026-10-17 你现在是可以添加第三方插件\catalog\plugins.json
// Output: same dir, index.json
const fs = require('node:fs')
const path = require('node:path')

const DIR = __dirname
const CATALOG = process.argv[2] || process.env.CATALOG || path.join(DIR, 'catalog', 'plugins.json')
const OUT = process.argv[3] || process.env.INDEX || path.join(DIR, 'index.json')

// Mirror of dsh-plugin-market-index/lib/index.js:120 PACKAGE_NAME.
const NAME_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

const raw = JSON.parse(fs.readFileSync(CATALOG, 'utf8'))
const entries = Array.isArray(raw.plugins) ? raw.plugins : []
const declared = new Set(Object.keys(raw.categories || {}))

// resolveVersion: exact value, else semver inside a range/dist-tag string.
function pickVersion(entry) {
  const cands = []
  for (const key of ['version', 'latest', 'latestVersion', 'recommendedVersion']) {
    const v = entry[key]
    if (typeof v === 'string' && SEMVER_RE.test(v)) cands.push([key, v])
  }
  if (cands.length) return cands[0][1]

  const drift = [entry.version, entry.latest, entry.latestVersion, entry.range, entry.versionRange]
  for (const v of drift) {
    if (typeof v !== 'string') continue
    const m = v.match(/(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/)
    if (m && SEMVER_RE.test(m[1])) return m[1]
  }
  return null
}

const out = []
const stats = {
  entries: entries.length,
  skippedNoNpmName: 0,
  skippedBadNpmName: 0,
  skippedNoVersion: 0,
  included: 0,
  categories: new Set(),
}
const seenNames = new Set()

for (const e of entries) {
  if (!e || typeof e !== 'object') continue
  const npm = typeof e.npm === 'string' ? e.npm.trim() : ''
  if (!npm) { stats.skippedNoNpmName++; continue }
  if (!NAME_RE.test(npm) || npm.length > 214) { stats.skippedBadNpmName++; continue }
  if (seenNames.has(npm)) continue
  const version = pickVersion(e)
  if (!version) { stats.skippedNoVersion++; continue }
  seenNames.add(npm)

  const title = (e.name && typeof e.name === 'string' && e.name) || npm
  const plugin = {
    name: npm,
    title: { en: title, zh: title },
    versions: [{
      version,
      // npm dist-time is not in the catalog; 0 is the validator's floor and
      // keeps the entry installable. Sorting is by SemVer, not timestamp.
      publishTimestamp: 0,
      source: { type: 'npm' },
    }],
    homepage: 'https://www.npmjs.com/package/' + encodeURIComponent(npm),
  }
  if (typeof e.url === 'string' && /^https:\/\//.test(e.url)) plugin.homepage = e.url

  const shots = Array.isArray(e.screenshots) ? e.screenshots : []
  const icon = shots.find((s) => typeof s === 'string' && /^https:\/\/[^\s?#]+$/.test(s))
  if (icon) plugin.icon = icon

  // pluginMetadata() keeps only category/keywords/labels/sortKeys; `icon` and
  // `description` are top-level plugin members in format 1.
  if (typeof e.desc === 'string' && e.desc) plugin.description = { en: e.desc, zh: e.desc }
  if (typeof e.category === 'string' && declared.has(e.category)) {
    plugin.metadata = { ...(plugin.metadata || {}), category: e.category }
  }

  out.push(plugin)
  stats.included++
  if (plugin.metadata) stats.categories.add(plugin.metadata.category)
}

stats.categories = [...stats.categories].sort()

const doc = {
  format: 1,
  title: { en: 'Awesome DSH Plugins (community catalog)', zh: 'Awesome DSH 插件社区目录' },
  description: {
    en: 'Community catalog of DSH plugins, converted from awesome-dsh-plugin.',
    zh: '由 awesome-dsh-plugin 社区目录转换而来的 DSH 插件索引。',
  },
  metadata: {
    categories: Object.fromEntries(
      Object.entries(raw.categories || {}).map(([id, v]) => [
        id,
        { title: { en: (v && v.en) || id, zh: (v && v.zh) || (v && v.en) || id } },
      ]),
    ),
    labels: {},
    sortKeys: {},
  },
  plugins: out,
}

fs.writeFileSync(OUT, JSON.stringify(doc))
console.log(JSON.stringify(stats, null, 2))
console.log('wrote', OUT, fs.statSync(OUT).size, 'bytes')
