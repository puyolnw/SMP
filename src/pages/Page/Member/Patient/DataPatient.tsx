import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { usePageDebug } from '../../../../hooks/usePageDebug';
import { useDebugContext } from '../../../../contexts/DebugContext';
import { TableSchema } from '../../../../types/Debug';

interface Patient {
  id: string;
  // ข้อมูลส่วนตัว
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
  
  // ข้อมูลสุขภาพพื้นฐาน
  bloodType?: string;
  chronicDiseases?: string[];
  allergies?: string[];
  currentMedications?: string[];
  
  // ข้อมูลผู้ติดต่อฉุกเฉิน
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

const DataPatient: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { debugManager } = useDebugContext();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  // Debug setup
  const requiredTables: TableSchema[] = useMemo(() => [
    {
      tableName: 'patients',
      columns: ['id', 'prefix', 'firstNameTh', 'lastNameTh', 'firstNameEn', 'lastNameEn', 'gender', 'birthDate', 'age', 'nationalId', 'address', 'phone', 'email', 'profileImage', 'qrCode', 'bloodType', 'chronicDiseases', 'allergies', 'currentMedications', 'emergencyContact'],
      description: 'ข้อมูลผู้ป่วยทั้งหมด'
    }
  ], []);

  const debugPageData = usePageDebug('ข้อมูลผู้ป่วย', requiredTables);
  console.log(debugPageData);
  useEffect(() => {
    const loadPatientData = async () => {
      try {
        setIsLoading(true);
        
        // ลองดึงข้อมูลจาก location state ก่อน
        const statePatient = location.state?.patient as Patient;
        
        if (statePatient) {
          setPatient(statePatient);
          setIsLoading(false);
          return;
        }

        // ถ้ามี id ใน url ให้ดึงจาก backend
        if (id) {
          try {
            const res = await axios.get(`${API_BASE_URL}/api/patient/${id}`);
            const data = res.data;
            // แปลงข้อมูลให้ตรงกับ Patient interface ถ้าจำเป็น
            setPatient({
              id: data._id,
              prefix: data.prefix,
              firstNameTh: data.first_name_th,
              lastNameTh: data.last_name_th,
              firstNameEn: data.first_name_en,
              lastNameEn: data.last_name_en,
              gender: data.gender,
              birthDate: data.birth_date,
              age: Number(data.age),
              nationalId: data.national_id,
              address: {
                houseNumber: data.address?.house_no || '',
                village: data.address?.village || '',
                street: data.address?.road || '',
                subDistrict: data.address?.subdistrict || '',
                district: data.address?.district || '',
                province: data.address?.province || '',
                postalCode: data.address?.zipcode || '',
              },
              phone: data.phone,
              email: data.email,
              profileImage: data.image_path,
              qrCode: data.qr_code,
              bloodType: data.blood_type,
              chronicDiseases: data.chronic_diseases,
              allergies: data.allergies,
              currentMedications: data.current_medications,
              emergencyContact: data.emergency_contact,
            });
            setIsLoading(false);
            return;
          } catch {
            setError('ไม่พบข้อมูลผู้ป่วยหรือเกิดข้อผิดพลาด');
            setIsLoading(false);
            return;
          }
        }

        // ถ้าไม่มีใน state ให้ดึงจาก debug data
        const patients = debugManager.getData('patients');
        if (patients.length > 0) {
          // ใช้ patient แรกเป็นตัวอย่าง หรือจะใช้ ID จาก URL params
          setPatient(patients[0]);
        } else {
          // สร้างข้อมูลตัวอย่าง
          const samplePatient: Patient = {
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
            profileImage: '', // จะใส่รูปตัวอย่างถ้ามี
            qrCode: 'QR123456',
            bloodType: 'O+',
            chronicDiseases: ['เบาหวาน', 'ความดันโลหิตสูง'],
            allergies: ['ยาปฏิชีวนะ Penicillin', 'อาหารทะเล'],
            currentMedications: ['ยาเบาหวาน', 'ยาลดความดัน'],
            emergencyContact: {
              name: 'สมหญิง ใจดี',
              phone: '081-234-5679',
              relationship: 'คู่สมรส'
            }
          };
          
          debugManager.addData('patients', samplePatient);
          setPatient(samplePatient);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading patient data:', err);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ป่วย');
        setIsLoading(false);
      }
    };

    loadPatientData();
  }, [location.state, debugManager, id, API_BASE_URL]);

  // ถ้าไม่มีข้อมูลผู้ป่วย ให้กลับไปหน้าค้นหา
  useEffect(() => {
    if (!isLoading && !patient && !error && !id) {
      navigate('/member/patient/searchpatient');
    }
  }, [patient, isLoading, error, navigate, id]);

  const handleBack = () => {
    navigate('/member/patient/searchpatient');
  };

  const handleEdit = () => {
    if (patient) {
      navigate('/member/patient/add', { state: { patient: patient, isEdit: true } });
    }
  };

  // Format address for display
  const formatAddress = (address: Patient['address']) => {
    const parts = [
      address.houseNumber,
      address.village,
      address.street,
      address.subDistrict,
      address.district,
      address.province,
      address.postalCode
    ].filter(Boolean);
    
    return parts.join(' ');
  };

  // Format full name
  const getFullName = (patient: Patient) => {
    return `${patient.prefix} ${patient.firstNameTh} ${patient.lastNameTh}`;
  };

  const getFullNameEn = (patient: Patient) => {
    if (patient.firstNameEn && patient.lastNameEn) {
      return `${patient.firstNameEn} ${patient.lastNameEn}`;
    }
    return null;
  };

