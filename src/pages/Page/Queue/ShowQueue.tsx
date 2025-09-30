import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Container,
  ButtonBase,
  Grid,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Alert,
  Snackbar,
  Chip,
} from '@mui/material';
import axios from 'axios';   
import {
  LocalHospital as HospitalIcon,
  MonitorHeart as HeartIcon,
  Psychology as PsychologyIcon,
  Healing as HealingIcon,
  Visibility as EyeIcon,
  Emergency as EmergencyIcon,
  Settings as SettingsIcon,
  Close as CloseIcon
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
  isUpdated?: boolean;
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

const ShowQueue: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeRooms, setActiveRooms] = useState<number>(3);
  const [currentQueues, setCurrentQueues] = useState<QueueItem[]>([]);
  const [nextQueues, setNextQueues] = useState<QueueItem[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Department configuration
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
    try {
      console.log('[DEBUG] Loading departments from API');
      const response = await axios.get(`${API_BASE_URL}/api/workplace/department`);
      const apiDepartments = response.data || [];
      console.log('[DEBUG] API departments:', apiDepartments);
      
      // ถ้าไม่มีข้อมูลจาก API ให้ใช้ข้อมูลสำรอง
      let departmentsToUse = apiDepartments;
      if (apiDepartments.length === 0) {
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
          rooms: dept.rooms || ['ห้องตรวจ 1', 'ห้องตรวจ 2', 'ห้องตรวจ 3']
        };
      });
      
      console.log('[DEBUG] Formatted departments:', formattedDepartments);
      setDepartments(formattedDepartments);
      
      // เลือกแผนกแรกหากยังไม่ได้เลือก
      if (!selectedDepartment && formattedDepartments.length > 0) {
        setSelectedDepartment(formattedDepartments[0].id);
      }
      
    } catch (err) {
      console.error('Error loading departments:', err);
      showSnackbar('ไม่สามารถโหลดข้อมูลแผนกได้');
    }
  };

  // Load real queue data from API
  const loadQueueData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/queue/queues/active`);
      const data = response.data;
      
      // แปลงข้อมูลให้เข้ากับ UI พร้อมดึงรายละเอียดห้อง
      const current = await Promise.all(data.in_progress_queues.map(async (queue: QueueItem) => {
        let roomDetails = {
          room_name: queue.room?.name || 'ไม่ระบุห้อง',
          department_name: '',
          building_name: '',
          floor_name: ''
        };

        // ดึงรายละเอียดห้องเพิ่มเติม
        if (queue.room_id) {
          try {
            const roomResponse = await axios.get(`${API_BASE_URL}/api/workplace/room_schedule/${queue.room_id}`);
            const roomData = roomResponse.data;
            
            if (roomData.roomId) {
              const roomMasterResponse = await axios.get(`${API_BASE_URL}/api/workplace/room/${roomData.roomId}`);
              const roomMaster = roomMasterResponse.data;
              
              roomDetails.room_name = roomMaster.name || roomDetails.room_name;
              
              // ดึงข้อมูลแผนก
              if (roomMaster.departmentId) {
                const deptResponse = await axios.get(`${API_BASE_URL}/api/workplace/department/${roomMaster.departmentId}`);
                roomDetails.department_name = deptResponse.data.name || '';
              }
            }
          } catch (error) {
            console.error('Error fetching room details:', error);
          }
        }

        return {
          ...queue,
          queue_code: queue.queue_no,
          patient_name: queue.patient ? 
            `${queue.patient.first_name_th} ${queue.patient.last_name_th}` : 
            'ไม่ระบุชื่อ',
          room: roomDetails.room_name,
          room_details: `${roomDetails.building_name ? roomDetails.building_name + ' ' : ''}${roomDetails.floor_name ? 'ชั้น ' + roomDetails.floor_name + ' ' : ''}${roomDetails.department_name}`,
          status: 'กำลังตรวจ',
          priority_level: getPriorityText(queue.priority),
          estimated_time: formatQueueTime(queue.queue_time),
          isUpdated: false
        };
      }));
      
      const next = await Promise.all(data.waiting_queues.map(async (queue: QueueItem) => {
        let roomDetails = {
          department_name: '',
          building_name: '',
          floor_name: ''
        };

        // ดึงรายละเอียดห้องสำหรับคิวถัดไป (ถ้ามี room_id)
        if (queue.room_id) {
          try {
            const roomResponse = await axios.get(`${API_BASE_URL}/api/workplace/room_schedule/${queue.room_id}`);
            const roomData = roomResponse.data;
            
            if (roomData.roomId) {
              const roomMasterResponse = await axios.get(`${API_BASE_URL}/api/workplace/room/${roomData.roomId}`);
              const roomMaster = roomMasterResponse.data;
              
              // ดึงข้อมูลแผนก
              if (roomMaster.departmentId) {
                const deptResponse = await axios.get(`${API_BASE_URL}/api/workplace/department/${roomMaster.departmentId}`);
                roomDetails.department_name = deptResponse.data.name || '';
              }
            }
          } catch (error) {
            console.error('Error fetching room details for next queue:', error);
          }
        }

        return {
          ...queue,
          queue_code: queue.queue_no,
          patient_name: queue.patient ? 
            `${queue.patient.first_name_th} ${queue.patient.last_name_th}` : 
            'ไม่ระบุชื่อ',
          room: '',
          department_info: roomDetails.department_name,
          status: 'รอตรวจ',
          priority_level: getPriorityText(queue.priority),
          estimated_time: formatQueueTime(queue.queue_time),
          isUpdated: false
        };
      }));
      
      setCurrentQueues(current);
      setNextQueues(next);
      
    } catch (err) {
      console.error('Error loading queue data:', err);
      showSnackbar('ไม่สามารถโหลดข้อมูลคิวได้');
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
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

  const formatQueueTime = (queueTime: string) => {
    const date = new Date(queueTime);
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Load departments on mount
  useEffect(() => {
    loadDepartments();
  }, []);

  // Auto refresh data every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadQueueData();
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedDepartment, activeRooms]);

  // Load queue data when department or active rooms change
  useEffect(() => {
    loadQueueData();
  }, [selectedDepartment, activeRooms]);

  const getCurrentDepartment = () => {
    return departments.find(dept => dept.id === selectedDepartment) || departments[0] || {
      id: 'GEN',
      name: 'กำลังโหลด...',
      shortName: 'GEN',
      thaiCode: 'ทว',
      icon: <HospitalIcon />,
      color: '#1976d2',
      bgColor: '#e3f2fd',
      rooms: []
    };
  };

  const handleDepartmentSelect = (deptId: string) => {
    setSelectedDepartment(deptId);
    setActiveRooms(3); // Reset to 3 rooms when changing department
    setShowSettings(false);
  };

  const handleActiveRoomsChange = (rooms: number) => {
    setActiveRooms(rooms);
  };

  const currentDept = getCurrentDepartment();

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: currentDept.bgColor,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Floating Settings Button */}
      <Fab
        color="primary"
        onClick={() => setShowSettings(true)}
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000,
          bgcolor: currentDept.color,
          '&:hover': {
            bgcolor: currentDept.color,
            opacity: 0.8
          }
        }}
      >
        <SettingsIcon />
      </Fab>

      {/* Settings Dialog */}
      <Dialog 
        open={showSettings} 
        onClose={() => setShowSettings(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          bgcolor: currentDept.color,
          color: 'white'
        }}>
          <Typography variant="h6">ตั้งค่าการแสดงผล</Typography>
          <IconButton onClick={() => setShowSettings(false)} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {/* Department Selection */}
          <Typography variant="h6" sx={{ mb: 2 }}>เลือกแผนก</Typography>
          <Grid container spacing={1} sx={{ mb: 3 }}>
            {departments.map((dept) => (
              <Grid item xs={4} key={dept.id}>
                <ButtonBase
                  onClick={() => handleDepartmentSelect(dept.id)}
                  sx={{
                    width: '100%',
                    borderRadius: '12px',
                    p: 2,
                    border: selectedDepartment === dept.id ? `3px solid ${dept.color}` : '2px solid #e0e0e0',
                    bgcolor: selectedDepartment === dept.id ? dept.bgColor : 'white',
                    transition: 'all 0.3s',
                    '&:hover': {
                      bgcolor: dept.bgColor,
                      transform: 'scale(1.02)'
                    }
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ color: dept.color, mb: 1 }}>
                      {React.cloneElement(dept.icon as React.ReactElement, { sx: { fontSize: 30 } })}
                    </Box>
                    <Typography variant="body2" fontWeight="bold" color={dept.color}>
                      {dept.shortName}
                    </Typography>
                  </Box>
                </ButtonBase>
              </Grid>
            ))}
          </Grid>

          {/* Active Rooms Selection */}
          <Typography variant="h6" sx={{ mb: 2 }}>จำนวนห้องตรวจที่เปิดใช้งาน</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[1, 2, 3].map((num) => (
              <Chip
                key={num}
                label={`${num} ห้อง`}
                onClick={() => handleActiveRoomsChange(num)}
                color={activeRooms === num ? 'primary' : 'default'}
                variant={activeRooms === num ? 'filled' : 'outlined'}
                sx={{
                  fontSize: '1rem',
                  py: 2,
                  px: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: activeRooms === num ? 'primary.dark' : 'primary.light'
                  }
                }}
              />
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Full Screen Department Name */}
      <Box sx={{ 
        textAlign: 'center', 
        py: { xs: 2, md: 4 },
        background: `linear-gradient(135deg, ${currentDept.color}15 0%, ${currentDept.color}25 100%)`
      }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 2, md: 4 } }}>
            <Box sx={{ color: currentDept.color }}>
              {React.cloneElement(currentDept.icon as React.ReactElement, { 
                sx: { fontSize: { xs: 60, md: 100 } } 
              })}
            </Box>
            <Typography 
              variant="h1" 
              fontWeight="bold" 
              color={currentDept.color}
              sx={{ 
                fontSize: { xs: '3rem', md: '6rem', lg: '8rem' },
                lineHeight: 1,
                textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {currentDept.name}
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Main Queue Display */}
       <Container maxWidth="xl" sx={{ pb: 5, pt: { xs: 3, md: 4 } }}>
        <Card 
          elevation={8}
          sx={{ 
            borderRadius: '24px',
            background: `linear-gradient(135deg, ${currentDept.color}20 0%, ${currentDept.color}40 100%)`,
            border: `4px solid ${currentDept.color}`,
            animation: 'pulse 3s infinite'
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            {/* Current Queues Title */}
            <Typography 
              variant="h2" 
              fontWeight="bold" 
              color={currentDept.color} 
              sx={{ 
                mb: 3, 
                textAlign: 'center',
                fontSize: { xs: '2.5rem', md: '4rem' }
              }}
            >
              คิวปัจจุบัน
            </Typography>
            
            {/* Current Queues Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }} >
              {currentQueues.map((queue) => (
                <Grid item xs={12} md={activeRooms === 3 ? 4 : activeRooms === 2 ? 6 : 12} key={queue._id}>
                  <Card 
                    sx={{ 
                      height: { xs: '280px', md: '350px' },
                      borderRadius: '20px',
                      textAlign: 'center',
                      bgcolor: 'white',
                      border: `3px solid ${currentDept.color}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      {/* ชื่อห้องตรวจ */}
                      <Typography 
                        variant="h5" 
                        fontWeight="bold" 
                        color={currentDept.color} 
                        sx={{ 
                          mb: 0.5,
                          fontSize: { xs: '1.2rem', md: '1.5rem' }
                        }}
                      >
                        {typeof queue.room === 'string' ? queue.room : queue.room?.name || 'ไม่ระบุห้อง'}
                      </Typography>
                      
                      {/* รายละเอียดห้อง (อาคาร ชั้น แผนก) */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          mb: 1,
                          fontSize: { xs: '0.8rem', md: '0.9rem' }
                        }}
                      >
                        {(queue as any).room_details || 'ข้อมูลห้อง'}
                      </Typography>
                      
                      {/* หมายเลขคิว */}
                      <Typography 
                        variant="h1" 
                        fontWeight="bold" 
                        color={currentDept.color}
                        sx={{ 
                          fontSize: { xs: '3.5rem', md: '5rem', lg: '6rem' },
                          lineHeight: 1,
                          mb: 1,
                          animation: queue.isUpdated ? 'blink 1s ease-in-out 3' : 'none'
                        }}
                      >
                        {queue.queue_no}
                      </Typography>
                      
                      {/* ชื่อผู้ป่วย */}
                      <Typography 
                        variant="h6" 
                        fontWeight="medium"
                        color="text.primary"
                        sx={{ 
                          mb: 1,
                          fontSize: { xs: '1rem', md: '1.2rem' }
                        }}
                      >
                        {(queue as any).patient_name}
                      </Typography>
                      
                      {/* ระดับความเร่งด่วน */}
                      <Chip
                        label={(queue as any).priority_level}
                        sx={{
                          mb: 1,
                          bgcolor: getPriorityColor((queue as any).priority_level),
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: { xs: '0.8rem', md: '1rem' }
                        }}
                      />
                      
                      {/* เวลาเข้าคิว */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          mb: 1,
                          fontSize: { xs: '0.8rem', md: '0.9rem' }
                        }}
                      >
                        เข้าคิว: {(queue as any).estimated_time}
                      </Typography>
                      
                      {/* สถานะ */}
                      <Box sx={{ 
                        bgcolor: currentDept.color,
                        color: 'white',
                        borderRadius: '25px',
                        py: 1,
                        px: 2,
                        display: 'inline-block',
                        mt: 1
                      }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', md: '1.2rem' } }}>
                          กำลังตรวจ
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Next Queues Section */}
            <Box sx={{ 
              borderTop: `3px solid ${currentDept.color}60`,
              pt: 3,
              textAlign: 'center'
            }}>
              <Typography 
                variant="h3" 
                fontWeight="bold" 
                color={currentDept.color} 
                sx={{ 
                  mb: 3,
                  fontSize: { xs: '2rem', md: '3rem' }
                }}
              >
                คิวถัดไป
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: { xs: 2, md: 4 }, 
                flexWrap: 'wrap',
                maxWidth: '100%'
              }}>
                {nextQueues.slice(0, 8).map((queue, index) => (
                  <Card
                    key={queue._id}
                    elevation={3}
                    sx={{
                      minWidth: { xs: '140px', md: '180px' },
                      borderRadius: '16px',
                      border: `2px solid ${index < 3 ? currentDept.color : '#e0e0e0'}`,
                      bgcolor: index < 3 ? `${currentDept.color}10` : 'white',
                      p: 2,
                      textAlign: 'center',
                      opacity: index < 3 ? 1 : 0.7,
                      animation: queue.isUpdated ? 'blink 1s ease-in-out 3' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <CardContent sx={{ p: 1 }}>
                      {/* หมายเลขคิว */}
                      <Typography 
                        variant="h4" 
                        fontWeight="bold" 
                        color={index < 3 ? currentDept.color : 'text.secondary'}
                        sx={{ 
                          fontSize: { xs: '1.8rem', md: '2.5rem' },
                          mb: 1
                        }}
                      >
                        {queue.queue_no}
                      </Typography>
                      
                      {/* ชื่อผู้ป่วย */}
                      <Typography 
                        variant="body2" 
                        fontWeight="medium"
                        color="text.primary"
                        sx={{ 
                          mb: 1,
                          fontSize: { xs: '0.8rem', md: '1rem' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {(queue as any).patient_name}
                      </Typography>
                      
                      {/* แผนก (สำหรับคิวถัดไป) */}
                      {(queue as any).department_info && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            mb: 1,
                            fontSize: { xs: '0.7rem', md: '0.8rem' },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {(queue as any).department_info}
                        </Typography>
                      )}
                      
                      {/* ระดับความเร่งด่วน */}
                      <Chip
                        label={(queue as any).priority_level}
                        size="small"
                        sx={{
                          bgcolor: getPriorityColor((queue as any).priority_level),
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: { xs: '0.7rem', md: '0.8rem' },
                          mb: 1
                        }}
                      />
                      
                      {/* เวลา */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.7rem', md: '0.8rem' } }}
                      >
                        {(queue as any).estimated_time}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>

      {/* CSS for animations */}
      <style>
        {`
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 ${currentDept.color}40;
            }
            70% {
              box-shadow: 0 0 0 30px ${currentDept.color}00;
            }
            100% {
              box-shadow: 0 0 0 0 ${currentDept.color}00;
            }
          }
          
          @keyframes blink {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.3;
              transform: scale(1.05);
            }
          }
        `}
      </style>
      
      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ShowQueue;
