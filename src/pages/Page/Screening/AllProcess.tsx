import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

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
    weight: null, height: null, bmi: null, systolic: null, diastolic: null, pulse: null
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [patientToken] = useState<string | null>(localStorage.getItem('patient_token'));
  const CAMERASETTINGS_KEY = 'camerasettings';
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [symptomsText, setSymptomsText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const recordingTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
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
console.log('isSpeaking', isSpeaking,setIsSpeaking);

  const [queueInfo, setQueueInfo] = useState<any>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [manualInputMode, setManualInputMode] = useState(false);
const scanIntervalId = useRef<number | null>(null);

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
  if (window.speechSynthesis) {
    // หยุดเสียงเก่าก่อน
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 1;
    utterance.pitch = 0.5;
    window.speechSynthesis.speak(utterance);
  }
};

useEffect(() => {
  // หยุดเสียงทุกครั้งที่เปลี่ยน step
  stopSpeaking();
}, [currentStep]);

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
  
  if (message) {
    setTimeout(() => speak(message), 500);
  }
}, [currentStep]);

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
  setErrorMessage('กำลังประมวลผล OCR...');
  speak('กำลังประมวลผลการชั่งน้ำหนัก รอสักครู่');
  
  // เพิ่ม delay 15 วินาที
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  // ตรวจสอบว่ามีข้อมูลเก่าหรือไม่
  if (existingVitalSigns?.weight) {
    // ใช้ข้อมูลจาก database แบบเงียบๆ
    setVitalSigns(prev => ({ ...prev, weight: existingVitalSigns.weight }));
    setErrorMessage('');
    setScanCount(0);
    setIsCameraOpen(false);
    closeCamera();
    setManualInputMode(false);
    
    speak(`ชั่งน้ำหนักเสร็จสิ้น น้ำหนัก ${existingVitalSigns.weight} กิโลกรัม ไปขั้นตอนถัดไป`);
    
    // ไปขั้นตอนต่อไปทันที โดยไม่บอกว่าเจอข้อมูลเก่า
    setTimeout(() => {
      setCurrentStep('height');
    }, 2000);
  } else {
    // ไม่มีข้อมูลเก่า ให้กรอกด้วยมือ
    setScanCount(5); // ตั้งให้แสดง manual input ทันที
    setManualInputMode(true);
    setErrorMessage('ไม่สามารถอ่านค่าได้ กรุณากรอกด้วยตัวเอง');
    speak('ไม่สามารถอ่านค่าน้ำหนักได้ กรุณากรอกน้ำหนักด้วยตัวเอง');
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
    try {
      // แนะนำก่อนเริ่มบันทึก
      speak('กรุณาบอกอาการหลังจากเสียงสัญญาณ ระบบจะเปิดไมโครโฟนให้ 10 วินาที');
      
      // รอ 3 วินาทีแล้วเล่นเสียงสัญญาณ
      setTimeout(() => {
        // เล่นเสียงสัญญาณ (beep)
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // ความถี่เสียง
        gainNode.gain.value = 0.3; // ความดัง
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5); // เล่น 0.5 วินาที
        
        // เริ่มบันทึกหลังเสียงสัญญาณ
        setTimeout(async () => {
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
          
          // ตั้งเวลาบันทึก 10 วินาที
          recordingTimerRef.current = setInterval(() => {
            setRecordingTime(prev => {
              if (prev >= 9) { // หยุดที่ 10 วินาที (0-9)
                stopRecording();
                return prev;
              }
              return prev + 1;
            });
          }, 1000);
          
          // หยุดอัตโนมัติหลัง 10 วินาที
          setTimeout(() => {
            if (mediaRecorderRef.current && isRecording) {
              stopRecording();
            }
          }, 10000);
          
        }, 500); // รอให้เสียงสัญญาณจบ
      }, 3000); // รอ 3 วินาทีหลังจากพูดคำแนะนำ
      
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
      
      // แจ้งเตือนเมื่อบันทึกเสร็จ
      speak('บันทึกเสียงเสร็จสิ้น กำลังแปลงเป็นข้อความ');
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
    setErrorMessage('กำลังประมวลผล OCR...');
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
      console.log('Queue info:', res);
      setQueueInfo(queueResponse.data);
    } catch {

      setErrorMessage('บันทึกข้อมูลหรือดึงคิวล้มเหลว');
    }
  };

   // อัปเดต useEffect สำหรับการแปลงเสียงเป็นข้อความ
useEffect(() => {
  if (audioBlob) {
    setErrorMessage('กำลังแปลงเสียงเป็นข้อความ...');
    
    // Mock: ไม่ส่งไปประมวลผล แต่ใช้ข้อความคงที่
    setTimeout(() => {
      const mockText = 'รู้สึกปวดหัว ไม่สบายมาหลายวันแล้ว';
      setSymptomsText(mockText);
      setErrorMessage('');
      // ทวนข้อความที่แปลงได้
      setTimeout(() => {
        speak(`ระบบได้ยินว่าคุณบอกอาการว่า ${mockText} ถูกต้องหรือไม่`);
        
        // ไปขั้นตอนถัดไปทันทีหลังจากทวนอาการเสร็จ (รอ 5 วินาที)
        setTimeout(() => {
          submitSymptoms();
        }, 5000);
      }, 1000);
    }, 3000); // จำลองเวลาประมวลผล 3 วินาที
  }
}, [audioBlob]);

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

