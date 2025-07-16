import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageDebug } from '../../../hooks/usePageDebug';
import { TableSchema } from '../../../types/Debug';

interface PatientQueue {
  queueNumber: string;
  department: string;
  room: string;
  estimatedTime: string;
  patientName: string;
  appointmentType: string;
  building: string;
  floor: string;
  currentQueue: string;
  totalWaiting: number;
  status: 'waiting' | 'ready' | 'missed' | 'completed';
}

interface Department {
  id: string;
  name: string;
  keywords: string[];
  description: string;
  room: string;
  building: string;
  floor: string;
  color: string;
  currentQueue: string;
  totalWaiting: number;
  isActive: boolean;
}

interface PatientData {
  id: string;
  name: string;
  nationalId: string;
  phone?: string;
  profileImage?: string;
}

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Debug setup - เหมือนหน้าอื่นๆ
  const requiredTables: TableSchema[] = useMemo(() => [
    {
      tableName: 'departments',
      columns: ['id', 'name', 'keywords', 'description', 'room', 'building', 'floor', 'color', 'currentQueue', 'totalWaiting', 'isActive'],
      description: 'แผนกต่างๆ ในโรงพยาบาล'
    },
    {
      tableName: 'patients',
      columns: ['id', 'prefix', 'firstNameTh', 'lastNameTh', 'nationalId', 'phone', 'profileImage'],
      description: 'ข้อมูลผู้ป่วย'
    },
    {
      tableName: 'queues',
      columns: ['id', 'patientId', 'departmentId', 'roomId', 'queueNumber', 'status', 'timestamp'],
      description: 'ข้อมูลคิว'
    }
  ], []);

  const { debugData, refreshData } = usePageDebug('คัดกรองอาการด้วย AI', requiredTables);

  const [currentStep, setCurrentStep] = useState<'id-verification' | 'welcome' | 'voice-input' | 'text-input' | 'analysis' | 'queue-result'>('welcome');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assignedQueue, setAssignedQueue] = useState<PatientQueue | null>(null);
  const [queueStatus, setQueueStatus] = useState<'auto-queued' | 'manual-queue'>('manual-queue');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [nationalIdInput, setNationalIdInput] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRecognitionActive = useRef(false);

  // Load patient data from location state และ departments จาก debugData
  useEffect(() => {
    // Try to get from location state first
    if (location.state?.patient) {
      setPatientData(location.state.patient);
      setCurrentStep('welcome');
    } else {
      // If no patient data, set to ID verification step
      setCurrentStep('id-verification');
    }

    // Load departments from debugData
    if (debugData.departments && debugData.departments.length > 0) {
      setDepartments(debugData.departments);
    }
  }, [location.state, debugData]);

  // ฟังก์ชัน handleIdVerification ใช้ debugData แทน localStorage โดยตรง
  const handleIdVerification = async () => {
    if (!nationalIdInput.trim()) {
      setErrorMessage('กรุณากรอกเลขบัตรประชาชน');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // ใช้ข้อมูลจาก debugData แทน localStorage
      const patients = debugData.patients || [];
      const foundPatient = patients.find((p: any) => p.nationalId === nationalIdInput);

      if (foundPatient) {
        const patient: PatientData = {
          id: foundPatient.id,
          name: `${foundPatient.prefix || ''} ${foundPatient.firstNameTh || ''} ${foundPatient.lastNameTh || ''}`.trim(),
          nationalId: foundPatient.nationalId,
          phone: foundPatient.phone,
          profileImage: foundPatient.profileImage
        };
        
        setPatientData(patient);
        setCurrentStep('welcome');
      } else {
        setErrorMessage('ไม่พบข้อมูลผู้ป่วย กรุณาตรวจสอบเลขบัตรประชาชน');
      }
    } catch (error) {
      console.error('Error verifying ID:', error);
      setErrorMessage('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชัน analyzeSymptoms ใช้ departments จาก state
  const analyzeSymptoms = useCallback(async () => {
    const inputText = inputMode === 'voice' ? transcript : manualInput;
    if (!inputText.trim()) {
      setErrorMessage('กรุณาบอกอาการก่อนวิเคราะห์');
      return;
    }

    console.log('🤖 Analyzing symptoms:', inputText);
    setIsAnalyzing(true);
    setCurrentStep('analysis');
    setErrorMessage('');

    try {
      // Simulate AI analysis delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // ใช้ departments จาก state
      if (departments.length === 0) {
        setErrorMessage('ไม่พบข้อมูลแผนก กรุณาลองใหม่อีกครั้ง');
        setIsAnalyzing(false);
        setCurrentStep('voice-input');
        return;
      }

      // Simple keyword matching algorithm
      const departmentScores = departments.map(dept => {
        const matchCount = dept.keywords.filter(keyword => 
          inputText.toLowerCase().includes(keyword.toLowerCase())
        ).length;

        return {
          department: dept,
          score: matchCount,
          matchedKeywords: dept.keywords.filter(keyword => 
            inputText.toLowerCase().includes(keyword.toLowerCase())
          )
        };
      });

      // Sort by score and get best match
      const bestMatch = departmentScores.sort((a, b) => b.score - a.score)[0];
      const selectedDept = bestMatch.score > 0 ? bestMatch.department : departments[0]; // Default to first department

      console.log('🎯 Best department match:', {
        department: selectedDept.name,
        score: bestMatch.score,
        keywords: bestMatch.matchedKeywords
      });

      // Generate queue number
      const queuePrefix = selectedDept.id.charAt(selectedDept.id.length - 1);
      const queueNumber = `${queuePrefix}${String(Math.floor(Math.random() * 99) + 20).padStart(3, '0')}`;
      
      // Determine queue strategy based on waiting time
      const shouldAutoQueue = selectedDept.totalWaiting < 10;
      
      // Create queue assignment
      const queue: PatientQueue = {
        queueNumber,
        department: selectedDept.name,
        room: selectedDept.room,
        building: selectedDept.building,
        floor: selectedDept.floor,
        estimatedTime: `${selectedDept.totalWaiting * 3}-${selectedDept.totalWaiting * 5} นาที`,
        patientName: patientData?.name || '',
        appointmentType: 'Walk-in',
        currentQueue: selectedDept.currentQueue,
        totalWaiting: selectedDept.totalWaiting,
        status: shouldAutoQueue ? 'waiting' : 'ready'
      };

      // Save queue to debugData (ใช้ refreshData เพื่อ trigger update)
      const queueData = {
        id: `Q${Date.now()}`,
        patientId: patientData?.id,
        departmentId: selectedDept.id,
        queueNumber: queue.queueNumber,
        status: queue.status,
        timestamp: new Date().toISOString(),
        symptoms: inputText
      };
      
      // เพิ่มข้อมูลคิวใหม่
      try {
        const existingQueues = debugData.queues || [];
        existingQueues.push(queueData);
        // อัพเดทข้อมูลใน localStorage ผ่าน debugManager
        localStorage.setItem('queues', JSON.stringify(existingQueues));
        refreshData(); // รีเฟรชข้อมูล
      } catch (error) {
        console.error('Error saving queue:', error);
      }

      setAssignedQueue(queue);
      setQueueStatus(shouldAutoQueue ? 'auto-queued' : 'manual-queue');
      setIsAnalyzing(false);
      setCurrentStep('queue-result');

      console.log('✅ Analysis complete:', {
        queue: queue.queueNumber,
        department: queue.department,
        status: shouldAutoQueue ? 'auto-queued' : 'manual-queue'
      });

    } catch (error) {
      console.error('💥 Analysis error:', error);
      setErrorMessage('เกิดข้อผิดพลาดในการวิเคราะห์ กรุณาลองใหม่');
      setIsAnalyzing(false);
      setCurrentStep('voice-input');
    }
  }, [inputMode, transcript, manualInput, departments, patientData, debugData, refreshData]);

  // ส่วนที่เหลือของโค้ดเหมือนเดิม...
  // (ฟังก์ชัน Speech Recognition และ UI components)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    isRecognitionActive.current = false;
  }, []);

  // Check browser support
  const checkSpeechSupport = useCallback(() => {
    const hasWebkitSpeechRecognition = 'webkitSpeechRecognition' in window;
    const hasSpeechRecognition = 'SpeechRecognition' in window;
    const isSupported = hasWebkitSpeechRecognition || hasSpeechRecognition;
    
    console.log('🔍 Speech Recognition Support Check:', {
      hasWebkitSpeechRecognition,
      hasSpeechRecognition,
      isSupported,
      userAgent: navigator.userAgent
    });
    
    setSpeechSupported(isSupported);
    return isSupported;
  }, []);

  // Initialize Speech Recognition
  const initializeSpeechRecognition = useCallback(() => {
    console.log('🚀 Initializing Speech Recognition...');
    setIsInitializing(true);
    
    if (!checkSpeechSupport()) {
      setErrorMessage('เบราว์เซอร์ของคุณไม่รองรับระบบรู้จำเสียง กรุณาใช้ Chrome, Edge หรือ Safari');
      setIsInitializing(false);
      return false;
    }

    try {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Configure recognition
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'th-TH';
      recognition.maxAlternatives = 3;
      
      // Event handlers
      recognition.onstart = () => {
        console.log('🎤 Speech recognition started successfully');
        setIsListening(true);
        setErrorMessage('');
        isRecognitionActive.current = true;
        setRetryCount(0);
        
        // Set maximum listening time (20 seconds)
        timeoutRef.current = setTimeout(() => {
          console.log('⏰ Speech recognition timeout');
          if (isRecognitionActive.current && recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (error) {
              console.warn('Error stopping recognition on timeout:', error);
            }
          }
        }, 20000);
      };

      recognition.onresult = (event: any) => {
        console.log('📝 Speech result received:', event);
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
                    console.log(`Result ${i}: "${transcript}" (confidence: ${confidence})`);
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update transcript
        const currentTranscript = finalTranscript || interimTranscript;
        if (currentTranscript.trim()) {
          setTranscript(currentTranscript.trim());
          
          // Clear existing silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }

          // If we have final result, stop after 2 seconds
          if (finalTranscript.trim()) {
            console.log('✅ Final transcript received, stopping in 2 seconds');
            silenceTimeoutRef.current = setTimeout(() => {
              if (isRecognitionActive.current && recognitionRef.current) {
                try {
                  recognitionRef.current.stop();
                } catch (error) {
                  console.warn('Error stopping recognition after final result:', error);
                }
              }
            }, 2000);
          }
        }
      };

      recognition.onend = () => {
        console.log('🛑 Speech recognition ended');
        setIsListening(false);
        isRecognitionActive.current = false;
        cleanup();

        // Auto-analyze if we have transcript
        if (transcript.trim()) {
          console.log('🤖 Auto-analyzing transcript:', transcript);
          setTimeout(() => {
            analyzeSymptoms();
          }, 500);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', {
          error: event.error,
          message: event.message,
          timestamp: new Date().toISOString()
        });
        
        setIsListening(false);
        isRecognitionActive.current = false;
        cleanup();

        // Handle specific errors with user-friendly messages
        let userMessage = '';
        let shouldRetry = false;

        switch (event.error) {
          case 'not-allowed':
            setPermissionStatus('denied');
            userMessage = 'กรุณาอนุญาตให้เข้าถึงไมโครโฟนในการตั้งค่าเบราว์เซอร์';
            break;
          case 'no-speech':
            userMessage = 'ไม่ได้ยินเสียง กรุณาพูดใกล้ไมโครโฟนและลองใหม่';
            shouldRetry = retryCount < 2;
            break;
          case 'audio-capture':
            userMessage = 'ไม่พบไมโครโฟน กรุณาตรวจสอบอุปกรณ์และอนุญาตการเข้าถึง';
            break;
          case 'network':
            userMessage = 'เกิดข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
            shouldRetry = retryCount < 1;
            break;
          case 'aborted':
            userMessage = 'การรู้จำเสียงถูกยกเลิก';
            break;
          case 'service-not-allowed':
            userMessage = 'บริการรู้จำเสียงไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง';
            break;
          default:
            userMessage = `เกิดข้อผิดพลาด (${event.error}) กรุณาลองใหม่อีกครั้ง`;
            shouldRetry = retryCount < 1;
        }

        setErrorMessage(userMessage);

        // Auto retry for certain errors
        if (shouldRetry) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            console.log(`🔄 Auto-retrying speech recognition (attempt ${retryCount + 1})`);
            startListening();
          }, 2000);
        }
      };

      recognition.onspeechstart = () => {
        console.log('🗣️ Speech detected');
        setErrorMessage('');
      };

      recognition.onspeechend = () => {
        console.log('🔇 Speech ended');
      };

      recognition.onnomatch = () => {
        console.log('❓ No speech match found');
        setErrorMessage('ไม่สามารถรู้จำเสียงได้ กรุณาพูดชัดๆ และลองใหม่');
      };

      recognitionRef.current = recognition;
      setIsInitializing(false);
      console.log('✅ Speech Recognition initialized successfully');
      return true;

    } catch (error) {
      console.error('💥 Failed to initialize Speech Recognition:', error);
      setErrorMessage('ไม่สามารถเริ่มต้นระบบรู้จำเสียงได้ กรุณาลองใหม่');
      setIsInitializing(false);
      return false;
    }
  }, [checkSpeechSupport, transcript, retryCount, cleanup, analyzeSymptoms]);

  // Start listening
  const startListening = useCallback(async () => {
    console.log('🎯 Starting speech recognition...');
    
    if (!speechSupported) {
      setErrorMessage('เบราว์เซอร์ของคุณไม่รองรับระบบรู้จำเสียง');
      return;
    }

    if (isListening || isRecognitionActive.current) {
      console.log('⚠️ Already listening, ignoring start request');
      return;
    }

    // Clear previous transcript and errors
    setTranscript('');
    setErrorMessage('');

    // Request microphone permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      setPermissionStatus('granted');
      console.log('✅ Microphone permission granted');
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      setPermissionStatus('denied');
      setErrorMessage('กรุณาอนุญาตให้เข้าถึงไมโครโฟนเพื่อใช้งานระบบเสียง');
      return;
    }

    // Initialize recognition if not already done
    if (!recognitionRef.current) {
      const initialized = initializeSpeechRecognition();
      if (!initialized) return;
    }

    // Start recognition
    try {
      if (recognitionRef.current && !isRecognitionActive.current) {
        console.log('🚀 Starting speech recognition...');
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error('💥 Error starting speech recognition:', error);
      setErrorMessage('ไม่สามารถเริ่มการรู้จำเสียงได้ กรุณาลองใหม่');
      setIsListening(false);
      isRecognitionActive.current = false;
    }
  }, [speechSupported, isListening, initializeSpeechRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    console.log('🛑 Stopping speech recognition...');
    
    if (recognitionRef.current && isRecognitionActive.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Error stopping recognition:', error);
      }
    }
    
    setIsListening(false);
    isRecognitionActive.current = false;
    cleanup();
  }, [cleanup]);

  // Handle manual queue entry
  const handleManualQueue = () => {
    if (assignedQueue) {
      setAssignedQueue({
        ...assignedQueue,
        status: 'waiting'
      });
      setQueueStatus('auto-queued');
    }
  };

  // Continue to queue tracking
  const handleContinue = () => {
    navigate('/screening/queue-status', {
      state: {
        queue: assignedQueue,
        patient: patientData,
        symptoms: inputMode === 'voice' ? transcript : manualInput
      }
    });
  };

  // Get current input
  const getCurrentInput = () => {
    return inputMode === 'voice' ? transcript : manualInput;
  };

  // Get current time
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Initialize on component mount
  useEffect(() => {
    console.log('🔧 Component mounted, checking speech support...');
    checkSpeechSupport();
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 Component unmounting, cleaning up...');
      cleanup();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.warn('Error aborting recognition on unmount:', error);
        }
      }
    };
  }, [checkSpeechSupport, cleanup]);

  // ID Verification Step
  if (currentStep === 'id-verification') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex flex-col px-4 py-6 relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full animate-ping"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl mb-4 border border-white/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-black text-white mb-2 tracking-wider">
              SMART MEDICAL
            </h1>
            <p className="text-lg text-white/90 font-medium tracking-wide">
              AI SCREENING SYSTEM
            </p>
          </div>

          {/* ID Input Form */}
          <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/30">
              <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                ยืนยันตัวตน
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เลขบัตรประชาชน
                  </label>
                  <input
                    type="text"
                    value={nationalIdInput}
                    onChange={(e) => setNationalIdInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleIdVerification()}
                    maxLength={13}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-wider"
                    placeholder="1234567890123"
                  />
                </div>

                {errorMessage && (
                  <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                    <p className="text-red-700 text-sm text-center">{errorMessage}</p>
                  </div>
                )}

                <button
                  onClick={handleIdVerification}
                  disabled={isLoading || !nationalIdInput.trim()}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังตรวจสอบ...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>ยืนยัน</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Access */}
            <div className="mt-6 text-center">
              <p className="text-white/80 text-sm mb-3">ตัวอย่างเลขบัตรประชาชนสำหรับทดสอบ:</p>
              <div className="space-y-2">
                <button
                  onClick={() => setNationalIdInput('1234567890123')}
                  className="block w-full bg-white/20 backdrop-blur-sm text-white text-sm py-2 px-4 rounded-lg hover:bg-white/30 transition-colors border border-white/30"
                >
                  1234567890123 (นายสมชาย ใจดี)
                </button>
                <button
                                    onClick={() => setNationalIdInput('2345678901234')}
                  className="block w-full bg-white/20 backdrop-blur-sm text-white text-sm py-2 px-4 rounded-lg hover:bg-white/30 transition-colors border border-white/30"
                >
                  2345678901234 (นางสาวสมหญิง รักสุขภาพ)
                </button>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center mt-6 space-y-2">
            <div className="flex justify-center space-x-4 text-white/60 text-xs">
              <span>🚨 ฉุกเฉิน: 1669</span>
              <span>ℹ️ ช่วยเหลือ: 1111</span>
            </div>
            <p className="text-white/40 text-xs">Version 2.0.0 - AI Enhanced</p>
          </div>
        </div>
      </div>
    );
  }

  // Welcome Step
  if (currentStep === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex flex-col px-4 py-6 relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full animate-ping"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl mb-4 border border-white/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-black text-white mb-2 tracking-wider">
              SMART MEDICAL
            </h1>
            <p className="text-lg text-white/90 font-medium tracking-wide">
              AI SCREENING SYSTEM
            </p>
            <div className="flex items-center justify-center mt-2 space-x-1">
              <div className={`w-2 h-2 rounded-full animate-pulse ${speechSupported ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span className="text-white/80 text-sm">
                {speechSupported ? 'ระบบพร้อมใช้งาน' : 'โหมดข้อความเท่านั้น'}
              </span>
            </div>
          </div>

          {/* Patient Welcome */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-3">
              ยินดีต้อนรับ
            </h2>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 max-w-sm mx-auto border border-white/30">
              <p className="text-white font-semibold text-lg mb-1">
                {patientData?.name}
              </p>
              <p className="text-white/80 text-sm">
                ยืนยันตัวตนเรียบร้อยแล้ว
              </p>
              <div className="flex items-center justify-center mt-2 text-white/70 text-xs">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{getCurrentTime()}</span>
              </div>
            </div>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 text-center border border-white/20">
              <div className="w-8 h-8 mx-auto bg-blue-400/30 rounded-full flex items-center justify-center mb-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-white text-xs font-medium">AI ฉลาด</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 text-center border border-white/20">
              <div className="w-8 h-8 mx-auto bg-green-400/30 rounded-full flex items-center justify-center mb-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-white text-xs font-medium">รวดเร็ว</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 text-center border border-white/20">
              <div className="w-8 h-8 mx-auto bg-purple-400/30 rounded-full flex items-center justify-center mb-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-white text-xs font-medium">แม่นยำ</p>
            </div>
          </div>

          {/* Start Button */}
          <div className="flex-1 flex flex-col justify-center">
            <button
              onClick={() => setCurrentStep('voice-input')}
              className="w-full bg-white/95 backdrop-blur-sm text-blue-600 font-bold py-5 px-6 rounded-2xl shadow-2xl active:scale-95 transition-all duration-300 flex items-center justify-center space-x-3 border border-white/30"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <span className="text-lg">เริ่มบอกอาการ</span>
            </button>
            
            <p className="text-white/70 text-sm text-center mt-4 leading-relaxed">
              บอกอาการด้วยเสียงหรือข้อความ
              <br />
              AI จะแนะนำแผนกที่เหมาะสม
            </p>
          </div>

          {/* Footer Info */}
          <div className="text-center mt-6 space-y-2">
            <div className="flex justify-center space-x-4 text-white/60 text-xs">
              <span>🚨 ฉุกเฉิน: 1669</span>
              <span>ℹ️ ช่วยเหลือ: 1111</span>
            </div>
            <p className="text-white/40 text-xs">Version 2.0.0 - AI Enhanced</p>
          </div>
        </div>
      </div>
    );
  }

  // Voice Input Step
  if (currentStep === 'voice-input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex flex-col px-4 py-6 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-10 w-32 h-32 bg-white/10 rounded-full animate-bounce delay-1000"></div>
          <div className="absolute bottom-20 left-10 w-24 h-24 bg-white/10 rounded-full animate-bounce delay-2000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl mb-3 border border-white/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">บอกอาการของคุณ</h1>
            <p className="text-white/80 text-sm">AI จะวิเคราะห์และแนะนำแผนกที่เหมาะสม</p>
          </div>

          {/* Input Mode Toggle */}
          <div className="flex bg-white/20 backdrop-blur-sm rounded-xl p-1 mb-6 border border-white/30">
            <button
              onClick={() => setInputMode('voice')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                inputMode === 'voice' 
                  ? 'bg-white text-purple-600 shadow-lg' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>พูด {speechSupported ? '(แนะนำ)' : '(ไม่รองรับ)'}</span>
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                inputMode === 'text' 
                  ? 'bg-white text-purple-600 shadow-lg' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>พิมพ์</span>
            </button>
          </div>

                    {/* Voice Input Mode */}
          {inputMode === 'voice' && (
            <>
              {/* Browser Support Warning */}
              {!speechSupported && (
                <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-yellow-800 text-sm font-medium">ระบบเสียงไม่รองรับ</p>
                      <p className="text-yellow-700 text-xs">กรุณาใช้ Chrome, Edge หรือ Safari เวอร์ชันล่าสุด</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="bg-red-100 border border-red-300 rounded-xl p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-red-800 text-sm font-medium">เกิดข้อผิดพลาด</p>
                      <p className="text-red-700 text-xs">{errorMessage}</p>
                    </div>
                  </div>
                  {retryCount > 0 && (
                    <div className="mt-2 text-red-600 text-xs">
                      ลองใหม่ครั้งที่ {retryCount + 1}/3
                    </div>
                  )}
                </div>
              )}

              {/* Microphone Interface */}
              <div className="flex-1 flex flex-col items-center justify-center mb-6">
                {/* Initialization Loading */}
                {isInitializing && (
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto border-4 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
                    <p className="text-white/80 text-sm">กำลังเตรียมระบบเสียง...</p>
                  </div>
                )}

                {/* Main Microphone Button */}
                <div className="relative mb-6">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={!speechSupported || isInitializing}
                    className={`w-36 h-36 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 relative ${
                      isListening 
                        ? 'bg-red-500 animate-pulse' 
                        : speechSupported && !isInitializing
                          ? 'bg-white hover:bg-gray-50' 
                          : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <svg 
                      className={`w-20 h-20 ${
                        isListening 
                          ? 'text-white' 
                          : speechSupported && !isInitializing
                            ? 'text-purple-600' 
                            : 'text-gray-600'
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    
                    {/* Listening Animation Rings */}
                    {isListening && (
                      <>
                        <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
                        <div className="absolute inset-2 rounded-full border-4 border-white/20 animate-ping delay-75"></div>
                        <div className="absolute inset-4 rounded-full border-4 border-white/10 animate-ping delay-150"></div>
                      </>
                    )}
                  </button>
                </div>

                {/* Status Display */}
                <div className="text-center">
                  <p className={`text-lg font-medium mb-2 ${
                    isListening ? 'text-white animate-pulse' : 'text-white/80'
                  }`}>
                    {isInitializing 
                      ? 'กำลังเตรียมระบบ...' 
                      : isListening 
                        ? 'กำลังฟัง... พูดได้เลย' 
                        : speechSupported 
                          ? 'แตะเพื่อเริ่มพูด' 
                          : 'ระบบเสียงไม่รองรับ'
                    }
                  </p>
                  
                  {/* Listening Indicator */}
                  {isListening && (
                    <div className="flex justify-center space-x-1 mb-3">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
                    </div>
                  )}

                  {/* Permission Status */}
                  {permissionStatus === 'denied' && (
                    <p className="text-red-200 text-sm">
                      กรุณาอนุญาตให้เข้าถึงไมโครโฟน
                    </p>
                  )}

                  {/* Retry Info */}
                  {retryCount > 0 && (
                    <p className="text-yellow-200 text-sm">
                      กำลังลองใหม่... ({retryCount}/3)
                    </p>
                  )}
                </div>
              </div>

              {/* Transcript Display */}
              {transcript && (
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/30">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-purple-800 font-medium text-sm">ข้อความที่รู้จำได้:</span>
                  </div>
                  <p className="text-gray-800 leading-relaxed">{transcript}</p>
                  <div className="flex items-center mt-2 text-green-600 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>รับข้อมูลสำเร็จ</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Text Input Mode */}
          {inputMode === 'text' && (
            <div className="flex-1 flex flex-col mb-6">
              {/* Info Banner */}
              <div className="bg-blue-100 border border-blue-300 rounded-xl p-4 mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-blue-800 text-sm font-medium">โหมดพิมพ์ข้อความ</p>
                    <p className="text-blue-700 text-xs">พิมพ์อาการที่รู้สึกให้ละเอียดเพื่อความแม่นยำ</p>
                  </div>
                </div>
              </div>
              
              {/* Text Input Area */}
              <div className="flex-1">
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="พิมพ์อาการที่รู้สึก เช่น ปวดหัว ไข้ ปวดท้อง ไอ เจ็บคอ..."
                  className="w-full h-40 p-4 rounded-xl border-0 resize-none text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-lg"
                  rows={8}
                />
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span className="text-white/70">
                    {manualInput.length}/500 ตัวอักษร
                  </span>
                  {manualInput.length > 0 && (
                    <span className="text-green-300 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      พร้อมวิเคราะห์
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Example Symptoms */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/20">
            <p className="text-white/90 text-sm font-medium mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              ตัวอย่างอาการ:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                'ปวดหัว', 'ไข้สูง', 'ปวดท้อง', 'ไอแห้ง', 
                'ปวดหลัง', 'เจ็บคอ', 'ปวดเข่า', 'ผื่นคัน'
              ].map((symptom) => (
                <button
                  key={symptom}
                  onClick={() => {
                    if (inputMode === 'voice') {
                      setTranscript(symptom);
                    } else {
                      setManualInput(prev => prev ? `${prev} ${symptom}` : symptom);
                    }
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-2 rounded-lg active:scale-95 transition-all border border-white/30"
                >
                  {symptom}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Main Action Button */}
            <button
              onClick={analyzeSymptoms}
              disabled={!getCurrentInput().trim() || isAnalyzing}
              className={`w-full font-bold py-4 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-center space-x-2 ${
                getCurrentInput().trim() && !isAnalyzing
                  ? 'bg-white text-purple-600 shadow-xl hover:shadow-2xl'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
            >
                            {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังวิเคราะห์...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>วิเคราะห์อาการด้วย AI</span>
                </>
              )}
            </button>

            {/* Secondary Actions */}
            <div className="flex space-x-3">
              <button
                onClick={() => setCurrentStep('welcome')}
                className="flex-1 bg-gray-500/80 backdrop-blur-sm text-white font-bold py-3 px-4 rounded-xl active:scale-95 transition-all border border-white/30"
              >
                ย้อนกลับ
              </button>
              
              {getCurrentInput().trim() && (
                <button
                  onClick={() => {
                    setTranscript('');
                    setManualInput('');
                    setErrorMessage('');
                  }}
                  className="flex-1 bg-orange-500/80 backdrop-blur-sm text-white font-bold py-3 px-4 rounded-xl active:scale-95 transition-all border border-white/30"
                >
                  ล้างข้อมูล
                </button>
              )}
            </div>
          </div>

          {/* Help Text */}
          <div className="text-center mt-4">
            <p className="text-white/60 text-xs leading-relaxed">
              💡 บอกอาการให้ละเอียดเพื่อความแม่นยำในการแนะนำแผนก
              <br />
              🚨 กรณีฉุกเฉิน โทร 1669 ทันที
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Analysis Step
  if (currentStep === 'analysis') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex flex-col items-center justify-center px-4 py-6 relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full animate-pulse delay-300"></div>
          <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-white/10 rounded-full animate-pulse delay-700"></div>
          <div className="absolute bottom-1/4 left-1/2 w-40 h-40 bg-white/5 rounded-full animate-ping delay-1000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center max-w-sm mx-auto">
          {/* AI Brain Animation */}
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl border border-white/30">
              <svg className="w-12 h-12 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            
            {/* Rotating Ring */}
            <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-transparent border-t-white/50 rounded-full animate-spin"></div>
            <div className="absolute inset-2 w-20 h-20 mx-auto border-4 border-transparent border-r-white/30 rounded-full animate-spin animate-reverse delay-500"></div>
          </div>
          
          {/* Status Text */}
          <h2 className="text-2xl font-bold text-white mb-4">AI กำลังวิเคราะห์</h2>
          <p className="text-white/80 text-sm mb-8 leading-relaxed">
            ระบบปัญญาประดิษฐ์กำลังประมวลผล
            <br />
            อาการของคุณเพื่อแนะนำแผนกที่เหมาะสม
          </p>
          
          {/* Progress Steps */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-center space-x-3 text-white/90">
              <div className="w-3 h-3 bg-green-400 rounded-full flex-shrink-0"></div>
              <span className="text-sm">รับข้อมูลอาการ</span>
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div className="flex items-center justify-center space-x-3 text-white/90">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse flex-shrink-0"></div>
              <span className="text-sm">วิเคราะห์และจับคู่แผนก</span>
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            
            <div className="flex items-center justify-center space-x-3 text-white/60">
              <div className="w-3 h-3 bg-gray-400 rounded-full flex-shrink-0"></div>
              <span className="text-sm">สร้างคิวและแนะนำ</span>
              <div className="w-4 h-4 border-2 border-gray-400 rounded-full"></div>
            </div>
          </div>

          {/* Symptoms Preview */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-white/80 text-xs mb-2">อาการที่วิเคราะห์:</p>
            <p className="text-white text-sm font-medium leading-relaxed">
              "{getCurrentInput()}"
            </p>
          </div>

          {/* Loading Dots */}
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>
    );
  }

  // Queue Result Step
  if (currentStep === 'queue-result') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex flex-col px-4 py-6 relative overflow-hidden">
        {/* Success Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-10 right-10 w-20 h-20 bg-white/10 rounded-full animate-bounce delay-500"></div>
          <div className="absolute bottom-20 left-10 w-16 h-16 bg-white/10 rounded-full animate-bounce delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full animate-pulse"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl mb-3 border border-white/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              {queueStatus === 'auto-queued' ? 'ได้รับคิวแล้ว!' : 'พร้อมรับคิว!'}
            </h1>
            <p className="text-white/80 text-sm">
              {queueStatus === 'auto-queued' 
                ? 'AI ได้จัดคิวให้คุณเรียบร้อยแล้ว' 
                : 'กรุณายืนยันการรับคิว'
              }
            </p>
          </div>

          {/* Queue Status Banner */}
          {queueStatus === 'auto-queued' ? (
            <div className="bg-green-100 border border-green-300 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div>
                  <p className="text-green-800 font-bold text-sm">คิวอัตโนมัติ - รวดเร็ว</p>
                  <p className="text-green-700 text-xs">ระบบจัดคิวให้อัตโนมัติเนื่องจากผู้รอน้อย</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-100 border border-blue-300 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-blue-800 font-bold text-sm">คิวแมนนวล - ยืนยันเพิ่มเติม</p>
                  <p className="text-blue-700 text-xs">ผู้รอเยอะ กรุณายืนยันการรับคิว</p>
                </div>
              </div>
            </div>
          )}

          {/* Queue Number Display */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 mb-6 text-center shadow-xl border border-white/30">
            <p className="text-white/80 text-sm mb-2">หมายเลขคิวของคุณ</p>
            <div className="text-5xl font-black text-white mb-3 tracking-wider">
              {assignedQueue?.queueNumber}
            </div>
            <div className="flex items-center justify-center space-x-4 text-white/90 text-sm">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{assignedQueue?.estimatedTime}</span>
              </div>
              <div className="flex items-center">
                               <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>รอ {assignedQueue?.totalWaiting} คน</span>
              </div>
            </div>
          </div>

          {/* Department & Patient Info */}
          <div className="space-y-4 mb-6 flex-1 overflow-y-auto">
            {/* Department Info */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 border border-white/30">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{assignedQueue?.department}</h3>
                  <p className="text-gray-600 text-sm">แผนกที่แนะนำโดย AI</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">ตำแหน่ง</p>
                  <p className="text-gray-800 font-medium">{assignedQueue?.building}</p>
                  <p className="text-gray-800 font-medium">{assignedQueue?.floor}</p>
                  <p className="text-gray-800 font-medium">{assignedQueue?.room}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">สถานะคิว</p>
                  <p className="text-gray-800 font-medium">คิวปัจจุบัน: {assignedQueue?.currentQueue}</p>
                  <p className="text-gray-800 font-medium">ผู้รอ: {assignedQueue?.totalWaiting} คน</p>
                </div>
              </div>
            </div>

            {/* Patient Info */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 border border-white/30">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{assignedQueue?.patientName}</h3>
                  <p className="text-gray-600 text-sm">{assignedQueue?.appointmentType}</p>
                </div>
              </div>
              
              <div className="text-sm text-gray-700">
                {/* ปิดไว้ก่อนมี err แก้ให้ด้วยนะ */}
                {/*<p><span className="font-medium">เลขบัตร:</span> {patientData.id}</p>
                <p><span className="font-medium">โทรศัพท์:</span> {patientData.phone}</p>*/}
                <p><span className="font-medium">เวลา:</span> {getCurrentTime()}</p>
              </div>
            </div>

            {/* Symptoms Analysis */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 border border-white/30">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">อาการที่วิเคราะห์</h3>
                  <p className="text-gray-600 text-sm">ข้อมูลที่ AI ใช้ในการแนะนำ</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-800 text-sm leading-relaxed">"{getCurrentInput()}"</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center mb-3">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold text-yellow-800 text-sm">คำแนะนำสำคัญ</span>
              </div>
              <ul className="space-y-2 text-yellow-800 text-sm">
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2 flex-shrink-0">1.</span>
                  <span>ไปที่ {assignedQueue?.building} {assignedQueue?.floor} {assignedQueue?.room}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2 flex-shrink-0">2.</span>
                  <span>รอการเรียกคิวหมายเลข {assignedQueue?.queueNumber}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2 flex-shrink-0">3.</span>
                  <span>เตรียมบัตรประชาชนและเอกสารการรักษา</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2 flex-shrink-0">4.</span>
                  <span>หากมีอาการเปลี่ยนแปลงหรือเร่งด่วน แจ้งเจ้าหน้าที่ทันที</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Manual Queue Button (if not auto-queued) */}
            {queueStatus === 'manual-queue' && (
              <button
                onClick={handleManualQueue}
                className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-4 px-6 rounded-xl shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 border border-white/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>ยืนยันรับคิว</span>
              </button>
            )}

            {/* Continue Button (if auto-queued) */}
            {queueStatus === 'auto-queued' && (
              <button
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-4 px-6 rounded-xl shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 border border-white/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>ไปหน้าติดตามคิว</span>
              </button>
            )}
            
            {/* Alternative Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  // Reset all states
                  setCurrentStep('voice-input');
                  setTranscript('');
                  setManualInput('');
                  setAssignedQueue(null);
                  setErrorMessage('');
                  cleanup();
                }}
                className="bg-orange-500/90 backdrop-blur-sm text-white font-bold py-3 px-4 rounded-xl active:scale-95 transition-all border border-white/30 text-sm"
              >
                บอกอาการใหม่
              </button>
              
              <button
                onClick={() => {
                  // Share queue info
                  if (navigator.share && assignedQueue) {
                    navigator.share({
                      title: 'ข้อมูลคิวโรงพยาบาล',
                      text: `คิว ${assignedQueue.queueNumber} - ${assignedQueue.department} ${assignedQueue.room}`,
                      url: window.location.href
                    }).catch(console.error);
                  } else {
                    // Fallback: copy to clipboard
                    const queueInfo = `คิว ${assignedQueue?.queueNumber} - ${assignedQueue?.department} ${assignedQueue?.room}`;
                    navigator.clipboard.writeText(queueInfo).then(() => {
                      alert('คัดลอกข้อมูลคิวแล้ว');
                    }).catch(() => {
                      alert('ไม่สามารถคัดลอกได้');
                    });
                  }
                }}
                className="bg-purple-500/90 backdrop-blur-sm text-white font-bold py-3 px-4 rounded-xl active:scale-95 transition-all border border-white/30 text-sm"
              >
                แชร์ข้อมูล
              </button>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="text-center mt-4 space-y-2">
            <div className="flex justify-center space-x-6 text-white/70 text-xs">
              <a href="tel:1669" className="flex items-center hover:text-white transition-colors">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>ฉุกเฉิน: 1669</span>
              </a>
              <a href="tel:1111" className="flex items-center hover:text-white transition-colors">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                                <span>ช่วยเหลือ: 1111</span>
              </a>
            </div>
            <p className="text-white/50 text-xs">
              Smart Medical AI System v2.0.0
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Welcome;

