import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

import axios from 'axios';

// Type declarations for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: any;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: any) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: any) => any) | null;
  onresult: ((this: SpeechRecognition, ev: any) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface PatientData {
  id: string;
  name: string;
  nationalId: string;
  profileImage?: string;
  // เพิ่มข้อมูลวันเกิดเพื่อคำนวณอายุ
  birthDate?: string; // รูปแบบ YYYY-MM-DD หรือ ISO date
  age?: number; // อายุที่คำนวณแล้ว
}

interface VitalSigns {
  weight: number | null;
  height: number | null;
  bmi: number | null;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  age: number | null;
}

type ProcessStep = 'weight' | 'height' | 'systolic' | 'diastolic' | 'pulse' | 'blood-pressure' | 'symptoms' | 'summary' | 'qr-code';



const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';


const AllProcess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // เพิ่ม key สำหรับบันทึกขนาดกล้อง
const CAMERA_SIZE_KEY = 'camera_size_settings';

const [cameraSize, setCameraSize] = useState({
  weight: { width: 800, height: 600 },
  height: { width: 800, height: 600 },
  bp: { width: 800, height: 600 }
});

const loadCameraSizeSettings = () => {
  const saved = localStorage.getItem(CAMERA_SIZE_KEY);
  return saved ? JSON.parse(saved) : null;
};
  const [currentStep, setCurrentStep] = useState<ProcessStep>('weight');
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    weight: null, height: null, bmi: null, systolic: null, diastolic: null, pulse: null, age: null
  });
  const [errorMessage, setErrorMessage] = useState('');
  
  // Get patient token from location state or localStorage
  const getPatientToken = (): string | null => {
    const stateToken = location.state?.token;
    const localToken = localStorage.getItem('patient_token');
    console.log('Getting patient token - state:', stateToken, 'localStorage:', localToken);
    return stateToken || localToken;
  };
  
  const [patientToken] = useState<string | null>(getPatientToken());
  
  const CAMERASETTINGS_KEY = 'camerasettings';
  // Audio recording states (legacy - now using Speech Recognition) 
  const [symptomsText, setSymptomsText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Speech recognition states
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const submitTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const symptomsTextRef = useRef<string>('');
  const [mainStream, setMainStream] = useState<MediaStream | null>(null);
  const [bpStream, setBpStream] = useState<MediaStream | null>(null);
  const stopSpeaking = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};
  // Debug mode
  const isDebugMode = import.meta.env.MODE === 'development';
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isNarratorEnabled, setIsNarratorEnabled] = useState(true);
console.log('isSpeaking', isSpeaking,setIsSpeaking);

  const [queueInfo, setQueueInfo] = useState<any>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [manualInputMode, setManualInputMode] = useState(false);
const scanIntervalId = useRef<NodeJS.Timeout | number | null>(null);

  // Camera management
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [bpCameraId, setBpCameraId] = useState<string | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const bpVideoRef = useRef<HTMLVideoElement>(null);

  // --- state สำหรับกล้องแยกน้ำหนัก/ส่วนสูง ---
  const [mainCameraIdWeight, setMainCameraIdWeight] = useState<string | null>(null);
  const [mainCameraIdHeight, setMainCameraIdHeight] = useState<string | null>(null);

  const [showCameraSettings, setShowCameraSettings] = useState(false);
const saveCameraSettings = (settings: {
  mainCameraIdWeight: string | null;
  mainCameraIdHeight: string | null;
  bpCameraId: string | null;
}) => {
  localStorage.setItem(CAMERASETTINGS_KEY, JSON.stringify(settings));
};

const loadCameraSettings = () => {
  try {
    const saved = localStorage.getItem(CAMERASETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading camera settings:', error);
  }
  return null;
};
const speak = (text: string) => {
  if (window.speechSynthesis && isNarratorEnabled) {
    // หยุดเสียงเก่าก่อน
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 1;
    utterance.pitch = 0.5;
    window.speechSynthesis.speak(utterance);
  }
};

// Initialize Speech Recognition
const initializeSpeechRecognition = () => {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'th-TH';
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      setIsListening(true);
      setIsTranscribing(true);
      setErrorMessage('กำลังฟัง... กรุณาพูดอาการของท่าน');
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      
      // ตรวจสอบว่าข้อความไม่ว่าง
      if (!transcript || transcript.trim() === '') {
        setErrorMessage('ไม่ได้รับข้อความ กรุณาลองบันทึกใหม่');
        speak('ไม่ได้รับข้อความ กรุณาลองบันทึกใหม่');
        return;
      }
      
      setSymptomsText(transcript.trim());
      symptomsTextRef.current = transcript.trim(); // อัพเดท ref ด้วย
      setIsTranscribing(false);
      setErrorMessage('');
      
      // ทวนข้อความที่แปลงได้
      speak(`ระบบได้ยินว่าคุณบอกอาการว่า ${transcript} ถูกต้องหรือไม่`);
      
      // auto-submit จะถูกจัดการโดย useEffect ที่ติดตาม symptomsText แล้ว
    };
    
    recognition.onerror = (event: any) => {
      setIsListening(false);
      setIsTranscribing(false);
      
      switch (event.error) {
        case 'no-speech':
          setErrorMessage('ไม่ได้ยินเสียงพูด กรุณาลองใหม่');
          break;
        case 'audio-capture':
          setErrorMessage('ไม่สามารถเข้าถึงไมโครโฟนได้');
          break;
        case 'not-allowed':
          setErrorMessage('กรุณาอนุญาตการใช้ไมโครโฟน');
          break;
        default:
          setErrorMessage('เกิดข้อผิดพลาดในการรับรู้เสียง กรุณาลองใหม่');
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
      if (isTranscribing) {
        setIsTranscribing(false);
        setErrorMessage('');
      }
    };
    
    setRecognition(recognition);
    return recognition;
  } else {
    setErrorMessage('เบราว์เซอร์ไม่รองรับการรับรู้เสียง กรุณาใช้ Chrome หรือ Edge');
    return null;
  }
};

// Start speech recognition
const startSpeechRecognition = () => {
  const rec = recognition || initializeSpeechRecognition();
  
  if (rec && !isListening) {
    try {
      // แนะนำก่อนเริ่มฟัง
      speak('กรุณาพูดอาการของท่านหลังจากเสียงสัญญาณ');
      
      // รอ 3 วินาทีแล้วเล่นเสียงสัญญาณ
      setTimeout(() => {
        // เล่นเสียงสัญญาณ (beep)
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
        
        // เริ่มฟังหลังเสียงสัญญาณ
        setTimeout(() => {
          rec.start();
        }, 500);
      }, 3000);
    } catch (error) {
      setErrorMessage('ไม่สามารถเริ่มการรับรู้เสียงได้');
    }
  }
};