  // Helper สำหรับสร้าง URL รูปโปรไฟล์
  const getProfileImageUrl = (profileImage?: string) => {
    if (!profileImage) return undefined;
    // ถ้า profileImage มี uploads/ อยู่แล้ว
    return `${API_BASE_URL}/api/patient/${profileImage}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูลผู้ป่วย...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 text-xl font-bold mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            กลับไปหน้าค้นหา
          </button>
        </div>
      </div>
    );
  }

  // No patient data
  if (!patient) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  {patient.profileImage ? (
                    <img
                      src={getProfileImageUrl(patient.profileImage)}
                      alt={`รูปโปรไฟล์ของ ${getFullName(patient)}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h1 className="text-2xl font-bold">{getFullName(patient)}</h1>
                {getFullNameEn(patient) && (
                  <p className="text-blue-100 text-lg">{getFullNameEn(patient)}</p>
                )}
                <p className="text-blue-100">รหัสผู้ป่วย: {patient.id}</p>
                {patient.qrCode && (
                  <p className="text-blue-100 text-sm">QR Code: {patient.qrCode}</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                แก้ไข
              </button>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                กลับ
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* ข้อมูลส่วนตัว */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">ข้อมูลส่วนตัว</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">ชื่อ-นามสกุล (ไทย)</label>
                <p className="text-lg font-semibold text-gray-800">{getFullName(patient)}</p>
              </div>
              
              {getFullNameEn(patient) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-600 mb-1">ชื่อ-นามสกุล (อังกฤษ)</label>
                  <p className="text-lg font-semibold text-gray-800">{getFullNameEn(patient)}</p>
                </div>
              )}
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">เพศ</label>
                <p className="text-lg font-semibold text-gray-800">{patient.gender}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">วันเกิด</label>
                <p className="text-lg font-semibold text-gray-800">
                  {new Date(patient.birthDate).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">อายุ</label>
                <p className="text-lg font-semibold text-gray-800">{patient.age} ปี</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">เลขบัตรประชาชน</label>
                <p className="text-lg font-semibold text-gray-800">{patient.nationalId}</p>              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">เบอร์โทรศัพท์</label>
                <p className="text-lg font-semibold text-gray-800">{patient.phone}</p>
              </div>
              
              {patient.email && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-600 mb-1">อีเมล</label>
                  <p className="text-lg font-semibold text-gray-800">{patient.email}</p>
                </div>
              )}
              
              {patient.bloodType && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-600 mb-1">กรุ๊ปเลือด</label>
                  <p className="text-lg font-semibold text-red-600">{patient.bloodType}</p>
                </div>
              )}
            </div>
          </div>

          {/* ที่อยู่ */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">ที่อยู่</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-lg text-gray-800">{formatAddress(patient.address)}</p>
            </div>
          </div>

          {/* ข้อมูลสุขภาพ */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">ข้อมูลสุขภาพ</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* โรคประจำตัว */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  โรคประจำตัว
                </h3>
                {patient.chronicDiseases && patient.chronicDiseases.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.chronicDiseases.map((disease, index) => (
                      <li key={index} className="flex items-center gap-2 text-blue-700">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        {disease}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-blue-600 italic">ไม่มีโรคประจำตัว</p>
                )}
              </div>

              {/* แพ้ยา/อาหาร */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  แพ้ยา/อาหาร
                </h3>
                {patient.allergies && patient.allergies.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.allergies.map((allergy, index) => (
                      <li key={index} className="flex items-center gap-2 text-red-700">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        {allergy}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-red-600 italic">ไม่มีการแพ้ยา/อาหาร</p>
                )}
              </div>

              {/* ยาที่รับประทานประจำ */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  ยาประจำ
                </h3>
                {patient.currentMedications && patient.currentMedications.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.currentMedications.map((medication, index) => (
                      <li key={index} className="flex items-center gap-2 text-yellow-700">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        {medication}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-yellow-600 italic">ไม่มียาประจำ</p>
                )}
              </div>
            </div>
          </div>

          {/* ผู้ติดต่อฉุกเฉิน */}
          {patient.emergencyContact && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">ผู้ติดต่อฉุกเฉิน</h2>
              <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-400">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-orange-800">{patient.emergencyContact.name}</h3>
                    <p className="text-orange-600">{patient.emergencyContact.relationship}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-orange-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${patient.emergencyContact.phone}`} className="hover:underline">
                    {patient.emergencyContact.phone}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Section */}
          {patient.qrCode && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">QR Code</h2>
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <div className="inline-block p-4 bg-white rounded-lg shadow-md">
                  {/* สามารถใส่ QR Code generator library ตรงนี้ */}
                  <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <p className="text-sm text-gray-500">QR Code</p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-gray-600">รหัส: {patient.qrCode}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pt-6 border-t">
            <button
              onClick={handleEdit}
              className="px-8 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              แก้ไขข้อมูล
            </button>
            
            <button
              onClick={() => window.print()}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              พิมพ์ข้อมูล
            </button>
            
            <button
              onClick={handleBack}
              className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              กลับไปค้นหา
            </button>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style >{`        @media print {
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          .container {
            max-width: none !important;
            padding: 0 !important;
          }
          
          .bg-blue-600 {
            background-color: #2563eb !important;
            -webkit-print-color-adjust: exact;
          }
          
          .text-white {
            color: white !important;
            -webkit-print-color-adjust: exact;
          }
          
          .shadow-lg {
            box-shadow: none !important;
          }
          
          .rounded-lg {
            border-radius: 0 !important;
          }
          
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  );
};

export default DataPatient;

