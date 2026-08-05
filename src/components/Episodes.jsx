import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import { episodes } from '../data/content';

export default function Episodes() {
  return (
    <section className="section episodes" id="episodes">
      <div className="section-racing-stripe" aria-hidden="true" />
      <div className="container">
        <Reveal>
          <SectionHeader
            tag="On Demand"
            title={<>Latest <span className="accent">Episodes</span></>}
            description="Watch our newest F1 discussions — race reviews, previews, and deep dives in Sinhala."
          />
        </Reveal>

        <div className="episodes-grid">
          {episodes.map((episode, index) => (
            <Reveal
              key={episode.id}
              as="article"
              className="episode-card pit-card glass-card"
              delay={index * 0.07}
            >
              <div className="episode-thumb">
                <div className={`thumb-placeholder ${episode.thumbClass}`}>
                  <span className="play-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </div>
                <span className="episode-category">{episode.category}</span>
                <span className="episode-duration">{episode.duration}</span>
              </div>
              <div className="episode-body">
                <h3 className="episode-title">{episode.title}</h3>
                <p className="episode-desc">{episode.description}</p>
                <a href={episode.url} className="btn btn-small btn-watch">
                  Watch Now
                  <span className="btn-arrow">→</span>
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
