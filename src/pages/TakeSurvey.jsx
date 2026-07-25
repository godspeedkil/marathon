import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { supabase } from '../lib/supabaseClient'
import { loadSurveyStructure } from '../lib/loadSurvey'
import MovieCard from '../components/MovieCard'

export default function TakeSurvey() {
  const { surveyId } = useParams()
  const [survey, setSurvey] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [ratings, setRatings] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    loadSurveyStructure(surveyId)
      .then(({ survey, sections }) => {
        setSurvey(survey)
        setSections(sections)
      })
      .catch(() => setError('This survey link is invalid or has been removed.'))
      .finally(() => setLoading(false))
  }, [surveyId])

  const totalMovies = useMemo(() => sections.reduce((n, s) => n + s.movies.length, 0), [sections])
  const ratedCount = Object.keys(ratings).length

  function setRating(movieId, score) {
    setRatings((r) => ({ ...r, [movieId]: score }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!name.trim() || ratedCount === 0) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { data: response, error: responseError } = await supabase
        .from('responses')
        .insert({ survey_id: surveyId, taker_name: name.trim() })
        .select()
        .single()
      if (responseError) throw responseError

      const votes = Object.entries(ratings).map(([movie_id, score]) => ({
        response_id: response.id,
        movie_id,
        score,
      }))
      const { error: votesError } = await supabase.from('response_votes').insert(votes)
      if (votesError) throw votesError

      setSubmitted(true)
    } catch (err) {
      setSubmitError(
        survey.status !== 'open'
          ? 'This survey is no longer accepting responses.'
          : err.message
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <CenteredNote>Loading survey…</CenteredNote>
  if (error) return <CenteredNote error>{error}</CenteredNote>

  if (survey.status === 'draft') {
    return (
      <CenteredNote>
        <span className="text-cream-100 text-lg block mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          {survey.title}
        </span>
        The creator hasn't opened this survey for voting yet. Check back soon.
      </CenteredNote>
    )
  }

  if (submitted) {
    return (
      <CenteredNote>
        <span className="text-marquee-400 text-2xl block mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Your ballot is in.
        </span>
        Thanks, {name.trim()} — you rated {ratedCount} of {totalMovies} movies. The organizer will
        tally everyone's votes and pick the lineup.
      </CenteredNote>
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl px-5 py-10 pb-32">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-marquee-500 mb-3">now voting</p>
      <h1 className="text-4xl sm:text-5xl text-cream-100 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        {survey.title}
      </h1>
      {survey.intro && <p className="text-cream-400 mb-6 max-w-xl">{survey.intro}</p>}

      {survey.status === 'closed' ? (
        <p className="bg-clay-500/15 border border-clay-500/40 text-clay-400 font-mono text-sm rounded-sm px-4 py-3 mb-6">
          Voting is closed for this survey. You can browse the lineup below, but responses aren't
          being accepted anymore.
        </p>
      ) : (
        <div className="bg-house-800 border border-house-700 rounded-md p-4 mb-8 sticky top-4 z-10">
          <label className="block text-xs font-mono uppercase tracking-wide text-cream-600 mb-1.5">
            Your name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="So the organizer knows whose ballot this is"
            className="w-full bg-house-900 border border-house-600 rounded-sm px-3 py-2 text-cream-100 placeholder:text-cream-600 focus:border-marquee-500"
          />
          <p className="text-xs font-mono text-cream-600 mt-2">
            {ratedCount} of {totalMovies} rated
          </p>
        </div>
      )}

      <div className="grid gap-10">
        {sections.map((section) => (
          <div key={section.id}>
            <h2 className="text-2xl text-cream-100 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              {section.title}
            </h2>
            <div className="grid gap-3">
              {section.movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  rating={ratings[movie.id]}
                  onRate={survey.status === 'open' ? (score) => setRating(movie.id, score) : undefined}
                  readOnly={survey.status !== 'open'}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {survey.status === 'open' && (
        <div className="fixed bottom-0 inset-x-0 bg-house-950/95 backdrop-blur border-t border-house-700 py-3">
          <div className="mx-auto max-w-3xl px-5 flex items-center gap-4">
            {submitError && <p className="text-clay-400 text-xs font-mono flex-1">{submitError}</p>}
            <button
              type="submit"
              disabled={submitting || !name.trim() || ratedCount === 0}
              className="ml-auto bg-marquee-500 hover:bg-marquee-400 disabled:opacity-40 text-house-950 font-semibold px-5 py-2.5 rounded-sm"
            >
              {submitting ? 'Submitting…' : 'Submit my ballot'}
            </button>
          </div>
        </div>
      )}
    </form>
  )
}

function CenteredNote({ children, error }) {
  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <p className={`font-mono text-sm ${error ? 'text-clay-400' : 'text-cream-600'}`}>{children}</p>
    </div>
  )
}
