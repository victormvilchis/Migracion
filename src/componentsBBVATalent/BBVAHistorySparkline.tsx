import React from 'react';

interface Point { label: string; value: number; }
interface BBVAHistorySparklineProps {
  points: Point[];
  ariaLabel: string;
  suffix?: string;
}

export const BBVAHistorySparkline: React.FC<BBVAHistorySparklineProps> = ({ points, ariaLabel, suffix = '' }) => {
  if (points.length < 2) return null;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const width = 360;
  const height = 96;
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * width;
    const y = height - 8 - ((point.value - min) / range) * (height - 16);
    return { ...point, x, y };
  });
  const path = coords.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  return (
    <div className="w-full" role="img" aria-label={ariaLabel}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full overflow-visible" preserveAspectRatio="none">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2.4" className="text-blue-600 [.bbva-dark_&]:text-cyan-300" vectorEffect="non-scaling-stroke" />
        {coords.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="3" className="fill-white stroke-blue-600 [.bbva-dark_&]:fill-slate-900 [.bbva-dark_&]:stroke-cyan-300"><title>{point.label}: {point.value}{suffix}</title></circle>)}
      </svg>
      <div className="mt-1 flex justify-between text-[8.5px] text-slate-400"><span>{points[0]?.label}</span><span>{points[points.length - 1]?.label}</span></div>
    </div>
  );
};
