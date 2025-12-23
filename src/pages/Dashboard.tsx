import React, { useState, useMemo, useRef } from 'react';
import {
  RefreshCw,
  Download,
  Sun,
  Moon,
  Settings,
  AlertCircle,
  Filter,
  X,
  Shield,
} from 'lucide-react';
import { usePNodes } from '../hooks/usePNodes';
import { useTheme } from '../hooks/useTheme';
import { SearchFilter } from '../components/SearchFilter';
import { NodeTable } from '../components/NodeTable';
import { NodeDetailModal } from '../components/NodeDetailModal';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { VersionChart } from '../components/VersionChart';
import { StakeChart } from '../components/StakeChart';
import { NetworkStats } from '../components/NetworkStats';
import { GeoChart } from '../components/GeoChart';
import { pnodeService } from '../services/pnode';
import type { PNode } from '../types';

export const Dashboard: React.FC = () => {
  const {
    filteredNodes,
    loading,
    filters,
    connectionStatus,
    lastRefresh,
    refreshNodes,
    updateFilter,
    resetFilters,
    exportData,
    nodes,
  } = usePNodes(30000);
  
  const { theme, toggleTheme } = useTheme();
  const [selectedNode, setSelectedNode] = useState<PNode | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showLimitations, setShowLimitations] = useState(true);
  const [rpcEndpoint, setRpcEndpoint] = useState(pnodeService.getCentralRpcEndpoint() || '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const knownAddresses = pnodeService.getKnownAddresses();

  const handleSaveRpcEndpoint = () => {
    pnodeService.setCentralRpcEndpoint(rpcEndpoint.trim() || null);
    refreshNodes();
  };

  const versions = useMemo(() => {
    const versionSet = new Set(nodes.map(n => n.version).filter(Boolean) as string[]);
    return Array.from(versionSet).sort();
  }, [nodes]);

  const pnodeCount = nodes.filter(n => n.isPNode).length;
  const filteredPnodeCount = filteredNodes.filter(n => n.isPNode).length;

  return (
    <div className="dashboard minimal">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="logo">
            <span className="logo-accent">XANDEUM</span>
            <span className="logo-sub">pNode Analytics</span>
          </h1>
          <ConnectionStatus 
            status={connectionStatus} 
            lastRefresh={lastRefresh} 
            rpcSource={pnodeService.getCentralRpcEndpoint()}
          />
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setShowConfig(true)} title="Settings">
            <Settings size={14} />
          </button>
          <button className="icon-btn" onClick={toggleTheme} title="Theme">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          
          <div className="export-dropdown">
            <button className="btn-ghost" onClick={() => setShowExportMenu(!showExportMenu)} title="Export">
              <Download size={14} />
            </button>
            {showExportMenu && (
              <div className="dropdown-menu">
                <button onClick={() => { exportData('json'); setShowExportMenu(false); }}>JSON</button>
                <button onClick={() => { exportData('csv'); setShowExportMenu(false); }}>CSV</button>
              </div>
            )}
          </div>
          
          <button onClick={refreshNodes} disabled={loading} className="btn-primary compact">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {connectionStatus === 'error' && nodes.length === 0 && (
        <div className="error-banner compact">
          <AlertCircle size={14} />
          <span>Unable to fetch nodes</span>
          <button onClick={() => setShowConfig(true)}>Configure RPC</button>
        </div>
      )}

      {/* Data Transparency Banner */}
      {showLimitations && (
        <div className="info-banner limitations">
          <Shield size={16} />
          <div className="limitations-content">
            <strong>100% Real Data</strong> — All data from live Xandeum RPC. 
            <span className="limitations-detail">
              pNode RPC ports (9001) are firewalled; storage/uptime stats unavailable via public API.
            </span>
          </div>
          <button className="dismiss-btn" onClick={() => setShowLimitations(false)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <NetworkStats nodes={nodes} />

      {/* Filter Bar */}
      <div className="filter-bar">
        <SearchFilter
          filters={filters}
          onFilterChange={updateFilter}
          onReset={resetFilters}
          versions={versions}
          searchInputRef={searchInputRef}
        />
        <button 
          className={`filter-toggle ${filters.showPNodesOnly ? 'active' : ''}`}
          onClick={() => updateFilter('showPNodesOnly', !filters.showPNodesOnly)}
          title="Show pNodes only"
        >
          <Filter size={14} />
          pNodes Only
        </button>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <VersionChart nodes={filteredNodes} />
        <GeoChart nodes={nodes} />
        <StakeChart nodes={filteredNodes} />
      </div>

      {/* Results Header */}
      <div className="results-header">
        <span className="results-count">
          {filteredNodes.length} node{filteredNodes.length !== 1 ? 's' : ''}
          {filters.showPNodesOnly && ` (${filteredPnodeCount} pNodes)`}
        </span>
      </div>

      {/* Node Table */}
      <NodeTable
        nodes={filteredNodes}
        loading={loading}
        onNodeClick={setSelectedNode}
      />

      {/* Node Detail Modal */}
      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Config Modal */}
      {showConfig && (
        <div className="modal-overlay" onClick={() => setShowConfig(false)}>
          <div className="modal-content endpoint-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Configuration</h2>
            </div>
            <div className="modal-body">
              <div className="config-section">
                <label className="config-label">RPC Endpoint</label>
                <p className="endpoint-help">
                  pNodes are discovered via Solana cluster gossip network.
                </p>
                <input
                  type="text"
                  value={rpcEndpoint}
                  onChange={(e) => setRpcEndpoint(e.target.value)}
                  placeholder="https://api.mainnet-beta.solana.com"
                  className="endpoint-input"
                />
                <div className="config-actions">
                  <button className="btn-secondary" onClick={handleSaveRpcEndpoint}>
                    Save & Refresh
                  </button>
                  <button className="btn-ghost" onClick={() => {
                    setRpcEndpoint('https://api.mainnet-beta.solana.com');
                    pnodeService.setCentralRpcEndpoint('https://api.mainnet-beta.solana.com');
                    refreshNodes();
                  }}>
                    Reset Default
                  </button>
                </div>
              </div>

              <div className="config-section">
                <label className="config-label">Network Summary</label>
                <div className="config-summary">
                  <div className="summary-item">
                    <span className="summary-value">{nodes.length}</span>
                    <span className="summary-label">Total Nodes</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-value accent">{pnodeCount}</span>
                    <span className="summary-label">pNodes</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-value">{knownAddresses.length}</span>
                    <span className="summary-label">Reference IPs</span>
                  </div>
                </div>
              </div>

              <div className="config-section">
                <label className="config-label">Known pNode IPs</label>
                <div className="pnode-address-list compact">
                  {knownAddresses.map((addr, i) => (
                    <div key={i} className="pnode-address-item">
                      <span className="mono">{addr}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="endpoint-actions">
                <button className="btn-primary" onClick={() => setShowConfig(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
