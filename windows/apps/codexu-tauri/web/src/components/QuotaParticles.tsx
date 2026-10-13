import { useMemo, type CSSProperties } from 'react';

// Match the macOS flow: independent phases, speeds and offsets; only fast dots have a dotted tail.
const STYLES = [
  [0.04, 0.095, -2.8, 1.3, 0.52], [0.24, 0.122, 2.5, 2.2, 0.78],
  [0.45, 0.076, -0.4, 2.9, 0.90], [0.66, 0.274, 3.0, 1.2, 0.46],
  [0.86, 0.104, -2.0, 1.8, 0.66], [0.14, 0.083, 0.9, 2.5, 0.82],
  [0.56, 0.116, -3.1, 1.4, 0.50], [0.34, 0.068, 1.7, 0.9, 0.38],
  [0.74, 0.154, -1.2, 2.0, 0.72], [0.94, 0.111, 2.1, 1.1, 0.58],
  [0.51, 0.126, -2.4, 1.7, 0.64], [0.09, 0.142, 1.4, 1.5, 0.62],
  [0.19, 0.091, -1.8, 1.0, 0.44], [0.29, 0.182, 2.7, 1.8, 0.70],
  [0.62, 0.073, -0.8, 2.3, 0.76], [0.81, 0.133, -2.6, 1.2, 0.54],
  [0.99, 0.108, 1.9, 1.6, 0.60],
] as const;

export function QuotaParticles({ remaining, diameter, stroke, lane }: {
  remaining: number; diameter: number; stroke: number; lane: number;
}) {
  const particles = useMemo(() => {
    const progress = remaining / 100;
    if (progress <= 0.02) return [];
    const maximum = lane === 0 ? 17 : 12;
    const count = Math.min(maximum, Math.max(1, Math.ceil(maximum * Math.min(1, progress * 1.5))));
    const styles = STYLES.slice(0, count);
    const durationFor = (speed: number) => Math.max(1.6, progress / (speed * (0.45 + progress * 1.1)));
    const fast = new Set(styles.map((style, index) => ({ index, speed: progress / durationFor(style[1]) }))
      .sort((a, b) => b.speed - a.speed).slice(0, Math.max(1, Math.round(count * 0.3))).map(item => item.index));
    return styles.flatMap(([phase, speed, offset, size, opacity], index) => {
      const radius = (diameter - stroke) / 2 + offset;
      const steps = Math.max(16, Math.ceil(progress * 120));
      const points = Array.from({ length: steps + 1 }, (_, step) => {
        const angle = -Math.PI / 2 + progress * (1 - step / steps) * Math.PI * 2;
        return `${(diameter / 2 + Math.cos(angle) * radius).toFixed(3)} ${(diameter / 2 + Math.sin(angle) * radius).toFixed(3)}`;
      });
      const path = `path("M ${points.join(' L ')}")`;
      const duration = durationFor(speed);
      const tails = fast.has(index) ? [[0.40, 0.12, 0.135], [0.58, 0.24, 0.090], [0.78, 0.42, 0.045]] : [];
      return [...tails, [1, 1, 0]].map(([sizeScale, opacityScale, lag], tail) => ({
        key: `${index}-${tail}`,
        style: { '--flow-path': path, '--flow-size': `${size * sizeScale}px`,
          '--flow-opacity': opacity * opacityScale, '--flow-duration': `${duration}s`,
          '--flow-delay': `${-(((duration * ((phase + lane * 0.31) % 1) - lag) % duration + duration) % duration)}s`,
        } as CSSProperties,
      }));
    });
  }, [remaining, diameter, stroke, lane]);
  return <span className="quota-flow-particles" aria-hidden="true">
    {particles.map(particle => <span className="quota-flow-dot" key={particle.key} style={particle.style} />)}
  </span>;
}
