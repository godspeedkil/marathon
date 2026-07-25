import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { surveyAdmin } from '../lib/api'
import { loadSurveyStructure, loadResults } from '../lib/loadSurvey'
import MovieCard from '../components/MovieCard'
import MovieSearch from '../components/MovieSearch'
import BatchImport from '../components/BatchImport'

const STATUS_COPY = {
  draft: { label: 'Draft', hint: "Only you can see this. Takers can't respond yet." },
  open: { label: 'Open', hint: 'Anyone with the link can vote right now.' },
  closed: { label: 'Closed', hint: "Voting has stopped. Existing responses are kept." },
}

export default function EditSurvey() {
  const { surveyId, creatorSecret } = useParams()
  const [survey, setSurvey] = useState(null)
  const [sections, setSections] = useState([])
  const [tab, setTab] = useState('build')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copyState, setCopyState] = useState('idle')

  const refresh = useCallback(async () => {
    try {
      const { survey, sections } = await loadSurveyStructure(surveyId)
      setSurvey(survey)
      setSections(sections)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [surveyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function setStatus(status) {
    setSurvey((s) => ({ ...s, status }))
    await surveyAdmin.updateSurvey(surveyId, creatorSecret, { status })
  }

  async function saveTitle(title) {
    setSurvey((s) => ({ ...s, title }))
    await surveyAdmin.updateSurvey(surveyId, creatorSecret, { title })
  }

  async function addSection() {
    await surveyAdmin.saveSection(surveyId, creatorSecret, {
      title: `Section ${sections.length + 1}`,
      position: sections.length,
    })
    refresh()
  }

  async function renameSection(section, title) {
    setSections((secs) => secs.map((s) => (s.id === section.id ? { ...s, title } : s)))
    await surveyAdmin.saveSection(surveyId, creatorSecret, { id: section.id, title, position: section.position })
  }

  async function deleteSection(section) {
    if (!confirm(`Delete "${section.title}" and all its movies?`)) return
    await surveyAdmin.deleteSection(surveyId, creatorSecret, section.id)
    refresh()
  }

  async function addMovie(sectionId, movie) {
    await surveyAdmin.saveMovie(surveyId, creatorSecret, sectionId, movie)
    refresh()
  }

  async function batchAdd(sectionId, movies) {
    await surveyAdmin.batchSaveMovies(surveyId, creatorSecret, sectionId, movies)
    refresh()
  }

  async function removeMovie(movie) {
    if (!confirm(`Remove "${movie.title}"?`)) return
    await surveyAdmin.deleteMovie(surveyId, creatorSecret, movie.id)
    refresh()
  }

  const shareLink = `${window.location.origin}/survey/${surveyId}`

  function copyLink() {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1600)
    })
  }

  if (loading) return <CenteredNote>Loading your survey…</CenteredNote>
  if (error) return <CenteredNote error>{error}</CenteredNote>

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <EditableTitle value={survey.title} onSave={saveTitle} />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {['draft', 'open', 'closed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={[
              'text-xs font-mono uppercase tracking-wide px-3 py-1.5 rounded-sm border transition-colors',
              survey.status === s
                ? 'bg-marquee-500 border-marquee-400 text-house-950 font-bold'
                : 'border-house-600 text-cream-400 hover:border-marquee-500',
            ].join(' ')}
          >
            {STATUS_COPY[s].label}
          </button>
        ))}
        <span className="text-xs text-cream-600 font-mono">{STATUS_COPY[survey.status].hint}</span>
      </div>

      <div className="mt-4 flex items-center gap-2 bg-house-800 border border-house-700 rounded-sm px-3 py-2">
        <span className="text-xs font-mono text-cream-600 shrink-0">Voter link</span>
        <code className="text-sm text-cream-200 truncate flex-1">{shareLink}</code>
        <button
          onClick={copyLink}
          className="text-xs font-mono px-2.5 py-1 rounded-sm bg-house-700 hover:bg-house-600 text-cream-100 shrink-0"
        >
          {copyState === 'copied' ? 'copied!' : 'copy'}
        </button>
      </div>
      <p className="text-xs text-clay-400 font-mono mt-2">
        Keep this edit page's URL private -- it's the only way to manage this survey.
      </p>

      <div className="filmstrip-divider my-8" />

      <div className="flex gap-1 mb-6">
        {['build', 'preview', 'results'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'text-sm font-mono uppercase tracking-wide px-4 py-2 rounded-t-sm border-b-2 transition-colors',
              tab === t
                ? 'border-marquee-500 text-cream-100'
                : 'border-transparent text-cream-600 hover:text-cream-400',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'build' && (
        <BuildTab
          sections={sections}
          onAddSection={addSection}
          onRenameSection={renameSection}
          onDeleteSection={deleteSection}
          onAddMovie={addMovie}
          onBatchAdd={batchAdd}
          onRemoveMovie={removeMovie}
        />
      )}

      {tab === 'preview' && <PreviewTab survey={survey} sections={sections} />}

      {tab === 'results' && <ResultsTab surveyId={surveyId} sections={sections} />}
    </div>
  )
}

