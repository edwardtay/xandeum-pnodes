import { useState, useEffect, useCallback, useRef } from 'react';
import type { PNode, NetworkStats, FilterOptions, ConnectionStatus } from '../types';
import { pnodeService } from '../services/pnode';

const DEFAULT_FILTERS: FilterOptions = {
  search: '',
  healthStatus: 'all',
  minLatency: null,
  maxLatency: null,
  versionFilter: '',
  showPNodesOnly: false,
  sortBy: 'health',
  sortOrder: 'desc',
};

export const usePNodes = (refreshInterval: number = 30000) => {
  const [nodes, setNodes] = useState<PNode[]>([]);
  const [stats, setStats] = useState<NetworkStats>({
    totalNodes: 0,
    healthyNodes: 0,
    avgLatency: 0,
    tps: 0,
    currentSlot: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  const refreshIntervalRef = useRef<number | null>(null);

  const enrichNodeWithGeo = useCallback(async (node: PNode, index: number) => {
    if (!node.ip) return;
    
    const location = await pnodeService.getGeoLocation(node.ip);
    if (location) {
      setNodes(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], location };
        }
        return updated;
      });
    }
  }, []);

  const refreshNodes = useCallback(async () => {
    setLoading(true);
    setConnectionStatus('connecting');
    
    try {
      const fetchedNodes = await pnodeService.getPnodeGossip();

      if (fetchedNodes.length === 0) {
        setConnectionStatus('error');
        setLoading(false);
        return;
      }

      setConnectionStatus('connected');

      // Sort by pNode status then health
      const sortedNodes = fetchedNodes.sort((a, b) => {
        // pNodes first
        if (a.isPNode && !b.isPNode) return -1;
        if (!a.isPNode && b.isPNode) return 1;
        // Then by health
        const healthOrder = { healthy: 0, unknown: 1, unhealthy: 2 };
        return healthOrder[a.health] - healthOrder[b.health];
      });

      setNodes(sortedNodes);
      setLastRefresh(new Date());

      // Update stats
      const healthyCount = sortedNodes.filter(n => n.health === 'healthy').length;
      const nodesWithLatency = sortedNodes.filter(n => n.latency !== null);
      const avgLatency = nodesWithLatency.length > 0
        ? Math.round(nodesWithLatency.reduce((acc, n) => acc + (n.latency || 0), 0) / nodesWithLatency.length)
        : 0;

      setStats({
        totalNodes: sortedNodes.length,
        healthyNodes: healthyCount,
        avgLatency,
        tps: 0,
        currentSlot: 0,
      });

      // Enrich with geo data (slower to avoid rate limiting - ip-api allows 45/min)
      const nodesWithIp = sortedNodes.filter(n => n.ip).slice(0, 17);
      for (let i = 0; i < nodesWithIp.length; i++) {
        const node = nodesWithIp[i];
        const idx = sortedNodes.findIndex(n => n.pubkey === node.pubkey);
        await enrichNodeWithGeo(node, idx);
        // Wait 1.5s between requests to stay under rate limit
        if (i < nodesWithIp.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    } catch (error) {
      console.error('Failed to refresh nodes:', error);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  }, [enrichNodeWithGeo]);

  const getFilteredNodes = useCallback((): PNode[] => {
    let filtered = [...nodes];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(n =>
        n.pubkey.toLowerCase().includes(searchLower) ||
        n.version?.toLowerCase().includes(searchLower) ||
        n.location?.city?.toLowerCase().includes(searchLower) ||
        n.ip?.includes(searchLower)
      );
    }

    if (filters.healthStatus !== 'all') {
      filtered = filtered.filter(n => n.health === filters.healthStatus);
    }

    if (filters.showPNodesOnly) {
      filtered = filtered.filter(n => n.isPNode);
    }

    if (filters.versionFilter) {
      filtered = filtered.filter(n => n.version?.includes(filters.versionFilter));
    }

    return filtered;
  }, [nodes, filters]);

  const updateFilter = useCallback(<K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const exportData = useCallback((format: 'json' | 'csv') => {
    const data = getFilteredNodes();
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `xandeum-pnodes-${Date.now()}.json`);
    } else {
      const headers = ['pubkey', 'health', 'ip', 'version', 'isPNode'];
      const rows = data.map(n => [
        n.pubkey,
        n.health,
        n.ip ?? '',
        n.version ?? '',
        n.isPNode ? 'yes' : 'no',
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      downloadBlob(blob, `xandeum-pnodes-${Date.now()}.csv`);
    }
  }, [getFilteredNodes]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Initial load
  useEffect(() => {
    refreshNodes();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    if (refreshInterval > 0) {
      refreshIntervalRef.current = window.setInterval(refreshNodes, refreshInterval);
    }
    
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [refreshInterval, refreshNodes]);

  return {
    nodes,
    filteredNodes: getFilteredNodes(),
    stats,
    loading,
    filters,
    connectionStatus,
    lastRefresh,
    refreshNodes,
    updateFilter,
    resetFilters,
    exportData,
  };
};
