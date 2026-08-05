import { useCallback, useEffect, useState } from 'react'

const emptyOverview = {
  connected: false,
  version: '',
  paused: false,
  speed: '0 B/s',
  timeLeft: '0:00:00',
  remaining: '0 B',
  totalCount: 0,
  jobs: [],
  recent: [],
}

async function request(path, options) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
  return data
}

export default function useSabnzbd() {
  const [data, setData] = useState(emptyOverview)
  const [categories, setCategories] = useState(['*'])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const overview = await request('/api/sab/overview')
      setData(overview)
      setError('')
      return overview
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not reach SABnzbd')
      throw requestError
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([request('/api/sab/overview'), request('/api/sab/categories')])
      .then(([overview, categoryData]) => {
        if (!active) return
        setData(overview)
        setCategories(categoryData.categories || ['*'])
        setError('')
      })
      .catch(requestError => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not reach SABnzbd')
      })
      .finally(() => { if (active) setLoading(false) })

    const timer = window.setInterval(() => {
      request('/api/sab/overview').then(overview => {
        if (active) { setData(overview); setError('') }
      }).catch(() => {})
    }, 5000)

    return () => { active = false; window.clearInterval(timer) }
  }, [])

  const action = useCallback(async (actionName, id) => {
    setLoading(true)
    try {
      const result = await request('/api/sab/action', { method: 'POST', body: JSON.stringify({ action: actionName, id }) })
      setData(result.overview)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'SABnzbd action failed')
      throw requestError
    } finally {
      setLoading(false)
    }
  }, [])

  const addUrl = useCallback(async (url, category) => {
    await request('/api/sab/add-url', { method: 'POST', body: JSON.stringify({ url, category }) })
    await refresh()
  }, [refresh])

  return { data, categories, loading, error, refresh, action, addUrl }
}
