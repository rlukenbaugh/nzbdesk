import { useMemo, useState } from 'react'
import {
  Activity, BookOpen, Bot, Boxes, ChevronDown, ChevronRight, CirclePause,
  CirclePlay, Cloud, Download, Filter, Gauge, History, LayoutGrid, List,
  Menu, MoreVertical, Pause, Play, Plus, Radio, RefreshCw, Search, Server,
  Settings, SlidersHorizontal, Trash2, X,
} from 'lucide-react'

const initialJobs = [
  { id: 1, name: 'Linux.Distribution.2026.08.ISO', category: 'Software', age: '2h', size: '4.8 GB', progress: 82, eta: '11m', speed: '3.1 MB/s', status: 'Downloading' },
  { id: 2, name: 'Nature.Documentary.S01E04.1080p', category: 'TV', age: '5h', size: '3.2 GB', progress: 46, eta: '24m', speed: '0.7 MB/s', status: 'Downloading' },
  { id: 3, name: 'Jazz.Classics.Collection.FLAC', category: 'Audio', age: '1d', size: '8.6 GB', progress: 100, eta: '—', speed: '—', status: 'Verifying' },
  { id: 4, name: 'Open.Source.Archive.Vol.12', category: 'Books', age: '3h', size: '1.1 GB', progress: 18, eta: 'Paused', speed: '—', status: 'Paused' },
  { id: 5, name: 'Travel.Guide.Caribbean.2026', category: 'Books', age: '6h', size: '640 MB', progress: 100, eta: '—', speed: '—', status: 'Unpacking' },
  { id: 6, name: 'Photography.Masterclass.Part.3', category: 'Video', age: '8h', size: '2.4 GB', progress: 0, eta: '—', speed: '—', status: 'Queued' },
]

const nav = [
  [Gauge, 'Dashboard'], [Search, 'Search'], [List, 'Queue', 6], [History, 'History'],
  [Radio, 'RSS'], [Server, 'Indexers'], [Cloud, 'Providers'], [Boxes, 'Categories'],
  [Bot, 'Automation'], [Settings, 'Settings'], [Activity, 'System', 1],
]

const recent = [
  ['Science.Fiction.Megapack.2026', '2 min ago', '12.4 GB', 'Video'],
  ['Magazine.Collection.2026.Week.20', '15 min ago', '1.8 GB', 'Books'],
  ['Linux.Kernel.Documentation.6.9', '32 min ago', '512 MB', 'Books'],
]

function IconButton({ icon: Icon, label, onClick, active = false }) {
  return <button className={`tool-button ${active ? 'active' : ''}`} onClick={onClick}><Icon size={22} strokeWidth={1.9} /><span>{label}</span></button>
}

function Sidebar({ open, close }) {
  return <aside className={`sidebar ${open ? 'open' : ''}`}>
    <div className="brand">NZB<span>DESK</span></div>
    <nav aria-label="Primary">
      {nav.map(([Icon, label, count]) => (
        <button key={label} className={`nav-item ${label === 'Dashboard' ? 'selected' : ''}`} onClick={close}>
          <Icon size={21} /><span>{label}</span>{count && <b>{count}</b>}
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
    {expanded && <tr className="detail-row"><td colSpan="9"><div><b>Destination</b><span>D:\\Usenet\\{job.category}</span></div><div><b>Provider</b><span>Primary</span></div><div><b>Article health</b><span>100%</span></div><button>View job log</button></td></tr>}
  </>
}

function ConnectionPanel() {
  return <aside className="connection-panel">
    <h2>Connection</h2>
    <section><small>Provider</small><strong>Primary</strong><span className="healthy"><i />Healthy</span></section>
    <section><small>Connections</small><strong>38 <em>/ 50</em></strong><div className="meter"><i /></div></section>
    <section><small>Retention</small><strong>5,400 days</strong></section>
    <section className="live"><div><small>Live activity</small><b>3.8 MB/s</b></div><svg viewBox="0 0 260 90" role="img" aria-label="Live download speed"><path d="M0 61 C15 30 27 72 40 43 S64 67 80 38 S107 61 121 52 S143 18 159 43 S183 71 199 40 S224 54 260 31" /></svg><div className="axis"><span>-60s</span><span>-30s</span><span>Now</span></div></section>
    <button className="wide-button">View details <ChevronRight size={16} /></button>
  </aside>
}

function AddModal({ close, add }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('TV')
  return <div className="modal-backdrop" onMouseDown={close}><form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); if (name.trim()) add(name.trim(), category) }}>
    <div className="modal-title"><div><h2>Add NZB</h2><p>Add a job to the local queue.</p></div><button type="button" onClick={close} aria-label="Close"><X /></button></div>
    <label>NZB name<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Example.Release.Name" /></label>
    <label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option>TV</option><option>Video</option><option>Audio</option><option>Books</option><option>Software</option></select></label>
    <div className="modal-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" type="submit"><Plus size={17} />Add to queue</button></div>
  </form></div>
}

