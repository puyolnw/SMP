import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { usePageDebug } from '../../../hooks/usePageDebug';
import { TableSchema } from '../../../types/Debug';
import { DebugManager } from '../../../utils/Debuger';

interface PatientData {
  id: string;
  name: string;
  nationalId: string;
  profileImage?: string;
}

interface VitalSigns {
  weight: number | null;
  height: number | null;
  bmi: number | null;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
}

type ProcessStep = 'weight-height' | 'blood-pressure' | 'summary' | 'qr-code';

const AllProcess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const debugManager = DebugManager.getInstance();
  
  const [currentStep, setCurrentStep] = useState<ProcessStep>('weight-height');
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [measurementAttempts, setMeasurementAttempts] = useState(0);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  
  // Debug mode detection
  const isDebugMode = process.env.NODE_ENV === 'development';
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Debug table schema
  const requiredTables: TableSchema[] = [
    {
      tableName: 'patients',
      columns: ['id', 'firstNameTh', 'lastNameTh', 'nationalId', 'profileImage'],
      description: 'ข้อมูลผู้ป่วย'
    },
    {
      tableName: 'vitalSigns',
      columns: ['patientId', 'weight', 'height', 'bmi', 'systolic', 'diastolic', 'pulse', 'timestamp'],
      description: 'ข้อมูลสัญญาณชีพ'
    }
  ];
  
  // Use debug hook
  const { debugData } = usePageDebug('คัดกรองสัญญาณชีพ', requiredTables);
  console.log('debugData:', debugData);
  // Get patient data from previous page or localStorage
  const getPatientData = (): PatientData => {
    // Try to get from location state first (from AuthenPatient.tsx)
    if (location.state?.patient) {
      return location.state.patient;
    }
    
    // If not available, try to get from localStorage (set by AuthenPatient.tsx)
    const storedPatient = localStorage.getItem('authenticatedPatient');
    if (storedPatient) {
      return JSON.parse(storedPatient);
    }
    
    // Fallback to mock data
    return {
      id: 'P001234',
      name: 'นายสมชาย ใจดี',
      nationalId: '1234567890123'
    };
  };
  
  // Initialize patient data
  const [patientData, setPatientData] = useState<PatientData>(getPatientData());
   console.log('patientData:', setPatientData);
  // Vital signs state
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    weight: null,
    height: null,
    bmi: null,
    systolic: null,
    diastolic: null,
    pulse: null
  });

  // Debug input states
  const [debugWeight, setDebugWeight] = useState('');
  const [debugHeight, setDebugHeight] = useState('');
  const [debugSystolic, setDebugSystolic] = useState('');
  const [debugDiastolic, setDebugDiastolic] = useState('');
  const [debugPulse, setDebugPulse] = useState('');

  // Calculate BMI
  const calculateBMI = (weight: number, height: number): number => {
    const heightInMeters = height / 100;
    return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
  };

  // Start camera for auto measurement
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      setErrorMessage('ไม่สามารถเข้าถึงกล้องได้');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Auto scan weight and height
  const handleWeightHeightScan = async () => {
    setIsScanning(true);
    setErrorMessage('');
    
    setTimeout(() => {
      // Simulate auto measurement
      const mockWeight = 65 + Math.random() * 30; // 65-95 kg
      const mockHeight = 150 + Math.random() * 30; // 150-180 cm
      
      const weight = Math.round(mockWeight * 10) / 10;
      const height = Math.round(mockHeight);
      const bmi = calculateBMI(weight, height);
      
      setVitalSigns(prev => ({
        ...prev,
        weight,
        height,
        bmi
      }));
      
      setIsScanning(false);
      stopCamera();
      
      // Auto proceed to next step after a short delay
      setTimeout(() => {
        setCurrentStep('blood-pressure');
      }, 1500);
    }, 3000);
  };

  // Auto scan blood pressure
  const handleBloodPressureScan = async () => {
    setIsScanning(true);
    setErrorMessage('');
    
    setTimeout(() => {
      // Simulate auto measurement
      const mockSystolic = 110 + Math.random() * 40; // 110-150
      const mockDiastolic = 70 + Math.random() * 20; // 70-90
      const mockPulse = 60 + Math.random() * 40; // 60-100
      
      const systolic = Math.round(mockSystolic);
      const diastolic = Math.round(mockDiastolic);
      const pulse = Math.round(mockPulse);
      
      // Check if blood pressure is too high - ถ้าความดันสูงเกินไป ให้วัดใหม่
      if (systolic > 160 || diastolic > 100) {
        setErrorMessage('ความดันสูงเกินไป กรุณาพักสักครู่และวัดใหม่');
        setIsScanning(false);
        
        // Increment attempt counter
        setMeasurementAttempts(prev => prev + 1);
        
        // If too many attempts, proceed anyway
        if (measurementAttempts >= 2) {
          setVitalSigns(prev => ({
            ...prev,
            systolic,
            diastolic,
            pulse
          }));
          
          // Auto proceed to next step after a short delay
          setTimeout(() => {
            setCurrentStep('summary');
          }, 1500);
        } else {
          // Try again after a short delay
          setTimeout(() => {
            handleBloodPressureScan();
          }, 3000);
        }
        
        return;
      }
      
      setVitalSigns(prev => ({
        ...prev,
        systolic,
        diastolic,
        pulse
      }));
      
      setIsScanning(false);
      stopCamera();
      
      // Reset attempt counter
      setMeasurementAttempts(0);
      
      // Auto proceed to next step after a short delay
      setTimeout(() => {
        setCurrentStep('summary');
      }, 1500);
    }, 4000);
  };

  // Process debug input for weight and height
  const processDebugWeightHeight = () => {
    const weight = parseFloat(debugWeight);
    const height = parseFloat(debugHeight);
    
    if (!weight || !height || weight < 20 || weight > 200 || height < 100 || height > 250) {
      setErrorMessage('กรุณากรอกน้ำหนัก (20-200 กก.) และส่วนสูง (100-250 ซม.) ให้ถูกต้อง');
      return false;
    }
    
    const bmi = calculateBMI(weight, height);
    
    setVitalSigns(prev => ({
      ...prev,
      weight,
      height,
      bmi
    }));
    
    setErrorMessage('');
    setCurrentStep('blood-pressure');
    return true;
  };

  // Process debug input for blood pressure
  const processDebugBloodPressure = () => {
    const systolic = parseInt(debugSystolic);
    const diastolic = parseInt(debugDiastolic);
    const pulse = parseInt(debugPulse);
    
    if (!systolic || !diastolic || !pulse || 
        systolic < 80 || systolic > 200 || 
        diastolic < 50 || diastolic > 120 || 
        pulse < 40 || pulse > 150) {
      setErrorMessage('กรุณากรอกค่าความดันและชีพจรให้ถูกต้อง');
      return false;
    }
    
    // Check if blood pressure is too high - ถ้าความดันสูงเกินไป ให้แจ้งเตือน
    if (systolic > 160 || diastolic > 100) {
      setErrorMessage('ความดันสูงเกินไป กรุณาตรวจสอบค่าอีกครั้ง');
      // ในโหมด debug ไม่บังคับให้วัดใหม่ แต่แสดงคำเตือน
    }
    
    setVitalSigns(prev => ({
      ...prev,
      systolic,
      diastolic,
      pulse
    }));
    
    setErrorMessage('');
    setCurrentStep('summary');
    return true;
  };

  // Save vital signs to debug data
  const saveVitalSigns = () => {
    const vitalSignsData = {
      patientId: patientData.id,
      weight: vitalSigns.weight,
      height: vitalSigns.height,
      bmi: vitalSigns.bmi,
      systolic: vitalSigns.systolic,
      diastolic: vitalSigns.diastolic,
      pulse: vitalSigns.pulse,
      timestamp: new Date().toISOString()
    };
    
    // Add to vitalSigns table
    debugManager.addData('vitalSigns', vitalSignsData);
  };

  // Generate QR Code data
  const generateQRData = () => {
    const qrData = {
      patientId: patientData.id,
      name: patientData.name,
      vitalSigns,
      timestamp: new Date().toISOString(),
      redirectUrl: '/screening/welcome'
    };
    return JSON.stringify(qrData);
  };

  // Start countdown timer
  const startCountdown = (seconds: number) => {
    setCountdownValue(seconds);
    
    const timer = setInterval(() => {
      setCountdownValue(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setCurrentStep('qr-code');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Auto start measurement when entering a step
  useEffect(() => {
    if (currentStep === 'weight-height' && !vitalSigns.weight) {
      startCamera();
      // Auto start scanning after camera is ready
      setTimeout(() => {
        if (!showDebugPanel) {
          handleWeightHeightScan();
        }
      }, 1000);
    } else if (currentStep === 'blood-pressure' && !vitalSigns.systolic) {
      startCamera();
      // Auto start scanning after camera is ready
      setTimeout(() => {
        if (!showDebugPanel) {
          handleBloodPressureScan();
        }
      }, 1000);
    } else if (currentStep === 'summary') {
      // Start countdown after 2 seconds on summary page
      setTimeout(() => {
        saveVitalSigns();
        startCountdown(5);
      }, 2000);
    }
    
    return () => stopCamera();
  }, [currentStep, showDebugPanel]);

  // Debug Panel Component
  const DebugPanel = () => (
    <div className="fixed top-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg z-50 w-80">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-red-600">Debug Panel</h3>
        <button 
          onClick={() => setShowDebugPanel(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      {currentStep === 'weight-height' ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">น้ำหนักและส่วนสูง</p>
          <input
            type="number"
            value={debugWeight}
            onChange={(e) => setDebugWeight(e.target.value)}
            placeholder="น้ำหนัก (กก.)"
            className="w-full p-2 border rounded"
          />
          <input
            type="number"
            value={debugHeight}
            onChange={(e) => setDebugHeight(e.target.value)}
            placeholder="ส่วนสูง (ซม.)"
            className="w-full p-2 border rounded"
          />
          <button
            onClick={processDebugWeightHeight}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            บันทึกและไปขั้นตอนถัดไป
          </button>
          {errorMessage && (
            <p className="text-xs text-red-500">{errorMessage}</p>
          )}
        </div>
      ) : currentStep === 'blood-pressure' ? (
        <div className="space-y-2">
                    <p className="text-sm font-medium">ความดันโลหิตและชีพจร</p>
          <input
            type="number"
            value={debugSystolic}
            onChange={(e) => setDebugSystolic(e.target.value)}
            placeholder="ความดันตัวบน (mmHg)"
            className="w-full p-2 border rounded"
          />
          <input
            type="number"
            value={debugDiastolic}
            onChange={(e) => setDebugDiastolic(e.target.value)}
            placeholder="ความดันตัวล่าง (mmHg)"
            className="w-full p-2 border rounded"
          />
          <input
            type="number"
            value={debugPulse}
            onChange={(e) => setDebugPulse(e.target.value)}
            placeholder="ชีพจร (bpm)"
            className="w-full p-2 border rounded"
          />
          <button
            onClick={processDebugBloodPressure}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            บันทึกและไปขั้นตอนถัดไป
          </button>
          {errorMessage && (
            <p className="text-xs text-red-500">{errorMessage}</p>
          )}
        </div>
      ) : (
        <div className="text-sm">
          <p>ขั้นตอนปัจจุบัน: {currentStep}</p>
          <pre className="text-xs bg-gray-100 p-2 rounded mt-2 max-h-40 overflow-auto">
            {JSON.stringify(vitalSigns, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );

  // Debug Button Component
  const DebugButton = () => (
    isDebugMode && !showDebugPanel && (
      <button
        onClick={() => setShowDebugPanel(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg z-50 hover:bg-red-600"
        title="Debug Mode"
      >
        🐛
      </button>
    )
  );

  // Weight & Height Step
  if (currentStep === 'weight-height') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
        {/* Left Panel - Instructions */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">วัดน้ำหนักและส่วนสูง</h1>
            <p className="text-white/80 text-lg">ขั้นตอนที่ 1 จาก 2</p>
          </div>

          {/* Patient Info */}
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">ข้อมูลผู้ป่วย</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
              <p><span className="font-medium">เลขประจำตัวประชาชน:</span> {patientData.nationalId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white/20 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">คำแนะนำ</h3>
            <ul className="space-y-2 text-white/80 list-disc list-inside">
              <li>ยืนตรงบนเครื่องชั่งน้ำหนัก</li>
              <li>ถอดรองเท้าและของที่มีน้ำหนักออก</li>
              <li>ยืนนิ่งๆ จนกว่าระบบจะวัดเสร็จ</li>
            </ul>
          </div>
        </div>

        {/* Right Panel - Measurement */}
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">กำลังวัดน้ำหนักและส่วนสูง</h2>
            
            {/* Video Feed */}
            <div className="relative mb-6 rounded-lg overflow-hidden bg-gray-100 aspect-video">
              {isScanning ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="text-center text-white">
                      <div className="inline-block w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-xl font-medium">กำลังวัด...</p>
                      <p className="text-sm mt-2">โปรดยืนนิ่งๆ</p>
                    </div>
                  </div>
                </>
              ) : vitalSigns.weight ? (
                <div className="absolute inset-0 flex items-center justify-center bg-green-50">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-green-800">วัดเสร็จสิ้น</h3>
                    <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                      <div className="bg-white p-3 rounded-lg shadow">
                        <p className="text-sm text-gray-500">น้ำหนัก</p>
                        <p className="text-xl font-bold text-gray-800">{vitalSigns.weight} กก.</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow">
                        <p className="text-sm text-gray-500">ส่วนสูง</p>
                        <p className="text-xl font-bold text-gray-800">{vitalSigns.height} ซม.</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow">
                        <p className="text-sm text-gray-500">BMI</p>
                        <p className="text-xl font-bold text-gray-800">{vitalSigns.bmi}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">กำลังไปขั้นตอนถัดไป...</p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-gray-800">เตรียมวัดน้ำหนักและส่วนสูง</h3>
                    <p className="text-sm text-gray-500 mt-2">กำลังเริ่มการวัด...</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                <p>{errorMessage}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Debug Panel */}
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  // Blood Pressure Step
  if (currentStep === 'blood-pressure') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
        {/* Left Panel - Instructions */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">วัดความดันโลหิต</h1>
            <p className="text-white/80 text-lg">ขั้นตอนที่ 2 จาก 2</p>
          </div>

          {/* Patient Info */}
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">ข้อมูลผู้ป่วย</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
              <p><span className="font-medium">เลขประจำตัวประชาชน:</span> {patientData.nationalId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white/20 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">คำแนะนำ</h3>
            <ul className="space-y-2 text-white/80 list-disc list-inside">
              <li>นั่งพักสักครู่ก่อนวัดความดัน</li>
              <li>วางแขนบนที่วางแขน</li>
              <li>นั่งนิ่งๆ ไม่พูดคุยระหว่างวัด</li>
            </ul>
          </div>
        </div>

        {/* Right Panel - Measurement */}
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">กำลังวัดความดันโลหิต</h2>
            
            {/* Video Feed */}
            <div className="relative mb-6 rounded-lg overflow-hidden bg-gray-100 aspect-video">
              {isScanning ? (
                             <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="text-center text-white">
                      <div className="inline-block w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-xl font-medium">กำลังวัด...</p>
                      <p className="text-sm mt-2">โปรดนั่งนิ่งๆ</p>
                    </div>
                  </div>
                </>
              ) : vitalSigns.systolic ? (
                <div className="absolute inset-0 flex items-center justify-center bg-green-50">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-green-800">วัดเสร็จสิ้น</h3>
                    <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                      <div className="bg-white p-3 rounded-lg shadow">
                        <p className="text-sm text-gray-500">ความดันตัวบน</p>
                        <p className="text-xl font-bold text-gray-800">{vitalSigns.systolic} mmHg</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow">
                        <p className="text-sm text-gray-500">ความดันตัวล่าง</p>
                        <p className="text-xl font-bold text-gray-800">{vitalSigns.diastolic} mmHg</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow">
                        <p className="text-sm text-gray-500">ชีพจร</p>
                        <p className="text-xl font-bold text-gray-800">{vitalSigns.pulse} bpm</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">กำลังไปขั้นตอนถัดไป...</p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-gray-800">เตรียมวัดความดันโลหิต</h3>
                    <p className="text-sm text-gray-500 mt-2">กำลังเริ่มการวัด...</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                <p>{errorMessage}</p>
                {measurementAttempts > 0 && (
                  <p className="text-sm mt-1">ครั้งที่ {measurementAttempts + 1} จาก 3</p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Debug Panel */}
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  // Summary Step
  if (currentStep === 'summary') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
        {/* Left Panel - Patient Info */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">สรุปผลการวัด</h1>
            <p className="text-white/80 text-lg">ตรวจสอบข้อมูลก่อนยืนยัน</p>
          </div>

          {/* Patient Info */}
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">ข้อมูลผู้ป่วย</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
              <p><span className="font-medium">เลขประจำตัวประชาชน:</span> {patientData.nationalId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</p>
            </div>
          </div>
        </div>

        {/* Right Panel - Measurement Results */}
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">ผลการวัดสัญญาณชีพ</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Weight & Height */}
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-medium text-blue-800 mb-4">น้ำหนักและส่วนสูง</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg shadow text-center">
                    <p className="text-sm text-gray-500">น้ำหนัก</p>
                    <p className="text-xl font-bold text-gray-800">{vitalSigns.weight} กก.</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow text-center">
                    <p className="text-sm text-gray-500">ส่วนสูง</p>
                    <p className="text-xl font-bold text-gray-800">{vitalSigns.height} ซม.</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow text-center">
                    <p className="text-sm text-gray-500">BMI</p>
                    <p className="text-xl font-bold text-gray-800">{vitalSigns.bmi}</p>
                  </div>
                </div>
              </div>
              
              {/* Blood Pressure */}
              <div className="bg-red-50 rounded-xl p-6">
                <h3 className="text-lg font-medium text-red-800 mb-4">ความดันโลหิต</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg shadow text-center">
                    <p className="text-sm text-gray-500">ตัวบน</p>
                    <p className="text-xl font-bold text-gray-800">{vitalSigns.systolic} mmHg</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow text-center">
                    <p className="text-sm text-gray-500">ตัวล่าง</p>
                    <p className="text-xl font-bold text-gray-800">{vitalSigns.diastolic} mmHg</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow text-center">
                    <p className="text-sm text-gray-500">ชีพจร</p>
                    <p className="text-xl font-bold text-gray-800">{vitalSigns.pulse} bpm</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* BMI Interpretation */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-2">การแปลผล BMI</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {vitalSigns.bmi && (
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          vitalSigns.bmi < 18.5 ? 'bg-blue-500' : 
                          vitalSigns.bmi < 25 ? 'bg-green-500' : 
                          vitalSigns.bmi < 30 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(vitalSigns.bmi * 2, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-xs mt-1">
                  <span>น้ำหนักน้อย</span>
                  <span>ปกติ</span>
                  <span>น้ำหนักเกิน</span>
                  <span>อ้วน</span>
                </div>
                <p className="mt-2 text-sm">
                  {vitalSigns.bmi && (
                    <span className={
                      vitalSigns.bmi < 18.5 ? 'text-blue-600' : 
                      vitalSigns.bmi < 25 ? 'text-green-600' : 
                      vitalSigns.bmi < 30 ? 'text-yellow-600' : 'text-red-600'
                    }>
                      {vitalSigns.bmi < 18.5 ? 'น้ำหนักน้อยกว่าเกณฑ์' : 
                       vitalSigns.bmi < 25 ? 'น้ำหนักปกติ' : 
                       vitalSigns.bmi < 30 ? 'น้ำหนักเกิน' : 'โรคอ้วน'}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Blood Pressure Interpretation */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-2">การแปลผลความดันโลหิต</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {vitalSigns.systolic && vitalSigns.diastolic && (
                  <p className="text-sm">
                    <span className={
                      vitalSigns.systolic < 120 && vitalSigns.diastolic < 80 ? 'text-green-600' : 
                      vitalSigns.systolic < 130 && vitalSigns.diastolic < 85 ? 'text-blue-600' : 
                      vitalSigns.systolic < 140 && vitalSigns.diastolic < 90 ? 'text-yellow-600' : 'text-red-600'
                    }>
                      {vitalSigns.systolic < 120 && vitalSigns.diastolic < 80 ? 'ความดันโลหิตปกติ' : 
                       vitalSigns.systolic < 130 && vitalSigns.diastolic < 85 ? 'ความดันโลหิตปกติค่อนข้างสูง' : 
                       vitalSigns.systolic < 140 && vitalSigns.diastolic < 90 ? 'ความดันโลหิตสูงระดับต้น' : 'ความดันโลหิตสูง'}
                    </span>
                  </p>
                )}
              </div>
            </div>
            
            {/* Countdown */}
            <div className="text-center">
              {countdownValue !== null ? (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                                   <p className="text-sm text-blue-700">กำลังดำเนินการต่อในอีก</p>
                  <p className="text-3xl font-bold text-blue-800">{countdownValue}</p>
                  <p className="text-sm text-blue-700">วินาที</p>
                </div>
              ) : (
                <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </div>
        </div>
        
        {/* Debug Panel */}
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  // QR Code Step
  if (currentStep === 'qr-code') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-2">การวัดเสร็จสมบูรณ์</h1>
          <p className="text-gray-600 mb-6">ข้อมูลของคุณถูกบันทึกเรียบร้อยแล้ว</p>
          
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <div className="flex justify-center mb-4">
              <QRCodeSVG 
                value={generateQRData()}
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"H"}
                includeMargin={false}
              />
            </div>
            <p className="text-sm text-gray-500">สแกน QR Code </p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-medium text-blue-800 mb-2">ข้อมูลสัญญาณชีพ</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-left">น้ำหนัก:</div>
              <div className="text-right font-medium">{vitalSigns.weight} กก.</div>
              
              <div className="text-left">ส่วนสูง:</div>
              <div className="text-right font-medium">{vitalSigns.height} ซม.</div>
              
              <div className="text-left">BMI:</div>
              <div className="text-right font-medium">{vitalSigns.bmi}</div>
              
              <div className="text-left">ความดันโลหิต:</div>
              <div className="text-right font-medium">{vitalSigns.systolic}/{vitalSigns.diastolic} mmHg</div>
              
              <div className="text-left">ชีพจร:</div>
              <div className="text-right font-medium">{vitalSigns.pulse} bpm</div>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            โปรดรอเจ้าหน้าที่เรียกชื่อของท่าน
          </p>
          
          <button
            onClick={() => navigate('/screening/welcome')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
        
        {/* Debug Panel */}
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  // Default fallback
  return null;
};

export default AllProcess;



