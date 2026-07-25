// Public movie lookup proxy. Combines TMDb (search, poster, cast, trailer,
// genres, runtime) with OMDb (IMDb / Rotten Tomatoes / Metacritic ratings)
// into one normalized shape the frontend can drop straight into a movie
// card or into the `movies` table. Keeping this server-side keeps both API
// keys out of the browser and gives us one spot to add caching later if we
// ever get close to OMDb's 1,000 requests/day free cap.
import { jsonResponse } from './lib/supabaseAdmin.js'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500'
const OMDB_BASE = 'https://www.omdbapi.com/'

let genreCache = null

async function getGenreMap(tmdbKey) {
  if (genreCache) return genreCache
  const res = await fetch(`${TMDB_BASE}/genre/movie/list?api_key=${tmdbKey}`)
  const data = await res.json()
  genreCache = Object.fromEntries((data.genres || []).map((g) => [g.id, g.name]))
  return genreCache
}

async function searchMovies(query, tmdbKey) {
  const [searchRes, genres] = await Promise.all([
    fetch(`${TMDB_BASE}/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(query)}`),
    getGenreMap(tmdbKey),
  ])
  const data = await searchRes.json()
  const results = (data.results || []).slice(0, 12).map((m) => ({
    tmdb_id: m.id,
    title: m.title,
    year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    poster_url: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : null,
    genres: (m.genre_ids || []).map((id) => genres[id]).filter(Boolean),
    synopsis: m.overview,
  }))
  return results
}

async function getRatingsFromOmdb(imdbId, title, year, omdbKey) {
  if (!omdbKey) return {}
  const params = imdbId
    ? `i=${imdbId}`
    : `t=${encodeURIComponent(title)}${year ? `&y=${year}` : ''}`
  const res = await fetch(`${OMDB_BASE}?${params}&apikey=${omdbKey}`)
  const data = await res.json()
  if (data.Response === 'False') return {}

  const ratings = data.Ratings || []
  const find = (source) => ratings.find((r) => r.Source === source)?.Value || null

  return {
    imdb_rating: find('Internet Movie Database') || (data.imdbRating !== 'N/A' ? `${data.imdbRating}/10` : null),
    rotten_tomatoes: find('Rotten Tomatoes'),
    metacritic: find('Metacritic') || (data.Metascore !== 'N/A' ? `${data.Metascore}/100` : null),
  }
}

async function getDetails({ tmdb_id, title, year }, tmdbKey, omdbKey) {
  let movie
  let credits
  let videos
  let externalIds

  if (tmdb_id) {
    const res = await fetch(
      `${TMDB_BASE}/movie/${tmdb_id}?api_key=${tmdbKey}&append_to_response=credits,videos,external_ids`
    )
    if (!res.ok) throw { statusCode: 404, message: 'Movie not found on TMDb.' }
    movie = await res.json()
    credits = movie.credits
    videos = movie.videos
    externalIds = movie.external_ids
  } else if (title) {
    const results = await searchMovies(year ? `${title} ${year}` : title, tmdbKey)
    if (!results.length) throw { statusCode: 404, message: 'No matching movie found.' }
    return getDetails({ tmdb_id: results[0].tmdb_id }, tmdbKey, omdbKey)
  } else {
    throw { statusCode: 400, message: 'Provide tmdb_id or title.' }
  }

  const trailer = (videos?.results || []).find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer'
  ) || (videos?.results || []).find((v) => v.site === 'YouTube')

  const topCast = (credits?.cast || []).slice(0, 5).map((c) => c.name).join(', ')

  const ratings = await getRatingsFromOmdb(externalIds?.imdb_id, movie.title, null, omdbKey)

  return {
    tmdb_id: movie.id,
    external_id: externalIds?.imdb_id || String(movie.id),
    title: movie.title,
    year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
    poster_url: movie.poster_path ? `${TMDB_IMG_BASE}${movie.poster_path}` : null,
    synopsis: movie.overview,
    genres: (movie.genres || []).map((g) => g.name),
    runtime_minutes: movie.runtime || null,
    actors: topCast,
    trailer_url: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    source: 'tmdb',
    ...ratings,
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Use POST.' })
  }

  const tmdbKey = process.env.TMDB_API_KEY
  const omdbKey = process.env.OMDB_API_KEY

  if (!tmdbKey) {
    return jsonResponse(500, { error: 'TMDB_API_KEY is not configured on the server.' })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' })
  }

  try {
    if (body.action === 'search') {
      if (!body.query) return jsonResponse(400, { error: 'query is required.' })
      const results = await searchMovies(body.query, tmdbKey)
      return jsonResponse(200, { results })
    }

    if (body.action === 'details') {
      const details = await getDetails(
        { tmdb_id: body.tmdb_id, title: body.title, year: body.year },
        tmdbKey,
        omdbKey
      )
      return jsonResponse(200, { movie: details })
    }

    return jsonResponse(400, { error: 'Unknown action. Use "search" or "details".' })
  } catch (err) {
    const statusCode = err?.statusCode || 500
    return jsonResponse(statusCode, { error: err?.message || 'Movie lookup failed.' })
  }
}
