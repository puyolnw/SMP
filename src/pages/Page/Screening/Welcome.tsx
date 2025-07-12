import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface PatientQueue {
  queueNumber: string;
  department: string;
  room: string;
  estimatedTime: string;
  patientName: string;
  appointmentType: string;
}

interface Department {
  id: string;
  name: string;
  keywords: string[];
  description: string;
  room: string;
  color: string;
}

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<'welcome' | 'voice-input' | 'analysis' | 'department-selection' | 'queue-assignment'>('welcome');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedDepartments, setSuggestedDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [assignedQueue, setAssignedQueue] = useState<PatientQueue | null>(null);
  console.log(selectedDepartment,isAnalyzing);
  const recognitionRef = useRef<any>(null);

  // Mock patient data from QR scan
  const patientData = location.state?.patient || {
    name: "นายสมชาย ใจดี",
    id: "1234567890123",
    phone: "081-234-5678"
  };

  // Department data with AI matching keywords
  const departments: Department[] = [
    {
      id: 'internal',
      name: 'แผนกอายุรกรรม',
      keywords: ['ปวดท้อง', 'ท้องเสีย', 'ไข้', 'หวัด', 'ไอ', 'เบาหวาน', 'ความดัน', 'หัวใจ', 'ตับ', 'ไต', 'ปวดหัว', 'เหนื่อย', 'อ่อนเพลีย'],
      description: 'โรคทั่วไป โรคเรื้อรัง',
      room: 'ห้อง 201-205',
      color: 'blue'
    },
    {
      id: 'surgery',
      name: 'แผนกศัลยกรรม',
      keywords: ['ปวดท้อง', 'ก้อน', 'บาดแผล', 'แผล', 'ผ่าตัด', 'ไส้ติ่ง', 'นิ่ว', 'ฝี', 'บวม', 'แข็ง'],
      description: 'ผ่าตัด บาดแผล',
      room: 'ห้อง 301-305',
      color: 'red'
    },
    {
      id: 'orthopedic',
      name: 'แผนกกระดูก',
      keywords: ['ปวดหลัง', 'ปวดคอ', 'ปวดเข่า', 'ปวดไหล่', 'กระดูก', 'ข้อ', 'หัก', 'เคล็ด', 'ขัด', 'ล้ม', 'กล้ามเนื้อ'],
      description: 'กระดูก ข้อ กล้ามเนื้อ',
      room: 'ห้อง 401-403',
      color: 'orange'
    },
    {
      id: 'pediatric',
      name: 'แผนกเด็ก',
      keywords: ['เด็ก', 'ลูก', 'หลาน', 'ไข้', 'ท้องเสีย', 'อาเจียน', 'ผื่น', 'แพ้', 'วัคซีน', 'ตรวจพัฒนาการ'],
      description: 'เด็กและวัยรุ่น',
      room: 'ห้อง 501-503',
      color: 'pink'
    },
    {
      id: 'dermatology',
      name: 'แผนกผิวหนัง',
      keywords: ['ผื่น', 'คัน', 'แพ้', 'สิว', 'ผิวหนัง', 'เล็บ', 'ผม', 'ตกผม', 'รอยดำ', 'ฝ้า', 'กระ'],
      description: 'ผิวหนัง เล็บ ผม',
      room: 'ห้อง 601-602',
      color: 'green'
    },
    {
      id: 'ophthalmology',
      name: 'แผนกตา',
      keywords: ['ตา', 'มองไม่ชัด', 'ตาแดง', 'ตาเจ็บ', 'แสงแปลก', 'มองเบลอ', 'แว่น', 'ต้อกระจก', 'ต้อหิน'],
      description: 'โรคตา การมองเห็น',
      room: 'ห้อง 701-702',
      color: 'purple'
    },
    {
      id: 'ent',
      name: 'แผนกหู คอ จมูก',
      keywords: ['หู', 'คอ', 'จมูก', 'เจ็บคอ', 'หูอื้อ', 'หูตึง', 'เสียงแหบ', 'จมูกอุด', 'เลือดกำเดา', 'ไซนัส'],
      description: 'หู คอ จมูก',
      room: 'ห้อง 801-802',
      color: 'teal'
    }
  ];

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'th-TH';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const analyzeSymptoms = async () => {
    const inputText = inputMode === 'voice' ? transcript : manualInput;
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setCurrentStep('analysis');

    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simple keyword matching algorithm
    const scores = departments.map(dept => {
      const matches = dept.keywords.filter(keyword => 
        inputText.toLowerCase().includes(keyword.toLowerCase())
      );
      return {
        department: dept,
        score: matches.length,
        matchedKeywords: matches
      };
    });

    // Sort by score and get top 3
    const topDepartments = scores
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.department);

    // If no matches, suggest internal medicine as default
    if (topDepartments.length === 0) {
      topDepartments.push(departments.find(d => d.id === 'internal')!);
    }

    setSuggestedDepartments(topDepartments);
    setIsAnalyzing(false);
    setCurrentStep('department-selection');
  };

  const selectDepartment = (department: Department) => {
    setSelectedDepartment(department);
    
    // Generate queue number
    const queueNumber = `${department.id.charAt(0).toUpperCase()}${String(Math.floor(Math.random() * 99) + 1).padStart(3, '0')}`;
    
    // Assign queue
    const queue: PatientQueue = {
      queueNumber,
      department: department.name,
      room: department.room,
      estimatedTime: `${Math.floor(Math.random() * 30) + 15}-${Math.floor(Math.random() * 30) + 30} นาที`,
      patientName: patientData.name,
      appointmentType: 'Walk-in'
    };

    setAssignedQueue(queue);
    setCurrentStep('queue-assignment');
  };

  const handleStartProcess = () => {
    setCurrentStep('voice-input');
  };

  const handleContinue = () => {
    navigate('/screening/queue-status', {
      state: {
        queue: assignedQueue,
        patient: patientData,
        symptoms: inputMode === 'voice' ? transcript : manualInput
      }
    });
  };

  const getCurrentInput = () => {
    return inputMode === 'voice' ? transcript : manualInput;
  };

  // Welcome Step - Mobile Optimized
  if (currentStep === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex flex-col px-4 py-6 safe-area-inset">
        {/* Header - Compact */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-xl mb-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">SM</h1>
          <p className="text-sm text-white/90">SMART PATIENT</p>
        </div>

        {/* Welcome Message - Compact */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-2">ยินดีต้อนรับ</h2>
          <p className="text-white/80 text-sm leading-relaxed">
            {patientData.name}
            <br />
            QR Code ได้รับการยืนยันแล้ว
          </p>
        </div>

        {/* Patient Info - Compact Card */}
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-6 mx-auto w-full max-w-sm">
          <div className="text-white/90 text-xs mb-2 text-center">ข้อมูลผู้ป่วย</div>
          <div className="text-white text-center space-y-1">
            <div className="font-bold">{patientData.name}</div>
            <div className="text-xs text-white/80">เลขบัตร: {patientData.id}</div>
            <div className="text-xs text-white/80">โทร: {patientData.phone}</div>
          </div>
        </div>

        {/* Start Button - Mobile Friendly */}
        <div className="flex-1 flex flex-col justify-center">
          <button
            onClick={handleStartProcess}
            className="w-full bg-white text-blue-600 font-bold py-4 px-6 rounded-xl shadow-xl active:scale-95 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span>เริ่มต้นการใช้งาน</span>
          </button>
          <p className="text-white/60 text-xs text-center mt-3">
            แตะเพื่อบอกอาการและรับคิว
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-white/40 text-xs">Version 1.0.0</p>
        </div>
      </div>
    );
  }

   // Voice Input Step - Mobile Optimized with Text Input Option
  if (currentStep === 'voice-input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex flex-col px-4 py-6 safe-area-inset">
        {/* Header - Compact */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg mb-2">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">บอกอาการของคุณ</h1>
          <p className="text-white/80 text-sm">พูดหรือพิมพ์อาการที่รู้สึก</p>
        </div>

        {/* Input Mode Toggle */}
        <div className="flex bg-white/20 rounded-lg p-1 mb-4">
          <button
            onClick={() => setInputMode('voice')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              inputMode === 'voice' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-white/80'
            }`}
          >
            🎤 พูด (แนะนำ)
          </button>
          <button
            onClick={() => setInputMode('text')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              inputMode === 'text' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-white/80'
            }`}
          >
            ⌨️ พิมพ์
          </button>
        </div>

        {/* Voice Input Mode */}
        {inputMode === 'voice' && (
          <>
            {/* Microphone Button - Large and Touch Friendly */}
            <div className="flex-1 flex flex-col items-center justify-center mb-6">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 ${
                  isListening 
                    ? 'bg-red-500 animate-pulse' 
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <svg 
                  className={`w-16 h-16 ${isListening ? 'text-white' : 'text-purple-600'}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
              
              <p className={`mt-4 text-center font-medium ${
                isListening ? 'text-white' : 'text-white/80'
              }`}>
                {isListening ? 'กำลังฟัง...' : 'แตะเพื่อพูด'}
              </p>
              
              {isListening && (
                <div className="flex space-x-1 mt-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
                </div>
              )}
            </div>

            {/* Voice Result Display */}
            {transcript && (
              <div className="bg-white/90 rounded-xl p-4 mb-4">
                <p className="text-gray-800 text-sm leading-relaxed">{transcript}</p>
              </div>
            )}
          </>
        )}

        {/* Text Input Mode */}
        {inputMode === 'text' && (
          <div className="flex-1 flex flex-col mb-6">
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 text-xs">
                💡 แนะนำให้ใช้การพูดเพื่อความแม่นยำ แต่สามารถพิมพ์ได้หากจำเป็น
              </p>
            </div>
            
            <textarea
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="พิมพ์อาการที่รู้สึก เช่น ปวดหัว ไข้ ปวดท้อง..."
              className="flex-1 min-h-32 p-4 rounded-xl border-0 resize-none text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              rows={6}
            />
          </div>
        )}

        {/* Example Symptoms - Compact */}
        <div className="bg-white/10 rounded-lg p-3 mb-4">
          <p className="text-white/90 text-xs font-medium mb-2">ตัวอย่าง:</p>
          <div className="flex flex-wrap gap-2">
            {['ปวดหัว', 'ไข้', 'ปวดท้อง', 'ไอ', 'ปวดหลัง'].map((symptom) => (
              <button
                key={symptom}
                onClick={() => {
                  if (inputMode === 'voice') {
                    setTranscript(symptom);
                  } else {
                    setManualInput(symptom);
                  }
                }}
                className="bg-white/20 text-white text-xs px-3 py-1 rounded-full active:scale-95 transition-all"
              >
                {symptom}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons - Mobile Optimized */}
        <div className="flex space-x-3">
          <button
            onClick={() => setCurrentStep('welcome')}
            className="flex-1 bg-gray-500 text-white font-bold py-3 px-4 rounded-xl active:scale-95 transition-all"
          >
            ย้อนกลับ
          </button>
          <button
            onClick={analyzeSymptoms}
            disabled={!getCurrentInput().trim()}
            className={`flex-2 font-bold py-3 px-6 rounded-xl transition-all active:scale-95 ${
              getCurrentInput().trim()
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-gray-400 text-gray-600 cursor-not-allowed'
            }`}
          >
            วิเคราะห์อาการ
          </button>
        </div>
      </div>
    );
  }

  // Analysis Step - Mobile Optimized
  if (currentStep === 'analysis') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex flex-col items-center justify-center px-4 py-6">
        <div className="text-center">
          {/* Loading Animation */}
          <div className="w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">กำลังวิเคราะห์</h2>
          <p className="text-white/80 text-sm mb-8">AI กำลังประมวลผลอาการของคุณ</p>
          
          {/* Progress Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2 text-white/90">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm">รับข้อมูลอาการ</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-white/90">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-sm">วิเคราะห์และจับคู่แผนก</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-white/60">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm">แนะนำแผนกที่เหมาะสม</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Department Selection Step - Mobile Optimized
  if (currentStep === 'department-selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex flex-col px-4 py-6 safe-area-inset">
        {/* Header - Compact */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg mb-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white mb-1">แผนกที่แนะนำ</h1>
          <p className="text-white/80 text-sm">เลือกแผนกที่ต้องการรับบริการ</p>
        </div>

        {/* Symptoms Summary - Compact */}
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 mb-4">
          <p className="text-white/90 text-xs font-medium mb-1">อาการที่บอก:</p>
          <p className="text-white text-sm">{getCurrentInput()}</p>
        </div>

        {/* Suggested Departments - Mobile Optimized */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            {suggestedDepartments.map((dept, index) => (
              <div
                key={dept.id}
                onClick={() => selectDepartment(dept)}
                className={`bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg active:scale-95 transition-all cursor-pointer border-2 ${
                  index === 0 ? 'border-green-400 bg-green-50/95' : 'border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      dept.color === 'blue' ? 'bg-blue-100' :
                      dept.color === 'red' ? 'bg-red-100' :
                      dept.color === 'orange' ? 'bg-orange-100' :
                      dept.color === 'pink' ? 'bg-pink-100' :
                      dept.color === 'green' ? 'bg-green-100' :
                      dept.color === 'purple' ? 'bg-purple-100' :
                      dept.color === 'teal' ? 'bg-teal-100' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-4 h-4 ${
                        dept.color === 'blue' ? 'text-blue-600' :
                        dept.color === 'red' ? 'text-red-600' :
                        dept.color === 'orange' ? 'text-orange-600' :
                        dept.color === 'pink' ? 'text-pink-600' :
                        dept.color === 'green' ? 'text-green-600' :
                        dept.color === 'purple' ? 'text-purple-600' :
                        dept.color === 'teal' ? 'text-teal-600' : 'text-gray-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{dept.name}</h4>
                      <p className="text-gray-600 text-xs">{dept.description}</p>
                    </div>
                  </div>
                  
                                   {index === 0 && (
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      แนะนำ
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{dept.room}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-4">
          <button
            onClick={() => setCurrentStep('voice-input')}
            className="flex-1 bg-gray-500 text-white font-bold py-3 px-4 rounded-xl active:scale-95 transition-all"
          >
            บอกอาการใหม่
          </button>
        </div>
      </div>
    );
  }

  // Queue Assignment Step - Mobile Optimized
  if (currentStep === 'queue-assignment') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex flex-col px-4 py-6 safe-area-inset">
        {/* Header - Compact */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg mb-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white mb-1">ได้รับคิวแล้ว</h1>
          <p className="text-white/80 text-sm">กรุณาจำหมายเลขคิวนี้</p>
        </div>

        {/* Queue Number - Prominent Display */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 mb-4 text-center shadow-xl">
          <p className="text-white/80 text-sm mb-2">หมายเลขคิวของคุณ</p>
          <div className="text-4xl font-bold text-white mb-2">{assignedQueue?.queueNumber}</div>
          <p className="text-white/90 text-sm">กรุณาจำหมายเลขนี้</p>
        </div>

        {/* Patient & Department Info - Compact Cards */}
        <div className="space-y-3 mb-4 flex-1 overflow-y-auto">
          {/* Patient Info */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-bold text-gray-800 text-sm">ข้อมูลผู้ป่วย</span>
            </div>
            <div className="text-gray-700 text-sm space-y-1">
              <p><span className="font-medium">ชื่อ:</span> {assignedQueue?.patientName}</p>
              <p><span className="font-medium">ประเภท:</span> {assignedQueue?.appointmentType}</p>
            </div>
          </div>

          {/* Department Info */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-bold text-gray-800 text-sm">ข้อมูลการรับบริการ</span>
            </div>
            <div className="text-gray-700 text-sm space-y-1">
              <p><span className="font-medium">แผนก:</span> {assignedQueue?.department}</p>
              <p><span className="font-medium">ห้อง:</span> {assignedQueue?.room}</p>
              <p><span className="font-medium">เวลารอ:</span> {assignedQueue?.estimatedTime}</p>
            </div>
          </div>

          {/* Symptoms Summary */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-bold text-gray-800 text-sm">อาการที่บอก</span>
            </div>
            <p className="text-gray-700 text-sm">{getCurrentInput()}</p>
          </div>

          {/* Instructions - Compact */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-bold text-yellow-800 text-sm">คำแนะนำ</span>
            </div>
            <ul className="space-y-1 text-yellow-800 text-xs">
              <li>• ไปที่ {assignedQueue?.department} {assignedQueue?.room}</li>
              <li>• รอการเรียกคิว {assignedQueue?.queueNumber}</li>
              <li>• เตรียมบัตรประชาชนและเอกสาร</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons - Mobile Optimized */}
        <div className="space-y-3">
          <button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-4 px-6 rounded-xl shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span>ไปหน้ารอคิว</span>
          </button>
          
          {/* Alternative Actions - Compact */}
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setCurrentStep('voice-input');
                setTranscript('');
                setManualInput('');
                setSuggestedDepartments([]);
                setSelectedDepartment(null);
                setAssignedQueue(null);
              }}
              className="flex-1 bg-orange-500 text-white font-bold py-2 px-3 rounded-lg active:scale-95 transition-all text-sm"
            >
              บอกอาการใหม่
            </button>
            <button
              onClick={() => setCurrentStep('department-selection')}
              className="flex-1 bg-purple-500 text-white font-bold py-2 px-3 rounded-lg active:scale-95 transition-all text-sm"
            >
              เลือกแผนกใหม่
            </button>
          </div>
        </div>

        {/* Emergency Contact - Compact */}
        <div className="text-center mt-3">
          <p className="text-white/60 text-xs">
            กรณีฉุกเฉิน โทร <span className="font-bold">1669</span>
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default Welcome;
