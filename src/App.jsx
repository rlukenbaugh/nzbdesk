import { useMemo, useState } from 'react'
import {
  Activity, BookOpen, Bot, Boxes, ChevronDown, ChevronRight, CirclePause,
  CirclePlay, Cloud, Download, Filter, Gauge, History, LayoutGrid, List,
  Menu, MoreVertical, Pause, Play, Plus, Radio, RefreshCw, Search, Server,
  Settings, SlidersHorizontal, X,
} from 'lucide-react'
import useSabnzbd from './useSabnzbd.js'

const nav = [
  [Gauge, 'Dashboard'], [Search, 'Search'], [List, 'Queue', 6], [History, 'History'],
  [Radio, 'RSS'], [Server, 'Indexers'], [Cloud, 'Providers'], [Boxes, 'Categories'],
  [Bot, 'Automation'], [Settings, 'Settings'], [Activity, 'System', 1],
]

function IconButton({ icon: Icon, label, onClick, active = false }) {
  return <button className={`tool-button ${active ? 'active' : ''}`} onClick={onClick}><Icon size={22} strokeWidth={1.9} /><span>{label}</span></button>
}

function Sidebar({ open, close, queueCount }) {
  return <aside className={`sidebar ${open ? 'open' : ''}`}>
    <div className="brand">NZB<span>DESK</span></div>
    <nav aria-label="Primary">
      {nav.map(([Icon, label, count]) => (
        <button key={label} className={`nav-item ${label === 'Dashboard' ? 'selected' : ''}`} onClick={close}>
          <Icon size={21} /><span>{label}</span>{(label === 'Queue' ? queueCount : count) > 0 && <b>{label === 'Queue' ? queueCount : count}</b>}
        </button>
      ))}
    </nav>
    <button className="collapse" onClick={close}><ChevronRight size={18} /><span>Collapse</span></button>
  </aside>
}

function Progress({ value, status }) {
  return <div className={`progress ${status.toLowerCase()}`} aria-label={`${value}% ${status}`}>
    <span style={{ width: `${Math.max(value, status === 'Queued' ? 100 : value)}%` }}>{status === 'Queued' ? 'Queued' : ''}</span>
  </div>
}

function JobRow({ job, expanded, onExpand, onToggle }) {
  const paused = job.status === 'Paused'
  return <>
    <tr>
      <td className="job-name"><button className="disclosure" onClick={onExpand} aria-label={`Details for ${job.name}`}>{expanded ? <ChevronDown /> : <ChevronRight />}</button><span>{job.name}</span></td>
      <td>{job.category}</td><td>{job.age}</td><td>{job.size}</td>
      <td className="progress-cell"><Progress value={job.progress} status={job.status} /><span>{job.progress ? `${job.progress}%` : ''}</span></td>
      <td>{job.eta}</td><td>{job.speed}</td>
      <td><span className={`status ${job.status.toLowerCase()}`}>{job.status}</span></td>
      <td className="actions"><button onClick={onToggle} aria-label={paused ? 'Resume job' : 'Pause job'}>{paused ? <Play /> : <Pause />}</button><button aria-label="More actions"><ChevronDown /></button></td>
    </tr>
    {expanded && <tr className="detail-row"><td colSpan="9"><div><b>Job ID</b><span>{job.id}</span></div><div><b>Category</b><span>{job.category}</span></div><div><b>Current state</b><span>{job.status}</span></div><div><b>Size</b><span>{job.size}</span></div></td></tr>}
  </>
}

function ConnectionPanel({ overview }) {
  return <aside className="connection-panel">
    <h2>Connection</h2>
    <section><small>Downloader</small><strong>SABnzbd {overview.version}</strong><span className="healthy"><i />Connected</span></section>
    <section><small>Queue</small><strong>{overview.totalCount} <em>jobs</em></strong><div className="meter"><i style={{ width: overview.paused ? '25%' : '100%' }} /></div></section>
    <section><small>Remaining</small><strong>{overview.remaining}</strong></section>
    <section className="live"><div><small>Live speed</small><b>{overview.speed}</b></div><svg viewBox="0 0 260 90" role="img" aria-label="Live download activity"><path d="M0 61 C15 30 27 72 40 43 S64 67 80 38 S107 61 121 52 S143 18 159 43 S183 71 199 40 S224 54 260 31" /></svg><div className="axis"><span>Time left</span><span>{overview.timeLeft}</span></div></section>
    <a className="wide-button" href="http://127.0.0.1:8085" target="_blank" rel="noreferrer">Open SABnzbd <ChevronRight size={16} /></a>
  </aside>
}

