import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GitCompare, Search, Key, ArrowRight, Server } from 'lucide-react';
import { clusterApi, Cluster } from '@/services/api';
import { cn } from '@/lib/utils';

export default function Tools() {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<Cluster[]>([]);

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    try {
      const data = await clusterApi.getAll();
      setClusters(data || []);
    } catch (error) {
      console.error('Failed to load clusters:', error);
      setClusters([]);
    }
  };

  const tools = [
    {
      id: 'role-diff',
      title: 'Role Diff',
      description: 'Compare roles across different Keycloak clusters',
      icon: GitCompare,
      path: '/diff',
      color: 'blue',
    },
    {
      id: 'permission-analyzer',
      title: 'Permission Analyzer',
      description: 'Analyze RBAC permissions for users, roles, and clients',
      icon: Search,
      path: clusters.length > 0 ? `/clusters/${clusters[0].id}/permission-analyzer` : null,
      color: 'green',
      disabled: clusters.length === 0,
    },
    {
      id: 'token-inspector',
      title: 'Token Inspector',
      description: 'Get and inspect access tokens for Keycloak users',
      icon: Key,
      path: '/token-inspector',
      color: 'purple',
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Tools</h1>
        <p className="text-sm text-gray-600">Useful tools for managing and analyzing Keycloak clusters</p>
      </div>

      {/* Tools Grid - 3 columns, responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200 border-blue-200',
            green: 'bg-green-100 text-green-600 hover:bg-green-200 border-green-200',
            purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200 border-purple-200',
          };

          return (
            <Card
              key={tool.id}
              onClick={() => {
                if (tool.path && !tool.disabled) {
                  navigate(tool.path);
                }
              }}
              className={cn(
                "border-2 shadow-sm hover:shadow-lg transition-all cursor-pointer group h-full flex flex-col",
                tool.disabled
                  ? "opacity-50 cursor-not-allowed border-gray-200"
                  : "border-gray-200 hover:border-blue-400"
              )}
            >
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                    tool.disabled
                      ? "bg-gray-100"
                      : colorClasses[tool.color as keyof typeof colorClasses] || "bg-blue-100"
                  )}>
                    <Icon className={cn(
                      "h-6 w-6",
                      tool.disabled ? "text-gray-400" : ""
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold text-gray-900">{tool.title}</CardTitle>
                    {tool.disabled && (
                      <p className="text-xs text-red-500 mt-0.5">No clusters available</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <CardDescription className="text-xs text-gray-500 mb-3 flex-shrink-0">
                  {tool.description}
                </CardDescription>
                {!tool.disabled && (
                  <div className="flex items-center justify-between text-sm text-gray-600 group-hover:text-blue-600 transition-colors mt-auto pt-2 border-t border-gray-100">
                    <span className="font-medium">Open Tool</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Section */}
      <Card className="mt-6 border border-gray-200 bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Server className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">About Tools</h3>
              <p className="text-sm text-gray-600">
                These tools help you manage, analyze, and troubleshoot your Keycloak clusters.
                Each tool provides specific functionality to make your workflow more efficient.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