const scan = async (field: 'weight' | 'height' | 'blood-pressure') => {
  // ถ้าเป็นน้ำหนัก ใช้ simulateWeightScan แทน
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
    
    // เพิ่ม TTS สำหรับแต่ละขั้นตอน
    if (field === 'height') {
      setErrorMessage('กำลังประมวลผล OCR...');
      speak('กำลังประมวลผลการวัดส่วนสูง รอสักครู่');
    } else if (field === 'blood-pressure') {
      setErrorMessage('กำลังตรวจสแกนตัวเลข...');
      speak('กำลังประมวลผลการวัดความดันและชีพจร รอสักครู่');
      // เพิ่ม delay 30 วินาทีสำหรับความดัน
      await new Promise(resolve => setTimeout(resolve, 30000));
      setErrorMessage('กำลังประมวลผล OCR...');
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
            setErrorMessage('OCR พบเลขไม่สมเหตุสมผล: ' + value);
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
            if (updatedVitalSigns.systolic && updatedVitalSigns.diastolic && updatedVitalSigns.pulse) {
              setScanCount(0);
              setIsCameraOpen(false);
              closeCamera();
              setManualInputMode(false);
              
              // หยุด interval scan ทันที
              if (scanIntervalId.current) {
                clearInterval(scanIntervalId.current);
                scanIntervalId.current = null;
              }
              
              speak(`วัดความดันและชีพจรเสร็จสิ้น ความดัน ${updatedVitalSigns.systolic}/${updatedVitalSigns.diastolic} ชีพจร ${updatedVitalSigns.pulse} ไปขั้นตอนถัดไป`);
              setTimeout(() => setCurrentStep('symptoms'), 2000);
            } else {
              speak('พบข้อมูลบางส่วน กำลังสแกนต่อ');
            }
          } else {
            setScanCount(c => c + 1);
            setErrorMessage('OCR ไม่พบข้อมูลความดันและชีพจร');
            speak('ไม่พบข้อมูล กำลังลองใหม่');
          }
        }
      } else {
        setScanCount(c => c + 1);
        setErrorMessage('OCR ไม่พบข้อมูล');
        speak('ไม่พบข้อมูล กำลังลองใหม่');
      }
    } catch (err) {
      setErrorMessage('เกิดข้อผิดพลาดในการ OCR');
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
    
    // สำหรับน้ำหนัก ไม่ต้องทำ interval scan
    if (field === 'weight') {
      simulateWeightScan();
      return;
    }
    
    // สำหรับอื่นๆ ทำ scan ปกติ
    scan(field);
    scanIntervalId.current = setInterval(() => scan(field), 8000);
  }
  
  return () => {
    if (scanIntervalId.current) {
      clearInterval(scanIntervalId.current);
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
                {!isRecording && !audioBlob && (
                  <div className="text-center">
                    <button
                      onClick={() => {
                        // แนะนำก่อนเริ่มบันทึก
                        speak('กรุณาบอกอาการหลังจากเสียงสัญญาณ ระบบจะเปิดไมโครโฟนให้ 10 วินาที');
                        
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
                          
                          // เริ่มบันทึกหลังเสียงสัญญาณ
                          setTimeout(() => {
                            startRecording();
                          }, 500);
                        }, 3000);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-medium text-lg transition-colors flex items-center mx-auto"
                    >
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      เริ่มบันทึกเสียง
                    </button>
                    <p className="text-sm text-gray-500 mt-2">กดเพื่อเริ่มบันทึกเสียง (จะมีคำแนะนำก่อน)</p>
                  </div>
                )}
                {isRecording && (
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse mr-3"></div>
                      <span className="text-lg font-medium text-red-600">กำลังบันทึก... {formatTime(recordingTime)}/10 วินาที</span>
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
                      onClick={() => {
                        setSymptomsText('');
                        setAudioBlob(null);
                      }}
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
            {symptomsText.trim() && (
              <div className="text-center">
                <button
                  onClick={submitSymptoms}
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
        {showDebugPanel && <DebugPanel />}
        <DebugButton />
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

          {(scanCount >= 5 || manualInputMode) && (
            <div className="mt-4 space-y-4">
              <div className="text-center text-gray-700 font-medium">กรอกข้อมูลด้วยตัวเอง (optional):</div>
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
              <div className="text-center">
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
                    
                    // ไปขั้นตอนถัดไป
                    setTimeout(() => setCurrentStep('summary'), 800);
                  }}
                >
                  ยืนยันข้อมูล
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