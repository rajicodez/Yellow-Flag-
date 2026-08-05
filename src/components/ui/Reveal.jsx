import { motion } from 'framer-motion';

export default function Reveal({ children, className, delay = 0, y = 36, as = 'div', ...rest }) {
  const Tag = motion[as] || motion.div;

  return (
    <Tag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
}
