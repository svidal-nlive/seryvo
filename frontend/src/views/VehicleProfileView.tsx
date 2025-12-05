import React from 'react';
import { VehicleProfileEditor } from '../components/driver/VehicleProfileEditor';

export const VehicleProfileView: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <VehicleProfileEditor />
    </div>
  );
};
