import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Container,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemSecondaryAction,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import {
  LocalHospital as HospitalIcon,
  MonitorHeart as HeartIcon,
  Psychology as PsychologyIcon,
  Healing as HealingIcon,
  Visibility as EyeIcon,
  Emergency as EmergencyIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  PersonOff as AbsentIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

interface QueueItem {
  _id: string;
  queue_no: string;
  patient_id: string;
  status: string;
  priority: number;
  triage_level: number;
  queue_time: string;
  room_id?: string;
  patient?: {
    _id: string;
    first_name_th: string;
    last_name_th: string;
    national_id: string;
  };
  room?: {
    _id: string;
    name: string;
    room_type: string;
  };
  symptoms?: string;
  vital_signs?: any;
}

interface Department {
  id: string;
  name: string;
  shortName: string;
  thaiCode: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  rooms: string[];
}

interface RoomStatus {
  room: string;
  currentQueue: QueueItem | null;
  isActive: boolean;
  room_id?: string;
}

const ManageQueue: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [roomStatuses, setRoomStatuses] = useState<RoomStatus[]>([]);
  const [nextQueues, setNextQueues] = useState<QueueItem[]>([]);
  const [showAbsentDialog, setShowAbsentDialog] = useState<boolean>(false);
  const [selectedQueueForAbsent, setSelectedQueueForAbsent] = useState<QueueItem | null>(null);
  const [absentReason, setAbsentReason] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning'>('success');
  const [showPriorityDialog, setShowPriorityDialog] = useState<boolean>(false);
  const [selectedQueueForPriority, setSelectedQueueForPriority] = useState<QueueItem | null>(null);
  const [newPriority, setNewPriority] = useState<number>(3);
  const [priorityReason, setPriorityReason] = useState<string>('');
  const [showLogDialog, setShowLogDialog] = useState<boolean>(false);
  const [selectedQueueForLog, setSelectedQueueForLog] = useState<QueueItem | null>(null);
  const [queueLogs, setQueueLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState<boolean>(true);
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);
  
  // State สำหรับการกรอกประวัติการรักษา
  const [showMedicalRecordDialog, setShowMedicalRecordDialog] = useState<boolean>(false);
  const [selectedQueueForMedicalRecord, setSelectedQueueForMedicalRecord] = useState<QueueItem | null>(null);
  const [medicalRecordData, setMedicalRecordData] = useState({
    chief_complaint: '',
    diagnosis: '',
    treatment_plan: '',
    medications: [] as string[],
    notes: ''
  });
  const [medicalRecordLoading, setMedicalRecordLoading] = useState<boolean>(false);
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Department configuration with icons and colors
  const departmentConfig: { [key: string]: { icon: React.ReactNode; color: string; bgColor: string; shortName: string; thaiCode: string } } = {
    'GEN': { icon: <HospitalIcon />, color: '#1976d2', bgColor: '#e3f2fd', shortName: 'GEN', thaiCode: 'ทว' },
    'CAR': { icon: <HeartIcon />, color: '#d32f2f', bgColor: '#ffebee', shortName: 'CAR', thaiCode: 'หจ' },
    'NEU': { icon: <PsychologyIcon />, color: '#7b1fa2', bgColor: '#f3e5f5', shortName: 'NEU', thaiCode: 'ปส' },
    'ORT': { icon: <HealingIcon />, color: '#388e3c', bgColor: '#e8f5e8', shortName: 'ORT', thaiCode: 'กข' },
    'EYE': { icon: <EyeIcon />, color: '#f57c00', bgColor: '#fff3e0', shortName: 'EYE', thaiCode: 'ตา' },
    'EMR': { icon: <EmergencyIcon />, color: '#c62828', bgColor: '#ffebee', shortName: 'EMR', thaiCode: 'ฉก' },
    'ENT': { icon: <HospitalIcon />, color: '#9c27b0', bgColor: '#f3e5f5', shortName: 'ENT', thaiCode: 'หู' },
    'PED': { icon: <HospitalIcon />, color: '#ff9800', bgColor: '#fff3e0', shortName: 'PED', thaiCode: 'เด็ก' },
    'OBG': { icon: <HospitalIcon />, color: '#e91e63', bgColor: '#fce4ec', shortName: 'OBG', thaiCode: 'สูติ' },
    'SUR': { icon: <HospitalIcon />, color: '#795548', bgColor: '#efebe9', shortName: 'SUR', thaiCode: 'ศัล' }
  };

  // Load departments from API
  const loadDepartments = async () => {
    setDepartmentsLoading(true);
    try {
      console.log('[DEBUG] Loading departments from API');
      const response = await axios.get(`${API_BASE_URL}/api/workplace/department`);
      const apiDepartments = response.data || [];
      console.log('[DEBUG] API departments:', apiDepartments);
      
      // ถ้าไม่มีข้อมูลจาก API ให้ใช้ข้อมูลสำรอง
      let departmentsToUse = apiDepartments;
      if (apiDepartments.length === 0) {
        console.log('[DEBUG] No departments from API, using fallback');
        departmentsToUse = [
          { id: 'GEN', name: 'แผนกผู้ป่วยนอก', rooms: ['ห้องตรวจ 1', 'ห้องตรวจ 2', 'ห้องตรวจ 3'] },
          { id: 'EMR', name: 'แผนกฉุกเฉิน', rooms: ['ห้องฉุกเฉิน 1', 'ห้องฉุกเฉิน 2'] },
          { id: 'CAR', name: 'แผนกหัวใจ', rooms: ['ห้องหัวใจ 1', 'ห้องหัวใจ 2'] }
        ];
      }
      
      // แปลงข้อมูลจาก API เป็นรูปแบบที่ใช้ใน component
      const formattedDepartments = departmentsToUse.map((dept: any) => {
        const config = departmentConfig[dept.id] || departmentConfig['GEN'];
        return {
          id: dept.id,
          name: dept.name,
          shortName: config.shortName,
          thaiCode: config.thaiCode,
          icon: config.icon,
          color: config.color,
          bgColor: config.bgColor,
          rooms: dept.rooms || ['ห้องตรวจ 1', 'ห้องตรวจ 2', 'ห้องตรวจ 3'] // fallback rooms
        };
      });
      
      console.log('[DEBUG] Formatted departments:', formattedDepartments);
      setDepartments(formattedDepartments);
      
      // ถ้ายังไม่ได้เลือกแผนก ให้เลือกแผนกแรก
      if (!selectedDepartment && formattedDepartments.length > 0) {
        console.log('[DEBUG] Auto-selecting first department in loadDepartments:', formattedDepartments[0].id);
        setSelectedDepartment(formattedDepartments[0].id);
      }
      
    } catch (err) {
      console.error('Error loading departments:', err);
      showSnackbar('ไม่สามารถโหลดข้อมูลแผนกได้', 'error');
    } finally {
      setDepartmentsLoading(false);
    }
  };

  // Load real queue data from API by department
  const loadQueueData = async () => {
    setLoading(true);
    try {
      console.log('[DEBUG] Loading queue data for department:', selectedDepartment);
      
      if (!selectedDepartment) {
        console.log('[DEBUG] No department selected, skipping load');
        setRoomStatuses([]);
        setNextQueues([]);
        setAvailableRooms([]);
        return;
      }
      
      // รันระบบจัดการคิวอัตโนมัติก่อน
      try {
        console.log('[DEBUG] Running auto queue management...');
        await axios.post(`${API_BASE_URL}/api/queue/queues/auto-manage`);
        console.log('[DEBUG] Auto management completed');
      } catch (autoError) {
        console.warn('[WARN] Auto management failed:', autoError);
        // ไม่ให้หยุดการทำงาน ถ้าระบบอัตโนมัติล้มเหลว
      }
      
      // หาแผนกที่เลือกจาก state ที่มีอยู่แล้ว
      const currentDeptData = departments.find((dept: Department) => dept.id === selectedDepartment);
      console.log('[DEBUG] Current department data:', currentDeptData);
      
      if (!currentDeptData || departments.length === 0) {
        console.log('[DEBUG] Department not found or departments not loaded yet');
        // ไม่ต้อง show error เพราะอาจจะยัง loading departments อยู่
        return;
      }
      
      // ดึงข้อมูลห้อง (room_schedule) ที่เป็นของแผนกนี้
      console.log('[DEBUG] Fetching room schedules for department');
      let departmentRooms: any[] = [];
      
      try {
        // เปลี่ยนมาใช้ room_schedule แทน room เพราะ queue.room_id อ้างถึง room_schedule._id
        const roomScheduleResponse = await axios.get(`${API_BASE_URL}/api/workplace/room_schedule`);
        const allRoomSchedules = roomScheduleResponse.data || [];
        console.log('[DEBUG] All room schedules:', allRoomSchedules);
        
        // กรองห้องตามแผนก
        departmentRooms = allRoomSchedules.filter((roomSchedule: any) => 
          roomSchedule.departmentId === selectedDepartment
        );
        console.log('[DEBUG] Department room schedules from API:', departmentRooms);
        
        // ถ้าไม่มี room_schedule ให้ลองใช้ room และสร้าง fallback
        if (departmentRooms.length === 0) {
          console.log('[DEBUG] No room schedules, trying regular rooms');
          const roomsResponse = await axios.get(`${API_BASE_URL}/api/workplace/room`);
          const allRooms = roomsResponse.data || [];
          console.log('[DEBUG] All rooms:', allRooms);
          
          // กรองห้องตามแผนก และสร้าง room_schedule จำลอง
          const filteredRooms = allRooms.filter((room: any) => 
            room.departmentId === selectedDepartment
          );
          
          departmentRooms = filteredRooms.map((room: any) => ({
            _id: `schedule_${room.id}`,
            roomId: room.id,
            name: room.name,
            departmentId: room.departmentId,
            isOpen: true,
            isActive: true,
            room_type: room.room_type || 'general'
          }));
        }
      } catch (roomError) {
        console.log('[DEBUG] Failed to fetch room schedules from API, using fallback:', roomError);
        // ใช้ห้องจาก departments state เป็น fallback
        departmentRooms = (currentDeptData.rooms || []).map((roomName: string, index: number) => ({
          _id: `room_${index}`,
          id: `room_${index}`,
          name: roomName,
          isOpen: true
        }));
      }
      
      // ดึงคิวทั้งหมดที่เป็น waiting และ in_progress
      console.log('[DEBUG] Fetching all queues');
      const [allQueuesResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/queue/all_queues`)
      ]);
      
      const allQueues = allQueuesResponse.data || [];
      console.log('[DEBUG] All queues:', allQueues.length);
      
      // แยกคิวตามสถานะ
      const waitingQueues = allQueues.filter((q: QueueItem) => q.status === 'waiting');
      const inProgressQueues = allQueues.filter((q: QueueItem) => q.status === 'in_progress');
      console.log('[DEBUG] Waiting queues:', waitingQueues.length);
      console.log('[DEBUG] In-progress queues:', inProgressQueues.length);
      
      // สร้าง room statuses จากข้อมูลจริง
      const rooms = departmentRooms.map((roomSchedule: any) => {
        // หาคิวที่กำลังตรวจในห้องนี้ โดยเปรียบเทียบกับ room_id ที่เป็น ObjectId ของ room_schedule
        const roomQueue = inProgressQueues.find((q: QueueItem) => {
          // ถ้า queue.room_id ตรงกับ id ของ room_schedule (จาก API ส่งคืนเป็น id ไม่ใช่ _id)
          const queueRoomId = String(q.room_id);
          const scheduleId = String(roomSchedule.id);
          return queueRoomId === scheduleId;
        });
        
        console.log(`[DEBUG] Room Schedule ${roomSchedule.id} (roomId: ${roomSchedule.roomId}) - Found queue:`, roomQueue ? roomQueue.queue_no : 'None');
        console.log(`[DEBUG] Comparing queue.room_id "${roomQueue?.room_id}" with roomSchedule.id "${roomSchedule.id}"`);
        
        // ใช้ชื่อห้องจาก name หรือ roomId
        const roomName = roomSchedule.name || `ห้อง ${roomSchedule.roomId}` || `ห้อง ${roomSchedule.id}`;
        
        return {
          room: roomName,
          currentQueue: roomQueue ? {
            ...roomQueue,
            queue_code: roomQueue.queue_no,
            patient_name: roomQueue.patient ? 
              `${roomQueue.patient.first_name_th} ${roomQueue.patient.last_name_th}` : 
              'ไม่ระบุชื่อ',
            priority_level: getPriorityText(roomQueue.priority),
            medical_condition: roomQueue.symptoms || 'ไม่ระบุอาการ'
          } : null,
          isActive: roomSchedule.isOpen !== false && roomSchedule.isActive !== false, // ห้องต้องเปิดและ active
          room_id: roomSchedule.id // เก็บ room_schedule id ไว้สำหรับ reference
        };
      });
      console.log('[DEBUG] Created room statuses:', rooms);
      
      // เลือกห้องแรกถ้ายังไม่ได้เลือก
      if (!selectedRoom && rooms.length > 0) {
        setSelectedRoom(rooms[0].room);
      }
      
      // แปลงข้อมูลคิวถัดไป
      const next = waitingQueues.map((queue: QueueItem) => ({
        ...queue,
        queue_code: queue.queue_no,
        patient_name: queue.patient ? 
          `${queue.patient.first_name_th} ${queue.patient.last_name_th}` : 
          'ไม่ระบุชื่อ',
        priority_level: getPriorityText(queue.priority),
        medical_condition: queue.symptoms || 'ไม่ระบุอาการ',
        estimated_time: formatQueueTime(queue.queue_time)
      }));
      console.log('[DEBUG] Next queues:', next);
      
      setRoomStatuses(rooms);
      setNextQueues(next);
      
      // อัปเดตรายการห้องที่มีอยู่
      const roomList = rooms.map((r: RoomStatus) => r.room);
      setAvailableRooms(roomList);
      console.log('[DEBUG] Available rooms updated:', roomList);
      
      console.log('[DEBUG] Data loaded successfully');
      
    } catch (err) {
      console.error('Error loading queue data:', err);
      showSnackbar('ไม่สามารถโหลดข้อมูลคิวได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 1: return 'ฉุกเฉิน';
      case 2: return 'เร่งด่วน';
      case 3: return 'ปานกลาง';
      case 4: return 'ไม่เร่งด่วน';
      case 5: return 'ต่ำสุด';
      default: return 'ไม่ระบุ';
    }
  };

  const formatQueueTime = (queueTime: string) => {
    const date = new Date(queueTime);
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Load departments on component mount
  useEffect(() => {
    console.log('[DEBUG] Component mounted, loading departments');
    loadDepartments();
  }, []);

  // Load data when departments are loaded (first time) or department changes
  useEffect(() => {
    console.log('[DEBUG] useEffect triggered - department changed to:', selectedDepartment);
    console.log('[DEBUG] Departments available:', departments.length);
    
    // ถ้ายังไม่ได้เลือกแผนกและมีแผนกให้เลือก ให้เลือกแผนกแรก
    if (!selectedDepartment && departments.length > 0) {
      console.log('[DEBUG] Auto-selecting first department:', departments[0].id);
      setSelectedDepartment(departments[0].id);
      return;
    }
    
    // ถ้าเลือกแผนกแล้วให้โหลดข้อมูล
    if (selectedDepartment && departments.length > 0) {
      loadQueueData();
    }
  }, [selectedDepartment, departments]);

  // Auto refresh data every 30 seconds
  useEffect(() => {
    console.log('[DEBUG] Setting up auto-refresh interval');
    const interval = setInterval(() => {
      if (selectedDepartment) {
        console.log('[DEBUG] Auto-refresh triggered');
        loadQueueData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedDepartment]);

  const getCurrentDepartment = () => {
    const dept = departments.find(dept => dept.id === selectedDepartment) || departments[0];
    console.log('[DEBUG] getCurrentDepartment - selectedDepartment:', selectedDepartment, 'found:', dept);
    return dept;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'ฉุกเฉิน':
        return '#d32f2f';
      case 'เร่งด่วน':
        return '#f57c00';
      case 'ปานกลาง':
        return '#1976d2';
      case 'ไม่เร่งด่วน':
        return '#388e3c';
      default:
        return '#757575';
    }
  };

  const handleDepartmentChange = (event: SelectChangeEvent) => {
    const newDepartment = event.target.value;
    console.log('[DEBUG] Department changed from', selectedDepartment, 'to', newDepartment);
    setSelectedDepartment(newDepartment);
  };

  const handleRoomChange = (event: SelectChangeEvent) => {
    const newRoom = event.target.value;
    console.log('[DEBUG] Room changed from', selectedRoom, 'to', newRoom);
    setSelectedRoom(newRoom);
  };

  const handleCompleteQueue = async (roomIndex: number) => {
    const currentQueue = roomStatuses[roomIndex].currentQueue;
    if (!currentQueue) return;

    // เปิด dialog กรอกประวัติการรักษาก่อนเสร็จสิ้นคิว
    setSelectedQueueForMedicalRecord(currentQueue);
    setShowMedicalRecordDialog(true);
  };

  // ฟังก์ชันเสร็จสิ้นคิวหลังจากกรอกประวัติ
  const completeQueueWithMedicalRecord = async () => {
    if (!selectedQueueForMedicalRecord) return;

    try {
      setMedicalRecordLoading(true);

      // บันทึกประวัติการรักษาก่อน
      const medicalRecordPayload = {
        queue_id: selectedQueueForMedicalRecord._id,
        patient_id: selectedQueueForMedicalRecord.patient_id,
        user_id: 'current_doctor', // ควรดึงจาก auth context
        ...medicalRecordData
      };

      console.log('[DEBUG] Saving medical record:', medicalRecordPayload);
      
      // บันทึกประวัติการรักษา
      await axios.post(`${API_BASE_URL}/api/medical-records/add`, medicalRecordPayload);
      
      // จากนั้นเสร็จสิ้นคิว
      const response = await axios.post(`${API_BASE_URL}/api/queue/queue/${selectedQueueForMedicalRecord._id}/complete`);
      
      // Reload data to get updated state
      await loadQueueData();
      
      // แสดงข้อความตามผลลัพธ์
      if (response.data.auto_called_queue) {
        const autoQueue = response.data.auto_called_queue;
        showSnackbar(
          `บันทึกประวัติและเสร็จสิ้นการตรวจ: ${selectedQueueForMedicalRecord.queue_no} | เรียกคิวถัดไป: ${autoQueue.queue_no} อัตโนมัติ`, 
          'success'
        );
      } else {
        showSnackbar(`บันทึกประวัติและเสร็จสิ้นการตรวจ: ${selectedQueueForMedicalRecord.queue_no}`, 'success');
      }

      // ปิด dialog และรีเซ็ตข้อมูล
      setShowMedicalRecordDialog(false);
      setSelectedQueueForMedicalRecord(null);
      resetMedicalRecordData();

    } catch (err) {
      console.error('Error completing queue with medical record:', err);
      showSnackbar('ไม่สามารถบันทึกประวัติการรักษาได้', 'error');
    } finally {
      setMedicalRecordLoading(false);
    }
  };

  // ฟังก์ชันรีเซ็ตข้อมูลประวัติการรักษา
  const resetMedicalRecordData = () => {
    setMedicalRecordData({
      chief_complaint: '',
      diagnosis: '',
      treatment_plan: '',
      medications: [],
      notes: ''
    });
  };

  // ฟังก์ชันเพิ่มยา
  const addMedication = () => {
    setMedicalRecordData(prev => ({
      ...prev,
      medications: [...prev.medications, '']
    }));
  };

  // ฟังก์ชันลบยา
  const removeMedication = (index: number) => {
    setMedicalRecordData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  // ฟังก์ชันอัปเดตยา
  const updateMedication = (index: number, value: string) => {
    setMedicalRecordData(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => i === index ? value : med)
    }));
  };

  const handleCallQueue = async (queue: QueueItem) => {
    try {
      await axios.post(`${API_BASE_URL}/api/queue/queue/${queue._id}/call`);
      
      // Reload data to get updated state
      await loadQueueData();
      showSnackbar(`เรียกคิว: ${queue.queue_no}`, 'success');
    } catch (err) {
      console.error('Error calling queue:', err);
      showSnackbar('ไม่สามารถเรียกคิวได้', 'error');
    }
  };

  const handleAutoCall = async () => {
    try {
      console.log('[DEBUG] Running comprehensive auto management...');
      
      // รันระบบจัดการคิวอัตโนมัติทั้งหมด
      const response = await axios.post(`${API_BASE_URL}/api/queue/queues/auto-manage`);
      console.log('[DEBUG] Auto management response:', response.data);
      
      // Reload data to get updated state
      await loadQueueData();
      
      const results = response.data;
      let message = 'ระบบอัตโนมัติเสร็จสิ้น';
      
      if (results.assigned_rooms > 0 || results.progressed_queues > 0) {
        message += ` - จัดห้อง: ${results.assigned_rooms} คิว, เปลี่ยนสถานะ: ${results.progressed_queues} คิว`;
      }
      
      showSnackbar(message, 'success');
    } catch (err) {
      console.error('Error in auto management:', err);
      showSnackbar('ไม่สามารถรันระบบอัตโนมัติได้', 'error');
    }
  };

  const handleMarkAbsent = (queue: QueueItem) => {
    setSelectedQueueForAbsent(queue);
    setShowAbsentDialog(true);
  };

  const confirmAbsent = async () => {
    if (selectedQueueForAbsent) {
      try {
        await axios.post(`${API_BASE_URL}/api/queue/queue/${selectedQueueForAbsent._id}/skip`, {
          reason: absentReason
        });
        
        // Reload data to get updated state
        await loadQueueData();
        showSnackbar(`บันทึกการไม่มา: ${selectedQueueForAbsent.queue_no} - ${absentReason}`, 'warning');
      
      setShowAbsentDialog(false);
      setSelectedQueueForAbsent(null);
      setAbsentReason('');
      } catch (err) {
        console.error('Error marking absent:', err);
        showSnackbar('ไม่สามารถบันทึกการไม่มาได้', 'error');
      }
    }
  };

  const handleChangePriority = (queue: QueueItem) => {
    setSelectedQueueForPriority(queue);
    setNewPriority(queue.priority);
    setPriorityReason('');
    setShowPriorityDialog(true);
  };

  const confirmPriorityChange = async () => {
    if (selectedQueueForPriority) {
      try {
        await axios.post(`${API_BASE_URL}/api/queue-logs/queues/priority-change`, {
          queue_id: selectedQueueForPriority._id,
          priority: newPriority,
          reason: priorityReason,
          user_id: 'current_user', // ควรดึงจาก auth context
          user_type: 'doctor'
        });
        
        // Reload data to get updated state
        await loadQueueData();
        showSnackbar(`เปลี่ยน priority: ${selectedQueueForPriority.queue_no} เป็น ${getPriorityText(newPriority)}`, 'success');
        
        setShowPriorityDialog(false);
        setSelectedQueueForPriority(null);
        setPriorityReason('');
      } catch (err) {
        console.error('Error changing priority:', err);
        showSnackbar('ไม่สามารถเปลี่ยน priority ได้', 'error');
      }
    }
  };

  const handleViewLogs = async (queue: QueueItem) => {
    setSelectedQueueForLog(queue);
    setShowLogDialog(true);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/queue-logs/queue/${queue._id}/history`);
      setQueueLogs(response.data.history || []);
    } catch (err) {
      console.error('Error loading queue logs:', err);
      showSnackbar('ไม่สามารถโหลดประวัติคิวได้', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const currentDept = getCurrentDepartment();
  console.log('[DEBUG] Current department in render:', currentDept);
  console.log('[DEBUG] Room statuses:', roomStatuses);
  console.log('[DEBUG] Next queues:', nextQueues);
  console.log('[DEBUG] Selected department:', selectedDepartment);
  console.log('[DEBUG] Selected room:', selectedRoom);

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: currentDept?.bgColor || '#e3f2fd',
      p: 3
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Card elevation={3} sx={{ borderRadius: '16px', mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: currentDept?.color || '#1976d2' }}>
                    {currentDept?.icon && React.cloneElement(currentDept.icon as React.ReactElement, { sx: { fontSize: 40 } })}
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                      จัดการคิวผู้ป่วย
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      ระบบจัดการคิวสำหรับเจ้าหน้าที่
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                  <FormControl variant="outlined" sx={{ minWidth: 200 }}>
                    <InputLabel>เลือกแผนก</InputLabel>
                    <Select
                      value={selectedDepartment}
                      onChange={handleDepartmentChange}
                      label="เลือกแผนก"
                      disabled={departmentsLoading}
                    >
                      {departmentsLoading ? (
                        <MenuItem disabled>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={20} />
                            <Typography>กำลังโหลด...</Typography>
                          </Box>
                        </MenuItem>
                      ) : (
                        departments.map((dept) => (
                        <MenuItem key={dept.id} value={dept.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ color: dept.color }}>
                              {React.cloneElement(dept.icon as React.ReactElement, { sx: { fontSize: 20 } })}
                            </Box>
                            {dept.name}
                          </Box>
                        </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                  
                  <FormControl variant="outlined" sx={{ minWidth: 150 }}>
                    <InputLabel>เลือกห้อง</InputLabel>
                    <Select
                      value={selectedRoom}
                      onChange={handleRoomChange}
                      label="เลือกห้อง"
                      disabled={departmentsLoading || !currentDept}
                    >
                      <MenuItem value="">ทั้งหมด</MenuItem>
                      {availableRooms.map((room, index) => (
                        <MenuItem key={index} value={room}>
                          {room}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <Button
                    onClick={handleAutoCall}
                    variant="contained"
                    color="secondary"
                    startIcon={<ScheduleIcon />}
                    sx={{ mr: 1 }}
                  >
                    เรียกคิวอัตโนมัติ
                  </Button>
                  
                  <IconButton 
                    onClick={loadQueueData}
                    color="primary"
                    sx={{ 
                      bgcolor: 'primary.light',
                      '&:hover': { bgcolor: 'primary.main', color: 'white' }
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Current Department Display */}
        {departmentsLoading ? (
          <Card elevation={4} sx={{ borderRadius: '16px', mb: 3, bgcolor: '#1976d2', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={24} sx={{ color: 'white' }} />
                <Typography variant="h5" fontWeight="bold">
                  กำลังโหลดข้อมูลแผนก...
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : currentDept && (
          <Card elevation={4} sx={{ borderRadius: '16px', mb: 3, bgcolor: currentDept?.color || '#1976d2', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" fontWeight="bold">
                {currentDept?.name || 'กำลังโหลด...'} 
                {selectedRoom ? ` - ${selectedRoom}` : ' - ทั้งหมด'}
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Room Status Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {roomStatuses
            .filter(room => !selectedRoom || room.room === selectedRoom)
            .map((roomStatus, index) => (
            <Grid item xs={12} md={6} lg={4} key={roomStatus.room}>
              <Card 
                elevation={4}
                sx={{ 
                  borderRadius: '16px',
                  border: `3px solid ${currentDept?.color || '#1976d2'}`,
                  bgcolor: roomStatus.currentQueue ? 'white' : 'grey.100',
                  minHeight: '250px'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold" color={currentDept?.color || '#1976d2'}>
                      {roomStatus.room}
                    </Typography>
                    <Chip 
                      label={roomStatus.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      color={roomStatus.isActive ? 'success' : 'default'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Box>

                  {roomStatus.currentQueue ? (
                    <Box>
                      <Typography 
                        variant="h3" 
                        fontWeight="bold" 
                        color={currentDept?.color || '#1976d2'}
                        textAlign="center"
                        sx={{ mb: 2 }}
                      >
                        {roomStatus.currentQueue.queue_no}
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body1" fontWeight="medium">
                          ชื่อ: {roomStatus.currentQueue.patient?.first_name_th} {roomStatus.currentQueue.patient?.last_name_th}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          อาการ: {roomStatus.currentQueue.symptoms || 'ไม่ระบุอาการ'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          เวลา: {formatQueueTime(roomStatus.currentQueue.queue_time)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                        <Chip 
                          label={getPriorityText(roomStatus.currentQueue.priority)}
                          sx={{ 
                            bgcolor: getPriorityColor(getPriorityText(roomStatus.currentQueue.priority)),
                            color: 'white'
                          }}
                          size="small"
                        />
                        <Chip 
                          label="กำลังตรวจ"
                          color="info"
                          size="small"
                        />
                      </Box>

                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        startIcon={<CheckIcon />}
                        onClick={() => handleCompleteQueue(index)}
                        sx={{ 
                          borderRadius: '12px',
                          py: 1.5,
                          fontWeight: 'bold'
                        }}
                      >
                        ตรวจเสร็จแล้ว
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <ScheduleIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                      <Typography variant="h6" color="grey.600">
                        ไม่มีคิว
                      </Typography>
                      <Typography variant="body2" color="grey.500">
                        รอคิวถัดไป
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Next Queues */}
        <Card elevation={3} sx={{ borderRadius: '16px' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Typography variant="h5" fontWeight="bold" color="primary">
              คิวถัดไป ({nextQueues.length} คิว)
            </Typography>
              {loading && <CircularProgress size={24} />}
            </Box>
            
            {nextQueues.length > 0 ? (
              <List>
                {nextQueues.map((queue, index) => (
                  <React.Fragment key={queue._id}>
                    <ListItem
                      sx={{
                        bgcolor: index < 3 ? `${currentDept?.color || '#1976d2'}10` : 'transparent',
                        borderRadius: '8px',
                        mb: 1,
                        border: index === 0 ? `2px solid ${currentDept?.color || '#1976d2'}` : '1px solid transparent'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <Typography 
                          variant="h5" 
                          fontWeight="bold" 
                          color={index < 3 ? (currentDept?.color || '#1976d2') : 'text.secondary'}
                          sx={{ minWidth: '80px' }}
                        >
                          {queue.queue_no}
                        </Typography>
                        
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {queue.patient?.first_name_th} {queue.patient?.last_name_th}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {formatQueueTime(queue.queue_time)}
                            </Typography>
                            <Chip 
                              label={getPriorityText(queue.priority)}
                              sx={{ 
                                bgcolor: getPriorityColor(getPriorityText(queue.priority)),
                                color: 'white'
                              }}
                              size="small"
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                              • {queue.symptoms || 'ไม่ระบุอาการ'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            edge="end"
                            color="primary"
                            onClick={() => handleCallQueue(queue)}
                            sx={{ 
                              '&:hover': { 
                                bgcolor: 'primary.light',
                                color: 'white'
                              }
                            }}
                            title="เรียกคิว"
                          >
                            <ScheduleIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            color="warning"
                            onClick={() => handleChangePriority(queue)}
                            sx={{ 
                              '&:hover': { 
                                bgcolor: 'warning.light',
                                color: 'white'
                              }
                            }}
                            title="ลัดคิว"
                          >
                            <EmergencyIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            color="info"
                            onClick={() => handleViewLogs(queue)}
                            sx={{ 
                              '&:hover': { 
                                bgcolor: 'info.light',
                                color: 'white'
                              }
                            }}
                            title="ดูประวัติ"
                          >
                            <RefreshIcon />
                          </IconButton>
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleMarkAbsent(queue)}
                          sx={{ 
                            '&:hover': { 
                              bgcolor: 'error.light',
                              color: 'white'
                            }
                          }}
                            title="ไม่มา"
                        >
                          <AbsentIcon />
                        </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < nextQueues.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ScheduleIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="grey.600">
                  ไม่มีคิวถัดไป
                </Typography>
                <Typography variant="body2" color="grey.500">
                  รอผู้ป่วยลงทะเบียน
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Absent Dialog */}
        <Dialog 
          open={showAbsentDialog} 
          onClose={() => setShowAbsentDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AbsentIcon />
              บันทึกการไม่มา
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {selectedQueueForAbsent && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  คิว: {selectedQueueForAbsent.queue_no}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  ผู้ป่วย: {selectedQueueForAbsent.patient?.first_name_th} {selectedQueueForAbsent.patient?.last_name_th}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  อาการ: {selectedQueueForAbsent.symptoms || 'ไม่ระบุอาการ'}
                </Typography>
              </Box>
            )}
            
            <TextField
              fullWidth
              label="เหตุผลที่ไม่มา"
              multiline
              rows={3}
              value={absentReason}
              onChange={(e) => setAbsentReason(e.target.value)}
              placeholder="ระบุเหตุผล เช่น ไม่มา, ยกเลิกนัด, ไปแล้ว"
              variant="outlined"
            />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => setShowAbsentDialog(false)}
              color="inherit"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={confirmAbsent}
              color="warning"
              variant="contained"
              disabled={!absentReason.trim()}
              startIcon={<CancelIcon />}
            >
              บันทึกการไม่มา
            </Button>
          </DialogActions>
        </Dialog>

        {/* Priority Change Dialog */}
        <Dialog 
          open={showPriorityDialog} 
          onClose={() => setShowPriorityDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmergencyIcon />
              ลัดคิว (เปลี่ยน Priority)
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {selectedQueueForPriority && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  คิว: {selectedQueueForPriority.queue_no}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  ผู้ป่วย: {selectedQueueForPriority.patient?.first_name_th} {selectedQueueForPriority.patient?.last_name_th}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Priority ปัจจุบัน: {getPriorityText(selectedQueueForPriority.priority)}
                </Typography>
              </Box>
            )}
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Priority ใหม่</InputLabel>
              <Select
                value={newPriority}
                onChange={(e) => setNewPriority(Number(e.target.value))}
                label="Priority ใหม่"
              >
                <MenuItem value={1}>1 - ฉุกเฉิน</MenuItem>
                <MenuItem value={2}>2 - เร่งด่วน</MenuItem>
                <MenuItem value={3}>3 - ปานกลาง</MenuItem>
                <MenuItem value={4}>4 - ไม่เร่งด่วน</MenuItem>
                <MenuItem value={5}>5 - ต่ำสุด</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="เหตุผลในการลัดคิว"
              multiline
              rows={3}
              value={priorityReason}
              onChange={(e) => setPriorityReason(e.target.value)}
              placeholder="ระบุเหตุผล เช่น อาการหนัก, ผู้ป่วยสูงอายุ, ฉุกเฉิน"
              variant="outlined"
            />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => setShowPriorityDialog(false)}
              color="inherit"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={confirmPriorityChange}
              color="warning"
              variant="contained"
              disabled={!priorityReason.trim()}
              startIcon={<EmergencyIcon />}
            >
              เปลี่ยน Priority
            </Button>
          </DialogActions>
        </Dialog>

        {/* Queue Logs Dialog */}
        <Dialog 
          open={showLogDialog} 
          onClose={() => setShowLogDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: 'info.main', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RefreshIcon />
              ประวัติคิว
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {selectedQueueForLog && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  คิว: {selectedQueueForLog.queue_no}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  ผู้ป่วย: {selectedQueueForLog.patient?.first_name_th} {selectedQueueForLog.patient?.last_name_th}
                </Typography>
              </Box>
            )}
            
            {queueLogs.length > 0 ? (
              <List>
                {queueLogs.map((log, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {log.action === 'created' && 'สร้างคิว'}
                            {log.action === 'called' && 'เรียกคิว'}
                            {log.action === 'completed' && 'เสร็จสิ้น'}
                            {log.action === 'skipped' && 'ข้ามคิว'}
                            {log.action === 'priority_changed' && 'เปลี่ยน Priority'}
                            {log.action === 'room_changed' && 'เปลี่ยนห้อง'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(log.timestamp).toLocaleString('th-TH')}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          ผู้ทำ: {log.user_type} {log.user_id ? `(${log.user_id})` : ''}
                        </Typography>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            รายละเอียด: {JSON.stringify(log.details, null, 2)}
                          </Typography>
                        )}
                      </Box>
                    </ListItem>
                    {index < queueLogs.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  ไม่มีประวัติการเปลี่ยนแปลง
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => setShowLogDialog(false)}
              color="primary"
              variant="contained"
            >
              ปิด
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog กรอกประวัติการรักษา */}
        <Dialog 
          open={showMedicalRecordDialog} 
          onClose={() => {
            if (!medicalRecordLoading) {
              setShowMedicalRecordDialog(false);
              setSelectedQueueForMedicalRecord(null);
              resetMedicalRecordData();
            }
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: currentDept?.color || '#1976d2', color: 'white' }}>
            <Typography variant="h6">กรอกประวัติการรักษา</Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {selectedQueueForMedicalRecord && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>
                  คิว: {selectedQueueForMedicalRecord.queue_no}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  ผู้ป่วย: {selectedQueueForMedicalRecord.patient?.first_name_th} {selectedQueueForMedicalRecord.patient?.last_name_th}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  เลขบัตรประชาชน: {selectedQueueForMedicalRecord.patient?.national_id}
                </Typography>
              </Box>
            )}
            
            <Grid container spacing={2}>
              {/* อาการหลักที่มาพบ */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="อาการหลักที่มาพบ (Chief Complaint)"
                  multiline
                  rows={2}
                  value={medicalRecordData.chief_complaint}
                  onChange={(e) => setMedicalRecordData(prev => ({ ...prev, chief_complaint: e.target.value }))
                  }
                  placeholder="เช่น ปวดหัว มีไข้ 2 วัน"
                  required
                />
              </Grid>

              {/* การวินิจฉัย */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="การวินิจฉัย (Diagnosis)"
                  multiline
                  rows={2}
                  value={medicalRecordData.diagnosis}
                  onChange={(e) => setMedicalRecordData(prev => ({ ...prev, diagnosis: e.target.value }))
                  }
                  placeholder="โรคที่วินิจฉัย"
                  required
                />
              </Grid>

              {/* แผนการรักษา */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="แผนการรักษา (Treatment Plan)"
                  multiline
                  rows={3}
                  value={medicalRecordData.treatment_plan}
                  onChange={(e) => setMedicalRecordData(prev => ({ ...prev, treatment_plan: e.target.value }))
                  }
                  placeholder="แผนการรักษาและคำแนะนำ"
                />
              </Grid>

              {/* ยาที่จ่าย */}
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    ยาที่จ่าย
                    <Button 
                      size="small" 
                      onClick={addMedication}
                      sx={{ ml: 2 }}
                      variant="outlined"
                    >
                      เพิ่มยา
                    </Button>
                  </Typography>
                  {medicalRecordData.medications.map((medication, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField
                        fullWidth
                        label={`ยา ${index + 1}`}
                        value={medication}
                        onChange={(e) => updateMedication(index, e.target.value)}
                        placeholder="ชื่อยา ขนาด วิธีใช้"
                      />
                      <IconButton 
                        onClick={() => removeMedication(index)}
                        color="error"
                      >
                        <CancelIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Grid>

              {/* หมายเหตุ */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="หมายเหตุเพิ่มเติม"
                  multiline
                  rows={2}
                  value={medicalRecordData.notes}
                  onChange={(e) => setMedicalRecordData(prev => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="หมายเหตุเพิ่มเติม"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => {
                setShowMedicalRecordDialog(false);
                setSelectedQueueForMedicalRecord(null);
                resetMedicalRecordData();
              }}
              disabled={medicalRecordLoading}
              color="inherit"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={completeQueueWithMedicalRecord}
              variant="contained"
              disabled={medicalRecordLoading || !medicalRecordData.chief_complaint || !medicalRecordData.diagnosis}
              startIcon={medicalRecordLoading ? <CircularProgress size={20} /> : <CheckIcon />}
            >
              {medicalRecordLoading ? 'กำลังบันทึก...' : 'บันทึกและเสร็จสิ้น'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarSeverity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default ManageQueue;
