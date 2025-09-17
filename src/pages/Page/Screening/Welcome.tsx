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
  status: 'waiting' | 'ready' | 'missed' | 'completed' | 'skipped' | 'in_progress';
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
  const [roomSchedule, setRoomSchedule] = useState<any>(null);
  const [roomMaster, setRoomMaster] = useState<any>(null);
  const [buildingInfo, setBuildingInfo] = useState<any>(null);
  const [floorInfo, setFloorInfo] = useState<any>(null);
  const [departmentInfo, setDepartmentInfo] = useState<any>(null);
  const [showSkippedAlert, setShowSkippedAlert] = useState(false);
  
  // เพิ่ม state สำหรับระบบแจ้งเตือนและประวัติ
  const [showQueueReadyAlert, setShowQueueReadyAlert] = useState(false);
  const [showQueueCompletedAlert, setShowQueueCompletedAlert] = useState(false);
  const [queueHistory, setQueueHistory] = useState<PatientQueue[]>([]);

  // รับ token/queue_id จาก query string
  const token = searchParams.get('token');
  const queueId = searchParams.get('queue_id');
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  // เพิ่มฟังก์ชันแปลงข้อมูลคิวให้รองรับ field name จาก backend
  function mapQueueData(raw: any): PatientQueue {
    console.log('Mapping queue data:', raw);
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
      // ข้อมูลรายละเอียดเพิ่มเติม - ลำดับความสำคัญ: API response > room info > fallback
      room_name: raw.room_name || raw.room_info?.room_name || raw.room,
      department_name: raw.department_name || raw.room_info?.department_name || raw.department,
      building_name: raw.building_name || raw.room_info?.building_name || raw.building,
      floor_name: raw.floor_name || raw.room_info?.floor_name || raw.floor,
      room_schedule: raw.room_schedule,
      room_master: raw.room_master,
      department_info: raw.department_info,
      building_info: raw.building_info,
      floor_info: raw.floor_info,
      // เพิ่ม logs และ actions
      logs: raw.logs || [],
      actions: raw.actions || {},
      // สำหรับ UI เดิม
      queueNumber: raw.queue_no,
      department: raw.department_name || raw.room_info?.department_name || raw.department,
      room: raw.room_name || raw.room_info?.room_name || raw.room,
      estimatedTime: raw.estimatedTime,
      patientName: raw.patientName,
      appointmentType: raw.appointmentType,
      building: raw.building_name || raw.room_info?.building_name || raw.building,
      floor: raw.floor_name || raw.room_info?.floor_name || raw.floor,
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
          console.log('Room info:', res.data.room_schedule, res.data.room_master, res.data.building_info, res.data.floor_info, res.data.department_info);
          const q = res.data.queue ? mapQueueData(res.data.queue) : null;
          console.log('Mapped queue:', q);
          setAssignedQueue(q);
          
          // ตรวจสอบถ้าคิวถูกข้าม
          if (q?.status === 'skipped') {
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
          setSymptoms(q?.symptoms || '');
          setWaitingBefore(res.data.waiting_before ?? 0);
          // set roomSchedule, roomMaster ถ้ามีข้อมูล
          if (res.data.room_schedule) setRoomSchedule(res.data.room_schedule);
          if (res.data.room_master) setRoomMaster(res.data.room_master);
          if (res.data.building_info) setBuildingInfo(res.data.building_info);
          if (res.data.floor_info) setFloorInfo(res.data.floor_info);
          if (res.data.department_info) setDepartmentInfo(res.data.department_info);
        })
        .catch(() => {
          setError('ไม่สามารถดึงข้อมูลคิวได้');
        })
        .finally(() => setLoading(false));
    } else if (location.state?.queue) {
      const mappedQueue = mapQueueData(location.state.queue);
      setAssignedQueue(mappedQueue);
      setPatientData(location.state.patient);
      setSymptoms(location.state.symptoms || '');
      setWaitingBefore(0);
      
      // ตรวจสอบถ้าคิวถูกข้าม
      if (mappedQueue?.status === 'skipped') {
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
    
    const interval = setInterval(() => {
      axios.get(`${API_BASE_URL}/api/queue/queue/${queueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          const q = res.data.queue ? mapQueueData(res.data.queue) : null;
          if (q && q.status !== assignedQueue?.status) {
            setAssignedQueue(q);
            
            // แจ้งเตือนเมื่อคิวถูกข้าม
            if (q.status === 'skipped' && !showSkippedAlert) {
              setShowSkippedAlert(true);
              // เล่นเสียงแจ้งเตือน
              playSkippedQueueSound();
            }
          }
        })
        .catch(err => {
          console.error('Error polling queue status:', err);
        });
    }, 30000); // ตรวจสอบทุก 30 วินาที

    return () => clearInterval(interval);
  }, [token, queueId, assignedQueue?.status, showSkippedAlert]);

  useEffect(() => {
    if (assignedQueue?.room_id) {
      console.log('Fetching room data for room_id:', assignedQueue.room_id);
      
      // ดึงข้อมูล room_schedule จาก room_id (ObjectId)
      axios.get(`${API_BASE_URL}/api/workplace/room_schedule/${assignedQueue.room_id}`)
        .then(res => {
          console.log('Room schedule data:', res.data);
          setRoomSchedule(res.data);
          
          // ถ้ามี roomId ใน room_schedule ให้ดึงข้อมูล room เพิ่มเติม
          if (res.data.roomId) {
            console.log('Fetching room data for roomId:', res.data.roomId);
            axios.get(`${API_BASE_URL}/api/workplace/room/${res.data.roomId}`)
              .then(roomRes => {
                console.log('Room data:', roomRes.data);
                setRoomMaster(roomRes.data);
                
                // ดึงข้อมูล floor จาก floorId
                if (roomRes.data.floorId) {
                  console.log('Fetching floor data for floorId:', roomRes.data.floorId);
                  axios.get(`${API_BASE_URL}/api/workplace/floor/${roomRes.data.floorId}`)
                    .then(floorRes => {
                      console.log('Floor data:', floorRes.data);
                      setFloorInfo(floorRes.data);
                      
                      // ดึงข้อมูล building จาก buildingId
                      if (floorRes.data.buildingId) {
                        console.log('Fetching building data for buildingId:', floorRes.data.buildingId);
                        axios.get(`${API_BASE_URL}/api/workplace/building/${floorRes.data.buildingId}`)
                          .then(buildingRes => {
                            console.log('Building data:', buildingRes.data);
                            setBuildingInfo(buildingRes.data);
                          })
                          .catch(err => {
                            console.error('Error fetching building data:', err);
                            setBuildingInfo(null);
                          });
                      }
                    })
                    .catch(err => {
                      console.error('Error fetching floor data:', err);
                      setFloorInfo(null);
                    });
                }
                
                // ดึงข้อมูล department จาก departmentId
                if (roomRes.data.departmentId) {
                  console.log('Fetching department data for departmentId:', roomRes.data.departmentId);
                  axios.get(`${API_BASE_URL}/api/workplace/department/${roomRes.data.departmentId}`)
                    .then(deptRes => {
                      console.log('Department data:', deptRes.data);
                      setDepartmentInfo(deptRes.data);
                    })
                    .catch(err => {
                      console.error('Error fetching department data:', err);
                      setDepartmentInfo(null);
                    });
                }
              })
              .catch(err => {
                console.error('Error fetching room data:', err);
                setRoomMaster(null);
              });
          } else {
            console.log('No roomId found in room_schedule data');
            setRoomMaster(null);
          }
        })
        .catch(err => {
          console.error('Error fetching room schedule:', err);
          setRoomSchedule(null);
          setRoomMaster(null);
        });
    } else {
      console.log('No room_id found in assignedQueue');
      setRoomSchedule(null);
      setRoomMaster(null);
      setBuildingInfo(null);
      setFloorInfo(null);
      setDepartmentInfo(null);
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
    
    const interval = setInterval(() => {
      axios.get(`${API_BASE_URL}/api/queue/queue/${queueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          const q = res.data.queue ? mapQueueData(res.data.queue) : null;
          if (q && q.status !== assignedQueue?.status) {
            checkQueueStatusChange(q.status, assignedQueue?.status || '');
            setAssignedQueue(q);
          }
        })
        .catch(err => {
          console.error('Error polling queue status:', err);
        });
    }, 30000); // ตรวจสอบทุก 30 วินาที

    return () => clearInterval(interval);
  }, [token, queueId, assignedQueue?.status]);

  // ฟังก์ชันดึงประวัติคิว - พร้อมรายละเอียด logs
  const fetchQueueHistory = async () => {
    
    try {
      console.log(`[DEBUG] Fetching queue history from API: ${API_BASE_URL}/api/queue/all_queues`);
      
      // ใช้ API all_queues โดยตรง
      const response = await axios.get(`${API_BASE_URL}/api/queue/all_queues`);
      console.log(`[DEBUG] API response:`, response.data);
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`[DEBUG] First queue sample:`, response.data[0]);
        
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
          
          console.log(`[DEBUG] Processing queue ${queue._id}: room_name=${queue.room_name}, department_name=${queue.department_name}, building_name=${queue.building_name}, floor_name=${queue.floor_name}`);
          
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
        console.log(`[DEBUG] Mapped queue history:`, mappedHistory);
        console.log(`[DEBUG] First mapped queue sample:`, mappedHistory[0]);
        setQueueHistory(mappedHistory);
        console.log(`[DEBUG] Successfully loaded ${detailedHistory.length} queue history entries`);
      } else {
        throw new Error('No real queue data available');
      }
    } catch (error) {
      console.error('[ERROR] Failed to load queue history:', error);
      
      // สร้างข้อมูลจำลองที่หลากหลายสำหรับทดสอบ
      console.log(`[DEBUG] Creating comprehensive sample data for testing`);
      const sampleHistory = [
        {
          _id: 'sample_current',
          queue_no: assignedQueue?.queue_no || 'A001',
          queue_time: new Date().toISOString(),
          status: assignedQueue?.status || 'waiting',
          triage_level: assignedQueue?.triage_level || 2,
          priority: assignedQueue?.priority || 2,
          room_name: assignedQueue?.room_name || roomMaster?.name || roomSchedule?.name || 'ห้องตรวจทั่วไป 1',
          department_name: assignedQueue?.department_name || departmentInfo?.name || 'แผนกผู้ป่วยนอก',
          building_name: assignedQueue?.building_name || buildingInfo?.address || buildingInfo?.name || 'อาคาร A',
          floor_name: assignedQueue?.floor_name || floorInfo?.name || 'ชั้น 1',
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
          room_name: 'ห้องฉุกเฉิน',
          department_name: 'แผนกฉุกเฉิน',
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

          {/* Queue Ready Alert */}
          {showQueueReadyAlert && (assignedQueue?.status === 'ready' || assignedQueue?.status === 'in_progress') && (
            <div className="bg-green-100 border-2 border-green-300 rounded-2xl p-4 mb-6 animate-pulse">
              <div className="flex items-center">
                <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-6h5v6z" />
                </svg>
                <div className="flex-1">
                  <p className="text-green-800 font-bold text-lg">🔔 ถึงคิวแล้ว!</p>
                  <p className="text-green-700 text-sm">คิว {assignedQueue?.queue_no} กรุณาเข้าพบแพทย์ที่ห้อง {roomMaster?.name}</p>
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
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => navigate('/screening')}
                  className="flex-1 bg-red-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>ขอรับคิวใหม่</span>
                </button>
                <button
                  onClick={() => {
                    // Navigate to contact or help page
                    window.location.href = 'tel:1111';
                  }}
                  className="flex-1 bg-white border-2 border-red-300 text-red-700 font-bold py-2 px-4 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center space-x-2"
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
          <div className={`${assignedQueue?.status === 'skipped' 
            ? 'bg-gradient-to-r from-red-600 to-red-700' 
            : 'bg-gradient-to-r from-blue-600 to-purple-700'
          } rounded-3xl p-8 mb-6 text-center shadow-2xl border border-white/30`}>
            <p className="text-white/80 text-lg mb-3 font-medium">
              {assignedQueue?.status === 'skipped' ? 'คิวที่ถูกข้าม' : 'หมายเลขคิวของคุณ'}
            </p>
            <div className="text-6xl font-black text-white mb-4 tracking-wider drop-shadow-lg">
              {assignedQueue?.queue_no || 'A001'}
            </div>
            {assignedQueue?.status === 'skipped' ? (
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
                    {assignedQueue?.department_name || assignedQueue?.department || departmentInfo?.name || roomMaster?.department || roomSchedule?.room_type || 'แผนกทั่วไป'}
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
                        {assignedQueue?.building_name || assignedQueue?.building || buildingInfo?.name || roomMaster?.building || 'อาคารหลัก'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ชั้น:</span>
                      <span className="font-semibold text-blue-600">
                        {assignedQueue?.floor_name || assignedQueue?.floor || floorInfo?.name || roomMaster?.floor || 'ชั้น 1'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ห้อง:</span>
                      <span className="font-semibold text-blue-600">
                        {assignedQueue?.room_name || assignedQueue?.room || roomMaster?.name || roomSchedule?.roomId || 'ห้องตรวจ 1'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">แผนก:</span>
                      <span className="font-semibold text-blue-600">
                        {assignedQueue?.department_name || assignedQueue?.department || departmentInfo?.name || roomMaster?.department || roomSchedule?.room_type || 'แผนกทั่วไป'}
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
                    <div className="flex justify-between">
                      <span className="text-gray-600">เปิด:</span>
                      <span className="font-semibold text-green-600">{roomSchedule?.openTime || '08:00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ปิด:</span>
                      <span className="font-semibold text-red-600">{roomSchedule?.closeTime || '17:00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">วันที่:</span>
                      <span className="font-semibold text-blue-600">{roomSchedule?.date || new Date().toLocaleDateString('th-TH')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">สถานะ:</span>
                      <span className={`font-semibold ${roomSchedule?.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {roomSchedule?.isActive ? 'เปิดให้บริการ' : 'ปิดให้บริการ'}
                      </span>
                    </div>
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
                      <span className="font-semibold text-blue-600">{assignedQueue?.queue_no || assignedQueue?.queueNumber || 'A001'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">สถานะ:</span>
                      <span className={`font-semibold ${
                        assignedQueue?.status === 'waiting' ? 'text-yellow-600' :
                        assignedQueue?.status === 'in_progress' ? 'text-blue-600' :
                        assignedQueue?.status === 'completed' ? 'text-green-600' :
                        assignedQueue?.status === 'skipped' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {assignedQueue?.status === 'waiting' ? 'รอเรียก' :
                         assignedQueue?.status === 'in_progress' ? 'กำลังตรวจ' :
                         assignedQueue?.status === 'completed' ? 'เสร็จสิ้น' :
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
                              queue.status === 'skipped' ? 'bg-red-500' :
                              'bg-gray-500'
                            }`}></div>
                            <h4 className="font-bold text-gray-800">คิว {queue.queue_no}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              queue.priority === 1 ? 'bg-red-100 text-red-800' :
                              queue.priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                              queue.priority === 3 ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {queue.priority === 1 ? 'เร่งด่วน' :
                               queue.priority === 2 ? 'ด่วน' :
                               queue.priority === 3 ? 'ปกติ' : 'ไม่ระบุ'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              queue.status === 'completed' ? 'text-green-600' :
                              queue.status === 'in_progress' ? 'text-blue-600' :
                              queue.status === 'waiting' ? 'text-yellow-600' :
                              queue.status === 'skipped' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {queue.status === 'completed' ? 'เสร็จสิ้น' :
                               queue.status === 'in_progress' ? 'กำลังตรวจ' :
                               queue.status === 'waiting' ? 'รอตรวจ' :
                               queue.status === 'skipped' ? 'ข้าม' : 'ไม่ระบุ'}
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
              
              {/* Additional action buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => navigate('/screening')}
                  className="bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-xl border border-white/30 hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>คิวใหม่</span>
                </button>
                
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
      <div><b>buildingInfo:</b><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(buildingInfo, null, 2)}</pre></div>
      <div><b>floorInfo:</b><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(floorInfo, null, 2)}</pre></div>
      <div><b>departmentInfo:</b><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(departmentInfo, null, 2)}</pre></div>
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
                    <h3 className="font-bold text-gray-800 text-xl">{departmentInfo?.name || 'แผนกผู้ป่วยนอก'}</h3>
                    <p className="text-gray-600 text-sm">{roomMaster?.name || roomSchedule?.name || 'ห้องตรวจโรคทั่วไป'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-600 mb-1 font-medium">ตำแหน่ง</p>
                    <p className="text-gray-800 font-semibold">
                      {assignedQueue?.building_name || buildingInfo?.address || buildingInfo?.name || 'อาคาร B'}
                    </p>
                    <p className="text-gray-800 font-semibold">
                      ชั้น: {assignedQueue?.floor_name || floorInfo?.name || 'ล็อบบี้'}
                    </p>
                    <p className="text-gray-800 font-semibold">
                      ห้อง: {assignedQueue?.room_name || roomMaster?.name || roomSchedule?.name || 'ห้องตรวจโรคทั่วไป'}
                    </p>
                    <p className="text-gray-800 font-semibold">
                      แผนก: {assignedQueue?.department_name || departmentInfo?.name || 'แผนกทั่วไป'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-600 mb-1 font-medium">แผนก</p>
                    <p className="text-gray-800 font-semibold">{departmentInfo?.name || 'แผนกผู้ป่วยนอก'}</p>
                    <p className="text-gray-800 font-semibold">เวลา: {roomSchedule?.openTime || '08:00'} - {roomSchedule?.closeTime || '17:00'}</p>
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
                    <span>ไปที่ <strong>{buildingInfo?.address || 'อาคาร B'} ชั้น {floorInfo?.name || 'ล็อบบี้'} ห้อง {roomMaster?.name || 'ห้องตรวจโรคทั่วไป'}</strong></span>
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
              {assignedQueue?.status === 'skipped' ? (
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => navigate('/screening')}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-4 px-6 rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-2 border border-white/30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>ขอรับคิวใหม่</span>
                  </button>
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

      {/* Notifications Panel */}
    </>
  );
};

export default Welcome;