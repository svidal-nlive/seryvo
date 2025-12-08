import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, RefreshCw, AlertTriangle, Check, Copy, Plus, Trash2, Shield, Server, Mail, Bell, MapPin, CreditCard, Database, Globe } from 'lucide-react';
import Button from '../../components/ui/Button';
import { adminApi } from '../../services/api/admin';

interface ConfigItem {
  key: string;
  value: string;
  description: string;
  category: string;
  is_secret: boolean;
  updated_at?: string;
}

interface ConfigCategory {
  name: string;
  icon: React.ReactNode;
  description: string;
  configs: ConfigItem[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'stripe': <CreditCard className="w-5 h-5" />,
  'resend': <Mail className="w-5 h-5" />,
  'webpush': <Bell className="w-5 h-5" />,
  'mapbox': <MapPin className="w-5 h-5" />,
  'database': <Database className="w-5 h-5" />,
  'security': <Shield className="w-5 h-5" />,
  'general': <Server className="w-5 h-5" />,
  'api': <Globe className="w-5 h-5" />,
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'stripe': 'Payment processing with Stripe',
  'resend': 'Email notifications via Resend',
  'webpush': 'Browser push notifications',
  'mapbox': 'Maps and geocoding',
  'database': 'Database configuration',
  'security': 'Security and authentication',
  'general': 'General platform settings',
  'api': 'External API integrations',
};

// Default configuration templates
const DEFAULT_CONFIGS: ConfigItem[] = [
  // Stripe
  { key: 'STRIPE_PUBLISHABLE_KEY', value: '', description: 'Stripe publishable key (starts with pk_)', category: 'stripe', is_secret: false },
  { key: 'STRIPE_SECRET_KEY', value: '', description: 'Stripe secret key (starts with sk_)', category: 'stripe', is_secret: true },
  // Resend
  { key: 'RESEND_API_KEY', value: '', description: 'Resend API key for email sending', category: 'resend', is_secret: true },
  { key: 'RESEND_FROM_EMAIL', value: '', description: 'From email address for outgoing emails', category: 'resend', is_secret: false },
  // WebPush
  { key: 'VAPID_PUBLIC_KEY', value: '', description: 'VAPID public key for web push notifications', category: 'webpush', is_secret: false },
  { key: 'VAPID_PRIVATE_KEY', value: '', description: 'VAPID private key for web push notifications', category: 'webpush', is_secret: true },
  { key: 'VAPID_MAILTO', value: '', description: 'Contact email for VAPID (mailto:email@example.com)', category: 'webpush', is_secret: false },
  // Mapbox
  { key: 'MAPBOX_ACCESS_TOKEN', value: '', description: 'Mapbox access token for maps and geocoding', category: 'mapbox', is_secret: true },
  // Security
  { key: 'SECRET_KEY', value: '', description: 'Application secret key for JWT tokens', category: 'security', is_secret: true },
  // General
  { key: 'DEMO_MODE', value: 'false', description: 'Enable demo mode for testing', category: 'general', is_secret: false },
  { key: 'DEBUG', value: 'false', description: 'Enable debug mode', category: 'general', is_secret: false },
];

export const APIKeysSettingsView: React.FC = () => {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [editedConfigs, setEditedConfigs] = useState<Map<string, string>>(new Map());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newConfig, setNewConfig] = useState({ key: '', value: '', description: '', category: 'general', is_secret: false });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getPlatformConfig();
      
      // Merge default configs with database configs
      const dbConfigs = response.configs || [];
      const mergedConfigs = [...DEFAULT_CONFIGS];
      
      // Update with database values
      dbConfigs.forEach((dbConfig: ConfigItem) => {
        const index = mergedConfigs.findIndex(c => c.key === dbConfig.key);
        if (index >= 0) {
          mergedConfigs[index] = { ...mergedConfigs[index], ...dbConfig };
        } else {
          mergedConfigs.push(dbConfig);
        }
      });
      
