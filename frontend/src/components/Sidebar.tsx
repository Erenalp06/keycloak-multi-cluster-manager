import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, GitCompare, Server, Settings, Shield, ChevronDown, ChevronRight, Circle, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clusterApi, Cluster, ClusterHealth } from '@/services/api';

export default function Sidebar() {
  const location = useLocation();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [clustersExpanded, setClustersExpanded] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [healthStatuses, setHealthStatuses] = useState<Record<number, ClusterHealth>>({});

  useEffect(() => {
    loadClusters();
    
    // Listen for cluster updates from other components
    const handleClusterUpdate = () => {
      loadClusters();
    };
    
    window.addEventListener('clusterUpdated', handleClusterUpdate);
    return () => {
      window.removeEventListener('clusterUpdated', handleClusterUpdate);
    };
  }, []);

  useEffect(() => {
    // Check health for all clusters when they're loaded
    if (clusters.length > 0) {
      clusters.forEach((cluster) => {
        if (!healthStatuses[cluster.id]) {
          checkHealth(cluster.id);
        }
      });
      
      // Expand all groups by default
      const groups: Record<string, Cluster[]> = {};
      clusters.forEach((cluster) => {
        if (cluster.group_name && cluster.group_name.trim() !== '') {
          if (!groups[cluster.group_name]) {
            groups[cluster.group_name] = [];
          }
          groups[cluster.group_name].push(cluster);
        }
      });
      const groupNames = Object.keys(groups);
      if (groupNames.length > 0 && expandedGroups.size === 0) {
        setExpandedGroups(new Set(groupNames));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters]);

  const loadClusters = async () => {
    try {
      const data = await clusterApi.getAll();
      setClusters(data || []);
    } catch (error) {
      console.error('Failed to load clusters:', error);
      setClusters([]);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async (clusterId: number) => {
    try {
      const health = await clusterApi.healthCheck(clusterId);
      setHealthStatuses((prev) => ({ ...prev, [clusterId]: health }));
    } catch (error) {
      setHealthStatuses((prev) => ({
        ...prev,
        [clusterId]: { cluster_id: clusterId, status: 'error', message: 'Failed to check health' },
      }));
    }
  };

  const getHealthIndicator = (clusterId: number) => {
    const health = healthStatuses[clusterId];
    if (!health) {
      return null; // No health check yet
    }
    
    if (health.status === 'healthy') {
      return <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Healthy" />;
    } else {
      return <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Unhealthy" />;
    }
  };

  const isClusterActive = (clusterId: number) => {
    return location.pathname === `/clusters/${clusterId}`;
  };

  const isClustersPageActive = () => {
    return location.pathname === '/clusters' || location.pathname.startsWith('/clusters/');
  };

  // Group clusters by group_name
  const groupedClusters = () => {
    const groups: Record<string, Cluster[]> = {};
    const ungrouped: Cluster[] = [];

    clusters.forEach((cluster) => {
      if (cluster.group_name && cluster.group_name.trim() !== '') {
        if (!groups[cluster.group_name]) {
          groups[cluster.group_name] = [];
        }
        groups[cluster.group_name].push(cluster);
      } else {
        ungrouped.push(cluster);
      }
    });

    return { groups, ungrouped };
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  return (
    <div className="w-72 bg-[#1b233a] min-h-screen border-r border-[#2a3441] flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-[#2a3441]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#4a5568] rounded-lg flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-base">Keycloak</h1>
            <p className="text-gray-400 text-sm">Multi-Manage</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {/* Dashboard */}
        <Link
          to="/"
          className={cn(
            "relative flex items-center gap-3 px-4 py-3 rounded text-base font-medium transition-colors",
            location.pathname === '/'
              ? "bg-[rgba(0,102,204,0.1)] text-white"
              : "text-gray-300 hover:bg-[#222b40] hover:text-white"
          )}
        >
          {location.pathname === '/' && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
          )}
          <LayoutDashboard className="h-5 w-5" />
          Dashboard
        </Link>

        {/* Clusters - Expandable */}
        <div>
          <button
            onClick={() => setClustersExpanded(!clustersExpanded)}
            className={cn(
              "relative flex items-center justify-between w-full px-4 py-3 rounded text-base font-medium transition-colors",
              isClustersPageActive()
                ? "bg-[rgba(0,102,204,0.1)] text-white"
                : "text-gray-300 hover:bg-[#222b40] hover:text-white"
            )}
          >
            {isClustersPageActive() && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
            )}
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5" />
              <span>Clusters</span>
            </div>
            {clustersExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          {clustersExpanded && (
            <div className="mt-1 space-y-0.5">
              <Link
                to="/clusters"
                className={cn(
                  "flex items-center gap-2.5 pl-10 pr-3 py-2 rounded text-sm transition-colors",
                  location.pathname === '/clusters' && !location.pathname.startsWith('/clusters/')
                    ? "bg-[rgba(0,102,204,0.1)] text-white"
                    : "text-gray-500 hover:bg-[#222b40] hover:text-gray-200"
                )}
              >
                <Circle className="h-2 w-2 fill-current" />
                <span>All Clusters</span>
              </Link>
              {loading ? (
                <div className="pl-10 pr-3 py-2 text-sm text-gray-500">Loading...</div>
              ) : clusters.length === 0 ? (
                <div className="pl-10 pr-3 py-2 text-sm text-gray-500">No clusters</div>
              ) : (() => {
                const { groups, ungrouped } = groupedClusters();
                const sortedGroupNames = Object.keys(groups).sort();
                
                return (
                  <>
                    {/* Grouped clusters */}
                    {sortedGroupNames.map((groupName) => {
                      const groupClusters = groups[groupName];
                      const isGroupExpanded = expandedGroups.has(groupName);
                      
                      return (
                        <div key={groupName} className="mb-1">
                          <button
                            onClick={() => toggleGroup(groupName)}
                            className="flex items-center justify-between w-full pl-10 pr-3 py-2 rounded text-sm text-gray-300 hover:bg-[#222b40] hover:text-white transition-colors group"
                          >
                            <div className="flex items-center gap-2.5">
                              {isGroupExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-300" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-300" />
                              )}
                              <Folder className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-300" />
                              <span className="font-semibold text-gray-300 group-hover:text-white">{groupName}</span>
                              <span className="text-xs text-gray-500 group-hover:text-gray-400">({groupClusters.length})</span>
                            </div>
                          </button>
                          {isGroupExpanded && (
                            <div className="ml-10 border-l border-[#2a3441] pl-2 space-y-0.5">
                              {groupClusters.map((cluster) => {
                                const active = isClusterActive(cluster.id);
                                const healthIndicator = getHealthIndicator(cluster.id);
                                return (
                                  <Link
                                    key={cluster.id}
                                    to={`/clusters/${cluster.id}`}
                                    className={cn(
                                      "relative flex items-center gap-2.5 pl-3 pr-3 py-1.5 rounded text-sm transition-colors",
                                      active
                                        ? "bg-[rgba(0,102,204,0.1)] text-white"
                                        : "text-gray-300 hover:bg-[#222b40] hover:text-white"
                                    )}
                                  >
                                    {active && (
                                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
                                    )}
                                    {healthIndicator || <Circle className="h-2 w-2 fill-current opacity-50" />}
                                    <span className="truncate flex-1">{cluster.name}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Ungrouped clusters */}
                    {ungrouped.length > 0 && (
                      <>
                        {ungrouped.map((cluster) => {
                          const active = isClusterActive(cluster.id);
                          const healthIndicator = getHealthIndicator(cluster.id);
                          return (
                            <Link
                              key={cluster.id}
                              to={`/clusters/${cluster.id}`}
                              className={cn(
                                "relative flex items-center gap-2.5 pl-10 pr-3 py-2 rounded text-sm transition-colors",
                                active
                                  ? "bg-[rgba(0,102,204,0.1)] text-white"
                                  : "text-gray-300 hover:bg-[#222b40] hover:text-gray-200"
                              )}
                            >
                              {active && (
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
                              )}
                              {healthIndicator || <Circle className="h-2 w-2 fill-current opacity-50" />}
                              <span className="truncate flex-1">{cluster.name}</span>
                            </Link>
                          );
                        })}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Role Diff */}
        <Link
          to="/diff"
          className={cn(
            "relative flex items-center gap-3 px-4 py-3 rounded text-base font-medium transition-colors",
            location.pathname === '/diff'
              ? "bg-[rgba(0,102,204,0.1)] text-white"
              : "text-gray-300 hover:bg-[#222b40] hover:text-white"
          )}
        >
          {location.pathname === '/diff' && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
          )}
          <GitCompare className="h-5 w-5" />
          Role Diff
        </Link>

        {/* Settings */}
        <Link
          to="/settings"
          className={cn(
            "relative flex items-center gap-3 px-4 py-3 rounded text-base font-medium transition-colors",
            location.pathname === '/settings'
              ? "bg-[rgba(0,102,204,0.1)] text-white"
              : "text-gray-300 hover:bg-[#222b40] hover:text-white"
          )}
        >
          {location.pathname === '/settings' && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
          )}
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#2a3441]">
        <p className="text-xs text-gray-500 text-center">v1.0.0 MVP</p>
      </div>
    </div>
  );
}
