import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Globe, Bell, Database, Shield, Info } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    // General Settings
    apiUrl: 'http://localhost:8080/api',
    requestTimeout: '30',
    autoRefresh: true,
    refreshInterval: '60',
    
    // Appearance
    theme: 'light',
    language: 'en',
    compactMode: false,
    
    // Notifications
    emailNotifications: false,
    healthCheckAlerts: true,
    roleDiffAlerts: false,
    
    // Advanced
    enableLogging: true,
    logLevel: 'info',
    cacheEnabled: true,
    cacheTTL: '300',
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Mock save - in real app, this would call an API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-600">Configure your application preferences</p>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">General</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-0.5">
              Basic application settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="apiUrl" className="text-sm">API URL</Label>
              <Input
                id="apiUrl"
                className="h-9"
                value={settings.apiUrl}
                onChange={(e) => handleChange('apiUrl', e.target.value)}
                placeholder="http://localhost:8080/api"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeout" className="text-sm">Request Timeout (seconds)</Label>
              <Input
                id="timeout"
                className="h-9"
                type="number"
                value={settings.requestTimeout}
                onChange={(e) => handleChange('requestTimeout', e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoRefresh" className="text-sm">Auto Refresh</Label>
                <p className="text-xs text-gray-500 mt-0.5">Automatically refresh cluster data</p>
              </div>
              <Switch
                id="autoRefresh"
                checked={settings.autoRefresh}
                onCheckedChange={(checked: boolean) => handleChange('autoRefresh', checked)}
              />
            </div>
            {settings.autoRefresh && (
              <div className="grid gap-2">
                <Label htmlFor="refreshInterval" className="text-sm">Refresh Interval (seconds)</Label>
                <Input
                  id="refreshInterval"
                  className="h-9"
                  type="number"
                  value={settings.refreshInterval}
                  onChange={(e) => handleChange('refreshInterval', e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">Appearance</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-0.5">
              Customize the look and feel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="theme" className="text-sm">Theme</Label>
              <Select value={settings.theme} onValueChange={(value) => handleChange('theme', value)}>
                <SelectTrigger id="theme" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="language" className="text-sm">Language</Label>
              <Select value={settings.language} onValueChange={(value) => handleChange('language', value)}>
                <SelectTrigger id="language" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="tr">Türkçe</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="compactMode" className="text-sm">Compact Mode</Label>
                <p className="text-xs text-gray-500 mt-0.5">Reduce spacing for more content</p>
              </div>
              <Switch
                id="compactMode"
                checked={settings.compactMode}
                onCheckedChange={(checked: boolean) => handleChange('compactMode', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">Notifications</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-0.5">
              Configure notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNotifications" className="text-sm">Email Notifications</Label>
                <p className="text-xs text-gray-500 mt-0.5">Receive email alerts</p>
              </div>
              <Switch
                id="emailNotifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked: boolean) => handleChange('emailNotifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="healthCheckAlerts" className="text-sm">Health Check Alerts</Label>
                <p className="text-xs text-gray-500 mt-0.5">Alert when cluster health changes</p>
              </div>
              <Switch
                id="healthCheckAlerts"
                checked={settings.healthCheckAlerts}
                onCheckedChange={(checked: boolean) => handleChange('healthCheckAlerts', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="roleDiffAlerts" className="text-sm">Role Diff Alerts</Label>
                <p className="text-xs text-gray-500 mt-0.5">Alert on role differences</p>
              </div>
              <Switch
                id="roleDiffAlerts"
                checked={settings.roleDiffAlerts}
                onCheckedChange={(checked: boolean) => handleChange('roleDiffAlerts', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Advanced */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">Advanced</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-0.5">
              Advanced configuration options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enableLogging" className="text-sm">Enable Logging</Label>
                <p className="text-xs text-gray-500 mt-0.5">Enable application logging</p>
              </div>
              <Switch
                id="enableLogging"
                checked={settings.enableLogging}
                onCheckedChange={(checked: boolean) => handleChange('enableLogging', checked)}
              />
            </div>
            {settings.enableLogging && (
              <div className="grid gap-2">
                <Label htmlFor="logLevel" className="text-sm">Log Level</Label>
                <Select value={settings.logLevel} onValueChange={(value) => handleChange('logLevel', value)}>
                  <SelectTrigger id="logLevel" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="cacheEnabled" className="text-sm">Enable Cache</Label>
                <p className="text-xs text-gray-500 mt-0.5">Cache API responses</p>
              </div>
              <Switch
                id="cacheEnabled"
                checked={settings.cacheEnabled}
                onCheckedChange={(checked: boolean) => handleChange('cacheEnabled', checked)}
              />
            </div>
            {settings.cacheEnabled && (
              <div className="grid gap-2">
                <Label htmlFor="cacheTTL" className="text-sm">Cache TTL (seconds)</Label>
                <Input
                  id="cacheTTL"
                  className="h-9"
                  type="number"
                  value={settings.cacheTTL}
                  onChange={(e) => handleChange('cacheTTL', e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* About */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">About</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Version</span>
                <span className="font-medium text-gray-900">1.0.0 MVP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Build Date</span>
                <span className="font-medium text-gray-900">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">License</span>
                <span className="font-medium text-gray-900">MIT</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9"
          >
            <Save className="mr-1.5 h-4 w-4" />
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}

