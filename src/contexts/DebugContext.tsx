import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { DebugManager } from '../utils/Debuger';
import { TableSchema } from '../types/Debug';

interface DebugContextType {
  debugManager: DebugManager;
  refreshData: (tableName?: string) => void;
  isDebugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
  // เพิ่ม properties ที่ขาดหายไป
  currentPageTitle: string;
  currentRequiredTables: TableSchema[];
  triggerRefresh: () => void;
  setCurrentPage: (title: string, tables: TableSchema[]) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const useDebugContext = () => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebugContext must be used within a DebugProvider');
  }
  return context;
};

interface DebugProviderProps {
  children: React.ReactNode;
}

export const DebugProvider: React.FC<DebugProviderProps> = ({ children }) => {
  const [isDebugMode, setIsDebugMode] = useState(process.env.NODE_ENV === 'development');
  const [currentPageTitle, setCurrentPageTitle] = useState('');
  const [currentRequiredTables, setCurrentRequiredTables] = useState<TableSchema[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const debugManager = useMemo(() => DebugManager.getInstance(), []);
  
  const refreshData = useCallback((tableName?: string) => {
    if (tableName) {
      const data = debugManager.getData(tableName);
      console.log(`Debug: Refreshed ${tableName}:`, data);
    } else {
      console.log('Debug: Refreshed all data');
    }
    // Trigger re-render
    setRefreshTrigger(prev => prev + 1);
  }, [debugManager]);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const setDebugMode = useCallback((enabled: boolean) => {
    setIsDebugMode(enabled);
  }, []);

  const setCurrentPage = useCallback((title: string, tables: TableSchema[]) => {
    setCurrentPageTitle(title);
    setCurrentRequiredTables(tables);
  }, []);

  const contextValue = useMemo(() => ({
    debugManager,
    refreshData,
    isDebugMode,
    setDebugMode,
    currentPageTitle,
    currentRequiredTables,
    triggerRefresh,
    setCurrentPage
  }), [
    debugManager,
    refreshData,
    isDebugMode,
    setDebugMode,
    currentPageTitle,
    currentRequiredTables,
    triggerRefresh,
    setCurrentPage,
    refreshTrigger // เพิ่ม refreshTrigger เพื่อ trigger re-render
  ]);

  return (
    <DebugContext.Provider value={contextValue}>
      {children}
    </DebugContext.Provider>
  );
};
