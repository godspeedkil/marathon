import { useEffect, useRef, useState } from 'react'
import { movieApi } from '../lib/api'

// Lookup box: search-as-you-type against TMDb (via the movie-api function),
// pick a result, and we fetch the full combined TMDb+OMDb detail record.
// Falls back to a manual entry form when nothing comes back -- for the
// obscure or home-movie case.
export default function MovieSearch({ onPick }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchingId, setFetchingId] = useState(null)
  const [error, setError] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const { results } = await movieApi.search(query.trim())
        setResults(results)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  async function pick(result) {
    setFetchingId(result.tmdb_id)
    try {
      const { movie } = await movieApi.details({ tmdb_id: result.tmdb_id })
      onPick(movie)
      setQuery('')
      setResults([])
    } catch (err) {
      setError(err.message)
    } finally {
      setFetchingId(null)
    }
  }

  return (
    <div>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, e.g. Alien or The Grand Budapest Hotel..."
          className="w-full bg-house-800 border border-house-600 rounded-sm px-3 py-2.5 text-sm text-cream-100 placeholder:text-cream-600 focus:border-marquee-500"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-cream-600">
            searching…
          </span>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-clay-400 font-mono">{error}</p>}

      {results.length > 0 && (
        <ul className="mt-2 border border-house-600 rounded-sm divide-y divide-house-700 max-h-80 overflow-y-auto">
          {results.map((r) => (
            <li key={r.tmdb_id}>
              <button
                onClick={() => pick(r)}
                disabled={fetchingId !== null}
                className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-house-700 disabled:opacity-50"
              >
                {r.poster_url ? (
                  <img src={r.poster_url} alt="" className="w-9 h-13 object-cover rounded-sm shrink-0" />
                ) : (
                  <div className="w-9 h-13 shrink-0 bg-house-900 rounded-sm" />
                )}
                <span className="min-w-0">
                  <span className="block text-sm text-cream-100 truncate">
                    {r.title} {r.year ? <span className="text-cream-600">({r.year})</span> : null}
                  </span>
                  {r.genres?.length ? (
                    <span className="block text-xs text-cream-600 font-mono truncate">
                      {r.genres.join(' · ')}
                    </span>
                  ) : null}
                </span>
                {fetchingId === r.tmdb_id && (
                  <span className="ml-auto text-xs font-mono text-marquee-400 shrink-0">loading…</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => setShowManual((v) => !v)}
        className="mt-2 text-xs font-mono text-teal-400 hover:text-teal-300"
      >
        {showManual ? 'cancel manual entry' : "can't find it? enter it manually →"}
      </button>

      {showManual && (
        <ManualMovieForm
          onSubmit={(movie) => {
            onPick(movie)
            setShowManual(false)
          }}
        />
      )}
    </div>
  )
}

function ManualMovieForm({ onSubmit }) {
  const [form, setForm] = useState({ title: '', year: '', synopsis: '', genres: '', runtime_minutes: '' })

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSubmit({
      title: form.title.trim(),
      year: form.year ? Number(form.year) : null,
      synopsis: form.synopsis || null,
      genres: form.genres ? form.genres.split(',').map((g) => g.trim()).filter(Boolean) : null,
      runtime_minutes: form.runtime_minutes ? Number(form.runtime_minutes) : null,
      source: 'manual',
    })
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 bg-house-800 border border-house-700 rounded-sm p-3">
      <input
        required
        placeholder="Title"
        value={form.title}
        onChange={set('title')}
        className="bg-house-900 border border-house-600 rounded-sm px-2.5 py-2 text-sm text-cream-100 placeholder:text-cream-600"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Year"
          value={form.year}
          onChange={set('year')}
          className="bg-house-900 border border-house-600 rounded-sm px-2.5 py-2 text-sm text-cream-100 placeholder:text-cream-600"
        />
        <input
          placeholder="Runtime (min)"
          value={form.runtime_minutes}
          onChange={set('runtime_minutes')}
          className="bg-house-900 border border-house-600 rounded-sm px-2.5 py-2 text-sm text-cream-100 placeholder:text-cream-600"
        />
      </div>
      <input
        placeholder="Genres, comma separated"
        value={form.genres}
        onChange={set('genres')}
        className="bg-house-900 border border-house-600 rounded-sm px-2.5 py-2 text-sm text-cream-100 placeholder:text-cream-600"
      />
      <textarea
        placeholder="Brief synopsis"
        value={form.synopsis}
        onChange={set('synopsis')}
        rows={2}
        className="bg-house-900 border border-house-600 rounded-sm px-2.5 py-2 text-sm text-cream-100 placeholder:text-cream-600"
      />
      <button
        type="submit"
        className="justify-self-start bg-teal-500 hover:bg-teal-400 text-house-950 font-semibold text-sm px-3 py-1.5 rounded-sm"
      >
        Add this movie
      </button>
    </form>
  )
}
