import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <p className="text-6xl mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        404
      </p>
      <p className="text-cream-400 mb-6">That reel isn't in the projector booth.</p>
      <Link to="/" className="text-marquee-400 hover:text-marquee-300 font-mono text-sm">
        ← back to the start
      </Link>
    </div>
  )
}
