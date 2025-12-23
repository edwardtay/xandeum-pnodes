import React, { useMemo } from 'react';
import { Globe } from 'lucide-react';
import type { PNode } from '../types';

interface GeoChartProps {
  nodes: PNode[];
}

export const GeoChart: React.FC<GeoChartProps> = ({ nodes }) => {
  const geoData = useMemo(() => {
    const countries = new Map<string, { count: number; code: string; name: string }>();
    
    nodes.forEach(n => {
      if (n.location?.countryCode) {
        const existing = countries.get(n.location.countryCode);
        if (existing) {
          existing.count++;
        } else {
          countries.set(n.location.countryCode, {
            count: 1,
            code: n.location.countryCode,
            name: n.location.country || n.location.countryCode,
          });
        }
      }
    });
    
    return [...countries.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [nodes]);

  const maxCount = Math.max(...geoData.map(d => d.count), 1);
  const total = geoData.reduce((sum, d) => sum + d.count, 0);

  if (geoData.length === 0) {
    return (
      <div className="mini-chart">
        <div className="mini-chart-header">
          <span className="mini-chart-title">Geographic Distribution</span>
        </div>
        <div className="empty-state-mini">
          <Globe size={20} className="spin-slow" />
          <p>Loading geo data...</p>
        </div>
      </div>
    );
  }

  const colors = [
    'var(--accent-primary)',
    'var(--accent-tertiary)',
    'var(--accent-secondary)',
    'var(--success)',
    'var(--warning)',
    '#ec4899',
  ];

  return (
    <div className="mini-chart">
      <div className="mini-chart-header">
        <span className="mini-chart-title">Geographic Distribution</span>
      </div>
      <div className="bar-list">
        {geoData.map((item, i) => {
          const pct = ((item.count / total) * 100).toFixed(0);
          return (
            <div key={item.code} className="bar-item">
              <span className="bar-label">
                {getFlagEmoji(item.code)} {item.code}
              </span>
              <div className="bar-track">
                <div 
                  className="bar-fill" 
                  style={{ 
                    width: `${(item.count / maxCount) * 100}%`,
                    background: colors[i % colors.length],
                  }} 
                />
              </div>
              <span className="bar-value">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
