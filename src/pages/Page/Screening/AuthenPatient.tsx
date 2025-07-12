import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface PatientData {
  id: string;
  name: string;
  nationalId: string;
  queueNumber: string;
  department: string;
  room: string;
  estimatedTime: string;
  appointmentType: string;
  profileImage?: string;
}

type VerificationStep = 'face-scan' | 'id-input' | 'register' | 'success';

const AuthenPatient: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [currentStep, setCurrentStep] = useState<VerificationStep>('face-scan');
  const [isScanning, setIsScanning] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Mock patient data
  const mockPatientData: PatientData = {
    id: 'P001234',
    name: 'นายสมชาย ใจดี',
    nationalId: '1234567890123',
    queueNumber: 'A025',
    department: 'แผนกอายุรกรรม',
    room: 'ห้อง 201',
    estimatedTime: '15-20 นาที',
    appointmentType: 'นัดตรวจติดตาม'
  };

  // เริ่มกล้อง
  const startCamera = async () => {
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

  // สแกนใบหน้า
  const handleFaceScan = async () => {
    setIsScanning(true);
    setErrorMessage('');
    
    // จำลองการสแกนใบหน้า
    setTimeout(() => {
      const isSuccess = Math.random() > 0.3; // 70% โอกาสสำเร็จ
      
      if (isSuccess) {
        setCurrentStep('success');
        stopCamera();
      } else {
        setErrorMessage('ไม่พบข้อมูลใบหน้าในระบบ กรุณากรอกเลขบัตรประชาชน');
        setCurrentStep('id-input');
        stopCamera();
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
      // จำลองการตรวจสอบ
      const isValidId = nationalId === mockPatientData.nationalId;
      
      if (isValidId) {
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
    navigate('/register', { state: { nationalId } });
  };

  // ไปหน้าถัดไป
  const handleContinue = () => {
    navigate('/screening/queue-status', { state: { patient: mockPatientData } });
  };

  // กลับไปสแกนใบหน้าใหม่
  const handleBackToFaceScan = () => {
    setCurrentStep('face-scan');
    setNationalId('');
    setErrorMessage('');
  };

  // เริ่มกล้องเมื่อเข้าหน้า face-scan
  useEffect(() => {
    if (currentStep === 'face-scan') {
      startCamera();
    }
    return () => stopCamera();
  }, [currentStep]);

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
                  วางใบหน้าให้อยู่ในกรอบสี่เหลี่ยม
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">2.</span>
                  หันหน้าตรงและอยู่นิ่งๆ
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
                <strong>หมายเหตุ:</strong> หากไม่พบข้อมูลใบหน้า ระบบจะให้กรอกเลขบัตรประชาชนเพื่อยืนยันตัวตน
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Camera */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="relative">
            {/* Camera Container */}
            <div className="w-96 h-72 rounded-2xl overflow-hidden border-4 border-white/30 shadow-2xl relative bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Face Guide Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-56 border-2 border-white/70 rounded-lg"></div>
              </div>

              {/* Scanning Animation */}
              {isScanning && (
                <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                  <div className="w-64 h-64 border-4 border-green-400 rounded-lg animate-pulse"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-full bg-green-400 animate-ping opacity-75"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Indicator */}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                isScanning 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/20 text-white backdrop-blur-sm'
              }`}>
                {isScanning ? 'กำลังสแกน...' : 'พร้อมสแกน'}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 text-center">
            <p className="text-white text-xl mb-2">
              {isScanning ? 'กำลังประมวลผลใบหน้า...' : 'วางใบหน้าให้อยู่ในกรอบ'}
            </p>
            <p className="text-white/70">
              {isScanning ? 'กรุณารอสักครู่ อย่าขยับ' : 'ตรวจสอบให้แน่ใจว่าแสงเพียงพอ'}
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-6 bg-red-500/20 backdrop-blur-sm border border-red-300 rounded-xl p-4 max-w-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-100 text-sm">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-8">
            <button
              onClick={handleFaceScan}
              disabled={isScanning}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-12 rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex items-center space-x-3 text-lg"
            >
              {isScanning ? (
                <>
                  <svg className="animate-spin w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>กำลังสแกน...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                  <span>เริ่มสแกนใบหน้า</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // หน้ากรอกเลขบัตรประชาชน
  if (currentStep === 'id-input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-red-700 to-pink-800 flex">
                {/* Left Panel - Info */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">กรอกเลขบัตรประชาชน</h1>
            <p className="text-white/80 text-lg">ไม่พบข้อมูลใบหน้าในระบบ</p>
          </div>

          <div className="space-y-6">
            <div className="bg-white/20 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ขั้นตอนการยืนยัน
              </h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">1.</span>
                  กรอกเลขบัตรประชาชน 13 หลัก
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">2.</span>
                  ตรวจสอบความถูกต้อง
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">3.</span>
                  กดปุ่ม "ยืนยันตัวตน"
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">4.</span>
                  รอการตรวจสอบจากระบบ
                </li>
              </ul>
            </div>

            <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4">
              <p className="text-blue-200 text-sm">
                <strong>เคล็ดลับ:</strong> หากไม่พบข้อมูลในระบบ คุณสามารถลงทะเบียนสมาชิกใหม่ได้
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

        {/* Right Panel - Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">ยืนยันตัวตน</h2>
                <p className="text-gray-600">กรุณากรอกเลขบัตรประชาชน</p>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-3">
                  เลขบัตรประชาชน 13 หลัก
                </label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                    setNationalId(value);
                    setErrorMessage('');
                  }}
                  placeholder="1234567890123"
                  className="w-full px-4 py-4 text-2xl text-center border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:outline-none tracking-widest font-mono"
                  maxLength={13}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-gray-500 text-xs">
                    {nationalId.length}/13 หลัก
                  </p>
                  <div className={`w-3 h-3 rounded-full ${
                    nationalId.length === 13 ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
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

              {/* Buttons */}
              <div className="space-y-4">
                <button
                  onClick={handleIdVerification}
                  disabled={nationalId.length !== 13 || isLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none flex items-center justify-center space-x-2"
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>ยืนยันตัวตน</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // หน้าลงทะเบียนสมาชิกใหม่
  if (currentStep === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-700 to-red-800 flex">
        {/* Left Panel - Info */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                ข้อมูลที่ต้องการ
              </h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start">
                  <span className="text-pink-400 mr-2">•</span>
                  ข้อมูลส่วนตัว (ชื่อ-นามสกุล)
                </li>
                <li className="flex items-start">
                  <span className="text-pink-400 mr-2">•</span>
                  เลขบัตรประชาชน
                </li>
                <li className="flex items-start">
                  <span className="text-pink-400 mr-2">•</span>
                  ข้อมูลติดต่อ
                </li>
                <li className="flex items-start">
                  <span className="text-pink-400 mr-2">•</span>
                  ข้อมูลการรักษา (ถ้ามี)
                </li>
              </ul>
            </div>

            <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-4">
              <p className="text-green-200 text-sm">
                <strong>ข้อดี:</strong> ลงทะเบียนครั้งเดียว ใช้งานได้ตลอดชีวิต
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Register Options */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-lg">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">ไม่พบข้อมูลในระบบ</h2>
                <p className="text-gray-600">เลขบัตรประชาชน: <span className="font-mono font-bold">{nationalId}</span></p>
              </div>

              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                  <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-bold text-red-800 mb-2">ไม่พบข้อมูลผู้ป่วย</h3>
                                    <p className="text-red-600 text-sm">
                    เลขบัตรประชาชนนี้ยังไม่ได้ลงทะเบียนในระบบ
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    กรุณาเลือกวิธีการดำเนินการต่อ
                  </p>
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <button
                    onClick={handleRegister}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span>ลงทะเบียนสมาชิกใหม่</span>
                  </button>

                  <button
                    onClick={() => setCurrentStep('id-input')}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                    <span>กรอกเลขบัตรใหม่</span>
                  </button>

                  <button
                    onClick={handleBackToFaceScan}
                    className="w-full bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    <span>กลับไปสแกนใบหน้า</span>
                  </button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <p className="text-blue-800 text-sm text-center">
                    <strong>หมายเหตุ:</strong> การลงทะเบียนจะใช้เวลาประมาณ 5-10 นาที
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // หน้าสำเร็จ
  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-blue-700 to-purple-800 flex">
        {/* Left Panel - Patient Info */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">ยืนยันตัวตนสำเร็จ</h1>
            <p className="text-white/80 text-lg">ยินดีต้อนรับ {mockPatientData.name}</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-white/80">รหัสผู้ป่วย:</span>
                <span className="text-white font-mono font-bold">{mockPatientData.id}</span>
              </div>
            </div>
            
            <div className="bg-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-white/80">เลขบัตรประชาชน:</span>
                <span className="text-white font-mono">{mockPatientData.nationalId}</span>
              </div>
            </div>

            <div className="bg-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-white/80">ประเภทการนัด:</span>
                <span className="text-white">{mockPatientData.appointmentType}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Queue Info */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">ข้อมูลการรับบริการ</h2>
                <p className="text-gray-600">กรุณาจดจำข้อมูลต่อไปนี้</p>
              </div>

              {/* Queue Number - Prominent */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 mb-8 text-center">
                <p className="text-white/80 text-lg mb-2">หมายเลขคิวของคุณ</p>
                <div className="text-6xl font-bold text-white mb-4">{mockPatientData.queueNumber}</div>
                <p className="text-white/90 text-xl">กรุณาจำหมายเลขนี้</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">แผนก</p>
                      <p className="text-gray-800 font-bold text-lg">{mockPatientData.department}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">ห้องตรวจ</p>
                      <p className="text-gray-800 font-bold text-lg">{mockPatientData.room}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 md:col-span-2">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">เวลารอโดยประมาณ</p>
                      <p className="text-gray-800 font-bold text-lg">{mockPatientData.estimatedTime}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 rounded-xl p-6 mb-8">
                <h3 className="font-bold text-blue-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  คำแนะนำ
                </h3>
                <ul className="space-y-2 text-blue-700">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">1.</span>
                    ไปที่ {mockPatientData.department} {mockPatientData.room}
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">2.</span>
                    รอการเรียกคิวตามหมายเลข {mockPatientData.queueNumber}
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">3.</span>
                    เตรียมบัตรประชาชนและเอกสารการรักษา
                  </li>
                </ul>
              </div>

              {/* Action Button */}
              <button
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3 text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>ดำเนินการต่อ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthenPatient;

