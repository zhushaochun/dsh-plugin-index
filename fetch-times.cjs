// Fill publishTimestamp for every plugin version in index.json from the npm
// registry full-document `time` map (one request per package, resumable cache).
//
// Usage: node fetch-times.mjs [index.json] [out.json] [cache.json]
const fs = require('node:fs')
const path = require('node:path')

const DIR = __dirname
const INDEX = process.argv[2] || path.join(DIR, 'index.json')
const OUT = process.argv[3] || INDEX
const CACHE = process.argv[4] || path.join(DIR, 'times-cache.json')
const CONCURRENCY = Number(process.env.CONCURRENCY || 12)
const RETRIES = 4

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE, 'utf8')) } catch { return {} }
}
function saveCache(cache) {
  fs.writeFileSync(CACHE, JSON.stringify(cache))
}

async function fetchWithRetry(url, attempts = RETRIES) {
  let lastErr = null
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(30000),
      })
      if (res.status === 404) return { notFound: true }
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error('HTTP ' + res.status)
        const wait = 500 * (i + 1) ** 2
        await sleep(wait)
        continue
      }
      if (!res.ok) return { notFound: true, status: res.status }
      return { json: await res.json() }
    } catch (err) {
      lastErr = err
      await sleep(500 * (i + 1) ** 2)
    }
  }
  return { error: String(lastErr && lastErr.message ? lastErr.message : lastErr) }
}

async function main() {
  const doc = JSON.parse(fs.readFileSync(INDEX, 'utf8'))
  const names = [...new Set(doc.plugins.map((p) => p.name))]
  const cache = loadCache()

  const todo = names.filter((n) => !(n in cache))
  console.log('packages:', names.length, 'cached:', names.length - todo.length, 'to fetch:', todo.length)

  let done = 0
  let failed = 0
  let cursor = 0

  async function worker() {
    while (cursor < todo.length) {
      const name = todo[cursor++]
      const url = `https://registry.npmjs.org/${name.replace('/', '%2F')}`
      const res = await fetchWithRetry(url)
      if (res.json) {
        const time = res.json.time || {}
        // Only keep the version timestamps; drop created/modified noise.
        const map = {}
        for (const [k, v] of Object.entries(time)) {
          if (k === 'created' || k === 'modified') continue
          const t = Date.parse(v)
          if (Number.isFinite(t)) map[k] = Math.floor(t / 1000)
        }
        cache[name] = map
      } else if (res.notFound) {
        cache[name] = null // package not published (or 404 once and forever)
      } else {
        cache[name] = { error: res.error || 'notFound' }
        failed++
      }
      done++
      if (done % 50 === 0 || cursor >= todo.length) {
        saveCache(cache)
        console.log(`  ${done}/${todo.length} done, failed=${failed}`)
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  saveCache(cache)

  // Apply timestamps.
  let filled = 0
  let missing = 0
  const missingNames = []
  for (const plugin of doc.plugins) {
    for (const version of plugin.versions) {
      const map = cache[plugin.name]
      const ts = map && typeof map === 'object' ? map[version.version] : undefined
      if (Number.isFinite(ts)) {
        version.publishTimestamp = ts
        filled++
      } else {
        missing++
        if (missingNames.length < 20) missingNames.push(`${plugin.name}@${version.version}`)
      }
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(doc))
  console.log(JSON.stringify({ filled, missing, missingSamples: missingNames, out: OUT, bytes: fs.statSync(OUT).size }, null, 2))
}

main()
