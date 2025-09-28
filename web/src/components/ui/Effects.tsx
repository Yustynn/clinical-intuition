import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme } from '../../utils/theme';

interface GradientFlashProps {
  colorA: string;
  colorB: string;
}

export const GradientFlash: React.FC<GradientFlashProps> = ({ colorA, colorB }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.18 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.18 }}
    className="absolute inset-0"
    style={{ background: `linear-gradient(135deg, ${colorA}, ${colorB})` }}
  />
);

interface ScorePopProps {
  show: boolean;
  text?: string;
  theme: Theme;
}

export const ScorePop: React.FC<ScorePopProps> = ({ show, text = '+1', theme }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ y: 6, opacity: 0, scale: 0.8 }}
        animate={{ y: -24, opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className={`absolute left-1/2 top-4 -translate-x-1/2 ${theme.font} text-amber-500 font-bold`}
      >
        {text}
      </motion.div>
    )}
  </AnimatePresence>
);

interface EmojiBurstProps {
  trigger: boolean;
}

export const EmojiBurst: React.FC<EmojiBurstProps> = ({ trigger }) => {
  const emojis = ['🎉', '🧠', '👍', '⭐', '🧪'];

  return (
    <AnimatePresence>
      {trigger && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-2xl"
              initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
              animate={{
                opacity: [0, 1, 0],
                x: (Math.random() * 2 - 1) * 160,
                y: -80 - Math.random() * 160,
                rotate: Math.random() * 180,
              }}
              transition={{
                duration: 0.9 + Math.random() * 0.3,
                ease: 'easeOut',
              }}
              style={{ left: '50%', top: '50%' }}
            >
              {emojis[i % emojis.length]}
            </motion.span>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

interface ParticlePoint {
  id: number;
  x: number;
  y: number;
}

interface ParticleTrailProps {
  points: ParticlePoint[];
}

export const ParticleTrail: React.FC<ParticleTrailProps> = ({ points }) => (
  <>
    {points.map((p) => (
      <motion.span
        key={p.id}
        className="pointer-events-none absolute"
        style={{
          left: p.x,
          top: p.y,
          width: 6,
          height: 6,
          background: 'currentColor',
        }}
        initial={{ opacity: 0.6, scale: 1 }}
        animate={{ opacity: 0, scale: 0 }}
        transition={{ duration: 0.5 }}
      />
    ))}
  </>
);