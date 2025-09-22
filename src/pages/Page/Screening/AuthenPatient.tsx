import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageDebug } from '../../../hooks/usePageDebug';
import { TableSchema } from '../../../types/Debug';
import { DebugManager } from '../../../utils/Debuger';
import axios from 'axios';

interface PatientData {
  id: string;
  name: string;
  nationalId: string;
  profileImage?: string;
  faceData?: string;
  age?: number;
  birthDate?: string;
}

interface FaceRecognitionResult {
  location: [number, number, number, number];
  name: string;
  confidence: number;
  patient_id: string | null;
}

interface OCRResult {
  full_text: string;
  id_card: {
    id_numbers: string[];
    names: string[];
  };
  phone_numbers: string[];
  emails: string[];
  card_detected: boolean;
  tesseract_available: boolean;
}

interface RealtimeScanResult {
  faces: FaceRecognitionResult[];
  ocr: OCRResult;
  id_card_areas: Array<[number, number, number, number]>;
  scan_status?: {
    faces_found: number;
    faces_recognized: number;
    id_cards_found: number;
    ocr_available: boolean;
  };
}

type VerificationStep = 'face-scan' | 'id-input' | 'register' | 'success';

const AuthenPatient: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const debugManager = DebugManager.getInstance();
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
 const [autoScanTimeLeft, setAutoScanTimeLeft] = useState<number>(60);
  const [isAutoScanActive, setIsAutoScanActive] = useState<boolean>(false);
  const [autoScanTimer, setAutoScanTimer] = useState<number | null>(null);

  const [currentStep, setCurrentStep] = useState<VerificationStep>('face-scan');
  const [isScanning, setIsScanning] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [foundPatient, setFoundPatient] = useState<PatientData | null>(null);
  const [scanResults, setScanResults] = useState<RealtimeScanResult | null>(null);
  const [autoScanInterval, setAutoScanInterval] = useState<number | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [maxScanAttempts] = useState<number>(5);
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  usePageDebug('ยืนยันตัวตนผู้ป่วย', requiredTables);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Clear any previous session data when component loads
  useEffect(() => {
    // Clear previous screening session data
    localStorage.removeItem('queueInfo');
    console.log('Previous screening session data cleared');
  }, []);

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

  const getProfileImageUrl = (profileImage?: string) => {
    if (!profileImage) return undefined;
    return `${API_BASE_URL}/api/patient/${profileImage}`;
  };

  const getPatientData = (): PatientData[] => {
    const patients = debugManager.getData('patients');
    return patients.map((patient: Record<string, unknown>) => ({
      id: (patient.id as string) || 'P' + Math.random().toString().slice(2, 8),
      name: `${(patient.prefix as string) || ''} ${(patient.firstNameTh as string) || ''} ${(patient.lastNameTh as string) || ''}`.trim(),
      nationalId: (patient.nationalId as string) || '',
      profileImage: patient.profileImage as string,
      faceData: patient.faceData as string,
      birthDate: patient.birthDate as string,
      age: calculateAge((patient.nationalId as string) || '', patient.birthDate as string)
    }));
  };

  const mockPatientData: PatientData = {
    id: 'P001234',
    name: 'นายสมชาย ใจดี',
    nationalId: '1234567890123',
    birthDate: '1990-01-01', // เพิ่ม birthDate สำหรับการคำนวณอายุที่แม่นยำ
    age: calculateAge('1234567890123', '1990-01-01')
  };

  // Optimized startCamera function with retry mechanism and delay
  const startCamera = useCallback(async (retryCount = 0, maxRetries = 3): Promise<void> => {
    if (stream || isCameraStarting) {
      return;
    }

    setIsCameraStarting(true);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
      });

      if (videoRef.current) {
        // Ensure previous stream is cleared
        videoRef.current.srcObject = null;
        videoRef.current.srcObject = mediaStream;

        // Wait for video element to be ready
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video metadata load timeout'));
          }, 3000);

          videoRef.current!.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve();
          };

          videoRef.current!.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Video element error'));
          };
        });

        // Add slight delay to ensure video element is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          await videoRef.current.play();
          setStream(mediaStream);
        } catch (playError) {
          if (retryCount < maxRetries) {
            mediaStream.getTracks().forEach(track => track.stop());
            return startCamera(retryCount + 1, maxRetries);
          }
          const msg = (typeof playError === 'object' && playError && 'message' in playError) ? (playError as Error).message : String(playError);
          throw new Error(`Failed to play video after ${maxRetries} retries: ${msg}`);
        }
      } else {
        throw new Error('Video element not found');
      }
    } catch (error) {
      let userMessage = 'ไม่สามารถเข้าถึงกล้องได้';
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            userMessage = 'กรุณาอนุญาตการใช้งานกล้องในเบราว์เซอร์';
            break;
          case 'NotFoundError':
            userMessage = 'ไม่พบกล้องในอุปกรณ์ของคุณ';
            break;
          case 'NotReadableError':
            userMessage = 'กล้องถูกใช้งานโดยแอปพลิเคชันอื่น';
            break;
          default:
            userMessage = `เกิดข้อผิดพลาด: ${error.message}`;
        }
      } else if (error instanceof Error && error.message.includes('Video metadata load timeout')) {
        userMessage = 'ไม่สามารถโหลดข้อมูลวิดีโอได้';
      }
      setErrorMessage(userMessage);
      setStream(null);
    } finally {
      setIsCameraStarting(false);
    }
  }, [stream, isCameraStarting]);

  // Optimized stopCamera function
  const stopCamera = useCallback(() => {
    // Stop state stream
    if (stream) {
      stream.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
    }
    // Stop any stream attached to videoRef
    if (videoRef.current && videoRef.current.srcObject) {
      const s = videoRef.current.srcObject as MediaStream;
      s.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
    setStream(null);
  }, [stream]);

  // Optimized captureImage function
  const captureImage = useCallback(async (): Promise<File | null> => {
    if (!canvasRef.current || !videoRef.current || !videoRef.current.videoWidth) {
      return null;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    ctx.drawImage(video, 0, 0);
    return new Promise<File | null>(resolve => {
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], `face-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
          resolve(file);
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.8);
    });
  }, []);

  // Send image to backend API
  const sendImageToBackend = async (imageFile: File): Promise<RealtimeScanResult> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/realtime/scan`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data;
    } catch (error) {
      throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
  };

  // Save authenticated patient to localStorage
  const saveAuthenticatedPatient = (patient: PatientData) => {
    localStorage.setItem('authenticatedPatient', JSON.stringify(patient));
    
    const screeningQueue = {
      patientId: patient.id,
      timestamp: new Date().toISOString(),
      status: 'waiting',
      department: 'แผนกอายุรกรรม'
    };
    
    const currentQueue = debugManager.getData('screeningQueue');
    debugManager.updateData('screeningQueue', [...currentQueue, screeningQueue]);
  };

 const performScan = useCallback(async () => {
    if (isScanning || !stream || !videoRef.current || videoRef.current.paused) {
      return;
    }

    setIsScanning(true);
    setErrorMessage('');
    setScanCount(prev => prev + 1);

    try {
      const imageFile = await captureImage();
      if (!imageFile) {
        throw new Error('ไม่สามารถจับภาพจากกล้องได้');
      }

      const result = await sendImageToBackend(imageFile);
      setScanResults(result);

      if (result.faces?.length > 0) {
        const recognizedFace = result.faces.find(face => face.name !== 'Unknown' && face.confidence > 0.7);
        if (recognizedFace) {
          let patientData: PatientData;
          try {
            const response = await axios.get(`${API_BASE_URL}/api/patient/${recognizedFace.patient_id}`);
            const patient = response.data;
            patientData = {
              id: patient._id,
              name: `${patient.prefix || ''} ${patient.first_name_th || ''} ${patient.last_name_th || ''}`.trim(),
              nationalId: patient.national_id,
              profileImage: getProfileImageUrl(patient.image_path),
              faceData: patient.face_encoding,
              birthDate: patient.birth_date,
              age: calculateAge(patient.national_id || '', patient.birth_date)
            };
          } catch {
            patientData = {
              id: recognizedFace.patient_id || `P${Math.random().toString().slice(2, 8)}`,
              name: recognizedFace.name,
              nationalId: result.ocr?.id_card?.id_numbers?.[0] || '',
              profileImage: undefined,
              age: calculateAge(result.ocr?.id_card?.id_numbers?.[0] || '')
            };
          }

          setFoundPatient(patientData);
          try {
            const tokenRes = await axios.post(`${API_BASE_URL}/api/queue/token`, { patient_id: patientData.id });
            if (tokenRes.data.token) {
              localStorage.setItem('patient_token', tokenRes.data.token);
            }
          } catch (err) {
            console.error('[AUTH] Failed to get patient token:', err);
          }

          setCurrentStep('success');
          stopAutoScan(); // หยุดการสแกนเมื่อพบข้อมูล
          stopCamera();
          return;
        }
      }

      if (result.ocr?.id_card?.id_numbers?.length > 0) {
        const idNumber = result.ocr.id_card.id_numbers[0];
        setNationalId(idNumber);
        const patients = getPatientData();
        const foundPatientById = patients.find(p => p.nationalId === idNumber);
        if (foundPatientById) {
          setFoundPatient(foundPatientById);
          setCurrentStep('success');
          stopAutoScan(); // หยุดการสแกนเมื่อพบข้อมูล
          stopCamera();
          return;
        }
      }

      // แสดงสถานะการสแกน
      const faceFound = result.faces?.length > 0;
      const faceRecognized = result.faces?.some(f => f.name !== 'Unknown');
      
      if (!faceFound) {
        setErrorMessage(`กำลังค้นหาใบหน้า... (${autoScanTimeLeft} วินาที)`);
      } else if (!faceRecognized) {
        setErrorMessage(`พบใบหน้าแต่ไม่รู้จัก กำลังค้นหาต่อ... (${autoScanTimeLeft} วินาที)`);
      } else {
        setErrorMessage(`กำลังตรวจสอบข้อมูล... (${autoScanTimeLeft} วินาที)`);
      }

    } catch (error) {
      setErrorMessage(`เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'} (${autoScanTimeLeft} วินาที)`);
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, stream, autoScanTimeLeft]);


useEffect(() => {
  if (currentStep === 'face-scan') {
    if (!stream && !isCameraStarting) {
      startCamera().then(() => {
        // เริ่มสแกนอัตโนมัติทันทีเมื่อกล้องพร้อม
        setTimeout(() => {
          startAutoScan();
        }, 1000);
      });
    } else if (stream && !isAutoScanActive && autoScanTimeLeft > 0) {
      startAutoScan();
    }
  }
  return () => {
    stopAutoScan();
    stopCamera();
  };
}, [currentStep]); // เอา stream ออกจาก dependency array
useEffect(() => {
  if (currentStep === 'face-scan' && stream && !isAutoScanActive && autoScanTimeLeft > 0) {
    // รอให้ video element พร้อมก่อนเริ่มสแกน
    const timer = setTimeout(() => {
      startAutoScan();
    }, 500);
    
    return () => clearTimeout(timer);
  }
}, [stream, currentStep, isAutoScanActive, autoScanTimeLeft]);
  // Auto-scan with adaptive interval
  const startAutoScan = useCallback(() => {
    if (autoScanInterval || !stream) {
      return;
    }
    
    setIsAutoScanActive(true);
    setAutoScanTimeLeft(60);
    resetScanCount();
    
    // เริ่มสแกนทันที
    performScan();
    
    // ตั้งเวลาสแกนทุก 3 วินาที
    const scanInterval = window.setInterval(() => {
      if (currentStep === 'face-scan' && stream && !isScanning) {
        performScan();
      }
    }, 3000);
    setAutoScanInterval(scanInterval);
    
    // ตั้งเวลานับถอยหลัง
    const countdownTimer = window.setInterval(() => {
      setAutoScanTimeLeft(prev => {
        if (prev <= 1) {
          // หมดเวลา 60 วินาที
          clearInterval(scanInterval);
          clearInterval(countdownTimer);
          setAutoScanInterval(null);
          setAutoScanTimer(null);
          setIsAutoScanActive(false);
          setErrorMessage('หมดเวลาการสแกนอัตโนมัติ กรุณากดปุ่ม "เริ่มสแกนใหม่" หรือใช้เลขบัตรประชาชน');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setAutoScanTimer(countdownTimer);
    
  }, [autoScanInterval, currentStep, stream, performScan]);


  const stopAutoScan = useCallback(() => {
    if (autoScanInterval) {
      clearInterval(autoScanInterval);
      setAutoScanInterval(null);
    }
    if (autoScanTimer) {
      clearInterval(autoScanTimer);
      setAutoScanTimer(null);
    }
    setIsAutoScanActive(false);
    setAutoScanTimeLeft(60);
  }, [autoScanInterval, autoScanTimer]);
  const resetScanCount = useCallback(() => {
    setScanCount(0);
    setErrorMessage('');
  }, []);

  const handleFaceScan = async () => {
    if (!stream || isCameraStarting) {
      return;
    }
    await performScan();
  };

  const handleIdVerification = async () => {
    if (nationalId.length !== 13) {
      setErrorMessage('กรุณากรอกเลขบัตรประชาชน 13 หลัก');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await axios.get(`${API_BASE_URL}/api/patient/by_national_id/${nationalId}`);
      const patient = response.data;
      if (patient) {
        setFoundPatient({
          id: patient._id,
          name: `${patient.prefix || ''} ${patient.first_name_th || ''} ${patient.last_name_th || ''}`.trim(),
          nationalId: patient.national_id,
          profileImage: getProfileImageUrl(patient.image_path),
          faceData: patient.face_encoding,
          birthDate: patient.birth_date,
          age: calculateAge(patient.national_id || '', patient.birth_date)
        });

        try {
          const tokenRes = await axios.post(`${API_BASE_URL}/api/queue/token`, { patient_id: patient._id });
          if (tokenRes.data.token) {
            localStorage.setItem('patient_token', tokenRes.data.token);
          }
        } catch (err) {
          console.error('Cannot get patient token (by national id):', err);
        }

        setCurrentStep('success');
      } else {
        setErrorMessage('ไม่พบข้อมูลในระบบ กรุณาลงทะเบียนสมาชิกใหม่');
        setCurrentStep('register');
      }
    } catch (error) {
      setErrorMessage('เกิดข้อผิดพลาดในการตรวจสอบ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    navigate('/member/patient/add', { state: { nationalId } });
  };

  const handleContinue = () => {
    const patientToPass = foundPatient || mockPatientData;
    
    // ให้แน่ใจว่าอายุถูกคำนวณและส่งไปเสมอ
    const patientWithAge = {
      ...patientToPass,
      age: patientToPass.age || calculateAge(patientToPass.nationalId, patientToPass.birthDate),
      birthDate: patientToPass.birthDate // ให้แน่ใจว่า birthDate ถูกส่งไปด้วย
    };
    
    console.log('Sending patient data to AllProcess:', patientWithAge);
    
    // Get current patient token before clearing cache
    const currentToken = localStorage.getItem('patient_token');
    console.log('Current patient token:', currentToken);
    
    // Clear any existing cache before saving new data (แต่เก็บ token ไว้)
    localStorage.removeItem('authenticatedPatient');
    localStorage.removeItem('queueInfo');
    
    // Save fresh patient data (แต่ไม่ clear token)
    saveAuthenticatedPatient(patientWithAge);
    
    // Navigate with fresh data in state พร้อม token
    navigate('/screening/patient2', { 
      state: { 
        patient: patientWithAge,
        token: currentToken // ส่ง token ไปด้วย
      },
      replace: true // Use replace to prevent back navigation issues
    });
  };

  const handleBackToFaceScan = () => {
    setCurrentStep('face-scan');
    setNationalId('');
    setErrorMessage('');
    setScanResults(null);
    resetScanCount();
  };

  useEffect(() => {
    if (currentStep === 'face-scan') {
      if (!stream && !isCameraStarting) {
        startCamera();
      }
      if (stream && !autoScanInterval) {
        startAutoScan();
      }
    }
    return () => {
      stopAutoScan();
      stopCamera();
    };
  }, [currentStep]);

  useEffect(() => {
    return () => {
      stopAutoScan();
      stopCamera();
    };
  }, []);


  if (currentStep === 'face-scan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex">
        <div className="w-1/4 bg-white/10 backdrop-blur-sm p-6 flex flex-col justify-center">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">ยืนยันตัวตน</h1>
            <p className="text-white/80 text-base">สแกนใบหน้าเพื่อยืนยันตัวตน</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white/20 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center text-sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                วิธีการใช้งาน
              </h3>
              <ul className="space-y-2 text-white/80 text-sm">
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

            <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-3">
              <p className="text-yellow-200 text-xs">
                <strong>หมายเหตุ:</strong> หากไม่พบข้อมูลใบหน้าในระบบ คุณสามารถยืนยันตัวตนด้วยเลขบัตรประชาชนได้
              </p>
            </div>

            <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-3">
              <div className="flex items-center space-x-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${scanResults?.ocr?.tesseract_available ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-blue-200 text-xs font-medium">
                  OCR Status: {scanResults?.ocr?.tesseract_available ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}
                </span>
              </div>
              <p className="text-blue-200 text-xs">
                {scanResults?.ocr?.tesseract_available 
                  ? 'ระบบสามารถอ่านข้อมูลจากบัตรประชาชนได้' 
                  : 'ระบบจะจับใบหน้าและบัตรประชาชนได้ แต่ไม่สามารถอ่านข้อมูลจากบัตรได้'
                }
              </p>
            </div>

            {scanResults && (
              <div className="bg-white/20 rounded-xl p-3 max-h-64 overflow-y-auto">
                <h4 className="text-white font-semibold mb-2 text-sm">ผลการสแกน:</h4>
                <div className="mb-2">
                  <h5 className="text-white font-medium mb-1 text-xs">ใบหน้า:</h5>
                  {scanResults.faces.length > 0 ? (
                    <div className="space-y-1">
                      {scanResults.faces.map((face, index) => (
                        <div key={index} className="text-xs text-white/80">
                          <span className={`font-medium ${face.name === 'Unknown' ? 'text-yellow-300' : 'text-green-300'}`}>
                            {face.name}
                          </span>
                          <span className="ml-2">({(face.confidence * 100).toFixed(1)}%)</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-red-300">ไม่พบใบหน้า</p>
                  )}
                  {scanResults.scan_status && (
                    <div className="mt-1 text-xs text-blue-300">
                      พบใบหน้า: {scanResults.scan_status.faces_found} | 
                      รู้จัก: {scanResults.scan_status.faces_recognized} | 
                      บัตร: {scanResults.scan_status.id_cards_found}
                    </div>
                  )}
                </div>
                <div className="mb-2">
                  <h5 className="text-white font-medium mb-1 text-xs">บัตรประชาชน:</h5>
                  {scanResults.id_card_areas && scanResults.id_card_areas.length > 0 ? (
                    <div className="text-xs text-green-300">
                      ✓ พบบัตรประชาชน ({scanResults.id_card_areas.length} แผ่น)
                    </div>
                  ) : (
                    <div className="text-xs text-yellow-300">
                      ⚠ ไม่พบบัตรประชาชน
                    </div>
                  )}
                </div>
                {scanResults?.ocr?.card_detected ? (
                  <div className="mb-2">
                    <h5 className="text-white font-medium mb-1 text-xs">ข้อมูลที่อ่านได้:</h5>
                    {scanResults?.ocr?.tesseract_available ? (
                      scanResults?.ocr?.id_card?.id_numbers?.length > 0 ? (
                        <div className="space-y-1 text-xs text-white/80">
                          {scanResults.ocr.id_card.id_numbers.map((id, index) => (
                            <div key={index}>
                              <span className="font-medium">เลขบัตร:</span> {id}
                            </div>
                          ))}
                          {scanResults.ocr.id_card.names.map((name, index) => (
                            <div key={index}>
                              <span className="font-medium">ชื่อ:</span> {name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-yellow-300">
                          ⚠ พบบัตรประชาชนแต่ไม่สามารถอ่านข้อมูลได้
                        </div>
                      )
                    ) : (
                      <div className="text-xs text-orange-300">
                        ⚠ Tesseract ไม่พร้อมใช้งาน (OCR ไม่ทำงาน)
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full h-full flex flex-col">
            {/* Camera Section - ขยายให้ใหญ่สุด */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full h-full max-w-6xl max-h-[80vh] bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl">
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  {/* Face Detection Frame */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4/5 h-4/5 border-4 border-dashed border-white/70 rounded-2xl flex items-center justify-center">
                      <div className="w-3/4 h-3/4 border-2 border-solid border-green-400/80 rounded-xl"></div>
                    </div>
                  </div>
                  {/* Corner Guides */}
                  <div className="absolute top-8 left-8 w-12 h-12 border-l-4 border-t-4 border-white/80 rounded-tl-lg"></div>
                  <div className="absolute top-8 right-8 w-12 h-12 border-r-4 border-t-4 border-white/80 rounded-tr-lg"></div>
                  <div className="absolute bottom-8 left-8 w-12 h-12 border-l-4 border-b-4 border-white/80 rounded-bl-lg"></div>
                  <div className="absolute bottom-8 right-8 w-12 h-12 border-r-4 border-b-4 border-white/80 rounded-br-lg"></div>
                  
                  {/* Scanning Overlay */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                      <p className="text-white font-medium text-xl">กำลังสแกน...</p>
                      <div className="mt-4 w-64 h-2 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Instructions Overlay */}
                  {!isScanning && (
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-6 py-3 rounded-full">
                      <p className="text-center text-lg font-medium">วางใบหน้าให้อยู่ในกรอบสีเขียว</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Controls Section */}
            <div className="mt-4 flex flex-col items-center space-y-4">
              {errorMessage && (
                <div className="w-full max-w-2xl bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 text-sm">{errorMessage}</p>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={handleFaceScan}
                  disabled={isScanning || isCameraStarting || !stream}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2 text-lg"
                >
                  {isScanning ? (
                    <>
                      <svg className="animate-spin w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>กำลังสแกน...</span>
                    </>
                     ) : isCameraStarting ? (
                    <>
                      <svg className="animate-pulse w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>กำลังเปิดกล้อง...</span>
                    </>
                  ) : !stream ? (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>เปิดกล้อง</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>เริ่มสแกน</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setCurrentStep('id-input')}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 text-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  <span>ใช้เลขบัตรประชาชน</span>
                </button>
              </div>

              {/* Scan Progress */}
              {scanCount > 0 && scanCount < maxScanAttempts && (
                <div className="w-full max-w-2xl bg-white/90 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">ความคืบหน้าการสแกน</span>
                    <span className="text-sm text-gray-500">{scanCount}/{maxScanAttempts}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(scanCount / maxScanAttempts) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }


  if (currentStep === 'id-input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-red-600 to-pink-700 flex">
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
                <strong>หมายเหตุ:</strong> หากไม่มีข้อมูลในระบบ คุณจำเป็นต้องลงทะเบียนสมาชิกใหม่
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

  if (currentStep === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-600 to-emerald-700 flex">
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

  if (currentStep === 'success') {
    return (

<div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex p-8">
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

  return null;
};

export default AuthenPatient;