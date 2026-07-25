import { Link } from 'react-router'

export default function Header() {
  return (
    <header className="border-b border-house-700">
      <div className="mx-auto max-w-5xl px-5 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <ReelMark />
          <span
            className="text-2xl tracking-wide text-cream-100 group-hover:text-marquee-400 transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            MARATHON
          </span>
        </Link>
        <span className="hidden sm:block text-xs uppercase tracking-[0.2em] text-cream-600 font-mono">
          movie night, by ballot
        </span>
      </div>
    </header>
  )
}

function ReelMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="12.5" stroke="var(--color-marquee-500)" strokeWidth="2" />
      <circle cx="14" cy="14" r="2.4" fill="var(--color-marquee-500)" />
      <circle cx="14" cy="6.5" r="2.1" fill="var(--color-marquee-500)" opacity="0.85" />
      <circle cx="20.5" cy="11" r="2.1" fill="var(--color-marquee-500)" opacity="0.85" />
      <circle cx="18" cy="19.5" r="2.1" fill="var(--color-marquee-500)" opacity="0.85" />
      <circle cx="8" cy="19" r="2.1" fill="var(--color-marquee-500)" opacity="0.85" />
      <circle cx="6.5" cy="10.5" r="2.1" fill="var(--color-marquee-500)" opacity="0.85" />
    </svg>
  )
}
