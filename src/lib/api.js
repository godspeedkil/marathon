// Thin wrapper around the two Netlify Functions. Reads go straight through
// supabaseClient.js instead -- this file is only for the two write/proxy
// endpoints that need a server (movie lookups, creator-authenticated writes).

async function post(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Request to ${path} failed (${res.status}).`)
  }
  return data
}

export const movieApi = {
  search: (query) => post('/.netlify/functions/movie-api', { action: 'search', query }),
  details: (params) => post('/.netlify/functions/movie-api', { action: 'details', ...params }),
}

export const surveyAdmin = {
  createSurvey: (title, intro) =>
    post('/.netlify/functions/survey-admin', { action: 'create-survey', title, intro }),

  updateSurvey: (survey_id, creator_secret, patch) =>
    post('/.netlify/functions/survey-admin', {
      action: 'update-survey',
      survey_id,
      creator_secret,
      ...patch,
    }),

  saveSection: (survey_id, creator_secret, section) =>
    post('/.netlify/functions/survey-admin', {
      action: 'save-section',
      survey_id,
      creator_secret,
      ...section,
    }),

  deleteSection: (survey_id, creator_secret, id) =>
    post('/.netlify/functions/survey-admin', {
      action: 'delete-section',
      survey_id,
      creator_secret,
      id,
    }),

  saveMovie: (survey_id, creator_secret, section_id, movie) =>
    post('/.netlify/functions/survey-admin', {
      action: 'save-movie',
      survey_id,
      creator_secret,
      section_id,
      movie,
    }),

  batchSaveMovies: (survey_id, creator_secret, section_id, movies, startPosition) =>
    post('/.netlify/functions/survey-admin', {
      action: 'batch-save-movies',
      survey_id,
      creator_secret,
      section_id,
      movies,
      startPosition,
    }),

  deleteMovie: (survey_id, creator_secret, id) =>
    post('/.netlify/functions/survey-admin', {
      action: 'delete-movie',
      survey_id,
      creator_secret,
      id,
    }),

  reorder: (survey_id, creator_secret, items) =>
    post('/.netlify/functions/survey-admin', {
      action: 'reorder',
      survey_id,
      creator_secret,
      items,
    }),
}
