import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check, MapPin, Coins, Activity } from 'lucide-react';
import type { PNode } from '../types';

interface NodeDetailModalProps {
  node: PNode;
  onClose: () => void;
}

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({ node, onClose }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatStake = (sol: number | undefined) => {
    if (sol === undefined) return '--';
    if (sol >= 1000000) return `${(sol / 1000000).toFixed(2)}M SOL`;
    if (sol >= 1000) return `${(sol / 1000).toFixed(2)}K SOL`;
    return `${sol.toFixed(2)} SOL`;
  };

  const getFlagEmoji = (countryCode: string): string => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <h2 className="modal-title">Node Details</h2>
            <div className="modal-badges">
              <span className={`badge ${
                node.health === 'healthy' ? 'badge-success' :
                node.health === 'unhealthy' ? 'badge-danger' : 'badge-neutral'
              }`}>
                {node.health.toUpperCase()}
              </span>
              {node.isPNode && <span className="badge badge-pnode">PNODE</span>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Identity Pubkey */}
          <div className="detail-section">
            <label className="label-xs">Identity Public Key</label>
            <div className="pubkey-display">
              <code className="mono">{node.pubkey}</code>
              <button 
                className="icon-btn" 
                onClick={() => copyToClipboard(node.pubkey, 'pubkey')} 
                title="Copy"
              >
                {copiedField === 'pubkey' ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <a
                href={`https://explorer.solana.com/address/${node.pubkey}`}
                target="_blank"
                rel="noreferrer"
                className="icon-btn"
                title="View on Explorer"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="detail-stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><Activity size={16} /></div>
              <div className="stat-content">
                <span className="label-xs">Latency</span>
                <span className="stat-value">{node.latency !== null ? `${node.latency}ms` : '--'}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon"><Coins size={16} /></div>
              <div className="stat-content">
                <span className="label-xs">Active Stake</span>
                <span className="stat-value">{formatStake(node.activatedStake)}</span>
              </div>
            </div>
          </div>

          {/* Location Section */}
          {node.location && (
            <div className="detail-section">
              <div className="section-header">
                <MapPin size={14} />
                <span className="label-xs">Location</span>
              </div>
              <div className="location-info">
                <span className="location-flag">{getFlagEmoji(node.location.countryCode)}</span>
                <span>{node.location.city}, {node.location.country}</span>
              </div>
            </div>
          )}

          {/* Network Info */}
          <div className="detail-section">
            <label className="label-xs">Network Configuration</label>
            <div className="network-grid">
              <div className="network-item">
                <span className="label-xs">Version</span>
                <span className="mono">{node.version || '--'}</span>
              </div>
              <div className="network-item">
                <span className="label-xs">Gossip Port</span>
                <span className="mono">{node.gossipPort || '--'}</span>
              </div>
              {node.featureSet !== undefined && (
                <div className="network-item">
                  <span className="label-xs">Feature Set</span>
                  <span className="mono">{node.featureSet}</span>
                </div>
              )}
              {node.ip && (
                <div className="network-item">
                  <span className="label-xs">IP Address</span>
                  <span className="mono">{node.ip}</span>
                </div>
              )}
            </div>
          </div>

          {/* Last Updated */}
          <div className="detail-footer">
            <span className="label-xs">
              Last updated: {new Date(node.lastUpdate).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
