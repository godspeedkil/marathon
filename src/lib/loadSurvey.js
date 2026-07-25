import { supabase } from './supabaseClient'

// Loads a survey plus its sections and movies (nested, ordered by position).
// Used by both the creator's preview/edit view and the taker's voting view.
export async function loadSurveyStructure(surveyId) {
  const { data: survey, error: surveyError } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', surveyId)
    .single()
  if (surveyError) throw surveyError

  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select('*')
    .eq('survey_id', surveyId)
    .order('position', { ascending: true })
  if (sectionsError) throw sectionsError

  const sectionIds = sections.map((s) => s.id)
  let movies = []
  if (sectionIds.length) {
    const { data: movieRows, error: moviesError } = await supabase
      .from('movies')
      .select('*')
      .in('section_id', sectionIds)
      .order('position', { ascending: true })
    if (moviesError) throw moviesError
    movies = movieRows
  }

  const sectionsWithMovies = sections.map((section) => ({
    ...section,
    movies: movies.filter((m) => m.section_id === section.id),
  }))

  return { survey, sections: sectionsWithMovies }
}

// Loads every response + vote for a survey and aggregates per-movie stats.
export async function loadResults(surveyId) {
  const { data: responses, error: responsesError } = await supabase
    .from('responses')
    .select('*')
    .eq('survey_id', surveyId)
    .order('submitted_at', { ascending: false })
  if (responsesError) throw responsesError

  const responseIds = responses.map((r) => r.id)
  let votes = []
  if (responseIds.length) {
    const { data: voteRows, error: votesError } = await supabase
      .from('response_votes')
      .select('*')
      .in('response_id', responseIds)
    if (votesError) throw votesError
    votes = voteRows
  }

  const byMovie = {}
  for (const vote of votes) {
    if (!byMovie[vote.movie_id]) byMovie[vote.movie_id] = []
    byMovie[vote.movie_id].push(vote.score)
  }

  const movieStats = Object.fromEntries(
    Object.entries(byMovie).map(([movieId, scores]) => [
      movieId,
      {
        average: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length,
        counts: [1, 2, 3, 4, 5].map((n) => scores.filter((s) => s === n).length),
      },
    ])
  )

  return { responses, votes, movieStats }
}
