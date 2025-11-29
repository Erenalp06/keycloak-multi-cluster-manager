import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, GitCompare, Server, Settings, Shield, ChevronDown, ChevronRight, Circle, Folder, LogOut, User, Users, UserCog, Search, ChevronLeft, ChevronRight as ChevronRightIcon, Wrench, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clusterApi, Cluster, ClusterHealth } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [clustersExpanded, setClustersExpanded] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [healthStatuses, setHealthStatuses] = useState<Record<number, ClusterHealth>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  // Auto-expand all groups when clusters are loaded
  useEffect(() => {
    if (clusters.length > 0) {
      const { nestedGroups, standaloneGroups } = groupedClusters();
      const allGroupKeys = new Set<string>();
      
      // Add instance group keys
      Object.keys(nestedGroups).forEach(instanceName => {
        allGroupKeys.add(instanceName);
        // Also expand sub-groups within instances
        Object.keys(nestedGroups[instanceName].groups).forEach(groupName => {
          allGroupKeys.add(`${instanceName}:${groupName}`);
        });
      });
      
      // Add standalone group keys
      Object.keys(standaloneGroups).forEach(groupName => {
        allGroupKeys.add(groupName);
      });
      
      if (allGroupKeys.size > 0) {
        setExpandedGroups(allGroupKeys);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters]);

  // Auto-expand Tools if on a tools page
  useEffect(() => {
    if (location.pathname === '/tools' || location.pathname === '/diff' || location.pathname.includes('/permission-analyzer') || location.pathname === '/token-inspector') {
      setToolsExpanded(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Check health for all clusters when they're loaded
    if (clusters.length > 0) {
      clusters.forEach((cluster) => {
        if (!healthStatuses[cluster.id]) {
          checkHealth(cluster.id);
        }
      });
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

  // Group clusters by base_url (Keycloak instance) first, then by group_name (nested)
  const groupedClusters = () => {
    // Helper to get instance name from base_url (hostname + port)
    const getInstanceName = (baseUrl: string): string => {
      try {
        const url = new URL(baseUrl);
        // Include both hostname and port to distinguish different instances on same machine
        if (url.port) {
          return `${url.hostname}:${url.port}`;
        }
        // If no port specified, use default ports based on protocol
        const defaultPort = url.protocol === 'https:' ? '443' : '80';
        return `${url.hostname}:${defaultPort}`;
      } catch {
        return baseUrl;
      }
    };

    // First pass: Group ALL clusters by base_url (instance) - PRIMARY grouping
    const instanceGroups: Record<string, Cluster[]> = {};
    clusters.forEach((cluster) => {
      const instanceName = getInstanceName(cluster.base_url);
      if (!instanceGroups[instanceName]) {
        instanceGroups[instanceName] = [];
      }
      instanceGroups[instanceName].push(cluster);
    });

    // Second pass: For each instance, group by group_name (SECONDARY grouping)
    // Structure: { instanceName: { groupName: [clusters], ungrouped: [clusters] } }
    const nestedGroups: Record<string, { groups: Record<string, Cluster[]>, ungrouped: Cluster[] }> = {};
    const standaloneGroups: Record<string, Cluster[]> = {}; // Manual groups spanning multiple instances
    const ungrouped: Cluster[] = [];

    Object.entries(instanceGroups).forEach(([instanceName, clusterList]) => {
      if (clusterList.length > 1) {
        // Multiple realms on same instance - create nested structure
        nestedGroups[instanceName] = { groups: {}, ungrouped: [] };
        
        // Group by group_name within this instance
        clusterList.forEach((cluster) => {
          if (cluster.group_name && cluster.group_name.trim() !== '') {
            if (!nestedGroups[instanceName].groups[cluster.group_name]) {
              nestedGroups[instanceName].groups[cluster.group_name] = [];
            }
            nestedGroups[instanceName].groups[cluster.group_name].push(cluster);
          } else {
            nestedGroups[instanceName].ungrouped.push(cluster);
          }
        });
      } else {
        // Single realm on instance
        const cluster = clusterList[0];
        if (cluster.group_name && cluster.group_name.trim() !== '') {
          // Has manual group - check if other instances also have this group_name
          if (!standaloneGroups[cluster.group_name]) {
            standaloneGroups[cluster.group_name] = [];
          }
          standaloneGroups[cluster.group_name].push(cluster);
        } else {
          // No manual group - leave ungrouped
          ungrouped.push(cluster);
        }
      }
    });

    // Filter standalone groups - only keep those with multiple clusters from different instances
    const finalStandaloneGroups: Record<string, Cluster[]> = {};
    Object.entries(standaloneGroups).forEach(([groupName, clusterList]) => {
      if (clusterList.length > 1) {
        finalStandaloneGroups[groupName] = clusterList;
      } else {
        // Single cluster with group_name but alone - add to ungrouped
        ungrouped.push(clusterList[0]);
      }
    });

    return { nestedGroups, standaloneGroups: finalStandaloneGroups, ungrouped };
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
    <div className={cn(
      "bg-[#1b233a] min-h-screen border-r border-[#2a3441] flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-72"
    )}>
      {/* Logo/Header */}
      <div className="p-6 border-b border-[#2a3441] relative">
        <div className={cn(
          "flex items-center gap-3 transition-opacity",
          isCollapsed ? "justify-center opacity-0" : "opacity-100"
        )}>
          <div className="w-10 h-10 bg-[#4a5568] rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className={cn("transition-opacity", isCollapsed && "hidden")}>
            <h1 className="text-white font-semibold text-base">Keycloak</h1>
            <p className="text-gray-400 text-sm">Multi-Manage</p>
          </div>
        </div>
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "absolute top-1/2 -right-3 transform -translate-y-1/2 w-6 h-6 bg-[#2a3441] border border-[#2a3441] rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#222b40] transition-colors z-10",
            isCollapsed && "right-1"
          )}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {/* Dashboard */}
        <Link
          to="/"
          className={cn(
            "relative flex items-center gap-3 px-4 py-3 rounded text-base font-medium transition-colors group",
            location.pathname === '/'
              ? "bg-[rgba(0,102,204,0.1)] text-white"
              : "text-gray-300 hover:bg-[#222b40] hover:text-white",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Dashboard" : undefined}
        >
          {location.pathname === '/' && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
          )}
          <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>Dashboard</span>}
        </Link>

        {/* Clusters - Expandable */}
        <div>
          <div className="flex items-center">
            <Link
              to="/clusters"
              className={cn(
                "relative flex items-center gap-3 flex-1 px-4 py-3 rounded text-base font-medium transition-colors group",
                location.pathname === '/clusters' && !location.pathname.startsWith('/clusters/')
                  ? "bg-[rgba(0,102,204,0.1)] text-white"
                  : "text-gray-300 hover:bg-[#222b40] hover:text-white",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? "Clusters" : undefined}
            >
              {location.pathname === '/clusters' && !location.pathname.startsWith('/clusters/') && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
              )}
              <Server className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>Clusters</span>}
            </Link>
            {!isCollapsed && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setClustersExpanded(!clustersExpanded);
                }}
                className={cn(
                  "px-2 py-3 text-gray-400 hover:text-white transition-colors",
                  isClustersPageActive() && "text-white"
                )}
              >
                {clustersExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          
          {clustersExpanded && !isCollapsed && (
            <div className="mt-1 space-y-0.5">
              {loading ? (
                <div className="pl-10 pr-3 py-2 text-sm text-gray-500">Loading...</div>
              ) : clusters.length === 0 ? (
                <div className="pl-10 pr-3 py-2 text-sm text-gray-500">No clusters</div>
              ) : (() => {
                const { nestedGroups, standaloneGroups, ungrouped } = groupedClusters();
                const sortedInstanceNames = Object.keys(nestedGroups).sort();
                const sortedStandaloneNames = Object.keys(standaloneGroups).sort();
                
                return (
                  <>
                    {/* Nested instance groups (base_url -> group_name) */}
                    {sortedInstanceNames.map((instanceName) => {
                      const instanceData = nestedGroups[instanceName];
                      const isInstanceExpanded = expandedGroups.has(instanceName);
                      const totalClusters = Object.values(instanceData.groups).flat().length + instanceData.ungrouped.length;
                      const sortedSubGroupNames = Object.keys(instanceData.groups).sort();
                      
                      return (
                        <div key={instanceName} className="mb-0.5">
                          {/* Instance group header */}
                          <button
                            onClick={() => toggleGroup(instanceName)}
                            className="flex items-center justify-between w-full pl-10 pr-3 py-1.5 rounded text-sm text-gray-300 hover:bg-[#222b40] hover:text-white transition-colors group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isInstanceExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-300 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-300 flex-shrink-0" />
                              )}
                              <Server className="h-3.5 w-3.5 text-blue-400 group-hover:text-blue-300 flex-shrink-0" />
                              <span className="font-medium text-gray-300 group-hover:text-white truncate">{instanceName}</span>
                              <span className="text-xs text-gray-500 group-hover:text-gray-400 flex-shrink-0">({totalClusters})</span>
                            </div>
                          </button>
                          
                          {isInstanceExpanded && (
                            <div className="ml-10 border-l border-[#2a3441] pl-2 space-y-0.5">
                              {/* Sub-groups by group_name */}
                              {sortedSubGroupNames.map((groupName) => {
                                const subGroupClusters = instanceData.groups[groupName];
                                const subGroupKey = `${instanceName}:${groupName}`;
                                const isSubGroupExpanded = expandedGroups.has(subGroupKey);
                                
                                return (
                                  <div key={subGroupKey} className="mb-0.5">
                                    <button
                                      onClick={() => toggleGroup(subGroupKey)}
                                      className="flex items-center justify-between w-full pl-3 pr-3 py-1.5 rounded text-xs text-gray-300 hover:bg-[#222b40] hover:text-white transition-colors group"
                                    >
                                      <div className="flex items-center gap-2">
                                        {isSubGroupExpanded ? (
                                          <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-gray-300 flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-gray-300 flex-shrink-0" />
                                        )}
                                        <Folder className="h-3 w-3 text-gray-400 group-hover:text-gray-300 flex-shrink-0" />
                                        <span className="font-medium text-gray-300 group-hover:text-white">{groupName}</span>
                                        <span className="text-xs text-gray-500 group-hover:text-gray-400">({subGroupClusters.length})</span>
                                      </div>
                                    </button>
                                    {isSubGroupExpanded && (
                                      <div className="ml-6 border-l border-[#2a3441] pl-2 space-y-0.5">
                                        {subGroupClusters.map((cluster) => {
                                          const active = isClusterActive(cluster.id);
                                          const healthIndicator = getHealthIndicator(cluster.id);
                                          return (
                                            <Link
                                              key={cluster.id}
                                              to={`/clusters/${cluster.id}`}
                                              className={cn(
                                                "relative flex items-center gap-2 pl-3 pr-3 py-1 rounded text-xs transition-colors",
                                                active
                                                  ? "bg-[rgba(0,102,204,0.1)] text-white"
                                                  : "text-gray-300 hover:bg-[#222b40] hover:text-white"
                                              )}
                                            >
                                              {active && (
                                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
                                              )}
                                              <div className="flex-shrink-0">
                                                {healthIndicator || <Circle className="h-2 w-2 fill-current opacity-50" />}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="truncate text-xs">{cluster.realm || 'master'}</div>
                                              </div>
                                            </Link>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              
                              {/* Ungrouped clusters within instance */}
                              {instanceData.ungrouped.length > 0 && (
                                <div className="ml-3 space-y-0.5">
                                  {instanceData.ungrouped.map((cluster) => {
                                    const active = isClusterActive(cluster.id);
                                    const healthIndicator = getHealthIndicator(cluster.id);
                                    return (
                                      <Link
                                        key={cluster.id}
                                        to={`/clusters/${cluster.id}`}
                                        className={cn(
                                          "relative flex items-center gap-2 pl-3 pr-3 py-1 rounded text-xs transition-colors",
                                          active
                                            ? "bg-[rgba(0,102,204,0.1)] text-white"
                                            : "text-gray-300 hover:bg-[#222b40] hover:text-white"
                                        )}
                                      >
                                        {active && (
                                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
                                        )}
                                        <div className="flex-shrink-0">
                                          {healthIndicator || <Circle className="h-2 w-2 fill-current opacity-50" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="truncate text-xs">{cluster.realm || 'master'}</div>
                                        </div>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Standalone groups (manual groups spanning multiple instances) */}
                    {sortedStandaloneNames.map((groupName) => {
                      const groupClusters = standaloneGroups[groupName];
                      const isGroupExpanded = expandedGroups.has(groupName);
                      
                      return (
                        <div key={groupName} className="mb-0.5">
                          <button
                            onClick={() => toggleGroup(groupName)}
                            className="flex items-center justify-between w-full pl-10 pr-3 py-2 rounded text-sm text-gray-300 hover:bg-[#222b40] hover:text-white transition-colors group"
                          >
                            <div className="flex items-center gap-2.5">
                              {isGroupExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-300 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-300 flex-shrink-0" />
                              )}
                              <Folder className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-300 flex-shrink-0" />
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
                                    <div className="flex-shrink-0">
                                      {healthIndicator || <Circle className="h-2 w-2 fill-current opacity-50" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate text-sm">{cluster.realm || 'master'}</div>
                                    </div>
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
                              <div className="flex-shrink-0">
                                {healthIndicator || <Circle className="h-2 w-2 fill-current opacity-50" />}
                              </div>
                              <span className="truncate flex-1">{cluster.realm || 'master'}</span>
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

        {/* Tools - Expandable */}
        <div>
          <div className="flex items-center">
            <Link
              to="/tools"
              className={cn(
                "relative flex items-center gap-3 flex-1 px-4 py-3 rounded text-base font-medium transition-colors group",
                (location.pathname === '/tools' || location.pathname === '/diff' || location.pathname.includes('/permission-analyzer') || location.pathname === '/token-inspector')
                  ? "bg-[rgba(0,102,204,0.1)] text-white"
                  : "text-gray-300 hover:bg-[#222b40] hover:text-white",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? "Tools" : undefined}
              onClick={(e) => {
                if (!isCollapsed) {
                  setToolsExpanded(true);
                }
              }}
            >
              {(location.pathname === '/tools' || location.pathname === '/diff' || location.pathname.includes('/permission-analyzer') || location.pathname === '/token-inspector') && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
              )}
              <Wrench className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>Tools</span>}
            </Link>
            {!isCollapsed && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setToolsExpanded(!toolsExpanded);
                }}
                className={cn(
                  "px-2 py-3 text-gray-400 hover:text-white transition-colors",
                  (location.pathname === '/diff' || location.pathname.includes('/permission-analyzer') || location.pathname === '/token-inspector') && "text-white"
                )}
              >
                {toolsExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          
          {toolsExpanded && !isCollapsed && (
            <div className="mt-1 space-y-0.5 ml-4">
              {/* Role Diff */}
              <Link
                to="/diff"
                className={cn(
                  "relative flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium transition-colors",
                  location.pathname === '/diff'
                    ? "bg-[rgba(0,102,204,0.1)] text-white"
                    : "text-gray-300 hover:bg-[#222b40] hover:text-white"
                )}
              >
                {location.pathname === '/diff' && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
                )}
                <GitCompare className="h-4 w-4 flex-shrink-0" />
                <span>Role Diff</span>
              </Link>

              {/* Permission Analyzer */}
              {clusters.length > 0 && (
                <Link
                  to={`/clusters/${clusters[0].id}/permission-analyzer`}
                  className={cn(
                    "relative flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium transition-colors",
                    location.pathname.includes('/permission-analyzer')
                      ? "bg-[rgba(0,102,204,0.1)] text-white"
                      : "text-gray-300 hover:bg-[#222b40] hover:text-white"
                  )}
                >
                  {location.pathname.includes('/permission-analyzer') && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
                  )}
                  <Search className="h-4 w-4 flex-shrink-0" />
                  <span>Permission Analyzer</span>
                </Link>
              )}

              {/* Token Inspector */}
              <Link
                to="/token-inspector"
                className={cn(
                  "relative flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium transition-colors",
                  location.pathname === '/token-inspector'
                    ? "bg-[rgba(0,102,204,0.1)] text-white"
                    : "text-gray-300 hover:bg-[#222b40] hover:text-white"
                )}
              >
                {location.pathname === '/token-inspector' && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
                )}
                <Key className="h-4 w-4 flex-shrink-0" />
                <span>Token Inspector</span>
              </Link>
            </div>
          )}
        </div>

        {/* Keycloak Management */}
        <Link
          to="/keycloak-management"
          className={cn(
            "relative flex items-center gap-3 px-4 py-3 rounded text-base font-medium transition-colors group",
            location.pathname === '/keycloak-management'
              ? "bg-[rgba(0,102,204,0.1)] text-white"
              : "text-gray-300 hover:bg-[#222b40] hover:text-white",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Keycloak Management" : undefined}
        >
          {location.pathname === '/keycloak-management' && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
          )}
          <Wrench className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>Keycloak Management</span>}
        </Link>

        {/* Settings */}
        <Link
          to="/settings"
          className={cn(
            "relative flex items-center gap-3 px-4 py-3 rounded text-base font-medium transition-colors group",
            location.pathname === '/settings'
              ? "bg-[rgba(0,102,204,0.1)] text-white"
              : "text-gray-300 hover:bg-[#222b40] hover:text-white",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Settings" : undefined}
        >
          {location.pathname === '/settings' && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0066cc] rounded-r" />
          )}
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </Link>
      </nav>

      {/* Footer */}
      <div className={cn("p-4 border-t border-[#2a3441] space-y-3", isCollapsed && "px-2")}>
        {user && !isCollapsed && (
          <div className="flex items-center gap-2 px-2 py-2 rounded text-sm text-gray-300">
            <User className="h-4 w-4 flex-shrink-0" />
            <div className="flex flex-col truncate">
              <span className="truncate">{user.username}</span>
              {user.role === 'admin' && (
                <span className="text-xs text-[#0066cc]">Admin</span>
              )}
            </div>
          </div>
        )}
        {user && isCollapsed && (
          <div className="flex items-center justify-center py-2" title={user.username}>
            <User className="h-5 w-5 text-gray-300" />
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            "w-full text-gray-300 hover:text-white hover:bg-[#222b40]",
            isCollapsed ? "justify-center px-2" : "justify-start"
          )}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span className="ml-2">Logout</span>}
        </Button>
        {!isCollapsed && (
          <p className="text-xs text-gray-500 text-center">v1.0.2 MVP</p>
        )}
      </div>
    </div>
  );
}