// Stop speech recognition
const stopSpeechRecognition = () => {
  if (recognition && isListening) {
    recognition.stop();
  }
  
  // ยกเลิก timeout ที่รอ submitSymptoms
  if (submitTimeoutRef.current) {
    clearTimeout(submitTimeoutRef.current as any);
    submitTimeoutRef.current = null;
  }
  
  // ยกเลิก countdown interval
  if (countdownIntervalRef.current) {
    clearInterval(countdownIntervalRef.current as any);
    countdownIntervalRef.current = null;
  }
  setAutoSubmitCountdown(null);
};

  useEffect(() => {
  // หยุดเสียงทุกครั้งที่เปลี่ยน step
  stopSpeaking();
  
  // ยกเลิก timeout ของ submitSymptoms เฉพาะเมื่อออกจาก symptoms step
  if (currentStep !== 'symptoms' && submitTimeoutRef.current) {
    console.log('Clearing timeout because step changed from symptoms to:', currentStep);
    clearTimeout(submitTimeoutRef.current as any);
    submitTimeoutRef.current = null;
    
    // ยกเลิก countdown ด้วย
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current as any);
      countdownIntervalRef.current = null;
    }
    setAutoSubmitCountdown(null);
  }
}, [currentStep]);

  // Initialize Speech Recognition on component mount
  useEffect(() => {
    initializeSpeechRecognition();
  }, []);

  // Auto-submit when symptomsText changes (from typing or speech recognition)
  useEffect(() => {
    // เฉพาะใน symptoms step และมีข้อความจริง
    if (currentStep === 'symptoms' && symptomsText && symptomsText.trim()) {
      console.log('Symptoms text changed, starting auto-submit:', symptomsText);
      
      // ยกเลิก timeout เก่าที่อาจจะมีอยู่
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current as any);
        submitTimeoutRef.current = null;
      }
      
      // ยกเลิก countdown interval เก่า
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current as any);
        countdownIntervalRef.current = null;
      }
      
      // อัพเดท ref
      symptomsTextRef.current = symptomsText.trim();
      
      // เริ่มนับถอยหลัง
      setAutoSubmitCountdown(5);
      
      // เริ่ม countdown interval
      countdownIntervalRef.current = setInterval(() => {
        setAutoSubmitCountdown(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            // หยุด countdown เมื่อถึง 0
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current as any);
              countdownIntervalRef.current = null;
            }
            return null;
          }
        });
      }, 1000);
      
      // ตั้ง timeout สำหรับ auto-submit
      submitTimeoutRef.current = setTimeout(() => {
        // หยุด countdown
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current as any);
          countdownIntervalRef.current = null;
        }
        setAutoSubmitCountdown(null);
        
        // ใช้ symptomsTextRef เพื่อให้ได้ข้อความล่าสุดเสมอ
        if (symptomsTextRef.current && symptomsTextRef.current.trim()) {
          console.log('Auto-submitting symptoms:', symptomsTextRef.current);
          submitSymptoms();
        }
      }, 5000);
    }
  }, [symptomsText, currentStep]);

  useEffect(() => {
    let message = '';
    
    switch (currentStep) {
      case 'weight':
        message = 'เริ่มขั้นตอนการชั่งน้ำหนัก กรุณาขึ้นชั่งน้ำหนัก ถอดรองเท้าออก และยืนนิ่งๆ รอสักครู่';
        break;
      case 'height':
        message = 'เริ่มขั้นตอนการวัดส่วนสูง กรุณายืนตรงใต้เครื่องวัดส่วนสูง ถอดรองเท้าออก และยืนนิ่งๆ รอสักครู่';
        break;
      case 'blood-pressure':
        message = 'เริ่มขั้นตอนการวัดความดันโลหิตและชีพจร กรุณานั่งพักสักครู่ วางแขนบนที่วางแขน และนั่งนิ่งๆ ไม่พูดคุยระหว่างวัด รอสักครู่';
        break;
      case 'symptoms':
        message = 'เริ่มขั้นตอนการบันทึกอาการ กรุณาบันทึกเสียงหรือพิมพ์อาการที่รู้สึก';
        break;
      case 'summary':
        message = 'กรุณาตรวจสอบข้อมูลสัญญาณชีพของท่าน หากถูกต้องกดยืนยัน หากไม่ถูกต้องสามารถกลับไปแก้ไขได้';
        break;
      case 'qr-code':
        message = 'การตรวจเสร็จสิ้น กรุณาสแกน คิวอาร์โค้ด เพื่อดูผลการตรวจและคิวของท่าน';
        break;
    }
    
    if (message && isNarratorEnabled) {
      setTimeout(() => speak(message), 500);
    }
  }, [currentStep, isNarratorEnabled]);

  // ฟังก์ชันคำนวณอายุจากรหัสประจำตัวประชาชน หรือวันเกิด
  const calculateAge = (nationalId: string, birthDate?: string): number => {
    let calculatedAge = 30; // ค่าเริ่มต้น
    
    if (birthDate) {
      // คำนวณจากวันเกิดโดยตรง
      const birth = new Date(birthDate);
      const today = new Date();
      calculatedAge = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
    } else if (nationalId && nationalId.length >= 7) {
      // คำนวณจากรหัสประจำตัวประชาชนไทย (7 หลักแรก = วัน/เดือน/ปี)
      try {
        const yearCode = nationalId.substring(1, 3);
        const currentYear = new Date().getFullYear();
        const yearPrefix = parseInt(yearCode) > 50 ? 2400 : 2500; // พ.ศ.
        const birthYear = yearPrefix + parseInt(yearCode) - 543; // แปลงเป็น ค.ศ.
        
        if (birthYear > 1900 && birthYear <= currentYear) {
          calculatedAge = currentYear - birthYear;
        }
      } catch (error) {
        console.warn('Cannot calculate age from nationalId:', error);
      }
    }
    
    return Math.max(0, Math.min(120, calculatedAge)); // จำกัดอายุ 0-120 ปี
  };

  // Patient data with cache management
  const getPatientData = (): PatientData => {
    // 1. ลำดับความสำคัญ: location.state (ข้อมูลใหม่จาก AuthenPatient)
    if (location.state?.patient) {
      console.log('Patient data received from location.state:', location.state.patient);
      // บันทึกข้อมูลใหม่ลง localStorage และ clear cache เก่า
      localStorage.setItem('authenticatedPatient', JSON.stringify(location.state.patient));
      return location.state.patient;
    }
    
    // 2. ถ้าไม่มีใน location.state ให้ดูใน localStorage
    const storedPatient = localStorage.getItem('authenticatedPatient');
    if (storedPatient) {
      const patient = JSON.parse(storedPatient);
      console.log('Patient data from localStorage:', patient);
      // คำนวณอายุถ้ายังไม่มี
      if (!patient.age) {
        patient.age = calculateAge(patient.nationalId, patient.birthDate);
        console.log('Calculated age for patient:', patient.age);
      }
      return patient;
    }
    
    // 3. Fallback data
    console.log('Using fallback patient data');
    return {
      id: 'P001234',
      name: 'นายสมชาย ใจดี',
      nationalId: '1234567890123',
      birthDate: '1990-01-01',
      age: calculateAge('1234567890123', '1990-01-01')
    };
  };
  
  // Patient data state with refresh capability
  const [patientData, setPatientData] = useState<PatientData>(getPatientData());
  
  // Function to refresh patient data
  const refreshPatientData = () => {
    const newPatientData = getPatientData();
    setPatientData(newPatientData);
    console.log('Patient data refreshed:', newPatientData);
    return newPatientData;
  };

  // Auto-refresh patient data when component mounts or location changes
  useEffect(() => {
    console.log('Location or patient data changed, refreshing...');
    refreshPatientData();
  }, [location.state]);

  // Save token to localStorage if received from state
  useEffect(() => {
    const stateToken = location.state?.token;
    if (stateToken) {
      console.log('Saving token from state to localStorage:', stateToken);
      localStorage.setItem('patient_token', stateToken);
    }
  }, [location.state?.token]);

  // Reset function to clear all cache and restart process
  const resetAllData = () => {
    // Clear all localStorage cache
    localStorage.removeItem('authenticatedPatient');
    localStorage.removeItem('patient_token');
    localStorage.removeItem('queueInfo');
    
    // Reset all states
    setCurrentStep('weight');
    setVitalSigns({
      weight: null, height: null, bmi: null, 
      systolic: null, diastolic: null, pulse: null, age: null
    });
    setErrorMessage('');
    setSymptomsText('');
    symptomsTextRef.current = ''; // รีเซ็ต ref ด้วย
    setQueueInfo(null);
    setScanCount(0);
    setManualInputMode(false);
    
    // Clear speech recognition timeout
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current as any);
      submitTimeoutRef.current = null;
    }
    
    // Close cameras
    closeCamera();
    
    console.log('All data reset, redirecting to authentication...');
    speak('ระบบได้รีเซ็ตข้อมูลแล้ว กรุณาเริ่มต้นใหม่');
    
    // Redirect to authentication page after a short delay
    setTimeout(() => {
      navigate('/Screening/AuthenPatient', { replace: true });
    }, 2000);
  };

  // Function to clear only patient cache and refresh
  const clearPatientCache = () => {
    localStorage.removeItem('authenticatedPatient');
    const newPatientData = refreshPatientData();
    speak(`ข้อมูลผู้ป่วยถูกรีเฟรช ชื่อ ${newPatientData.name}`);
  };

  // ตั้งค่าอายุเริ่มต้นใน vitalSigns
  useEffect(() => {
    console.log('Setting up initial age in vitalSigns:', { 
      patientAge: patientData.age, 
      currentVitalSignsAge: vitalSigns.age 
    });
    if (patientData.age && vitalSigns.age === null) {
      setVitalSigns(prev => ({ ...prev, age: patientData.age || null }));
      console.log('Age set in vitalSigns:', patientData.age);
    }
  }, [patientData.age, vitalSigns.age]);

  // Debug token status
  useEffect(() => {
    console.log('AllProcess - Token status:', {
      patientToken,
      stateToken: location.state?.token,
      localStorageToken: localStorage.getItem('patient_token'),
      patientData: patientData.name
    });
  }, [patientToken, location.state?.token, patientData]);

  // Debug input states
  const [debugWeight, setDebugWeight] = useState('');
  const [debugHeight, setDebugHeight] = useState('');
  const [debugSystolic, setDebugSystolic] = useState('');
  const [debugDiastolic, setDebugDiastolic] = useState('');
  const [debugPulse, setDebugPulse] = useState('');
