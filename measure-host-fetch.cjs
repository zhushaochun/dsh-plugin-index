// Measure the exact fetch path the Host uses: accept: application/json,
// redirect: "error", then read the whole body. Also reports what undici
// negotiates for compression, since `readBody` counts decoded bytes.
const url = process.argv[2]
const limit = process.argv[3] ? Number(process.argv[3]) : 15000

;(async () => {
  const started = Date.now()
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(limit),
      redirect: 'error',
      headers: { accept: 'application/json' },
    })
    const encoding = response.headers.get('content-encoding')
    const declared = response.headers.get('content-length')
    let size = 0
    for await (const chunk of response.body ?? []) size += chunk.byteLength
    console.log(`status=${response.status} content-encoding=${encoding} content-length=${declared} decodedBytes=${size} elapsed=${Date.now() - started}ms`)
  } catch (error) {
    console.log(`FAILED after ${Date.now() - started}ms :: ${error.cause?.code || error.cause?.message || error.message}`)
  }
})()
