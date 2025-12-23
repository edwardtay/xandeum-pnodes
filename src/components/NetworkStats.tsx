import React, { useMemo } from 'react';
import { Server, Activity, Globe, Cpu } from 'lucide-react';
import type { PNode } from '../types';

interface NetworkStatsProps {
  nodes: PNode[];
}

export const NetworkStats: React.FC<NetworkStatsProps> = ({ nodes }) => {
  const stats = useMemo(() => {
    const pnodes = nodes.filter(n => n.isPNode);
    const healthy = nodes.filter(n => n.health === 'healthy').length;
    
    const versions = new Map<string, number>();
    nodes.forEach(n => {
      const v = n.version || 'unknown';
      versions.set(v, (versions.get(v) || 0) + 1);
    });
    const versionCount = versions.size;
    const topVersion = [...versions.entries()].sort((a, b) => b[1] - a[1])[0];
    
    const countries = new Map<string, number>();
    nodes.forEach(n => {
      if (n.location?.countryCode) {
        countries.set(n.location.countryCode, (countries.get(n.location.countryCode) || 0) + 1);
      }
    });
    const countryCount = countries.size;
    const topCountries = [...countries.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    
    const healthRate = nodes.length ? ((healthy / nodes.length) * 100).toFixed(0) : '0';
    
    return { 
      total: nodes.length,
      pnodeCount: pnodes.length,
      healthy,
      healthRate,
      versionCount,
      topVersion,
      countryCount,
      topCountries,
    };
  }, [nodes]);

  return (
    <div className="network-stats-grid">
      <div className="stat-card-lg">
        <div className="stat-icon-wrap"><Server size={18} /></div>
        <div className="stat-info">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-desc">Total Nodes</span>
        </div>
        <div className="stat-sub">
          <span className="accent">{stats.pnodeCount}</span> pNodes identified
        </div>
      </div>
      
      <div className="stat-card-lg">
        <div className="stat-icon-wrap success"><Activity size={18} /></div>
        <div className="stat-info">
          <span className="stat-number">{stats.healthRate}%</span>
          <span className="stat-desc">Health Rate</span>
        </div>
        <div className="stat-sub">
          <span className="success">{stats.healthy}</span> healthy nodes
        </div>
      </div>
      
      <div className="stat-card-lg">
        <div className="stat-icon-wrap"><Cpu size={18} /></div>
        <div className="stat-info">
          <span className="stat-number">{stats.versionCount}</span>
          <span className="stat-desc">Versions</span>
        </div>
        <div className="stat-sub mono">
          Top: {stats.topVersion?.[0]?.slice(0, 12) || 'n/a'}
        </div>
      </div>
      
      <div className="stat-card-lg">
        <div className="stat-icon-wrap"><Globe size={18} /></div>
        <div className="stat-info">
          <span className="stat-number">{stats.countryCount}</span>
          <span className="stat-desc">Countries</span>
        </div>
        <div className="stat-sub geo-mini">
          {stats.topCountries.slice(0, 3).map(([code]) => (
            <span key={code} className="geo-flag">{getFlagEmoji(code)}</span>
          ))}
        </div>
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
