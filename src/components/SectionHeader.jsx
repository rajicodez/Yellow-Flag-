export default function SectionHeader({ tag, title, description }) {
  return (
    <div className="section-header">
      <span className="section-tag">
        <span className="tag-line" />
        {tag}
        <span className="tag-line" />
      </span>
      <h2 className="section-title">{title}</h2>
      {description && <p className="section-desc">{description}</p>}
    </div>
  );
}
