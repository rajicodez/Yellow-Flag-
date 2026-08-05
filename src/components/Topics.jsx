import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import TopicIcon from './TopicIcon';
import { topics } from '../data/content';

export default function Topics() {
  return (
    <section className="section topics" id="topics">
      <div className="container">
        <Reveal>
          <SectionHeader
            tag="Paddock Categories"
            title={<>F1 <span className="accent">Topics</span></>}
            description="Every angle of Formula 1 — pick a category and dive in."
          />
        </Reveal>

        <div className="topics-grid">
          {topics.map((topic, index) => (
            <Reveal
              key={topic.id}
              as="a"
              href="#episodes"
              className={`topic-card pit-card glass-card ${topic.wide ? 'topic-card-wide' : ''}`}
              delay={index * 0.05}
            >
              <TopicIcon name={topic.icon} />
              <div className="topic-content">
                <span className="topic-number">{String(topic.id).padStart(2, '0')}</span>
                <h3>{topic.title}</h3>
              </div>
              <span className="topic-arrow">→</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
