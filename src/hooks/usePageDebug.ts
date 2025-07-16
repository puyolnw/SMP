import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebugContext } from '../contexts/DebugContext';
import { TableSchema } from '../types/Debug';

export const usePageDebug = (pageTitle: string, requiredTables: TableSchema[]) => {
  const { debugManager, setCurrentPage } = useDebugContext();
  const [debugData, setDebugData] = useState<any>({});
  
  // ใช้ useRef เพื่อป้องกันการ update วนซ้ำ
  const initialized = useRef(false);
  const tablesRef = useRef(requiredTables);

  // ตั้งค่า current page เพียงครั้งเดียวเมื่อ component mount
  useEffect(() => {
    if (!initialized.current) {
      setCurrentPage(pageTitle, requiredTables);
      
      // โหลดข้อมูลเริ่มต้น
      const data: any = {};
      requiredTables.forEach(table => {
        data[table.tableName] = debugManager.getData(table.tableName);
      });
      setDebugData(data);
      
      initialized.current = true;
    }
  }, []); // ไม่มี dependencies เพื่อให้ทำงานเพียงครั้งเดียว

  // ฟังก์ชันสำหรับรีเฟรชข้อมูล (เรียกใช้เมื่อต้องการอัพเดทข้อมูล)
  const refreshData = useCallback(() => {
    if (!initialized.current) return;
    
    const data: any = {};
    tablesRef.current.forEach(table => {
      data[table.tableName] = debugManager.getData(table.tableName);
    });
    setDebugData(data);
  }, [debugManager]);

  return {
    debugData,
    refreshData,
    pageTitle,
    requiredTables: tablesRef.current
  };
};
