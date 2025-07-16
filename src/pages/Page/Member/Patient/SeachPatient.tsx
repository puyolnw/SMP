import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageDebug } from '../../../../hooks/usePageDebug';
import { useDebugContext } from '../../../../contexts/DebugContext';
import { TableSchema } from '../../../../types/Debug';

interface Patient {
  id: string;
  prefix: string;
  firstNameTh: string;
  lastNameTh: string;
  firstNameEn?: string;
  lastNameEn?: string;
  gender: string;
  birthDate: string;
  age: number;
  nationalId: string;
  address: {
    houseNumber: string;
    village?: string;
    street?: string;
    subDistrict: string;
    district: string;
    province: string;
    postalCode: string;
  };
  phone: string;
  email?: string;
  profileImage?: string;
  qrCode?: string;
  bloodType?: string;
  chronicDiseases?: string[];
  allergies?: string[];
  currentMedications?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

const SearchPatient: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const navigate = useNavigate();
  const { debugManager } = useDebugContext();

  // Debug setup
  const requiredTables: TableSchema[] = useMemo(() => [
    {
      tableName: 'patients',
      columns: ['id', 'prefix', 'firstNameTh', 'lastNameTh', 'firstNameEn', 'lastNameEn', 'gender', 'birthDate', 'age', 'nationalId', 'address', 'phone', 'email', 'profileImage', 'qrCode', 'bloodType', 'chronicDiseases', 'allergies', 'currentMedications', 'emergencyContact'],
      description: 'ข้อมูลผู้ป่วยทั้งหมด'
    }
  ], []);

  const debugPageData = usePageDebug('ค้นหาผู้ป่วย', requiredTables);
  console.log('debugPageData', debugPageData);
  // Load patients from debug data
  useEffect(() => {
    const loadPatients = () => {
      const patients = debugManager.getData('patients');
      
      if (patients.length === 0) {
        // สร้างข้อมูลตัวอย่าง
        const mockPatients: Patient[] = [
          {
            id: 'P000001',
            prefix: 'นาย',
            firstNameTh: 'สมชาย',
            lastNameTh: 'ใจดี',
            firstNameEn: 'Somchai',
            lastNameEn: 'Jaidee',
            gender: 'ชาย',
            birthDate: '1990-01-01',
            age: 34,
            nationalId: '1234567890123',
            address: {
              houseNumber: '123/45',
              village: 'หมู่บ้านสวยงาม',
              street: 'ถนนสุขุมวิท',
              subDistrict: 'บางนา',
              district: 'บางนา',
              province: 'กรุงเทพมหานคร',
              postalCode: '10260'
            },
            phone: '081-234-5678',
            email: 'somchai@email.com',
            bloodType: 'O+',
            chronicDiseases: ['เบาหวาน'],
            allergies: ['ยาปฏิชีวนะ Penicillin'],
            currentMedications: ['ยาเบาหวาน'],
            emergencyContact: {
              name: 'สมหญิง ใจดี',
              phone: '081-234-5679',
              relationship: 'คู่สมรส'
            }
          },
          {
            id: 'P000002',
            prefix: 'นางสาว',
            firstNameTh: 'สมหญิง',
            lastNameTh: 'รักสุขภาพ',
            firstNameEn: 'Somying',
            lastNameEn: 'Raksukkhaphap',
            gender: 'หญิง',
            birthDate: '1995-05-15',
            age: 28,
            nationalId: '2345678901234',
            address: {
              houseNumber: '456/78',
              village: 'หมู่บ้านสุขใจ',
              street: 'ถนนพหลโยธิน',
              subDistrict: 'จตุจักร',
              district: 'จตุจักร',
              province: 'กรุงเทพมหานคร',
              postalCode: '10900'
            },
            phone: '082-345-6789',
            email: 'somying@email.com',
            bloodType: 'A+',
            chronicDiseases: [],
            allergies: ['อาหารทะเล'],
            currentMedications: [],
            emergencyContact: {
              name: 'สมชาย รักสุขภาพ',
              phone: '082-345-6790',
              relationship: 'พี่ชาย'
            }
          },
          {
            id: 'P000003',
            prefix: 'นาย',
            firstNameTh: 'วิชัย',
            lastNameTh: 'แข็งแรง',
            firstNameEn: 'Wichai',
            lastNameEn: 'Khaengraeng',
            gender: 'ชาย',
            birthDate: '1982-12-20',
            age: 41,
            nationalId: '3456789012345',
            address: {
              houseNumber: '789/12',
              village: '',
              street: 'ถนนรัชดาภิเษก',
              subDistrict: 'ห้วยขวาง',
              district: 'ห้วยขวาง',
              province: 'กรุงเทพมหานคร',
              postalCode: '10310'
            },
            phone: '083-456-7890',
            email: 'wichai@email.com',
            bloodType: 'B+',
            chronicDiseases: ['ความดันโลหิตสูง'],
            allergies: [],
            currentMedications: ['ยาลดความดัน'],
            emergencyContact: {
              name: 'มาลี แข็งแรง',
              phone: '083-456-7891',
              relationship: 'คู่สมรส'
            }
          }
        ];

        // เพิ่มข้อมูลตัวอย่างลง debug storage
        mockPatients.forEach(patient => {
          debugManager.addData('patients', patient);
        });
        
        setAllPatients(mockPatients);
      } else {
        setAllPatients(patients);
      }
    };

    loadPatients();
  }, [debugManager]);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsLoading(true);
    
