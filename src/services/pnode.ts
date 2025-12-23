import type { PNode, GeoLocation } from '../types';

// Known pNode addresses on port 9001
// These are reference IPs - direct RPC access is typically firewalled
// Used for matching nodes discovered via Solana cluster RPC
const KNOWN_PNODE_ADDRESSES = [
  '157.173.125.223:9001',
  '157.173.197.106:9001',
  '161.156.85.177:9001',
  '194.238.24.91:9001',
  '157.173.197.103:9001',
  '194.238.24.87:9001',
  '154.38.175.38:9001',
  '194.238.24.94:9001',
  '194.238.24.96:9001',
  '37.60.250.209:9001',
  '37.60.255.42:9001',
  '194.238.24.95:9001',
  '38.242.207.242:9001',
  '109.199.96.218:9001',
  '194.238.24.97:9001',
  '160.202.38.95:9001',
];

// RPC endpoints to try
// Priority: Xandeum devnet (actual Xandeum network) > Solana mainnet (for pNodes in gossip)
const XANDEUM_RPC_ENDPOINTS = [
  'http://xand-rpc2.devnet.xandeum.com:8899',  // Xandeum devnet - returns actual Xandeum vNodes
  'https://api.mainnet-beta.solana.com',       // Solana mainnet - filter for Xandeum version patterns
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://rpc.ankr.com/solana',
];

const STORAGE_KEY = 'xandeum-custom-pnodes';
const RPC_ENDPOINT_KEY = 'xandeum-rpc-endpoint';

// Local proxy server (run: node proxy-server.js)
const LOCAL_PROXY = 'http://localhost:3002/proxy/';

export class PNodeService {
  private customPNodes: string[] = [];
  private isConnected: boolean = false;
  private localProxyAvailable: boolean | null = null;
  private centralRpcEndpoint: string | null = null;
  private lastError: string | null = null;

