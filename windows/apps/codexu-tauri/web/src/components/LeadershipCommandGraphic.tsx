import { useId, type CSSProperties } from 'react';
import { useVisualActivity } from '../hooks/useVisualActivity';

const RADII = [30, 46, 62];
const VELOCITIES = [0.34, -0.23, 0.16];
const DASHES = [undefined, '5 3', '8 3 2 3'];
const COLORS = [
  ['var(--accent-light)', 'var(--accent-strong)', 'var(--accent-secondary)'],
  ['var(--accent-secondary)', 'var(--accent-highlight)', 'var(--accent)'],
  ['var(--accent)', 'var(--accent-secondary-strong)', 'var(--accent-highlight)'],
];

export function LeadershipCommandGraphic({ level, agentCount }: { level: number; agentCount: number | null }) {
  const id = useId().replace(/:/g, '');
  const { ref, active } = useVisualActivity<HTMLDivElement>();
  const ringCount = level <= 0 ? 0 : level === 1 ? 1 : level <= 4 ? 2 : 3;
  const nodeCount = ringCount && agentCount != null && Number.isFinite(agentCount) ? Math.min(12, Math.max(0, Math.floor(agentCount))) : 0;
  const rings = RADII.slice(0, ringCount);
  return <div className="leadership-command-graphic" ref={ref} data-ring-count={ringCount} data-motion={active && ringCount > 0 ? 'active' : 'static'}>
    <svg viewBox="0 0 145 145" aria-hidden="true">
      <defs>{rings.map((_, index) => <linearGradient id={`${id}-${index}`} key={index} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
        {COLORS[index].map((color, stop) => <stop key={stop} offset={`${stop * 50}%`} stopColor={color} />)}
      </linearGradient>)}</defs>
      <g className="leadership-command-glow">{rings.map((radius, index) => <circle key={radius} cx="72.5" cy="72.5" r={radius}
        fill="none" stroke={`url(#${id}-${index})`} strokeWidth={4.8 + index * 0.9} />)}</g>
      {active && ringCount > 0 ? <g className="leadership-command-breath">{rings.map((radius, index) => <circle key={radius} cx="72.5" cy="72.5" r={radius}
        fill="none" stroke={`url(#${id}-${index})`} strokeWidth={6.2 + index * 0.9} />)}</g> : null}
      {rings.map((radius, index) => <g key={radius} className="leadership-command-track">
        <circle cx="72.5" cy="72.5" r={radius} fill="none" stroke={`url(#${id}-${index})`} strokeWidth={3.2 + index * 0.55} opacity={0.2 + (index + 1) / ringCount * 0.06} />
        <circle cx="72.5" cy="72.5" r={radius} fill="none" stroke={`url(#${id}-${index})`} strokeWidth={1.7 + index * 0.38} strokeDasharray={DASHES[index]} strokeLinecap="round" />
      </g>)}
      {rings.map((radius, lane) => {
        const count = Math.ceil((nodeCount - lane) / ringCount);
        const velocity = VELOCITIES[lane];
        const style = { '--orbit-duration': `${Math.PI * 2 / Math.abs(velocity)}s`, '--orbit-direction': velocity < 0 ? 'reverse' : 'normal',
          '--node-color': COLORS[lane][2] } as CSSProperties;
        return <g key={`${lane}-${active}`} className={`leadership-command-nodes ${active && count > 0 ? 'leadership-command-nodes-moving' : ''}`} style={style}>
          {Array.from({ length: Math.max(0, count) }, (_, slot) => {
            const angle = -Math.PI / 2 + lane * 0.54 + slot / count * Math.PI * 2;
            const x = 72.5 + Math.cos(angle) * radius, y = 72.5 + Math.sin(angle) * radius;
            const size = lane === ringCount - 1 ? 4 : 3.5;
            return <g className="leadership-command-node" key={slot}>
              <circle cx={x} cy={y} r={size + 5} fill="var(--node-color)" opacity="0.1" />
              <circle cx={x} cy={y} r={size + 2.8} fill="var(--node-color)" opacity="0.22" />
              <circle cx={x} cy={y} r={size + 1.5} fill="none" stroke="var(--ornament-highlight)" strokeOpacity="0.82" strokeWidth="1.15" />
              <circle cx={x} cy={y} r={size} fill="var(--node-color)" />
              <circle cx={x - 0.25} cy={y - 0.75} r="1.05" fill="var(--data-flow-particle)" opacity="0.88" />
            </g>;
          })}
        </g>;
      })}
    </svg>
  </div>;
}
