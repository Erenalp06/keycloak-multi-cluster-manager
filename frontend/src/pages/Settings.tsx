import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Globe, Bell, Database, Info, Users, UserCog, Key, TestTube, AlertCircle, CheckCircle2, Shield, Trash2, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ldapConfigApi, LDAPConfig, UpdateLDAPConfigRequest } from '@/services/api';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [ldapConfig, setLdapConfig] = useState<LDAPConfig | null>(null);
  const [ldapLoading, setLdapLoading] = useState(false);
  const [ldapTestResult, setLdapTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [showLdapConfig, setShowLdapConfig] = useState(false);
  const [certificateLoading, setCertificateLoading] = useState(false);

  // LDAP form state
  const [ldapForm, setLdapForm] = useState<UpdateLDAPConfigRequest>({
    enabled: false,
    server_url: '',
    bind_dn: '',
    bind_password: '',
    user_search_base: '',
    user_search_filter: '(uid={0})',
    group_search_base: '',
    group_search_filter: '',
    use_ssl: false,
    use_tls: true,
    skip_verify: false,
    timeout_seconds: 10,
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      loadLdapConfig();
    }
  }, [user]);

  const loadLdapConfig = async () => {
    try {
      setLdapLoading(true);
      const config = await ldapConfigApi.get();
      setLdapConfig(config);
      setLdapForm({
        enabled: config.enabled,
        server_url: config.server_url,
        bind_dn: config.bind_dn,
        bind_password: '', // Don't load password
        user_search_base: config.user_search_base,
        user_search_filter: config.user_search_filter || '(uid={0})',
        group_search_base: config.group_search_base || '',
        group_search_filter: config.group_search_filter || '',
        use_ssl: config.use_ssl,
        use_tls: config.use_tls,
        skip_verify: config.skip_verify,
        timeout_seconds: config.timeout_seconds || 10,
      });
    } catch (error: any) {
      console.error('Failed to load LDAP config:', error);
    } finally {
      setLdapLoading(false);
    }
  };

  const handleLdapSave = async () => {
    try {
      setLdapLoading(true);
      const updated = await ldapConfigApi.update(ldapForm);
      setLdapConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setLdapTestResult(null);
    } catch (error: any) {
      alert('Failed to save LDAP configuration: ' + error.message);
    } finally {
      setLdapLoading(false);
    }
  };

  const handleLdapTest = async () => {
    try {
      setLdapLoading(true);
      setLdapTestResult(null);
      // First save the config, then test
      await ldapConfigApi.update(ldapForm);
      const result = await ldapConfigApi.testConnection();
      setLdapTestResult(result);
    } catch (error: any) {
      setLdapTestResult({
        success: false,
        error: error.message || 'Connection test failed',
      });
    } finally {
      setLdapLoading(false);
    }
  };

  const handleFetchCertificate = async () => {
    try {
      setCertificateLoading(true);
      const result = await ldapConfigApi.fetchCertificate();
      if (result.success) {
        // Reload LDAP config to get updated certificate info
        await loadLdapConfig();
        alert('Certificate fetched and saved successfully!');
      }
    } catch (error: any) {
      alert('Failed to fetch certificate: ' + error.message);
    } finally {
      setCertificateLoading(false);
    }
  };

  const handleDeleteCertificate = async () => {
    if (!window.confirm('Are you sure you want to delete the certificate?')) {
      return;
    }
    try {
      setCertificateLoading(true);
      const result = await ldapConfigApi.deleteCertificate();
      if (result.success) {
        await loadLdapConfig();
        alert('Certificate deleted successfully!');
      }
    } catch (error: any) {
      alert('Failed to delete certificate: ' + error.message);
    } finally {
      setCertificateLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleSave = () => {
    // Mock save - in real app, this would call an API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-600">Configure your application preferences</p>
      </div>

      {/* Settings Grid - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* General Settings */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">General</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-1">
              Basic application settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Configure general application preferences and behavior.</p>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">Appearance</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-1">
              Customize the look and feel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Customize theme, language, and display preferences.</p>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">Notifications</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-1">
              Configure notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Manage email alerts and notification settings.</p>
          </CardContent>
        </Card>

        {/* Advanced */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">Advanced</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-1">
              Advanced configuration options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Configure logging, caching, and advanced features.</p>
          </CardContent>
        </Card>

        {/* User Management (Admin only) */}
        {user?.role === 'admin' && (
          <>
            <Card 
              onClick={() => navigate('/users')}
              className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-base font-semibold text-gray-900">Users</CardTitle>
                </div>
                <CardDescription className="text-xs text-gray-500 mt-1">
                  Manage application users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">View and manage application users and their permissions.</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => navigate('/roles')}
              className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-base font-semibold text-gray-900">Roles</CardTitle>
                </div>
                <CardDescription className="text-xs text-gray-500 mt-1">
                  Manage application roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Configure roles and permissions for the application.</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => setShowLdapConfig(!showLdapConfig)}
              className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-base font-semibold text-gray-900">LDAP Authentication</CardTitle>
                </div>
                <CardDescription className="text-xs text-gray-500 mt-1">
                  Configure LDAP/LDAPS authentication
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {ldapConfig?.enabled ? (
                    <span className="text-green-600 font-medium">LDAP is enabled</span>
                  ) : (
                    <span className="text-gray-500">LDAP is disabled</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* About */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">About</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-1">
              Application information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Version</span>
                <span className="font-medium text-gray-900">1.0.4.1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">License</span>
                <span className="font-medium text-gray-900">MIT</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* LDAP Configuration Panel (Admin only) */}
      {user?.role === 'admin' && showLdapConfig && (
        <Card className="mt-6 border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">LDAP Configuration</CardTitle>
            <CardDescription>Configure LDAP/LDAPS authentication provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ldap-enabled"
                checked={ldapForm.enabled}
                onChange={(e) => setLdapForm({ ...ldapForm, enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <Label htmlFor="ldap-enabled" className="font-medium">Enable LDAP Authentication</Label>
            </div>

            {ldapForm.enabled && (
              <div className="space-y-4 pt-4 border-t">
                {/* Server URL */}
                <div>
                  <Label htmlFor="server-url">LDAP Server URL</Label>
                  <Input
                    id="server-url"
                    value={ldapForm.server_url}
                    onChange={(e) => setLdapForm({ ...ldapForm, server_url: e.target.value })}
                    placeholder="ldap://localhost:389 or ldaps://ldap.example.com:636"
                    className="mt-1"
                  />
                </div>

                {/* Bind DN */}
                <div>
                  <Label htmlFor="bind-dn">Bind DN (Service Account)</Label>
                  <Input
                    id="bind-dn"
                    value={ldapForm.bind_dn}
                    onChange={(e) => setLdapForm({ ...ldapForm, bind_dn: e.target.value })}
                    placeholder="cn=admin,dc=example,dc=com"
                    className="mt-1"
                  />
                </div>

                {/* Bind Password */}
                <div>
                  <Label htmlFor="bind-password">Bind Password</Label>
                  <Input
                    id="bind-password"
                    type="password"
                    value={ldapForm.bind_password}
                    onChange={(e) => setLdapForm({ ...ldapForm, bind_password: e.target.value })}
                    placeholder="Leave empty to keep existing password"
                    className="mt-1"
                  />
                </div>

                {/* User Search Base */}
                <div>
                  <Label htmlFor="user-search-base">User Search Base</Label>
                  <Input
                    id="user-search-base"
                    value={ldapForm.user_search_base}
                    onChange={(e) => setLdapForm({ ...ldapForm, user_search_base: e.target.value })}
                    placeholder="ou=users,dc=example,dc=com"
                    className="mt-1"
                  />
                </div>

                {/* User Search Filter */}
                <div>
                  <Label htmlFor="user-search-filter">User Search Filter</Label>
                  <Input
                    id="user-search-filter"
                    value={ldapForm.user_search_filter}
                    onChange={(e) => setLdapForm({ ...ldapForm, user_search_filter: e.target.value })}
                    placeholder="(uid={0})"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use {`{0}`} as placeholder for username</p>
                </div>

                {/* SSL/TLS Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="use-ssl"
                      checked={ldapForm.use_ssl}
                      onChange={(e) => setLdapForm({ ...ldapForm, use_ssl: e.target.checked, use_tls: !e.target.checked && ldapForm.use_tls })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor="use-ssl">Use SSL (LDAPS)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="use-tls"
                      checked={ldapForm.use_tls}
                      onChange={(e) => setLdapForm({ ...ldapForm, use_tls: e.target.checked, use_ssl: !e.target.checked && ldapForm.use_ssl })}
                      className="w-4 h-4 text-blue-600 rounded"
                      disabled={ldapForm.use_ssl}
                    />
                    <Label htmlFor="use-tls">Use TLS (StartTLS)</Label>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="skip-verify"
                    checked={ldapForm.skip_verify}
                    onChange={(e) => setLdapForm({ ...ldapForm, skip_verify: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <Label htmlFor="skip-verify">Skip SSL Certificate Verification (not recommended for production)</Label>
                </div>

                {/* Timeout */}
                <div>
                  <Label htmlFor="timeout">Connection Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={ldapForm.timeout_seconds}
                    onChange={(e) => setLdapForm({ ...ldapForm, timeout_seconds: parseInt(e.target.value) || 10 })}
                    className="mt-1"
                    min="1"
                    max="60"
                  />
                </div>

                {/* Test Result */}
                {ldapTestResult && (
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${
                    ldapTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {ldapTestResult.success ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                    <span className="text-sm">
                      {ldapTestResult.success ? ldapTestResult.message : ldapTestResult.error}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleLdapTest}
                    disabled={ldapLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    <TestTube className="mr-2 h-4 w-4" />
                    Test Connection
                  </Button>
                  <Button
                    onClick={handleLdapSave}
                    disabled={ldapLoading}
                    className="flex-1 bg-[#4a5568] hover:bg-[#374151] text-white"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {ldapLoading ? 'Saving...' : 'Save LDAP Config'}
                  </Button>
                </div>
              </div>
            )}

            {/* Certificate Management Section */}
            {(ldapForm.use_ssl || ldapForm.use_tls) && (
              <div className="space-y-4 pt-6 border-t mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      SSL/TLS Certificate
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Manage the server certificate for secure LDAP connections
                    </p>
                  </div>
                </div>

                {ldapConfig?.certificate_info ? (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600 font-medium">Subject:</span>
                        <p className="text-gray-900 mt-1 break-all">{ldapConfig.certificate_info.subject}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Issuer:</span>
                        <p className="text-gray-900 mt-1 break-all">{ldapConfig.certificate_info.issuer}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Valid From:</span>
                        <p className="text-gray-900 mt-1">{formatDate(ldapConfig.certificate_info.not_before)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Valid Until:</span>
                        <p className="text-gray-900 mt-1">{formatDate(ldapConfig.certificate_info.not_after)}</p>
                      </div>
                      {ldapConfig.certificate_info.dns_names && ldapConfig.certificate_info.dns_names.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-gray-600 font-medium">DNS Names:</span>
                          <p className="text-gray-900 mt-1">{ldapConfig.certificate_info.dns_names.join(', ')}</p>
                        </div>
                      )}
                      {ldapConfig.certificate_fingerprint && (
                        <div className="col-span-2">
                          <span className="text-gray-600 font-medium">Fingerprint (SHA256):</span>
                          <p className="text-gray-900 mt-1 font-mono text-xs break-all">{ldapConfig.certificate_fingerprint}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleFetchCertificate}
                        disabled={certificateLoading || ldapLoading}
                        variant="outline"
                        className="flex-1"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Refresh Certificate
                      </Button>
                      <Button
                        onClick={handleDeleteCertificate}
                        disabled={certificateLoading || ldapLoading}
                        variant="outline"
                        className="flex-1 text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Certificate
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 mb-3">
                      No certificate is currently stored. Fetch the certificate from the LDAP server to enable certificate verification.
                    </p>
                    <Button
                      onClick={handleFetchCertificate}
                      disabled={certificateLoading || ldapLoading || !ldapForm.enabled}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {certificateLoading ? 'Fetching...' : 'Fetch Certificate from Server'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button
          onClick={handleSave}
          className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9"
        >
          <Save className="mr-1.5 h-4 w-4" />
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

