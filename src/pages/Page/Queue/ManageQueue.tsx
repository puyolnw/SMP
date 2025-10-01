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
  Skeleton,
} from '@mui/material';
import axios from 'axios';
import { getUserRole } from '../../../utils/auth';
import { getCurrentUser } from '../../../utils/auth';
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
  // เพิ่ม properties สำหรับการแสดงผล
  patient_name?: string;
  medical_condition?: string;
  queue_code?: string;
  priority_level?: string;
  estimated_time?: string;
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
  const [selectedPatientData, setSelectedPatientData] = useState<any>(null); // เพิ่ม state สำหรับข้อมูลผู้ป่วย
  const [patientDataLoading, setPatientDataLoading] = useState<boolean>(false); // loading สำหรับโหลดข้อมูลผู้ป่วย
  const [medicalRecordData, setMedicalRecordData] = useState({
    chief_complaint: '',
    diagnosis: '',
    treatment_plan: '',
    medications: [] as string[],
    notes: ''
  });
  const [medicalRecordLoading, setMedicalRecordLoading] = useState<boolean>(false);
  const [autoCallEnabled, setAutoCallEnabled] = useState<boolean>(true); // สถานะระบบอัตโนมัติ
  const [lastAutoCallTime, setLastAutoCallTime] = useState<Date | null>(null); // เวลาล่าสุดที่รันอัตโนมัติ
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const userRole = getUserRole();
  const isDoctor = userRole === 'doctor';

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
          { id: 'EMR', name: 'แผนกวิกฤต', rooms: ['ห้องวิกฤต 1', 'ห้องวิกฤต 2'] },
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
        setLoading(false); // เพิ่มการปิด loading เมื่อไม่มีแผนกที่เลือก
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
        // รีเซ็ต loading และออกจากฟังก์ชัน
        setLoading(false);
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
      
      // เลือกห้องแรกถ้ายังไม่ได้เลือก และยังไม่เคยเลือกมาก่อน (selectedRoom เป็น null หรือ undefined)
      if (selectedRoom === null || selectedRoom === undefined) {
        if (rooms.length > 0) {
          console.log('[DEBUG] Auto-selecting first room:', rooms[0].room);
          setSelectedRoom(rooms[0].room);
        }
      } else if (selectedRoom !== "" && rooms.length > 0) {
        // ถ้าเลือกห้องเฉพาะ ตรวจสอบว่าห้องที่เลือกยังมีอยู่ไหม
        const roomExists = rooms.some((r: RoomStatus) => r.room === selectedRoom);
        if (!roomExists) {
          console.log('[DEBUG] Selected room no longer exists, selecting first room');
          setSelectedRoom(rooms[0].room);
        } else {
          console.log('[DEBUG] Keeping selected room:', selectedRoom);
        }
      } else if (selectedRoom === "") {
        // ถ้าเลือก "ทั้งหมด" ก็คงไว้
        console.log('[DEBUG] Keeping "All rooms" selection');
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
      
      // ใช้ข้อมูลว่างเป็น fallback เพื่อไม่ให้ loading ติดค้าง
      setRoomStatuses([]);
      setNextQueues([]);
      setAvailableRooms([]);
      
    } finally {
      setLoading(false);
    }
  };

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 1: return 'วิกฤต';
      case 2: return 'เร่งด่วน';
      case 3: return 'ปานกลาง';
      case 4: return 'ไม่เร่งด่วน';
      case 5: return 'ปกติ';
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
    // รีเซ็ต loading state เมื่อ mount component
    setLoading(false);
    setDepartmentsLoading(true);
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
      // เพิ่ม timeout เพื่อป้องกัน loading ติดค้าง
      const loadTimeout = setTimeout(() => {
        console.warn('[WARN] Loading timeout, forcing loading state to false');
        setLoading(false);
      }, 30000); // 30 วินาที
      
      loadQueueData().finally(() => {
        clearTimeout(loadTimeout);
      });
    } else {
      // รีเซ็ต loading state เมื่อไม่มีแผนกที่เลือก
      setLoading(false);
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

  // Background Auto-Call every 15 seconds
  useEffect(() => {
    console.log('[DEBUG] Setting up background auto-call interval');
    const autoCallInterval = setInterval(async () => {
      if (selectedDepartment && autoCallEnabled) {
        try {
          console.log('[DEBUG] Background auto-call triggered');
          setLastAutoCallTime(new Date()); // อัปเดตเวลาล่าสุด
          
          const response = await axios.post(`${API_BASE_URL}/api/queue/queues/auto-manage`);
          console.log('[DEBUG] Background auto-call completed:', response.data);
          
          // แสดงแจ้งเตือนเฉพาะเมื่อมีการทำงานจริง
          const results = response.data;
          if (results.assigned_rooms > 0 || results.progressed_queues > 0 || results.called_immediate_queues > 0) {
            let message = '🔄 ระบบอัตโนมัติ: ';
            const actions = [];
            
            if (results.assigned_rooms > 0) actions.push(`จัดห้อง ${results.assigned_rooms} คิว`);
            if (results.progressed_queues > 0) actions.push(`เปลี่ยนสถานะ ${results.progressed_queues} คิว`);
            if (results.called_immediate_queues > 0) actions.push(`เรียกวิกฤต ${results.called_immediate_queues} คิว`);
            
            message += actions.join(', ');
            showSnackbar(message, 'success');
            
            // รีเฟรชข้อมูลทันทีหลังจากมีการเปลี่ยนแปลง
            setTimeout(() => loadQueueData(), 1000);
          }
        } catch (error) {
          console.warn('[WARN] Background auto-call failed:', error);
          // ไม่แสดง error message เพื่อไม่รบกวนผู้ใช้
        }
      }
    }, 15000); // ทุก 15 วินาที
    
    return () => clearInterval(autoCallInterval);
  }, [selectedDepartment, autoCallEnabled]);

  const getCurrentDepartment = () => {
    const dept = departments.find(dept => dept.id === selectedDepartment) || departments[0];
    console.log('[DEBUG] getCurrentDepartment - selectedDepartment:', selectedDepartment, 'found:', dept);
    return dept;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'วิกฤต':
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
    if (!isDoctor) {
      showSnackbar('อนุญาตเฉพาะแพทย์เท่านั้น', 'error');
      return;
    }
    const currentQueue = roomStatuses[roomIndex].currentQueue;
    if (!currentQueue) return;

    // เปิด dialog กรอกประวัติการรักษาก่อนเสร็จสิ้นคิว
    setSelectedQueueForMedicalRecord(currentQueue);
    setSelectedPatientData(null); // รีเซ็ตข้อมูลผู้ป่วยเก่า
    setShowMedicalRecordDialog(true);

    // โหลดข้อมูลผู้ป่วยแยก
    await loadPatientData(currentQueue.patient_id);
  };

  // ฟังก์ชันโหลดข้อมูลผู้ป่วย
  const loadPatientData = async (patientId: string) => {
    try {
      setPatientDataLoading(true);
      console.log('[DEBUG] Loading patient data for ID:', patientId);
      
      const response = await axios.get(`${API_BASE_URL}/api/patient/${patientId}`);
      const patientData = response.data;
      
      console.log('[DEBUG] Patient data loaded:', patientData);
      setSelectedPatientData(patientData);
      
    } catch (error) {
      console.error('Error loading patient data:', error);
      showSnackbar('ไม่สามารถโหลดข้อมูลผู้ป่วยได้', 'error');
      setSelectedPatientData({
        first_name_th: 'ไม่สามารถโหลดข้อมูล',
        last_name_th: '',
        national_id: 'ไม่ระบุ'
      });
    } finally {
      setPatientDataLoading(false);
    }
  };

  // ฟังก์ชันเสร็จสิ้นคิวหลังจากกรอกประวัติ
  const completeQueueWithMedicalRecord = async () => {
    if (!selectedQueueForMedicalRecord) return;

    try {
      setMedicalRecordLoading(true);

      // ดึง user ID ของหมอที่ล็อกอินอยู่
      const currentUser = getCurrentUser();
      const doctorUserId = currentUser?.id ? String(currentUser.id) : null;
      
      // เพิ่ม debug logging เพื่อตรวจสอบข้อมูล
      console.log('[DEBUG] localStorage token:', localStorage.getItem('token'));
      console.log('[DEBUG] localStorage userData:', localStorage.getItem('userData'));
      console.log('[DEBUG] Current user:', currentUser);
      console.log('[DEBUG] Current user ID:', currentUser?.id);
      console.log('[DEBUG] Doctor user ID:', doctorUserId);
      
      if (!doctorUserId) {
        showSnackbar('ไม่สามารถระบุตัวตนแพทย์ได้', 'error');
        return;
      }

      // บันทึกประวัติการรักษาก่อน
      const medicalRecordPayload = {
        queue_id: selectedQueueForMedicalRecord._id,
        patient_id: selectedQueueForMedicalRecord.patient_id,
        user_id: doctorUserId, // ใช้ user ID จริงของแพทย์ที่ล็อกอิน
        created_by_role: 'doctor',
        ...medicalRecordData
      };

      console.log('[DEBUG] Saving medical record with doctor ID:', doctorUserId);
      console.log('[DEBUG] Medical record payload:', medicalRecordPayload);
      
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
      setSelectedPatientData(null);
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
      setLoading(true); // เพิ่ม loading indicator
      await axios.post(`${API_BASE_URL}/api/queue/queue/${queue._id}/call`);
      
      // Reload data to get updated state
      await loadQueueData();
      showSnackbar(`เรียกคิว: ${queue.queue_no}`, 'success');
    } catch (err: any) {
      console.error('Error calling queue:', err);
      
      // ตรวจสอบว่าเป็น error เรื่องห้องไม่ว่าง
      if (err.response && err.response.status === 409) {
        const errorData = err.response.data;
        const occupiedBy = errorData.occupied_by;
        
        showSnackbar(
          `ไม่สามารถเรียกคิวได้: ห้องมีคิว ${occupiedBy?.queue_no || 'ไม่ระบุ'} (${occupiedBy?.patient_name || 'ไม่ระบุชื่อ'}) กำลังตรวจอยู่`, 
          'warning'
        );
      } else {
        showSnackbar('ไม่สามารถเรียกคิวได้', 'error');
      }
    } finally {
      setLoading(false); // ปิด loading indicator
    }
  };

  const handleAutoCall = async () => {
    try {
      setLoading(true); // เพิ่ม loading indicator
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
    } finally {
      setLoading(false); // ปิด loading indicator
    }
  };

  const handleMarkAbsent = (queue: QueueItem) => {
    setSelectedQueueForAbsent(queue);
    setShowAbsentDialog(true);
  };

  const confirmAbsent = async () => {
    if (selectedQueueForAbsent) {
      try {
        setLoading(true); // เพิ่ม loading indicator
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
      } finally {
        setLoading(false); // ปิด loading indicator
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
  console.log('[DEBUG] Loading state:', loading);
  console.log('[DEBUG] Departments loading state:', departmentsLoading);

  // แสดง skeleton loading เมื่อ departments กำลังโหลด
  if (departmentsLoading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#e3f2fd',
        p: 3
      }}>
        <Container maxWidth="xl">
          {/* Header Skeleton */}
          <Card elevation={3} sx={{ borderRadius: '16px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box>
                      <Skeleton variant="text" width={200} height={40} />
                      <Skeleton variant="text" width={150} height={20} />
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                    <Skeleton variant="rounded" width={200} height={56} />
                    <Skeleton variant="rounded" width={150} height={56} />
                    <Skeleton variant="rounded" width={120} height={56} />
                    <Skeleton variant="circular" width={56} height={56} />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Department Display Skeleton */}
          <Card elevation={4} sx={{ borderRadius: '16px', mb: 3, bgcolor: '#1976d2', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Skeleton variant="text" width={300} height={40} sx={{ mx: 'auto', bgcolor: 'rgba(255,255,255,0.3)' }} />
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 1 }}>
                <Skeleton variant="rounded" width={120} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                <Skeleton variant="text" width={80} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>

          {/* Room Status Cards Skeleton */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[...Array(3)].map((_, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card 
                  elevation={4}
                  sx={{ 
                    borderRadius: '16px',
                    border: '3px solid #1976d2',
                    minHeight: '250px'
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Skeleton variant="text" width={120} height={30} sx={{ mx: 'auto' }} />
                      <Skeleton variant="rounded" width={80} height={24} sx={{ mx: 'auto', mt: 1 }} />
                    </Box>

                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Skeleton variant="circular" width={60} height={60} sx={{ mx: 'auto', mb: 2 }} />
                      <Skeleton variant="text" width={100} height={30} sx={{ mx: 'auto' }} />
                      <Skeleton variant="text" width={80} height={20} sx={{ mx: 'auto' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Next Queues Skeleton */}
          <Card elevation={3} sx={{ borderRadius: '16px' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Skeleton variant="text" width={200} height={40} />
              </Box>
              
              {[...Array(5)].map((_, index) => (
                <Box key={index} sx={{ 
                  p: 2, 
                  borderRadius: '8px', 
                  mb: 1,
                  border: '1px solid transparent'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Skeleton variant="text" width={80} height={40} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width={200} height={24} />
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Skeleton variant="rounded" width={60} height={20} />
                        <Skeleton variant="rounded" width={80} height={20} />
                        <Skeleton variant="text" width={100} height={20} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Skeleton variant="circular" width={40} height={40} />
                      <Skeleton variant="circular" width={40} height={40} />
                      <Skeleton variant="circular" width={40} height={40} />
                      <Skeleton variant="circular" width={40} height={40} />
                    </Box>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: currentDept?.bgColor || '#e3f2fd',
      p: 3,
      position: 'relative' // เพิ่มเพื่อรองรับ loading overlay
    }}>
      <Container maxWidth="xl">
        
        {/* Loading Overlay - Disabled temporarily for debugging */}
        {false && loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              borderRadius: '16px'
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                กำลังประมวลผล...
              </Typography>
            </Box>
          </Box>
        )}
        
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
                  
                  <Button
                    onClick={() => setAutoCallEnabled(!autoCallEnabled)}
                    variant={autoCallEnabled ? "contained" : "outlined"}
                    color={autoCallEnabled ? "success" : "inherit"}
                    startIcon={autoCallEnabled ? <CheckIcon /> : <CancelIcon />}
                    sx={{ mr: 1 }}
                  >
                    {autoCallEnabled ? "Auto: ON" : "Auto: OFF"}
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
              
              {/* แสดงสถานะระบบอัตโนมัติ */}
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 1 }}>
                <Chip 
                  label={autoCallEnabled ? "🤖 ระบบอัตโนมัติ: เปิด" : "⏸️ ระบบอัตโนมัติ: ปิด"}
                  color={autoCallEnabled ? "success" : "primary"}
                  size="small"
                  sx={{ 
                    bgcolor: autoCallEnabled ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
                {lastAutoCallTime && autoCallEnabled && (
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    ล่าสุด: {lastAutoCallTime.toLocaleTimeString('th-TH')}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Room Status Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {roomStatuses
            .filter(room => !selectedRoom || room.room === selectedRoom)
            .map((roomStatus, index) => (
            <Grid item xs={12} md={6} lg={4} key={`${roomStatus.room_id || index}-${roomStatus.room}`}>
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
                          👤 ชื่อ: {roomStatus.currentQueue.patient?.first_name_th && roomStatus.currentQueue.patient?.last_name_th 
                            ? `${roomStatus.currentQueue.patient.first_name_th} ${roomStatus.currentQueue.patient.last_name_th}`
                            : roomStatus.currentQueue.patient_name || 'ไม่ระบุชื่อ'
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          💬 อาการ: {roomStatus.currentQueue.symptoms || roomStatus.currentQueue.medical_condition || 'ไม่ระบุอาการ'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          🕐 เวลาเข้าคิว: {formatQueueTime(roomStatus.currentQueue.queue_time)}
                        </Typography>
                        
                        {/* แสดงสัญญาณชีพถ้ามี */}
                        {roomStatus.currentQueue.vital_signs && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            📊 สัญญาณชีพ: 
                            {roomStatus.currentQueue.vital_signs.systolic && roomStatus.currentQueue.vital_signs.diastolic && 
                              ` ความดัน ${roomStatus.currentQueue.vital_signs.systolic}/${roomStatus.currentQueue.vital_signs.diastolic} mmHg`}
                            {roomStatus.currentQueue.vital_signs.pulse && 
                              ` ชีพจร ${roomStatus.currentQueue.vital_signs.pulse} ครั้ง/นาที`}
                            {roomStatus.currentQueue.vital_signs.weight && 
                              ` น้ำหนัก ${roomStatus.currentQueue.vital_signs.weight} กก.`}
                          </Typography>
                        )}
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

                      <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
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
                          disabled={!isDoctor}
                          title={isDoctor ? 'ตรวจเสร็จแล้ว' : 'สำหรับแพทย์เท่านั้น'}
                        >
                          ตรวจเสร็จแล้ว
                        </Button>
                        
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            color="info"
                            size="small"
                            onClick={() => roomStatus.currentQueue && handleViewLogs(roomStatus.currentQueue)}
                            startIcon={<RefreshIcon />}
                            sx={{ flex: 1, borderRadius: '8px' }}
                            disabled={!roomStatus.currentQueue}
                          >
                            ประวัติ
                          </Button>
                          <Button
                            variant="outlined"
                            color="warning"
                            size="small"
                            onClick={() => roomStatus.currentQueue && handleMarkAbsent(roomStatus.currentQueue)}
                            startIcon={<CancelIcon />}
                            sx={{ flex: 1, borderRadius: '8px' }}
                            disabled={!roomStatus.currentQueue}
                          >
                            ไม่มา
                          </Button>
                        </Box>
                      </Box>
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
                            {queue.patient?.first_name_th && queue.patient?.last_name_th 
                              ? `${queue.patient.first_name_th} ${queue.patient.last_name_th}`
                              : queue.patient_name || 'ไม่ระบุชื่อ'
                            }
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" color="text.secondary">
                              🕐 {formatQueueTime(queue.queue_time)}
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
                              💬 {queue.symptoms || queue.medical_condition || 'ไม่ระบุอาการ'}
                            </Typography>
                          </Box>
                          
                          {/* แสดงข้อมูลเพิ่มเติมถ้ามี */}
                          {queue.vital_signs && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                📊 สัญญาณชีพ: 
                                {queue.vital_signs.systolic && queue.vital_signs.diastolic && 
                                  ` ความดัน ${queue.vital_signs.systolic}/${queue.vital_signs.diastolic}`}
                                {queue.vital_signs.pulse && ` ชีพจร ${queue.vital_signs.pulse}`}
                                {queue.vital_signs.weight && ` น้ำหนัก ${queue.vital_signs.weight}กก.`}
                              </Typography>
                            </Box>
                          )}
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
                <MenuItem value={1}>1 - วิกฤต</MenuItem>
                <MenuItem value={2}>2 - เร่งด่วน</MenuItem>
                <MenuItem value={3}>3 - ปานกลาง</MenuItem>
                <MenuItem value={4}>4 - ไม่เร่งด่วน</MenuItem>
                <MenuItem value={5}>5 - ปกติ</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="เหตุผลในการลัดคิว"
              multiline
              rows={3}
              value={priorityReason}
              onChange={(e) => setPriorityReason(e.target.value)}
              placeholder="ระบุเหตุผล เช่น อาการหนัก, ผู้ป่วยสูงอายุ, วิกฤต"
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
              📋 ประวัติการดำเนินการคิว
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {selectedQueueForLog && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  🎫 หมายเลขคิว: {selectedQueueForLog.queue_no}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  👤 ชื่อผู้ป่วย: {selectedQueueForLog.patient?.first_name_th && selectedQueueForLog.patient?.last_name_th 
                    ? `${selectedQueueForLog.patient.first_name_th} ${selectedQueueForLog.patient.last_name_th}`
                    : selectedQueueForLog.patient_name || 'ไม่ระบุชื่อ'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  💬 อาการ: {selectedQueueForLog.symptoms || selectedQueueForLog.medical_condition || 'ไม่ระบุอาการ'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  🏥 สถานะปัจจุบัน: {
                    selectedQueueForLog.status === 'waiting' ? '🟡 รอคิว' :
                    selectedQueueForLog.status === 'called' ? '🟠 ถูกเรียกแล้ว' :
                    selectedQueueForLog.status === 'in_progress' ? '🟢 กำลังตรวจ' :
                    selectedQueueForLog.status === 'completed' ? '✅ เสร็จสิ้น' :
                    selectedQueueForLog.status === 'skipped' ? '⏭️ ข้ามแล้ว' :
                    selectedQueueForLog.status
                  }
                </Typography>
              </Box>
            )}
            
            {queueLogs.length > 0 ? (
              <List>
                {queueLogs.map((log, index) => {
                  // ฟังก์ชันแปลการกระทำเป็นภาษาไทยที่อ่านง่าย
                  const getActionText = (action: string) => {
                    switch (action) {
                      case 'created':
                        return '📝 สร้างคิวใหม่';
                      case 'called':
                        return '📢 เรียกคิว';
                      case 'completed':
                        return '✅ เสร็จสิ้นการตรวจ';
                      case 'skipped':
                        return '⏭️ ข้ามคิว/ไม่มา';
                      case 'priority_changed':
                        return '⚠️ ปรับลำดับความสำคัญ';
                      case 'room_changed':
                        return '🔄 เปลี่ยนห้องตรวจ';
                      case 'assigned':
                        return '🏥 จัดห้องตรวจ';
                      case 'started':
                        return '▶️ เริ่มการตรวจ';
                      case 'cancelled':
                        return '❌ ยกเลิกคิว';
                      default:
                        return `🔧 ${action}`;
                    }
                  };

                  // ฟังก์ชันแปลประเภทผู้ใช้เป็นภาษาไทย
                  const getUserTypeText = (userType: string) => {
                    switch (userType) {
                      case 'doctor':
                        return '👨‍⚕️ แพทย์';
                      case 'nurse':
                        return '👩‍⚕️ พยาบาล';
                      case 'admin':
                        return '👨‍💼 ผู้ดูแลระบบ';
                      case 'staff':
                        return '👷‍♀️ เจ้าหน้าที่';
                      case 'system':
                        return '🤖 ระบบอัตโนมัติ';
                      default:
                        return userType;
                    }
                  };

                  return (
                    <React.Fragment key={index}>
                      <ListItem>
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body1" fontWeight="medium" color="primary">
                              {getActionText(log.action)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              🕐 {new Date(log.timestamp).toLocaleString('th-TH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            ดำเนินการโดย: {getUserTypeText(log.user_type)} 
                            {log.user_id ? ` (รหัส: ${log.user_id})` : ''}
                          </Typography>
                          
                          {log.details && Object.keys(log.details).length > 0 && (
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 1.5, 
                              borderRadius: 1, 
                              mt: 1,
                              border: '1px solid',
                              borderColor: 'grey.200'
                            }}>
                              <Typography variant="body2" color="text.secondary" fontWeight="medium" gutterBottom>
                                📋 รายละเอียดเพิ่มเติม:
                              </Typography>
                              {Object.entries(log.details).map(([key, value], detailIndex) => {
                                // แปลชื่อฟิลด์เป็นภาษาไทย
                                const getFieldName = (fieldKey: string) => {
                                  switch (fieldKey) {
                                    case 'reason':
                                      return 'เหตุผล';
                                    case 'old_priority':
                                      return 'ลำดับเดิม';
                                    case 'new_priority':
                                      return 'ลำดับใหม่';
                                    case 'old_room':
                                      return 'ห้องเดิม';
                                    case 'new_room':
                                      return 'ห้องใหม่';
                                    case 'room_id':
                                      return 'หมายเลขห้อง';
                                    case 'queue_time':
                                      return 'เวลาคิว';
                                    case 'wait_time':
                                      return 'เวลารอ';
                                    case 'status':
                                      return 'สถานะ';
                                    case 'vital_signs':
                                      return 'สัญญาณชีพ';
                                    case 'symptoms':
                                      return 'อาการ';
                                    case 'patient_name':
                                      return 'ชื่อผู้ป่วย';
                                    case 'from':
                                      return 'จาก';
                                    case 'to':
                                      return 'เป็น';
                                    default:
                                      return fieldKey;
                                  }
                                };

                                // ฟังก์ชันแปลงค่า object เป็นข้อความที่อ่านได้
                                const formatValue = (key: string, value: any) => {
                                  if (value === null || value === undefined) {
                                    return 'ไม่ระบุ';
                                  }
                                  
                                  // สำหรับ vital_signs
                                  if (key === 'vital_signs' && typeof value === 'object') {
                                    const vitalSigns = [];
                                    if (value.systolic && value.diastolic) {
                                      vitalSigns.push(`💓 ความดัน: ${value.systolic}/${value.diastolic} mmHg`);
                                    }
                                    if (value.pulse) {
                                      vitalSigns.push(`💗 ชีพจร: ${value.pulse} ครั้ง/นาที`);
                                    }
                                    if (value.temperature) {
                                      vitalSigns.push(`🌡️ อุณหภูมิ: ${value.temperature}°C`);
                                    }
                                    if (value.weight) {
                                      vitalSigns.push(`⚖️ น้ำหนัก: ${value.weight} กก.`);
                                    }
                                    if (value.height) {
                                      vitalSigns.push(`📏 ส่วนสูง: ${value.height} ซม.`);
                                    }
                                    if (value.bmi) {
                                      vitalSigns.push(`📊 BMI: ${value.bmi}`);
                                    }
                                    return vitalSigns.length > 0 ? vitalSigns.join(', ') : 'ไม่มีข้อมูล';
                                  }
                                  
                                  // สำหรับ priority
                                  if ((key === 'old_priority' || key === 'new_priority') && typeof value === 'number') {
                                    return getPriorityText(value);
                                  }
                                  
                                  // สำหรับเวลา
                                  if (key.includes('time') && typeof value === 'string') {
                                    try {
                                      return new Date(value).toLocaleString('th-TH');
                                    } catch {
                                      return String(value);
                                    }
                                  }
                                  
                                  // สำหรับ object อื่นๆ ให้แปลงเป็นข้อความสั้นๆ
                                  if (typeof value === 'object' && value !== null) {
                                    // ถ้าเป็น array
                                    if (Array.isArray(value)) {
                                      return value.join(', ');
                                    }
                                    
                                    // ถ้าเป็น object ที่มี properties น้อย
                                    const entries = Object.entries(value);
                                    if (entries.length <= 3) {
                                      return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
                                    }
                                    
                                    // fallback สำหรับ object ใหญ่
                                    return `ข้อมูล ${Object.keys(value).length} รายการ`;
                                  }
                                  
                                  return String(value);
                                };
                                
                                return (
                                  <Typography key={detailIndex} variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                    • {getFieldName(key)}: {formatValue(key, value)}
                                  </Typography>
                                );
                              })}
                            </Box>
                          )}
                        </Box>
                      </ListItem>
                      {index < queueLogs.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  📋 ยังไม่มีประวัติการเปลี่ยนแปลงคิวนี้
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  เมื่อมีการดำเนินการกับคิวนี้ ประวัติจะแสดงที่นี่
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => setShowLogDialog(false)}
              color="primary"
              variant="contained"
              startIcon={<RefreshIcon />}
            >
              ปิดหน้าต่าง
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
              setSelectedPatientData(null);
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
                
                {patientDataLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body1">กำลังโหลดข้อมูลผู้ป่วย...</Typography>
                  </Box>
                ) : selectedPatientData ? (
                  <>
                    <Typography variant="body1" gutterBottom>
                      ผู้ป่วย: {selectedPatientData.first_name_th} {selectedPatientData.last_name_th}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      เลขบัตรประชาชน: {selectedPatientData.national_id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      อาการ: {selectedQueueForMedicalRecord.symptoms || 'ไม่ระบุอาการ'}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="error">
                    ไม่สามารถโหลดข้อมูลผู้ป่วยได้
                  </Typography>
                )}
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
                setSelectedPatientData(null);
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
