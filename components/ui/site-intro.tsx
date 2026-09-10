import { BrandMark } from './brand-mark'

/**
 * Plays the opening once per browser session.
 *
 * The reveal covers the page for about two seconds. Playing it on every
 * return to Home — including a tap on Home in the bottom bar, which renders
 * the page again — turned a welcome into a wait. The first document load of
 * a session plays it; afterwards `data-intro-seen` on <html> hides it, and
 * because <html> survives client navigation, it stays hidden there too.
 */
const INTRO_GATE = `(function(){try{var d=document.documentElement;if(sessionStorage.getItem('mlbb-intro')){d.dataset.introSeen='1';return}sessionStorage.setItem('mlbb-intro','1');setTimeout(function(){d.dataset.introSeen='1'},2400)}catch(e){}})();`

export function SiteIntro() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
      <div className="site-intro" aria-hidden data-testid="site-intro">
        <span className="site-intro__panel site-intro__panel--left" />
        <span className="site-intro__panel site-intro__panel--right" />
        <span className="site-intro__flare" />

        <div className="site-intro__core">
          <span className="site-intro__signal">GLOBAL MATCH SIGNAL</span>
          {/* The opening is the portrait alone — the handle carries the brand
              everywhere else, and repeating it here only crowds the moment. */}
          <BrandMark
            size={132}
            priority
            showHandle={false}
            className="site-intro__logo"
          />
          <span className="site-intro__track">
            <span className="site-intro__progress" />
          </span>
        </div>
      </div>
    </>
  )
}