      setConfigs(mergedConfigs);
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration');
      // Use defaults if API fails
      setConfigs(DEFAULT_CONFIGS);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setEditedConfigs(new Map(editedConfigs.set(key, value)));
  };

  const toggleSecretVisibility = (key: string) => {
    const newVisible = new Set(visibleSecrets);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleSecrets(newVisible);
  };

  const copyToClipboard = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const saveConfig = async (key: string) => {
    const value = editedConfigs.get(key);
    if (value === undefined) return;

    const config = configs.find(c => c.key === key);
    if (!config) return;

    try {
      setSaving(true);
      setError(null);
      await adminApi.updatePlatformConfig({
        key,
        value,
        description: config.description,
        category: config.category,
        is_secret: config.is_secret,
      });
      
      // Update local state
      setConfigs(configs.map(c => c.key === key ? { ...c, value } : c));
      editedConfigs.delete(key);
      setEditedConfigs(new Map(editedConfigs));
      setSuccess(`${key} saved successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || `Failed to save ${key}`);
    } finally {
      setSaving(false);
    }
  };

  const saveAllChanges = async () => {
    if (editedConfigs.size === 0) return;

    try {
      setSaving(true);
      setError(null);

      for (const [key, value] of editedConfigs.entries()) {
        const config = configs.find(c => c.key === key);
        if (config) {
          await adminApi.updatePlatformConfig({
            key,
            value,
            description: config.description,
            category: config.category,
            is_secret: config.is_secret,
          });
          // Update local state
          setConfigs(prev => prev.map(c => c.key === key ? { ...c, value } : c));
        }
      }

      setEditedConfigs(new Map());
      setSuccess('All changes saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const addNewConfig = async () => {
    if (!newConfig.key || !newConfig.value) {
      setError('Key and value are required');
      return;
    }

    if (configs.some(c => c.key === newConfig.key)) {
      setError('A configuration with this key already exists');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await adminApi.updatePlatformConfig(newConfig);
      setConfigs([...configs, newConfig]);
      setNewConfig({ key: '', value: '', description: '', category: 'general', is_secret: false });
      setShowAddNew(false);
      setSuccess('Configuration added successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add configuration');
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = async (key: string) => {
    if (!confirm(`Are you sure you want to delete ${key}?`)) return;

    try {
      setSaving(true);
      setError(null);
      await adminApi.deletePlatformConfig(key);
      setConfigs(configs.filter(c => c.key !== key));
      setSuccess('Configuration deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete configuration');
    } finally {
      setSaving(false);
    }
  };

  // Group configs by category
  const categories: ConfigCategory[] = [];
  const categoryMap = new Map<string, ConfigItem[]>();

  configs.forEach(config => {
    const cat = config.category || 'general';
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, []);
    }
    categoryMap.get(cat)!.push(config);
  });

  categoryMap.forEach((configItems, catName) => {
    categories.push({
      name: catName,
      icon: CATEGORY_ICONS[catName] || <Key className="w-5 h-5" />,
      description: CATEGORY_DESCRIPTIONS[catName] || catName,
      configs: configItems,
    });
  });

  // Sort categories
  categories.sort((a, b) => a.name.localeCompare(b.name));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-6 h-6" />
            API Keys & Configuration
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage API keys and platform settings. Changes take effect immediately.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadConfigs}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={saveAllChanges}
            disabled={saving || editedConfigs.size === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Save All ({editedConfigs.size})
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500" />
          <span className="text-green-700 dark:text-green-400">{success}</span>
        </div>
      )}

      {/* Security Warning */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-700 dark:text-amber-400 font-medium">Security Notice</p>
          <p className="text-amber-600 dark:text-amber-500 text-sm mt-1">
            API keys and secrets are sensitive. Never share them publicly. Secret values are masked for security.
            Changes to these settings are logged in the audit trail.
          </p>
        </div>
      </div>

      {/* Add New Config Button */}
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={() => setShowAddNew(!showAddNew)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Configuration
        </Button>
      </div>

      {/* Add New Config Form */}
      {showAddNew && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-white">Add New Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key</label>
              <input
                type="text"
                value={newConfig.key}
                onChange={(e) => setNewConfig({ ...newConfig, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                placeholder="API_KEY_NAME"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={newConfig.category}
                onChange={(e) => setNewConfig({ ...newConfig, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="general">General</option>
                <option value="api">API</option>
                <option value="security">Security</option>
                <option value="stripe">Stripe</option>
                <option value="resend">Resend</option>
                <option value="webpush">WebPush</option>
                <option value="mapbox">Mapbox</option>
                <option value="database">Database</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</label>
              <input
                type="text"
                value={newConfig.value}
                onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                placeholder="Value"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <input
                type="text"
                value={newConfig.description}
                onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                placeholder="Description of this configuration"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_secret"
                checked={newConfig.is_secret}
                onChange={(e) => setNewConfig({ ...newConfig, is_secret: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="is_secret" className="text-sm text-gray-700 dark:text-gray-300">
                This is a secret value (will be masked)
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddNew(false)}>Cancel</Button>
            <Button variant="primary" onClick={addNewConfig} disabled={saving}>
              <Plus className="w-4 h-4 mr-2" />
              Add Configuration
            </Button>
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.map((category) => (
        <div key={category.name} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Category Header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              {category.icon}
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white capitalize">{category.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{category.description}</p>
            </div>
          </div>

          {/* Config Items */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {category.configs.map((config) => {
              const isEdited = editedConfigs.has(config.key);
              const displayValue = isEdited ? editedConfigs.get(config.key)! : config.value;
              const isVisible = visibleSecrets.has(config.key);

              return (
                <div key={config.key} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                          {config.key}
                        </code>
                        {config.is_secret && (
                          <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded">
                            Secret
                          </span>
                        )}
                        {isEdited && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                            Modified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{config.description}</p>
                      
                      {/* Value Input */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={config.is_secret && !isVisible ? 'password' : 'text'}
                            value={displayValue}
                            onChange={(e) => handleValueChange(config.key, e.target.value)}
                            className={`w-full px-3 py-2 text-sm font-mono border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              isEdited 
                                ? 'border-blue-400 dark:border-blue-500' 
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder={config.is_secret ? '••••••••••••••••' : 'Enter value...'}
                          />
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          {config.is_secret && (
                            <button
                              onClick={() => toggleSecretVisibility(config.key)}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title={isVisible ? 'Hide value' : 'Show value'}
                            >
                              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                          
                          {displayValue && (
                            <button
                              onClick={() => copyToClipboard(config.key, displayValue)}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Copy value"
                            >
                              {copiedKey === config.key ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {isEdited && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => saveConfig(config.key)}
                              disabled={saving}
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                          )}

                          {!DEFAULT_CONFIGS.some(d => d.key === config.key) && (
                            <button
                              onClick={() => deleteConfig(config.key)}
                              className="p-2 text-red-400 hover:text-red-600"
                              title="Delete configuration"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {configs.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No configuration items found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add configuration keys to get started</p>
        </div>
      )}
    </div>
  );
};

export default APIKeysSettingsView;