function EditableTitle({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <button onClick={() => { setDraft(value); setEditing(true) }} className="text-left group">
        <h1
          className="text-4xl sm:text-5xl text-cream-100 group-hover:text-marquee-400 transition-colors"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {value}
        </h1>
        <span className="text-xs font-mono text-cream-600">click to rename</span>
      </button>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(draft.trim() || value)
        setEditing(false)
      }}
      className="flex gap-2"
    >
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onSave(draft.trim() || value)
          setEditing(false)
        }}
        className="text-3xl bg-house-800 border border-marquee-500 rounded-sm px-2 py-1 text-cream-100 flex-1"
        style={{ fontFamily: 'var(--font-display)' }}
      />
    </form>
  )
}

function BuildTab({ sections, onAddSection, onRenameSection, onDeleteSection, onAddMovie, onBatchAdd, onRemoveMovie }) {
  const [batchOpenFor, setBatchOpenFor] = useState(null)

  return (
    <div className="grid gap-8">
      {sections.map((section) => (
        <div key={section.id} className="bg-house-900 border border-house-700 rounded-md p-4">
          <div className="flex items-center gap-2 mb-4">
            <input
              defaultValue={section.title}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== section.title) {
                  onRenameSection(section, e.target.value.trim())
                }
              }}
              className="text-xl bg-transparent border-b border-transparent hover:border-house-600 focus:border-marquee-500 text-cream-100 px-1 py-0.5 flex-1"
              style={{ fontFamily: 'var(--font-display)' }}
            />
            <span className="text-xs font-mono text-cream-600">{section.movies.length} movies</span>
            <button
              onClick={() => onDeleteSection(section)}
              className="text-xs font-mono text-clay-400 hover:text-clay-300"
            >
              delete section
            </button>
          </div>

          <div className="grid gap-3 mb-4">
            {section.movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                readOnly
                onRemove={() => onRemoveMovie(movie)}
              />
            ))}
          </div>

          {batchOpenFor === section.id ? (
            <BatchImport
              onImport={(movies) => {
                onBatchAdd(section.id, movies)
                setBatchOpenFor(null)
              }}
              onCancel={() => setBatchOpenFor(null)}
            />
          ) : (
            <>
              <MovieSearch onPick={(movie) => onAddMovie(section.id, movie)} />
              <button
                onClick={() => setBatchOpenFor(section.id)}
                className="mt-2 text-xs font-mono text-marquee-400 hover:text-marquee-300"
              >
                or batch-import a list of titles →
              </button>
            </>
          )}
        </div>
      ))}

      <button
        onClick={onAddSection}
        className="border border-dashed border-house-600 hover:border-marquee-500 text-cream-400 hover:text-marquee-400 rounded-md py-4 text-sm font-mono transition-colors"
      >
        + add section
      </button>
    </div>
  )
}

function PreviewTab({ survey, sections }) {
  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-wide text-teal-400 mb-4">
        This is exactly what voters will see -- ratings here aren't saved.
      </p>
      {survey.intro && <p className="text-cream-400 mb-6">{survey.intro}</p>}
      <div className="grid gap-10">
        {sections.map((section) => (
          <div key={section.id}>
            <h2 className="text-2xl text-cream-100 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              {section.title}
            </h2>
            <div className="grid gap-3">
              {section.movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} rating={null} onRate={() => {}} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResultsTab({ surveyId, sections }) {
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadResults(surveyId).then(setResults).catch((e) => setError(e.message))
  }, [surveyId])

  if (error) return <p className="text-clay-400 font-mono text-sm">{error}</p>
  if (!results) return <p className="text-cream-600 font-mono text-sm">Loading results…</p>

  const totalResponses = results.responses.length

  return (
    <div>
      <p className="text-sm font-mono text-cream-400 mb-6">
        {totalResponses} {totalResponses === 1 ? 'person has' : 'people have'} responded
      </p>
      <div className="grid gap-10">
        {sections.map((section) => {
          const ranked = [...section.movies].sort((a, b) => {
            const avgA = results.movieStats[a.id]?.average ?? -1
            const avgB = results.movieStats[b.id]?.average ?? -1
            return avgB - avgA
          })
          return (
            <div key={section.id}>
              <h2 className="text-2xl text-cream-100 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                {section.title}
              </h2>
              <div className="grid gap-2">
                {ranked.map((movie) => {
                  const stats = results.movieStats[movie.id]
                  return (
                    <div
                      key={movie.id}
                      className="flex items-center gap-3 bg-house-800 border border-house-700 rounded-sm px-3 py-2.5"
                    >
                      <span className="text-cream-100 flex-1 truncate">{movie.title}</span>
                      {stats ? (
                        <>
                          <MiniBars counts={stats.counts} />
                          <span className="font-mono text-marquee-400 text-sm w-14 text-right">
                            {stats.average.toFixed(1)} avg
                          </span>
                          <span className="font-mono text-cream-600 text-xs w-16 text-right">
                            {stats.count} vote{stats.count === 1 ? '' : 's'}
                          </span>
                        </>
                      ) : (
                        <span className="font-mono text-cream-600 text-xs">no votes yet</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MiniBars({ counts }) {
  const max = Math.max(...counts, 1)
  return (
    <div className="flex items-end gap-0.5 h-6" aria-hidden="true">
      {counts.map((c, i) => (
        <div
          key={i}
          className="w-1.5 bg-teal-500 rounded-sm"
          style={{ height: `${Math.max((c / max) * 100, 8)}%` }}
          title={`${i + 1} star: ${c}`}
        />
      ))}
    </div>
  )
}

function CenteredNote({ children, error }) {
  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <p className={`font-mono text-sm ${error ? 'text-clay-400' : 'text-cream-600'}`}>{children}</p>
    </div>
  )
}
