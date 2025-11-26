import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Key, RefreshCw, Copy, Check, Terminal, Building2, User, Info, Lock, Search, X, Shield } from 'lucide-react';
import { clusterApi, Cluster } from '@/services/api';

interface TokenInspectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cluster: Cluster | null;
}

type GrantType = 'password' | 'client_credentials';

type SearchType = 'user' | 'client' | 'role';

export default function TokenInspectorDialog({ open, onOpenChange, cluster }: TokenInspectorDialogProps) {
  const [grantType, setGrantType] = useState<GrantType>('password');
  const [selectedUsername, setSelectedUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [tokenData, setTokenData] = useState<any>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('user');
  const [selectedClusters, setSelectedClusters] = useState<number[]>([]);
  const [allClusters, setAllClusters] = useState<Cluster[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Load clients when dialog opens and cluster is available
  useEffect(() => {
    if (open && cluster?.id) {
      loadClients();
    }
  }, [open, cluster?.id]);

  const loadClients = async () => {
    if (!cluster?.id) return;
    setLoadingClients(true);
    try {
      const clientsList = await clusterApi.getClients(cluster.id);
      setClients(clientsList);
      // Set default client if admin-cli exists
      const adminCli = clientsList.find((c: any) => c.clientId === 'admin-cli');
      if (adminCli) {
        setClientId('admin-cli');
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadAllClusters = async () => {
    try {
      const clustersList = await clusterApi.getAll();
      setAllClusters(clustersList);
      // If a specific cluster is provided, select it by default
      if (cluster?.id && !selectedClusters.includes(cluster.id)) {
        setSelectedClusters([cluster.id]);
      }
    } catch (error) {
      console.error('Failed to load clusters:', error);
    }
  };

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

  const handleSelectFromSearch = (result: any) => {
    if (searchType === 'user') {
      setSelectedUsername(result.data.username || result.data.preferred_username || '');
    } else if (searchType === 'client') {
      setClientId(result.data.clientId || '');
    }
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const handleGetToken = async () => {
    if (!cluster?.id) return;
    
    if (grantType === 'password' && (!selectedUsername || !userPassword)) {
      alert('Username and password are required for password grant');
      return;
    }
    
    if (grantType === 'client_credentials' && (!clientId || !clientSecret)) {
      alert('Client ID and client secret are required for client_credentials grant');
      return;
    }
    
    setLoadingToken(true);
    setTokenData(null);
    try {
      const data = await clusterApi.getUserToken(
        cluster.id,
        grantType,
        grantType === 'password' ? selectedUsername : undefined,
        grantType === 'password' ? userPassword : undefined,
        clientId.trim() || undefined,
        grantType === 'client_credentials' ? clientSecret : undefined
      );
      setTokenData(data);
    } catch (error: any) {
      console.error('Failed to get token:', error);
      alert(`Failed to get token: ${error.message}`);
    } finally {
      setLoadingToken(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateCurlCommand = () => {
    if (!cluster) return '';
    const tokenUrl = `${cluster.base_url}/realms/${cluster.realm}/protocol/openid-connect/token`;
    const usedClientId = clientId.trim() || 'admin-cli';
    
    if (grantType === 'password') {
      if (!selectedUsername || !userPassword) return '';
      return `curl -X POST "${tokenUrl}" \\\n  -H "Content-Type: application/x-www-form-urlencoded" \\\n  -d "grant_type=password" \\\n  -d "client_id=${usedClientId}" \\\n  -d "username=${selectedUsername}" \\\n  -d "password=${userPassword}"`;
    } else if (grantType === 'client_credentials') {
      if (!clientId || !clientSecret) return '';
      return `curl -X POST "${tokenUrl}" \\\n  -H "Content-Type: application/x-www-form-urlencoded" \\\n  -d "grant_type=client_credentials" \\\n  -d "client_id=${clientId}" \\\n  -d "client_secret=${clientSecret}"`;
    }
    return '';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const handleClose = () => {
    onOpenChange(false);
    setTokenData(null);
    setGrantType('password');
    setSelectedUsername('');
    setUserPassword('');
    setClientId('');
    setClientSecret('');
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-600" />
            Token Inspector
          </DialogTitle>
          <DialogDescription>
            Get and inspect access token using different grant types. Select grant type first, then provide required credentials.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          {/* Multi-Cluster Search */}
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50/50 to-white shadow-md">
            <CardHeader className="pb-3 bg-green-50/50 rounded-t-lg border-b border-green-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Search className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Multi-Cluster Search</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Search for users, clients, or roles across multiple clusters
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Search className="h-4 w-4 text-gray-500" />
                    Search Type
                  </label>
                  <Select value={searchType} onValueChange={(value) => setSearchType(value as SearchType)}>
                    <SelectTrigger className="h-10 border-2 focus:border-green-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
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
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    Clusters {selectedClusters.length > 0 && `(${selectedClusters.length} selected)`}
                  </label>
                  <div className="max-h-32 overflow-y-auto border-2 border-gray-300 rounded-md p-2 bg-white">
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedClusters.length === 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClusters([]);
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">All Clusters</span>
                      </label>
                      {allClusters.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
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
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{c.name} ({c.realm})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {selectedClusters.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedClusters([])}
                      className="h-7 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear Selection
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={`Search for ${searchType}...`}
                  className="flex-1 h-10 border-2 focus:border-green-500"
                />
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || loadingSearch}
                  className="bg-green-600 hover:bg-green-700 text-white h-10 px-4"
                >
                  {loadingSearch ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Search Results */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2 bg-gray-50">
                  <div className="text-xs font-semibold text-gray-600 mb-2">
                    Found {searchResults.length} result(s)
                  </div>
                  {searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectFromSearch(result)}
                      className="p-2 bg-white border border-gray-200 rounded-md hover:bg-green-50 hover:border-green-300 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">
                            {searchType === 'user' && (result.data.username || result.data.preferred_username || 'N/A')}
                            {searchType === 'client' && (result.data.clientId || 'N/A')}
                            {searchType === 'role' && (result.data.name || 'N/A')}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {result.cluster_name} ({result.realm})
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectFromSearch(result);
                          }}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showSearchResults && searchResults.length === 0 && !loadingSearch && (
                <div className="mt-4 text-center text-sm text-gray-500 py-4">
                  No results found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Input Form */}
          {!tokenData && (
            <div className="space-y-4">
              {/* Grant Type Selection */}
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-white shadow-md">
                <CardHeader className="pb-3 bg-blue-50/50 rounded-t-lg border-b border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Key className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Grant Type</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Select the OAuth 2.0 grant type to use for token request
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Key className="h-4 w-4 text-gray-500" />
                      Grant Type
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <Select value={grantType} onValueChange={(value) => setGrantType(value as GrantType)}>
                      <SelectTrigger className="h-11 border-2 focus:border-blue-500">
                        <SelectValue placeholder="Select grant type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="password">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Password Grant</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="client_credentials">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>Client Credentials</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      {grantType === 'password' 
                        ? 'Use username and password to get a token for a specific user'
                        : 'Use client ID and secret to get a token for the client itself'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Credentials Card */}
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-white shadow-md">
                <CardHeader className="pb-3 bg-blue-50/50 rounded-t-lg border-b border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      {grantType === 'password' ? (
                        <User className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Building2 className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {grantType === 'password' ? 'User Credentials' : 'Client Credentials'}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {grantType === 'password' 
                          ? 'Enter username and password to obtain an access token'
                          : 'Enter client ID and secret to obtain an access token'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Password Grant Fields */}
                  {grantType === 'password' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <User className="h-4 w-4 text-gray-500" />
                          Username
                          <span className="text-red-500 font-bold">*</span>
                        </label>
                        <Input
                          type="text"
                          value={selectedUsername}
                          onChange={(e) => setSelectedUsername(e.target.value)}
                          placeholder="Enter Keycloak username"
                          className="h-11 border-2 focus:border-blue-500 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500">The username of the Keycloak user</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <Lock className="h-4 w-4 text-gray-500" />
                          Password
                          <span className="text-red-500 font-bold">*</span>
                        </label>
                        <Input
                          type="password"
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          placeholder="Enter user password"
                          className="h-11 border-2 focus:border-blue-500 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500">The password for the Keycloak user</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          Client ID
                          <span className="text-xs font-normal text-gray-400">(optional)</span>
                        </label>
                        {loadingClients ? (
                          <div className="h-11 border-2 border-gray-300 rounded-md flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                            <span className="ml-2 text-xs text-gray-500">Loading clients...</span>
                          </div>
                        ) : (
                          <Select value={clientId || '__default__'} onValueChange={(value) => setClientId(value === '__default__' ? '' : value)}>
                            <SelectTrigger className="h-11 border-2 focus:border-blue-500">
                              <SelectValue placeholder="Select a client (defaults to admin-cli)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__default__">admin-cli (default)</SelectItem>
                              {clients
                                .filter((client: any) => client.clientId && client.clientId.trim() !== '')
                                .map((client: any) => (
                                  <SelectItem key={client.id || client.clientId} value={client.clientId}>
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-3.5 w-3.5" />
                                      <span>{client.clientId}</span>
                                      {client.name && client.name !== client.clientId && (
                                        <span className="text-xs text-gray-400">({client.name})</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                        <p className="text-xs text-gray-500">Client ID for token request. Defaults to "admin-cli" if not provided.</p>
                      </div>
                    </>
                  )}

                  {/* Client Credentials Grant Fields */}
                  {grantType === 'client_credentials' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          Client ID
                          <span className="text-red-500 font-bold">*</span>
                        </label>
                        {loadingClients ? (
                          <div className="h-11 border-2 border-gray-300 rounded-md flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                            <span className="ml-2 text-xs text-gray-500">Loading clients...</span>
                          </div>
                        ) : (
                          <Select value={clientId || '__none__'} onValueChange={(value) => setClientId(value === '__none__' ? '' : value)}>
                            <SelectTrigger className="h-11 border-2 focus:border-blue-500">
                              <SelectValue placeholder="Select a client from realm" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.length === 0 ? (
                                <SelectItem value="__none__" disabled>No clients found</SelectItem>
                              ) : (
                                clients
                                  .filter((client: any) => client.clientId && client.clientId.trim() !== '')
                                  .map((client: any) => (
                                    <SelectItem key={client.id || client.clientId} value={client.clientId}>
                                      <div className="flex items-center gap-2">
                                        <Building2 className="h-3.5 w-3.5" />
                                        <span>{client.clientId}</span>
                                        {client.name && client.name !== client.clientId && (
                                          <span className="text-xs text-gray-400">({client.name})</span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        <p className="text-xs text-gray-500">Select a client from the realm</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <Lock className="h-4 w-4 text-gray-500" />
                          Client Secret
                          <span className="text-red-500 font-bold">*</span>
                        </label>
                        <Input
                          type="password"
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                          placeholder="Enter client secret"
                          className="h-11 border-2 focus:border-blue-500 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500">The secret for the selected client</p>
                      </div>
                    </>
                  )}
                  <div className="pt-2">
                    <Button
                      onClick={handleGetToken}
                      disabled={
                        loadingToken || 
                        (grantType === 'password' && (!selectedUsername || !userPassword)) ||
                        (grantType === 'client_credentials' && (!clientId || !clientSecret))
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 font-semibold text-base shadow-md hover:shadow-lg transition-all"
                    >
                      {loadingToken ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Getting Token...
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4 mr-2" />
                          Get Token
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {grantType === 'password' 
                        ? 'Username and password are required. Client ID is optional and defaults to "admin-cli".'
                        : 'Client ID and client secret are required for client credentials grant.'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="border border-blue-200 bg-blue-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-blue-900">Grant Type Information</p>
                      <p className="text-xs text-blue-800">
                        {grantType === 'password' ? (
                          <>
                            <strong>Password Grant:</strong> Use username and password to get a token for a specific user. 
                            Client ID is optional and defaults to "admin-cli".
                          </>
                        ) : (
                          <>
                            <strong>Client Credentials Grant:</strong> Use client ID and secret to get a token for the client itself. 
                            This is typically used for service-to-service authentication.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Curl Command Preview */}
              {cluster && generateCurlCommand() && (
                <Card className="border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-white shadow-md">
                  <CardHeader className="pb-3 bg-gray-100/50 rounded-t-lg border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                          <Terminal className="h-4 w-4 text-gray-700" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">cURL Command</CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            Copy this command to get a token via cURL
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(generateCurlCommand(), 'curl')}
                        className="h-8 text-xs hover:bg-gray-200"
                      >
                        {copiedField === 'curl' ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs overflow-x-auto font-mono border-2 border-gray-800">
                      {generateCurlCommand()}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Token Display */}
          {tokenData && (
            <div className="space-y-4">
              <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Key className="h-5 w-5 text-blue-600" />
                        Token Information
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Access token successfully obtained • Ready to use
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTokenData(null);
                        setSelectedUsername('');
                        setUserPassword('');
                        setClientSecret('');
                      }}
                      className="h-8"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Inspect Another
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Token Type & Expiration */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border border-gray-200">
                      <CardContent className="pt-4">
                        <div className="text-xs text-gray-500 mb-1">Token Type</div>
                        <div className="text-sm font-semibold text-gray-900">{tokenData.token_type || 'Bearer'}</div>
                      </CardContent>
                    </Card>
                    <Card className="border border-gray-200">
                      <CardContent className="pt-4">
                        <div className="text-xs text-gray-500 mb-1">Expires In</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {tokenData.expires_in ? `${tokenData.expires_in} seconds (${Math.floor(tokenData.expires_in / 60)} minutes)` : 'N/A'}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Access Token */}
                  <Card className="border border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Access Token</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(tokenData.access_token, 'token')}
                          className="h-7 text-xs"
                        >
                          {copiedField === 'token' ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <textarea
                        readOnly
                        value={tokenData.access_token}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-xs h-32 resize-none"
                      />
                    </CardContent>
                  </Card>

                  {/* Curl Command for Token Usage */}
                  {cluster && (
                    <Card className="border border-gray-200 bg-gray-50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-gray-600" />
                            <CardTitle className="text-sm">cURL Command (Get Token)</CardTitle>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(generateCurlCommand(), 'curl-token')}
                            className="h-7 text-xs"
                          >
                            {copiedField === 'curl-token' ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                        <CardDescription className="text-xs">
                          Use this command to get a token via cURL
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs overflow-x-auto font-mono">
                          {generateCurlCommand()}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Decoded Token Sections */}
              {tokenData.decoded && (
                <Card className="border border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-600" />
                      Decoded Token
                    </CardTitle>
                    <CardDescription className="text-xs">
                      JWT token decoded into header and payload
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Header */}
                    <Card className="border border-gray-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Header</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(tokenData.decoded.header, null, 2), 'header')}
                            className="h-7 text-xs"
                          >
                            {copiedField === 'header' ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-gray-50 border border-gray-300 rounded-md p-3 text-xs overflow-x-auto">
                          {JSON.stringify(tokenData.decoded.header, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>

                    {/* Payload */}
                    <Card className="border border-gray-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Payload</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(tokenData.decoded.payload, null, 2), 'payload')}
                            className="h-7 text-xs"
                          >
                            {copiedField === 'payload' ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-gray-50 border border-gray-300 rounded-md p-3 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                          {JSON.stringify(tokenData.decoded.payload, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>

                    {/* Claims Summary */}
                    {tokenData.decoded.claims && (
                      <Card className="border border-blue-200 bg-blue-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Claims Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            {tokenData.decoded.claims.subject && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Subject:</span>
                                <span className="font-mono text-gray-900">{tokenData.decoded.claims.subject}</span>
                              </div>
                            )}
                            {tokenData.decoded.claims.username && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Username:</span>
                                <span className="font-medium text-gray-900">{tokenData.decoded.claims.username}</span>
                              </div>
                            )}
                            {tokenData.decoded.claims.email && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Email:</span>
                                <span className="font-medium text-gray-900">{tokenData.decoded.claims.email}</span>
                              </div>
                            )}
                            {tokenData.decoded.claims.expiration && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expiration:</span>
                                <span className="font-medium text-gray-900">
                                  {formatDate(tokenData.decoded.claims.expiration as number)}
                                </span>
                              </div>
                            )}
                            {tokenData.decoded.claims.issued_at && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Issued At:</span>
                                <span className="font-medium text-gray-900">
                                  {formatDate(tokenData.decoded.claims.issued_at as number)}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Roles */}
                    {tokenData.decoded.claims && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Realm Roles */}
                        {tokenData.decoded.claims.realm_roles && (
                          <Card className="border border-green-200 bg-green-50">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Key className="h-4 w-4" />
                                Realm Roles
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex flex-wrap gap-2">
                                {(tokenData.decoded.claims.realm_roles as string[]).map((role: string, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                    {role}
                                  </span>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Client Roles */}
                        {tokenData.decoded.claims.client_roles && (
                          <Card className="border border-purple-200 bg-purple-50">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Client Roles
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {Object.entries(tokenData.decoded.claims.client_roles as Record<string, string[]>).map(([clientId, roles]) => (
                                  <div key={clientId}>
                                    <div className="text-xs font-medium text-gray-700 mb-1">{clientId}:</div>
                                    <div className="flex flex-wrap gap-2">
                                      {roles.map((role: string, idx: number) => (
                                        <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                          {role}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

