import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageDebug } from '../../../hooks/usePageDebug';
import { TableSchema } from '../../../types/Debug';
import { DebugManager } from '../../../utils/Debuger';

interface PatientData {
  id: string;
  name: string;
  nationalId: string;
  profileImage?: string;
  faceData?: string;
}

type VerificationStep = 'face-scan' | 'id-input' | 'register' | 'success';
type VerificationMode = 'camera' | 'upload';

const AuthenPatient: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const debugManager = DebugManager.getInstance();
  const [cameraInitialized, setCameraInitialized] = useState(false);
  console.log('cameraInitialized:', cameraInitialized);
  // Debug setup
  
  const requiredTables: TableSchema[] = [
    {
      tableName: 'patients',
      columns: ['id', 'firstNameTh', 'lastNameTh', 'nationalId', 'profileImage', 'faceData'],
      description: 'ข้อมูลผู้ป่วยสำหรับการยืนยันตัวตน'
    },
    {
      tableName: 'screeningQueue',
      columns: ['patientId', 'timestamp', 'status', 'department'],
      description: 'ข้อมูลคิวการคัดกรอง'
    }
  ];

  
  
  const [currentStep, setCurrentStep] = useState<VerificationStep>('face-scan');
  const [isScanning, setIsScanning] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [verificationMode, setVerificationMode] = useState<VerificationMode>('camera');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [foundPatient, setFoundPatient] = useState<PatientData | null>(null);
  const { debugData } = usePageDebug('ยืนยันตัวตนผู้ป่วย', requiredTables);
  console.log('debugData:', debugData);
  // ดึงข้อมูลผู้ป่วยจาก localStorage
  const getPatientData = (): PatientData[] => {
    const patients = debugManager.getData('patients');
    return patients.map((patient: any) => ({
      id: patient.id || 'P' + Math.random().toString().slice(2, 8),
      name: `${patient.prefix || ''} ${patient.firstNameTh || ''} ${patient.lastNameTh || ''}`.trim(),
      nationalId: patient.nationalId || '',
      profileImage: patient.profileImage,
      faceData: patient.faceData
    }));
  };

  // Mock patient data (fallback)
  const mockPatientData: PatientData = {
    id: 'P001234',
    name: 'นายสมชาย ใจดี',
    nationalId: '1234567890123'
  };

  // Toggle verification mode (debug feature)
  const toggleVerificationMode = () => {
    setVerificationMode(prev => prev === 'camera' ? 'upload' : 'camera');
    if (verificationMode === 'camera') {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Handle file upload (debug feature)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setUploadedFileUrl(url);
    }
  };

  // เริ่มกล้อง
  const startCamera = async () => {
  if (verificationMode !== 'camera' || stream) return;
  
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 1280, height: 720 }
    });
    setStream(mediaStream);
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
  } catch (error) {
    setErrorMessage('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้อง');
  }
};

  // หยุดกล้อง
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // บันทึกข้อมูลผู้ป่วยที่ยืนยันตัวตนสำเร็จลงใน localStorage
  const saveAuthenticatedPatient = (patient: PatientData) => {
    localStorage.setItem('authenticatedPatient', JSON.stringify(patient));
    
    // บันทึกข้อมูลคิวคัดกรอง
    const screeningQueue = {
      patientId: patient.id,
      timestamp: new Date().toISOString(),
      status: 'waiting',
      department: 'แผนกอายุรกรรม' // ค่าเริ่มต้น จะถูกเลือกในหน้าถัดไป
    };
    
    // เพิ่มข้อมูลคิวลงใน localStorage
    const currentQueue = debugManager.getData('screeningQueue');
    debugManager.updateData('screeningQueue', [...currentQueue, screeningQueue]);
  };

  // สแกนใบหน้า
  const handleFaceScan = async () => {
    setIsScanning(true);
    setErrorMessage('');
    
    // จำลองการสแกนใบหน้า
    setTimeout(() => {
      const patients = getPatientData();
      
      if (verificationMode === 'upload' && uploadedFile) {
        // ในโหมด debug ให้สำเร็จเสมอถ้ามีไฟล์อัพโหลด
        if (patients.length > 0) {
          const patient = patients[0]; // ใช้ผู้ป่วยคนแรก
          setFoundPatient(patient);
          setCurrentStep('success');
        } else {
          setFoundPatient(mockPatientData);
          setCurrentStep('success');
        }
        stopCamera();
      } else {
        // โหมดกล้องปกติ
        const isSuccess = Math.random() > 0.3; // 70% โอกาสสำเร็จ
        
        if (isSuccess && patients.length > 0) {
          const patient = patients[0]; // ใช้ผู้ป่วยคนแรก
          setFoundPatient(patient);
          setCurrentStep('success');
          stopCamera();
        } else if (isSuccess) {
          setFoundPatient(mockPatientData);
          setCurrentStep('success');
          stopCamera();
        } else {
          setErrorMessage('ไม่พบข้อมูลใบหน้าในระบบ กรุณากรอกเลขบัตรประชาชน');
          setCurrentStep('id-input');
          stopCamera();
        }
      }
      setIsScanning(false);
    }, 3000);
  };

  // ตรวจสอบเลขบัตรประชาชน
  const handleIdVerification = async () => {
    if (nationalId.length !== 13) {
      setErrorMessage('กรุณากรอกเลขบัตรประชาชน 13 หลัก');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      const patients = getPatientData();
      const foundPatientById = patients.find(p => p.nationalId === nationalId);
      
      if (foundPatientById) {
        setFoundPatient(foundPatientById);
        setCurrentStep('success');
      } else if (nationalId === mockPatientData.nationalId) {
        setFoundPatient(mockPatientData);
        setCurrentStep('success');
      } else {
        setErrorMessage('ไม่พบข้อมูลในระบบ กรุณาลงทะเบียนสมาชิกใหม่');
        setCurrentStep('register');
      }
      setIsLoading(false);
    }, 2000);
  };

  // ลงทะเบียนสมาชิกใหม่
  const handleRegister = () => {
    // ไม่ใช้ replace เพื่อให้สามารถกดปุ่มย้อนกลับได้
    navigate('/member/patient/add', { state: { nationalId } });
  };

  // ไปหน้าถัดไป
  const handleContinue = () => {
    const patientToPass = foundPatient || mockPatientData;
    
    // บันทึกข้อมูลผู้ป่วยที่ยืนยันตัวตนสำเร็จ
    saveAuthenticatedPatient(patientToPass);
    
    // นำทางไปยังหน้าคัดกรอง โดยไม่ใช้ replace
    navigate('/screening/patient', { state: { patient: patientToPass } });
  };

 const handleBackToFaceScan = () => {
  setCurrentStep('face-scan');
  setNationalId('');
  setErrorMessage('');
  setUploadedFile(null);
  setUploadedFileUrl('');
  setCameraInitialized(false); // รีเซ็ตสถานะกล้อง
};

  // เริ่มกล้องเมื่อเข้าหน้า face-scan
 useEffect(() => {
  // เพิ่มเงื่อนไขเพื่อป้องกันการเรียกซ้ำ
  if (currentStep === 'face-scan' && verificationMode === 'camera' && !stream) {
    startCamera();
  }
  
  // Cleanup function
  return () => {
    if (currentStep !== 'face-scan') {
      stopCamera();
    }
  };
}, [currentStep, verificationMode]); // ลบ stream ออกจาก dependency array

  // หยุดกล้องเมื่อออกจากหน้านี้
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // หน้าสแกนใบหน้า
  if (currentStep === 'face-scan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex">
        {/* Left Panel - Instructions */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">ยืนยันตัวตน</h1>
            <p className="text-white/80 text-lg">สแกนใบหน้าเพื่อยืนยันตัวตน</p>
          </div>

          <div className="space-y-6">
            <div className="bg-white/20 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                วิธีการใช้งาน
              </h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">1.</span>
                  {verificationMode === 'camera' ? 'วางใบหน้าให้อยู่ในกรอบสี่เหลี่ยม' : 'เลือกไฟล์รูปภาพหรือวิดีโอ'}
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">2.</span>
                  {verificationMode === 'camera' ? 'หันหน้าตรงและอยู่นิ่งๆ' : 'ตรวจสอบไฟล์ที่อัพโหลด'}
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">3.</span>
                  กดปุ่ม "เริ่มสแกน" เพื่อเริ่มการยืนยัน
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">4.</span>
                  รอการประมวลผลประมาณ 3-5 วินาที
                </li>
              </ul>
            </div>

                        <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-4">
              <p className="text-yellow-200 text-sm">
                <strong>หมายเหตุ:</strong> หากไม่พบข้อมูลใบหน้าในระบบ คุณสามารถยืนยันตัวตนด้วยเลขบัตรประชาชนได้
              </p>
            </div>

            {/* Debug Mode Toggle */}
            {process.env.NODE_ENV !== 'production' && (
              <button
                onClick={toggleVerificationMode}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>สลับโหมด: {verificationMode === 'camera' ? 'กล้อง' : 'อัพโหลดไฟล์'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Panel - Camera */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">สแกนใบหน้า</h2>
                <p className="text-gray-600">กรุณาวางใบหน้าให้อยู่ในกรอบและหันหน้าตรง</p>
              </div>

              {verificationMode === 'camera' ? (
                <div className="relative mb-6 rounded-xl overflow-hidden bg-black aspect-[4/3]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3/4 h-3/4 border-2 border-dashed border-white/70 rounded-xl"></div>
                  </div>
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-white font-medium">กำลังสแกน...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[4/3] mb-4">
                    {uploadedFileUrl ? (
                      <img
                        src={uploadedFileUrl}
                        alt="Uploaded"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {isScanning && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-white font-medium">กำลังสแกน...</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="face-upload"
                  />
                  <label
                    htmlFor="face-upload"
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>อัพโหลดรูปภาพ</span>
                  </label>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 text-sm">{errorMessage}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleFaceScan}
                disabled={isScanning || (verificationMode === 'upload' && !uploadedFile)}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isScanning ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>กำลังสแกน...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>เริ่มสแกน</span>
                  </>
                )}
              </button>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setCurrentStep('id-input')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  หรือยืนยันตัวตนด้วยเลขบัตรประชาชน
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // หน้ากรอกเลขบัตรประชาชน
  if (currentStep === 'id-input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-red-600 to-pink-700 flex">
        {/* Left Panel - Info */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">ยืนยันตัวตน</h1>
            <p className="text-white/80 text-lg">กรอกเลขบัตรประชาชน</p>
          </div>
          <div className="space-y-6">
            <div className="bg-white/20 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                วิธีการใช้งาน
              </h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">1.</span>
                  กรอกเลขบัตรประชาชน 13 หลัก
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">2.</span>
                  ตรวจสอบความถูกต้องของข้อมูล
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">3.</span>
                  กดปุ่ม "ยืนยันตัวตน" เพื่อดำเนินการต่อ
                </li>
              </ul>
            </div>
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4">
              <p className="text-blue-200 text-sm">
                <strong>หมายเหตุ:</strong> หากไม่มีข้อมูลในระบบ คุณจะต้องลงทะเบียนสมาชิกใหม่
              </p>
            </div>
            <button
              onClick={handleBackToFaceScan}
              className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>กลับไปสแกนใบหน้า</span>
            </button>
          </div>
        </div>

        {/* Right Panel - ID Input */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">ยืนยันตัวตนด้วยเลขบัตรประชาชน</h2>
                <p className="text-gray-600">กรุณากรอกเลขบัตรประชาชน 13 หลัก</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เลขบัตรประชาชน
                </label>
                <input
                                    type="text"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/[^0-9]/g, '').slice(0, 13))}
                  placeholder="กรอกเลขบัตรประชาชน 13 หลัก"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-xl tracking-wider"
                  maxLength={13}
                />
                <div className="flex justify-center mt-2">
                  {Array.from({ length: 13 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-1 mx-0.5 rounded-full ${
                        i < nationalId.length ? 'bg-orange-500' : 'bg-gray-300'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 text-sm">{errorMessage}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleIdVerification}
                disabled={nationalId.length !== 13 || isLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>กำลังตรวจสอบ...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>ยืนยันตัวตน</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // หน้าลงทะเบียนสมาชิกใหม่
  if (currentStep === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-600 to-emerald-700 flex">
        {/* Left Panel - Info */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">ลงทะเบียนสมาชิกใหม่</h1>
            <p className="text-white/80 text-lg">ไม่พบข้อมูลในระบบ</p>
          </div>
          <div className="space-y-6">
            <div className="bg-white/20 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ข้อมูลเพิ่มเติม
              </h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">•</span>
                  ไม่พบข้อมูลของคุณในระบบ
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">•</span>
                  คุณจำเป็นต้องลงทะเบียนสมาชิกใหม่
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">•</span>
                  กรุณาเตรียมบัตรประชาชนและข้อมูลส่วนตัวให้พร้อม
                </li>
              </ul>
            </div>
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4">
              <p className="text-blue-200 text-sm">
                <strong>หมายเหตุ:</strong> การลงทะเบียนจะใช้เวลาประมาณ 5-10 นาที
              </p>
            </div>
            <button
              onClick={handleBackToFaceScan}
              className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>กลับไปสแกนใบหน้า</span>
            </button>
          </div>
        </div>

        {/* Right Panel - Register */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">ไม่พบข้อมูลในระบบ</h2>
                <p className="text-gray-600">คุณยังไม่เคยลงทะเบียนในระบบของเรา</p>
              </div>

              <div className="border-t border-b border-gray-200 py-4 mb-6">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">เลขบัตรประชาชน:</span>
                    <span className="font-bold">{nationalId}</span>
                  </div>
                  <p className="text-gray-600">
                    กรุณาลงทะเบียนสมาชิกใหม่เพื่อใช้บริการของเรา การลงทะเบียนจะใช้เวลาประมาณ 5-10 นาที
                  </p>
                </div>
              </div>

              <button
                onClick={handleRegister}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>ลงทะเบียนสมาชิกใหม่</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // หน้ายืนยันตัวตนสำเร็จ
  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex">
        {/* Left Panel - Info */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">ยืนยันตัวตนสำเร็จ</h1>
            <p className="text-white/80 text-lg">ระบบตรวจพบข้อมูลของคุณในระบบแล้ว</p>
          </div>
          <div className="space-y-6">
            <div className="bg-white/20 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ขั้นตอนถัดไป
              </h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">1.</span>
                  กดปุ่ม "ดำเนินการต่อ" เพื่อไปยังหน้าคัดกรอง
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">2.</span>
                  ทำการวัดสัญญาณชีพและคัดกรองอาการเบื้องต้น
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">3.</span>
                  รอเรียกคิวตามลำดับ
                </li>
              </ul>
            </div>
            <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-4">
              <p className="text-green-200 text-sm">
                                <strong>ข้อแนะนำ:</strong> กรุณาเตรียมข้อมูลประวัติการรักษาและยาที่ใช้ประจำ (ถ้ามี)
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Success */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">ยืนยันตัวตนสำเร็จ</h2>
                <p className="text-gray-600">ยินดีต้อนรับกลับ</p>
              </div>

              <div className="border-t border-b border-gray-200 py-4 mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                    {foundPatient?.profileImage ? (
                      <img
                        src={foundPatient.profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-100">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-800">{foundPatient?.name || 'ไม่ระบุชื่อ'}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">รหัสผู้ป่วย:</span>
                        <span className="font-medium">{foundPatient?.id || 'ไม่ระบุ'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">เลขบัตรประชาชน:</span>
                        <span className="font-medium">{foundPatient?.nationalId || 'ไม่ระบุ'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
                <span>ดำเนินการต่อ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
};

export default AuthenPatient;

