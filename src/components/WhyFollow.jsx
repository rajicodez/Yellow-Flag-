import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import FeatureIcon from './FeatureIcon';
import { features } from '../data/content';

export default function WhyFollow() {
  return (
    <section className="section why-follow" id="why-watch">
      <div className="why-follow-bg" aria-hidden="true" />
      <div className="container">
        <Reveal>
          <SectionHeader
            tag="Why Watch"
            title={<>Why Watch Our <span className="accent">Podcast</span></>}
            description="Built for fans who want F1 in Sinhala — clear, exciting, and community-driven."
          />
        </Reveal>

        <div className="features-grid">
          {features.map((feature, index) => (
            <Reveal
              key={feature.id}
              className="feature-card pit-card glass-card"
              delay={index * 0.06}
            >
              <FeatureIcon name={feature.icon} />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
