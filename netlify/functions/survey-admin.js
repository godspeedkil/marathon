// All creator write operations (create/update survey, sections, movies) live
// behind this single function. Every action except create-survey requires a
// matching creator_secret, checked with verifyCreator() before touching the
// database. Reads don't go through here -- the frontend queries Supabase
// directly with the public anon key, since surveys/sections/movies are
// publicly readable by RLS policy.
import { supabaseAdmin, jsonResponse } from './lib/supabaseAdmin.js'
import { verifyCreator } from './lib/verifyCreator.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Use POST.' })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' })
  }

  const db = supabaseAdmin()
  const { action } = body

  try {
    switch (action) {
      case 'create-survey': {
        if (!body.title) return jsonResponse(400, { error: 'title is required.' })
        const { data, error } = await db
          .from('surveys')
          .insert({ title: body.title, intro: body.intro || null })
          .select()
          .single()
        if (error) throw error
        return jsonResponse(200, { survey: data })
      }

      case 'update-survey': {
        await verifyCreator(db, body.survey_id, body.creator_secret)
        const patch = {}
        for (const field of ['title', 'intro', 'status']) {
          if (body[field] !== undefined) patch[field] = body[field]
        }
        if (patch.status && !['draft', 'open', 'closed'].includes(patch.status)) {
          return jsonResponse(400, { error: 'status must be draft, open, or closed.' })
        }
        const { data, error } = await db
          .from('surveys')
          .update(patch)
          .eq('id', body.survey_id)
          .select()
          .single()
        if (error) throw error
        return jsonResponse(200, { survey: data })
      }

      case 'save-section': {
        await verifyCreator(db, body.survey_id, body.creator_secret)
        const row = {
          survey_id: body.survey_id,
          title: body.title,
          position: body.position ?? 0,
        }
        const query = body.id
          ? db.from('sections').update(row).eq('id', body.id).eq('survey_id', body.survey_id)
          : db.from('sections').insert(row)
        const { data, error } = await query.select().single()
        if (error) throw error
        return jsonResponse(200, { section: data })
      }

      case 'delete-section': {
        await verifyCreator(db, body.survey_id, body.creator_secret)
        const { error } = await db
          .from('sections')
          .delete()
          .eq('id', body.id)
          .eq('survey_id', body.survey_id)
        if (error) throw error
        return jsonResponse(200, { ok: true })
      }

      case 'save-movie': {
        await verifyCreator(db, body.survey_id, body.creator_secret)
        const row = buildMovieRow(body.movie, body.section_id)
        const query = body.movie.id
          ? db.from('movies').update(row).eq('id', body.movie.id)
          : db.from('movies').insert(row)
        const { data, error } = await query.select().single()
        if (error) throw error
        return jsonResponse(200, { movie: data })
      }

      case 'batch-save-movies': {
        await verifyCreator(db, body.survey_id, body.creator_secret)
        if (!Array.isArray(body.movies) || !body.movies.length) {
          return jsonResponse(400, { error: 'movies must be a non-empty array.' })
        }
        const rows = body.movies.map((m, i) =>
          buildMovieRow(m, body.section_id, body.startPosition ? body.startPosition + i : i)
        )
        const { data, error } = await db.from('movies').insert(rows).select()
        if (error) throw error
        return jsonResponse(200, { movies: data })
      }

      case 'delete-movie': {
        await verifyCreator(db, body.survey_id, body.creator_secret)
        const { error } = await db.from('movies').delete().eq('id', body.id)
        if (error) throw error
        return jsonResponse(200, { ok: true })
      }

      case 'reorder': {
        // body.items: [{ table: 'sections'|'movies', id, position }, ...]
        await verifyCreator(db, body.survey_id, body.creator_secret)
        if (!Array.isArray(body.items)) {
          return jsonResponse(400, { error: 'items must be an array.' })
        }
        for (const item of body.items) {
          if (!['sections', 'movies'].includes(item.table)) continue
          const { error } = await db
            .from(item.table)
            .update({ position: item.position })
            .eq('id', item.id)
          if (error) throw error
        }
        return jsonResponse(200, { ok: true })
      }

      default:
        return jsonResponse(400, { error: `Unknown action: ${action}` })
    }
  } catch (err) {
    const statusCode = err?.statusCode || 500
    return jsonResponse(statusCode, { error: err?.message || 'Request failed.' })
  }
}

function buildMovieRow(movie, sectionId, position) {
  return {
    section_id: sectionId,
    title: movie.title,
    year: movie.year ?? null,
    poster_url: movie.poster_url ?? null,
    synopsis: movie.synopsis ?? null,
    genres: movie.genres ?? null,
    runtime_minutes: movie.runtime_minutes ?? null,
    actors: movie.actors ?? null,
    trailer_url: movie.trailer_url ?? null,
    imdb_rating: movie.imdb_rating ?? null,
    rotten_tomatoes: movie.rotten_tomatoes ?? null,
    metacritic: movie.metacritic ?? null,
    source: movie.source ?? 'manual',
    external_id: movie.external_id ?? null,
    ...(position !== undefined ? { position } : {}),
  }
}
