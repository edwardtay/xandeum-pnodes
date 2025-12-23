import React from 'react';
import { ExternalLink, HardDrive } from 'lucide-react';
import type { PNode } from '../types';

interface NodeTableProps {
  nodes: PNode[];
  loading: boolean;
  onNodeClick: (node: PNode) => void;
}

export const NodeTable: React.FC<NodeTableProps> = ({ 
  nodes, 
  loading, 
  onNodeClick,
}) => {
  const formatStake = (sol: number | undefined) => {
    if (sol === undefined) return '--';
    if (sol >= 1000000) return `${(sol / 1000000).toFixed(1)}M`;
    if (sol >= 1000) return `${(sol / 1000).toFixed(1)}K`;
    return sol.toFixed(0);
  };

  const getFlagEmoji = (countryCode: string): string => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  if (loading && nodes.length === 0) {
    return (
      <div className="table-loading">
        <div className="loading-spinner" />
        <span>Loading nodes from cluster...</span>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="rich-table">
        <thead>
          <tr>
            <th style={{ width: '80px' }}>Status</th>
            <th>Node Identifier</th>
            <th style={{ width: '70px' }}>Latency</th>
            <th style={{ width: '80px' }}>Stake</th>
            <th style={{ width: '90px' }}>Location</th>
            <th style={{ width: '100px' }}>Version</th>
            <th style={{ width: '40px' }}></th>
          </tr>
        </thead>
        <tbody>
          {nodes.map(node => (
            <tr 
              key={node.pubkey} 
              onClick={() => onNodeClick(node)}
              className="clickable-row"
            >
              <td>
                <div className="status-cell">
                  <span className={`badge ${
                    node.health === 'healthy' ? 'badge-success' :
                    node.health === 'unhealthy' ? 'badge-danger' : 'badge-neutral'
                  }`}>
                    {node.health === 'healthy' ? '●' : node.health === 'unhealthy' ? '●' : '○'} {
                      node.health === 'healthy' ? 'OK' : 
                      node.health === 'unhealthy' ? 'ERR' : '—'
                    }
                  </span>
                  {node.isPNode && <span className="badge badge-pnode">P</span>}
                </div>
              </td>
              <td>
                <span className="mono pubkey-cell" title={node.pubkey}>
                  {node.pubkey.slice(0, 8)}...{node.pubkey.slice(-6)}
                </span>
              </td>
              <td className="mono">
                <span className={
                  node.latency !== null 
                    ? (node.latency < 100 ? 'text-success' : node.latency < 300 ? 'text-warning' : 'text-danger') 
                    : 'text-muted'
                }>
                  {node.latency !== null ? `${node.latency}ms` : '--'}
                </span>
              </td>
              <td className="mono">
                <span className="text-muted" title={node.activatedStake ? `${node.activatedStake.toLocaleString()} SOL` : undefined}>
                  {formatStake(node.activatedStake)}
                </span>
              </td>
              <td>
                {node.location ? (
                  <div className="location-cell">
                    <span className="flag">{getFlagEmoji(node.location.countryCode)}</span>
                    <span className="city">{node.location.city}</span>
                  </div>
                ) : (
                  <span className="text-muted">--</span>
                )}
              </td>
              <td className="mono text-dim">{node.version || '--'}</td>
              <td onClick={e => e.stopPropagation()}>
                <a
                  href={`https://explorer.solana.com/address/${node.pubkey}`}
                  target="_blank"
                  rel="noreferrer"
                  className="explorer-link"
                  title="View on Solana Explorer"
                >
                  <ExternalLink size={14} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {nodes.length === 0 && !loading && (
        <div className="empty-state">
          <HardDrive size={32} />
          <p>No nodes found</p>
        </div>
      )}
    </div>
  );
};