function AddModal({ close, add, categories }) {
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('*')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const submit = async event => {
    event.preventDefault()
    if (!url.trim()) return
    setSubmitting(true)
    setFormError('')
    try { await add(url.trim(), category) } catch (error) { setFormError(error instanceof Error ? error.message : 'Could not add NZB'); setSubmitting(false) }
  }
  return <div className="modal-backdrop" onMouseDown={close}><form className="modal" onMouseDown={event => event.stopPropagation()} onSubmit={submit}>
    <div className="modal-title"><div><h2>Add NZB URL</h2><p>Send an NZB link directly to SABnzbd.</p></div><button type="button" onClick={close} aria-label="Close"><X /></button></div>
    <label>NZB URL<input type="url" autoFocus value={url} onChange={event => setUrl(event.target.value)} placeholder="https://indexer.example/get/…" required /></label>
    <label>Category<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item} value={item}>{item === '*' ? 'Default' : item}</option>)}</select></label>
    {formError && <p className="form-error" role="alert">{formError}</p>}
    <div className="modal-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" type="submit" disabled={submitting}><Plus size={17} />{submitting ? 'Adding…' : 'Add to queue'}</button></div>
  </form></div>
}

function completedLabel(value) {
  if (!value) return 'Recently'
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `${hours} hr ago` : `${Math.round(hours / 24)} d ago`
}

export default function App() {
  const { data, categories, loading, error, refresh, action, addUrl } = useSabnzbd()
  const jobs = data.jobs
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [modal, setModal] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const filtered = useMemo(() => jobs.filter(j => j.name.toLowerCase().includes(query.toLowerCase()) && (statusFilter === 'All' || j.status === statusFilter)), [jobs, query, statusFilter])
  const toggleJob = job => action(job.status === 'Paused' ? 'resumeJob' : 'pauseJob', job.id).catch(() => {})
  const setAll = paused => action(paused ? 'pauseAll' : 'resumeAll').catch(() => {})
  const addJob = async (url, category) => { await addUrl(url, category); setModal(false) }

  return <div className="app-shell">
    <Sidebar open={mobileNav} close={() => setMobileNav(false)} queueCount={data.totalCount} />
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main>
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu /></button><div className="search"><Search size={20} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Usenet" aria-label="Search Usenet" /></div><div className="top-icons"><BookOpen /><SlidersHorizontal /></div></header>
      <section className="toolbar"><div><IconButton icon={Plus} label="Add NZB" onClick={() => setModal(true)} /><IconButton icon={RefreshCw} label={loading ? 'Loading…' : 'Refresh'} onClick={() => refresh().catch(() => {})} /><IconButton icon={CirclePause} label="Pause All" onClick={() => setAll(true)} /><IconButton icon={CirclePlay} label="Resume All" onClick={() => setAll(false)} /></div><div><IconButton icon={LayoutGrid} label="Layout" /><IconButton icon={List} label="Sort" /><IconButton icon={Filter} label="Filter" active={statusFilter !== 'All'} onClick={() => setStatusFilter(v => v === 'All' ? 'Downloading' : v === 'Downloading' ? 'Paused' : 'All')} /></div></section>
      <div className="content">
        {error && <div className="connection-error" role="alert"><strong>SABnzbd connection problem</strong><span>{error}</span><button onClick={() => refresh().catch(() => {})}>Try again</button></div>}
        <div className="heading"><h1>Download Queue</h1><p>{data.totalCount} queued · {data.speed} · {data.timeLeft} remaining</p></div>
        <div className="dashboard-grid">
          <section className="queue-card"><div className="mobile-list">
            {filtered.map(job => <article key={job.id}><div><strong>{job.name}</strong><span>{job.category} · {job.size} · {job.age}</span></div><Progress value={job.progress} status={job.status} /><footer><span className={`status ${job.status.toLowerCase()}`}>{job.status}</span><button onClick={() => toggleJob(job)}>{job.status === 'Paused' ? <Play /> : <Pause />}</button></footer></article>)}
          </div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Category</th><th>Age</th><th>Size</th><th>Progress</th><th>ETA</th><th>Speed</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(job => <JobRow key={job.id} job={job} expanded={expanded === job.id} onExpand={() => setExpanded(expanded === job.id ? null : job.id)} onToggle={() => toggleJob(job)} />)}</tbody></table></div><div className="table-footer">Showing {filtered.length} of {data.totalCount} entries <span>1</span></div></section>
          <ConnectionPanel overview={data} />
        </div>
        <section className="recent"><h2>Recent activity</h2><div className="recent-head"><span>Name</span><span>Status</span><span>Completed</span><span>Size</span><span>Category</span><span>Downloader</span></div>{data.recent.map(item => <div className="recent-row" key={item.id}><strong>{item.name}</strong><span className="complete">✓ {item.status}</span><span>{completedLabel(item.completed)}</span><span>{item.size}</span><span>{item.category}</span><span>SABnzbd <MoreVertical size={16} /></span></div>)}</section>
      </div>
    </main>
    {modal && <AddModal close={() => setModal(false)} add={addJob} categories={categories} />}
  </div>
}
