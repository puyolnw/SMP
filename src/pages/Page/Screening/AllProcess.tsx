import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

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

interface VitalSigns {
  weight: number | null;
  height: number | null;
  bmi: number | null;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
}

type ProcessStep = 'weight-height' | 'blood-pressure' | 'summary' | 'qr-code';
type MeasurementMode = 'auto' | 'manual';

const AllProcess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [currentStep, setCurrentStep] = useState<ProcessStep>('weight-height');
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>('auto');
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Patient data from previous page
  const patientData: PatientData = location.state?.patient || {
    id: 'P001234',
    name: 'นายสมชาย ใจดี',
    nationalId: '1234567890123',
    queueNumber: 'A025',
    department: 'แผนกอายุรกรรม',
    room: 'ห้อง 201',
    estimatedTime: '15-20 นาที',
    appointmentType: 'นัดตรวจติดตาม'
  };

  // Vital signs state
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    weight: null,
    height: null,
    bmi: null,
    systolic: null,
    diastolic: null,
    pulse: null
  });

  // Manual input states
  const [manualWeight, setManualWeight] = useState('');
  const [manualHeight, setManualHeight] = useState('');
  const [manualSystolic, setManualSystolic] = useState('');
  const [manualDiastolic, setManualDiastolic] = useState('');
  const [manualPulse, setManualPulse] = useState('');

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
      setErrorMessage('ไม่สามารถเข้าถึงกล้องได้ กรุณาเปลี่ยนเป็นโหมดกรอกมือ');
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
      
      setVitalSigns(prev => ({
        ...prev,
        systolic,
        diastolic,
        pulse
      }));
      
      setIsScanning(false);
      stopCamera();
    }, 4000);
  };

  // Save manual weight and height
  const handleSaveWeightHeight = () => {
    const weight = parseFloat(manualWeight);
    const height = parseFloat(manualHeight);
    
    if (!weight || !height || weight < 20 || weight > 200 || height < 100 || height > 250) {
      setErrorMessage('กรุณากรอกน้ำหนัก (20-200 กก.) และส่วนสูง (100-250 ซม.) ให้ถูกต้อง');
      return;
    }
    
    const bmi = calculateBMI(weight, height);
    
    setVitalSigns(prev => ({
      ...prev,
      weight,
      height,
      bmi
    }));
    
    setErrorMessage('');
  };

  // Save manual blood pressure
  const handleSaveBloodPressure = () => {
    const systolic = parseInt(manualSystolic);
    const diastolic = parseInt(manualDiastolic);
    const pulse = parseInt(manualPulse);
    
    if (!systolic || !diastolic || !pulse || 
        systolic < 80 || systolic > 200 || 
        diastolic < 50 || diastolic > 120 || 
        pulse < 40 || pulse > 150) {
      setErrorMessage('กรุณากรอกค่าความดันและชีพจรให้ถูกต้อง');
      return;
    }
    
    setVitalSigns(prev => ({
      ...prev,
      systolic,
      diastolic,
      pulse
    }));
    
    setErrorMessage('');
  };

  // Reset measurements
  const handleReset = (type: 'weight-height' | 'blood-pressure') => {
    if (type === 'weight-height') {
      setVitalSigns(prev => ({
        ...prev,
        weight: null,
        height: null,
        bmi: null
      }));
      setManualWeight('');
      setManualHeight('');
    } else {
      setVitalSigns(prev => ({
        ...prev,
        systolic: null,
        diastolic: null,
        pulse: null
      }));
      setManualSystolic('');
      setManualDiastolic('');
      setManualPulse('');
    }
    setErrorMessage('');
  };

  // Generate QR Code data
  const generateQRData = () => {
    const qrData = {
      patientId: patientData.id,
      queueNumber: patientData.queueNumber,
      vitalSigns,
      timestamp: new Date().toISOString(),
      redirectUrl: '/screening/welcome'
    };
    return JSON.stringify(qrData);
  };

  // Start camera when in auto mode
  useEffect(() => {
    if (measurementMode === 'auto' && (currentStep === 'weight-height' || currentStep === 'blood-pressure')) {
      startCamera();
    }
    return () => stopCamera();
  }, [measurementMode, currentStep]);

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
              <p><span className="font-medium">คิว:</span> {patientData.queueNumber}</p>
              <p><span className="font-medium">แผนก:</span> {patientData.department}</p>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="bg-white/20 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">โหมดการวัด</h3>
            <div className="space-y-3">
              <button
                onClick={() => setMeasurementMode('auto')}
                className={`w-full p-3 rounded-lg transition-all duration-300 ${
                  measurementMode === 'auto'
                    ? 'bg-white text-blue-600 font-bold'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                🤖 อัตโนมัติ (แนะนำ)
              </button>
              <button
                onClick={() => setMeasurementMode('manual')}
                className={`w-full p-3 rounded-lg transition-all duration-300 ${
                  measurementMode === 'manual'
                    ? 'bg-white text-blue-600 font-bold'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                ✋ กรอกมือ
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Measurement */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {measurementMode === 'auto' ? (
            // Auto Mode
            <div className="w-full max-w-2xl">
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">การวัดอัตโนมัติ</h2>
                  <p className="text-gray-600">ยืนบนเครื่องชั่งและหันหน้าเข้ากล้อง</p>
                </div>

                {/* Camera View */}
                <div className="relative mb-8">
                  <div className="w-full h-64 rounded-2xl overflow-hidden border-4 border-gray-300 bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Scanning Overlay */}
                    {isScanning && (
                      <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                        <div className="text-white text-xl font-bold">กำลังวัด...</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Results */}
                {(vitalSigns.weight && vitalSigns.height) ? (
                  <div className="bg-green-50 rounded-xl p-6 mb-6">
                    <h3 className="text-green-800 font-bold mb-4 text-center">ผลการวัด</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-green-600 text-sm">น้ำหนัก</p>
                        <p className="text-2xl font-bold text-green-800">{vitalSigns.weight} กก.</p>
                      </div>
                      <div>
                        <p className="text-green-600 text-sm">ส่วนสูง</p>
                        <p className="text-2xl font-bold text-green-800">{vitalSigns.height} ซม.</p>
                      </div>
                      <div>
                        <p className="text-green-600 text-sm">BMI</p>
                        <p className="text-2xl font-bold text-green-800">{vitalSigns.bmi}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 rounded-xl p-6 mb-6 text-center">
                    <p className="text-blue-800">
                      {isScanning ? 'กำลังวัดค่า กรุณารอสักครู่...' : 'พร้อมสำหรับการวัด'}
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                    <p className="text-red-600 text-sm">{errorMessage}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  {(vitalSigns.weight && vitalSigns.height) ? (
                    <>
                      <button
                        onClick={() => handleReset('weight-height')}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
                      >
                        วัดใหม่
                      </button>
                      <button
                        onClick={() => setCurrentStep('blood-pressure')}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-300"
                      >
                        ขั้นตอนถัดไป
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleWeightHeightScan}
                      disabled={isScanning}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
                    >
                      {isScanning ? 'กำลังวัด...' : 'เริ่มวัด'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Manual Mode
            <div className="w-full max-w-lg">
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">กรอกข้อมูลมือ</h2>
                  <p className="text-gray-600">กรุณากรอกน้ำหนักและส่วนสูงของคุณ</p>
                </div>

                <div className="space-y-6">
                  {/* Weight Input */}
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      น้ำหนัก (กิโลกรัม)
                    </label>
                    <input
                      type="number"
                      value={manualWeight}
                      onChange={(e) => setManualWeight(e.target.value)}
                      placeholder="65.5"
                      min="20"
                      max="200"
                      step="0.1"
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-center"
                    />
                  </div>

                  {/* Height Input */}
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      ส่วนสูง (เซนติเมตร)
                    </label>
                    <input
                      type="number"
                      value={manualHeight}
                      onChange={(e) => setManualHeight(e.target.value)}
                      placeholder="170"
                      min="100"
                      max="250"
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-center"
                    />
                  </div>

                  {/* BMI Preview */}
                  {manualWeight && manualHeight && parseFloat(manualWeight) > 0 && parseFloat(manualHeight) > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-blue-800 text-center">
                        BMI: <span className="font-bold text-xl">
                          {calculateBMI(parseFloat(manualWeight), parseFloat(manualHeight))}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Results */}
                  {(vitalSigns.weight && vitalSigns.height) && (
                    <div className="bg-green-50 rounded-xl p-4">
                      <h3 className="text-green-800 font-bold mb-2 text-center">ข้อมูลที่บันทึก</h3>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                          <p className="text-green-600">น้ำหนัก</p>
                          <p className="font-bold">{vitalSigns.weight} กก.</p>
                        </div>
                        <div>
                          <p className="text-green-600">ส่วนสูง</p>
                          <p className="font-bold">{vitalSigns.height} ซม.</p>
                        </div>
                        <div>
                          <p className="text-green-600">BMI</p>
                          <p className="font-bold">{vitalSigns.bmi}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-600 text-sm">{errorMessage}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {(vitalSigns.weight && vitalSigns.height) ? (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleReset('weight-height')}
                          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => setCurrentStep('blood-pressure')}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300"
                        >
                          ขั้นตอนถัดไป
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleSaveWeightHeight}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-300"
                      >
                        บันทึกข้อมูล
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Blood Pressure Step
  if (currentStep === 'blood-pressure') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-pink-700 to-purple-800 flex">
        {/* Left Panel - Instructions */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">วัดความดันโลหิต</h1>
            <p className="text-white/80 text-lg">ขั้นตอนที่ 2 จาก 2</p>
          </div>

          {/* Previous Results */}
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">ผลการวัดก่อนหน้า</h3>
            <div className="grid grid-cols-3 gap-2 text-center text-sm text-white/80">
              <div>
                <p>น้ำหนัก</p>
                <p className="font-bold text-white">{vitalSigns.weight} กก.</p>
              </div>
              <div>
                <p>ส่วนสูง</p>
                <p className="font-bold text-white">{vitalSigns.height} ซม.</p>
              </div>
              <div>
                <p>BMI</p>
                <p className="font-bold text-white">{vitalSigns.bmi}</p>
              </div>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="bg-white/20 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">โหมดการวัด</h3>
            <div className="space-y-3">
              <button
                onClick={() => setMeasurementMode('auto')}
                className={`w-full p-3 rounded-lg transition-all duration-300 ${
                  measurementMode === 'auto'
                    ? 'bg-white text-red-600 font-bold'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                🤖 อัตโนมัติ (แนะนำ)
              </button>
              <button
                onClick={() => setMeasurementMode('manual')}
                className={`w-full p-3 rounded-lg transition-all duration-300 ${
                  measurementMode === 'manual'
                    ? 'bg-white text-red-600 font-bold'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                ✋ กรอกมือ
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Blood Pressure Measurement */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {measurementMode === 'auto' ? (
            // Auto Mode
            <div className="w-full max-w-2xl">
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">การวัดความดันอัตโนมัติ</h2>
                  <p className="text-gray-600">นั่งให้สบาย วางแขนบนเครื่องวัดความดัน</p>
                </div>

                {/* Camera/Sensor View */}
                <div className="relative mb-8">
                  <div className="w-full h-64 rounded-2xl overflow-hidden border-4 border-gray-300 bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Scanning Overlay */}
                    {isScanning && (
                      <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="text-xl font-bold mb-2">กำลังวัดความดัน...</div>
                          <div className="text-sm">กรุณานั่งนิ่งๆ</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Results */}
                {(vitalSigns.systolic && vitalSigns.diastolic && vitalSigns.pulse) ? (
                  <div className="bg-green-50 rounded-xl p-6 mb-6">
                    <h3 className="text-green-800 font-bold mb-4 text-center">ผลการวัดความดัน</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-green-600 text-sm">ความดันตัวบน</p>
                        <p className="text-2xl font-bold text-green-800">{vitalSigns.systolic}</p>
                        <p className="text-green-600 text-xs">mmHg</p>
                      </div>
                      <div>
                        <p className="text-green-600 text-sm">ความดันตัวล่าง</p>
                        <p className="text-2xl font-bold text-green-800">{vitalSigns.diastolic}</p>
                        <p className="text-green-600 text-xs">mmHg</p>
                      </div>
                      <div>
                        <p className="text-green-600 text-sm">ชีพจร</p>
                        <p className="text-2xl font-bold text-green-800">{vitalSigns.pulse}</p>
                        <p className="text-green-600 text-xs">bpm</p>
                      </div>
                    </div>
                    
                             {/* Blood Pressure Status */}
                    <div className="mt-4 text-center">
                      {(() => {
                        const systolic = vitalSigns.systolic!;
                        const diastolic = vitalSigns.diastolic!;
                        
                        if (systolic < 120 && diastolic < 80) {
                          return <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">ความดันปกติ</div>;
                        } else if (systolic < 130 && diastolic < 80) {
                          return <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">ความดันสูงเล็กน้อย</div>;
                        } else if (systolic < 140 || diastolic < 90) {
                          return <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg">ความดันสูงระดับ 1</div>;
                        } else {
                          return <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg">ความดันสูงระดับ 2</div>;
                        }
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 rounded-xl p-6 mb-6 text-center">
                    <p className="text-red-800">
                      {isScanning ? 'กำลังวัดความดัน กรุณานั่งนิ่งๆ...' : 'พร้อมสำหรับการวัดความดัน'}
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                    <p className="text-red-600 text-sm">{errorMessage}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => setCurrentStep('weight-height')}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
                  >
                    ย้อนกลับ
                  </button>
                  
                  {(vitalSigns.systolic && vitalSigns.diastolic && vitalSigns.pulse) ? (
                    <>
                      <button
                        onClick={() => handleReset('blood-pressure')}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
                      >
                        วัดใหม่
                      </button>
                      <button
                        onClick={() => setCurrentStep('summary')}
                        className="flex-1 bg-gradient-to-r from-red-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-300"
                      >
                        สรุปผล
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleBloodPressureScan}
                      disabled={isScanning}
                      className="flex-1 bg-gradient-to-r from-red-500 to-purple-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
                    >
                      {isScanning ? 'กำลังวัด...' : 'เริ่มวัดความดัน'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Manual Mode
            <div className="w-full max-w-lg">
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">กรอกค่าความดันมือ</h2>
                  <p className="text-gray-600">กรุณากรอกค่าความดันและชีพจร</p>
                </div>

                <div className="space-y-6">
                  {/* Blood Pressure Inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        ความดันตัวบน (mmHg)
                      </label>
                      <input
                        type="number"
                        value={manualSystolic}
                        onChange={(e) => setManualSystolic(e.target.value)}
                        placeholder="120"
                        min="80"
                        max="200"
                        className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        ความดันตัวล่าง (mmHg)
                      </label>
                      <input
                        type="number"
                        value={manualDiastolic}
                        onChange={(e) => setManualDiastolic(e.target.value)}
                        placeholder="80"
                        min="50"
                        max="120"
                        className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none text-center"
                      />
                    </div>
                  </div>

                  {/* Pulse Input */}
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      ชีพจร (ครั้ง/นาที)
                    </label>
                    <input
                      type="number"
                      value={manualPulse}
                      onChange={(e) => setManualPulse(e.target.value)}
                      placeholder="72"
                      min="40"
                      max="150"
                      className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none text-center"
                    />
                  </div>

                  {/* Results */}
                  {(vitalSigns.systolic && vitalSigns.diastolic && vitalSigns.pulse) && (
                    <div className="bg-green-50 rounded-xl p-4">
                      <h3 className="text-green-800 font-bold mb-2 text-center">ข้อมูลที่บันทึก</h3>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                          <p className="text-green-600">ตัวบน</p>
                          <p className="font-bold">{vitalSigns.systolic}</p>
                        </div>
                        <div>
                          <p className="text-green-600">ตัวล่าง</p>
                          <p className="font-bold">{vitalSigns.diastolic}</p>
                        </div>
                        <div>
                          <p className="text-green-600">ชีพจร</p>
                          <p className="font-bold">{vitalSigns.pulse}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-600 text-sm">{errorMessage}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setCurrentStep('weight-height')}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300"
                      >
                        ย้อนกลับ
                      </button>
                      
                      {(vitalSigns.systolic && vitalSigns.diastolic && vitalSigns.pulse) ? (
                        <>
                          <button
                            onClick={() => handleReset('blood-pressure')}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => setCurrentStep('summary')}
                            className="flex-1 bg-gradient-to-r from-red-500 to-purple-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300"
                          >
                            สรุปผล
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleSaveBloodPressure}
                          className="flex-1 bg-gradient-to-r from-red-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-300"
                        >
                          บันทึกข้อมูล
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Summary Step
  if (currentStep === 'summary') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-700 to-blue-800 flex">
        {/* Left Panel - Patient Info */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">การตรวจเสร็จสิ้น</h1>
            <p className="text-white/80 text-lg">ข้อมูลสัญญาณชีพ</p>
          </div>

          {/* Patient Summary */}
          <div className="space-y-4">
            <div className="bg-white/20 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3">ข้อมูลผู้ป่วย</h3>
              <div className="space-y-2 text-white/80 text-sm">
                <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
                <p><span className="font-medium">คิว:</span> {patientData.queueNumber}</p>
                <p><span className="font-medium">แผนก:</span> {patientData.department}</p>
                <p><span className="font-medium">ห้อง:</span> {patientData.room}</p>
              </div>
            </div>

            <div className="bg-white/20 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3">เวลาดำเนินการ</h3>
              <p className="text-white/80 text-sm">
                {new Date().toLocaleString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Summary */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-4xl">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">สรุปผลการตรวจ</h2>
                <p className="text-gray-600">ข้อมูลสัญญาณชีพทั้งหมด</p>
              </div>

              {/* Vital Signs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                {/* Weight */}
                <div className="bg-blue-50 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  </div>
                  <p className="text-blue-600 text-sm font-medium mb-2">น้ำหนัก</p>
                  <p className="text-3xl font-bold text-blue-800">{vitalSigns.weight}</p>
                  <p className="text-blue-600 text-sm">กิโลกรัม</p>
                </div>

                {/* Height */}
                <div className="bg-green-50 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                  <p className="text-green-600 text-sm font-medium mb-2">ส่วนสูง</p>
                  <p className="text-3xl font-bold text-green-800">{vitalSigns.height}</p>
                  <p className="text-green-600 text-sm">เซนติเมตร</p>
                </div>

                {/* BMI */}
                <div className="bg-purple-50 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-purple-600 text-sm font-medium mb-2">BMI</p>
                  <p className="text-3xl font-bold text-purple-800">{vitalSigns.bmi}</p>
                  <p className="text-purple-600 text-sm">
                    {(() => {
                      const bmi = vitalSigns.bmi!;
                      if (bmi < 18.5) return 'น้ำหนักน้อย';
                      if (bmi < 25) return 'ปกติ';
                      if (bmi < 30) return 'น้ำหนักเกิน';
                      return 'อ้วน';
                    })()}
                  </p>
                </div>

                {/* Systolic */}
                <div className="bg-red-50 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <p className="text-red-600 text-sm font-medium mb-2">ความดันตัวบน</p>
                  <p className="text-3xl font-bold text-red-800">{vitalSigns.systolic}</p>
                  <p className="text-red-600 text-sm">mmHg</p>
                </div>

                {/* Diastolic */}
                <div className="bg-orange-50 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                  <p className="text-orange-600 text-sm font-medium mb-2">ความดันตัวล่าง</p>
                  <p className="text-3xl font-bold text-orange-800">{vitalSigns.diastolic}</p>
                  <p className="text-orange-600 text-sm">mmHg</p>
                </div>

                {/* Pulse */}
                <div className="bg-pink-50 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <p className="text-pink-600 text-sm font-medium mb-2">ชีพจร</p>
                  <p className="text-3xl font-bold text-pink-800">{vitalSigns.pulse}</p>
                  <p className="text-pink-600 text-sm">ครั้ง/นาที</p>
                </div>
              </div>

              {/* Health Status Summary */}
              <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                <h3 className="text-gray-800 font-bold text-lg mb-4 text-center">สรุปสถานะสุขภาพ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* BMI Status */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-gray-600">ดัชนีมวลกาย (BMI):</span>
                    <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                      vitalSigns.bmi! < 18.5 ? 'bg-blue-100 text-blue-800' :
                      vitalSigns.bmi! < 25 ? 'bg-green-100 text-green-800' :
                      vitalSigns.bmi! < 30 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {(() => {
                        const bmi = vitalSigns.bmi!;
                        if (bmi < 18.5) return 'น้ำหนักน้อย';
                        if (bmi < 25) return 'ปกติ';
                        if (bmi < 30) return 'น้ำหนักเกิน';
                        return 'อ้วน';
                      })()}
                    </span>
                  </div>

                  {/* Blood Pressure Status */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-gray-600">ความดันโลหิต:</span>
                    <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                      vitalSigns.systolic! < 120 && vitalSigns.diastolic! < 80 ? 'bg-green-100 text-green-800' :
                      vitalSigns.systolic! < 130 && vitalSigns.diastolic! < 80 ? 'bg-yellow-100 text-yellow-800' :
                      vitalSigns.systolic! < 140 || vitalSigns.diastolic! < 90 ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {(() => {
                        const systolic = vitalSigns.systolic!;
                        const diastolic = vitalSigns.diastolic!;
                        
                        if (systolic < 120 && diastolic < 80) return 'ปกติ';
                        if (systolic < 130 && diastolic < 80) return 'สูงเล็กน้อย';
                        if (systolic < 140 || diastolic < 90) return 'สูงระดับ 1';
                        return 'สูงระดับ 2';
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentStep('blood-pressure')}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
                >
                  แก้ไขข้อมูล
                </button>
                <button
                  onClick={() => setCurrentStep('qr-code')}
                  className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  สร้าง QR Code
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // QR Code Step
  if (currentStep === 'qr-code') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-800 flex">
        {/* Left Panel - Instructions */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">QR Code พร้อมแล้ว</h1>
            <p className="text-white/80 text-lg">สแกนเพื่อดำเนินการต่อ</p>
          </div>

          {/* Instructions */}
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">วิธีใช้งาน</h3>
            <ol className="space-y-2 text-white/80 text-sm">
              <li className="flex items-start">
                <span className="text-white mr-2">1.</span>
                ใช้โทรศัพท์สแกน QR Code
              </li>
              <li className="flex items-start">
                <span className="text-white mr-2">2.</span>
                ระบบจะนำไปหน้าต้อนรับ
              </li>
              <li className="flex items-start">
                <span className="text-white mr-2">3.</span>
                รอการเรียกคิวตามหมายเลข
              </li>
            </ol>
          </div>

          {/* Summary Info */}
          <div className="bg-white/20 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">ข้อมูลสรุป</h3>
            <div className="space-y-2 text-white/80 text-sm">
              <p><span className="font-medium">คิว:</span> {patientData.queueNumber}</p>
              <p><span className="font-medium">แผนก:</span> {patientData.department}</p>
              <p><span className="font-medium">ห้อง:</span> {patientData.room}</p>
              <p><span className="font-medium">เวลารอ:</span> {patientData.estimatedTime}</p>
            </div>
          </div>
        </div>

        {/* Right Panel - QR Code */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl text-center">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">สแกน QR Code</h2>
                               <p className="text-gray-600">เพื่อไปยังหน้าต้อนรับและรอการเรียกคิว</p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-8">
                <div className="bg-white p-8 rounded-2xl shadow-lg">
                  <QRCodeSVG
  value={generateQRData()}
  size={300}
  level="H"
  includeMargin={true}
/>
                </div>
              </div>

              {/* Patient Info Card */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8">
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">ข้อมูลผู้ป่วย</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
                      <p><span className="font-medium">คิว:</span> {patientData.queueNumber}</p>
                      <p><span className="font-medium">แผนก:</span> {patientData.department}</p>
                      <p><span className="font-medium">ห้อง:</span> {patientData.room}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">สัญญาณชีพ</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">น้ำหนัก:</span> {vitalSigns.weight} กก.</p>
                      <p><span className="font-medium">ส่วนสูง:</span> {vitalSigns.height} ซม.</p>
                      <p><span className="font-medium">BMI:</span> {vitalSigns.bmi}</p>
                      <p><span className="font-medium">ความดัน:</span> {vitalSigns.systolic}/{vitalSigns.diastolic} mmHg</p>
                      <p><span className="font-medium">ชีพจร:</span> {vitalSigns.pulse} bpm</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8">
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-800 font-medium">การตรวจสัญญาณชีพเสร็จสิ้น</span>
                </div>
                <p className="text-green-600 text-sm mt-2">
                  เวลา: {new Date().toLocaleString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentStep('summary')}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={() => {
                    // Save data to localStorage or send to API
                    const screeningData = {
                      patient: patientData,
                      vitalSigns,
                      timestamp: new Date().toISOString(),
                      status: 'completed'
                    };
                    localStorage.setItem('screeningData', JSON.stringify(screeningData));
                    
                    // Navigate to welcome page
                    navigate('/screening/welcome', {
                      state: {
                        patient: patientData,
                        vitalSigns,
                        fromScreening: true
                      }
                    });
                  }}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  ไปหน้าต้อนรับ
                </button>
              </div>

              {/* Additional Info */}
              <div className="mt-6 text-center">
                <p className="text-gray-500 text-sm">
                  หากไม่สามารถสแกน QR Code ได้ กรุณาใช้ปุ่ม "ไปหน้าต้อนรับ"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AllProcess;

