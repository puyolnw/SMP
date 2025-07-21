import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { usePageDebug } from '../../../hooks/usePageDebug';
import { TableSchema } from '../../../types/Debug';
import axios from 'axios';
import Tesseract from 'tesseract.js';

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

type ProcessStep = 'weight' | 'height' | 'systolic' | 'diastolic' | 'pulse' | 'summary' | 'symptoms' | 'qr-code';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AllProcess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<ProcessStep>('weight');
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    weight: null, height: null, bmi: null, systolic: null, diastolic: null, pulse: null
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [patientToken] = useState<string | null>(null);
  
  // เพิ่ม state สำหรับการบันทึกเสียง
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [symptomsText, setSymptomsText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
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
    },
    {
      tableName: 'symptoms',
      columns: ['patientId', 'audioFile', 'transcription', 'timestamp'],
      description: 'ข้อมูลอาการของผู้ป่วย'
    }
  ];
  // Use debug hook
  const { debugData } = usePageDebug('คัดกรองสัญญาณชีพ', requiredTables);
  console.log('debugData:', debugData);

  // เพิ่มฟังก์ชันสำหรับการบันทึกเสียง
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // เริ่มนับเวลา
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      setErrorMessage('ไม่สามารถเข้าถึงไมโครโฟนได้');
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (audioBlob && audioRef.current) {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setSymptomsText('');
  };

  // ฟังก์ชันส่งข้อมูลอาการไปยัง backend
  const submitSymptoms = async () => {
    try {
      const token = localStorage.getItem('patient_token');
      if (!token) {
        setErrorMessage('ไม่พบ token กรุณายืนยันตัวตนใหม่');
        return;
      }

      const formData = new FormData();
      if (audioBlob) {
        formData.append('audio', audioBlob, 'symptoms.wav');
      }
      if (symptomsText.trim()) {
        formData.append('text', symptomsText);
      }

      await axios.post(
        `${API_BASE_URL}/api/symptoms/record`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setCurrentStep('qr-code');
    } catch (error) {
      setErrorMessage('ไม่สามารถบันทึกข้อมูลอาการได้');
      console.error('Error submitting symptoms:', error);
    }
  };

  // ฟังก์ชันแปลงเวลาเป็นรูปแบบ mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  // Process debug input for weight and height
  const processDebugWeightHeight = async () => {
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
    setCurrentStep('systolic');
    await saveAndSendVitalSigns();
    return true;
  };

  // Process debug input for blood pressure
  const processDebugBloodPressure = async () => {
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
    await saveAndSendVitalSigns();
    return true;
  };

  // Generate QR Code data
  const generateQRData = () => {
    const qrData = {
      patientId: patientData.id,
      name: patientData.name,
      vitalSigns,
      symptoms: {
        hasAudio: !!audioBlob,
        text: symptomsText
      },
      timestamp: new Date().toISOString(),
      redirectUrl: '/screening/welcome'
    };
    return JSON.stringify(qrData);
  };

  // 1. ดึงรายชื่อกล้องทั้งหมด
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      setVideoDevices(devices.filter(device => device.kind === 'videoinput'));
    });
  }, []);

  // 2. state สำหรับ deviceId ของแต่ละกล้อง
  const [mainCameraId, setMainCameraId] = useState<string | null>(null); // น้ำหนัก/ส่วนสูง
  const [bpCameraId, setBpCameraId] = useState<string | null>(null);     // ความดัน/ชีพจร

  // 3. auto เลือก 2 ตัวแรก
  useEffect(() => {
    if (videoDevices.length > 0) {
      setMainCameraId(videoDevices[0]?.deviceId || null);
      setBpCameraId(videoDevices[1]?.deviceId || videoDevices[0]?.deviceId || null);
    }
  }, [videoDevices]);

  // 4. videoRef แยกกัน
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const bpVideoRef = useRef<HTMLVideoElement>(null);

  // useEffect สำหรับ mainCamera (weight/height)
  useEffect(() => {
    let stream: MediaStream;
    if (currentStep === 'weight' || currentStep === 'height') {
      if (mainCameraId) {
        const deviceInfo = videoDevices.find(d => d.deviceId === mainCameraId);
        console.log(`[Camera] Try open mainCameraId: ${mainCameraId} | label: ${deviceInfo?.label}`);
        navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: mainCameraId },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        })
          .then(s => {
            stream = s;
            if (mainVideoRef.current) mainVideoRef.current.srcObject = stream;
            console.log('[Camera] mainCamera opened successfully');
          })
          .catch(err => {
            setErrorMessage('ไม่สามารถเปิดกล้องได้: ' + err.name);
            console.log('[Camera] mainCamera error:', err);
          });
      }
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (mainVideoRef.current) mainVideoRef.current.srcObject = null;
    };
  }, [currentStep, mainCameraId, videoDevices]);

  // useEffect สำหรับ bpCamera (blood-pressure)
  useEffect(() => {
    let stream: MediaStream;
    if (["systolic", "diastolic", "pulse"].includes(currentStep)) {
      if (bpCameraId) {
        const deviceInfo = videoDevices.find(d => d.deviceId === bpCameraId);
        console.log(`[Camera] Try open bpCameraId: ${bpCameraId} | label: ${deviceInfo?.label}`);
        navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: bpCameraId },
            width: { ideal: 1920 },
                       height: { ideal: 1080 }
          }
        })
          .then(s => {
            stream = s;
            if (bpVideoRef.current) bpVideoRef.current.srcObject = stream;
            console.log('[Camera] bpCamera opened successfully');
          })
          .catch(err => {
            setErrorMessage('ไม่สามารถเปิดกล้องได้: ' + err.name);
            console.log('[Camera] bpCamera error:', err);
          });
      }
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (bpVideoRef.current) bpVideoRef.current.srcObject = null;
    };
  }, [currentStep, bpCameraId, videoDevices]);

  // 6. ปรับ captureAndOcrFront ให้รับ videoRef
  const captureAndOcrFront = async (field: keyof VitalSigns, videoRef: React.RefObject<HTMLVideoElement>) => {
    console.log('[captureAndOcrFront] called', field, videoRef.current);
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (field === 'weight' || field === 'height') {
      ctx.filter = 'grayscale(1) contrast(3)';
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      // Invert สี
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 255 - imageData.data[i];     // R
        imageData.data[i+1] = 255 - imageData.data[i+1]; // G
        imageData.data[i+2] = 255 - imageData.data[i+2]; // B
      }
      ctx.putImageData(imageData, 0, 0);
    } else {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setErrorMessage('กำลังประมวลผล OCR...');
      try {
        // ใช้ภาษา eng เฉพาะ weight/height/blood-pressure
        const isEngOnly = (field === 'weight' || field === 'height' || field === 'systolic' || field === 'diastolic' || field === 'pulse');
        const lang = isEngOnly ? 'eng' : 'eng+tha';
        const ocrText = await ocrImageBlob(blob, lang);
        const numberPattern = /\d{2,3}(\.\d{1,2})?/g;
        const matches = ocrText.match(numberPattern);
        console.log(`[OCR] Field: ${field} | Raw OCR text:`, ocrText);
        console.log(`[OCR] Field: ${field} | Matched numbers:`, matches);
        if (matches && matches.length > 0) {
          console.log(`[OCR] Field: ${field} | Using value:`, matches[0]);
          setVitalSigns(prev => ({
            ...prev,
            [field]: Number(matches[0])
          }));
          setErrorMessage('');
          // เพิ่ม delay ก่อนเปลี่ยน step
          setTimeout(() => {
            if (field === 'weight') setCurrentStep('height');
            else if (field === 'height') setCurrentStep('systolic');
            else if (field === 'systolic') setCurrentStep('diastolic');
            else if (field === 'diastolic') setCurrentStep('pulse');
            else if (field === 'pulse') setCurrentStep('summary');
          }, 1200); // 1.2 วินาที
        } else {
          setErrorMessage('OCR ไม่พบข้อมูล');
          console.log(`[OCR] Field: ${field} | No number found`);
        }
      } catch (err) {
        setErrorMessage('เกิดข้อผิดพลาดในการ OCR');
        console.log(`[OCR] Field: ${field} | OCR error:`, err);
      }
    }, 'image/jpeg', 0.8);
  };

  // ปรับ ocrImageBlob ให้รับ lang
  const ocrImageBlob = async (blob: Blob, lang: string = 'eng+tha'): Promise<string> => {
    const { data: { text } } = await Tesseract.recognize(blob, lang);
    return text;
  };

  // ตัวอย่างฟังก์ชันบันทึก vital signs และส่งไป backend
  const saveAndSendVitalSigns = async () => {
    if (!patientToken) {
      setErrorMessage('ไม่พบ token กรุณายืนยันตัวตนใหม่');
      return;
    }
    try {
      // POST ข้อมูล vital_signs ไป backend
      await axios.post(
        `${API_BASE_URL}/api/queue/queue`,
        {
          vital_signs: {
            weight: vitalSigns.weight,
            height: vitalSigns.height,
            bmi: vitalSigns.bmi,
            systolic: vitalSigns.systolic,
            diastolic: vitalSigns.diastolic,
            pulse: vitalSigns.pulse
          }
        },
        { headers: { Authorization: `Bearer ${patientToken}` } }
      );
      // POST สำเร็จแล้ว GET ข้อมูลคิวกลับมา
      await axios.get(
        `${API_BASE_URL}/api/queue/queue/with_patient`,
        { headers: { Authorization: `Bearer ${patientToken}` } }
      );
    } catch {
      setErrorMessage('บันทึกข้อมูลหรือดึงคิวล้มเหลว');
    }
  };

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
      
      {currentStep === 'weight' ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">น้ำหนัก</p>
          <input
            type="number"
            value={debugWeight}
            onChange={(e) => setDebugWeight(e.target.value)}
            placeholder="น้ำหนัก (กก.)"
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
      ) : currentStep === 'height' ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">ส่วนสูง</p>
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
      ) : currentStep === 'systolic' ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">ความดันตัวบน (mmHg)</p>
          <input
            type="number"
            value={debugSystolic}
            onChange={(e) => setDebugSystolic(e.target.value)}
            placeholder="ความดันตัวบน"
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
      ) : currentStep === 'diastolic' ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">ความดันตัวล่าง (mmHg)</p>
          <input
            type="number"
            value={debugDiastolic}
            onChange={(e) => setDebugDiastolic(e.target.value)}
            placeholder="ความดันตัวล่าง"
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
      ) : currentStep === 'pulse' ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">ชีพจร (bpm)</p>
          <input
            type="number"
            value={debugPulse}
            onChange={(e) => setDebugPulse(e.target.value)}
            placeholder="ชีพจร"
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
      ) : currentStep === 'symptoms' ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Debug - บันทึกอาการ</p>
          <textarea
            value={symptomsText}
            onChange={(e) => setSymptomsText(e.target.value)}
            placeholder="พิมพ์อาการ"
            className="w-full p-2 border rounded h-20"
          />
          <button
            onClick={() => setCurrentStep('qr-code')}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            ข้ามไปขั้นตอนถัดไป
          </button>
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

  // เพิ่ม UI dropdown สำหรับเลือกกล้อง
  const CameraSelector = () => (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div>
        <label className="block font-medium mb-1 text-white">เลือกกล้องสำหรับน้ำหนัก/ส่วนสูง</label>
        <select
          value={mainCameraId || ''}
          onChange={e => setMainCameraId(e.target.value)}
          className="p-2 border rounded w-full"
        >
          {videoDevices.map((device, idx) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${idx + 1} (${device.deviceId.slice(-4)})`}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block font-medium mb-1 text-white">เลือกกล้องสำหรับความดัน/ชีพจร</label>
        <select
          value={bpCameraId || ''}
          onChange={e => setBpCameraId(e.target.value)}
          className="p-2 border rounded w-full"
        >
          {videoDevices.map((device, idx) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${idx + 1} (${device.deviceId.slice(-4)})`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  useEffect(() => {
    if (
      vitalSigns.weight &&
      vitalSigns.height &&
      vitalSigns.weight > 0 &&
      vitalSigns.height > 0
    ) {
      const bmi = calculateBMI(vitalSigns.weight, vitalSigns.height);
      if (vitalSigns.bmi !== bmi) {
        setVitalSigns(prev => ({
          ...prev,
          bmi
        }));
      }
    }
  }, [vitalSigns.weight, vitalSigns.height]);

  // Add manual input states
  const [manualWeight, setManualWeight] = useState('');
  const [manualHeight, setManualHeight] = useState('');
  const [manualSystolic, setManualSystolic] = useState('');
  const [manualDiastolic, setManualDiastolic] = useState('');
  const [manualPulse, setManualPulse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // เพิ่ม Symptoms Step
  if (currentStep === 'symptoms') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
        {/* Left Panel - Instructions */}
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">บันทึกอาการ</h1>
            <p className="text-white/80 text-lg">ขั้นตอนสุดท้าย</p>
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
              <li>กดปุ่มบันทึกเสียงและพูดอาการที่รู้สึก</li>
              <li>หรือพิมพ์อาการในช่องข้อความ</li>
              <li>สามารถทำทั้งสองอย่างได้</li>
            </ul>
          </div>
        </div>

        {/* Right Panel - Recording */}
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">บันทึกอาการของท่าน</h2>
            
            {/* Voice Recording Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">บันทึกเสียง</h3>
              
              <div className="bg-gray-50 rounded-lg p-6">
                {!isRecording && !audioBlob && (
                  <div className="text-center">
                    <button
                      onClick={startRecording}
                      className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-medium text-lg transition-colors flex items-center mx-auto"
                    >
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      เริ่มบันทึกเสียง
                    </button>
                    <p className="text-sm text-gray-500 mt-2">กดเพื่อเริ่มบันทึกเสียง</p>
                  </div>
                )}

                {isRecording && (
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse mr-3"></div>
                      <span className="text-lg font-medium text-red-600">กำลังบันทึก... {formatTime(recordingTime)}</span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-full font-medium text-lg transition-colors"
                    >
                      หยุดบันทึก
                    </button>
                  </div>
                )}

                {audioBlob && !isRecording && (
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <button
                        onClick={playRecording}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a1.5 1.5 0 011.5 1.5v1a1.5 1.5 0 01-1.5 1.5H9m0-5v5m0-5a1.5 1.5 0 011.5-1.5H12" />
                        </svg>
                        เล่น
                      </button>
                      <button
                        onClick={deleteRecording}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        ลบ
                      </button>
                      <button
                        onClick={startRecording}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        บันทึกใหม่
                      </button>
                    </div>
                    <p className="text-sm text-green-600">✓ บันทึกเสียงเรียบร้อยแล้ว ({formatTime(recordingTime)})</p>
                  </div>
                )}
              </div>
            </div>

            {/* Text Input Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">หรือพิมพ์อาการ</h3>
              <textarea
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                placeholder="กรุณาระบุอาการที่รู้สึก เช่น ปวดหัว มีไข้ ไอ เจ็บคอ ฯลฯ"
                className="w-full p-4 border border-gray-300 rounded-lg h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                <p>{errorMessage}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="text-center">
              <button
                onClick={submitSymptoms}
                disabled={!audioBlob && !symptomsText.trim()}
                className={`px-8 py-3 rounded-lg font-medium text-lg transition-colors ${
                  audioBlob || symptomsText.trim()
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                ยืนยันและดำเนินการต่อ
              </button>
              
              {/* Skip Button for Debug Mode */}
              {isDebugMode && (
                <button
                  onClick={() => setCurrentStep('qr-code')}
                  className="ml-4 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium"
                >
                  ข้าม (Debug)
                </button>
              )}
            </div>

            {/* Hidden Audio Element */}
            <audio ref={audioRef} className="hidden" />
          </div>
        </div>
        
        {/* Debug Panel */}
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  if (currentStep === 'weight') {
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
            <h1 className="text-3xl font-bold text-white mb-4">สแกนน้ำหนัก</h1>
            <p className="text-white/80 text-lg">ขั้นตอนที่ 1 จาก 3</p>
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
          <div className="text-center mt-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => captureAndOcrFront('weight', mainVideoRef)}
            >
              สแกนน้ำหนักด้วยกล้อง
            </button>
          </div>
        </div>

        {/* Right Panel - Measurement */}
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <CameraSelector />
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">กำลังสแกนน้ำหนัก</h2>
            
            {/* Video Feed */}
            <div className="relative mb-6 rounded-lg overflow-hidden bg-gray-100 aspect-video">
              <video ref={mainVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {(!mainVideoRef.current || !mainVideoRef.current.srcObject) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-gray-800">กำลังเปิดกล้อง...</h3>
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
            <div className="text-center text-lg">
              น้ำหนักที่ได้: <span className="font-bold">{vitalSigns.weight ?? '-'}</span> กก.
            </div>
            <div className="text-center mt-4">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={() => captureAndOcrFront('weight', mainVideoRef)}
              >
                สแกนน้ำหนักด้วยกล้อง
              </button>
            </div>
            {/* Manual input */}
            <div className="mt-4 flex flex-col items-center">
              <input
                type="number"
                className="p-2 border rounded w-40 text-center"
                placeholder="กรอกน้ำหนัก (กก.)"
                value={manualWeight}
                onChange={e => setManualWeight(e.target.value)}
              />
              <button
                className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={() => {
                  const w = parseFloat(manualWeight);
                  if (w > 20 && w < 200) {
                    setVitalSigns(prev => ({ ...prev, weight: w }));
                    setManualWeight('');
                    setTimeout(() => setCurrentStep('height'), 800);
                  } else {
                    setErrorMessage('กรุณากรอกน้ำหนักให้ถูกต้อง');
                  }
                }}
              >
                ยืนยันน้ำหนัก
              </button>
            </div>
          </div>
        </div>
        
        {/* Debug Panel */}
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  if (currentStep === 'height') {
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
            <h1 className="text-3xl font-bold text-white mb-4">สแกนส่วนสูง</h1>
            <p className="text-white/80 text-lg">ขั้นตอนที่ 2 จาก 3</p>
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
              <li>ยืนตรงใต้เครื่องวัดส่วนสูง</li>
              <li>ถอดรองเท้าออก</li>
              <li>ยืนนิ่งๆ จนกว่าระบบจะวัดเสร็จ</li>
            </ul>
          </div>
          <div className="text-center mt-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => captureAndOcrFront('height', mainVideoRef)}
            >
              สแกนส่วนสูงด้วยกล้อง
            </button>
          </div>
        </div>

        {/* Right Panel - Measurement */}
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <CameraSelector />
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">กำลังสแกนส่วนสูง</h2>
            
            {/* Video Feed */}
            <div className="relative mb-6 rounded-lg overflow-hidden bg-gray-100 aspect-video">
              <video ref={mainVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {(!mainVideoRef.current || !mainVideoRef.current.srcObject) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-gray-800">กำลังเปิดกล้อง...</h3>
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
            <div className="text-center text-lg">ส่วนสูงที่ได้: <span className="font-bold">{vitalSigns.height ?? '-'}</span> ซม.</div>
            <div className="text-center mt-4">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={() => captureAndOcrFront('height', mainVideoRef)}
              >
                สแกนส่วนสูงด้วยกล้อง
              </button>
            </div>
            {/* Manual input */}
            <div className="mt-4 flex flex-col items-center">
              <input
                type="number"
                className="p-2 border rounded w-40 text-center"
                placeholder="กรอกส่วนสูง (ซม.)"
                value={manualHeight}
                onChange={e => setManualHeight(e.target.value)}
              />
              <button
                className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={() => {
                  const h = parseFloat(manualHeight);
                  if (h > 100 && h < 250) {
                    setVitalSigns(prev => ({ ...prev, height: h }));
                    setManualHeight('');
                    setTimeout(() => setCurrentStep('systolic'), 800);
                  } else {
                    setErrorMessage('กรุณากรอกส่วนสูงให้ถูกต้อง');
                  }
                }}
              >
                ยืนยันส่วนสูง
              </button>
            </div>
          </div>
        </div>
        
        {/* Debug Panel */}
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  // Blood Pressure Step
  if (currentStep === 'systolic') {
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
            <h1 className="text-3xl font-bold text-white mb-4">วัดความดันตัวบน</h1>
            <p className="text-white/80 text-lg">ขั้นตอนที่ 3 จาก 3</p>
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
          <div className="text-center mt-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => captureAndOcrFront('systolic', bpVideoRef)}
            >
              สแกนความดันตัวบน
            </button>
          </div>
        </div>

        {/* Right Panel - Measurement */}
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <CameraSelector />
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">กำลังวัดความดันโลหิต</h2>
            
            {/* Video Feed */}
            <div className="relative mb-6 rounded-lg overflow-hidden bg-gray-100 aspect-video">
              <video ref={bpVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {(!bpVideoRef.current || !bpVideoRef.current.srcObject) && (
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
              </div>
            )}
            <div className="text-center text-lg">ค่าความดันตัวบนที่ได้: <span className="font-bold">{vitalSigns.systolic ?? '-'}</span> mmHg</div>
            <div className="text-center mt-4">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={() => captureAndOcrFront('systolic', bpVideoRef)}
              >
                สแกนความดันตัวบน
              </button>
            </div>
            {/* Manual input */}
            <div className="mt-4 flex flex-col items-center">
              <input
                type="number"
                className="p-2 border rounded w-40 text-center"
                placeholder="กรอกความดันตัวบน (mmHg)"
                value={manualSystolic}
                onChange={e => setManualSystolic(e.target.value)}
              />
              <button
                className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={() => {
                  const s = parseInt(manualSystolic);
                  if (s > 80 && s < 200) {
                    setVitalSigns(prev => ({ ...prev, systolic: s }));
                    setManualSystolic('');
                    setTimeout(() => setCurrentStep('diastolic'), 800);
                  } else {
                    setErrorMessage('กรุณากรอกค่าความดันตัวบนให้ถูกต้อง');
                  }
                }}
              >
                ยืนยันความดันตัวบน
              </button>
            </div>
          </div>
        </div>
        
        {/* Debug Panel */}
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  if (currentStep === 'diastolic') {
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
            <h1 className="text-3xl font-bold text-white mb-4">วัดความดันตัวล่าง</h1>
            <p className="text-white/80 text-lg">ขั้นตอนที่ 3 จาก 3</p>
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
          <div className="text-center mt-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => captureAndOcrFront('diastolic', bpVideoRef)}
            >
              สแกนความดันตัวล่าง
            </button>
          </div>
        </div>

        {/* Right Panel - Measurement */}
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <CameraSelector />
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">กำลังวัดความดันโลหิต</h2>
            
            {/* Video Feed */}
            <div className="relative mb-6 rounded-lg overflow-hidden bg-gray-100 aspect-video">
              <video ref={bpVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {(!bpVideoRef.current || !bpVideoRef.current.srcObject) && (
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
              </div>
            )}
            <div className="text-center text-lg">ค่าความดันตัวล่างที่ได้: <span className="font-bold">{vitalSigns.diastolic ?? '-'}</span> mmHg</div>
            <div className="text-center mt-4">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={() => captureAndOcrFront('diastolic', bpVideoRef)}
              >
                สแกนความดันตัวล่าง
              </button>
            </div>
            {/* Manual input */}
            <div className="mt-4 flex flex-col items-center">
              <input
                type="number"
                className="p-2 border rounded w-40 text-center"
                placeholder="กรอกความดันตัวล่าง (mmHg)"
                value={manualDiastolic}
                onChange={e => setManualDiastolic(e.target.value)}
              />
              <button
                className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={() => {
                  const d = parseInt(manualDiastolic);
                  if (d > 50 && d < 120) {
                    setVitalSigns(prev => ({ ...prev, diastolic: d }));
                    setManualDiastolic('');
                    setTimeout(() => setCurrentStep('pulse'), 800);
                  } else {
                    setErrorMessage('กรุณากรอกค่าความดันตัวล่างให้ถูกต้อง');
                  }
                }}
              >
                ยืนยันความดันตัวล่าง
              </button>
            </div>
          </div>
        </div>
        
        {/* Debug Panel */}
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  if (currentStep === 'pulse') {
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
            <h1 className="text-3xl font-bold text-white mb-4">วัดชีพจร</h1>
            <p className="text-white/80 text-lg">ขั้นตอนที่ 3 จาก 3</p>
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
              <li>นั่งพักสักครู่ก่อนวัดชีพจร</li>
              <li>วางแขนบนที่วางแขน</li>
              <li>นั่งนิ่งๆ ไม่พูดคุยระหว่างวัด</li>
            </ul>
          </div>
          <div className="text-center mt-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => captureAndOcrFront('pulse', bpVideoRef)}
            >
              สแกนชีพจร
            </button>
          </div>
        </div>

        {/* Right Panel - Measurement */}
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <CameraSelector />
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">กำลังวัดชีพจร</h2>
            
            {/* Video Feed */}
            <div className="relative mb-6 rounded-lg overflow-hidden bg-gray-100 aspect-video">
              <video ref={bpVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {(!bpVideoRef.current || !bpVideoRef.current.srcObject) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-gray-800">เตรียมวัดชีพจร</h3>
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
            <div className="text-center text-lg">ค่าชีพจรที่ได้: <span className="font-bold">{vitalSigns.pulse ?? '-'}</span> bpm</div>
            <div className="text-center mt-4">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={() => captureAndOcrFront('pulse', bpVideoRef)}
              >
                สแกนชีพจร
              </button>
            </div>
            {/* Manual input */}
            <div className="mt-4 flex flex-col items-center">
              <input
                type="number"
                className="p-2 border rounded w-40 text-center"
                placeholder="กรอกชีพจร (bpm)"
                value={manualPulse}
                onChange={e => setManualPulse(e.target.value)}
              />
              <button
                className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={() => {
                  const p = parseInt(manualPulse);
                  if (p > 40 && p < 150) {
                    setVitalSigns(prev => ({ ...prev, pulse: p }));
                    setManualPulse('');
                    setTimeout(() => setCurrentStep('symptoms'), 800);
                  } else {
                    setErrorMessage('กรุณากรอกค่าชีพจรให้ถูกต้อง');
                  }
                }}
              >
                ยืนยันชีพจร
              </button>
            </div>
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
    console.log('[SUMMARY] Render summary step', vitalSigns);
    console.log('weight', vitalSigns.weight);
    console.log('height', vitalSigns.height);
    console.log('systolic', vitalSigns.systolic);
    console.log('diastolic', vitalSigns.diastolic);
    console.log('pulse', vitalSigns.pulse);
    console.log('[DEBUG] About to get token from localStorage');
    const token = localStorage.getItem('patient_token');
    console.log('[SUMMARY SUBMIT] token:', token);

    // เพิ่มฟังก์ชัน handleSubmit
    const handleSubmit = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        if (!token) throw new Error('ไม่พบ token กรุณายืนยันตัวตนใหม่');
        await axios.post(
          `${API_BASE_URL}/api/queue/queue`,
          { vital_signs: vitalSigns },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCurrentStep('qr-code');
      } catch {
        setErrorMessage('ส่งข้อมูลไม่สำเร็จ');
      } finally {
        setIsLoading(false);
      }
    };

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
            
            {/* ปุ่ม Submit */}
            <div className="text-center mt-8">
              <button
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-green-700"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2 inline-block" viewBox="0 0 24 24" />
                    กำลังส่งข้อมูล...
                  </>
                ) : (
                  'ยืนยันและส่งข้อมูล'
                )}
              </button>
              {errorMessage && <div className="text-red-500 mt-2">{errorMessage}</div>}
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
