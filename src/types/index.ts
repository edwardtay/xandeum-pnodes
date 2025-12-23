export interface PNode {
  pubkey: string;
  gossipPort: number;
  tpuPort: number;
  rpcPort: number;
  version: string | null;
  health: 'healthy' | 'unhealthy' | 'unknown';
  latency: number | null;
  lastUpdate: number;
  isPNode: boolean;
  ip?: string;
  storageCapacity?: number;
  storageUsed?: number;
  stake?: number;
  rewards?: number;
  uptime?: number;
  location?: GeoLocation;
  featureSet?: number;
  shredVersion?: number;
  voteAccount?: string;
  epochCredits?: number;
  lastVote?: number;
  rootSlot?: number;
  delinquent?: boolean;
  activatedStake?: number;
  commission?: number;
  skipRate?: number;
  score?: number;
}

export interface GeoLocation {
  country: string;
  countryCode: string;
  city: string;
  lat: number;
  lon: number;
}

export interface NetworkStats {
  totalNodes: number;
  healthyNodes: number;
  avgLatency: number;
  tps: number;
  currentSlot: number;
  totalStorage?: number;
  usedStorage?: number;
  totalStake?: number;
  epoch?: number;
  epochProgress?: number;
  blockHeight?: number;
  slotsInEpoch?: number;
  slotIndex?: number;
}

export interface HistoricalDataPoint {
  timestamp: number;
  tps: number;
  latency: number;
  healthyNodes: number;
  slot: number;
}

export interface FilterOptions {
  search: string;
  healthStatus: 'all' | 'healthy' | 'unhealthy' | 'unknown';
  minLatency: number | null;
  maxLatency: number | null;
  versionFilter: string;
  showPNodesOnly: boolean;
  sortBy: 'pubkey' | 'latency' | 'health' | 'version' | 'uptime' | 'storage' | 'stake' | 'score';
  sortOrder: 'asc' | 'desc';
}

export interface AppSettings {
  refreshInterval: number;
  enableNotifications: boolean;
  favoriteNodes: string[];
  compareNodes: string[];
}

export interface VersionStats {
  version: string;
  count: number;
  percentage: number;
}

export interface StakeDistribution {
  pubkey: string;
  stake: number;
  percentage: number;
}

export type Theme = 'dark' | 'light';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

// URL state for sharing
export interface URLState {
  search?: string;
  health?: string;
  version?: string;
  pnodesOnly?: boolean;
  sortBy?: string;
  sortOrder?: string;
  view?: 'table' | 'map';
  compare?: string[];
}
