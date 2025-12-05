/**
 * Seryvo Platform - Fleet Overview View
 * Admin view for monitoring all drivers and active trips in real-time
 */

import { useState } from 'react';
import { Map, List, Grid, Filter, Download } from 'lucide-react';
import FleetMap from '../components/map/FleetMap';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

type ViewMode = 'map' | 'list' | 'split';

export default function FleetOverviewView() {
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [autoRefresh, setAutoRefresh] = useState(true);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Fleet Overview
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor drivers and active trips in real-time
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Map size={16} className="inline mr-1.5" />
              Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <List size={16} className="inline mr-1.5" />
              List
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Grid size={16} className="inline mr-1.5" />
              Split
            </button>
          </div>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition ${
              autoRefresh
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            Live
          </button>

          <Button variant="secondary" size="sm">
            <Filter size={16} />
            Filter
          </Button>

          <Button variant="secondary" size="sm">
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <Card noPadding>
          <FleetMap height="calc(100vh - 220px)" />
        </Card>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <List size={48} className="mx-auto mb-4 opacity-50" />
            <p>List view coming soon</p>
            <p className="text-sm mt-2">Use the Map view to see all drivers</p>
          </div>
        </Card>
      )}

      {/* Split View */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card noPadding>
            <FleetMap height="500px" />
          </Card>
          <Card>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <List size={48} className="mx-auto mb-4 opacity-50" />
              <p>Driver list panel coming soon</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
