/**
 * Seryvo Platform - Region/Geofence Editor
 * Admin tool for managing service areas with polygon drawing
 */

import { useState, useMemo } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Eye,
  EyeOff,
  Layers,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Car,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

// =============================================================================
// Types
// =============================================================================

interface Coordinate {
  lat: number;
  lng: number;
}

interface Region {
  region_id: string;
  name: string;
  type: 'service_area' | 'surge_zone' | 'airport' | 'restricted' | 'premium';
  polygon: Coordinate[];
  is_active: boolean;
  settings: RegionSettings;
  created_at: string;
  updated_at: string;
}

interface RegionSettings {
  surge_multiplier?: number;
  min_fare_multiplier?: number;
  allowed_vehicle_types?: string[];
  airport_fee?: number;
  restricted_hours?: { start: string; end: string }[];
  notes?: string;
}

type RegionType = Region['type'];

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_REGIONS: Region[] = [
  {
    region_id: 'region-1',
    name: 'Downtown Core',
    type: 'service_area',
    polygon: [
      { lat: 40.7589, lng: -73.9851 },
      { lat: 40.7614, lng: -73.9776 },
      { lat: 40.7529, lng: -73.9772 },
      { lat: 40.7505, lng: -73.9847 },
    ],
    is_active: true,
    settings: {},
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-11-20T14:30:00Z',
  },
  {
    region_id: 'region-2',
    name: 'JFK Airport',
    type: 'airport',
    polygon: [
      { lat: 40.6413, lng: -73.7781 },
      { lat: 40.6513, lng: -73.7581 },
      { lat: 40.6313, lng: -73.7581 },
      { lat: 40.6313, lng: -73.7781 },
    ],
    is_active: true,
    settings: {
      airport_fee: 1500, // $15.00 in cents
      allowed_vehicle_types: ['standard', 'premium', 'suv'],
    },
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-10-15T11:00:00Z',
  },
  {
    region_id: 'region-3',
    name: 'Entertainment District',
    type: 'surge_zone',
    polygon: [
      { lat: 40.7580, lng: -73.9855 },
      { lat: 40.7600, lng: -73.9830 },
      { lat: 40.7560, lng: -73.9810 },
      { lat: 40.7545, lng: -73.9840 },
    ],
    is_active: true,
    settings: {
      surge_multiplier: 1.5,
      restricted_hours: [
        { start: '22:00', end: '04:00' },
      ],
    },
    created_at: '2024-02-01T08:00:00Z',
    updated_at: '2024-11-01T16:45:00Z',
  },
  {
    region_id: 'region-4',
    name: 'Residential Zone',
    type: 'restricted',
    polygon: [
      { lat: 40.7450, lng: -73.9900 },
      { lat: 40.7480, lng: -73.9850 },
      { lat: 40.7420, lng: -73.9850 },
      { lat: 40.7420, lng: -73.9900 },
    ],
    is_active: false,
    settings: {
      notes: 'No pickups between 11PM-6AM',
      restricted_hours: [
        { start: '23:00', end: '06:00' },
      ],
    },
    created_at: '2024-03-15T12:00:00Z',
    updated_at: '2024-09-20T10:30:00Z',
  },
];

const REGION_TYPE_CONFIG: Record<RegionType, { label: string; color: string; bgColor: string; icon: typeof MapPin }> = {
  service_area: {
    label: 'Service Area',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: MapPin,
  },
  surge_zone: {
    label: 'Surge Zone',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: DollarSign,
  },
  airport: {
    label: 'Airport',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: MapPin,
  },
  restricted: {
    label: 'Restricted',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: AlertTriangle,
  },
  premium: {
    label: 'Premium',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: Car,
  },
};

// =============================================================================
// Component
// =============================================================================

