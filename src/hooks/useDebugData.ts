import { useState, useEffect } from 'react';
import { debugManager } from '../utils/Debuger';

export const useDebugData = (tableName: string, defaultData: any[] = []) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    try {
      const existingData = debugManager.getData(tableName);
      if (existingData.length === 0 && defaultData.length > 0) {
        // ถ้าไม่มีข้อมูลใน localStorage ให้ใช้ default data
        debugManager.updateData(tableName, defaultData);
        setData(defaultData);
      } else {
        setData(existingData);
      }
    } catch (error) {
      console.error('Error loading debug data:', error);
      setData(defaultData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tableName]);

  const refreshData = () => {
    loadData();
  };

  return { data, loading, refreshData };
};
