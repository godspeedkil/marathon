import { useState } from 'react'
import { useNavigate } from 'react-router'
import { surveyAdmin } from '../lib/api'

export default function Home() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [intro, setIntro] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function createSurvey(e) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      const { survey } = await surveyAdmin.createSurvey(title.trim(), intro.trim() || null)
      navigate(`/survey/${survey.id}/edit/${survey.creator_secret}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-marquee-500 mb-3">
        now showing
      </p>
      <h1
        className="text-5xl sm:text-6xl leading-[0.95] text-cream-100 mb-5"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Let the group vote on the movie marathon.
      </h1>
      <p className="text-cream-400 leading-relaxed mb-10 max-w-lg">
        Build a shortlist, split it into sections, and send one link. Everyone
        rates each title 1 to 5. You watch the scores roll in and pick the
        lineup with actual data instead of a group chat argument.
      </p>

      <form onSubmit={createSurvey} className="bg-house-800 border border-house-700 rounded-md p-5">
        <label className="block text-xs font-mono uppercase tracking-wide text-cream-600 mb-1.5">
          Survey title
        </label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Halloween Marathon 2026"
          className="w-full bg-house-900 border border-house-600 rounded-sm px-3 py-2.5 text-cream-100 placeholder:text-cream-600 focus:border-marquee-500 mb-4"
        />

        <label className="block text-xs font-mono uppercase tracking-wide text-cream-600 mb-1.5">
          Note for voters (optional)
        </label>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={2}
          placeholder="Vote for anything you'd genuinely watch -- we'll pick the top scorers."
          className="w-full bg-house-900 border border-house-600 rounded-sm px-3 py-2.5 text-cream-100 placeholder:text-cream-600 focus:border-marquee-500 mb-4"
        />

        {error && <p className="text-clay-400 text-sm font-mono mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full bg-marquee-500 hover:bg-marquee-400 disabled:opacity-50 text-house-950 font-semibold py-2.5 rounded-sm transition-colors"
        >
          {loading ? 'Creating…' : 'Start building the survey'}
        </button>
      </form>

      <p className="text-xs text-cream-600 font-mono mt-4">
        You'll get a private edit link on the next screen -- bookmark it, it's the only way back in.
      </p>
    </div>
  )
}
