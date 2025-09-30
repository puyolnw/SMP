import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';

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
  status: 'waiting' | 'ready' | 'missed' | 'completed' | 'skipped' | 'in_progress' | 'cancelled';
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
  completed_at?: string;
  wait_time?: number;
  // ข้อมูลรายละเอียดเพิ่มเติม - จาก DataPatient.tsx
  room_name?: string;
  department_name?: string;
  building_name?: string;
  floor_name?: string;
  room_schedule?: any;
  room_master?: any;
  department_info?: any;
  building_info?: any;
  floor_info?: any;
  _id?: string;
  // เพิ่ม fields สำหรับ logs และ actions
  logs?: Array<{
    action: string;
    details?: any;
    timestamp?: string;
    user_type?: string;
  }>;
  actions?: {
    created?: any;
    called?: any;
    completed?: any;
    skipped?: any;
    priority_changed?: any[];
    room_changed?: any[];
  };
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

  const [currentStep, setCurrentStep] = useState<'queue-display' | 'completed'>('queue-display');
  const [assignedQueue, setAssignedQueue] = useState<PatientQueue | null>(null);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [symptoms, setSymptoms] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingBefore, setWaitingBefore] = useState<number>(0);
  const [showSkippedAlert, setShowSkippedAlert] = useState(false);
  const [loadingRoomDetails, setLoadingRoomDetails] = useState(false); // เพิ่ม loading state สำหรับข้อมูลห้อง
  
  // เพิ่ม state สำหรับข้อมูลห้อง
  const [roomSchedule, setRoomSchedule] = useState<any>(null);
  const [roomMaster, setRoomMaster] = useState<any>(null);
  const [departmentInfo, setDepartmentInfo] = useState<any>(null);
  const [buildingInfo, setBuildingInfo] = useState<any>(null);
  const [floorInfo, setFloorInfo] = useState<any>(null);
  
  // เพิ่ม state สำหรับระบบแจ้งเตือนและประวัติ
  const [showQueueReadyAlert, setShowQueueReadyAlert] = useState(false);
  const [showQueueCompletedAlert, setShowQueueCompletedAlert] = useState(false);
  const [queueHistory, setQueueHistory] = useState<PatientQueue[]>([]);

  // เพิ่ม state สำหรับการจัดการคิวใหม่
  const [showCancelQueueModal, setShowCancelQueueModal] = useState(false);
  const [hasActiveQueue, setHasActiveQueue] = useState(false);
  const [queueActionLoading, setQueueActionLoading] = useState(false);
  


  // รับ token/queue_id จาก query string
  const token = searchParams.get('token');
  const queueId = searchParams.get('queue_id');
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  // ฟังก์ชันดึงข้อมูลห้องแบบครบ
  const fetchRoomDetails = async (roomId: string) => {
    if (!roomId) return { roomSchedule: null, roomMaster: null, departmentInfo: null, buildingInfo: null, floorInfo: null };
    
    setLoadingRoomDetails(true);
    let roomSchedule = null;
    let roomMaster = null;
    let departmentInfo = null;
    let buildingInfo = null;
    let floorInfo = null;
    
    try {
      // ดึงข้อมูล room_schedule
      const roomScheduleRes = await axios.get(`${API_BASE_URL}/api/workplace/room_schedule/${roomId}`);
      roomSchedule = roomScheduleRes.data;
      
      // ดึงข้อมูล room master ถ้ามี roomId
      if (roomSchedule?.roomId) {
        try {
          const roomRes = await axios.get(`${API_BASE_URL}/api/workplace/room/${roomSchedule.roomId}`);
          roomMaster = roomRes.data;
          
          // ดึงข้อมูลแผนกถ้ามี departmentId
          if (roomMaster?.departmentId) {
            try {
              const deptRes = await axios.get(`${API_BASE_URL}/api/workplace/department/${roomMaster.departmentId}`);
              departmentInfo = deptRes.data;
            } catch (err) {
              console.warn(`[WARN] Failed to fetch department ${roomMaster.departmentId}:`, err);
              // สร้างข้อมูล fallback
              departmentInfo = {
                id: roomMaster.departmentId,
                name: 'แผนกทั่วไป',
                type: 'department'
              };
            }
          }

          // ดึงข้อมูลอาคารถ้ามี buildingId
          if (roomMaster?.buildingId) {
            try {
              const buildingRes = await axios.get(`${API_BASE_URL}/api/workplace/building/${roomMaster.buildingId}`);
              buildingInfo = buildingRes.data;
            } catch (err) {
              console.warn(`[WARN] Failed to fetch building ${roomMaster.buildingId}:`, err);
              // ลองหาข้อมูลอาคารที่มีจริงในฐานข้อมูล
              try {
                const allBuildingsRes = await axios.get(`${API_BASE_URL}/api/workplace/building`);
                if (allBuildingsRes.data && allBuildingsRes.data.length > 0) {
                  buildingInfo = allBuildingsRes.data[0]; // ใช้อาคารแรกที่พบ
                } else {
                  // สร้างข้อมูล fallback
                  buildingInfo = {
                    id: roomMaster.buildingId,
                    name: 'อาคารผู้ป่วยนอก',
                    type: 'building'
                  };
                }
              } catch (fallbackErr) {
                console.warn('Failed to fetch all buildings:', fallbackErr);
                buildingInfo = {
                  id: roomMaster.buildingId,
                  name: 'อาคารผู้ป่วยนอก',
                  type: 'building'
                };
              }
            }
          }

          // ดึงข้อมูลชั้นถ้ามี floorId
          if (roomMaster?.floorId) {
            try {
              const floorRes = await axios.get(`${API_BASE_URL}/api/workplace/floor/${roomMaster.floorId}`);
              floorInfo = floorRes.data;
            } catch (err) {
              console.warn(`[WARN] Failed to fetch floor ${roomMaster.floorId}:`, err);
              // ลองหาข้อมูลชั้นที่มีจริงในฐานข้อมูล
              try {
                const allFloorsRes = await axios.get(`${API_BASE_URL}/api/workplace/floor`);
                if (allFloorsRes.data && allFloorsRes.data.length > 0) {
                  floorInfo = allFloorsRes.data[0]; // ใช้ชั้นแรกที่พบ
                } else {
                  // สร้างข้อมูล fallback
                  floorInfo = {
                    id: roomMaster.floorId,
                    name: 'ชั้น 1',
                    type: 'floor'
                  };
                }
              } catch (fallbackErr) {
                console.warn('Failed to fetch all floors:', fallbackErr);
                floorInfo = {
                  id: roomMaster.floorId,
                  name: 'ชั้น 1',
                  type: 'floor'
                };
              }
            }
          }
        } catch (err) {
          console.warn(`[WARN] Failed to fetch room master ${roomSchedule.roomId}:`, err);
        }
      }
    } catch (err) {
      console.warn(`[WARN] Failed to fetch room schedule ${roomId}:`, err);
    } finally {
      setLoadingRoomDetails(false);
    }
    
    return { roomSchedule, roomMaster, departmentInfo, buildingInfo, floorInfo };
  };
  
  // เพิ่มฟังก์ชันแปลงข้อมูลคิวให้รองรับ field name จาก backend (สอดคล้องกับ DataPatient.tsx)
  function mapQueueData(raw: any, roomSchedule?: any, roomMaster?: any, departmentInfo?: any, buildingInfo?: any, floorInfo?: any): PatientQueue {
    return {
      id: raw._id || raw.id,
      _id: raw._id,
      patientId: raw.patient_id,
      triage_level: raw.triage_level,
      vital_signs: raw.vital_signs,
      created_at: raw.created_at,
      completed_at: raw.completed_at,
      wait_time: raw.wait_time,
      queue_no: raw.queue_no,
      queue_time: raw.queue_time,
      status: raw.status,
      priority: raw.priority,
      room_id: raw.room_id,
      symptoms: raw.symptoms,
      
      // ข้อมูลรายละเอียดเพิ่มเติม - ใช้ข้อมูลที่มีหรือค่า default
      room_name: roomMaster?.name || roomSchedule?.roomId || raw.room_name || raw.room || 'ห้องตรวจ 1',
      department_name: departmentInfo?.name || roomMaster?.department || raw.department_name || raw.department || 'แผนกทั่วไป',
      building_name: buildingInfo?.name || buildingInfo?.address || roomMaster?.building || raw.building_name || raw.building || 'อาคารผู้ป่วยนอก',
      floor_name: floorInfo?.name || roomMaster?.floor || raw.floor_name || raw.floor || 'ชั้น 1',
      
      room_schedule: roomSchedule || raw.room_schedule,
      room_master: roomMaster || raw.room_master,
      department_info: departmentInfo || raw.department_info,
      building_info: buildingInfo || raw.building_info,
      floor_info: floorInfo || raw.floor_info,
      
      // เพิ่ม logs และ actions
      logs: raw.logs || [],
      actions: raw.actions || {},
      
      // สำหรับ UI เดิม - ใช้ข้อมูลที่ map แล้ว
      queueNumber: raw.queue_no,
      department: departmentInfo?.name || roomMaster?.department || raw.department_name || raw.department || 'แผนกทั่วไป',
      room: roomMaster?.name || roomSchedule?.roomId || raw.room_name || raw.room || 'ห้องตรวจ 1',
      estimatedTime: raw.estimatedTime,
      patientName: raw.patientName,
      appointmentType: raw.appointmentType,
      building: buildingInfo?.name || buildingInfo?.address || roomMaster?.building || raw.building_name || raw.building || 'อาคารผู้ป่วยนอก',
      floor: floorInfo?.name || roomMaster?.floor || raw.floor_name || raw.floor || 'ชั้น 1',
      currentQueue: raw.currentQueue,
      totalWaiting: raw.totalWaiting,
    };
  }
  // ใน useEffect ที่ fetch ข้อมูลคิว ให้ map ข้อมูลด้วยฟังก์ชันนี้
  useEffect(() => {
    // ตรวจสอบคิวที่ต่ออยู่ก่อน
    if (token && !queueId) {
      checkActiveQueue().then((activeQueue) => {
        if (activeQueue) {
          // มีคิวที่ต่ออยู่ ให้ redirect ไปที่คิวนั้น
          setHasActiveQueue(true);
          window.location.href = `/screening/welcome?token=${token}&queue_id=${activeQueue._id}`;
          return;
        } else {
          setHasActiveQueue(false);
        }
      });
    }

    if (token && queueId) {
      setLoading(true);
      setError(null);
      // ลอง fetch จาก /queue_with_room/<queue_id> เพื่อ join ข้อมูลห้องด้วย
      axios.get(`${API_BASE_URL}/api/queue/queue/${queueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(async res => {
          const queue = res.data.queue;
          
          if (queue && queue.room_id) {
            // ดึงข้อมูลห้องแบบครบถ้วน
            const roomDetails = await fetchRoomDetails(queue.room_id);
            console.log('📦 Room details received:', roomDetails);
            
            setRoomSchedule(roomDetails.roomSchedule);
            setRoomMaster(roomDetails.roomMaster);
            setDepartmentInfo(roomDetails.departmentInfo);
            setBuildingInfo(roomDetails.buildingInfo);
            setFloorInfo(roomDetails.floorInfo);
            
            const q = mapQueueData(
              queue,
              roomDetails.roomSchedule,
              roomDetails.roomMaster,
              roomDetails.departmentInfo,
              roomDetails.buildingInfo,
              roomDetails.floorInfo
            );
            
            setAssignedQueue(q);
            setHasActiveQueue(true); // มีคิวที่กำลังใช้งาน
          } else {
            // หากไม่มี room_id ให้ใช้ข้อมูลเดิม
            const mappedQueue = mapQueueData(queue);
            setAssignedQueue(mappedQueue);
            setHasActiveQueue(mappedQueue ? true : false); // อัปเดตสถานะตามการมีคิว
          }
          
          // ตรวจสอบถ้าคิวถูกข้าม
          const finalQueue = queue ? (queue.room_id ? setAssignedQueue : setAssignedQueue) : null;
          if (finalQueue && assignedQueue?.status === 'skipped') {
            setShowSkippedAlert(true);
            // เล่นเสียงแจ้งเตือน
            playSkippedQueueSound();
          }
          
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
          setSymptoms(queue?.symptoms || '');
          setWaitingBefore(res.data.waiting_before ?? 0);
        })
        .catch(() => {
          setError('ไม่สามารถดึงข้อมูลคิวได้');
          setHasActiveQueue(false); // ไม่มีคิวเมื่อเกิดข้อผิดพลาด
        })
        .finally(() => setLoading(false));
    } else if (location.state?.queue) {
      const queue = location.state.queue;
      
      // ถ้ามี room_id ให้ดึงข้อมูลห้องใหม่
      if (queue.room_id) {
        fetchRoomDetails(queue.room_id).then(roomDetails => {
          setRoomSchedule(roomDetails.roomSchedule);
          setRoomMaster(roomDetails.roomMaster);
          setDepartmentInfo(roomDetails.departmentInfo);
          setBuildingInfo(roomDetails.buildingInfo);
          setFloorInfo(roomDetails.floorInfo);
          
          const mappedQueue = mapQueueData(
            queue,
            roomDetails.roomSchedule,
            roomDetails.roomMaster,
            roomDetails.departmentInfo,
            roomDetails.buildingInfo,
            roomDetails.floorInfo
          );
          setAssignedQueue(mappedQueue);
          setHasActiveQueue(true); // มีคิวจาก location state
        });
      } else {
        const mappedQueue = mapQueueData(queue);
        setAssignedQueue(mappedQueue);
        setHasActiveQueue(true); // มีคิวจาก location state
      }
      
      setPatientData(location.state.patient);
      setSymptoms(location.state.symptoms || '');
      setWaitingBefore(0);
      
      // ตรวจสอบถ้าคิวถูกข้าม
      if (queue?.status === 'skipped') {
        setShowSkippedAlert(true);
        // เล่นเสียงแจ้งเตือน
        playSkippedQueueSound();
      }
    }
    
    // โหลดประวัติคิวอัตโนมัติ
    fetchQueueHistory();
  }, [token, queueId, location.state]);

  // เพิ่ม useEffect สำหรับ polling ข้อมูลคิวเป็นระยะ ๆ เพื่อตรวจสอบการเปลี่ยนแปลงสถานะ
  useEffect(() => {
    if (!token || !queueId) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/queue/queue/${queueId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const queue = res.data.queue;
        if (queue && queue.room_id) {
          // ดึงข้อมูลห้องใหม่สำหรับ polling
          const roomDetails = await fetchRoomDetails(queue.room_id);
          const q = mapQueueData(
            queue,
            roomDetails.roomSchedule,
            roomDetails.roomMaster,
            roomDetails.departmentInfo
          );
          
          if (q && q.status !== assignedQueue?.status) {
            setAssignedQueue(q);
            
            // แจ้งเตือนเมื่อคิวถูกข้าม
            if (q.status === 'skipped' && !showSkippedAlert) {
              setShowSkippedAlert(true);
              // เล่นเสียงแจ้งเตือน
              playSkippedQueueSound();
            }
          }
        }
      } catch (err) {
        console.error('Error polling queue status:', err);
      }
    }, 30000); // ตรวจสอบทุก 30 วินาที

    return () => clearInterval(interval);
  }, [token, queueId, assignedQueue?.status, showSkippedAlert]);

  // Handle queue completion
  const handleCompleteQueue = () => {
    setCurrentStep('completed');
  };

  // เล่นเสียงแจ้งเตือนเมื่อคิวถูกข้าม
  const playSkippedQueueSound = () => {
    try {
      // สร้างเสียงแจ้งเตือนด้วย Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // เสียงเตือน (Beep sound)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // ความถี่ 800Hz
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // เล่นซ้ำ 3 ครั้ง
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        oscillator2.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode2.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.5);
      }, 600);
      
      setTimeout(() => {
        const oscillator3 = audioContext.createOscillator();
        const gainNode3 = audioContext.createGain();
        oscillator3.connect(gainNode3);
        gainNode3.connect(audioContext.destination);
        oscillator3.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode3.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator3.start(audioContext.currentTime);
        oscillator3.stop(audioContext.currentTime + 0.5);
      }, 1200);
      
    } catch (error) {
      console.warn('ไม่สามารถเล่นเสียงแจ้งเตือนได้:', error);
    }
  };

  // เล่นเสียงแจ้งเตือนเมื่อถึงคิว
  const playQueueReadySound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime); // ความถี่สูงกว่า
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
    } catch (error) {
      console.warn('ไม่สามารถเล่นเสียงแจ้งเตือนได้:', error);
    }
  };

  // เล่นเสียงแจ้งเตือนเมื่อตรวจเสร็จ
  const playQueueCompletedSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // เสียงเมโลดี้สั้นๆ
      const frequencies = [523, 659, 783]; // C-E-G chord
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        }, index * 150);
      });
    } catch (error) {
      console.warn('ไม่สามารถเล่นเสียงแจ้งเตือนได้:', error);
    }
  };

  // เพิ่มการแจ้งเตือน (ใช้ alert แบบเดิม)
  // const addNotification = ...

  // ตรวจสอบการเปลี่ยนแปลงสถานะคิว
  const checkQueueStatusChange = (newStatus: string, oldStatus: string) => {
    if (newStatus !== oldStatus) {
      switch (newStatus) {
        case 'ready':
        case 'in_progress':
          setShowQueueReadyAlert(true);
          playQueueReadySound();
          break;
        case 'completed':
          setShowQueueCompletedAlert(true);
          playQueueCompletedSound();
          break;
        case 'skipped':
          setShowSkippedAlert(true);
          playSkippedQueueSound();
          break;
      }
      
      // เพิ่มไปยังประวัติ
      if (assignedQueue) {
        setQueueHistory(prev => [{
          ...assignedQueue,
          status: newStatus as any,
          timestamp: new Date()
        } as any, ...prev.slice(0, 9)]);
      }
    }
  };

  // อัปเดต useEffect สำหรับ polling ให้ตรวจสอบการเปลี่ยนแปลงสถานะ
  useEffect(() => {
    if (!token || !queueId) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/queue/queue/${queueId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const queue = res.data.queue;
        if (queue) {
          let q;
          if (queue.room_id) {
            // ดึงข้อมูลห้องใหม่
            const roomDetails = await fetchRoomDetails(queue.room_id);
            q = mapQueueData(
              queue,
              roomDetails.roomSchedule,
              roomDetails.roomMaster,
              roomDetails.departmentInfo
            );
          } else {
            q = mapQueueData(queue);
          }
          
          if (q && q.status !== assignedQueue?.status) {
            checkQueueStatusChange(q.status, assignedQueue?.status || '');
            setAssignedQueue(q);
          }
        }
      } catch (err) {
        console.error('Error polling queue status:', err);
      }
    }, 30000); // ตรวจสอบทุก 30 วินาที

    return () => clearInterval(interval);
  }, [token, queueId, assignedQueue?.status]);

  // ฟังก์ชันดึงประวัติคิว - พร้อมรายละเอียด logs
  const fetchQueueHistory = async () => {
    try {
      // ใช้ API all_queues โดยตรง
      const response = await axios.get(`${API_BASE_URL}/api/queue/all_queues`);
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const detailedHistory = response.data.map((queue: any) => {
          // คำนวณเวลารอ
          let waitTime = 0;
          if (queue.queue_time && queue.completed_at) {
            const queueTime = new Date(queue.queue_time);
            const completedTime = new Date(queue.completed_at);
            waitTime = Math.round((completedTime.getTime() - queueTime.getTime()) / (1000 * 60));
          } else if (queue.queue_time) {
            const queueTime = new Date(queue.queue_time);
            const now = new Date();
            waitTime = Math.round((now.getTime() - queueTime.getTime()) / (1000 * 60));
          }
          
          return {
            _id: queue._id,
            queue_no: queue.queue_no,
            queue_time: queue.queue_time,
            status: queue.status,
            triage_level: queue.triage_level,
            priority: queue.priority,
            room_name: queue.room_name || 'ไม่ระบุห้อง',
            department_name: queue.department_name || 'ไม่ระบุแผนก',
            building_name: queue.building_name || '',
            floor_name: queue.floor_name || '',
            symptoms: queue.symptoms || '',
            created_at: queue.created_at,
            completed_at: queue.completed_at,
            wait_time: waitTime,
            logs: [], // ไม่มี logs ใน basic API
            actions: {} // ไม่มี actions ใน basic API
          };
        });

        // เรียงลำดับตามวันที่ล่าสุด
        detailedHistory.sort((a, b) => new Date(b.created_at || b.queue_time).getTime() - new Date(a.created_at || a.queue_time).getTime());
        const mappedHistory = detailedHistory.map(mapQueueData);
        setQueueHistory(mappedHistory);
      } else {
        throw new Error('No real queue data available');
      }
    } catch (error) {
      // สร้างข้อมูลจำลองที่หลากหลายสำหรับทดสอบ
      const sampleHistory = [
        {
          _id: 'sample_current',
          queue_no: assignedQueue?.queue_no || 'A001',
          queue_time: new Date().toISOString(),
          status: assignedQueue?.status || 'waiting',
          triage_level: assignedQueue?.triage_level || 2,
          priority: assignedQueue?.priority || 2,
          room_name: assignedQueue?.room_name || 'ห้องตรวจทั่วไป 1',
          department_name: assignedQueue?.department_name || 'แผนกผู้ป่วยนอก',
          building_name: assignedQueue?.building_name || 'อาคาร A',
          floor_name: assignedQueue?.floor_name || 'ชั้น 1',
          symptoms: assignedQueue?.symptoms || symptoms || 'เป็นไข้ มีอาการปวดหัว คลื่นไส้',
          created_at: new Date().toISOString(),
          completed_at: assignedQueue?.status === 'completed' ? new Date().toISOString() : undefined,
          wait_time: 15
        },
        {
          _id: 'sample_yesterday',
          queue_no: 'B002',
          queue_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          triage_level: 3,
          priority: 3,
          room_name: 'ห้องตรวจทั่วไป 2',
          department_name: 'แผนกอายุรกรรม',
          building_name: 'อาคาร B',
          floor_name: 'ชั้น 2',
          symptoms: 'ปวดท้อง อาเจียน ท้องเสีย',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
          wait_time: 45
        },
        {
          _id: 'sample_lastweek',
          queue_no: 'C003',
          queue_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          triage_level: 1,
          priority: 1,
          room_name: 'ห้องวิกฤต',
          department_name: 'แผนกวิกฤต',
          building_name: 'อาคาร C',
          floor_name: 'ชั้น 1',
          symptoms: 'เจ็บหน้าอก หายใจลำบาก เหงื่อแตก',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(),
          wait_time: 20
        },
        {
          _id: 'sample_skipped',
          queue_no: 'D004',
          queue_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'skipped',
          triage_level: 2,
          priority: 2,
          room_name: 'ห้องตรวจโรคใน',
          department_name: 'แผนกอายุรกรรม',
          building_name: 'อาคาร A',
          floor_name: 'ชั้น 3',
          symptoms: 'ปวดหัว วิงเวียน',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: undefined,
          wait_time: 0
        },
        {
          _id: 'sample_checkup',
          queue_no: 'E005',
          queue_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          triage_level: 4,
          priority: 4,
          room_name: 'ห้องตรวจสุขภาพ',
          department_name: 'แผนกแพทย์ครอบครัว',
          building_name: 'อาคาร D',
          floor_name: 'ชั้น 2',
          symptoms: 'ตรวจสุขภาพประจำปี',
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
          wait_time: 30
        }
      ];
      
      setQueueHistory(sampleHistory.map(mapQueueData));
    }
  };

  // Utility functions for formatting (copied from DataPatient.tsx style)
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatWaitTime = (minutes: number) => {
    if (minutes === 0) return 'ไม่ระบุ';
    if (minutes < 60) return `${minutes} นาที`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} ชม. ${mins} นาที` : `${hours} ชม.`;
  };

  // ฟังก์ชันจัดรูปแบบเวลาทำการ
  const formatOperatingTime = (timeString: string) => {
    if (!timeString) return '';
    
    // ถ้าเป็นรูปแบบ HH:MM
    if (timeString.match(/^\d{2}:\d{2}$/)) {
      return timeString;
    }
    
    // ถ้าเป็นรูปแบบอื่น ลองแปลงเป็น Date แล้วจัดรูปแบบ
    try {
      const date = new Date(`2000-01-01T${timeString}`);
      return date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return timeString;
    }
  };

  // ฟังก์ชันสร้างข้อความเวลาทำการ
  const getOperatingHoursText = (roomSchedule: any) => {
    if (!roomSchedule) return '';
    
    const openTime = formatOperatingTime(roomSchedule.openTime);
    const closeTime = formatOperatingTime(roomSchedule.closeTime);
    
    if (!openTime && !closeTime) return '';
    
    // กรณีเปิด 24 ชั่วโมง
    if (openTime === '00:00' && closeTime === '23:59') {
      return 'เปิดให้บริการ 24 ชั่วโมง';
    }
    
    return `${openTime || '08:00'} - ${closeTime || '17:00'}`;
  };

  // Get current time
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // ฟังก์ชันตรวจสอบคิวที่ต่ออยู่
  const checkActiveQueue = async () => {
    if (!token) return false;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/queue/patient/check-active-queue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.has_active_queue) {
        setHasActiveQueue(true);
        return response.data.queue;
      } else {
        setHasActiveQueue(false);
        return null;
      }
    } catch (error) {
      console.error('Error checking active queue:', error);
      setHasActiveQueue(false);
      return null;
    }
  };

  // ฟังก์ชันยกเลิกคิว
  const handleCancelQueue = async () => {
    if (!token) {
      setError('ไม่พบ token การยืนยันตัวตน');
      return;
    }
    
    // ตรวจสอบสถานะคิวก่อนยกเลิก
    if (!hasActiveQueue || !assignedQueue) {
      setError('ไม่พบคิวที่สามารถยกเลิกได้');
      setShowCancelQueueModal(false);
      return;
    }
    
    if (assignedQueue?.status === 'in_progress') {
      setError('คิวของคุณกำลังถูกเรียกตรวจ ไม่สามารถยกเลิกได้ กรุณารอให้การตรวจเสร็จสิ้น');
      setShowCancelQueueModal(false);
      return;
    }
    
    setQueueActionLoading(true);
    try {
      // ตรวจสอบสถานะคิวล่าสุดจาก server ก่อน
      const checkResponse = await axios.get(
        `${API_BASE_URL}/api/queue/patient/check-active-queue`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!checkResponse.data.has_active_queue) {
        setError('ไม่พบคิวที่สามารถยกเลิกได้ คิวอาจถูกยกเลิกหรือเสร็จสิ้นแล้ว');
        setHasActiveQueue(false);
        setShowCancelQueueModal(false);
        setQueueActionLoading(false);
        return;
      }
      
      const currentQueue = checkResponse.data.queue;
      console.log('Current queue from server:', currentQueue);
      console.log('Current queue status:', currentQueue.status);
      
      // อัปเดตสถานะคิวจาก server เสมอ
      if (assignedQueue && currentQueue._id === assignedQueue._id) {
        setAssignedQueue(prev => prev ? { 
          ...prev, 
          status: currentQueue.status,
          // อัปเดตข้อมูลอื่นๆ จาก server ด้วย
          queue_no: currentQueue.queue_no,
          priority: currentQueue.priority,
          triage_level: currentQueue.triage_level
        } : null);
      }
      
      if (currentQueue.status === 'in_progress') {
        setError('คิวของคุณกำลังถูกเรียกตรวจ ไม่สามารถยกเลิกได้ กรุณารอให้การตรวจเสร็จสิ้น');
        setShowCancelQueueModal(false);
        setQueueActionLoading(false);
        return;
      }
      
      if (!['waiting'].includes(currentQueue.status)) {
        setError(`ไม่สามารถยกเลิกคิวที่มีสถานะ "${currentQueue.status}" ได้`);
        setShowCancelQueueModal(false);
        setQueueActionLoading(false);
        return;
      }
      
      console.log('Cancelling queue with token:', token);
      console.log('Current queue state from server:', currentQueue);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/queue/queue/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Cancel queue response:', response.data);
      
      if (response.data.success) {
        // อัปเดตสถานะ
        setHasActiveQueue(false);
        if (assignedQueue) {
          setAssignedQueue({
            ...assignedQueue,
            status: 'cancelled' as any
          });
        }
        alert('ยกเลิกคิวเรียบร้อยแล้ว คุณสามารถขอคิวใหม่ได้');
        
        // ไม่เปิด modal อัตโนมัติ ให้ผู้ใช้กดปุ่มเอง
      }
    } catch (error: any) {
      console.error('Error cancelling queue:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        const errorMessage = errorData?.error || errorData?.message;
        
        if (errorMessage === 'ไม่พบคิวที่สามารถยกเลิกได้') {
          setError('ไม่พบคิวที่สามารถยกเลิกได้ อาจเป็นเพราะคิวถูกยกเลิกแล้วหรือเสร็จสิ้นแล้ว');
          setHasActiveQueue(false);
          setAssignedQueue(null);
        } else if (errorMessage === 'ไม่สามารถยกเลิกคิวที่กำลังตรวจอยู่ได้' || errorMessage?.includes('กำลังตรวจอยู่')) {
          setError('คิวของคุณกำลังถูกเรียกตรวจ ไม่สามารถยกเลิกได้ กรุณารอให้การตรวจเสร็จสิ้น');
          // อัปเดตสถานะคิวเป็น in_progress
          setAssignedQueue(prev => prev ? { ...prev, status: 'in_progress' } : null);
        } else {
          setError(errorMessage || 'ไม่สามารถยกเลิกคิวได้');
        }
      } else if (error.response?.status === 401) {
        setError('การยืนยันตัวตนหมดอายุ กรุณาล็อกอินใหม่');
        // นำไปหน้า login หลังจาก delay
        setTimeout(() => {
          navigate('/screening');
        }, 2000);
      } else if (error.response?.status === 500) {
        setError('เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
      } else {
        setError('เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์ กรุณาตรวจสอบการเชื่อมต่อ');
      }
    } finally {
      setQueueActionLoading(false);
      setShowCancelQueueModal(false);
    }
  };

  // Queue Display Step
  if (currentStep === 'queue-display') {
    // แสดง loading state
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex flex-col px-4 py-6 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-10 right-10 w-20 h-20 bg-white/10 rounded-full animate-bounce delay-500"></div>
            <div className="absolute bottom-20 left-10 w-16 h-16 bg-white/10 rounded-full animate-bounce delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full animate-pulse"></div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center justify-center h-full">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/30 text-center">
              <div className="w-16 h-16 mx-auto mb-4">
                <div className="w-16 h-16 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">กำลังโหลดข้อมูลคิว...</h2>
              <p className="text-gray-600">กรุณารอสักครู่</p>
            </div>
          </div>
        </div>
      );
    }

    // แสดง error state
    if (error) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-500 via-pink-600 to-purple-500 flex flex-col px-4 py-6 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-10 right-10 w-20 h-20 bg-white/10 rounded-full animate-bounce delay-500"></div>
            <div className="absolute bottom-20 left-10 w-16 h-16 bg-white/10 rounded-full animate-bounce delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full animate-pulse"></div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center justify-center h-full">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/30 text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all"
                >
                  ลองใหม่อีกครั้ง
                </button>
                <button
                  onClick={() => navigate('/')}
                  disabled={queueActionLoading}
                  className="w-full bg-white border-2 border-gray-300 hover:bg-gray-50 disabled:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition-all"
                >
                  {queueActionLoading ? '⏳ กำลังดำเนินการ...' : 'กลับไปหน้าหลัก'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Cancel Queue Modal */}
        {showCancelQueueModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">ยกเลิกคิว</h3>
                <p className="text-gray-600 text-sm">คุณแน่ใจหรือไม่ที่ต้องการยกเลิกคิวนี้?</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-yellow-800 text-sm">
                    <p className="font-medium mb-1">คิวหมายเลข: {assignedQueue?.queue_no}</p>
                    <p>หากยกเลิกแล้ว คุณสามารถขอคิวใหม่ได้ทันที</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCancelQueueModal(false)}
                  disabled={queueActionLoading}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ไม่ยกเลิก
                </button>
                <button
                  onClick={handleCancelQueue}
                  disabled={queueActionLoading}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {queueActionLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังยกเลิก...</span>
                    </div>
                  ) : (
                    'ยืนยันยกเลิก'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

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

          {/* Queue Ready Alert */}
          {showQueueReadyAlert && (assignedQueue?.status === 'ready' || assignedQueue?.status === 'in_progress') && (
            <div className="bg-green-100 border-2 border-green-300 rounded-2xl p-4 mb-6 animate-pulse">
              <div className="flex items-center">
                <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-6h5v6z" />
                </svg>
                <div className="flex-1">
                  <p className="text-green-800 font-bold text-lg">🔔 ถึงคิวแล้ว!</p>
                  <p className="text-green-700 text-sm">คิว {assignedQueue?.queue_no} กรุณาเข้าพบแพทย์ที่ห้อง {assignedQueue?.room_name || 'ห้องตรวจ'}</p>
                </div>
                <button
                  onClick={() => setShowQueueReadyAlert(false)}
                  className="ml-3 text-green-600 hover:text-green-800 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Queue Completed Alert */}
          {showQueueCompletedAlert && assignedQueue?.status === 'completed' && (
            <div className="bg-blue-100 border-2 border-blue-300 rounded-2xl p-4 mb-6 animate-pulse">
              <div className="flex items-center">
                <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-blue-800 font-bold text-lg">🎉 ตรวจเสร็จสิ้น!</p>
                  <p className="text-blue-700 text-sm">การตรวจของคุณเสร็จสิ้นแล้ว กรุณารับผลที่เคาน์เตอร์</p>
                </div>
                <button
                  onClick={() => setShowQueueCompletedAlert(false)}
                  className="ml-3 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Skipped Queue Alert */}
          {showSkippedAlert && assignedQueue?.status === 'skipped' && (
            <div className="bg-red-100 border-2 border-red-300 rounded-2xl p-4 mb-6 animate-pulse">
              <div className="flex items-center">
                <svg className="w-8 h-8 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="flex-1">
                  <p className="text-red-800 font-bold text-lg">⚠️ คิวของคุณถูกข้าม!</p>
                  <p className="text-red-700 text-sm">กรุณาติดต่อเจ้าหน้าที่เพื่อขอรับคิวใหม่</p>
                </div>
                <button
                  onClick={() => setShowSkippedAlert(false)}
                  className="ml-3 text-red-600 hover:text-red-800 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => {
                    // Navigate to contact or help page
                    window.location.href = 'tel:1111';
                  }}
                  className="bg-white border-2 border-red-300 text-red-700 font-bold py-2 px-6 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>โทรสอบถาม</span>
                </button>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {assignedQueue?.status !== 'skipped' && (
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
          )}

          {/* Queue Number Display */}
          <div className={`${
            assignedQueue?.status === 'cancelled' ? 'bg-gradient-to-r from-red-600 to-red-700' :
            assignedQueue?.status === 'skipped' ? 'bg-gradient-to-r from-orange-600 to-orange-700' :
            'bg-gradient-to-r from-blue-600 to-purple-700'
          } rounded-3xl p-8 mb-6 text-center shadow-2xl border border-white/30`}>
            <p className="text-white/80 text-lg mb-3 font-medium">
              {assignedQueue?.status === 'cancelled' ? 'คิวที่ถูกยกเลิก' :
               assignedQueue?.status === 'skipped' ? 'คิวที่ถูกข้าม' : 
               'หมายเลขคิวของคุณ'}
            </p>
            <div className={`text-6xl font-black mb-4 tracking-wider drop-shadow-lg ${
              assignedQueue?.status === 'cancelled' ? 'text-red-400' :
              assignedQueue?.status === 'skipped' ? 'text-orange-400' :
              'text-white'
            }`}>
              {assignedQueue?.queue_no || 'A001'}
            </div>
            {assignedQueue?.status === 'cancelled' ? (
              <div className="bg-red-800/30 rounded-2xl p-4 mb-4">
                <p className="text-white font-semibold text-lg mb-2">❌ คิวนี้ถูกยกเลิกแล้ว</p>
                <p className="text-white/90 text-sm">กรุณาไปสแกนและคัดกรองใหม่ที่จุดบริการ</p>
              </div>
            ) : assignedQueue?.status === 'skipped' ? (
              <div className="bg-red-800/30 rounded-2xl p-4 mb-4">
                <p className="text-white font-semibold text-lg mb-2">❌ คิวนี้ถูกข้ามแล้ว</p>
                <p className="text-white/90 text-sm">กรุณาติดต่อเจ้าหน้าที่หรือขอรับคิวใหม่</p>
              </div>
            ) : (
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
            )}
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
                  <h3 className="font-bold text-gray-800 text-xl">
                    {assignedQueue?.department_name || assignedQueue?.department || 'แผนกทั่วไป'}
                  </h3>
                  <p className="text-gray-600 text-sm">แผนกที่ AI แนะนำ</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-600 mb-2 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    ตำแหน่งห้องตรวจ
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">อาคาร:</span>
                      <span className="font-semibold text-blue-600">
                        {assignedQueue?.building_name || assignedQueue?.building || 'อาคารหลัก'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ชั้น:</span>
                      <span className="font-semibold text-blue-600">
                        {assignedQueue?.floor_name || assignedQueue?.floor || 'ชั้น 1'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ห้อง:</span>
                      <span className="font-semibold text-blue-600">
                        {loadingRoomDetails ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            กำลังโหลด...
                          </span>
                        ) : (
                          <>
                            {assignedQueue?.room_name || assignedQueue?.room || 'ห้องตรวจ 1'}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">แผนก:</span>
                      <span className="font-semibold text-blue-600">
                        {loadingRoomDetails ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            กำลังโหลด...
                          </span>
                        ) : (
                          <>
                            {assignedQueue?.department_name || assignedQueue?.department || 'แผนกทั่วไป'}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-600 mb-2 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    เวลาเปิดให้บริการ
                  </p>
                  <div className="space-y-2">
                    {(roomSchedule || assignedQueue?.room_schedule) ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">เปิด:</span>
                          <span className="font-semibold text-green-600">
                            {(roomSchedule || assignedQueue?.room_schedule)?.openTime || '08:00'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ปิด:</span>
                          <span className="font-semibold text-red-600">
                            {(roomSchedule || assignedQueue?.room_schedule)?.closeTime || '17:00'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">วันที่:</span>
                          <span className="font-semibold text-blue-600">{new Date().toLocaleDateString('th-TH')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">สถานะ:</span>
                          <span className="font-semibold text-green-600">
                            {(roomSchedule || assignedQueue?.room_schedule)?.isActive ? 
                              getOperatingHoursText(roomSchedule || assignedQueue?.room_schedule) : 
                              'ปิดให้บริการ'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">เปิด:</span>
                          <span className="font-semibold text-green-600">08:00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ปิด:</span>
                          <span className="font-semibold text-red-600">17:00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">วันที่:</span>
                          <span className="font-semibold text-blue-600">{new Date().toLocaleDateString('th-TH')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">สถานะ:</span>
                          <span className="font-semibold text-green-600">
                            เปิดให้บริการ
                          </span>
                        </div>
                      </>
                    )}
                  </div>
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
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-lg">{patientData?.name || assignedQueue?.patientName || 'ผู้ป่วย'}</h3>
                  <p className="text-gray-600 text-sm">{assignedQueue?.appointmentType || 'Walk-in การคัดกรองด้วย AI'}</p>
                </div>
                {patientData?.profileImage && (
                  <div className="w-12 h-12 bg-gray-200 rounded-xl overflow-hidden">
                    <img src={patientData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    ข้อมูลผู้ป่วย
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">เลขบัตรประชาชน:</span>
                      <span className="font-semibold">{patientData?.nationalId || 'ไม่ระบุ'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">โทรศัพท์:</span>
                      <span className="font-semibold">{patientData?.phone || 'ไม่ระบุ'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">วันที่ลงทะเบียน:</span>
                      <span className="font-semibold">{new Date().toLocaleDateString('th-TH')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">เวลาลงทะเบียน:</span>
                      <span className="font-semibold">{getCurrentTime()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    สถานะคิว
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">หมายเลขคิว:</span>
                      <span className={`font-semibold ${
                        assignedQueue?.status === 'cancelled' ? 'text-red-600' :
                        assignedQueue?.status === 'skipped' ? 'text-orange-600' :
                        'text-blue-600'
                      }`}>{assignedQueue?.queue_no || assignedQueue?.queueNumber || 'A001'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">สถานะ:</span>
                      <span className={`font-semibold ${
                        assignedQueue?.status === 'waiting' ? 'text-yellow-600' :
                        assignedQueue?.status === 'in_progress' ? 'text-blue-600' :
                        assignedQueue?.status === 'completed' ? 'text-green-600' :
                        assignedQueue?.status === 'cancelled' ? 'text-red-600' :
                        assignedQueue?.status === 'skipped' ? 'text-orange-600' :
                        'text-gray-600'
                      }`}>
                        {assignedQueue?.status === 'waiting' ? 'รอเรียก' :
                         assignedQueue?.status === 'in_progress' ? 'กำลังตรวจ' :
                         assignedQueue?.status === 'completed' ? 'เสร็จสิ้น' :
                         assignedQueue?.status === 'cancelled' ? 'ยกเลิกแล้ว' :
                         assignedQueue?.status === 'skipped' ? 'ถูกข้าม' :
                         'ไม่ทราบสถานะ'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">จำนวนคิวที่รอ:</span>
                      <span className="font-semibold text-orange-600">{waitingBefore} คน</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">เวลาโดยประมาณ:</span>
                      <span className="font-semibold text-purple-600">{assignedQueue?.estimatedTime || '15-20 นาที'}</span>
                    </div>
                  </div>
                </div>
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

                {/* Vital Signs Display */}
                {assignedQueue?.vital_signs && (
                  <div className="mt-4 bg-blue-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      สัญญาณชีพ
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {assignedQueue.vital_signs.weight && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">น้ำหนัก:</span>
                          <span className="font-semibold">{assignedQueue.vital_signs.weight} กก.</span>
                        </div>
                      )}
                      {assignedQueue.vital_signs.height && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">ส่วนสูง:</span>
                          <span className="font-semibold">{assignedQueue.vital_signs.height} ซม.</span>
                        </div>
                      )}
                      {assignedQueue.vital_signs.systolic && assignedQueue.vital_signs.diastolic && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">ความดัน:</span>
                          <span className="font-semibold">{assignedQueue.vital_signs.systolic}/{assignedQueue.vital_signs.diastolic}</span>
                        </div>
                      )}
                      {assignedQueue.vital_signs.pulse && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">ชีพจร:</span>
                          <span className="font-semibold">{assignedQueue.vital_signs.pulse} ครั้ง/นาที</span>
                        </div>
                      )}
                      {assignedQueue.vital_signs.age && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">อายุ:</span>
                          <span className="font-semibold">{assignedQueue.vital_signs.age} ปี</span>
                        </div>
                      )}
                      {assignedQueue.vital_signs.bmi && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">BMI:</span>
                          <span className="font-semibold">{assignedQueue.vital_signs.bmi}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Triage Level */}
                {assignedQueue?.triage_level && (
                  <div className="mt-4">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                      assignedQueue.triage_level === 1 ? 'bg-red-100 text-red-800' :
                      assignedQueue.triage_level === 2 ? 'bg-orange-100 text-orange-800' :
                      assignedQueue.triage_level === 3 ? 'bg-yellow-100 text-yellow-800' :
                      assignedQueue.triage_level === 4 ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v2a1 1 0 01-1 1h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8H3a1 1 0 01-1-1V5a1 1 0 011-1h4z" />
                      </svg>
                      ระดับความเร่งด่วน: {assignedQueue.triage_level}
                    </div>
                  </div>
                )}
              </div>
            )}



            {/* Queue History Section - แสดงหลังข้อมูลผู้ป่วย */}
            {queueHistory.length > 0 && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h3 className="text-lg font-bold">ประวัติคิวล่าสุด</h3>
                        <p className="text-white/80 text-sm">รายการคิว {queueHistory.length} รายการล่าสุด</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 max-h-80 overflow-y-auto">
                  <div className="space-y-3">
                    {queueHistory.slice(0, 5).map((queue, index) => (
                      <div key={queue.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        {/* Header with Queue Number and Status */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              queue.status === 'completed' ? 'bg-green-500' :
                              queue.status === 'in_progress' ? 'bg-blue-500' :
                              queue.status === 'waiting' ? 'bg-yellow-500' :
                              queue.status === 'cancelled' ? 'bg-red-500' :
                              queue.status === 'skipped' ? 'bg-orange-500' :
                              'bg-gray-500'
                            }`}></div>
                            <h4 className={`font-bold ${
                              queue.status === 'cancelled' ? 'text-red-600' :
                              queue.status === 'skipped' ? 'text-orange-600' :
                              'text-gray-800'
                            }`}>คิว {queue.queue_no}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              queue.priority === 1 ? 'bg-red-100 text-red-800' :
                              queue.priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                              queue.priority === 3 ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {queue.priority === 1 ? 'เร่งด่วน' :
                               queue.priority === 2 ? 'ด่วน' :
                               queue.priority === 3 ? 'ปกติ' : 'ปกติ'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              queue.status === 'completed' ? 'text-green-600' :
                              queue.status === 'in_progress' ? 'text-blue-600' :
                              queue.status === 'waiting' ? 'text-yellow-600' :
                              queue.status === 'skipped' ? 'text-red-600' :
                              queue.status === 'cancelled' ? 'text-red-600' 

                              : 'text-gray-600'
                            }`}>
                              {queue.status === 'completed' ? 'เสร็จสิ้น' :
                               queue.status === 'in_progress' ? 'กำลังตรวจ' :
                               queue.status === 'waiting' ? 'รอเรียก' :
                               queue.status === 'skipped' ? 'ข้าม' : 
                               queue.status === 'cancelled' ? 'ยกเลิกแล้ว' : 'ไม่ทราบสถานะ'}
                            </div>
                            {queue.queue_time && (
                              <div className="text-xs text-gray-500">
                                {formatTime(queue.queue_time)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Location Info */}
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{queue.room_name || 'ไม่ระบุห้อง'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span>{queue.department_name || 'ไม่ระบุแผนก'}</span>
                          </div>
                          {(queue.building_name || queue.floor_name) && (
                            <div className="text-xs text-gray-500">
                              {queue.building_name && `อาคาร ${queue.building_name}`}
                              {queue.floor_name && ` ชั้น ${queue.floor_name}`}
                            </div>
                          )}
                        </div>

                        {/* Symptoms */}
                        {queue.symptoms && (
                          <div className="mt-2 text-sm text-gray-700">
                            <span className="font-medium">อาการ:</span> {queue.symptoms}
                          </div>
                        )}

                        {/* Wait Time */}
                        {queue.wait_time && queue.wait_time > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            <span className="font-medium">เวลารอ:</span> {formatWaitTime(queue.wait_time)}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {queueHistory.length > 5 && (
                      <div className="text-center py-2">
                        <button
                          onClick={fetchQueueHistory}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          โหลดข้อมูลใหม่
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            {assignedQueue?.status === 'skipped' ? (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="font-bold text-red-800 text-lg">คิวถูกข้าม - ต้องดำเนินการ</span>
                </div>
                <ul className="space-y-3 text-red-800 text-sm">
                  <li className="flex items-start">
                    <span className="bg-red-200 text-red-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">1</span>
                    <span><strong>ติดต่อเจ้าหน้าที่</strong> ที่เคาน์เตอร์ลงทะเบียนเพื่อขอรับคิวใหม่</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-red-200 text-red-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">2</span>
                    <span><strong>โทรศัพท์</strong> หมายเลข 1111 เพื่อสอบถามข้อมูลเพิ่มเติม</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-red-200 text-red-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">3</span>
                    <span><strong>กดปุ่ม "ขอรับคิวใหม่"</strong> ด้านล่างเพื่อเริ่มกระบวนการใหม่</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-red-200 text-red-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">4</span>
                    <span>หากเป็นกรณี<strong>เร่งด่วน</strong> ให้แจ้งเจ้าหน้าที่ทันที</span>
                  </li>
                </ul>
              </div>
            ) : (
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
                    <span>ไปที่ <strong>
                      {assignedQueue?.building_name || assignedQueue?.building || 'อาคาร B'} 
                      {' ชั้น '}{assignedQueue?.floor_name || assignedQueue?.floor || 'ล็อบบี้'} 
                      {' ห้อง '}{assignedQueue?.room_name || assignedQueue?.room || 'ห้องตรวจโรคทั่วไป'}
                    </strong></span>
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
                  <li className="flex items-start">
                    <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">5</span>
                    <span>เวลาทำการ: <strong>{(roomSchedule || assignedQueue?.room_schedule) ? getOperatingHoursText(roomSchedule || assignedQueue?.room_schedule) : 'เปิดให้บริการ 24 ชั่วโมง'}</strong></span>
                  </li>
                </ul>
              </div>
            )}
          </div>
            
          {/* Action Buttons */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Main action button */}
              <button
                onClick={handleCompleteQueue}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-2 border border-white/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>เสร็จสิ้น</span>
              </button>

              {/* Queue management buttons - เหลือเฉพาะปุ่มยกเลิกคิว */}
              {(hasActiveQueue && assignedQueue?.status && ['waiting'].includes(assignedQueue.status)) && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowCancelQueueModal(true)}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-4 px-6 rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-2 border border-white/30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>ยกเลิกคิว</span>
                  </button>
                </div>
              )}
              
              {/* แสดงข้อความเมื่อไม่มีคิวหรือคิวถูกยกเลิก */}
              {(!hasActiveQueue || assignedQueue?.status === 'cancelled') && (
                <div className={`${
                  assignedQueue?.status === 'cancelled' 
                    ? 'bg-red-100 border-2 border-red-300' 
                    : 'bg-blue-100 border-2 border-blue-300'
                } rounded-xl p-4`}>
                  <div className="flex flex-col items-center space-y-3">
                    <svg className={`w-8 h-8 ${
                      assignedQueue?.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className={`${
                      assignedQueue?.status === 'cancelled' ? 'text-red-800' : 'text-blue-800'
                    } font-medium text-center`}>
                      {assignedQueue?.status === 'cancelled' 
                        ? 'คิวของคุณถูกยกเลิกแล้ว กรุณาไปสแกนใหม่ที่จุดบริการ' 
                        : 'คุณไม่มีคิวในขณะนี้ กรุณาไปสแกนที่จุดบริการ'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* แสดงข้อความเมื่อกำลังตรวจ */}
              {hasActiveQueue && assignedQueue?.status === 'in_progress' && (
                <div className="bg-green-100 border-2 border-green-300 rounded-xl p-4">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-800 font-medium">กำลังตรวจอยู่ - ไม่สามารถจัดการคิวได้</span>
                  </div>
                </div>
              )}
              
              {/* แสดงข้อความเมื่อคิวเสร็จสิ้น */}
              {(hasActiveQueue && assignedQueue?.status === 'completed') && (
                <div className="bg-green-100 border-2 border-green-300 rounded-xl p-4">
                  <div className="flex flex-col items-center space-y-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-green-800 font-medium text-center">การตรวจเสร็จสิ้นแล้ว กรุณาไปสแกนใหม่ที่จุดบริการ</p>
                  </div>
                </div>
              )}
              
              {/* Additional action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={fetchQueueHistory}
                  className="bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-xl border border-white/30 hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>โหลดใหม่</span>
                </button>
                
                <button
                  onClick={() => window.print()}
                  className="bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-xl border border-white/30 hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>พิมพ์</span>
                </button>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="text-center mt-4 space-y-2">
            <div className="flex justify-center space-x-6 text-white/70 text-xs">
              <a href="tel:1669" className="flex items-center hover:text-white transition-colors">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>วิกฤต: 1669</span>
              </a>
              <a href="tel:1111" className="flex items-center hover:text-white transition-colors">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>ช่วยเหลือ: 1111</span>
              </a>
            </div>
            <p className="text-white/50 text-xs">
              Smart Inpatient Screening Queueing System
            </p>
          </div>
        </div>
        </div>
      </>
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

          {/* Thank You Message */}
          <div className="mt-8 space-y-3">
            <p className="text-white/80 text-lg font-medium">
              ขอบคุณที่ไว้วางใจ
            </p>
            <p className="text-white/60 text-sm">
              Smart Inpatient Screening Queueing System
            </p>
            <div className="flex justify-center space-x-4 text-white/50 text-xs">
              {/* <span>🏥 โรงพยาบาลคุณภาพ</span>
              <span>⭐ บริการเป็นเลิศ</span> */}
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

  return (
    <>
      {/* Cancel Queue Modal */}
      {showCancelQueueModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">ยกเลิกคิว</h3>
              <p className="text-gray-600 text-sm">คุณแน่ใจหรือไม่ที่ต้องการยกเลิกคิวนี้?</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-yellow-800 text-sm">
                  <p className="font-medium mb-1">คิวหมายเลข: {assignedQueue?.queue_no}</p>
                  <p>หากยกเลิกแล้ว คุณสามารถขอคิวใหม่ได้ทันที</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelQueueModal(false)}
                disabled={queueActionLoading}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ไม่ยกเลิก
              </button>
              <button
                onClick={handleCancelQueue}
                disabled={queueActionLoading}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {queueActionLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังยกเลิก...</span>
                  </div>
                ) : (
                  'ยืนยันยกเลิก'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
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
                </svg>            </div>
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
              <div className={`text-6xl font-black mb-4 tracking-wider drop-shadow-lg ${
                assignedQueue?.status === 'cancelled' ? 'text-red-400' :
                assignedQueue?.status === 'skipped' ? 'text-orange-400' :
                'text-white'
              }`}>
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
                    <h3 className="font-bold text-gray-800 text-xl">{departmentInfo?.name || assignedQueue?.department_name || 'แผนกผู้ป่วยนอก'}</h3>
                    <p className="text-gray-600 text-sm">{roomMaster?.name || assignedQueue?.room_name || 'ห้องตรวจโรคทั่วไป'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-600 mb-1 font-medium">ตำแหน่ง</p>
                    <p className="text-gray-800 font-semibold">
                      {buildingInfo?.name || buildingInfo?.address || assignedQueue?.building_name || 'อาคาร B'}
                    </p>
                    <p className="text-gray-800 font-semibold">
                      ชั้น: {floorInfo?.name || assignedQueue?.floor_name || 'ล็อบบี้'}
                    </p>
                    <p className="text-gray-800 font-semibold">
                      ห้อง: {roomMaster?.name || assignedQueue?.room_name || 'ห้องตรวจโรคทั่วไป'}
                    </p>
                    <p className="text-gray-800 font-semibold">
                      แผนก: {departmentInfo?.name || assignedQueue?.department_name || 'แผนกทั่วไป'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-600 mb-1 font-medium">แผนก</p>
                    <p className="text-gray-800 font-semibold">{departmentInfo?.name || assignedQueue?.department_name || 'แผนกผู้ป่วยนอก'}</p>
                    <p className="text-gray-800 font-semibold">เวลา: {(roomSchedule || assignedQueue?.room_schedule) ? getOperatingHoursText(roomSchedule || assignedQueue?.room_schedule) : '08:00 - 17:00'}</p>
                    <p className="text-gray-800 font-semibold">วันที่: {(roomSchedule?.date || assignedQueue?.room_schedule?.date) ? new Date(roomSchedule?.date || assignedQueue?.room_schedule?.date).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH')}</p>
                    <p className={`font-semibold ${(roomSchedule?.isActive ?? assignedQueue?.room_schedule?.isActive) ? 'text-green-600' : 'text-red-600'}`}>
                      สถานะ: {(roomSchedule?.isActive ?? assignedQueue?.room_schedule?.isActive) ? 'เปิดให้บริการ' : 'ปิดให้บริการ'}
                    </p>
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
                      <span>AI แนะนำแผนก: {departmentInfo?.name || assignedQueue?.department || 'แผนกทั่วไป'}</span>
                    </div>
                    <div className="flex items-center mt-2 text-purple-600 text-sm">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>ห้อง: {roomMaster?.name || roomSchedule?.roomId || 'ห้องตรวจ'}</span>
                    </div>
                    <div className="flex items-center mt-1 text-purple-600 text-sm">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>เวลาทำการ: {(roomSchedule || assignedQueue?.room_schedule) ? getOperatingHoursText(roomSchedule || assignedQueue?.room_schedule) : 'เปิดให้บริการ 24 ชั่วโมง'}</span>
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
                    <span>ไปที่ <strong>{buildingInfo?.name || buildingInfo?.address || assignedQueue?.building_name || 'อาคาร B'} ชั้น {floorInfo?.name || assignedQueue?.floor_name || 'ล็อบบี้'} ห้อง {roomMaster?.name || assignedQueue?.room_name || 'ห้องตรวจโรคทั่วไป'}</strong></span>
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
                  <li className="flex items-start">
                    <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">5</span>
                    <span>เวลาทำการ: <strong>{(roomSchedule || assignedQueue?.room_schedule) ? getOperatingHoursText(roomSchedule || assignedQueue?.room_schedule) : 'เปิดให้บริการ 24 ชั่วโมง'}</strong></span>
                  </li>
                </ul>
              </div>
            </div>
              
            {/* Action Buttons */}
            <div className="space-y-4">
              {assignedQueue?.status === 'skipped' ? (
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => window.location.href = 'tel:1111'}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-6 rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-2 border border-white/30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>โทรสอบถาม 1111</span>
                  </button>
                </div>
              ) : (
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
              )}
            </div>

            {/* Emergency Contact */}
            <div className="text-center mt-4 space-y-2">
              <div className="flex justify-center space-x-6 text-white/70 text-xs">
                <a href="tel:1669" className="flex items-center hover:text-white transition-colors">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>วิกฤต: 1669</span>
                </a>
                <a href="tel:1111" className="flex items-center hover:text-white transition-colors">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>ช่วยเหลือ: 1111</span>
                </a>
              </div>
              <p className="text-white/50 text-xs">
                Smart Inpatient Screening Queueing System
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

            {/* Thank You Message */}
            <div className="mt-8 space-y-3">
              <p className="text-white/80 text-lg font-medium">
                ขอบคุณที่ไว้วางใจ
              </p>
              <p className="text-white/60 text-sm">
                Smart Inpatient Screening Queueing System
              </p>
              <div className="flex justify-center space-x-4 text-white/50 text-xs">
                {/* <span>🏥 โรงพยาบาลคุณภาพ</span>
                <span>⭐ บริการเป็นเลิศ</span> */}
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
      
      {currentStep === 'completed' && (
        <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex flex-col items-center justify-center px-4 py-6 relative overflow-hidden">
          {/* Completed Step content here */}
        </div>
      )}
    </>
  );
};

export default Welcome;