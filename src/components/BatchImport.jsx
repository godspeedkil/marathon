import { useState } from 'react'
import { movieApi } from '../lib/api'

// Paste a list of titles (one per line, optionally "Title (Year)") and we
// resolve each one against TMDb/OMDb before handing the resolved batch back
// to the parent to save. This is what makes building a 20-movie survey take
// two minutes instead of twenty.
export default function BatchImport({ onImport, onCancel }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle') // idle | resolving | review
  const [resolved, setResolved] = useState([])

  function parseLines() {
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(.*?)\s*\((\d{4})\)$/)
        return match ? { title: match[1].trim(), year: match[2] } : { title: line, year: null }
      })
  }

  async function resolveAll() {
    const lines = parseLines()
    if (!lines.length) return
    setStatus('resolving')
    const out = []
    for (const line of lines) {
      try {
        const { movie } = await movieApi.details({ title: line.title, year: line.year })
        out.push({ ...movie, _include: true, _query: line.title })
      } catch {
        out.push({
          title: line.title,
          year: line.year ? Number(line.year) : null,
          source: 'manual',
          _include: true,
          _query: line.title,
          _notFound: true,
        })
      }
    }
    setResolved(out)
    setStatus('review')
  }

  function toggle(i) {
    setResolved((r) => r.map((m, idx) => (idx === i ? { ...m, _include: !m._include } : m)))
  }

  function confirm() {
    onImport(resolved.filter((m) => m._include).map(({ _include, _query, _notFound, ...m }) => m))
  }

  return (
    <div className="bg-house-800 border border-house-700 rounded-md p-4">
      <h4 className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
        BATCH IMPORT
      </h4>

      {status === 'idle' && (
        <>
          <p className="text-xs text-cream-600 font-mono mt-1 mb-2">
            One title per line. Add a year in parentheses if the title is ambiguous, e.g.{' '}
            <span className="text-cream-400">Dune (2021)</span>
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={'Alien (1979)\nParasite\nThe Grand Budapest Hotel'}
            className="w-full bg-house-900 border border-house-600 rounded-sm px-3 py-2 text-sm text-cream-100 placeholder:text-cream-600 font-mono"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={resolveAll}
              className="bg-marquee-500 hover:bg-marquee-400 text-house-950 font-semibold text-sm px-3 py-1.5 rounded-sm"
            >
              Look up {parseLines().length || ''} titles
            </button>
            <button onClick={onCancel} className="text-sm text-cream-600 hover:text-cream-400 px-3 py-1.5">
              Cancel
            </button>
          </div>
        </>
      )}

      {status === 'resolving' && (
        <p className="text-sm text-cream-400 font-mono mt-3">Looking up titles…</p>
      )}

      {status === 'review' && (
        <>
          <p className="text-xs text-cream-600 font-mono mt-1 mb-3">
            Uncheck anything that resolved wrong -- you can search for it manually afterward.
          </p>
          <ul className="grid gap-1.5 max-h-96 overflow-y-auto">
            {resolved.map((m, i) => (
              <li
                key={i}
                className="flex items-center gap-2.5 bg-house-900 border border-house-700 rounded-sm px-2.5 py-2"
              >
                <input type="checkbox" checked={m._include} onChange={() => toggle(i)} className="accent-marquee-500" />
                {m.poster_url ? (
                  <img src={m.poster_url} alt="" className="w-7 h-10 object-cover rounded-sm" />
                ) : (
                  <div className="w-7 h-10 bg-house-800 rounded-sm shrink-0" />
                )}
                <span className="text-sm min-w-0 truncate">
                  {m.title} {m.year ? <span className="text-cream-600">({m.year})</span> : null}
                </span>
                {m._notFound && (
                  <span className="ml-auto text-xs font-mono text-clay-400 shrink-0">not found — will add as manual</span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-3">
            <button
              onClick={confirm}
              className="bg-marquee-500 hover:bg-marquee-400 text-house-950 font-semibold text-sm px-3 py-1.5 rounded-sm"
            >
              Add {resolved.filter((m) => m._include).length} movies
            </button>
            <button onClick={onCancel} className="text-sm text-cream-600 hover:text-cream-400 px-3 py-1.5">
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
