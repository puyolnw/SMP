import { DebugData } from '../types/Debug';

export class DebugManager {
  private static instance: DebugManager;
  
  static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager();
    }
    return DebugManager.instance;
  }

  // ดึงข้อมูลจาก localStorage
  getData(tableName: string): any[] {
    try {
      const data = localStorage.getItem(`debug_${tableName}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting debug data:', error);
      return [];
    }
  }

  // เพิ่มข้อมูลลง localStorage
  addData(tableName: string, newData: any): void {
    try {
      const existingData = this.getData(tableName);
      const dataWithId = {
        ...newData,
        id: newData.id || Date.now().toString(),
        created_at: new Date().toISOString()
      };
      existingData.push(dataWithId);
      localStorage.setItem(`debug_${tableName}`, JSON.stringify(existingData));
    } catch (error) {
      console.error('Error adding debug data:', error);
    }
  }

  // อัพเดทข้อมูล
  updateData(tableName: string, data: any[]): void {
    try {
      localStorage.setItem(`debug_${tableName}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error updating debug data:', error);
    }
  }

  // ลบข้อมูล
  clearData(tableName: string): void {
    try {
      localStorage.removeItem(`debug_${tableName}`);
    } catch (error) {
      console.error('Error clearing debug data:', error);
    }
  }

  // ลบข้อมูลทั้งหมด
  clearAllData(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('debug_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing all debug data:', error);
    }
  }

  // ดึงรายชื่อ table ทั้งหมด
  getAllTables(): string[] {
    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter(key => key.startsWith('debug_'))
        .map(key => key.replace('debug_', ''));
    } catch (error) {
      console.error('Error getting all tables:', error);
      return [];
    }
  }

  // Export ข้อมูลทั้งหมด
  exportAllData(): DebugData {
    const result: DebugData = {};
    const tables = this.getAllTables();
    
    tables.forEach(table => {
      result[table] = this.getData(table);
    });
    
    return result;
  }

  // Import ข้อมูล
  importData(data: DebugData): void {
    try {
      Object.keys(data).forEach(tableName => {
        this.updateData(tableName, data[tableName]);
      });
    } catch (error) {
      console.error('Error importing debug data:', error);
    }
  }
}

// Export singleton instance
export const debugManager = DebugManager.getInstance();