    // จำลองการค้นหา
    setTimeout(() => {
      const results = allPatients.filter(patient => {
        const fullNameTh = `${patient.prefix} ${patient.firstNameTh} ${patient.lastNameTh}`;
        const fullNameEn = patient.firstNameEn && patient.lastNameEn 
          ? `${patient.firstNameEn} ${patient.lastNameEn}` 
          : '';
        
        return (
          fullNameTh.toLowerCase().includes(searchTerm.toLowerCase()) ||
          fullNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.phone.includes(searchTerm) ||
          patient.id.includes(searchTerm) ||
          patient.nationalId.includes(searchTerm)
        );
      });
      
      setSearchResults(results);
      setIsLoading(false);
    }, 500);
  };

  const handleViewPatient = (patient: Patient) => {
    navigate('/member/patient/datapatient', { state: { patient } });
  };

  const handleAddPatient = () => {
    navigate('/member/patient/addpatient');
  };

  const getFullName = (patient: Patient) => {
    return `${patient.prefix} ${patient.firstNameTh} ${patient.lastNameTh}`;
  };

  const formatAddress = (address: Patient['address']) => {
    const parts = [
      address.subDistrict,
      address.district,
      address.province
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">ค้นหาผู้ป่วย</h1>
          <button
            onClick={handleAddPatient}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            เพิ่มผู้ป่วยใหม่
          </button>
        </div>
        
        {/* ส่วนค้นหา */}
        <div className="mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ค้นหาด้วย ชื่อ, เบอร์โทร, รหัสผู้ป่วย หรือ เลขบัตรประชาชน
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="กรอกคำค้นหา..."
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  ค้นหา...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  ค้นหา
                </>
              )}
            </button>
          </div>
        </div>

        {/* สถิติผู้ป่วยทั้งหมด */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
                        <span className="font-semibold">จำนวนผู้ป่วยทั้งหมด: {allPatients.length} คน</span>
          </div>
        </div>

        {/* ผลการค้นหา */}
        {searchTerm && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              ผลการค้นหา: {searchResults.length} รายการ
            </h2>
          </div>
        )}

        {/* รายการผู้ป่วย */}
        <div className="space-y-4">
          {searchResults.map((patient) => (
            <div
              key={patient.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => handleViewPatient(patient)}
            >
              <div className="flex items-center gap-4">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                    {patient.profileImage ? (
                      <img
                        src={patient.profileImage}
                        alt={getFullName(patient)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-100">
                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Patient Info */}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{getFullName(patient)}</h3>
                      {patient.firstNameEn && patient.lastNameEn && (
                        <p className="text-gray-600">{`${patient.firstNameEn} ${patient.lastNameEn}`}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">รหัสผู้ป่วย: {patient.id}</p>
                      <p className="text-sm text-gray-500">อายุ: {patient.age} ปี</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">เบอร์โทร:</span> {patient.phone}
                    </p>
                    <p>
                      <span className="font-medium">ที่อยู่:</span> {formatAddress(patient.address)}
                    </p>
                  </div>
                  {/* Medical Tags */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {patient.bloodType && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        กรุ๊ปเลือด {patient.bloodType}
                      </span>
                    )}
                    {patient.chronicDiseases && patient.chronicDiseases.length > 0 && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        โรคประจำตัว {patient.chronicDiseases.length} รายการ
                      </span>
                    )}
                    {patient.allergies && patient.allergies.length > 0 && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        แพ้ยา/อาหาร {patient.allergies.length} รายการ
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow Icon */}
                <div className="flex-shrink-0 text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}

          {searchTerm && searchResults.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">ไม่พบผู้ป่วยที่ค้นหา</p>
              <button
                onClick={handleAddPatient}
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                เพิ่มผู้ป่วยใหม่
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPatient;
