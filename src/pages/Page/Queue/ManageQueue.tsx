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
  ListItemSecondaryAction
} from '@mui/material';
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
  id: string;
  queue_code: string;
  patient_name: string;
  priority_level: string;
  status: string;
  estimated_time: string;
  medical_condition?: string;
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
}

const ManageQueue: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('NEU');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [roomStatuses, setRoomStatuses] = useState<RoomStatus[]>([]);
  const [nextQueues, setNextQueues] = useState<QueueItem[]>([]);
  const [showAbsentDialog, setShowAbsentDialog] = useState<boolean>(false);
  const [selectedQueueForAbsent, setSelectedQueueForAbsent] = useState<QueueItem | null>(null);
  const [absentReason, setAbsentReason] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning'>('success');

  // Department configuration
  const departments: Department[] = [
    {
      id: 'GEN',
      name: 'ห้องตรวจโรคทั่วไป',
      shortName: 'GEN',
      thaiCode: 'ทว',
      icon: <HospitalIcon />,
      color: '#1976d2',
      bgColor: '#e3f2fd',
      rooms: ['ห้องตรวจ 1', 'ห้องตรวจ 2', 'ห้องตรวจ 3']
    },
    {
      id: 'CAR',
      name: 'ห้องรักษาหัวใจ',
      shortName: 'CAR',
      thaiCode: 'หจ',
      icon: <HeartIcon />,
      color: '#d32f2f',
      bgColor: '#ffebee',
      rooms: ['ห้องตรวจหัวใจ 1', 'ห้องตรวจหัวใจ 2', 'ห้องตรวจหัวใจ 3']
    },
    {
      id: 'NEU',
      name: 'ห้องตรวจระบบประสาท',
      shortName: 'NEU',
      thaiCode: 'ปส',
      icon: <PsychologyIcon />,
      color: '#7b1fa2',
      bgColor: '#f3e5f5',
      rooms: ['ห้องตรวจประสาท 1', 'ห้องตรวจประสาท 2', 'ห้องตรวจประสาท 3']
    },
    {
      id: 'ORT',
      name: 'ห้องกระดูกและข้อ',
      shortName: 'ORT',
      thaiCode: 'กข',
      icon: <HealingIcon />,
      color: '#388e3c',
      bgColor: '#e8f5e8',
      rooms: ['ห้องตรวจกระดูก 1', 'ห้องตรวจกระดูก 2', 'ห้องตรวจกระดูก 3']
    },
    {
      id: 'EYE',
      name: 'ห้องตรวจตา',
      shortName: 'EYE',
      thaiCode: 'ตา',
      icon: <EyeIcon />,
      color: '#f57c00',
      bgColor: '#fff3e0',
      rooms: ['ห้องตรวจตา 1', 'ห้องตรวจตา 2', 'ห้องตรวจตา 3']
    },
    {
      id: 'EMR',
      name: 'ห้องฉุกเฉิน',
      shortName: 'EMR',
      thaiCode: 'ฉก',
      icon: <EmergencyIcon />,
      color: '#c62828',
      bgColor: '#ffebee',
      rooms: ['ห้องฉุกเฉิน 1', 'ห้องฉุกเฉิน 2', 'ห้องฉุกเฉิน 3']
    }
  ];

  // Mock data generator
  const generateMockData = () => {
    const currentDept = getCurrentDepartment();
    const baseQueueNum = Math.floor(Math.random() * 50) + 1;
    
    // Generate room statuses
    const rooms = currentDept.rooms.map((room, index) => ({
      room,
      currentQueue: {
        id: `current-${index}`,
        queue_code: `${currentDept.thaiCode}${(baseQueueNum + index).toString().padStart(3, '0')}`,
        patient_name: `ผู้ป่วย ${String.fromCharCode(65 + index)}`,
        priority_level: ['ปานกลาง', 'เร่งด่วน', 'ไม่เร่งด่วน'][Math.floor(Math.random() * 3)],
        status: 'กำลังตรวจ',
        estimated_time: `${Math.floor(Math.random() * 2) + 10}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        medical_condition: ['ตรวจสุขภาพทั่วไป', 'ปวดหัว', 'ปวดท้อง'][Math.floor(Math.random() * 3)]
      },
      isActive: true
    }));

    // Generate next queues
    const next = Array.from({ length: 10 }, (_, index) => ({
      id: `next-${index}`,
      queue_code: `${currentDept.thaiCode}${(baseQueueNum + 3 + index).toString().padStart(3, '0')}`,
      patient_name: `ผู้ป่วย ${String.fromCharCode(68 + index)}`,
      priority_level: ['ฉุกเฉิน', 'เร่งด่วน', 'ปานกลาง', 'ไม่เร่งด่วน'][Math.floor(Math.random() * 4)],
      status: 'รอตรวจ',
      estimated_time: `${Math.floor(Math.random() * 3) + 11}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      medical_condition: ['ตรวจสุขภาพทั่วไป', 'ปวดหัว', 'ปวดท้อง', 'ตรวจตาม'][Math.floor(Math.random() * 4)]
    }));

    return { rooms, next };
  };

  // Load data when department changes
  useEffect(() => {
    loadQueueData();
    setSelectedRoom(''); // Reset selected room
  }, [selectedDepartment]);

  const loadQueueData = () => {
    const mockData = generateMockData();
    setRoomStatuses(mockData.rooms);
    setNextQueues(mockData.next);
  };

  const getCurrentDepartment = () => {
    return departments.find(dept => dept.id === selectedDepartment) || departments[0];
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
    setSelectedDepartment(event.target.value);
  };

  const handleRoomChange = (event: SelectChangeEvent) => {
    setSelectedRoom(event.target.value);
  };

  const handleCompleteQueue = (roomIndex: number) => {
    const updatedRooms = [...roomStatuses];
    const completedQueue = updatedRooms[roomIndex].currentQueue;
    
    if (nextQueues.length > 0) {
      // Move next queue to current
      updatedRooms[roomIndex].currentQueue = {
        ...nextQueues[0],
        status: 'กำลังตรวจ'
      };
      
      // Remove from next queues
      const updatedNextQueues = nextQueues.slice(1);
      setNextQueues(updatedNextQueues);
    } else {
      updatedRooms[roomIndex].currentQueue = null;
    }
    
    setRoomStatuses(updatedRooms);
    showSnackbar(`เสร็จสิ้นการตรวจ: ${completedQueue?.queue_code}`, 'success');
  };

  const handleMarkAbsent = (queue: QueueItem) => {
    setSelectedQueueForAbsent(queue);
    setShowAbsentDialog(true);
  };

  const confirmAbsent = () => {
    if (selectedQueueForAbsent) {
      // Remove from next queues
      const updatedNextQueues = nextQueues.filter(q => q.id !== selectedQueueForAbsent.id);
      setNextQueues(updatedNextQueues);
      
      showSnackbar(`บันทึกการไม่มา: ${selectedQueueForAbsent.queue_code} - ${absentReason}`, 'warning');
      
      setShowAbsentDialog(false);
      setSelectedQueueForAbsent(null);
      setAbsentReason('');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const currentDept = getCurrentDepartment();

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: currentDept.bgColor,
      p: 3
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Card elevation={3} sx={{ borderRadius: '16px', mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: currentDept.color }}>
                    {React.cloneElement(currentDept.icon as React.ReactElement, { sx: { fontSize: 40 } })}
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
                    >
                      {departments.map((dept) => (
                        <MenuItem key={dept.id} value={dept.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ color: dept.color }}>
                              {React.cloneElement(dept.icon as React.ReactElement, { sx: { fontSize: 20 } })}
                            </Box>
                            {dept.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl variant="outlined" sx={{ minWidth: 150 }}>
                    <InputLabel>เลือกห้อง</InputLabel>
                    <Select
                      value={selectedRoom}
                      onChange={handleRoomChange}
                      label="เลือกห้อง"
                    >
                      <MenuItem value="">ทั้งหมด</MenuItem>
                      {currentDept.rooms.map((room, index) => (
                        <MenuItem key={index} value={room}>
                          {room}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
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
        <Card elevation={4} sx={{ borderRadius: '16px', mb: 3, bgcolor: currentDept.color, color: 'white' }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h5" fontWeight="bold">
              {currentDept.name}
            </Typography>
          </CardContent>
        </Card>

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
                  border: `3px solid ${currentDept.color}`,
                  bgcolor: roomStatus.currentQueue ? 'white' : 'grey.100',
                  minHeight: '250px'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold" color={currentDept.color}>
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
                        color={currentDept.color}
                        textAlign="center"
                        sx={{ mb: 2 }}
                      >
                        {roomStatus.currentQueue.queue_code}
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body1" fontWeight="medium">
                          ชื่อ: {roomStatus.currentQueue.patient_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          อาการ: {roomStatus.currentQueue.medical_condition}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          เวลา: {roomStatus.currentQueue.estimated_time}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                        <Chip 
                          label={roomStatus.currentQueue.priority_level}
                          sx={{ 
                            bgcolor: getPriorityColor(roomStatus.currentQueue.priority_level),
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
            <Typography variant="h5" fontWeight="bold" color="primary" sx={{ mb: 3 }}>
              คิวถัดไป ({nextQueues.length} คิว)
            </Typography>
            
            {nextQueues.length > 0 ? (
              <List>
                {nextQueues.map((queue, index) => (
                  <React.Fragment key={queue.id}>
                    <ListItem
                      sx={{
                        bgcolor: index < 3 ? `${currentDept.color}10` : 'transparent',
                        borderRadius: '8px',
                        mb: 1,
                        border: index === 0 ? `2px solid ${currentDept.color}` : '1px solid transparent'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <Typography 
                          variant="h5" 
                          fontWeight="bold" 
                          color={index < 3 ? currentDept.color : 'text.secondary'}
                          sx={{ minWidth: '80px' }}
                        >
                          {queue.queue_code}
                        </Typography>
                        
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {queue.patient_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {queue.medical_condition} • {queue.estimated_time}
                          </Typography>
                        </Box>
                        
                        <Chip 
                          label={queue.priority_level}
                          sx={{ 
                            bgcolor: getPriorityColor(queue.priority_level),
                            color: 'white'
                          }}
                          size="small"
                        />
                      </Box>
                      
                      <ListItemSecondaryAction>
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
                        >
                          <AbsentIcon />
                        </IconButton>
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
                  คิว: {selectedQueueForAbsent.queue_code}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  ผู้ป่วย: {selectedQueueForAbsent.patient_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  อาการ: {selectedQueueForAbsent.medical_condition}
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
