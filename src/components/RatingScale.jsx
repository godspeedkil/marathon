const LABELS = {
  1: "Not for me",
  2: "Could skip",
  3: "Sure, why not",
  4: "Want to see it",
  5: "Yes! Now!",
}

// Signature input: a row of five film-strip frames instead of a generic
// star or slider. Selected frame lights up amber; the label underneath
// updates so voters always know what their number means.
export default function RatingScale({ value, onChange, disabled }) {
  return (
    <div>
      <div className="flex gap-1.5" role="radiogroup" aria-label="How much do you want to watch this?">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(n)}
              className={[
                'relative h-11 flex-1 rounded-sm border transition-all font-mono text-sm',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                active
                  ? 'bg-marquee-500 border-marquee-400 text-house-950 font-bold scale-[1.03]'
                  : 'bg-house-800 border-house-600 text-cream-400 hover:border-marquee-500 hover:text-cream-100',
              ].join(' ')}
            >
              {n}
              <span
                className={[
                  'absolute inset-y-1.5 left-1 w-0.5 rounded-full',
                  active ? 'bg-house-950/40' : 'bg-house-600',
                ].join(' ')}
              />
              <span
                className={[
                  'absolute inset-y-1.5 right-1 w-0.5 rounded-full',
                  active ? 'bg-house-950/40' : 'bg-house-600',
                ].join(' ')}
              />
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 text-xs text-cream-600 font-mono h-4">
        {value ? LABELS[value] : '\u00A0'}
      </p>
    </div>
  )
}
