import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  address: string;
}

const SearchPatient: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Mock data สำหรับทดสอบ
  const mockPatients: Patient[] = [
    { id: '1', name: 'สมชาย ใจดี', age: 35, gender: 'ชาย', phone: '081-234-5678', address: 'กรุงเทพฯ' },
    { id: '2', name: 'สมหญิง รักสุขภาพ', age: 28, gender: 'หญิง', phone: '082-345-6789', address: 'เชียงใหม่' },
    { id: '3', name: 'วิชัย แข็งแรง', age: 42, gender: 'ชาย', phone: '083-456-7890', address: 'ขอนแก่น' },
    { id: '4', name: 'มาลี สวยงาม', age: 31, gender: 'หญิง', phone: '084-567-8901', address: 'ภูเก็ต' },
  ];

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    
    // จำลองการค้นหา
    setTimeout(() => {
      const results = mockPatients.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone.includes(searchTerm) ||
        patient.id.includes(searchTerm)
      );
      setSearchResults(results);
      setIsLoading(false);
    }, 500);
  };

  const handleViewPatient = (patient: Patient) => {
    // ส่งข้อมูลผู้ป่วยไปยังหน้า DataPatient
    navigate('/member/pantient/dataPantient', { state: { patient } });
  };

  const handleAddPatient = () => {
    navigate('/Member/Pantient/AddPantient');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">ค้นหาผู้ป่วย</h1>
        
        {/* ส่วนค้นหา */}
        <div className="mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ค้นหาด้วย ชื่อ, เบอร์โทร หรือ รหัสผู้ป่วย
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="กรอกข้อมูลที่ต้องการค้นหา..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || !searchTerm.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'กำลังค้นหา...' : 'ค้นหา'}
            </button>
          </div>
        </div>

        {/* ปุ่มเพิ่มผู้ป่วยใหม่ */}
        <div className="mb-6">
          <button
            onClick={handleAddPatient}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            เพิ่มผู้ป่วยใหม่
          </button>
        </div>

        {/* ผลการค้นหา */}
        {searchResults.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              ผลการค้นหา ({searchResults.length} รายการ)
            </h2>
            <div className="space-y-3">
              {searchResults.map((patient) => (
                <div
                  key={patient.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-gray-800">{patient.name}</h3>
                        <span className="text-sm text-gray-500">รหัส: {patient.id}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        <div>อายุ: {patient.age} ปี</div>
                        <div>เพศ: {patient.gender}</div>
                        <div>เบอร์โทร: {patient.phone}</div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        ที่อยู่: {patient.address}
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewPatient(patient)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      ดูข้อมูล
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* กรณีไม่พบข้อมูล */}
        {searchTerm && searchResults.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
              </svg>
              <p className="text-lg">ไม่พบข้อมูลผู้ป่วยที่ค้นหา</p>
              <p className="text-sm">ลองค้นหาด้วยคำอื่น หรือเพิ่มผู้ป่วยใหม่</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPatient;