export default function App() {
  const [jobs, setJobs] = useState(initialJobs)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [modal, setModal] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const filtered = useMemo(() => jobs.filter(j => j.name.toLowerCase().includes(query.toLowerCase()) && (statusFilter === 'All' || j.status === statusFilter)), [jobs, query, statusFilter])
  const toggleJob = id => setJobs(v => v.map(j => j.id === id ? { ...j, status: j.status === 'Paused' ? 'Downloading' : 'Paused', speed: j.status === 'Paused' ? '1.2 MB/s' : '—', eta: j.status === 'Paused' ? '18m' : 'Paused' } : j))
  const setAll = paused => setJobs(v => v.map(j => ['Verifying', 'Unpacking'].includes(j.status) ? j : { ...j, status: paused ? 'Paused' : 'Downloading', speed: paused ? '—' : '1.2 MB/s', eta: paused ? 'Paused' : '18m' }))
  const addJob = (name, category) => { setJobs(v => [...v, { id: Date.now(), name, category, age: 'Now', size: '—', progress: 0, eta: '—', speed: '—', status: 'Queued' }]); setModal(false) }

  return <div className="app-shell">
    <Sidebar open={mobileNav} close={() => setMobileNav(false)} />
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main>
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu /></button><div className="search"><Search size={20} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Usenet" aria-label="Search Usenet" /></div><div className="top-icons"><BookOpen /><SlidersHorizontal /></div></header>
      <section className="toolbar"><div><IconButton icon={Plus} label="Add NZB" onClick={() => setModal(true)} /><IconButton icon={RefreshCw} label="Refresh" /><IconButton icon={CirclePause} label="Pause All" onClick={() => setAll(true)} /><IconButton icon={CirclePlay} label="Resume All" onClick={() => setAll(false)} /><IconButton icon={Trash2} label="Clear Finished" onClick={() => setJobs(v => v.filter(j => j.progress < 100))} /></div><div><IconButton icon={LayoutGrid} label="Layout" /><IconButton icon={List} label="Sort" /><IconButton icon={Filter} label="Filter" active={statusFilter !== 'All'} onClick={() => setStatusFilter(v => v === 'All' ? 'Downloading' : v === 'Downloading' ? 'Paused' : 'All')} /></div></section>
      <div className="content">
        <div className="heading"><h1>Download Queue</h1><p>{filtered.length} active · 3.8 MB/s · 42 min remaining</p></div>
        <div className="dashboard-grid">
          <section className="queue-card"><div className="mobile-list">
            {filtered.map(job => <article key={job.id}><div><strong>{job.name}</strong><span>{job.category} · {job.size} · {job.age}</span></div><Progress value={job.progress} status={job.status} /><footer><span className={`status ${job.status.toLowerCase()}`}>{job.status}</span><button onClick={() => toggleJob(job.id)}>{job.status === 'Paused' ? <Play /> : <Pause />}</button></footer></article>)}
          </div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Category</th><th>Age</th><th>Size</th><th>Progress</th><th>ETA</th><th>Speed</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(job => <JobRow key={job.id} job={job} expanded={expanded === job.id} onExpand={() => setExpanded(expanded === job.id ? null : job.id)} onToggle={() => toggleJob(job.id)} />)}</tbody></table></div><div className="table-footer">Showing {filtered.length} of {jobs.length} entries <span>1</span></div></section>
          <ConnectionPanel />
        </div>
        <section className="recent"><h2>Recent activity</h2><div className="recent-head"><span>Name</span><span>Status</span><span>Completed</span><span>Size</span><span>Category</span><span>Provider</span></div>{recent.map(item => <div className="recent-row" key={item[0]}><strong>{item[0]}</strong><span className="complete">✓ Completed</span><span>{item[1]}</span><span>{item[2]}</span><span>{item[3]}</span><span>Primary <MoreVertical size={16} /></span></div>)}</section>
      </div>
    </main>
    {modal && <AddModal close={() => setModal(false)} add={addJob} />}
  </div>
}
