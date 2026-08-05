import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const dist = join(root, 'dist')
const host = '127.0.0.1'
const port = Number(process.env.NZBDESK_PORT || 5173)
const sabUrl = (process.env.SABNZBD_URL || 'http://127.0.0.1:8085').replace(/\/$/, '')

async function loadApiKey() {
  if (process.env.SABNZBD_API_KEY) return process.env.SABNZBD_API_KEY.trim()
  const raw = (await readFile(join(root, 'env.txt'), 'utf8')).trim()
  return raw.includes('=') ? raw.split('=', 2)[1].trim() : raw
}

const apiKey = await loadApiKey()
if (!apiKey) throw new Error('SABnzbd API key is missing from env.txt')

async function sab(params) {
  const url = new URL('/api', sabUrl)
  url.search = new URLSearchParams({ ...params, output: 'json', apikey: apiKey }).toString()
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error(`SABnzbd returned HTTP ${response.status}`)
  const data = await response.json()
  if (data?.error) throw new Error(data.error)
  return data
}

function normalizeStatus(value = 'Queued') {
  const text = String(value).toLowerCase()
  if (text.includes('pause')) return 'Paused'
  if (text.includes('verify') || text.includes('repair')) return 'Verifying'
  if (text.includes('unpack') || text.includes('extract')) return 'Unpacking'
  if (text.includes('download')) return 'Downloading'
  return value || 'Queued'
}

function formatSpeed(kilobytesPerSecond) {
  const value = Number.parseFloat(kilobytesPerSecond) || 0
  if (value >= 1024) return `${(value / 1024).toFixed(1)} MB/s`
  if (value > 0) return `${value.toFixed(0)} KB/s`
  return '0 B/s'
}

function jobFromSlot(slot, queueSpeed) {
  return {
    id: slot.nzo_id,
    name: slot.filename,
    category: slot.cat || 'Default',
    age: slot.avg_age || '—',
    size: slot.size || `${slot.mb || 0} MB`,
    progress: Number.parseFloat(slot.percentage) || 0,
    eta: slot.timeleft || '—',
    speed: normalizeStatus(slot.status) === 'Downloading' ? queueSpeed : '—',
    status: normalizeStatus(slot.status),
  }
}

function historyFromSlot(slot) {
  return {
    id: slot.nzo_id,
    name: slot.name || slot.nzb_name,
    status: slot.status,
    completed: slot.completed ? new Date(Number(slot.completed) * 1000).toISOString() : null,
    size: slot.size || (slot.bytes ? `${(Number(slot.bytes) / 1024 / 1024).toFixed(0)} MB` : '—'),
    category: slot.category || 'Default',
  }
}

async function overview() {
  const [queueData, historyData] = await Promise.all([
    sab({ mode: 'queue', start: '0', limit: '50' }),
    sab({ mode: 'history', start: '0', limit: '3' }),
  ])
  const queue = queueData.queue
  const speed = formatSpeed(queue.kbpersec)
  return {
    connected: true,
    version: queue.version,
    paused: Boolean(queue.paused),
    speed,
    timeLeft: queue.timeleft || '0:00:00',
    remaining: queue.sizeleft || '0 B',
    totalCount: Number(queue.noofslots_total ?? queue.noofslots ?? queue.slots?.length ?? 0),
    jobs: (queue.slots || []).map(slot => jobFromSlot(slot, speed)),
    recent: (historyData.history?.slots || []).map(historyFromSlot),
  }
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(data))
}

async function apiRoute(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/sab/overview') return json(res, 200, await overview())
  if (req.method === 'GET' && pathname === '/api/sab/categories') {
    const data = await sab({ mode: 'get_cats' })
    return json(res, 200, { categories: data.categories || ['*'] })
  }
  if (req.method === 'POST' && pathname === '/api/sab/action') {
    const { action, id } = await readJson(req)
    const actions = {
      pauseAll: { mode: 'pause' },
      resumeAll: { mode: 'resume' },
      pauseJob: { mode: 'queue', name: 'pause', value: id },
      resumeJob: { mode: 'queue', name: 'resume', value: id },
    }
    if (!actions[action] || ((action === 'pauseJob' || action === 'resumeJob') && !id)) return json(res, 400, { error: 'Invalid action' })
    await sab(actions[action])
    return json(res, 200, { ok: true, overview: await overview() })
  }
  if (req.method === 'POST' && pathname === '/api/sab/add-url') {
    const { url, category = '*' } = await readJson(req)
    if (!/^https?:\/\//i.test(url || '')) return json(res, 400, { error: 'Enter a valid HTTP or HTTPS NZB URL.' })
    const result = await sab({ mode: 'addurl', name: url, cat: category })
    return json(res, 200, { ok: Boolean(result.status), ids: result.nzo_ids || [] })
  }
  return json(res, 404, { error: 'Not found' })
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' }

async function serveStatic(res, pathname) {
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1)
  const safe = normalize(requested).replace(/^(\.\.[/\\])+/, '')
  let file = join(dist, safe)
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    file = join(dist, 'index.html')
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': mime['.html'] })
    res.end(body)
  }
}

createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${host}:${port}`).pathname
  try {
    if (pathname.startsWith('/api/')) await apiRoute(req, res, pathname)
    else await serveStatic(res, pathname)
  } catch (error) {
    json(res, 502, { error: error instanceof Error ? error.message : 'SABnzbd connection failed' })
  }
}).listen(port, host, () => {
  console.log(`NZBDESK ready at http://${host}:${port}`)
})
