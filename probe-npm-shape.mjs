// Probe the npm registry response shape for one package: abbreviated vs full.
const name = process.argv[2] || 'dsh-meme'

async function get(accept) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name).replace('%40', '@')}`
  const res = await fetch(url, {
    headers: { accept },
    signal: AbortSignal.timeout(20000),
  })
  const text = await res.text()
  return { res, text }
}

for (const accept of ['application/vnd.npm.install-v1+json', 'application/json']) {
  try {
    const { res, text } = await get(accept)
    let json = null
    try { json = JSON.parse(text) } catch { /* not json */ }
    console.log(JSON.stringify({
      accept,
      status: res.status,
      bytes: text.length,
      topKeys: json ? Object.keys(json).slice(0, 25) : null,
      hasTime: !!(json && json.time),
      timeCount: json && json.time ? Object.keys(json.time).length : 0,
      timeSample: json && json.time ? Object.entries(json.time).slice(0, 4) : null,
      modified: json ? json.time && json.time.modified : null,
      distTags: json && json['dist-tags'] ? json['dist-tags'] : null,
      versionCount: json && json.versions ? Object.keys(json.versions).length : null,
    }, null, 2))
  } catch (err) {
    console.log(JSON.stringify({ accept, error: String(err && err.message ? err.message : err) }, null, 2))
  }
}
