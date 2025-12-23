import React, { useMemo } from 'react';
import type { PNode } from '../types';

interface StakeChartProps {
  nodes: PNode[];
}

export const StakeChart: React.FC<StakeChartProps> = ({ nodes }) => {
  const data = useMemo(() => {
    const withStake = nodes
      .filter(n => n.activatedStake && n.activatedStake > 0)
      .sort((a, b) => (b.activatedStake || 0) - (a.activatedStake || 0));

    const total = withStake.reduce((s, n) => s + (n.activatedStake || 0), 0);
    
    return withStake.slice(0, 5).map(n => ({
      id: n.pubkey.slice(0, 6),
      stake: n.activatedStake || 0,
      pct: total > 0 ? Math.round(((n.activatedStake || 0) / total) * 100) : 0,
    }));
  }, [nodes]);

  const colors = ['#00d4aa', '#7c3aed', '#3b82f6', '#f59e0b', '#ef4444'];

  const formatStake = (sol: number) => {
    if (sol >= 1e6) return `${(sol / 1e6).toFixed(1)}M`;
    if (sol >= 1e3) return `${(sol / 1e3).toFixed(0)}K`;
    return sol.toFixed(0);
  };

  if (data.length === 0) {
    return (
      <div className="mini-chart">
        <div className="mini-chart-header">
          <span className="mini-chart-title">Stake</span>
        </div>
        <div className="empty-state-mini">No stake data</div>
      </div>
    );
  }

  return (
    <div className="mini-chart">
      <div className="mini-chart-header">
        <span className="mini-chart-title">Top Stake</span>
      </div>
      <div className="bar-list">
        {data.map((d, i) => (
          <div key={d.id} className="bar-item">
            <span className="bar-label mono">{d.id}…</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${d.pct}%`, background: colors[i] }} />
            </div>
            <span className="bar-value">{formatStake(d.stake)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

