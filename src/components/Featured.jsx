import { socialUrlById } from '../data/content';
import Reveal from './Reveal';

export default function Featured() {
  return (
    <section className="section featured" id="youtube">
      <div className="featured-neon-border" aria-hidden="true" />
      <div className="container">
        <Reveal className="featured-wrapper pit-card glass-card">
          <div className="featured-content">
            <span className="section-tag">
              <span className="yt-dot" />
              Featured on YouTube
            </span>
            <h2 className="section-title">
              Watch our latest Formula 1 discussion in <span className="accent">Sinhala</span>
            </h2>
            <p className="section-desc">
              Raw reactions, honest takes, and the full energy of a race weekend debrief — straight from our YouTube channel.
            </p>
            <a
              href={socialUrlById.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-youtube btn-glow"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.5 6.2a3 3 0 0 0-3-3H3.5a3 3 0 0 0-3 3v11.6a3 3 0 0 0 3 3h17a3 3 0 0 0 3-3V6.2zM9.7 12.5l7.5 4.4V8.1l-7.5 4.4z" />
              </svg>
              Subscribe on YouTube
            </a>
          </div>
          <div className="video-embed">
            <div className="video-placeholder">
              <div className="video-frame-corner tl" />
              <div className="video-frame-corner tr" />
              <div className="video-frame-corner bl" />
              <div className="video-frame-corner br" />
              <div className="video-placeholder-inner">
                <div className="video-play-btn">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <p>Latest Episode — Grand Prix Race Review</p>
                <span className="video-hint">Replace with your YouTube embed URL</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
