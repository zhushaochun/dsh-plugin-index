// Probe candidate unauthenticated hosts for serving a JSON index document.
const targets = [
  ['GET', 'https://cdn.jsdelivr.net/gh/dsh-market/dsh-market@main/package.json'],
  ['GET', 'https://raw.githack.com/dsh-market/dsh-market/main/package.json'],
  ['GET', 'https://dshmarket.com/index.json'],
  ['GET', 'https://awesome-dsh-plugin.com/plugins.json'],
  ['GET', 'https://registry.npmjs.org/dsh-plugin-catalog'],
]
const pastes = [
  ['POST', 'https://paste.rs/'],
  ['POST', 'https://0x0.st/'],
  ['POST', 'https://api.github.com/gists'],
]

async function timed(method, url, body) {
  const started = Date.now()
  try {
    const res = await fetch(url, {
      method,
      body,
      signal: AbortSignal.timeout(15000),
      redirect: 'manual',
      headers: body ? { 'content-type': 'text/plain' } : { accept: '*/*' },
    })
    const text = await res.text()
    return { url, ms: Date.now() - started, status: res.status, type: res.headers.get('content-type'), body: text.slice(0, 120) }
  } catch (err) {
    return { url, ms: Date.now() - started, error: String(err && err.message ? err.message : err) }
  }
}

async function main() {
  for (const [m, u] of targets) console.log(JSON.stringify(await timed(m, u), null, 0))
  for (const [m, u] of pastes) console.log(JSON.stringify(await timed(m, u, '{"probe":true}'), null, 0))
}
main()
