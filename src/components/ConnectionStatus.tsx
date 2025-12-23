import React from 'react';
import { Wifi, WifiOff, Loader, Database } from 'lucide-react';
import type { ConnectionStatus as ConnectionStatusType } from '../types';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  lastRefresh: Date | null;
  rpcSource?: string | null;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, lastRefresh, rpcSource }) => {
  const statusConfig = {
    connected: { icon: Wifi, color: 'var(--success)', label: 'Connected' },
    connecting: { icon: Loader, color: 'var(--warning)', label: 'Connecting...' },
    disconnected: { icon: WifiOff, color: 'var(--text-dim)', label: 'Disconnected' },
    error: { icon: WifiOff, color: 'var(--danger)', label: 'Connection Error' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  // Extract domain from RPC source for display
  const getRpcDomain = (url: string | null | undefined): string | null => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('api.', '').replace('www.', '');
    } catch {
      // Handle non-URL strings
      return url.split('/')[0];
    }
  };
  const rpcDomain = getRpcDomain(rpcSource);

  return (
    <div className="connection-status">
      <div className="status-indicator" style={{ color: config.color }}>
        <Icon size={12} className={status === 'connecting' ? 'spin' : ''} />
        <span>{config.label}</span>
      </div>
      {rpcDomain && status === 'connected' && (
        <div className="rpc-source" title={rpcSource || ''}>
          <Database size={10} />
          <span>{rpcDomain}</span>
        </div>
      )}
      {lastRefresh && (
        <span className="last-refresh">
          Updated {formatTimeAgo(lastRefresh)}
        </span>
      )}
    </div>
  );
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return date.toLocaleTimeString();
}