  constructor() {
    // Load any custom pNode addresses
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.customPNodes = JSON.parse(saved);
      } catch {
        this.customPNodes = [];
      }
    }
    
    // Load saved RPC endpoint
    this.centralRpcEndpoint = localStorage.getItem(RPC_ENDPOINT_KEY);
    
    // Check if local proxy is available
    this.checkLocalProxy();
  }

  private async checkLocalProxy(): Promise<void> {
    try {
      const response = await fetch('http://localhost:3002/health', { 
        signal: AbortSignal.timeout(2000),
      });
      this.localProxyAvailable = response.ok;
      console.log('Local proxy available:', this.localProxyAvailable);
    } catch {
      this.localProxyAvailable = false;
      console.log('Local proxy not available');
    }
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getCorsProxy(): string {
    return LOCAL_PROXY;
  }

  isLocalProxyAvailable(): boolean {
    return this.localProxyAvailable === true;
  }

  setCentralRpcEndpoint(endpoint: string | null) {
    this.centralRpcEndpoint = endpoint;
    if (endpoint) {
      localStorage.setItem(RPC_ENDPOINT_KEY, endpoint);
    } else {
      localStorage.removeItem(RPC_ENDPOINT_KEY);
    }
  }

  getCentralRpcEndpoint(): string | null {
    return this.centralRpcEndpoint;
  }

  addCustomPNode(address: string) {
    if (!this.customPNodes.includes(address) && !KNOWN_PNODE_ADDRESSES.includes(address)) {
      this.customPNodes.push(address);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customPNodes));
    }
  }

  removeCustomPNode(address: string) {
    this.customPNodes = this.customPNodes.filter(a => a !== address);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customPNodes));
  }

  getAllPNodeAddresses(): string[] {
    return [...KNOWN_PNODE_ADDRESSES, ...this.customPNodes];
  }

  getEndpoint(): string {
    return `${KNOWN_PNODE_ADDRESSES.length} known pNodes`;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Make an RPC call to a specific pNode address
   */
  private async rpcCallToNode<T>(
    address: string, 
    method: string, 
    params: unknown[] = [],
    timeout: number = 12000
  ): Promise<{ result: T | null; latency: number }> {
    const start = performance.now();
    
    const rpcBody = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    });

    // Try local proxy first if available
    if (this.localProxyAvailable !== false) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(LOCAL_PROXY + address, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: rpcBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latency = Math.round(performance.now() - start);

        if (response.ok) {
          const data = await response.json();
          if (!data.error) {
            this.localProxyAvailable = true;
            return { result: data.result as T, latency };
          }
          if (data.error?.code !== -32601) {
            console.warn(`RPC error from ${address} for ${method}:`, data.error);
          }
          return { result: null, latency };
        }
      } catch (error) {
        // Local proxy not available, mark it
        if (this.localProxyAvailable === null) {
          this.localProxyAvailable = false;
        }
      }
    }

    // Fallback: try direct request (will fail due to CORS but worth trying)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`http://${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rpcBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - start);

      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          return { result: data.result as T, latency };
        }
      }
    } catch {
      // Expected to fail due to CORS
    }

    return { result: null, latency: Math.round(performance.now() - start) };
  }

  /**
   * Check if a version string indicates a Xandeum node
   * Xandeum pNodes have distinctive version patterns like "0.806.30102", "0.714.30008"
   * Xandeum vNodes (devnet) have versions like "2.2.0-7c3f39e8"
   * These differ from standard Solana versions (e.g., "3.0.12", "2.3.8")
   */
  private isXandeumVersion(version: string | null | undefined): boolean {
    if (!version) return false;
    // Xandeum pNode versions: start with 0. and have a 5-digit patch number
    // e.g., "0.806.30102", "0.714.30008"
    const pnodePattern = /^0\.\d{3}\.\d{5}$/;
    // Xandeum vNode versions (devnet): have a git hash suffix
    // e.g., "2.2.0-7c3f39e8", "2.2.0-b5a94688"
    const vnodePattern = /^\d+\.\d+\.\d+-[a-f0-9]{8}$/;
    return pnodePattern.test(version) || vnodePattern.test(version);
  }

  /**
   * Try to get cluster nodes from a central RPC endpoint
   * Filters for Xandeum pNodes based on version patterns
   */
  private async tryGetClusterNodesFromRpc(): Promise<PNode[] | null> {
    const endpoints = this.centralRpcEndpoint 
      ? [this.centralRpcEndpoint, ...XANDEUM_RPC_ENDPOINTS]
      : XANDEUM_RPC_ENDPOINTS;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getClusterNodes',
            params: [],
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) continue;

        const data = await response.json();
        if (data.error || !Array.isArray(data.result)) continue;

        console.log(`Got ${data.result.length} total nodes from ${endpoint}`);
        this.centralRpcEndpoint = endpoint;
        localStorage.setItem(RPC_ENDPOINT_KEY, endpoint);

        // Filter for Xandeum pNodes based on version pattern
        const allNodes = data.result as Array<{
          pubkey?: string;
          gossip?: string;
          tpu?: string;
          rpc?: string;
          version?: string;
          featureSet?: number;
          shredVersion?: number;
        }>;

        // First, find Xandeum-specific nodes by version
        const xandeumNodes = allNodes.filter(node => this.isXandeumVersion(node.version));
        
        // Also check if any of our known pNode IPs are in the cluster
        const knownIps = new Set(KNOWN_PNODE_ADDRESSES.map(addr => addr.split(':')[0]));
        const knownIpNodes = allNodes.filter(node => {
          const ip = node.gossip?.split(':')[0] || node.rpc?.split(':')[0];
          return ip && knownIps.has(ip);
        });

        // Combine both sets (Xandeum version nodes + known IP nodes)
        const combinedNodes = new Map<string, typeof allNodes[0]>();
        for (const node of [...xandeumNodes, ...knownIpNodes]) {
          if (node.pubkey) {
            combinedNodes.set(node.pubkey, node);
          }
        }

        const pnodes = Array.from(combinedNodes.values());
        console.log(`Found ${pnodes.length} Xandeum pNodes (${xandeumNodes.length} by version, ${knownIpNodes.length} by known IP)`);

        if (pnodes.length === 0) {
          // If no Xandeum nodes found, return all nodes for debugging
          console.log('No Xandeum pNodes found, returning all cluster nodes');
          return allNodes.map(node => this.mapClusterNodeToPNode(node));
        }

        return pnodes.map(node => this.mapClusterNodeToPNode(node));
      } catch (error) {
        console.debug(`Failed to get cluster nodes from ${endpoint}:`, error);
      }
    }
    return null;
  }

  /**
   * Map a cluster node response to our PNode type
   */
  private mapClusterNodeToPNode(node: {
    pubkey?: string;
    gossip?: string;
    tpu?: string;
    rpc?: string;
    version?: string;
    featureSet?: number;
    shredVersion?: number;
  }): PNode {
    const gossipParts = node.gossip?.split(':') || [];
    const rpcParts = node.rpc?.split(':') || [];
    const ip = gossipParts[0] || rpcParts[0] || '';
    
    return {
      pubkey: node.pubkey || '',
      gossipPort: gossipParts[1] ? parseInt(gossipParts[1]) : 0,
      tpuPort: node.tpu ? parseInt(node.tpu.split(':')[1]) : 0,
      rpcPort: rpcParts[1] ? parseInt(rpcParts[1]) : 9001,
      version: node.version || null,
      health: 'healthy' as const,
      latency: null,
      lastUpdate: Date.now(),
      isPNode: this.isXandeumVersion(node.version),
      ip,
      featureSet: node.featureSet,
      shredVersion: node.shredVersion,
    };
  }

  /**
   * Query all known pNodes directly and get their info
   * This queries each pNode address on port 9001
   */
  async getPnodeGossip(): Promise<PNode[]> {
    this.lastError = null;

    // First, try to get nodes from a central RPC endpoint
    const rpcNodes = await this.tryGetClusterNodesFromRpc();
    if (rpcNodes && rpcNodes.length > 0) {
      this.isConnected = true;
      return rpcNodes;
    }

    // Fallback: query known pNode addresses directly
    const addresses = this.getAllPNodeAddresses();
    const nodes: PNode[] = [];
    let connectedCount = 0;

    // Query all pNodes in parallel with a concurrency limit
    const batchSize = 8;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (address) => {
          const [ip, portStr] = address.split(':');
          const port = parseInt(portStr) || 9001;
          
          // Try multiple RPC methods to get node info
          let health: 'healthy' | 'unhealthy' | 'unknown' = 'unknown';
          let version: string | null = null;
          let identity: string | null = null;
          let latency: number | null = null;
          let clusterNodes: unknown[] | null = null;

          // Try getHealth
          const healthResult = await this.rpcCallToNode<string | { status: string }>(address, 'getHealth');
          if (healthResult.result !== null) {
            connectedCount++;
            latency = healthResult.latency;
            if (healthResult.result === 'ok' || 
                (typeof healthResult.result === 'object' && healthResult.result?.status === 'ok')) {
              health = 'healthy';
            } else {
              health = 'unhealthy';
            }
          }

          // Try getVersion
          const versionResult = await this.rpcCallToNode<{ 'solana-core'?: string; version?: string; 'feature-set'?: number }>(
            address, 'getVersion'
          );
          if (versionResult.result) {
            version = versionResult.result['solana-core'] || versionResult.result.version || null;
            if (latency === null) latency = versionResult.latency;
            if (health === 'unknown') health = 'healthy';
            connectedCount++;
          }

          // Try getIdentity
          const identityResult = await this.rpcCallToNode<{ identity?: string; pubkey?: string }>(
            address, 'getIdentity'
          );
          if (identityResult.result) {
            identity = identityResult.result.identity || identityResult.result.pubkey || null;
            if (latency === null) latency = identityResult.latency;
            if (health === 'unknown') health = 'healthy';
          }

          // Try getClusterNodes to discover more nodes
          const clusterResult = await this.rpcCallToNode<unknown[]>(address, 'getClusterNodes');
          if (clusterResult.result && Array.isArray(clusterResult.result)) {
            clusterNodes = clusterResult.result;
            if (health === 'unknown') health = 'healthy';
          }

          // Generate a pubkey from identity or address
          const pubkey = identity || `pnode-${ip.replace(/\./g, '-')}-${port}`;

          return {
            node: {
              pubkey,
              gossipPort: port,
              tpuPort: 0,
              rpcPort: port,
              version,
              health,
              latency,
              lastUpdate: Date.now(),
              isPNode: true,
              ip,
            } as PNode,
            clusterNodes,
            reachable: health !== 'unknown',
          };
        })
      );

      // Add nodes from direct queries
      for (const result of results) {
        nodes.push(result.node);
        
        // Also add any discovered cluster nodes
        if (result.clusterNodes) {
          for (const clusterNode of result.clusterNodes as Array<{
            pubkey?: string;
            gossip?: string;
            tpu?: string;
            rpc?: string;
            version?: string;
            featureSet?: number;
            shredVersion?: number;
          }>) {
            if (clusterNode.pubkey && !nodes.find(n => n.pubkey === clusterNode.pubkey)) {
              const gossipIp = clusterNode.gossip?.split(':')[0];
              nodes.push({
                pubkey: clusterNode.pubkey,
                gossipPort: clusterNode.gossip ? parseInt(clusterNode.gossip.split(':')[1]) : 0,
                tpuPort: clusterNode.tpu ? parseInt(clusterNode.tpu.split(':')[1]) : 0,
                rpcPort: clusterNode.rpc ? parseInt(clusterNode.rpc.split(':')[1]) : 9001,
                version: clusterNode.version || null,
                health: 'unknown',
                latency: null,
                lastUpdate: Date.now(),
                isPNode: true,
                ip: gossipIp,
                featureSet: clusterNode.featureSet,
                shredVersion: clusterNode.shredVersion,
              });
            }
          }
        }
      }
    }

    this.isConnected = connectedCount > 0;
    
    // Set error message if no nodes connected
    if (connectedCount === 0 && nodes.length > 0) {
      this.lastError = `Unable to reach any of the ${nodes.length} known pNodes. The RPC ports may be firewalled or require authentication.`;
    }
    
    // Deduplicate by pubkey
    const uniqueNodes = new Map<string, PNode>();
    for (const node of nodes) {
      const existing = uniqueNodes.get(node.pubkey);
      // Keep the one with more info (healthy status or has latency)
      if (!existing || 
          (node.health === 'healthy' && existing.health !== 'healthy') ||
          (node.latency !== null && existing.latency === null)) {
        uniqueNodes.set(node.pubkey, node);
      }
    }

    return Array.from(uniqueNodes.values());
  }

  /**
   * Check health of a specific pNode
   */
  async checkHealth(node: PNode): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    if (!node.ip || !node.rpcPort) {
      return node.health;
    }

    const address = `${node.ip}:${node.rpcPort}`;
    const { result } = await this.rpcCallToNode<string | { status: string }>(address, 'getHealth', [], 3000);
    
    if (result === 'ok' || (typeof result === 'object' && result?.status === 'ok')) {
      return 'healthy';
    } else if (result !== null) {
      return 'unhealthy';
    }
    
    return 'unknown';
  }

  /**
   * Measure latency to a pNode
   */
  async getLatency(node: PNode): Promise<number | null> {
    if (!node.ip || !node.rpcPort) return null;

    const address = `${node.ip}:${node.rpcPort}`;
    const { result, latency } = await this.rpcCallToNode<unknown>(address, 'getHealth', [], 5000);
    
    return result !== null ? latency : null;
  }

  /**
   * Get detailed info for a specific pNode
   */
  async getPNodeInfo(_pubkey: string, ip?: string, port?: number): Promise<Partial<PNode> | null> {
    if (!ip || !port) return null;
    
    const address = `${ip}:${port}`;
    
    // Try to get version info
    const { result: versionResult } = await this.rpcCallToNode<{
      'solana-core'?: string;
      version?: string;
      'feature-set'?: number;
    }>(address, 'getVersion');

    // Try to get identity
    const { result: identityResult } = await this.rpcCallToNode<{
      identity?: string;
    }>(address, 'getIdentity');

    if (!versionResult && !identityResult) return null;

    return {
      version: versionResult?.['solana-core'] || versionResult?.version,
      featureSet: versionResult?.['feature-set'],
    };
  }

  /**
   * Get network-wide storage statistics (aggregated from all nodes)
   */
  async getStorageStats(): Promise<{ total: number; used: number } | null> {
    // Storage stats would need to be aggregated from individual nodes
    // For now, return null as we don't have this data from standard RPC
    return null;
  }

  /**
   * Get network statistics (aggregated)
   */
  async getNetworkStats(): Promise<{
    totalNodes?: number;
    healthyNodes?: number;
    totalStorage?: number;
    usedStorage?: number;
  } | null> {
    // This is calculated from the nodes we discover
    return null;
  }

  /**
   * Get geo location for an IP
   */
  async getGeoLocation(ip: string): Promise<GeoLocation | null> {
    if (!ip || ip === '0.0.0.0' || ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
      return null;
    }
    
    try {
      const response = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon`);
      const data = await response.json();
      
      if (data.status === 'success') {
        return {
          country: data.country,
          countryCode: data.countryCode,
          city: data.city,
          lat: data.lat,
          lon: data.lon,
        };
      }
    } catch (error) {
      console.warn('Geo lookup failed for', ip, error);
    }
    return null;
  }

  /**
   * Test connection by querying the first known pNode
   */
  async testConnection(): Promise<boolean> {
    const addresses = this.getAllPNodeAddresses();
    
    for (const address of addresses.slice(0, 3)) {
      const { result } = await this.rpcCallToNode<unknown>(address, 'getHealth', [], 3000);
      if (result !== null) {
        this.isConnected = true;
        return true;
      }
      
      // Try getVersion as fallback
      const { result: versionResult } = await this.rpcCallToNode<unknown>(address, 'getVersion', [], 3000);
      if (versionResult !== null) {
        this.isConnected = true;
        return true;
      }
    }

    this.isConnected = false;
    return false;
  }

  /**
   * Get the list of known pNode addresses
   */
  getKnownAddresses(): string[] {
    return KNOWN_PNODE_ADDRESSES;
  }
}

export const pnodeService = new PNodeService();
