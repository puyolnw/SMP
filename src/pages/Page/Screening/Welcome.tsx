import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';

import { TableSchema } from '../../../types/Debug';

interface PatientQueue {
  queueNumber?: string;
  department?: string;
  room?: string;
  estimatedTime?: string;
  patientName?: string;
  appointmentType?: string;
  building?: string;
  floor?: string;
  currentQueue?: string;
  totalWaiting?: number;
  status: 'waiting' | 'ready' | 'missed' | 'completed';
  symptoms?: string;
  // เพิ่ม field ที่ backend ส่งมา
  queue_no?: string;
  queue_time?: string;
  triage_level?: number;
  priority?: number;
  room_id?: string;
  vital_signs?: any;
  // สำหรับ UI เดิม
  id?: string;
  patientId?: string;
  created_at?: string;
}

interface PatientData {
  id: string;
  name: string;
  nationalId: string;
  phone?: string;
  profileImage?: string;
}


const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Debug setup
  const requiredTables: TableSchema[] = useMemo(() => [
    {
   
      tableName: 'queues',
      columns: ['id', 'patientId', 'departmentId', 'roomId', 'queueNumber', 'status', 'timestamp'],
      description: 'ข้อมูลคิว'
    } 
   
  ], []);
console.log(requiredTables)

  const [currentStep, setCurrentStep] = useState<'queue-display' | 'completed'>('queue-display');
  const [assignedQueue, setAssignedQueue] = useState<PatientQueue | null>(null);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [symptoms, setSymptoms] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingBefore, setWaitingBefore] = useState<number>(0);
  const [roomSchedule, setRoomSchedule] = useState<any>(null);
  const [roomMaster, setRoomMaster] = useState<any>(null);

  // รับ token/queue_id จาก query string
  const token = searchParams.get('token');
  const queueId = searchParams.get('queue_id');
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  // เพิ่มฟังก์ชันแปลงข้อมูลคิวให้รองรับ field name จาก backend
  function mapQueueData(raw: any): PatientQueue {
    return {
      id: raw._id || raw.id,
      patientId: raw.patient_id,
      triage_level: raw.triage_level,
      vital_signs: raw.vital_signs,
      created_at: raw.created_at,
      queue_no: raw.queue_no,
      queue_time: raw.queue_time,
      status: raw.status,
      priority: raw.priority,
      room_id: raw.room_id,
      symptoms: raw.symptoms,
      // สำหรับ UI เดิม
      queueNumber: raw.queue_no,
      department: raw.department,
      room: raw.room,
      estimatedTime: raw.estimatedTime,
      patientName: raw.patientName,
      appointmentType: raw.appointmentType,
      building: raw.building,
      floor: raw.floor,
      currentQueue: raw.currentQueue,
      totalWaiting: raw.totalWaiting,
    };
  }
  // ใน useEffect ที่ fetch ข้อมูลคิว ให้ map ข้อมูลด้วยฟังก์ชันนี้
  useEffect(() => {
    if (token && queueId) {
      setLoading(true);
      setError(null);
      // ลอง fetch จาก /queue_with_room/<queue_id> เพื่อ join ข้อมูลห้องด้วย
      axios.get(`${API_BASE_URL}/api/queue/queue/${queueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          console.log('Raw backend response:', res.data); // <<<<< เพิ่ม log ตรงนี้
          const q = res.data.queue ? mapQueueData(res.data.queue) : null;
          setAssignedQueue(q);
          // Map patient fields (ถ้ามี)
          const p = res.data.patient;
          if (p) {
            setPatientData({
              id: p._id,
              name: (p.first_name_th || '') + ' ' + (p.last_name_th || ''),
              nationalId: p.national_id || '',
              phone: p.phone || '',
              profileImage: p.image_path ? `${API_BASE_URL}/api/patient/${p.image_path}` : undefined
            });
          } else {
            setPatientData(null);
          }
          setSymptoms(q?.symptoms || '');
          setWaitingBefore(res.data.waiting_before ?? 0);
          // set roomSchedule, roomMaster ถ้ามีข้อมูล
          if (res.data.room_schedule) setRoomSchedule(res.data.room_schedule);
        })
        .catch(err => {
          setError('ไม่สามารถดึงข้อมูลคิวได้');
        })
        .finally(() => setLoading(false));
    } else if (location.state?.queue) {
      setAssignedQueue(mapQueueData(location.state.queue));
      setPatientData(location.state.patient);
      setSymptoms(location.state.symptoms || '');
      setWaitingBefore(0);
    }
  }, [token, queueId, location.state]);

  useEffect(() => {
    if (assignedQueue?.room_id) {
      axios.get(`${API_BASE_URL}/api/workplace/room_schedule/${assignedQueue.room_id}`)
        .then(res => {
          setRoomSchedule(res.data);
          if (res.data.roomId) {
            axios.get(`${API_BASE_URL}/api/workplace/room/${res.data.roomId}`)
              .then(r2 => setRoomMaster(r2.data))
              .catch(() => setRoomMaster(null));
          } else {
            setRoomMaster(null);
          }
        })
        .catch(() => setRoomSchedule(null));
    } else {
      setRoomSchedule(null);
      setRoomMaster(null);
    }
  }, [assignedQueue?.room_id]);

  // Handle queue completion
  const handleCompleteQueue = () => {
    setCurrentStep('completed');
  };

  // Handle new queue (กลับไปหน้าคัดกรอง)
  const handleNewQueue = () => {
    navigate('/screening');
  };

  // Get current time
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Queue Display Step
  if (currentStep === 'queue-display') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex flex-col px-4 py-6 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-10 right-10 w-20 h-20 bg-white/10 rounded-full animate-bounce delay-500"></div>
          <div className="absolute bottom-20 left-10 w-16 h-16 bg-white/10 rounded-full animate-bounce delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full animate-pulse"></div>
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400/30 to-green-600/30 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl mb-4 border border-white/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">คิวของคุณ</h1>
            <p className="text-white/80 text-sm">ข้อมูลคิวจากการคัดกรองด้วย AI</p>
          </div>

          {/* Success Banner */}
          <div className="bg-green-100 border-2 border-green-300 rounded-2xl p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-green-800 font-bold text-lg">AI คัดกรองสำเร็จ!</p>
                <p className="text-green-700 text-sm">ระบบได้จัดคิวให้คุณเรียบร้อยแล้ว</p>
              </div>
            </div>
          </div>

          {/* Queue Number Display */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-3xl p-8 mb-6 text-center shadow-2xl border border-white/30">
            <p className="text-white/80 text-lg mb-3 font-medium">หมายเลขคิวของคุณ</p>
            <div className="text-6xl font-black text-white mb-4 tracking-wider drop-shadow-lg">
              {assignedQueue?.queue_no || 'A001'}
            </div>
            <div className="flex items-center justify-center space-x-6 text-white/90 text-sm">
              <div className="flex items-center bg-white/20 rounded-full px-3 py-1">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{assignedQueue?.estimatedTime || '15-20 นาที'}</span>
              </div>
              <div className="flex items-center bg-white/20 rounded-full px-3 py-1">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>รอ {waitingBefore} คน</span>
              </div>
            </div>
          </div>

          {/* Information Cards */}
          <div className="space-y-4 mb-6 flex-1 overflow-y-auto">
            {/* Department Info */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/30">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-xl">{roomMaster?.department || roomSchedule?.room_type || 'แผนกทั่วไป'}</h3>
                  <p className="text-gray-600 text-sm">แผนกที่ AI แนะนำ</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-600 mb-1 font-medium">ตำแหน่ง</p>
                  <p className="text-gray-800 font-semibold">{roomMaster?.building || '-'}</p>
                  <p className="text-gray-800 font-semibold">{roomMaster?.floor || '-'}</p>
                  <p className="text-gray-800 font-semibold">{roomMaster?.name || roomSchedule?.roomId || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-600 mb-1 font-medium">เวลาเปิด-ปิด</p>
                  <p className="text-gray-800 font-semibold">{roomSchedule?.openTime || '-'} - {roomSchedule?.closeTime || '-'}</p>
                  <p className="text-gray-800 font-semibold">วันที่: {roomSchedule?.date || '-'}</p>
                </div>
              </div>
            </div>

            {/* Patient Info */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/30">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{patientData?.name || assignedQueue?.patientName || 'ผู้ป่วย'}</h3>
                  <p className="text-gray-600 text-sm">{assignedQueue?.appointmentType || 'Walk-in'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
                <p><span className="font-medium">เลขบัตร:</span> {patientData?.nationalId || 'ไม่ระบุ'}</p>
                <p><span className="font-medium">โทรศัพท์:</span> {patientData?.phone || 'ไม่ระบุ'}</p>
                <p><span className="font-medium">เวลา:</span> {getCurrentTime()}</p>
              </div>
            </div>

            {/* AI Analysis Results */}
            {symptoms && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/30">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">ผลการคัดกรองด้วย AI</h3>
                    <p className="text-gray-600 text-sm">อาการที่ระบบวิเคราะห์</p>
                  </div>
                </div>
                
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-gray-800 text-sm leading-relaxed">"{symptoms}"</p>
                  <div className="flex items-center mt-3 text-purple-600 text-sm">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>AI แนะนำแผนก: {assignedQueue?.department}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold text-yellow-800 text-lg">คำแนะนำสำคัญ</span>
              </div>
              <ul className="space-y-3 text-yellow-800 text-sm">
                <li className="flex items-start">
                  <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">1</span>
                  <span>ไปที่ <strong>{assignedQueue?.building || 'อาคาร A'} {assignedQueue?.floor || 'ชั้น 2'} {assignedQueue?.room || 'ห้อง 201'}</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">2</span>
                  <span>รอการเรียกคิวหมายเลข <strong>{assignedQueue?.queueNumber || 'A001'}</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">3</span>
                  <span>เตรียมบัตรประชาชนและเอกสารการรักษา</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">4</span>
                  <span>หากมีอาการเปลี่ยนแปลงหรือเร่งด่วน แจ้งเจ้าหน้าที่ทันที</span>
                </li>
              </ul>
            </div>
          </div>
            
          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Only keep the 'เสร็จสิ้น' button */}
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={handleCompleteQueue}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-2 border border-white/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>เสร็จสิ้น</span>
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

  // Completed Step
  if (currentStep === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex flex-col items-center justify-center px-4 py-6 relative overflow-hidden">
        {/* Celebration Background */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-4 h-4 bg-yellow-300 rounded-full animate-bounce delay-100"></div>
          <div className="absolute top-20 right-20 w-3 h-3 bg-pink-300 rounded-full animate-bounce delay-300"></div>
          <div className="absolute bottom-20 left-20 w-5 h-5 bg-blue-300 rounded-full animate-bounce delay-500"></div>
          <div className="absolute bottom-10 right-10 w-4 h-4 bg-purple-300 rounded-full animate-bounce delay-700"></div>
          <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-red-300 rounded-full animate-bounce delay-900"></div>
          <div className="absolute top-1/3 right-1/3 w-4 h-4 bg-orange-300 rounded-full animate-bounce delay-1100"></div>
          <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-indigo-300 rounded-full animate-bounce delay-1300"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center max-w-md mx-auto">
          {/* Success Animation */}
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border border-white/30">
              <svg className="w-16 h-16 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            {/* Celebration Rings */}
            <div className="absolute inset-0 w-32 h-32 mx-auto border-4 border-white/30 rounded-full animate-ping"></div>
            <div className="absolute inset-2 w-28 h-28 mx-auto border-4 border-white/20 rounded-full animate-ping delay-300"></div>
            <div className="absolute inset-4 w-24 h-24 mx-auto border-4 border-white/10 rounded-full animate-ping delay-600"></div>
          </div>
          
          {/* Success Message */}
          <h1 className="text-4xl font-black text-white mb-4 tracking-wide">
            🎉 เสร็จสิ้น! 🎉
          </h1>
          <h2 className="text-2xl font-bold text-white mb-6">
            ขอบคุณที่ใช้บริการ
          </h2>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/30">
            <p className="text-white/90 text-lg leading-relaxed mb-4">
              การรับบริการของคุณเสร็จสมบูรณ์แล้ว
            </p>
            <div className="space-y-2 text-white/80 text-sm">
              <p>✅ คิว: <span className="font-bold">{assignedQueue?.queueNumber || 'A001'}</span></p>
              <p>✅ แผนก: <span className="font-bold">{assignedQueue?.department || 'แผนกอายุรกรรม'}</span></p>
              <p>✅ ผู้ป่วย: <span className="font-bold">{patientData?.name || assignedQueue?.patientName || 'ผู้ป่วย'}</span></p>
              <p>✅ เวลาเสร็จสิ้น: <span className="font-bold">{getCurrentTime()}</span></p>
            </div>
          </div>

          {/* Rating Section */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-white/30">
            <h3 className="text-gray-800 font-bold text-lg mb-4">ให้คะแนนการบริการ</h3>
            <div className="flex justify-center space-x-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className="w-10 h-10 text-yellow-400 hover:text-yellow-500 transition-colors"
                >
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
            <p className="text-gray-600 text-sm">แตะดาวเพื่อให้คะแนน</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleNewQueue}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-3 border border-white/30"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>รับคิวใหม่</span>
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-xl hover:bg-white/30 transition-all border border-white/30"
            >
              กลับหน้าหลัก
            </button>
          </div>

          {/* Thank You Message */}
          <div className="mt-8 space-y-3">
            <p className="text-white/80 text-lg font-medium">
              ขอบคุณที่ไว้วางใจ
            </p>
            <p className="text-white/60 text-sm">
              Smart Medical AI System
            </p>
            <div className="flex justify-center space-x-4 text-white/50 text-xs">
              <span>🏥 โรงพยาบาลคุณภาพ</span>
              <span>⭐ บริการเป็นเลิศ</span>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
          <div className="text-4xl animate-bounce delay-200">🎊</div>
        </div>
        <div className="absolute bottom-32 left-1/4">
          <div className="text-3xl animate-bounce delay-400">🎈</div>
        </div>
        <div className="absolute bottom-32 right-1/4">
          <div className="text-3xl animate-bounce delay-600">🎁</div>
        </div>
      </div>
    );
  }

  // Debug panel (dev only)
  const DebugPanel = () => (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, background: 'rgba(255,255,255,0.97)', border: '1px solid #ddd', borderRadius: 8, padding: 16, maxWidth: 400, maxHeight: '80vh', overflow: 'auto', fontSize: 12 }}>
      <div style={{ fontWeight: 'bold', color: '#b91c1c', marginBottom: 8 }}>DEBUG PANEL</div>
      <div><b>assignedQueue:</b><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(assignedQueue, null, 2)}</pre></div>
      <div><b>patientData:</b><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(patientData, null, 2)}</pre></div>
      <div><b>roomSchedule:</b><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(roomSchedule, null, 2)}</pre></div>
      <div><b>roomMaster:</b><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(roomMaster, null, 2)}</pre></div>
      <div><b>waitingBefore:</b> {waitingBefore}</div>
      <div><b>error:</b> {error}</div>
      <div><b>loading:</b> {String(loading)}</div>
      <div><b>token:</b> {token}</div>
      <div><b>queueId:</b> {queueId}</div>
    </div>
  );

  return (
    <>
      {import.meta.env.MODE === 'development' && <DebugPanel />}
      {currentStep === 'queue-display' && (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex flex-col px-4 py-6 relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0">
            <div className="absolute top-10 right-10 w-20 h-20 bg-white/10 rounded-full animate-bounce delay-500"></div>
            <div className="absolute bottom-20 left-10 w-16 h-16 bg-white/10 rounded-full animate-bounce delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full animate-pulse"></div>
          </div>

          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400/30 to-green-600/30 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl mb-4 border border-white/30">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">คิวของคุณ</h1>
              <p className="text-white/80 text-sm">ข้อมูลคิวจากการคัดกรองด้วย AI</p>
            </div>

            {/* Success Banner */}
            <div className="bg-green-100 border-2 border-green-300 rounded-2xl p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-green-800 font-bold text-lg">AI คัดกรองสำเร็จ!</p>
                  <p className="text-green-700 text-sm">ระบบได้จัดคิวให้คุณเรียบร้อยแล้ว</p>
                </div>
              </div>
            </div>

            {/* Queue Number Display */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-3xl p-8 mb-6 text-center shadow-2xl border border-white/30">
              <p className="text-white/80 text-lg mb-3 font-medium">หมายเลขคิวของคุณ</p>
              <div className="text-6xl font-black text-white mb-4 tracking-wider drop-shadow-lg">
                {assignedQueue?.queue_no || 'A001'}
              </div>
              <div className="flex items-center justify-center space-x-6 text-white/90 text-sm">
                <div className="flex items-center bg-white/20 rounded-full px-3 py-1">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{assignedQueue?.estimatedTime || '15-20 นาที'}</span>
                </div>
                <div className="flex items-center bg-white/20 rounded-full px-3 py-1">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>รอ {waitingBefore} คน</span>
                </div>
              </div>
            </div>

            {/* Information Cards */}
            <div className="space-y-4 mb-6 flex-1 overflow-y-auto">
              {/* Department Info */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/30">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-xl">{roomMaster?.department || roomSchedule?.room_type || 'แผนกทั่วไป'}</h3>
                    <p className="text-gray-600 text-sm">แผนกที่ AI แนะนำ</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-600 mb-1 font-medium">ตำแหน่ง</p>
                    <p className="text-gray-800 font-semibold">{roomMaster?.building || '-'}</p>
                    <p className="text-gray-800 font-semibold">{roomMaster?.floor || '-'}</p>
                    <p className="text-gray-800 font-semibold">{roomMaster?.name || roomSchedule?.roomId || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-600 mb-1 font-medium">เวลาเปิด-ปิด</p>
                    <p className="text-gray-800 font-semibold">{roomSchedule?.openTime || '-'} - {roomSchedule?.closeTime || '-'}</p>
                    <p className="text-gray-800 font-semibold">วันที่: {roomSchedule?.date || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Patient Info */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/30">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{patientData?.name || assignedQueue?.patientName || 'ผู้ป่วย'}</h3>
                    <p className="text-gray-600 text-sm">{assignedQueue?.appointmentType || 'Walk-in'}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
                  <p><span className="font-medium">เลขบัตร:</span> {patientData?.nationalId || 'ไม่ระบุ'}</p>
                  <p><span className="font-medium">โทรศัพท์:</span> {patientData?.phone || 'ไม่ระบุ'}</p>
                  <p><span className="font-medium">เวลา:</span> {getCurrentTime()}</p>
                </div>
              </div>

              {/* AI Analysis Results */}
              {symptoms && (
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/30">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">ผลการคัดกรองด้วย AI</h3>
                      <p className="text-gray-600 text-sm">อาการที่ระบบวิเคราะห์</p>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-gray-800 text-sm leading-relaxed">"{symptoms}"</p>
                    <div className="flex items-center mt-3 text-purple-600 text-sm">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>AI แนะนำแผนก: {assignedQueue?.department}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-bold text-yellow-800 text-lg">คำแนะนำสำคัญ</span>
                </div>
                <ul className="space-y-3 text-yellow-800 text-sm">
                  <li className="flex items-start">
                    <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">1</span>
                    <span>ไปที่ <strong>{assignedQueue?.building || 'อาคาร A'} {assignedQueue?.floor || 'ชั้น 2'} {assignedQueue?.room || 'ห้อง 201'}</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">2</span>
                    <span>รอการเรียกคิวหมายเลข <strong>{assignedQueue?.queueNumber || 'A001'}</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">3</span>
                    <span>เตรียมบัตรประชาชนและเอกสารการรักษา</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">4</span>
                    <span>หากมีอาการเปลี่ยนแปลงหรือเร่งด่วน แจ้งเจ้าหน้าที่ทันที</span>
                  </li>
                </ul>
              </div>
            </div>
              
            {/* Action Buttons */}
            <div className="space-y-4">
              {/* Only keep the 'เสร็จสิ้น' button */}
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={handleCompleteQueue}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-2 border border-white/30"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>เสร็จสิ้น</span>
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
      )}
      {currentStep === 'completed' && (
        <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex flex-col items-center justify-center px-4 py-6 relative overflow-hidden">
          {/* Celebration Background */}
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-4 h-4 bg-yellow-300 rounded-full animate-bounce delay-100"></div>
            <div className="absolute top-20 right-20 w-3 h-3 bg-pink-300 rounded-full animate-bounce delay-300"></div>
            <div className="absolute bottom-20 left-20 w-5 h-5 bg-blue-300 rounded-full animate-bounce delay-500"></div>
            <div className="absolute bottom-10 right-10 w-4 h-4 bg-purple-300 rounded-full animate-bounce delay-700"></div>
            <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-red-300 rounded-full animate-bounce delay-900"></div>
            <div className="absolute top-1/3 right-1/3 w-4 h-4 bg-orange-300 rounded-full animate-bounce delay-1100"></div>
            <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-indigo-300 rounded-full animate-bounce delay-1300"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 text-center max-w-md mx-auto">
            {/* Success Animation */}
            <div className="relative mb-8">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border border-white/30">
                <svg className="w-16 h-16 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              {/* Celebration Rings */}
              <div className="absolute inset-0 w-32 h-32 mx-auto border-4 border-white/30 rounded-full animate-ping"></div>
              <div className="absolute inset-2 w-28 h-28 mx-auto border-4 border-white/20 rounded-full animate-ping delay-300"></div>
              <div className="absolute inset-4 w-24 h-24 mx-auto border-4 border-white/10 rounded-full animate-ping delay-600"></div>
            </div>
            
            {/* Success Message */}
            <h1 className="text-4xl font-black text-white mb-4 tracking-wide">
              🎉 เสร็จสิ้น! 🎉
            </h1>
            <h2 className="text-2xl font-bold text-white mb-6">
              ขอบคุณที่ใช้บริการ
            </h2>
            
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/30">
              <p className="text-white/90 text-lg leading-relaxed mb-4">
                การรับบริการของคุณเสร็จสมบูรณ์แล้ว
              </p>
              <div className="space-y-2 text-white/80 text-sm">
                <p>✅ คิว: <span className="font-bold">{assignedQueue?.queueNumber || 'A001'}</span></p>
                <p>✅ แผนก: <span className="font-bold">{assignedQueue?.department || 'แผนกอายุรกรรม'}</span></p>
                <p>✅ ผู้ป่วย: <span className="font-bold">{patientData?.name || assignedQueue?.patientName || 'ผู้ป่วย'}</span></p>
                <p>✅ เวลาเสร็จสิ้น: <span className="font-bold">{getCurrentTime()}</span></p>
              </div>
            </div>

            {/* Rating Section */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-white/30">
              <h3 className="text-gray-800 font-bold text-lg mb-4">ให้คะแนนการบริการ</h3>
              <div className="flex justify-center space-x-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className="w-10 h-10 text-yellow-400 hover:text-yellow-500 transition-colors"
                  >
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <p className="text-gray-600 text-sm">แตะดาวเพื่อให้คะแนน</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={handleNewQueue}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-3 border border-white/30"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>รับคิวใหม่</span>
              </button>
              
              <button
                onClick={() => navigate('/')}
                className="w-full bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-xl hover:bg-white/30 transition-all border border-white/30"
              >
                กลับหน้าหลัก
              </button>
            </div>

            {/* Thank You Message */}
            <div className="mt-8 space-y-3">
              <p className="text-white/80 text-lg font-medium">
                ขอบคุณที่ไว้วางใจ
              </p>
              <p className="text-white/60 text-sm">
                Smart Medical AI System
              </p>
              <div className="flex justify-center space-x-4 text-white/50 text-xs">
                <span>🏥 โรงพยาบาลคุณภาพ</span>
                <span>⭐ บริการเป็นเลิศ</span>
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
            <div className="text-4xl animate-bounce delay-200">🎊</div>
          </div>
          <div className="absolute bottom-32 left-1/4">
            <div className="text-3xl animate-bounce delay-400">🎈</div>
          </div>
          <div className="absolute bottom-32 right-1/4">
            <div className="text-3xl animate-bounce delay-600">🎁</div>
          </div>
        </div>
      )}
    </>
  );
};

export default Welcome;