export default function RegionGeofenceEditor() {
  // Start with empty array - data populates when demo data is loaded
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Partial<Region> | null>(null);
  const [filterType, setFilterType] = useState<RegionType | 'all'>('all');
  const [showInactive, setShowInactive] = useState(true);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set(regions.map(r => r.region_id)));

  // Filter regions
  const filteredRegions = useMemo(() => {
    return regions.filter(region => {
      if (filterType !== 'all' && region.type !== filterType) return false;
      if (!showInactive && !region.is_active) return false;
      return true;
    });
  }, [regions, filterType, showInactive]);

  // Format date
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Toggle layer visibility
  const toggleLayerVisibility = (regionId: string) => {
    const newVisible = new Set(visibleLayers);
    if (newVisible.has(regionId)) {
      newVisible.delete(regionId);
    } else {
      newVisible.add(regionId);
    }
    setVisibleLayers(newVisible);
  };

  // Open edit modal
  const handleEdit = (region: Region) => {
    setEditingRegion({ ...region });
    setShowEditModal(true);
  };

  // Open create modal
  const handleCreate = () => {
    setEditingRegion({
      region_id: `region-${Date.now()}`,
      name: '',
      type: 'service_area',
      polygon: [],
      is_active: true,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setShowEditModal(true);
  };

  // Save region
  const handleSave = () => {
    if (!editingRegion || !editingRegion.name) return;

    const updatedRegion: Region = {
      ...editingRegion as Region,
      updated_at: new Date().toISOString(),
    };

    const existingIndex = regions.findIndex(r => r.region_id === updatedRegion.region_id);
    if (existingIndex >= 0) {
      const newRegions = [...regions];
      newRegions[existingIndex] = updatedRegion;
      setRegions(newRegions);
    } else {
      setRegions([...regions, updatedRegion]);
      setVisibleLayers(new Set([...visibleLayers, updatedRegion.region_id]));
    }

    setShowEditModal(false);
    setEditingRegion(null);
  };

  // Delete region
  const handleDelete = () => {
    if (!selectedRegion) return;
    setRegions(regions.filter(r => r.region_id !== selectedRegion.region_id));
    setShowDeleteConfirm(false);
    setSelectedRegion(null);
  };

  // Toggle region active status
  const toggleRegionStatus = (regionId: string) => {
    setRegions(regions.map(r => 
      r.region_id === regionId 
        ? { ...r, is_active: !r.is_active, updated_at: new Date().toISOString() }
        : r
    ));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Region & Geofence Editor
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage service areas, surge zones, and restricted regions
          </p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Region
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Regions List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Filters */}
          <Card>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-white">Filters</span>
              </div>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as RegionType | 'all')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                {Object.entries(REGION_TYPE_CONFIG).map(([type, config]) => (
                  <option key={type} value={type}>{config.label}</option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                Show inactive regions
              </label>
            </div>
          </Card>

          {/* Region Cards */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredRegions.map((region) => {
              const config = REGION_TYPE_CONFIG[region.type];
              const Icon = config.icon;
              const isVisible = visibleLayers.has(region.region_id);
              const isSelected = selectedRegion?.region_id === region.region_id;

              return (
                <Card
                  key={region.region_id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary-500' : ''
                  } ${!region.is_active ? 'opacity-60' : ''}`}
                  onClick={() => setSelectedRegion(region)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {region.name}
                        </h3>
                        {!region.is_active && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${config.color}`}>
                        {config.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Updated {formatDate(region.updated_at)}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerVisibility(region.region_id);
                      }}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      title={isVisible ? 'Hide on map' : 'Show on map'}
                    >
                      {isVisible ? (
                        <Eye className="w-4 h-4 text-gray-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </Card>
              );
            })}

            {filteredRegions.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No regions found</p>
              </div>
            )}
          </div>
        </div>

        {/* Map Area */}
        <div className="lg:col-span-2">
          <Card className="h-[700px] overflow-hidden">
            {/* Map Placeholder - In production, integrate with Leaflet */}
            <div className="relative h-full bg-gray-100 dark:bg-slate-800">
              {/* Map Header */}
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg px-4 py-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {visibleLayers.size} of {regions.length} regions visible
                  </p>
                </div>
                
                {selectedRegion && (
                  <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg px-3 py-2 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(selectedRegion)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleRegionStatus(selectedRegion.region_id)}
                    >
                      {selectedRegion.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Map Visualization Placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                  <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Interactive Map
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Click and drag to draw polygon boundaries for regions.
                    The map would display all visible regions with color-coded overlays.
                  </p>
                  
                  {/* Region Legend */}
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-4 text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Legend</p>
                    <div className="space-y-2">
                      {Object.entries(REGION_TYPE_CONFIG).map(([type, config]) => {
                        const Icon = config.icon;
                        const count = regions.filter(r => r.type === type).length;
                        return (
                          <div key={type} className="flex items-center gap-2 text-sm">
                            <div className={`w-6 h-6 rounded flex items-center justify-center ${config.bgColor}`}>
                              <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                            </div>
                            <span className="text-gray-700 dark:text-gray-300">{config.label}</span>
                            <span className="text-gray-400">({count})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Region Details Panel */}
              {selectedRegion && (
                <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-slate-900 rounded-lg shadow-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {selectedRegion.name}
                      </h3>
                      <p className={`text-sm ${REGION_TYPE_CONFIG[selectedRegion.type].color}`}>
                        {REGION_TYPE_CONFIG[selectedRegion.type].label}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedRegion(null)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Status</p>
                      <p className="text-gray-900 dark:text-white flex items-center gap-1">
                        {selectedRegion.is_active ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Active
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Inactive
                          </>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Polygon Points</p>
                      <p className="text-gray-900 dark:text-white">
                        {selectedRegion.polygon.length} vertices
                      </p>
                    </div>
                    {selectedRegion.settings.surge_multiplier && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Surge Multiplier</p>
                        <p className="text-gray-900 dark:text-white">
                          {selectedRegion.settings.surge_multiplier}x
                        </p>
                      </div>
                    )}
                    {selectedRegion.settings.airport_fee && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Airport Fee</p>
                        <p className="text-gray-900 dark:text-white">
                          ${(selectedRegion.settings.airport_fee / 100).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRegion(null);
        }}
        title={editingRegion?.name ? `Edit: ${editingRegion.name}` : 'Create Region'}
        size="md"
      >
        {editingRegion && (
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Region Name *
              </label>
              <input
                type="text"
                value={editingRegion.name || ''}
                onChange={(e) => setEditingRegion({ ...editingRegion, name: e.target.value })}
                placeholder="e.g., Downtown Core"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Region Type
              </label>
              <select
                value={editingRegion.type || 'service_area'}
                onChange={(e) => setEditingRegion({ ...editingRegion, type: e.target.value as RegionType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                {Object.entries(REGION_TYPE_CONFIG).map(([type, config]) => (
                  <option key={type} value={type}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* Type-specific settings */}
            {editingRegion.type === 'surge_zone' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Surge Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={editingRegion.settings?.surge_multiplier || 1.5}
                  onChange={(e) => setEditingRegion({
                    ...editingRegion,
                    settings: { ...editingRegion.settings, surge_multiplier: parseFloat(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {editingRegion.type === 'airport' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Airport Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(editingRegion.settings?.airport_fee || 0) / 100}
                  onChange={(e) => setEditingRegion({
                    ...editingRegion,
                    settings: { ...editingRegion.settings, airport_fee: Math.round(parseFloat(e.target.value) * 100) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={editingRegion.settings?.notes || ''}
                onChange={(e) => setEditingRegion({
                  ...editingRegion,
                  settings: { ...editingRegion.settings, notes: e.target.value }
                })}
                placeholder="Optional notes about this region..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>

            {/* Active Toggle */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editingRegion.is_active ?? true}
                onChange={(e) => setEditingRegion({ ...editingRegion, is_active: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Region is active</span>
            </label>

            {/* Polygon Info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> To define the region boundary, use the map drawing tools after saving.
                Current polygon has {editingRegion.polygon?.length || 0} vertices.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRegion(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!editingRegion.name}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Region
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Region"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong>{selectedRegion?.name}</strong>? 
            This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
