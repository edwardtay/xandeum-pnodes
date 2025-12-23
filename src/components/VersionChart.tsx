import React, { useMemo } from 'react';
import type { PNode } from '../types';

interface VersionChartProps {
  nodes: PNode[];
}

export const VersionChart: React.FC<VersionChartProps> = ({ nodes }) => {
  const versionStats = useMemo(() => {
    const counts = new Map<string, number>();
    nodes.forEach(node => {
      const version = node.version || 'n/a';
      counts.set(version, (counts.get(version) || 0) + 1);
    });

    const total = nodes.length;
    return Array.from(counts.entries())
      .map(([version, count]) => ({
        version: version.length > 12 ? version.slice(0, 12) + '…' : version,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [nodes]);

  const colors = ['#00d4aa', '#7c3aed', '#3b82f6', '#f59e0b', '#6b7280'];

  return (
    <div className="mini-chart">
      <div className="mini-chart-header">
        <span className="mini-chart-title">Versions</span>
      </div>
      <div className="bar-list">
        {versionStats.map((stat, i) => (
          <div key={stat.version} className="bar-item">
            <span className="bar-label mono">{stat.version}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${stat.pct}%`, background: colors[i] }} />
            </div>
            <span className="bar-value">{stat.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