const [existingVitalSigns, setExistingVitalSigns] = useState<VitalSigns | null>(null);
const [isLoadingExistingData, setIsLoadingExistingData] = useState(false);
console.log('existingVitalSigns:', isLoadingExistingData);
  // Manual input states
  const [manualWeight, setManualWeight] = useState('');
  const [manualHeight, setManualHeight] = useState('');
  const [manualSystolic, setManualSystolic] = useState('');
  const [manualDiastolic, setManualDiastolic] = useState('');
  const [manualPulse, setManualPulse] = useState('');
 // แก้ไข simulateWeightScan ให้มี TTS
const simulateWeightScan = async () => {
  try {
    if (!mainVideoRef.current) return;
    if (mainVideoRef.current.videoWidth === 0 || mainVideoRef.current.videoHeight === 0) return;

    console.log('Starting weight scan at', new Date().toLocaleTimeString());
    setErrorMessage('กำลังประมวลผล...');
    speak('กำลังประมวลผลการชั่งน้ำหนัก รอสักครู่');

    // จับภาพจากกล้องเป็น Blob
    const canvas = document.createElement('canvas');
    canvas.width = mainVideoRef.current.videoWidth;
    canvas.height = mainVideoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(mainVideoRef.current, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.9));
    if (!blob) return;

    const form = new FormData();
    form.append('image', blob, 'weight.jpg');

    console.log('Sending POST to weight scan API:', `${API_BASE_URL}/api/realtime/weight/scan`);
    const res = await axios.post(`${API_BASE_URL}/api/realtime/weight/scan`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('Weight scan API response:', res.data);

    const w = typeof res.data?.weight === 'number' ? res.data.weight : (typeof res.data?.weight?.weight === 'number' ? res.data.weight.weight : null);

    if (typeof w === 'number' && w > 20 && w < 300) {
      setVitalSigns(prev => ({ ...prev, weight: w }));
      setErrorMessage('');
      setScanCount(0);
      setIsCameraOpen(false);
      closeCamera();
      setManualInputMode(false);
      speak(`ชั่งน้ำหนักเสร็จสิ้น น้ำหนัก ${w} กิโลกรัม ไปขั้นตอนถัดไป`);
      setTimeout(() => setCurrentStep('height'), 1500);
      return;
    }

    if (existingVitalSigns?.weight) {
      setVitalSigns(prev => ({ ...prev, weight: existingVitalSigns.weight }));
      setErrorMessage('');
      setScanCount(0);
      setIsCameraOpen(false);
      closeCamera();
      setManualInputMode(false);
      speak(`ชั่งน้ำหนักเสร็จสิ้น น้ำหนัก ${existingVitalSigns.weight} กิโลกรัม ไปขั้นตอนถัดไป`);
      setTimeout(() => setCurrentStep('height'), 1500);
      return;
    }

    setScanCount(5);
    setManualInputMode(true);
    setErrorMessage('ไม่สามารถอ่านน้ำหนักได้ กรุณากรอกด้วยตัวเอง');
    speak('ไม่สามารถอ่านค่าน้ำหนักได้ กรุณากรอกน้ำหนักด้วยตัวเอง');
  } catch (e) {
    console.error('weight scan api error:', e);
    setScanCount(5);
    setManualInputMode(true);
    setErrorMessage('ประมวลผลไม่สำเร็จ กรุณาลองใหม่อีกครั้งหรือกรอกด้วยตัวเอง');
    speak('ประมวลผลไม่สำเร็จ กรุณาลองใหม่อีกครั้งหรือกรอกน้ำหนักด้วยตัวเอง');
  }
};
// ฟังก์ชันเรียก API ความดันจาก backend
const scanBloodPressureViaAPI = async (blob: Blob) => {
  try {
    console.log('Starting blood pressure scan at', new Date().toLocaleTimeString());
    setErrorMessage('กำลังประมวลผล...');
    speak('กำลังประมวลผลการวัดความดันและชีพจร รอสักครู่');
    const form = new FormData();
    form.append('image', blob, 'bp.jpg');
    console.log('Sending POST to BP scan API:', `${API_BASE_URL}/api/realtime/bp/scan`);
    const res = await axios.post(`${API_BASE_URL}/api/realtime/bp/scan`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('BP scan API response:', res.data);
    const { systolic, diastolic, pulse } = res.data || {};
    if (systolic || diastolic || pulse) {
      const updated: any = { ...vitalSigns };
      if (typeof systolic === 'number') updated.systolic = systolic;
      if (typeof diastolic === 'number') updated.diastolic = diastolic;
      if (typeof pulse === 'number') updated.pulse = pulse;
      setVitalSigns(updated);
      setErrorMessage('');
      
      // ตรวจสอบว่าได้ครบทั้ง 3 ค่าหรือยัง
      console.log('Checking BP values:', { 
        systolic: updated.systolic, 
        diastolic: updated.diastolic, 
        pulse: updated.pulse,
        allComplete: !!(updated.systolic && updated.diastolic && updated.pulse)
      });
      
      if (updated.systolic && updated.diastolic && updated.pulse) {
        console.log('All BP values complete, proceeding to symptoms step');
        setScanCount(0);
        setIsCameraOpen(false);
        closeCamera();
        setManualInputMode(false);
        
        // หยุด interval scan ทันที
        if (scanIntervalId.current) {
          clearInterval(scanIntervalId.current as any);
          scanIntervalId.current = null;
        }
        
        speak(`วัดความดันและชีพจรเสร็จสิ้น ความดัน ${updated.systolic}/${updated.diastolic} ชีพจร ${updated.pulse} ไปขั้นตอนถัดไป`);
        setTimeout(() => {
          console.log('Changing to symptoms step');
          setCurrentStep('symptoms');
        }, 2000);
      } else {
        console.log('BP values incomplete, continuing scan');
        speak('พบข้อมูลบางส่วน กำลังสแกนต่อ');
      }
    } else {
      setScanCount(c => c + 1);
      setErrorMessage('ประมวลผลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      speak('ประมวลผลไม่สำเร็จ กำลังลองใหม่');
    }
  } catch (e) {
    console.error('bp scan api error:', e);
    setScanCount(c => c + 1);
    setErrorMessage('ประมวลผลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  }
};
const fetchExistingVitalSigns = async (nationalId: string) => {
  setIsLoadingExistingData(true);
  try {
    // เรียก API เพื่อดึงข้อมูลสัญญาณชีพล่าสุดของผู้ป่วย
    const response = await fetch(`/api/patients/${nationalId}/vital-signs/latest`);
    if (response.ok) {
      const data = await response.json();
      setExistingVitalSigns(data);
      return data;
    }
  } catch (error) {
    console.error('Error fetching existing vital signs:', error);
  } finally {
    setIsLoadingExistingData(false);
  }
  return null;
};
useEffect(() => {
  if (patientData.nationalId && currentStep === 'weight') {
    fetchExistingVitalSigns(patientData.nationalId);
  }
}, [patientData.nationalId, currentStep]);
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
    // ใช้ Speech Recognition แทนการบันทึกเสียง
    startSpeechRecognition();
  };

  const stopRecording = () => {
    // ใช้ Speech Recognition แทน
    stopSpeechRecognition();
  };


  const playRecording = () => {
    if (symptomsText) {
      speak(symptomsText);
    }
  };

  const deleteRecording = () => {
    // ยกเลิก timeout ที่จะเรียก submitSymptoms
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current as any);
      submitTimeoutRef.current = null;
    }
    
    // ยกเลิก countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current as any);
      countdownIntervalRef.current = null;
    }
    setAutoSubmitCountdown(null);
    
    // หยุดการพูดและรีเซ็ตข้อมูล
    stopSpeaking();
    setSymptomsText('');
    symptomsTextRef.current = ''; // รีเซ็ต ref ด้วย
    setErrorMessage('');
    setIsListening(false);
    setIsTranscribing(false);
    
    // แจ้งผู้ใช้
    speak('ได้ลบข้อมูลแล้ว สามารถบันทึกใหม่ได้');
  };

  const submitSymptoms = async () => {
    try {
      if (!patientToken) {
        setErrorMessage('ไม่พบ token กรุณายืนยันตัวตนใหม่');
        return;
      }
      
      // ตรวจสอบว่ามีอาการหรือไม่
      if (!symptomsText || symptomsText.trim() === '') {
        setErrorMessage('กรุณาบันทึกอาการก่อน หรือพิมพ์อาการในช่องข้อความ');
        speak('กรุณาบันทึกอาการก่อน หรือพิมพ์อาการในช่องข้อความ');
        return;
      }
      
      console.log('Submitting symptoms:', symptomsText);
      await saveAndSendVitalSigns(); // บันทึกอาการและ vital_signs ไป backend
      setCurrentStep('qr-code');
    } catch (error) {
      setErrorMessage('ไม่สามารถบันทึกข้อมูลอาการได้');
      console.error('Error submitting symptoms:', error);
    }
  };

  const generateQRData = () => {
    const token = localStorage.getItem('patient_token') || '';
    let queueId = '';
    if (queueInfo && queueInfo._id) {
      queueId = queueInfo._id;
    }
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
    
    // โหลดการตั้งค่าที่บันทึกไว้
    const savedSettings = loadCameraSettings();
    const savedSizeSettings = loadCameraSizeSettings();
    
    // ตั้งค่าขนาดกล้อง
    if (savedSizeSettings) {
      setCameraSize(savedSizeSettings);
    }
    
      if (videoInputs.length > 0) {
      if (savedSettings) {
        const weightCamera = videoInputs.find(d => d.deviceId === savedSettings.mainCameraIdWeight);
        const heightCamera = videoInputs.find(d => d.deviceId === savedSettings.mainCameraIdHeight);
        const bpCamera = videoInputs.find(d => d.deviceId === savedSettings.bpCameraId);
        
        setMainCameraIdWeight(weightCamera?.deviceId || videoInputs[0]?.deviceId || null);
        setMainCameraIdHeight(heightCamera?.deviceId || videoInputs[0]?.deviceId || null);
        setBpCameraId(bpCamera?.deviceId || videoInputs[1]?.deviceId || videoInputs[0]?.deviceId || null);
      } else {
        setMainCameraIdWeight(videoInputs[0]?.deviceId || null);
        setMainCameraIdHeight(videoInputs[0]?.deviceId || null);
        setBpCameraId(videoInputs[1]?.deviceId || videoInputs[0]?.deviceId || null);
      }
      }
    });
  }, []);
