import React, { useState, useCallback, useMemo } from 'react';
import { TableSchema } from '../types/Debug';
import { DebugManager } from '../utils/Debuger';

interface DebugPanelProps {
  pageTitle: string;
  requiredTables: TableSchema[];
  onDataChange?: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ 
  pageTitle, 
  requiredTables, 
  onDataChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [newRowData, setNewRowData] = useState<any>({});
  
  // ใช้ useMemo สำหรับ debugManager
  const debugManager = useMemo(() => DebugManager.getInstance(), []);

  // ใช้ useCallback สำหรับ functions
  const handleAddData = useCallback(() => {
    if (selectedTable && newRowData) {
      try {
        const processedData = { ...newRowData };
        
        // แปลง address string เป็น object
        if (processedData.address && typeof processedData.address === 'string') {
          try {
            processedData.address = JSON.parse(processedData.address);
          } catch {
            processedData.address = {
              houseNumber: processedData.address,
              subDistrict: '',
              district: '',
              province: '',
              postalCode: ''
            };
          }
        }
        
        // แปลง arrays
        ['chronicDiseases', 'allergies', 'currentMedications'].forEach(field => {
          if (processedData[field] && typeof processedData[field] === 'string') {
            processedData[field] = processedData[field].split(',').map((item: string) => item.trim());
          }
        });
        
        // แปลง emergencyContact
        if (processedData.emergencyContact && typeof processedData.emergencyContact === 'string') {
          try {
            processedData.emergencyContact = JSON.parse(processedData.emergencyContact);
          } catch {
            processedData.emergencyContact = {
              name: processedData.emergencyContact,
              phone: '',
              relationship: ''
            };
          }
        }
        
        debugManager.addData(selectedTable, processedData);
        setNewRowData({});
        onDataChange?.();
      } catch (error) {
        console.error('Error adding debug data:', error);
      }
    }
  }, [selectedTable, newRowData, debugManager, onDataChange]);

  const handleClearData = useCallback((tableName: string) => {
    debugManager.clearData(tableName);
    onDataChange?.();
  }, [debugManager, onDataChange]);

  // ซ่อนใน production
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <>
      {/* Debug Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg z-50 hover:bg-red-600"
        title="Debug Mode"
      >
        🐛
      </button>

      {/* Debug Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Debug Panel - {pageTitle}</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Required Tables Info */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">หน้านี้ต้องการข้อมูลจาก:</h3>
              {requiredTables.map((table) => (
                <div key={table.tableName} className="mb-4 p-3 border rounded">
                  <h4 className="font-medium">Table: {table.tableName}</h4>
                  <p className="text-sm text-gray-600">{table.description}</p>
                  <p className="text-sm">Columns: {table.columns.join(', ')}</p>
                  
                  {/* Show current data */}
                  <div className="mt-2">
                    <strong>Current Data ({debugManager.getData(table.tableName).length} records):</strong>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 max-h-32 overflow-auto">
                      {JSON.stringify(debugManager.getData(table.tableName), null, 2)}
                    </pre>
                  </div>
                  
                  {/* Clear data button */}
                  <button
                    onClick={() => handleClearData(table.tableName)}
                    className="mt-2 text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                  >
                    Clear Data
                  </button>
                </div>
              ))}
            </div>

            {/* Add Data Form */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">เพิ่มข้อมูลทดสอบ:</h3>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="border rounded px-3 py-2 mb-2 w-full"
              >
                <option value="">เลือก Table</option>
                {requiredTables.map((table) => (
                  <option key={table.tableName} value={table.tableName}>
                    {table.tableName}
                  </option>
                ))}
              </select>

              {selectedTable && (
                <div className="space-y-2">
                  {requiredTables
                    .find(t => t.tableName === selectedTable)
                    ?.columns.map((column: string) => (
                      <input
                        key={column}
                        placeholder={column}
                        value={newRowData[column] || ''}
                        onChange={(e) => setNewRowData({
                          ...newRowData,
                          [column]: e.target.value
                        })}
                        className="border rounded px-3 py-2 w-full"
                      />
                    ))}
                  
                  <button
                    onClick={handleAddData}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    เพิ่มข้อมูล
                  </button>
                </div>
              )}
            </div>
             </div>
        </div>
      )}
    </>
  );
};

