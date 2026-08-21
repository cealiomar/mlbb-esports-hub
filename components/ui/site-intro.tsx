import { BrandMark } from './brand-mark'

/** A short cinematic reveal shown only on the initial document load. */
export function SiteIntro() {
  return (
    <div className="site-intro" aria-hidden data-testid="site-intro">
      <span className="site-intro__panel site-intro__panel--left" />
      <span className="site-intro__panel site-intro__panel--right" />
      <span className="site-intro__flare" />

      <div className="site-intro__core">
        <span className="site-intro__signal">GLOBAL MATCH SIGNAL</span>
        <BrandMark
          width={420}
          priority
          className="site-intro__logo max-w-[76vw]"
        />
        <span className="site-intro__track">
          <span className="site-intro__progress" />
        </span>
      </div>
    </div>
  )
}
