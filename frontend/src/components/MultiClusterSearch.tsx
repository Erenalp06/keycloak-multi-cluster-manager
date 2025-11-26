import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Users, Building2, Shield, Eye, Activity } from 'lucide-react';
import { clusterApi, Cluster } from '@/services/api';

type SearchType = 'user' | 'client' | 'role';

interface MultiClusterSearchProps {
  clusters: Cluster[];
}

export default function MultiClusterSearch({ clusters }: MultiClusterSearchProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('user');
  const [selectedClusters, setSelectedClusters] = useState<number[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoadingSearch(true);
    setSearchResults([]);
    try {
      const result = await clusterApi.search(
        searchQuery.trim(),
        searchType,
        selectedClusters.length > 0 ? selectedClusters : undefined
      );
      setSearchResults(result.results || []);
      setShowSearchResults(true);
    } catch (error: any) {
      console.error('Search failed:', error);
      alert(`Search failed: ${error.message}`);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleClose = () => {
    setIsExpanded(false);
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="relative w-full">
      {/* Simple Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          onFocus={() => setIsExpanded(true)}
          placeholder="Search users, clients, or roles across clusters..."
          className="pl-10 pr-10 h-10 w-full border-2 focus:border-green-500"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setShowSearchResults(false);
              setSearchResults([]);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expanded Search Panel - Much Larger */}
      {isExpanded && (
        <Card className="absolute top-full left-0 mt-2 w-[90vw] max-w-6xl z-50 shadow-2xl border-2 border-green-200 max-h-[85vh] flex flex-col">
          <CardContent className="p-8 space-y-6 flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="text-base font-semibold text-gray-700 flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Type
                </label>
                <Select value={searchType} onValueChange={(value) => setSearchType(value as SearchType)}>
                  <SelectTrigger className="h-12 border-2 focus:border-green-500 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>User</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="client">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>Client</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="role">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>Role</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <label className="text-base font-semibold text-gray-700 flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Clusters {selectedClusters.length > 0 && `(${selectedClusters.length} selected)`}
                </label>
                <div className="max-h-64 overflow-y-auto border-2 border-gray-300 rounded-md p-4 bg-white">
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2.5 rounded-md">
                      <input
                        type="checkbox"
                        checked={selectedClusters.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClusters([]);
                          }
                        }}
                        className="w-5 h-5"
                      />
                      <span className="text-base font-medium">All Clusters</span>
                    </label>
                    {clusters.map((c) => (
                      <label key={c.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2.5 rounded-md">
                        <input
                          type="checkbox"
                          checked={selectedClusters.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClusters([...selectedClusters, c.id]);
                            } else {
                              setSelectedClusters(selectedClusters.filter(id => id !== c.id));
                            }
                          }}
                          className="w-5 h-5"
                        />
                        <span className="text-base">{c.name} ({c.realm})</span>
                      </label>
                    ))}
                  </div>
                </div>
                {selectedClusters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedClusters([])}
                    className="h-9 text-sm mt-2"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Clear Selection
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                <label className="text-base font-semibold text-gray-700 flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Query
                </label>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  placeholder={`Search for ${searchType}...`}
                  className="w-full h-12 border-2 focus:border-green-500 text-base"
                />
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || loadingSearch}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
                >
                  {loadingSearch ? (
                    <>
                      <Activity className="h-5 w-5 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="mt-6 space-y-4 border-t-2 border-gray-200 pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold text-gray-700">
                    Found {searchResults.length} result(s)
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }}
                    className="h-9 text-sm"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Clear
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base text-gray-900 mb-1">
                            {searchType === 'user' && (result.data.username || result.data.preferred_username || 'N/A')}
                            {searchType === 'client' && (result.data.clientId || 'N/A')}
                            {searchType === 'role' && (result.data.name || 'N/A')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {result.cluster_name} ({result.realm})
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigate(`/clusters/${result.cluster_id}`);
                            handleClose();
                          }}
                          className="h-9 text-sm ml-3 flex-shrink-0"
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showSearchResults && searchResults.length === 0 && !loadingSearch && (
              <div className="mt-6 text-center text-base text-gray-500 py-8 border-t-2 border-gray-200">
                No results found
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Backdrop to close on outside click */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleClose}
        />
      )}
    </div>
  );
}

