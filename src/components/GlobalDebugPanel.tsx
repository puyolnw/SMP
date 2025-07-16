import React from 'react';
import { DebugPanel } from './DebugPanel';
import { useDebugContext } from '../contexts/DebugContext';

export const GlobalDebugPanel: React.FC = () => {
  const { 
    isDebugMode, 
    currentPageTitle, 
    currentRequiredTables, 
    triggerRefresh 
  } = useDebugContext();

  if (!isDebugMode) return null;

  return (
    <DebugPanel
      pageTitle={currentPageTitle || 'Unknown Page'}
      requiredTables={currentRequiredTables || []}
      onDataChange={triggerRefresh}
    />
  );
};
