import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';


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

const API_BASE_URL = import.meta.env.VITE_API_URL;

// เพิ่มฟังก์ชัน getProfileImageUrl
const getProfileImageUrl = (profileImage?: string) => {
  if (!profileImage) return undefined;
  // ถ้า profileImage มี uploads/ อยู่แล้ว
  return `${API_BASE_URL}/api/patient/${profileImage}`;
};

const SearchPatient: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const navigate = useNavigate();

  // ดึงข้อมูลผู้ป่วยจาก API
  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/patient`);
        // แปลงข้อมูลทุกตัว
        const mapped = res.data.map(mapPatientFromApi);
        setAllPatients(mapped);
      } catch {
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ป่วย');
      }
      setIsLoading(false);
    };
    fetchPatients();
  }, []);

  // 1. เพิ่ม useEffect สำหรับ search-as-you-type
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setIsLoading(true);
    const timeout = setTimeout(() => {
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
          patient.nationalId?.includes(searchTerm)
        );
      });
      setSearchResults(results);
      setIsLoading(false);
    }, 200);
    return () => clearTimeout(timeout);
  }, [searchTerm, allPatients]);

  const handleViewPatient = (patient: Patient) => {
    navigate(`/member/patient/dataPatient/${patient.id}`, { state: { patient } });
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

  // เพิ่ม default image
  const defaultImage = 'https://via.placeholder.com/64';

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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="กรอกคำค้นหา..."
              />
            </div>
            {/* 2. ลบปุ่มค้นหาออกจาก UI (หรือคงไว้แต่ไม่จำเป็นต้องใช้) */}
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
                    {/* 3. เวลาสร้าง <img> ให้ใช้ URL เต็ม */}
                    <img
                      src={patient.profileImage ? getProfileImageUrl(patient.profileImage) : defaultImage}
                      alt={getFullName(patient)}
                      className="w-full h-full object-cover"
                    />
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

function mapPatientFromApi(apiPatient: unknown): Patient {
  const p = apiPatient as Record<string, unknown>;
  const addressObj = typeof p.address === 'object' && p.address !== null ? p.address as Record<string, unknown> : {};
  return {
    id: (p._id as string) || '',
    prefix: (p.prefix as string) || '',
    firstNameTh: (p.first_name_th as string) || '',
    lastNameTh: (p.last_name_th as string) || '',
    firstNameEn: (p.first_name_en as string) || '',
    lastNameEn: (p.last_name_en as string) || '',
    gender: (p.gender as string) || '',
    birthDate: (p.birth_date as string) || '',
    age: (p.age as number) || 0,
    nationalId: (p.national_id as string) || '',
    address: {
      houseNumber: (addressObj.house_no as string) || '',
      village: (addressObj.village as string) || '',
      street: (addressObj.road as string) || '',
      subDistrict: (addressObj.subdistrict as string) || '',
      district: (addressObj.district as string) || '',
      province: (addressObj.province as string) || '',
      postalCode: (addressObj.zipcode as string) || '',
    },
    phone: (p.phone as string) || '',
    email: (p.email as string) || '',
    profileImage: (p.image_path as string) || '',
    bloodType: (p.blood_type as string) || '',
    chronicDiseases: (p.chronic_diseases as string[]) || [],
    allergies: (p.allergies as string[]) || [],
    currentMedications: (p.current_medications as string[]) || [],
    emergencyContact: (p.emergency_contact as { name: string; phone: string; relationship: string }) || { name: '', phone: '', relationship: '' },
  };
}

export default SearchPatient;
