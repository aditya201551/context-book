import BrandMark from '../BrandMark';

export default function LandingFooter() {
  return (
    <>
      <footer className="foot">
        <div className="foot-brand">
          <div className="foot-brand-row">
            <div className="nav-brand-mark">
              <BrandMark />
            </div>
            <div>
              <div className="nav-brand-name">ContextBook</div>
              <div className="nav-brand-tag">Mnemosyne · Library of Memory</div>
            </div>
          </div>
          <div className="foot-mission">
            A library for the thinking machine —
            where every conversation finds its proper shelf.
          </div>
        </div>

        <div className="foot-links">
          <div className="foot-col">
            <div className="foot-col-head">Connect</div>
            <a href="https://www.linkedin.com/in/aaditya-raaj/" target="_blank" rel="noreferrer">LinkedIn</a>
          </div>
        </div>
      </footer>

      <div className="foot-end">
        <span>© MMXXVI · ContextBook · ΜΝΗΜΟΣΥΝΗ</span>
        <span className="foot-end-meander"></span>
        <span>Open source. MIT.</span>
      </div>
    </>
  );
}
