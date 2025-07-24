import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageDebug } from '../../../hooks/usePageDebug';
import { TableSchema } from '../../../types/Debug';
import { DebugManager } from '../../../utils/Debuger';
import * as faceapi from 'face-api.js';
import axios from 'axios';

interface PatientData {
  id: string;
  name: string;
  nationalId: string;
  profileImage?: string;
  faceData?: string;
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
  const [foundPatient, setFoundPatient] = useState<PatientData | null>(null);
  const [scanResults, setScanResults] = useState<RealtimeScanResult | null>(null);
  const [autoScanInterval, setAutoScanInterval] = useState<number | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [maxScanAttempts] = useState<number>(5); // จำนวนครั้งสูงสุดก่อนดีดไปหน้าเลขบัตร
  const [isFaceApiLoaded, setIsFaceApiLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  usePageDebug('ยืนยันตัวตนผู้ป่วย', requiredTables);

  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // ฟังก์ชันแปลง image_path เป็น URL สำหรับแสดงรูปผู้ป่วย
  const getProfileImageUrl = (profileImage?: string) => {
    if (!profileImage) return undefined;
    return `${API_BASE_URL}/api/patient/${profileImage}`;
  };

  // ดึงข้อมูลผู้ป่วยจาก localStorage
  const getPatientData = (): PatientData[] => {
    const patients = debugManager.getData('patients');
    return patients.map((patient: Record<string, unknown>) => ({
      id: (patient.id as string) || 'P' + Math.random().toString().slice(2, 8),
      name: `${(patient.prefix as string) || ''} ${(patient.firstNameTh as string) || ''} ${(patient.lastNameTh as string) || ''}`.trim(),
      nationalId: (patient.nationalId as string) || '',
      profileImage: patient.profileImage as string,
      faceData: patient.faceData as string
    }));
  };

  // Mock patient data (fallback)
  const mockPatientData: PatientData = {
    id: 'P001234',
    name: 'นายสมชาย ใจดี',
    nationalId: '1234567890123'
  };

  // เริ่มกล้อง
  const startCamera = async () => {
    if (stream) return;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Camera error:', error);
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

  // จับภาพจากกล้อง
  const captureImage = async (): Promise<File | null> => {
    if (!canvasRef.current || !videoRef.current) return null;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // ตั้งค่าขนาด canvas ให้ตรงกับ video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // วาดภาพจาก video ลงบน canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0);
    
    // แปลง canvas เป็น File
    return new Promise<File | null>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'face-scan.jpg', { type: 'image/jpeg' });
          resolve(file);
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.8);
    });
  };

  // ส่งภาพไปยัง backend API
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
      console.error('API Error:', error);
      throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
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

  // สแกนใบหน้าแบบ manual
  const handleFaceScan = async () => {
    await performScan();
  };

  // สแกนแบบอัตโนมัติ
  const performScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setErrorMessage('');
    setScanCount(prev => prev + 1);
    try {
      let imageFile: File | null = null;
      imageFile = await captureImage();
      if (!imageFile) {
        throw new Error('ไม่สามารถจับภาพจากกล้องได้');
      }
      const result = await sendImageToBackend(imageFile);
      setScanResults(result);
      if (result.faces && result.faces.length > 0) {
        const recognizedFace = result.faces.find(face => face.name !== 'Unknown');
        if (recognizedFace && recognizedFace.confidence > 0.75) {
          // ดึงข้อมูลผู้ป่วยจาก backend ด้วย patient_id
          if (recognizedFace.patient_id) {
            try {
              const response = await axios.get(`${API_BASE_URL}/api/patient/${recognizedFace.patient_id}`);
              const patient = response.data;
              setFoundPatient({
                id: patient._id,
                name: `${patient.prefix || ''} ${patient.first_name_th || ''} ${patient.last_name_th || ''}`.trim(),
                nationalId: patient.national_id,
                profileImage: getProfileImageUrl(patient.image_path),
                faceData: patient.face_encoding
              });
            } catch {
              // fallback เดิม
              setFoundPatient({
                id: recognizedFace.patient_id,
                name: recognizedFace.name,
                nationalId: result.ocr?.id_card?.id_numbers?.[0] || '',
                profileImage: undefined
              });
            }
          } else {
            setFoundPatient({
              id: recognizedFace.patient_id || 'P' + Math.random().toString().slice(2, 8),
              name: recognizedFace.name,
              nationalId: result.ocr?.id_card?.id_numbers?.[0] || '',
              profileImage: undefined
            });
          }
          // ขอ token จาก backend แล้วเก็บใน localStorage
          if (recognizedFace.patient_id) {
            try {
              const tokenRes = await axios.post(`${API_BASE_URL}/api/queue/token`, { patient_id: recognizedFace.patient_id });
              if (tokenRes.data.token) {
                localStorage.setItem('patient_token', tokenRes.data.token);
                console.log('[AUTH] Set patient_token:', tokenRes.data.token);
              } else {
                console.warn('[AUTH] No token received from /api/queue/token response:', tokenRes.data);
              }
            } catch (err) {
              console.error('Cannot get patient token:', err);
            }
          }
          setCurrentStep('success');
          stopAutoScan();
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
          stopAutoScan();
          stopCamera();
          return;
        }
      }
      if (scanCount >= maxScanAttempts) {
        setErrorMessage(`สแกนแล้ว ${scanCount} ครั้ง ไม่พบข้อมูล กรุณากรอกเลขบัตรประชาชน`);
        setCurrentStep('id-input');
        stopAutoScan();
        stopCamera();
      } else {
        const faceFound = result.faces && result.faces.length > 0;
        const faceRecognized = result.faces && result.faces.some(f => f.name !== 'Unknown');
        if (!faceFound) {
          setErrorMessage(`ไม่พบใบหน้าในภาพ (สแกนครั้งที่ ${scanCount}/${maxScanAttempts}) กรุณาลองใหม่อีกครั้ง`);
        } else if (!faceRecognized) {
          setErrorMessage(`พบใบหน้าแต่ไม่รู้จัก (สแกนครั้งที่ ${scanCount}/${maxScanAttempts}) กรุณาลองใหม่อีกครั้ง`);
        } else {
          setErrorMessage(`ไม่พบข้อมูลในระบบ (สแกนครั้งที่ ${scanCount}/${maxScanAttempts}) กรุณาลองใหม่อีกครั้ง`);
        }
      }
    } catch (error) {
      console.error('Face scan error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสแกน');
    } finally {
      setIsScanning(false);
    }
  };

  // เริ่มการสแกนอัตโนมัติ
  const startAutoScan = () => {
    if (autoScanInterval) return; // ป้องกันการเริ่มซ้อน
    
    // รีเซ็ตการนับครั้งเมื่อเริ่มใหม่
    resetScanCount();
    
    const interval = window.setInterval(() => {
      if (currentStep === 'face-scan' && stream) {
        performScan();
      }
    }, 10000); // ทุก 10 วินาที
    
    setAutoScanInterval(interval);
    console.log('Auto scan started - every 10 seconds');
  };

  // หยุดการสแกนอัตโนมัติ
  const stopAutoScan = () => {
    if (autoScanInterval) {
      clearInterval(autoScanInterval);
      setAutoScanInterval(null);
      console.log('Auto scan stopped');
    }
  };

  // รีเซ็ตการนับครั้งสแกน
  const resetScanCount = () => {
    setScanCount(0);
    setErrorMessage('');
    console.log('Scan count reset');
  };

  // ตรวจสอบเลขบัตรประชาชน
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
          faceData: patient.face_encoding
        });

        // **เพิ่มตรงนี้**
        try {
          const tokenRes = await axios.post(`${API_BASE_URL}/api/queue/token`, { patient_id: patient._id });
          if (tokenRes.data.token) {
            localStorage.setItem('patient_token', tokenRes.data.token);
            console.log('[AUTH] Set patient_token (by national id):', tokenRes.data.token);
          } else {
            console.warn('[AUTH] No token received from /api/queue/token response:', tokenRes.data);
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
      console.error('ID verification error:', error);
      setErrorMessage('เกิดข้อผิดพลาดในการตรวจสอบ');
    } finally {
      setIsLoading(false);
    }
  };

  // ลงทะเบียนสมาชิกใหม่
  const handleRegister = () => {
    navigate('/member/patient/add', { state: { nationalId } });
  };

  // ไปหน้าถัดไป
  const handleContinue = () => {
    const patientToPass = foundPatient || mockPatientData;
    
    // บันทึกข้อมูลผู้ป่วยที่ยืนยันตัวตนสำเร็จ
    saveAuthenticatedPatient(patientToPass);
    
    // นำทางไปยังหน้าคัดกรอง
    navigate('/screening/patient', { state: { patient: patientToPass } });
  };

  const handleBackToFaceScan = () => {
    setCurrentStep('face-scan');
    setNationalId('');
    setErrorMessage('');
    setScanResults(null);
    resetScanCount(); // รีเซ็ตการนับครั้งเมื่อกลับมา
  };

  // โหลด face-api.js models เมื่อ component mount
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      setIsFaceApiLoaded(true);
    };
    loadModels();
  }, []);

  // เริ่มกล้องเมื่อหน้า face-scan
  useEffect(() => {
    if (currentStep === 'face-scan' && !stream) {
      startCamera();
    }
    
    // เริ่ม auto scan เมื่อกล้องพร้อม
    if (currentStep === 'face-scan' && stream && !autoScanInterval) {
      startAutoScan();
    }
    
    return () => {
      if (currentStep !== 'face-scan') {
        stopCamera();
        stopAutoScan();
      }
    };
  }, [currentStep, stream, autoScanInterval]);

  // ประมวลผล video stream อัตโนมัติ
  useEffect(() => {
    let animationId: number;
    const processFrame = async () => {
      if (!isFaceApiLoaded || !videoRef.current || processing) {
        animationId = requestAnimationFrame(processFrame);
        return;
      }
      setProcessing(true);
      const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
      if (detections.length > 0) {
        // ส่ง descriptor ไป backend
        const descriptor = Array.from(detections[0].descriptor);
        try {
          const response = await axios.post(`${API_BASE_URL}/api/face/recognize`, { descriptor });
          setScanResults(response.data);
          // ถ้ารู้จักใบหน้า ให้ setFoundPatient และเปลี่ยน step
          if (response.data.faces && response.data.faces.length > 0) {
            const recognizedFace = response.data.faces.find((f: FaceRecognitionResult) => f.name !== 'Unknown');
            if (recognizedFace && recognizedFace.confidence > 0.75) {
              setFoundPatient({
                id: recognizedFace.patient_id || '',
                name: recognizedFace.name,
                nationalId: '',
                profileImage: undefined
              });
              setCurrentStep('success');
              stopCamera();
              return;
            }
          }
        } catch (error) {
          console.error('Face recognition API error:', error);
        }
      }
      setProcessing(false);
      animationId = requestAnimationFrame(processFrame);
    };
    if (currentStep === 'face-scan' && isFaceApiLoaded && videoRef.current) {
      animationId = requestAnimationFrame(processFrame);
    }
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [currentStep, isFaceApiLoaded, videoRef]);

  // ปิดกล้องเมื่อออกจากหน้า (unmount หรือเปลี่ยน route)
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

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
                <strong>หมายเหตุ:</strong> หากไม่พบข้อมูลใบหน้าในระบบ คุณสามารถยืนยันตัวตนด้วยเลขบัตรประชาชนได้
              </p>
            </div>

            {/* Tesseract Status */}
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${scanResults?.ocr?.tesseract_available ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-blue-200 text-sm font-medium">
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

            {/* Scan Results Display */}
            {scanResults && (
              <div className="bg-white/20 rounded-xl p-4">
                <h4 className="text-white font-semibold mb-2">ผลการสแกน:</h4>
                
                {/* Face Recognition Results */}
                <div className="mb-3">
                  <h5 className="text-white font-medium mb-1">ใบหน้า:</h5>
                  {scanResults.faces.length > 0 ? (
                    <div className="space-y-1">
                      {scanResults.faces.map((face, index) => (
                        <div key={index} className="text-sm text-white/80">
                          <span className={`font-medium ${face.name === 'Unknown' ? 'text-yellow-300' : 'text-green-300'}`}>
                            {face.name}
                          </span>
                          <span className="ml-2">({(face.confidence * 100).toFixed(1)}%)</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-red-300">ไม่พบใบหน้า</p>
                  )}
                  
                  {/* Scan Status */}
                  {scanResults.scan_status && (
                    <div className="mt-2 text-xs text-blue-300">
                      พบใบหน้า: {scanResults.scan_status.faces_found} | 
                      รู้จัก: {scanResults.scan_status.faces_recognized} | 
                      บัตร: {scanResults.scan_status.id_cards_found}
                    </div>
                  )}
                </div>

                {/* ID Card Detection */}
                <div className="mb-3">
                  <h5 className="text-white font-medium mb-1">บัตรประชาชน:</h5>
                  {scanResults.id_card_areas && scanResults.id_card_areas.length > 0 ? (
                    <div className="text-sm text-green-300">
                      ✓ พบบัตรประชาชน ({scanResults.id_card_areas.length} แผ่น)
                    </div>
                  ) : (
                    <div className="text-sm text-yellow-300">
                      ⚠ ไม่พบบัตรประชาชน
                    </div>
                  )}
                </div>

                {/* OCR Results (only if card detected) */}
                {scanResults?.ocr?.card_detected ? (
                  <div className="mb-3">
                    <h5 className="text-white font-medium mb-1">ข้อมูลที่อ่านได้:</h5>
                    {scanResults?.ocr?.tesseract_available ? (
                      scanResults?.ocr?.id_card?.id_numbers?.length > 0 ? (
                        <div className="space-y-1 text-sm text-white/80">
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
                        <div className="text-sm text-yellow-300">
                          ⚠ พบบัตรประชาชนแต่ไม่สามารถอ่านข้อมูลได้
                        </div>
                      )
                    ) : (
                      <div className="text-sm text-orange-300">
                        ⚠ Tesseract ไม่พร้อมใช้งาน (OCR ไม่ทำงาน)
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Camera */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
              {/* ปุ่มอัพโหลดรูปภาพ (ทดสอบ) */}
              <div className="relative mb-6 rounded-xl overflow-hidden bg-black aspect-[4/3]">
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

              {/* ปุ่มอัพโหลดรูปภาพ (ทดสอบ) */}
              <button
                onClick={handleFaceScan}
                disabled={isScanning}
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
                  <span>สแกนใบหน้าเพื่อยืนยันตัวตน</span>
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