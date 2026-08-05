import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export default function GlowButton({ href, children, variant = 'primary', className, ...rest }) {
  const base =
    'inline-flex items-center justify-center gap-3 rounded-full px-7 py-4 text-sm font-black uppercase tracking-[0.18em] transition';

  const variants = {
    primary:
      'bg-yellow-400 text-black shadow-[0_0_32px_rgba(250,204,21,0.35)] hover:shadow-[0_0_48px_rgba(250,204,21,0.5)]',
    secondary: 'border border-white/15 bg-white/5 text-white hover:border-yellow-400/40 hover:text-yellow-200',
    youtube: 'bg-red-600 text-white shadow-[0_0_28px_rgba(220,38,38,0.35)] hover:bg-red-500',
  };

  const Component = href ? motion.a : motion.button;

  return (
    <Component
      href={href}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(base, variants[variant], className)}
      {...rest}
    >
      {children}
    </Component>
  );
}
