import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  address: string;
  bloodType?: string;
  allergies?: string[];
  medicalHistory?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

const DataPatient: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const patient = location.state?.patient as Patient;

  // ถ้าไม่มีข้อมูลผู้ป่วย ให้กลับไปหน้าค้นหา
  if (!patient) {
    navigate('/member/patient/search');
    return null;
  }

  // เพิ่มข้อมูลเพิ่มเติมสำหรับการแสดงผล
  const patientData: Patient = {
    ...patient,
    bloodType: 'O+',
    allergies: ['ยาปฏิชีวนะ Penicillin', 'อาหารทะเล'],
    medicalHistory: ['ความดันโลหิตสูง', 'เบาหวาน'],
    emergencyContact: {
      name: 'สมศรี ใจดี',
      phone: '081-111-2222',
      relationship: 'คู่สมรส'
    }
  };

  const handleBack = () => {
    navigate('/member/patient/search');
  };

  const handleEdit = () => {
    // นำไปหน้าแก้ไขข้อมูล (ใช้หน้า AddPatient ในโหมดแก้ไข)
    navigate('/member/patient/add', { state: { patient: patientData, isEdit: true } });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{patientData.name}</h1>
              <p className="text-blue-100">รหัสผู้ป่วย: {patientData.id}</p>
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
                <label className="block text-sm font-medium text-gray-600 mb-1">ชื่อ-นามสกุล</label>
                <p className="text-lg font-semibold text-gray-800">{patientData.name}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">อายุ</label>
                <p className="text-lg font-semibold text-gray-800">{patientData.age} ปี</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">เพศ</label>
                <p className="text-lg font-semibold text-gray-800">{patientData.gender}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">เบอร์โทรศัพท์</label>
                <p className="text-lg font-semibold text-gray-800">{patientData.phone}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">หมู่เลือด</label>
                <p className="text-lg font-semibold text-gray-800">{patientData.bloodType}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg col-span-1 md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">ที่อยู่</label>
                <p className="text-lg font-semibold text-gray-800">{patientData.address}</p>
              </div>
            </div>
          </div>

          {/* ข้อมูลการแพ้ยา */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">ข้อมูลการแพ้ยา/อาหาร</h2>
            <div className="bg-red-50 p-4 rounded-lg">
              {patientData.allergies && patientData.allergies.length > 0 ? (
                <div className="space-y-2">
                  {patientData.allergies.map((allergy, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-700 font-medium">{allergy}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">ไม่มีข้อมูลการแพ้ยา/อาหาร</p>
              )}
            </div>
          </div>

          {/* ประวัติการรักษา */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">ประวัติการรักษา</h2>
            <div className="bg-yellow-50 p-4 rounded-lg">
              {patientData.medicalHistory && patientData.medicalHistory.length > 0 ? (
                <div className="space-y-2">
                  {patientData.medicalHistory.map((history, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-yellow-700 font-medium">{history}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">ไม่มีประวัติการรักษา</p>
              )}
            </div>
          </div>

          {/* ข้อมูลผู้ติดต่อฉุกเฉิน */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">ผู้ติดต่อฉุกเฉิน</h2>
            {patientData.emergencyContact ? (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">ชื่อ</label>
                    <p className="text-lg font-semibold text-green-700">{patientData.emergencyContact.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">เบอร์โทร</label>
                    <p className="text-lg font-semibold text-green-700">{patientData.emergencyContact.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">ความสัมพันธ์</label>
                    <p className="text-lg font-semibold text-green-700">{patientData.emergencyContact.relationship}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-500">ไม่มีข้อมูลผู้ติดต่อฉุกเฉิน</p>
              </div>
            )}
          </div>

          {/* ปุ่มดำเนินการ */}
          <div className="flex justify-center gap-4 pt-6 border-t">
            <button
              onClick={handleEdit}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              แก้ไขข้อมูล
            </button>
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              กลับไปค้นหา
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataPatient;