useEffect(() => {
  if (mainCameraIdWeight || mainCameraIdHeight || bpCameraId) {
    saveCameraSettings({
      mainCameraIdWeight,
      mainCameraIdHeight,
      bpCameraId
    });
  }
}, [mainCameraIdWeight, mainCameraIdHeight, bpCameraId]);
  // --- useEffect เปิดกล้อง (mainCamera) ---
  useEffect(() => {
    let stream: MediaStream;
    let cancelled = false;
  
  // สำหรับ height step ใช้ main camera
  if (currentStep === 'height' && mainCameraIdHeight) {
      setIsCameraOpen(false);
      navigator.mediaDevices.getUserMedia({
      video: { deviceId: mainCameraIdHeight ? { exact: mainCameraIdHeight } : undefined }
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
  
  // สำหรับ weight step ใช้ main camera สำหรับน้ำหนัก
  else if (currentStep === 'weight' && mainCameraIdWeight) {
    setIsCameraOpen(false);
    navigator.mediaDevices.getUserMedia({
      video: { deviceId: mainCameraIdWeight ? { exact: mainCameraIdWeight } : undefined }
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
        console.error('[Camera] weightCamera error:', err);
      });
  }
  
  // สำหรับ blood-pressure และขั้นตอนที่เกี่ยวข้อง
  else if (['blood-pressure', 'systolic', 'diastolic', 'pulse'].includes(currentStep) && bpCameraId) {
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
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    // ปิดกล้องตามขั้นตอน
    if (currentStep === 'height' || currentStep === 'weight') {
      if (mainVideoRef.current) mainVideoRef.current.srcObject = null;
      setMainStream(null);
    } else if (['blood-pressure', 'systolic', 'diastolic', 'pulse'].includes(currentStep)) {
      if (bpVideoRef.current) bpVideoRef.current.srcObject = null;
      setBpStream(null);
    }
    
      setIsCameraOpen(false);
    };
}, [currentStep, mainCameraIdHeight, mainCameraIdWeight, bpCameraId]);

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
  // ถ้าเป็นน้ำหนัก ใช้ simulateWeightScan แทน
  if (field === 'weight') {
    await simulateWeightScan();
    return;
  }
  
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
  
  if (field === 'height') {
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
      setErrorMessage('กำลังประมวลผล...');
      try {
      const isEngOnly = (field === 'height' || field === 'systolic' || field === 'diastolic' || field === 'pulse');
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
          if (field === 'height') setCurrentStep('systolic');
            else if (field === 'systolic') setCurrentStep('diastolic');
            else if (field === 'diastolic') setCurrentStep('pulse');
            else if (field === 'pulse') setCurrentStep('summary');
          }, 1200);
        } else {
          setErrorMessage('ประมวลผลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        }
      } catch (err) {
        setErrorMessage('ประมวลผลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        console.error(`[OCR] Field: ${field} | OCR error:`, err);
      }
    }, 'image/jpeg', 0.8);
  };

  const ocrImageBlob = async (blob: Blob, lang: string = 'eng'): Promise<string[]> => {
    console.log('Starting OCR scan at', new Date().toLocaleTimeString());
    const formData = new FormData();
    formData.append('image', blob, 'ocr.jpg');
    formData.append('lang', lang);
    console.log('Sending POST to OCR API:', `${API_BASE_URL}/api/realtime/ocr/scan`);
    const res = await axios.post(`${API_BASE_URL}/api/realtime/ocr/scan`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('OCR API response:', res.data);
    return res.data.text;
  };

  const saveAndSendVitalSigns = async () => {
    if (!patientToken) {
      setErrorMessage('ไม่พบ token กรุณายืนยันตัวตนใหม่');
      return;
    }
    try {
      console.log('=== SENDING TO BACKEND ===');
      console.log('vital_signs:', vitalSigns);
      console.log('symptoms (raw):', symptomsText);
      console.log('symptoms (length):', symptomsText.length);
      console.log('symptoms (trimmed):', symptomsText.trim());
      console.log('symptoms (trimmed length):', symptomsText.trim().length);
      
      const payload = {
        vital_signs: vitalSigns,
        symptoms: symptomsText.trim()
      };
      
      console.log('Final payload:', payload);
      
      const res = await axios.post(
        `${API_BASE_URL}/api/queue/queue`,
        payload,
        { headers: { Authorization: `Bearer ${patientToken}` } }
      );
      
      console.log('Backend response:', res.data);
      
      const queueId = res.data._id;
      const queueResponse = await axios.get(
        `${API_BASE_URL}/api/queue/queue/${queueId}`,
        { headers: { Authorization: `Bearer ${patientToken}` } }
      );
      setQueueInfo(queueResponse.data.queue); // <-- สำคัญ!
      console.log('Queue info:', queueResponse.data.queue);
    } catch (error) {
      console.error('Error saving vital signs:', error);
      setErrorMessage('บันทึกข้อมูลหรือดึงคิวล้มเหลว');
    }
  };

  // Speech Recognition ทำงานใน callback แล้ว ไม่ต้องใช้ useEffect กับ audioBlob อีก

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
    if (scanIntervalId.current) clearInterval(scanIntervalId.current as any);
  };

const scan = async (field: 'weight' | 'height' | 'blood-pressure') => {
  console.log(`Starting scan for ${field} at ${new Date().toLocaleTimeString()}`);
  
  // ถ้าเป็นน้ำหนัก ใช้ simulateWeightScan
  if (field === 'weight') {
    await simulateWeightScan();
    return;
  }
  
  // เพิ่มการตรวจสอบสำหรับความดัน - หยุดสแกนถ้าได้ครบแล้ว
  if (field === 'blood-pressure' && vitalSigns.systolic && vitalSigns.diastolic && vitalSigns.pulse) {
    console.log('Blood pressure values already complete, stopping scan');
    return;
  }
  
  const videoRef = (field === 'height') ? mainVideoRef : bpVideoRef;
    if (!videoRef.current) return;
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;
  
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
  
  if (field === 'height') {
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
    
    // เพิ่มการตรวจสอบอีกครั้งใน callback
    if (field === 'blood-pressure' && vitalSigns.systolic && vitalSigns.diastolic && vitalSigns.pulse) {
      console.log('Blood pressure values already complete in callback, skipping OCR');
      return;
    }
    
    // หากเป็นความดัน ใช้ API แล้วออกเลย
    if (field === 'blood-pressure') {
      await scanBloodPressureViaAPI(blob);
      return;
    }

    // เพิ่ม TTS สำหรับแต่ละขั้นตอน (ส่วนสูง)
    if (field === 'height') {
      setErrorMessage('กำลังประมวลผล...');
      speak('กำลังประมวลผลการวัดส่วนสูง รอสักครู่');
    }
    
    try {
      const isEngOnly = (field === 'height' || field === 'blood-pressure');
        const lang = isEngOnly ? 'eng' : 'eng+tha';
        const ocrTexts = await ocrImageBlob(blob, lang);
        const ocrText = ocrTexts.join(' ');
        const numberPattern = /\d{1,3}(\.\d+)?/g;
        const matches = ocrText.match(numberPattern);
      
        if (matches && matches.length > 0) {
          if (field === 'height') {
            // เลือกค่าที่มากที่สุด
            const nums = matches.map(Number).filter(n => !isNaN(n));
            const highest = Math.max(...nums);
          const value = highest.toString();
          
          if (highest < 100 || highest > 250) {
            setErrorMessage('ประมวลผลไม่สำเร็จ ค่าไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
            setScanCount(c => c + 1);
            speak(`ค่าที่อ่านได้ไม่ถูกต้อง ${value} กำลังลองใหม่`);
            return;
          }
          
          setVitalSigns(prev => ({ ...prev, height: highest }));
          setErrorMessage('');
          setScanCount(0);
          setIsCameraOpen(false);
          closeCamera();
          setManualInputMode(false);
          
          speak(`วัดส่วนสูงเสร็จสิ้น ส่วนสูง ${highest} เซนติเมตร ไปขั้นตอนถัดไป`);
          setTimeout(() => setCurrentStep('blood-pressure'), 7500);
          
        } else if (field === 'blood-pressure') {
          // ตรวจสอบอีกครั้งก่อนประมวลผล
          if (vitalSigns.systolic && vitalSigns.diastolic && vitalSigns.pulse) {
            console.log('Values already complete, skipping processing');
            return;
          }
          
          // สำหรับความดัน พยายามหาทั้ง 3 ค่า
          const nums = matches.map(Number).filter(n => !isNaN(n));
          
          // หาค่าความดันตัวบน (80-200)
          const systolicCandidates = nums.filter(n => n >= 80 && n <= 200);
          // หาค่าความดันตัวล่าง (50-120)
          const diastolicCandidates = nums.filter(n => n >= 50 && n <= 120);
          // หาค่าชีพจร (40-150)
          const pulseCandidates = nums.filter(n => n >= 40 && n <= 150);
          
          let updatedVitalSigns = { ...vitalSigns };
          let foundAny = false;
          
          if (systolicCandidates.length > 0 && !vitalSigns.systolic) {
            updatedVitalSigns.systolic = Math.max(...systolicCandidates);
            foundAny = true;
          }
          
          if (diastolicCandidates.length > 0 && !vitalSigns.diastolic) {
            updatedVitalSigns.diastolic = Math.max(...diastolicCandidates);
            foundAny = true;
          }
          
          if (pulseCandidates.length > 0 && !vitalSigns.pulse) {
            updatedVitalSigns.pulse = Math.max(...pulseCandidates);
            foundAny = true;
          }
          
          if (foundAny) {
            setVitalSigns(updatedVitalSigns);
            setErrorMessage('');
            
            // ตรวจสอบว่าได้ครบทั้ง 3 ค่าหรือยัง
            console.log('OCR - Checking BP values:', { 
              systolic: updatedVitalSigns.systolic, 
              diastolic: updatedVitalSigns.diastolic, 
              pulse: updatedVitalSigns.pulse,
              allComplete: !!(updatedVitalSigns.systolic && updatedVitalSigns.diastolic && updatedVitalSigns.pulse)
            });
            
            if (updatedVitalSigns.systolic && updatedVitalSigns.diastolic && updatedVitalSigns.pulse) {
              console.log('OCR - All BP values complete, proceeding to symptoms step');
              setScanCount(0);
              setIsCameraOpen(false);
              closeCamera();
              setManualInputMode(false);
              
              // หยุด interval scan ทันที
              if (scanIntervalId.current) {
                clearInterval(scanIntervalId.current as any);
                scanIntervalId.current = null;
              }
              
              speak(`วัดความดันและชีพจรเสร็จสิ้น ความดัน ${updatedVitalSigns.systolic}/${updatedVitalSigns.diastolic} ชีพจร ${updatedVitalSigns.pulse} ไปขั้นตอนถัดไป`);
              setTimeout(() => {
                console.log('OCR - Changing to symptoms step');
                setCurrentStep('symptoms');
              }, 2000);
            } else {
              console.log('OCR - BP values incomplete, continuing scan');
              speak('พบข้อมูลบางส่วน กำลังสแกนต่อ');
            }
          } else {
            setScanCount(c => c + 1);
            setErrorMessage('ประมวลผลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
            speak('ไม่พบข้อมูล กำลังลองใหม่');
          }
        }
        } else {
          setScanCount(c => c + 1);
          setErrorMessage('ประมวลผลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        speak('ไม่พบข้อมูล กำลังลองใหม่');
        }
      } catch (err) {
        setErrorMessage('ประมวลผลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        console.error(`[OCR] Field: ${field} | OCR error:`, err);
      }
    }, 'image/jpeg', 0.8);
  };
  useEffect(() => {
    if (isCameraOpen) {
    let field: 'weight' | 'height' | 'blood-pressure';
    
    if (currentStep === 'weight') {
      field = 'weight';
    } else if (currentStep === 'height') {
      field = 'height';
    } else if (['blood-pressure', 'systolic', 'diastolic', 'pulse'].includes(currentStep)) {
      field = 'blood-pressure';
    } else {
      return; // ไม่ใช่ขั้นตอนที่ต้องสแกน
    }
    
    // ทำ scan ทันทีครั้งแรก
    scan(field);
    
    // ตั้ง interval scan ทุก 8 วินาที
    scanIntervalId.current = setInterval(() => {
      console.log(`Auto scanning ${field} at ${new Date().toLocaleTimeString()}`);
      scan(field);
    }, 8000);
    }
  
    return () => {
    if (scanIntervalId.current) {
      clearInterval(scanIntervalId.current as any);
    }
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
      
      {/* Cache Management Section */}
      <div className="border-b pb-4 mb-4">
        <h4 className="font-semibold text-sm mb-2 text-blue-600">Cache Management</h4>
        <div className="space-y-2">
          <button
            onClick={clearPatientCache}
            className="w-full bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 text-xs"
          >
            🔄 Clear Patient Cache
          </button>
          <button
            onClick={resetAllData}
            className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600 text-xs"
          >
            🗑️ Reset All Data
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          <p>Patient: {patientData.name}</p>
          <p>ID: {patientData.nationalId}</p>
          <p>Token: {patientToken ? '✅ มี' : '❌ ไม่มี'}</p>
          <p>Token (first 10): {patientToken ? patientToken.substring(0, 10) + '...' : 'N/A'}</p>
        </div>
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
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        <button
          className="bg-gray-700 text-white px-4 py-2 rounded shadow-lg hover:bg-gray-800"
          onClick={() => setShowCameraSettings(v => !v)}
        >
          {showCameraSettings ? 'ปิดการตั้งค่ากล้อง' : 'ตั้งค่ากล้อง'}
        </button>
        <button
          className={`px-4 py-2 rounded shadow-lg transition-colors ${
            isNarratorEnabled 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
          onClick={() => setIsNarratorEnabled(!isNarratorEnabled)}
        >
          {isNarratorEnabled ? '🔊 ปิดเสียง' : '🔇 เปิดเสียง'}
        </button>
      </div>
      {showCameraSettings && (
        <div className="fixed bottom-16 right-4 z-50 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-6 w-80 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">ตั้งค่ากล้อง</h3>
            <button
              onClick={() => setShowCameraSettings(false)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1 text-gray-800">เลือกกล้องสำหรับน้ำหนัก</label>
            <select
              value={mainCameraIdWeight || ''}
            onChange={e => {
              setMainCameraIdWeight(e.target.value);
              // บันทึกทันทีเมื่อเปลี่ยน
              saveCameraSettings({
                mainCameraIdWeight: e.target.value,
                mainCameraIdHeight,
                bpCameraId
              });
            }}
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
            onChange={e => {
              setMainCameraIdHeight(e.target.value);
              // บันทึกทันทีเมื่อเปลี่ยน
              saveCameraSettings({
                mainCameraIdWeight,
                mainCameraIdHeight: e.target.value,
                bpCameraId
              });
            }}
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
            <label className="block font-medium mb-1 text-gray-800">เลือกกล้องสำหรับความดัน/ชีพจร</label>
            <select
              value={bpCameraId || ''}
            onChange={e => {
              setBpCameraId(e.target.value);
              // บันทึกทันทีเมื่อเปลี่ยน
              saveCameraSettings({
                mainCameraIdWeight,
                mainCameraIdHeight,
                bpCameraId: e.target.value
              });
            }}
              className="p-2 border rounded w-full"
            >
              {videoDevices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1} (${device.deviceId.slice(-4)})`}
                </option>
              ))}
            </select>
          </div>
        
        {/* เพิ่มปุ่มรีเซ็ตการตั้งค่า */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              // รีเซ็ตเป็นค่าเริ่มต้น
              if (videoDevices.length > 0) {
                const defaultWeight = videoDevices[0]?.deviceId || null;
                const defaultHeight = videoDevices[0]?.deviceId || null;
                const defaultBp = videoDevices[1]?.deviceId || videoDevices[0]?.deviceId || null;
                
                setMainCameraIdWeight(defaultWeight);
                setMainCameraIdHeight(defaultHeight);
                setBpCameraId(defaultBp);
                
                // ลบการตั้งค่าจาก localStorage
                localStorage.removeItem(CAMERASETTINGS_KEY);
              }
            }}
            className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium"
          >
            รีเซ็ตการตั้งค่า
          </button>
        </div>
        
        {/* แสดงสถานะการบันทึก */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          การตั้งค่าจะถูกบันทึกอัตโนมัติ
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
              <li>ระบบจะแนะนำก่อนเริ่มบันทึก</li>
              <li>บันทึกเสียงไม่เกิน 10 วินาที</li>
              <li>หรือพิมพ์อาการในช่องข้อความ</li>
            </ul>
          </div>
        </div>
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">บันทึกอาการของท่าน</h2>
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">บันทึกเสียง</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                {!isListening && !symptomsText && (
                  <div className="text-center">
                    <button
                      onClick={startRecording}
                      className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-medium text-lg transition-colors flex items-center mx-auto"
                    >
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      เริ่มบันทึกเสียง (Speech Recognition)
                    </button>
                    <p className="text-sm text-gray-500 mt-2">กดเพื่อเริ่มบันทึกเสียง</p>
                  </div>
                )}
                {isListening && (
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse mr-3"></div>
                      <span className="text-lg font-medium text-red-600">กำลังฟัง... กรุณาพูดอาการของท่าน</span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-full font-medium text-lg transition-colors"
                    >
                      หยุดฟัง
                    </button>
                  </div>
                )}
                {symptomsText && !isListening && (
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
                        onClick={() => {
                          speak('กรุณาบอกอาการหลังจากเสียงสัญญาณ ระบบจะเปิดไมโครโฟนให้ 10 วินาที');
                          setTimeout(() => {
                            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                            const oscillator = audioContext.createOscillator();
                            const gainNode = audioContext.createGain();
                            
                            oscillator.connect(gainNode);
                            gainNode.connect(audioContext.destination);
                            
                            oscillator.frequency.value = 800;
                            gainNode.gain.value = 0.3;
                            
                            oscillator.start();
                            oscillator.stop(audioContext.currentTime + 0.5);
                            
                            setTimeout(() => {
                              startRecording();
                            }, 500);
                          }, 3000);
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        บันทึกใหม่
                      </button>
                    </div>
   <p className="text-sm text-gray-500 mt-2">บันทึกเสร็จแล้ว</p>
   
   {/* แสดง Auto-submit countdown */}
   {autoSubmitCountdown && autoSubmitCountdown > 0 && (
     <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
       <p className="text-blue-800 font-medium">
         ระบบจะดำเนินการต่ออัตโนมัติใน {autoSubmitCountdown} วินาที
       </p>
       <button
         onClick={() => {
           // ยกเลิก auto-submit
           if (submitTimeoutRef.current) {
             clearTimeout(submitTimeoutRef.current as any);
             submitTimeoutRef.current = null;
           }
           if (countdownIntervalRef.current) {
             clearInterval(countdownIntervalRef.current as any);
             countdownIntervalRef.current = null;
           }
           setAutoSubmitCountdown(null);
           speak('ยกเลิกการดำเนินการอัตโนมัติแล้ว');
         }}
         className="mt-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
       >
         ยกเลิกอัตโนมัติ
       </button>
     </div>
   )}
                  </div>
                )}
              </div>
            </div>
            
            {/* แสดงข้อความที่แปลงได้ */}
            {symptomsText && (
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-800 mb-4">ข้อความที่แปลงได้</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-gray-800">{symptomsText}</p>
                  <div className="flex justify-center space-x-4 mt-4">
                    <button
                      onClick={() => {
                        speak(`ระบบได้ยินว่าคุณบอกอาการว่า ${symptomsText} ถูกต้องหรือไม่`);
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M6.343 6.343a8 8 0 000 11.314m2.829-9.9a5 5 0 000 7.072M9 9h6l-3-3v6" />
                      </svg>
                      ฟังข้อความ
                    </button>
                    <button
                      onClick={deleteRecording}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      ลบและบันทึกใหม่
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ส่วนพิมพ์ข้อความ */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">หรือพิมพ์อาการ</h3>
              <textarea
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                placeholder="พิมพ์อาการที่รู้สึกได้ที่นี่..."
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            {/* ปุ่มยืนยัน */}
            {symptomsText.trim() && !isListening && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                อาการที่บันทึก: "{symptomsText}" (ความยาว: {symptomsText.length} ตัวอักษร)
              </p>
              <button
                onClick={() => {
                  // ยกเลิก timeout ที่มีอยู่ก่อน
                  if (submitTimeoutRef.current) {
                    clearTimeout(submitTimeoutRef.current as any);
                    submitTimeoutRef.current = null;
                  }
                  
                  // ยกเลิก countdown
                  if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current as any);
                    countdownIntervalRef.current = null;
                  }
                  setAutoSubmitCountdown(null);
                  
                  console.log('Manual submit - symptoms:', symptomsText);
                  submitSymptoms();
                }}
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors flex items-center mx-auto"
                >
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ยืนยันและดำเนินการต่อ
              </button>
              </div>
            )}

            {/* แสดงข้อผิดพลาด */}
            {errorMessage && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {errorMessage}
            </div>
            )}
            
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'weight') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
      <div className="w-1/4 bg-white/10 backdrop-blur-sm p-6 flex flex-col justify-center">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                           </svg>
            </div>
          <h1 className="text-2xl font-bold text-white mb-2">สแกนน้ำหนัก</h1>
          <p className="text-white/80">ขั้นตอนที่ 1 จาก 3</p>
          </div>
        <div className="bg-white/20 rounded-xl p-4 mb-4">
          <h3 className="text-white font-semibold mb-2">ข้อมูลผู้ป่วย</h3>
          <div className="space-y-1 text-white/80 text-sm">
              <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
              <p><span className="font-medium">เลขประจำตัวประชาชน:</span> {patientData.nationalId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</p>
            </div>
          </div>
        <div className="bg-white/20 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-2">คำแนะนำ</h3>
          <ul className="space-y-1 text-white/80 text-sm list-disc list-inside">
              <li>ยืนตรงบนเครื่องชั่งน้ำหนัก</li>
              <li>ถอดรองเท้าและของที่มีน้ำหนักออก</li>
              <li>ยืนนิ่งๆ จนกว่าระบบจะวัดเสร็จ</li>
            </ul>
          </div>
          </div>
      <div className="w-3/4 p-6 flex flex-col items-center justify-center">
          <CameraSelector />
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-5xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">กำลังสแกนน้ำหนัก</h2>
            <div className="mb-4 text-center">
              {!isCameraOpen ? (
              <div className="text-gray-500 h-96 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                กำลังเปิดกล้อง...
              </div>
            ) : (
              <div className="flex justify-center">
                <video 
                  ref={mainVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="border-2 border-gray-300 rounded-lg shadow-lg"
                  style={{
                    width: `${cameraSize.weight.width}px`,
                    height: `${cameraSize.weight.height}px`,
                    maxWidth: '100%',
                    maxHeight: '70vh'
                  }}
                />
              </div>
              )}
              <div className="text-sm text-gray-500 mt-2">กำลังสแกนอัตโนมัติทุก 8 วินาที...</div>
            </div>
          {errorMessage && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{errorMessage}</div>}
          <div className="text-center text-xl">น้ำหนักที่ได้: <span className="font-bold text-blue-600">{vitalSigns.weight ?? '-'}</span> กก.</div>
            
            {/* ปุ่มกรอกข้อมูลโดยตรง */}
            <div className="mt-4 flex flex-col items-center">
              <button
                onClick={() => setManualInputMode(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
              >
                กรอกข้อมูลด้วยตัวเอง
              </button>
            </div>
            
            {(scanCount >= 5 || manualInputMode) && (
              <div className="mt-4 flex flex-col items-center">
                <label className="mb-1 text-gray-700">กรอกข้อมูลด้วยตัวเอง:</label>
                <input type="number" className="p-2 border rounded w-40 text-center" placeholder="กรอกน้ำหนัก (กก.)" value={manualWeight} onChange={e => setManualWeight(e.target.value)} />
                <div className="flex space-x-2 mt-2">
                  <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={() => {
                    const w = parseFloat(manualWeight);
                    if (w > 20 && w < 200) {
                      setVitalSigns(prev => ({ ...prev, weight: w }));
                      setManualWeight('');
                      setManualInputMode(false);
                      setTimeout(() => setCurrentStep('height'), 800);
                    } else {
                      setErrorMessage('กรุณากรอกน้ำหนักให้ถูกต้อง');
                    }
                  }}>ยืนยันน้ำหนัก</button>
                  <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600" onClick={() => {
                    setManualInputMode(false);
                    setManualWeight('');
                  }}>ยกเลิก</button>
                </div>
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
            
            {/* ปุ่มกรอกข้อมูลโดยตรง */}
            <div className="mt-4 flex flex-col items-center">
              <button
                onClick={() => setManualInputMode(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
              >
                กรอกข้อมูลด้วยตัวเอง
              </button>
            </div>
            
            {(scanCount >= 5 || manualInputMode) && (
              <div className="mt-4 flex flex-col items-center">
                <label className="mb-1 text-gray-700">กรอกข้อมูลด้วยตัวเอง:</label>
                <input type="number" className="p-2 border rounded w-40 text-center" placeholder="กรอกส่วนสูง (ซม.)" value={manualHeight} onChange={e => setManualHeight(e.target.value)} />
                <div className="flex space-x-2 mt-2">
                  <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={() => {
                    const h = parseFloat(manualHeight);
                    if (h > 100 && h < 250) {
                      setVitalSigns(prev => ({ ...prev, height: h }));
                      setManualHeight('');
                      setManualInputMode(false);
                      setTimeout(() => setCurrentStep('blood-pressure'), 800);
                    } else {
                      setErrorMessage('กรุณากรอกส่วนสูงให้ถูกต้อง');
                    }
                  }}>ยืนยันส่วนสูง</button>
                  <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600" onClick={() => {
                    setManualInputMode(false);
                    setManualHeight('');
                  }}>ยกเลิก</button>
                </div>
              </div>
            )}
          </div>
        </div>
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
      </div>
    );
  }
if (currentStep === 'blood-pressure') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          <h1 className="text-3xl font-bold text-white mb-4">วัดความดันและชีพจร</h1>
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
            <li>ระบบจะวัดความดันและชีพจรพร้อมกัน</li>
            </ul>
          </div>
          <div className="text-center mt-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      onClick={() => scan('blood-pressure')}
            >
            สแกนความดันและชีพจร
            </button>
          </div>
        </div>
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <CameraSelector />
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">กำลังวัดความดันโลหิตและชีพจร</h2>
            <div className="mb-4 text-center">
              {!isCameraOpen ? (
                <div className="text-gray-500">กำลังเปิดกล้อง...</div>
              ) : (
              <video 
                ref={bpVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full object-cover mb-2" 
                style={{ 
                  width: `${cameraSize.bp.width}px`, 
                  height: `${cameraSize.bp.height}px`,
                  maxWidth: '100%'
                }}
              />
              )}
              <div className="text-sm text-gray-500 mt-2">กำลังสแกนอัตโนมัติทุก 8 วินาที...</div>
            </div>
            {errorMessage && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{errorMessage}</div>}
          
          {/* แสดงผลทั้ง 3 ค่าพร้อมกัน */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-1">ความดันตัวบน</p>
              <p className="text-2xl font-bold text-blue-600">{vitalSigns.systolic ?? '-'}</p>
              <p className="text-xs text-gray-500">mmHg</p>
              </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-1">ความดันตัวล่าง</p>
              <p className="text-2xl font-bold text-green-600">{vitalSigns.diastolic ?? '-'}</p>
              <p className="text-xs text-gray-500">mmHg</p>
          </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-1">ชีพจร</p>
              <p className="text-2xl font-bold text-red-600">{vitalSigns.pulse ?? '-'}</p>
              <p className="text-xs text-gray-500">bpm</p>
        </div>
      </div>
      
      {/* ปุ่มกรอกข้อมูลโดยตรง */}
      <div className="mt-4 flex flex-col items-center">
        <button
          onClick={() => setManualInputMode(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
        >
          กรอกข้อมูลด้วยตัวเอง
        </button>
      </div>

          {(scanCount >= 5 || manualInputMode) && (
            <div className="mt-4 space-y-4">
              <div className="text-center text-gray-700 font-medium">กรอกข้อมูลด้วยตัวเอง:</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center">
                  <label className="mb-1 text-sm text-gray-600">ความดันตัวบน</label>
                  <input 
                    type="number" 
                    className="p-2 border rounded w-full text-center" 
                    placeholder="mmHg" 
                    value={manualSystolic} 
                    onChange={e => setManualSystolic(e.target.value)} 
                  />
            </div>
                <div className="flex flex-col items-center">
                  <label className="mb-1 text-sm text-gray-600">ความดันตัวล่าง</label>
                  <input 
                    type="number" 
                    className="p-2 border rounded w-full text-center" 
                    placeholder="mmHg" 
                    value={manualDiastolic} 
                    onChange={e => setManualDiastolic(e.target.value)} 
                  />
          </div>
                <div className="flex flex-col items-center">
                  <label className="mb-1 text-sm text-gray-600">ชีพจร</label>
                  <input 
                    type="number" 
                    className="p-2 border rounded w-full text-center" 
                    placeholder="bpm" 
                    value={manualPulse} 
                    onChange={e => setManualPulse(e.target.value)} 
                  />
            </div>
          </div>
              <div className="text-center flex justify-center space-x-2">
            <button
                  className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600" 
                  onClick={() => {
                    const s = parseInt(manualSystolic);
                  const d = parseInt(manualDiastolic);
                    const p = parseInt(manualPulse);
                    
                    let hasError = false;
                    let errorMsg = '';
                    
                    if (manualSystolic && (s <= 80 || s >= 200)) {
                      hasError = true;
                      errorMsg = 'กรุณากรอกค่าความดันตัวบนให้ถูกต้อง (80-200)';
                    } else if (manualDiastolic && (d <= 50 || d >= 120)) {
                      hasError = true;
                      errorMsg = 'กรุณากรอกค่าความดันตัวล่างให้ถูกต้อง (50-120)';
                    } else if (manualPulse && (p <= 40 || p >= 150)) {
                      hasError = true;
                      errorMsg = 'กรุณากรอกค่าชีพจรให้ถูกต้อง (40-150)';
                    }
                    
                    if (hasError) {
                      setErrorMessage(errorMsg);
                      return;
                    }
                    
                    // อัพเดทค่าที่กรอก
                    setVitalSigns(prev => ({
                      ...prev,
                      ...(manualSystolic && { systolic: s }),
                      ...(manualDiastolic && { diastolic: d }),
                      ...(manualPulse && { pulse: p })
                    }));
                    
                    // เคลียร์ input
                    setManualSystolic('');
                    setManualDiastolic('');
                    setManualPulse('');
                    setManualInputMode(false);
                    
                    // ไปขั้นตอนถัดไป
                    console.log('Manual input complete, changing to summary step');
                    setTimeout(() => {
                      console.log('Setting current step to summary');
                      setCurrentStep('summary');
                    }, 800);
                  }}
                >
                  ยืนยันข้อมูล
              </button>
              <button
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                onClick={() => {
                  setManualInputMode(false);
                  setManualSystolic('');
                  setManualDiastolic('');
                  setManualPulse('');
                }}
              >
                ยกเลิก
              </button>
            </div>
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
    console.log('Rendering summary step with vital signs:', vitalSigns);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex">
        <div className="w-1/3 bg-white/10 backdrop-blur-sm p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">ตรวจสอบข้อมูล</h1>
            <p className="text-white/80 text-lg">กรุณาตรวจสอบข้อมูลสัญญาณชีพ</p>
          </div>
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">ข้อมูลผู้ป่วย</h3>
            <div className="space-y-2 text-white/80">
              <p><span className="font-medium">ชื่อ:</span> {patientData.name}</p>
              <p><span className="font-medium">เลขประจำตัวประชาชน:</span> {patientData.nationalId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}</p>
            </div>
          </div>
        </div>
        <div className="w-2/3 p-8 flex flex-col items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-4xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">ข้อมูลสัญญาณชีพของท่าน</h2>
            
            {/* แสดงข้อมูลสัญญาณชีพ */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">น้ำหนักและส่วนสูง</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">น้ำหนัก:</span>
                    <span className="font-bold text-blue-600">{vitalSigns.weight ?? '-'} กก.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ส่วนสูง:</span>
                    <span className="font-bold text-blue-600">{vitalSigns.height ?? '-'} ซม.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">BMI:</span>
                    <span className="font-bold text-blue-600">{vitalSigns.bmi ?? '-'}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">ความดันและชีพจร</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ความดันตัวบน:</span>
                    <span className="font-bold text-green-600">{vitalSigns.systolic ?? '-'} mmHg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ความดันตัวล่าง:</span>
                    <span className="font-bold text-green-600">{vitalSigns.diastolic ?? '-'} mmHg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ชีพจร:</span>
                    <span className="font-bold text-green-600">{vitalSigns.pulse ?? '-'} bpm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ปุ่มแก้ไขและยืนยัน */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setCurrentStep('blood-pressure')}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                แก้ไขข้อมูล
              </button>
              <button
                onClick={() => setCurrentStep('symptoms')}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                ยืนยันและดำเนินการต่อ
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
                onClick={() => navigate('/Screening/AuthenPatient2')}
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