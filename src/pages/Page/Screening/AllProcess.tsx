import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { usePageDebug } from '../../../hooks/usePageDebug';
import { TableSchema } from '../../../types/Debug';
import axios from 'axios';

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

const handleTestOcrFile = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    const res = await axios.post(`${API_BASE_URL}/api/realtime/ocr/scan`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    alert('OCR Result: ' + JSON.stringify(res.data.text));
  } catch (err) {
    console.error('OCR Error: ' + (err as Error).message);
  }
};

const AllProcess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<ProcessStep>('weight');
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    weight: null, height: null, bmi: null, systolic: null, diastolic: null, pulse: null
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [patientToken] = useState<string | null>(localStorage.getItem('patient_token'));
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [symptomsText, setSymptomsText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [mainStream, setMainStream] = useState<MediaStream | null>(null);
  const [bpStream, setBpStream] = useState<MediaStream | null>(null);
  
  // Debug mode
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
  const { debugData } = usePageDebug('คัดกรองสัญญาณชีพ', requiredTables);

  const [queueInfo, setQueueInfo] = useState<any>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [manualInputMode, setManualInputMode] = useState(false);
  const scanIntervalId = useRef<NodeJS.Timeout | null>(null);

  // Camera management
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [mainCameraId, setMainCameraId] = useState<string | null>(null);
  const [bpCameraId, setBpCameraId] = useState<string | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const bpVideoRef = useRef<HTMLVideoElement>(null);

  // --- state สำหรับกล้องแยกน้ำหนัก/ส่วนสูง ---
  const [mainCameraIdWeight, setMainCameraIdWeight] = useState<string | null>(null);
  const [mainCameraIdHeight, setMainCameraIdHeight] = useState<string | null>(null);

  const [showCameraSettings, setShowCameraSettings] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0) {
        setMainCameraIdWeight(videoInputs[0]?.deviceId || null);
        setMainCameraIdHeight(videoInputs[0]?.deviceId || null);
        setBpCameraId(videoInputs[1]?.deviceId || videoInputs[0]?.deviceId || null);
      }
    });
  }, []);

  // Patient data
  const getPatientData = (): PatientData => {
    if (location.state?.patient) {
      return location.state.patient;
    }
    const storedPatient = localStorage.getItem('authenticatedPatient');
    if (storedPatient) {
      return JSON.parse(storedPatient);
    }
    return {
      id: 'P001234',
      name: 'นายสมชาย ใจดี',
      nationalId: '1234567890123'
    };
  };
  
  const [patientData] = useState<PatientData>(getPatientData());

  // Debug input states
  const [debugWeight, setDebugWeight] = useState('');
  const [debugHeight, setDebugHeight] = useState('');
  const [debugSystolic, setDebugSystolic] = useState('');
  const [debugDiastolic, setDebugDiastolic] = useState('');
  const [debugPulse, setDebugPulse] = useState('');

  // Manual input states
  const [manualWeight, setManualWeight] = useState('');
  const [manualHeight, setManualHeight] = useState('');
  const [manualSystolic, setManualSystolic] = useState('');
  const [manualDiastolic, setManualDiastolic] = useState('');
  const [manualPulse, setManualPulse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const calculateBMI = (weight: number, height: number): number => {
    const heightInMeters = height / 100;
    return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
  };

  useEffect(() => {
    if (vitalSigns.weight && vitalSigns.height && vitalSigns.weight > 0 && vitalSigns.height > 0) {
      const bmi = calculateBMI(vitalSigns.weight, vitalSigns.height);
      if (vitalSigns.bmi !== bmi) {
        setVitalSigns(prev => ({ ...prev, bmi }));
      }
    }
  }, [vitalSigns.weight, vitalSigns.height]);

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
    
    if (systolic > 160 || diastolic > 100) {
      setErrorMessage('ความดันสูงเกินไป กรุณาตรวจสอบค่าอีกครั้ง');
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

  const submitSymptoms = async () => {
    try {
      if (!patientToken) {
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
            'Authorization': `Bearer ${patientToken}`,
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateQRData = () => {
    const token = patientToken || '';
    const queueId = queueInfo?._id || '';
    const baseUrl = import.meta.env.PROD
      ? 'https://yourdomain.com/welcome'
      : 'http://localhost:5173/welcome';
    return `${baseUrl}?token=${encodeURIComponent(token)}&queue_id=${encodeURIComponent(queueId)}`;
  };

  // --- อัปเดต videoDevices แล้ว set default id ---
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0) {
        setMainCameraIdWeight(videoInputs[0]?.deviceId || null);
        setMainCameraIdHeight(videoInputs[0]?.deviceId || null);
        setBpCameraId(videoInputs[1]?.deviceId || videoInputs[0]?.deviceId || null);
      }
    });
  }, []);

  // --- useEffect เปิดกล้อง (mainCamera) ---
  useEffect(() => {
    let stream: MediaStream;
    let cancelled = false;
    let deviceId: string | null = null;
    if (currentStep === 'weight') deviceId = mainCameraIdWeight;
    else if (currentStep === 'height') deviceId = mainCameraIdHeight;
    if ((currentStep === 'weight' || currentStep === 'height') && deviceId) {
      setIsCameraOpen(false);
      navigator.mediaDevices.getUserMedia({
        video: { deviceId: deviceId ? { exact: deviceId } : undefined }
      })
        .then(s => {
          if (cancelled) return;
          stream = s;
          setMainStream(s);
          if (mainVideoRef.current) mainVideoRef.current.srcObject = s;
          setIsCameraOpen(true);
        })
        .catch(err => {
          setErrorMessage('ไม่สามารถเปิดกล้องได้: ' + err.name);
          console.error('[Camera] mainCamera error:', err);
        });
    }
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (mainVideoRef.current) mainVideoRef.current.srcObject = null;
      setMainStream(null);
      setIsCameraOpen(false);
    };
  }, [currentStep, mainCameraIdWeight, mainCameraIdHeight]);

  // --- ปรับ useEffect เปิดกล้อง (bpCamera) ---
  useEffect(() => {
    let stream: MediaStream;
    let cancelled = false;
    if (["systolic", "diastolic", "pulse"].includes(currentStep) && bpCameraId) {
      setIsCameraOpen(false);
      navigator.mediaDevices.getUserMedia({
        video: { deviceId: bpCameraId ? { exact: bpCameraId } : undefined }
      })
        .then(s => {
          if (cancelled) return;
          stream = s;
          setBpStream(s);
          if (bpVideoRef.current) bpVideoRef.current.srcObject = s;
          setIsCameraOpen(true);
        })
        .catch(err => {
          setErrorMessage('ไม่สามารถเปิดกล้องได้: ' + err.name);
          console.error('[Camera] bpCamera error:', err);
        });
    }
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (bpVideoRef.current) bpVideoRef.current.srcObject = null;
      setBpStream(null);
      setIsCameraOpen(false);
    };
  }, [currentStep, bpCameraId]);

  // main camera
  useEffect(() => {
    if (mainStream && mainVideoRef.current) {
      mainVideoRef.current.srcObject = mainStream;
    }
    return () => {
      if (mainVideoRef.current) mainVideoRef.current.srcObject = null;
    };
  }, [mainStream]);

  // bp camera
  useEffect(() => {
    if (bpStream && bpVideoRef.current) {
      bpVideoRef.current.srcObject = bpStream;
    }
    return () => {
      if (bpVideoRef.current) bpVideoRef.current.srcObject = null;
    };
  }, [bpStream]);

  useEffect(() => {
    return () => {
      // ปิด mainStream
      if (mainStream) {
        mainStream.getTracks().forEach(track => track.stop());
      }
      // ปิด mainVideoRef
      if (mainVideoRef.current && mainVideoRef.current.srcObject) {
        const s = mainVideoRef.current.srcObject as MediaStream;
        s.getTracks().forEach(track => {
          if (track.readyState === 'live') track.stop();
        });
        mainVideoRef.current.srcObject = null;
      }
      // ปิด bpStream
      if (bpStream) {
        bpStream.getTracks().forEach(track => track.stop());
      }
      // ปิด bpVideoRef
      if (bpVideoRef.current && bpVideoRef.current.srcObject) {
        const s = bpVideoRef.current.srcObject as MediaStream;
        s.getTracks().forEach(track => {
          if (track.readyState === 'live') track.stop();
        });
        bpVideoRef.current.srcObject = null;
      }
    };
  }, []);

  const captureAndOcrFront = async (field: keyof VitalSigns, videoRef: React.RefObject<HTMLVideoElement>) => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (field === 'weight' || field === 'height') {
      ctx.filter = 'grayscale(1) contrast(3)';
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 255 - imageData.data[i];
        imageData.data[i+1] = 255 - imageData.data[i+1];
        imageData.data[i+2] = 255 - imageData.data[i+2];
      }
      ctx.putImageData(imageData, 0, 0);
    } else {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setErrorMessage('กำลังประมวลผล OCR...');
      try {
        const isEngOnly = (field === 'weight' || field === 'height' || field === 'systolic' || field === 'diastolic' || field === 'pulse');
        const lang = isEngOnly ? 'eng' : 'eng+tha';
        const ocrTexts = await ocrImageBlob(blob, lang);
        const ocrText = ocrTexts.join(' ');
        const numberPattern = /\d{1,3}(\.\d+)?/g;
        const matches = ocrText.match(numberPattern);
        let value: string | null = null;
        if (matches && matches.length > 0) {
          value = matches.find(m => m.includes('.')) || matches[0];
          setVitalSigns(prev => ({
            ...prev,
            [field]: Number(value)
          }));
          setErrorMessage('');
          setTimeout(() => {
            if (field === 'weight') setCurrentStep('height');
            else if (field === 'height') setCurrentStep('systolic');
            else if (field === 'systolic') setCurrentStep('diastolic');
            else if (field === 'diastolic') setCurrentStep('pulse');
            else if (field === 'pulse') setCurrentStep('summary');
          }, 1200);
        } else {
          setErrorMessage('OCR ไม่พบข้อมูล');
        }
      } catch (err) {
        setErrorMessage('เกิดข้อผิดพลาดในการ OCR');
        console.error(`[OCR] Field: ${field} | OCR error:`, err);
      }
    }, 'image/jpeg', 0.8);
  };

  const ocrImageBlob = async (blob: Blob, lang: string = 'eng'): Promise<string[]> => {
    const formData = new FormData();
    formData.append('image', blob, 'ocr.jpg');
    formData.append('lang', lang);
    const res = await axios.post(`${API_BASE_URL}/api/realtime/ocr/scan`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.text;
  };

  const saveAndSendVitalSigns = async () => {
    if (!patientToken) {
      setErrorMessage('ไม่พบ token กรุณายืนยันตัวตนใหม่');
      return;
    }
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/queue/queue`,
        {
          vital_signs: vitalSigns,
          symptoms: symptomsText
        },
        { headers: { Authorization: `Bearer ${patientToken}` } }
      );
      const queueResponse = await axios.get(
        `${API_BASE_URL}/api/queue/queue/with_patient`,
        { headers: { Authorization: `Bearer ${patientToken}` } }
      );
      setQueueInfo(queueResponse.data);
    } catch {
      setErrorMessage('บันทึกข้อมูลหรือดึงคิวล้มเหลว');
    }
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');
    const res = await axios.post(`${API_BASE_URL}/api/speaktotext/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.text;
  };

  useEffect(() => {
    if (audioBlob) {
      setErrorMessage('กำลังแปลงเสียงเป็นข้อความ...');
      sendAudioToBackend(audioBlob)
        .then(text => {
          setSymptomsText(text);
          setErrorMessage('');
        })
        .catch(err => {
          setErrorMessage('เกิดข้อผิดพลาดในการแปลงเสียงเป็นข้อความ');
          console.error('Speech-to-text error:', err);
        });
    }
  }, [audioBlob]);

  const openCamera = async () => {
    if ((currentStep === 'weight' || currentStep === 'height') && mainStream) return;
    if (['systolic', 'diastolic', 'pulse'].includes(currentStep) && bpStream) return;
    try {
      const videoConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      };
      if (currentStep === 'weight' || currentStep === 'height') {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { ...videoConstraints, deviceId: mainCameraId ? { exact: mainCameraId } : undefined }
        });
        setMainStream(s);
        if (mainVideoRef.current) mainVideoRef.current.srcObject = s;
      } else if (["systolic", "diastolic", "pulse"].includes(currentStep)) {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { ...videoConstraints, deviceId: bpCameraId ? { exact: bpCameraId } : undefined }
        });
        setBpStream(s);
        if (bpVideoRef.current) bpVideoRef.current.srcObject = s;
      }
      setIsCameraOpen(true);
    } catch (err) {
      setErrorMessage('ไม่สามารถเปิดกล้องได้');
      console.error('Camera error:', err);
    }
  };

  const closeCamera = () => {
    if (mainStream) {
      mainStream.getTracks().forEach(track => track.stop());
      setMainStream(null);
      if (mainVideoRef.current) mainVideoRef.current.srcObject = null;
    }
    if (bpStream) {
      bpStream.getTracks().forEach(track => track.stop());
      setBpStream(null);
      if (bpVideoRef.current) bpVideoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    if (scanIntervalId.current) clearInterval(scanIntervalId.current);
  };

  const scan = async (field: keyof VitalSigns) => {
    const videoRef = (field === 'weight' || field === 'height') ? mainVideoRef : bpVideoRef;
    if (!videoRef.current) return;
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (field === 'weight' || field === 'height') {
      ctx.filter = 'grayscale(1) contrast(3)';
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 255 - imageData.data[i];
        imageData.data[i+1] = 255 - imageData.data[i+1];
        imageData.data[i+2] = 255 - imageData.data[i+2];
      }
      ctx.putImageData(imageData, 0, 0);
    } else {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setErrorMessage('กำลังประมวลผล OCR...');
      try {
        const isEngOnly = (field === 'weight' || field === 'height' || field === 'systolic' || field === 'diastolic' || field === 'pulse');
        const lang = isEngOnly ? 'eng' : 'eng+tha';
        const ocrTexts = await ocrImageBlob(blob, lang);
        const ocrText = ocrTexts.join(' ');
        const numberPattern = /\d{1,3}(\.\d+)?/g;
        const matches = ocrText.match(numberPattern);
        let value: string | null = null;
        if (matches && matches.length > 0) {
          if (field === 'height') {
            // เลือกค่าที่มากที่สุด
            const nums = matches.map(Number).filter(n => !isNaN(n));
            const highest = Math.max(...nums);
            value = highest.toString();
          } else {
            value = matches.find(m => m.includes('.')) || matches[0];
          }
          let num = Number(value);
          let valid = true;
          if (field === 'weight' && (num < 20 || num > 200)) valid = false;
          if (field === 'height' && (num < 100 || num > 250)) valid = false;
          if (field === 'systolic' && (num < 80 || num > 200)) valid = false;
          if (field === 'diastolic' && (num < 50 || num > 120)) valid = false;
          if (field === 'pulse' && (num < 40 || num > 150)) valid = false;
          if (!valid) {
            setErrorMessage('OCR พบเลขไม่สมเหตุสมผล: ' + value);
            setScanCount(c => c + 1);
            return;
          }
          setVitalSigns(prev => ({ ...prev, [field]: num }));
          setErrorMessage('');
          setScanCount(0);
          setIsCameraOpen(false);
          closeCamera();
          setManualInputMode(false);
          setTimeout(() => {
            if (field === 'weight') setCurrentStep('height');
            else if (field === 'height') setCurrentStep('systolic');
            else if (field === 'systolic') setCurrentStep('diastolic');
            else if (field === 'diastolic') setCurrentStep('pulse');
            else if (field === 'pulse') setCurrentStep('symptoms');
          }, 1200);
        } else {
          setScanCount(c => c + 1);
          setErrorMessage('OCR ไม่พบข้อมูล');
        }
      } catch (err) {
        setScanCount(c => c + 1);
        setErrorMessage('เกิดข้อผิดพลาดในการ OCR');
        console.error(`[OCR] Field: ${field} | OCR error:`, err);
      }
    }, 'image/jpeg', 0.8);
  };

  useEffect(() => {
    if (isCameraOpen) {
      let field: keyof VitalSigns;
      if (currentStep === 'weight') field = 'weight';
      else if (currentStep === 'height') field = 'height';
      else if (currentStep === 'systolic') field = 'systolic';
      else if (currentStep === 'diastolic') field = 'diastolic';
      else if (currentStep === 'pulse') field = 'pulse';
      else return;
      scan(field);
      scanIntervalId.current = setInterval(() => scan(field), 8000);
    }
    return () => {
      if (scanIntervalId.current) clearInterval(scanIntervalId.current);
    };
  }, [isCameraOpen, currentStep]);

  useEffect(() => {
    if (scanCount >= 5) setManualInputMode(true);
  }, [scanCount]);

  useEffect(() => {
    setScanCount(0);
    setManualInputMode(false);
  }, [currentStep]);

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
            onClick={submitSymptoms}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            ยืนยันและดำเนินการต่อ
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

  const CameraSelector = () => (
    <>
      <button
        className="fixed bottom-4 right-4 z-50 bg-gray-700 text-white px-4 py-2 rounded shadow-lg hover:bg-gray-800"
        onClick={() => setShowCameraSettings(v => !v)}
      >
        {showCameraSettings ? 'ปิดการตั้งค่ากล้อง' : 'ตั้งค่ากล้อง'}
      </button>
      {showCameraSettings && (
        <div className="fixed bottom-16 right-4 z-50 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-6 w-80 border border-gray-200">
          <div className="mb-4">
            <label className="block font-medium mb-1 text-gray-800">เลือกกล้องสำหรับน้ำหนัก</label>
            <select
              value={mainCameraIdWeight || ''}
              onChange={e => setMainCameraIdWeight(e.target.value)}
              className="p-2 border rounded w-full"
            >
              {videoDevices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1} (${device.deviceId.slice(-4)})`}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1 text-gray-800">เลือกกล้องสำหรับส่วนสูง</label>
            <select
              value={mainCameraIdHeight || ''}
              onChange={e => setMainCameraIdHeight(e.target.value)}
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
            <label className="block font-medium mb-1 text-gray-800">เลือกกล้องสำหรับความดัน/ชีพจร</label>
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
      )}
    </>
  );

  if (currentStep === 'symptoms') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
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
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">ข้อมูลผู้ป่วย</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
              <p><span className="font-medium">เลขประจำตัวประชาชน:</span> {patientData.nationalId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</p>
            </div>
          </div>
          <div className="bg-white/20 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">คำแนะนำ</h3>
            <ul className="space-y-2 text-white/80 list-disc list-inside">
              <li>กดปุ่มบันทึกเสียงและพูดอาการที่รู้สึก</li>
              <li>หรือพิมพ์อาการในช่องข้อความ</li>
              <li>สามารถทำทั้งสองอย่างได้</li>
            </ul>
          </div>
        </div>
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">บันทึกอาการของท่าน</h2>
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
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">หรือพิมพ์อาการ</h3>
              <textarea
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                placeholder="กรุณาระบุอาการที่รู้สึก เช่น ปวดหัว มีไข้ ไอ เจ็บคอ ฯลฯ"
                className="w-full p-4 border border-gray-300 rounded-lg h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                <p>{errorMessage}</p>
              </div>
            )}
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
              {isDebugMode && (
                <button
                  onClick={() => setCurrentStep('qr-code')}
                  className="ml-4 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium"
                >
                  ข้าม (Debug)
                </button>
              )}
            </div>
            <audio ref={audioRef} className="hidden" />
          </div>
        </div>
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  if (currentStep === 'weight') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
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
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">ข้อมูลผู้ป่วย</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
              <p><span className="font-medium">เลขประจำตัวประชาชน:</span> {patientData.nationalId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</p>
            </div>
          </div>
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
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <CameraSelector />
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">กำลังสแกนน้ำหนัก</h2>
            <div className="mb-4 text-center">
              {!isCameraOpen ? (
                <div className="text-gray-500">กำลังเปิดกล้อง...</div>
              ) : (
                <video ref={mainVideoRef} autoPlay playsInline muted className="w-full h-64 object-cover mb-2" />
              )}
              <div className="text-sm text-gray-500 mt-2">กำลังสแกนอัตโนมัติทุก 8 วินาที...</div>
            </div>
            {errorMessage && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{errorMessage}</div>}
            <div className="text-center text-lg">น้ำหนักที่ได้: <span className="font-bold">{vitalSigns.weight ?? '-'}</span> กก.</div>
            {(scanCount >= 5 || manualInputMode) && (
              <div className="mt-4 flex flex-col items-center">
                <label className="mb-1 text-gray-700">กรอกข้อมูลด้วยตัวเอง (optional):</label>
                <input type="number" className="p-2 border rounded w-40 text-center" placeholder="กรอกน้ำหนัก (กก.)" value={manualWeight} onChange={e => setManualWeight(e.target.value)} />
                <button className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={() => {
                  const w = parseFloat(manualWeight);
                  if (w > 20 && w < 200) {
                    setVitalSigns(prev => ({ ...prev, weight: w }));
                    setManualWeight('');
                    setTimeout(() => setCurrentStep('height'), 800);
                  } else {
                    setErrorMessage('กรุณากรอกน้ำหนักให้ถูกต้อง');
                  }
                }}>ยืนยันน้ำหนัก</button>
              </div>
            )}
          </div>
        </div>
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  if (currentStep === 'height') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
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
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">ข้อมูลผู้ป่วย</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
              <p><span className="font-medium">เลขประจำตัวประชาชน:</span> {patientData.nationalId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</p>
            </div>
          </div>
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
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <CameraSelector />
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">กำลังสแกนส่วนสูง</h2>
            <div className="mb-4 text-center">
              {!isCameraOpen ? (
                <div className="text-gray-500">กำลังเปิดกล้อง...</div>
              ) : (
                <video ref={mainVideoRef} autoPlay playsInline muted className="w-full h-64 object-cover mb-2" />
              )}
              <div className="text-sm text-gray-500 mt-2">กำลังสแกนอัตโนมัติทุก 8 วินาที...</div>
            </div>
            {errorMessage && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{errorMessage}</div>}
            <div className="text-center text-lg">ส่วนสูงที่ได้: <span className="font-bold">{vitalSigns.height ?? '-'}</span> ซม.</div>
            {(scanCount >= 5 || manualInputMode) && (
              <div className="mt-4 flex flex-col items-center">
                <label className="mb-1 text-gray-700">กรอกข้อมูลด้วยตัวเอง (optional):</label>
                <input type="number" className="p-2 border rounded w-40 text-center" placeholder="กรอกส่วนสูง (ซม.)" value={manualHeight} onChange={e => setManualHeight(e.target.value)} />
                <button className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={() => {
                  const h = parseFloat(manualHeight);
                  if (h > 100 && h < 250) {
                    setVitalSigns(prev => ({ ...prev, height: h }));
                    setManualHeight('');
                    setTimeout(() => setCurrentStep('systolic'), 800);
                  } else {
                    setErrorMessage('กรุณากรอกส่วนสูงให้ถูกต้อง');
                  }
                }}>ยืนยันส่วนสูง</button>
              </div>
            )}
          </div>
        </div>
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  if (currentStep === 'systolic') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
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
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">ข้อมูลผู้ป่วย</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
              <p><span className="font-medium">เลขประจำตัวประชาชน:</span> {patientData.nationalId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</p>
            </div>
          </div>
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
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <CameraSelector />
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">กำลังวัดความดันโลหิต</h2>
            <div className="mb-4 text-center">
              {!isCameraOpen ? (
                <div className="text-gray-500">กำลังเปิดกล้อง...</div>
              ) : (
                <video ref={bpVideoRef} autoPlay playsInline muted className="w-full h-64 object-cover mb-2" />
              )}
              <div className="text-sm text-gray-500 mt-2">กำลังสแกนอัตโนมัติทุก 8 วินาที...</div>
            </div>
            {errorMessage && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{errorMessage}</div>}
            <div className="text-center text-lg">ค่าความดันตัวบนที่ได้: <span className="font-bold">{vitalSigns.systolic ?? '-'}</span> mmHg</div>
            {(scanCount >= 5 || manualInputMode) && (
              <div className="mt-4 flex flex-col items-center">
                <label className="mb-1 text-gray-700">กรอกข้อมูลด้วยตัวเอง (optional):</label>
                <input type="number" className="p-2 border rounded w-40 text-center" placeholder="กรอกความดันตัวบน (mmHg)" value={manualSystolic} onChange={e => setManualSystolic(e.target.value)} />
                <button className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={() => {
                  const s = parseInt(manualSystolic);
                  if (s > 80 && s < 200) {
                    setVitalSigns(prev => ({ ...prev, systolic: s }));
                    setManualSystolic('');
                    setTimeout(() => setCurrentStep('diastolic'), 800);
                  } else {
                    setErrorMessage('กรุณากรอกค่าความดันตัวบนให้ถูกต้อง');
                  }
                }}>ยืนยันความดันตัวบน</button>
              </div>
            )}
          </div>
        </div>
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  if (currentStep === 'diastolic') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
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
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">ข้อมูลผู้ป่วย</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
              <p><span className="font-medium">เลขประจำตัวประชาชน:</span> {patientData.nationalId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</p>
            </div>
          </div>
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
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <CameraSelector />
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">กำลังวัดความดันโลหิต</h2>
            <div className="mb-4 text-center">
              {!isCameraOpen ? (
                <div className="text-gray-500">กำลังเปิดกล้อง...</div>
              ) : (
                <video ref={bpVideoRef} autoPlay playsInline muted className="w-full h-64 object-cover mb-2" />
              )}
              <div className="text-sm text-gray-500 mt-2">กำลังสแกนอัตโนมัติทุก 8 วินาที...</div>
            </div>
            {errorMessage && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{errorMessage}</div>}
            <div className="text-center text-lg">ค่าความดันตัวล่างที่ได้: <span className="font-bold">{vitalSigns.diastolic ?? '-'}</span> mmHg</div>
            {(scanCount >= 5 || manualInputMode) && (
              <div className="mt-4 flex flex-col items-center">
                <label className="mb-1 text-gray-700">กรอกข้อมูลด้วยตัวเอง (optional):</label>
                <input type="number" className="p-2 border rounded w-40 text-center" placeholder="กรอกความดันตัวล่าง (mmHg)" value={manualDiastolic} onChange={e => setManualDiastolic(e.target.value)} />
                <button className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={() => {
                  const d = parseInt(manualDiastolic);
                  if (d > 50 && d < 120) {
                    setVitalSigns(prev => ({ ...prev, diastolic: d }));
                    setManualDiastolic('');
                    setTimeout(() => setCurrentStep('pulse'), 800);
                  } else {
                    setErrorMessage('กรุณากรอกค่าความดันตัวล่างให้ถูกต้อง');
                  }
                }}>ยืนยันความดันตัวล่าง</button>
              </div>
            )}
          </div>
        </div>
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  if (currentStep === 'pulse') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
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
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">ข้อมูลผู้ป่วย</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
              <p><span className="font-medium">เลขประจำตัวประชาชน:</span> {patientData.nationalId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</p>
            </div>
          </div>
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
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <CameraSelector />
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">กำลังวัดชีพจร</h2>
            <div className="mb-4 text-center">
              {!isCameraOpen ? (
                <div className="text-gray-500">กำลังเปิดกล้อง...</div>
              ) : (
                <video ref={bpVideoRef} autoPlay playsInline muted className="w-full h-64 object-cover mb-2" />
              )}
              <div className="text-sm text-gray-500 mt-2">กำลังสแกนอัตโนมัติทุก 8 วินาที...</div>
            </div>
            {errorMessage && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{errorMessage}</div>}
            <div className="text-center text-lg">ค่าชีพจรที่ได้: <span className="font-bold">{vitalSigns.pulse ?? '-'}</span> bpm</div>
            {(scanCount >= 5 || manualInputMode) && (
              <div className="mt-4 flex flex-col items-center">
                <label className="mb-1 text-gray-700">กรอกข้อมูลด้วยตัวเอง (optional):</label>
                <input type="number" className="p-2 border rounded w-40 text-center" placeholder="กรอกชีพจร (bpm)" value={manualPulse} onChange={e => setManualPulse(e.target.value)} />
                <button className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={() => {
                  const p = parseInt(manualPulse);
                  if (p > 40 && p < 150) {
                    setVitalSigns(prev => ({ ...prev, pulse: p }));
                    setManualPulse('');
                    setTimeout(() => setCurrentStep('summary'), 800);
                  } else {
                    setErrorMessage('กรุณากรอกค่าชีพจรให้ถูกต้อง');
                  }
                }}>ยืนยันชีพจร</button>
              </div>
            )}
          </div>
        </div>
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  if (currentStep === 'summary') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">สรุปผล</h1>
            <p className="text-white/80 text-lg">ตรวจสอบข้อมูล</p>
          </div>
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">ข้อมูลผู้ป่วย</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
              <p><span className="font-medium">เลขประจำตัวประชาชน:</span> {patientData.nationalId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</p>
            </div>
          </div>
          <div className="bg-white/20 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">คำแนะนำ</h3>
            <ul className="space-y-2 text-white/80 list-disc list-inside">
              <li>ตรวจสอบข้อมูลสัญญาณชีพ</li>
              <li>หากข้อมูลไม่ถูกต้อง สามารถกลับไปแก้ไขได้</li>
              <li>กดยืนยันเพื่อไปขั้นตอนต่อไป</li>
            </ul>
          </div>
        </div>
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">สรุปผลสัญญาณชีพ</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">น้ำหนัก</p>
                <p className="text-lg font-semibold">{vitalSigns.weight ?? '-'} กก.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">ส่วนสูง</p>
                <p className="text-lg font-semibold">{vitalSigns.height ?? '-'} ซม.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">BMI</p>
                <p className="text-lg font-semibold">{vitalSigns.bmi ?? '-'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">ความดันโลหิต</p>
                <p className="text-lg font-semibold">
                  {vitalSigns.systolic ?? '-'} / {vitalSigns.diastolic ?? '-'} mmHg
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">ชีพจร</p>
                <p className="text-lg font-semibold">{vitalSigns.pulse ?? '-'} bpm</p>
              </div>
            </div>
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {errorMessage}
              </div>
            )}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setCurrentStep('weight')}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600"
              >
                กลับไปแก้ไข
              </button>
              <button
                onClick={async () => {
                  await saveAndSendVitalSigns();
                  setCurrentStep('symptoms');
                }}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700"
              >
                ยืนยันและไปต่อ
              </button>
            </div>
          </div>
        </div>
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  if (currentStep === 'qr-code') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m-6 4h2m6-4h-2m-6 0h-2m4 0H8m-4 4h2m6 0h2m-2 4h2m-6 0h-2m4-4v-4m0 8v-4m4 4v-4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">QR Code</h1>
            <p className="text-white/80 text-lg">ขั้นตอนสุดท้าย</p>
          </div>
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">ข้อมูลผู้ป่วย</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
              <p><span className="font-medium">เลขประจำตัวประชาชน:</span> {patientData.nationalId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</p>
            </div>
          </div>
          <div className="bg-white/20 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">คำแนะนำ</h3>
            <ul className="space-y-2 text-white/80 list-disc list-inside">
              <li>สแกน QR Code เพื่อดูผล</li>
              <li>นำ QR Code ไปแสดงที่เคาน์เตอร์</li>
              <li>กดเสร็จสิ้นเพื่อกลับสู่หน้าหลัก</li>
            </ul>
          </div>
        </div>
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">สแกน QR Code</h2>
            <div className="flex justify-center mb-8">
              <QRCodeSVG value={generateQRData()} size={256} />
            </div>
            <div className="text-center">
              <p className="text-gray-600 mb-4">กรุณาสแกน QR Code นี้เพื่อดูผลการตรวจและคิวของคุณ</p>
              <button
                onClick={() => navigate('/welcome')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }

  return null; // Fallback in case no step matches
};

export default AllProcess;