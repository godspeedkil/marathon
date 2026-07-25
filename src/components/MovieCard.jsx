import RatingScale from './RatingScale'

export default function MovieCard({ movie, rating, onRate, readOnly, onEdit, onRemove }) {
  return (
    <div className="ticket-edge bg-house-800 border border-house-700 rounded-md overflow-hidden flex flex-col sm:flex-row">
      <div className="sm:w-36 shrink-0 bg-house-900">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={`${movie.title} poster`}
            className="w-full h-48 sm:h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-48 sm:h-full flex items-center justify-center text-cream-600 text-xs font-mono px-3 text-center">
            no poster
          </div>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-2xl leading-none tracking-wide text-cream-100"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {movie.title}
            {movie.year ? (
              <span className="text-cream-600 text-lg ml-2 align-middle">{movie.year}</span>
            ) : null}
          </h3>
          {(onEdit || onRemove) && (
            <div className="flex gap-2 shrink-0 font-mono text-xs">
              {onEdit && (
                <button onClick={onEdit} className="text-teal-400 hover:text-teal-300">
                  edit
                </button>
              )}
              {onRemove && (
                <button onClick={onRemove} className="text-clay-400 hover:text-clay-300">
                  remove
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono text-cream-600">
          {movie.runtime_minutes ? <span>{movie.runtime_minutes} min</span> : null}
          {movie.genres?.length ? <span>{movie.genres.join(' · ')}</span> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <RatingBadge label="IMDb" value={movie.imdb_rating} />
          <RatingBadge label="RT" value={movie.rotten_tomatoes} />
          <RatingBadge label="Metacritic" value={movie.metacritic} />
        </div>

        {movie.synopsis ? (
          <p className="text-sm text-cream-400 leading-snug line-clamp-3">{movie.synopsis}</p>
        ) : null}

        {movie.actors ? (
          <p className="text-xs text-cream-600 font-mono">Cast: {movie.actors}</p>
        ) : null}

        {movie.trailer_url ? (
          <a
            href={movie.trailer_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-marquee-400 hover:text-marquee-300 inline-flex items-center gap-1 w-fit"
          >
            ▶ watch trailer
          </a>
        ) : null}

        {!readOnly && onRate ? (
          <div className="mt-1">
            <RatingScale value={rating} onChange={onRate} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function RatingBadge({ label, value }) {
  if (!value) return null
  return (
    <span className="text-xs font-mono bg-house-700 text-cream-200 px-2 py-0.5 rounded-sm border border-house-600">
      {label} {value}
    </span>
  )
}
