import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Divider,
  IconButton,
  Switch,
  FormControlLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Avatar,
  Skeleton,
  CircularProgress
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  LocalHospital as LocalHospitalIcon,
  MeetingRoom as MeetingRoomIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';

// ประเภทข้อมูลที่ใช้ในหน้านี้
interface Department {
  id: string;
  name: string;
  shortName: string;
  thaiCode: string;
  color: string;
  bgColor: string;
  totalRooms: number;
  isActive: boolean;
}

interface Employee {
  id: string;
  prefix: string;
  firstNameTh: string;
  lastNameTh: string;
  employeeType: 'doctor' | 'nurse' | 'staff';
  departmentId: string;
  position: string;
  profileImage?: string;
  status: 'active' | 'inactive' | 'leave';
  workingDays?: string[]; // วันที่ทำงาน
}

interface Room {
  id: string;
  departmentId: string;
  roomNumber: string;
  name: string;
  isActive: boolean;
  capacity: number;
  floor: string;
  building: string;
  room_type?: string; // Added room_type field
}

interface DailyRoomSchedule {
  id: string;
  date: string;
  departmentId: string;
  roomId: string;
  isOpen: boolean;
  doctorId?: string;
  nurseId?: string;
  openTime?: string;
  closeTime?: string;
  maxPatients?: number;
  notes?: string;
  room_type?: string; // Added room_type field
}

// วันในสัปดาห์
const DAYS_OF_WEEK = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์'
];

const ManageRoom: React.FC = () => {
  const [dataLoading, setDataLoading] = useState<{
    departments: boolean;
    employees: boolean;
    rooms: boolean;
    schedules: boolean;
  }>({
    departments: false,
    employees: false,
    rooms: false,
    schedules: false
  });
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning'>('success');
  
  // State สำหรับ dialog แก้ไขห้องตรวจ
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentSchedule, setCurrentSchedule] = useState<DailyRoomSchedule | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedNurse, setSelectedNurse] = useState<string>('');
  const [openTime, setOpenTime] = useState<string>('08:00');
  const [closeTime, setCloseTime] = useState<string>('16:00');
  const [maxPatients, setMaxPatients] = useState<number>(999);
  const [notes, setNotes] = useState<string>('');
  const [isRoomOpen, setIsRoomOpen] = useState<boolean>(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  // State สำหรับข้อมูลที่ดึงมาจาก localStorage
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [dailySchedules, setDailySchedules] = useState<DailyRoomSchedule[]>([]);
  
  // State สำหรับการทำงานในหน้านี้
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  
  // โหลดข้อมูลเริ่มต้น
  useEffect(() => {
    loadData();
  }, []);

  // โหลดข้อมูลตารางห้องตรวจเมื่อเปลี่ยนวันที่หรือแผนก
  useEffect(() => {
    if (selectedDepartment) {
      loadDailySchedules();
    }
  }, [selectedDate, selectedDepartment]);

  // โหลดข้อมูลทั้งหมดจาก backend แบบ lazy loading
  const loadData = useCallback(async () => {
    // โหลด departments ก่อน (จำเป็นสำหรับ UI)
    try {
      setDataLoading(prev => ({ ...prev, departments: true }));
      const deptRes = await axios.get(`${API_BASE_URL}/api/workplace/department`);
      setDepartments(deptRes.data || []);
      if (deptRes.data && deptRes.data.length > 0) {
        setSelectedDepartment(deptRes.data[0].id);
      }
      setDataLoading(prev => ({ ...prev, departments: false }));
    } catch (error) {
      console.error('Error loading departments:', error);
      showSnackbar('เกิดข้อผิดพลาดในการโหลดข้อมูลแผนก', 'error');
      setDataLoading(prev => ({ ...prev, departments: false }));
    }

    // โหลดข้อมูลอื่นๆ แบบ parallel แต่ไม่ block UI
    Promise.all([
      // โหลด employees
      (async () => {
        try {
          setDataLoading(prev => ({ ...prev, employees: true }));
          const empRes = await axios.get(`${API_BASE_URL}/api/worker/`);
          setEmployees(empRes.data || []);
        } catch (error) {
          console.error('Error loading employees:', error);
        } finally {
          setDataLoading(prev => ({ ...prev, employees: false }));
        }
      })(),
      
      // โหลด rooms
      (async () => {
        try {
          setDataLoading(prev => ({ ...prev, rooms: true }));
          const roomRes = await axios.get(`${API_BASE_URL}/api/workplace/room`);
          setRooms(roomRes.data || []);
        } catch (error) {
          console.error('Error loading rooms:', error);
        } finally {
          setDataLoading(prev => ({ ...prev, rooms: false }));
        }
      })(),
      
      // โหลด schedules
      (async () => {
        try {
          setDataLoading(prev => ({ ...prev, schedules: true }));
          const schedRes = await axios.get(`${API_BASE_URL}/api/workplace/room_schedule?date=${selectedDate}`);
          setDailySchedules(schedRes.data || []);
        } catch (error) {
          console.error('Error loading schedules:', error);
        } finally {
          setDataLoading(prev => ({ ...prev, schedules: false }));
        }
      })()
    ]).catch(error => {
      console.error('Error in parallel loading:', error);
      showSnackbar('เกิดข้อผิดพลาดในการโหลดข้อมูลบางส่วน', 'warning');
    });
  }, [API_BASE_URL, selectedDate]);

  // โหลดข้อมูลตารางห้องตรวจรายวัน
  const loadDailySchedules = useCallback(async () => {
    if (!selectedDepartment) return;
    
    setDataLoading(prev => ({ ...prev, schedules: true }));
    try {
      const schedRes = await axios.get(`${API_BASE_URL}/api/workplace/room_schedule?date=${selectedDate}&departmentId=${selectedDepartment}`);
      setDailySchedules(schedRes.data || []);
      if (!schedRes.data || schedRes.data.length === 0) {
        await createDefaultSchedules();
      }
    } catch (error) {
      console.error('Error loading daily schedules:', error);
      showSnackbar('เกิดข้อผิดพลาดในการโหลดข้อมูลตารางห้องตรวจ', 'error');
    } finally {
      setDataLoading(prev => ({ ...prev, schedules: false }));
    }
  }, [API_BASE_URL, selectedDate, selectedDepartment]);

  // สร้างข้อมูลตารางห้องตรวจเริ่มต้นสำหรับวันที่เลือก
  const createDefaultSchedules = async () => {
    const departmentRooms = rooms.filter(room => room.departmentId === selectedDepartment);
    if (departmentRooms.length === 0) return;
    const newSchedules = departmentRooms.map((room, index) => ({
      date: selectedDate,
      departmentId: selectedDepartment,
      roomId: room.id,
      isOpen: index < 2,
      openTime: '08:00',
      closeTime: '16:00',
      maxPatients: 30,
      notes: '',
      room_type: room.room_type || 'general' // <-- copy room_type จากห้อง
    }));
    try {
      await axios.post(`${API_BASE_URL}/api/workplace/room_schedule/bulk`, newSchedules);
      await loadDailySchedules();
      showSnackbar('สร้างตารางห้องตรวจเริ่มต้นสำหรับวันนี้แล้ว', 'success');
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการสร้างตาราง', 'error');
    }
  };

  // แสดง Snackbar
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // ปิด Snackbar
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // เปลี่ยนวันที่
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  // เปลี่ยนแผนก
  const handleDepartmentChange = (event: SelectChangeEvent<string>) => {
    setSelectedDepartment(event.target.value);
  };

  // เปิด dialog แก้ไขห้องตรวจ
  const handleEditRoom = (room: Room, schedule: DailyRoomSchedule | null) => {
    setCurrentRoom(room);
    
    if (schedule) {
      // กรณีมีข้อมูลตารางอยู่แล้ว
      setCurrentSchedule(schedule);
      setIsRoomOpen(schedule.isOpen);
      setSelectedDoctor(schedule.doctorId || '');
      setSelectedNurse(schedule.nurseId || '');
      setOpenTime(schedule.openTime || '08:00');
      setCloseTime(schedule.closeTime || '16:00');
      setMaxPatients(schedule.maxPatients || 30);
      setNotes(schedule.notes || '');
    } else {
      // กรณีสร้างข้อมูลใหม่
      setCurrentSchedule(null);
      setIsRoomOpen(true);
      setSelectedDoctor('');
      setSelectedNurse('');
      setOpenTime('08:00');
      setCloseTime('16:00');
      setMaxPatients(30);
      setNotes('');
    }
    
    setEditDialogOpen(true);
  };

  // บันทึกข้อมูลห้องตรวจ
  const handleSaveRoom = async () => {
    if (!currentRoom) return;
    try {
      let payload = {
        date: selectedDate,
        departmentId: selectedDepartment,
        roomId: currentRoom.id,
        isOpen: isRoomOpen,
        doctorId: selectedDoctor || undefined,
        nurseId: selectedNurse || undefined,
        openTime: openTime,
        closeTime: closeTime,
        maxPatients: maxPatients,
        notes: notes,
        room_type: currentRoom.room_type || 'general' // เพิ่ม room_type จากข้อมูลห้อง
      };
      if (currentSchedule) {
        await axios.put(`${API_BASE_URL}/api/workplace/room_schedule/${currentSchedule.id}`, payload);
      } else {
        await axios.post(`${API_BASE_URL}/api/workplace/room_schedule`, payload);
      }
      await loadDailySchedules();
      showSnackbar('บันทึกข้อมูลห้องตรวจเรียบร้อยแล้ว', 'success');
      setEditDialogOpen(false);
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  };

  // รีเซ็ตข้อมูลตารางห้องตรวจของวันที่เลือก
  const handleResetSchedules = async () => {
    if (window.confirm('คุณต้องการรีเซ็ตข้อมูลตารางห้องตรวจของวันนี้ใช่หรือไม่?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/workplace/room_schedule?date=${selectedDate}&departmentId=${selectedDepartment}`);
        await createDefaultSchedules();
        showSnackbar('รีเซ็ตข้อมูลตารางห้องตรวจเรียบร้อยแล้ว', 'success');
      } catch (error) {
        showSnackbar('เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล', 'error');
      }
    }
  };

  // บันทึกข้อมูลทั้งหมด
  const handleSaveAll = () => {
    try {
      // ไม่ต้องทำอะไรเพิ่มเติม เพราะบันทึกข้อมูลทุกครั้งที่มีการเปลี่ยนแปลงแล้ว
      showSnackbar('บันทึกข้อมูลทั้งหมดเรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error saving all data:', error);
      showSnackbar('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  };

  // หาข้อมูลตารางห้องตรวจจาก roomId - memoized
  const getScheduleByRoomId = useCallback((roomId: string): DailyRoomSchedule | undefined => {
    return dailySchedules.find(schedule => schedule.roomId === roomId);
  }, [dailySchedules]);

  // หาข้อมูลพนักงานจาก employeeId - memoized
  const getEmployeeById = useCallback((employeeId: string): Employee | undefined => {
    return employees.find(employee => employee.id === employeeId);
  }, [employees]);

  // หาข้อมูลแผนกจาก departmentId - memoized
  const getDepartmentById = useCallback((departmentId: string): Department | undefined => {
    return departments.find(department => department.id === departmentId);
  }, [departments]);

  // กรองพนักงานตามประเภทและแผนก - memoized
  const filterEmployeesByTypeAndDepartment = useCallback((type: 'doctor' | 'nurse', departmentId: string): Employee[] => {
    return employees.filter(
      employee => employee.employeeType === type && 
                  employee.departmentId === departmentId && 
                  employee.status === 'active'
    );
  }, [employees]);

  // แปลงวันที่เป็นรูปแบบไทย - memoized
  const formatThaiDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
      const day = date.getDate();
      const month = date.toLocaleString('th-TH', { month: 'long' });
      const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
      
      return `${dayOfWeek}ที่ ${day} ${month} ${year}`;
    } catch (error) {
      return dateString;
    }
  }, []);

  // คำนวณจำนวนห้องที่เปิดให้บริการ - memoized
  const getOpenRoomsCount = useMemo((): number => {
    return dailySchedules.filter(schedule => schedule.isOpen).length;
  }, [dailySchedules]);

  // คำนวณจำนวนห้องทั้งหมดของแผนก - memoized
  const getTotalRoomsCount = useMemo((): number => {
    return rooms.filter(room => room.departmentId === selectedDepartment).length;
  }, [rooms, selectedDepartment]);

  // หาแพทย์ที่ประจำห้องตรวจในวันนี้
  const getDoctorsOnDuty = (): Employee[] => {
    const doctorIds = dailySchedules
      .filter(schedule => schedule.isOpen && schedule.doctorId)
      .map(schedule => schedule.doctorId as string);
    
    return employees.filter(employee => doctorIds.includes(employee.id));
  };

  // หาพยาบาลที่ประจำห้องตรวจในวันนี้
  const getNursesOnDuty = (): Employee[] => {
    const nurseIds = dailySchedules
      .filter(schedule => schedule.isOpen && schedule.nurseId)
      .map(schedule => schedule.nurseId as string);
    
    return employees.filter(employee => nurseIds.includes(employee.id));
  };

  // ตรวจสอบว่าพนักงานถูกมอบหมายให้ประจำห้องตรวจอื่นหรือไม่
  const isEmployeeAssigned = (employeeId: string, excludeRoomId?: string): boolean => {
    return dailySchedules.some(
      schedule => 
        schedule.date === selectedDate && 
        (schedule.doctorId === employeeId || schedule.nurseId === employeeId) && 
        schedule.isOpen &&
        (!excludeRoomId || schedule.roomId !== excludeRoomId)
    );
  };

  // Helper: Get available employees for a room on a given date
  const getAvailableEmployeesForRoom = (
    type: 'doctor' | 'nurse',
    departmentId: string,
    date: string
  ): Employee[] => {
    const dayOfWeek = new Date(date).toLocaleString('th-TH', { weekday: 'long' });
    // Normalize: remove 'วัน', trim, and lowercase
    const normalizeDay = (d: string) => d.replace(/^วัน/, '').trim().toLowerCase();
    const normalizedDay = normalizeDay(dayOfWeek);
    return employees.filter(
      emp =>
        emp.employeeType === type &&
        emp.departmentId === departmentId &&
        emp.status === 'active' &&
        Array.isArray(emp.workingDays) &&
        emp.workingDays.map(normalizeDay).includes(normalizedDay)
    );
  };

  // ส่วนแสดงผล
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            จัดการห้องตรวจรายวัน
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleResetSchedules}
              sx={{ mr: 1 }}
            >
              รีเซ็ตข้อมูล
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveAll}
              color="primary"
            >
              บันทึกข้อมูล
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* ส่วนเลือกวันที่ */}
          <Grid item xs={12} md={6}>
            <TextField
              label="วันที่"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <Typography variant="subtitle1" sx={{ mt: 1, color: 'text.secondary' }}>
              {formatThaiDate(selectedDate)}
            </Typography>
          </Grid>

          {/* ส่วนเลือกแผนก */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>แผนก</InputLabel>
              <Select
                value={selectedDepartment}
                onChange={handleDepartmentChange}
                label="แผนก"
                disabled={dataLoading.departments}
              >
                {dataLoading.departments ? (
                  <MenuItem disabled>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="body2">กำลังโหลด...</Typography>
                    </Box>
                  </MenuItem>
                ) : (
                  departments.map((department) => (
                    <MenuItem key={department.id} value={department.id}>
                      {department.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* สรุปข้อมูลห้องตรวจ */}
      {selectedDepartment && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: getDepartmentById(selectedDepartment)?.bgColor || '#f5f5f5' }}>
          {dataLoading.schedules ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  สรุปข้อมูลห้องตรวจ
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                  <Chip
                    icon={<MeetingRoomIcon />}
                    label={`เปิดให้บริการ ${getOpenRoomsCount} จาก ${getTotalRoomsCount} ห้อง`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    icon={<LocalHospitalIcon />}
                    label={`แพทย์ ${getDoctorsOnDuty().length} คน`}
                    color="secondary"
                    variant="outlined"
                  />
                  <Chip
                    icon={<PersonIcon />}
                    label={`พยาบาล ${getNursesOnDuty().length} คน`}
                    color="info"
                    variant="outlined"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  เวลาทำการ
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                  <AccessTimeIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography>
                    {dailySchedules.length > 0 && dailySchedules.some(s => s.isOpen)
                      ? `${dailySchedules.find(s => s.isOpen)?.openTime || '08:00'} - ${dailySchedules.find(s => s.isOpen)?.closeTime || '16:00'} น.`
                      : 'ไม่มีห้องตรวจที่เปิดให้บริการ'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </Paper>
      )}

      {/* รายการห้องตรวจ */}
      {selectedDepartment && (
        <>
          {dataLoading.rooms || dataLoading.schedules ? (
            <Grid container spacing={3}>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Grid item xs={12} md={6} lg={4} key={item}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardHeader
                      title={<Skeleton variant="text" width="60%" />}
                      subheader={<Skeleton variant="text" width="40%" />}
                      action={<Skeleton variant="circular" width={40} height={40} />}
                    />
                    <CardContent>
                      <Skeleton variant="text" width="80%" sx={{ mb: 2 }} />
                      <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
                      <Skeleton variant="text" width="90%" />
                      <Skeleton variant="text" width="70%" />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={3}>
              {rooms
                .filter(room => room.departmentId === selectedDepartment)
                .map(room => {
                  const schedule = getScheduleByRoomId(room.id);
                  const isOpen = schedule?.isOpen || false;
                  const doctor = schedule?.doctorId ? getEmployeeById(schedule.doctorId) : undefined;
                  const nurse = schedule?.nurseId ? getEmployeeById(schedule.nurseId) : undefined;
                  
                  return (
                    <Grid item xs={12} md={6} lg={4} key={room.id}>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          height: '100%',
                          bgcolor: isOpen ? '#f9f9f9' : '#f0f0f0',
                          opacity: isOpen ? 1 : 0.7,
                          transition: 'all 0.3s ease'
                        }}
                      >
                       <CardHeader
      title={room.name || `ห้องตรวจ ${room.roomNumber || '1'}`}
      subheader={`ห้อง ${room.roomNumber || '1'} (${room.building || 'อาคารผู้ป่วยนอก'} ชั้น ${room.floor || '1'})`}
      action={
        <IconButton onClick={() => handleEditRoom(room, schedule || null)}>
          <EditIcon />
        </IconButton>
      }
      sx={{
        bgcolor: isOpen 
          ? getDepartmentById(selectedDepartment)?.bgColor || '#e3f2fd'
          : '#e0e0e0',
        '& .MuiCardHeader-title': { fontWeight: 'bold' }
      }}
    />

                        <CardContent>
                          <Box sx={{ mb: 2 }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={isOpen}
                                  onChange={async (e) => {
                                    const newIsOpen = e.target.checked;
                                    // อัปเดต state ทันที (optional)
                                    if (schedule) {
                                      const updatedSchedule = { 
                                        ...schedule, 
                                        isOpen: newIsOpen,
                                        room_type: room.room_type || 'general' // เพิ่ม room_type จากห้อง
                                      };
                                      setDailySchedules(dailySchedules.map(s =>
                                        s.id === updatedSchedule.id ? updatedSchedule : s
                                      ));
                                      // ส่ง PUT ไป backend
                                      try {
                                        await axios.put(
                                          `${API_BASE_URL}/api/workplace/room_schedule/${schedule.id}`,
                                          {
                                            ...updatedSchedule,
                                            type: "room_schedule" // สำคัญ! ต้องมี type ด้วย
                                          }
                                        );
                                        showSnackbar('อัปเดตสถานะห้องตรวจเรียบร้อย', 'success');
                                      } catch (error) {
                                        showSnackbar('เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
                                      }
                                    }
                                  }}
                                  color="primary"
                                />
                              }
                                                        label={isOpen ? "เปิดให้บริการ" : "ปิดให้บริการ"}
                            />
                          </Box>
                          
                          <Divider sx={{ mb: 2 }} />
                          
                          {isOpen ? (
                            <>
                              {/* แสดงข้อมูลแพทย์ */}
                              <Typography variant="subtitle1" gutterBottom>
                                แพทย์ประจำห้องตรวจ
                              </Typography>
                              {dataLoading.employees ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                  <Skeleton variant="circular" width={40} height={40} sx={{ mr: 1 }} />
                                  <Box sx={{ flex: 1 }}>
                                    <Skeleton variant="text" width="80%" />
                                    <Skeleton variant="text" width="60%" />
                                  </Box>
                                </Box>
                              ) : doctor ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                  <Avatar 
                                    src={doctor.profileImage} 
                                    sx={{ width: 40, height: 40, mr: 1 }}
                                  >
                                    {doctor.firstNameTh.charAt(0)}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body1">
                                      {doctor.prefix} {doctor.firstNameTh} {doctor.lastNameTh}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {doctor.position}
                                    </Typography>
                                  </Box>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                                  ยังไม่ได้กำหนดแพทย์ประจำห้องตรวจ
                                </Typography>
                              )}
                              
                              {/* รายชื่อแพทย์ที่มีสิทธิ์ประจำห้องวันนี้ */}
                              <Typography variant="subtitle2" sx={{ mb: 1 }}>รายชื่อแพทย์ที่มีสิทธิ์ประจำห้องวันนี้</Typography>
                              <Box sx={{ mb: 2 }}>
                                {dataLoading.employees ? (
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {[1, 2, 3].map(i => (
                                      <Skeleton key={i} variant="rectangular" width={120} height={32} sx={{ borderRadius: 2 }} />
                                    ))}
                                  </Box>
                                ) : getAvailableEmployeesForRoom('doctor', room.departmentId, selectedDate).length > 0 ? (
                                  getAvailableEmployeesForRoom('doctor', room.departmentId, selectedDate).map(doc => (
                                    <Chip key={doc.id} label={`${doc.prefix} ${doc.firstNameTh} ${doc.lastNameTh}`} sx={{ mr: 1, mb: 1 }} />
                                  ))
                                ) : (
                                  <Typography variant="body2" color="text.secondary">ไม่มีแพทย์ที่มีสิทธิ์ประจำห้องวันนี้</Typography>
                                )}
                              </Box>
                              
                              {/* แสดงข้อมูลพยาบาล */}
                              <Typography variant="subtitle1" gutterBottom>
                                พยาบาลประจำห้องตรวจ
                              </Typography>
                              {dataLoading.employees ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                  <Skeleton variant="circular" width={40} height={40} sx={{ mr: 1 }} />
                                  <Box sx={{ flex: 1 }}>
                                    <Skeleton variant="text" width="80%" />
                                    <Skeleton variant="text" width="60%" />
                                  </Box>
                                </Box>
                              ) : nurse ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                  <Avatar 
                                    src={nurse.profileImage} 
                                    sx={{ width: 40, height: 40, mr: 1 }}
                                  >
                                    {nurse.firstNameTh.charAt(0)}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body1">
                                      {nurse.prefix} {nurse.firstNameTh} {nurse.lastNameTh}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {nurse.position}
                                    </Typography>
                                  </Box>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                                  ยังไม่ได้กำหนดพยาบาลประจำห้องตรวจ
                                </Typography>
                              )}
                              
                              {/* รายชื่อพยาบาลที่มีสิทธิ์ประจำห้องวันนี้ */}
                              <Typography variant="subtitle2" sx={{ mb: 1 }}>รายชื่อพยาบาลที่มีสิทธิ์ประจำห้องวันนี้</Typography>
                              <Box sx={{ mb: 2 }}>
                                {dataLoading.employees ? (
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {[1, 2].map(i => (
                                      <Skeleton key={i} variant="rectangular" width={120} height={32} sx={{ borderRadius: 2 }} />
                                    ))}
                                  </Box>
                                ) : getAvailableEmployeesForRoom('nurse', room.departmentId, selectedDate).length > 0 ? (
                                  getAvailableEmployeesForRoom('nurse', room.departmentId, selectedDate).map(nurse => (
                                    <Chip key={nurse.id} label={`${nurse.prefix} ${nurse.firstNameTh} ${nurse.lastNameTh}`} sx={{ mr: 1, mb: 1 }} />
                                  ))
                                ) : (
                                  <Typography variant="body2" color="text.secondary">ไม่มีพยาบาลที่มีสิทธิ์ประจำห้องวันนี้</Typography>
                                )}
                              </Box>
                              
                              {/* แสดงเวลาทำการ */}
                              <Divider sx={{ my: 2 }} />
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AccessTimeIcon sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography>
                                  {schedule?.openTime || '08:00'} - {schedule?.closeTime || '16:00'} น.
                                </Typography>
                              </Box>
                              
                              {/* แสดงจำนวนผู้ป่วยสูงสุด */}
                              <Typography variant="body2" color="text.secondary">
                                รับผู้ป่วยสูงสุด: {schedule?.maxPatients || 30} คน
                              </Typography>
                              
                              {/* แสดงหมายเหตุ */}
                              {schedule?.notes && (
                                <Box sx={{ mt: 2, p: 1, bgcolor: '#fff9c4', borderRadius: 1 }}>
                                  <Typography variant="body2">
                                    หมายเหตุ: {schedule.notes}
                                  </Typography>
                                </Box>
                              )}
                            </>
                          ) : (
                            <Box sx={{ textAlign: 'center', py: 3 }}>
                              <MeetingRoomIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                              <Typography color="text.secondary">
                                ห้องตรวจนี้ปิดให้บริการในวันนี้
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
            </Grid>
          )}
        </>
      )}

      {/* Dialog แก้ไขข้อมูลห้องตรวจ */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentRoom ? `แก้ไขข้อมูลห้องตรวจ ${currentRoom.name}` : 'แก้ไขข้อมูลห้องตรวจ'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* สถานะห้องตรวจ */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isRoomOpen}
                    onChange={(e) => setIsRoomOpen(e.target.checked)}
                    color="primary"
                  />
                }
                label={isRoomOpen ? "เปิดให้บริการ" : "ปิดให้บริการ"}
              />
            </Grid>

            {isRoomOpen && (
              <>
                {/* เลือกแพทย์ */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>แพทย์ประจำห้องตรวจ</InputLabel>
                    <Select
                      value={selectedDoctor}
                      onChange={(e: SelectChangeEvent<string>) => setSelectedDoctor(e.target.value)}
                      label="แพทย์ประจำห้องตรวจ"
                      disabled={dataLoading.employees}
                    >
                      <MenuItem value="">ไม่ระบุ</MenuItem>
                      {dataLoading.employees ? (
                        <MenuItem disabled>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={16} />
                            <Typography variant="body2">กำลังโหลดรายชื่อแพทย์...</Typography>
                          </Box>
                        </MenuItem>
                      ) : (
                        filterEmployeesByTypeAndDepartment('doctor', selectedDepartment).map((doctor) => {
                          const isAssigned = isEmployeeAssigned(doctor.id, currentRoom?.id);
                          return (
                            <MenuItem 
                              key={doctor.id} 
                              value={doctor.id}
                              disabled={isAssigned && doctor.id !== selectedDoctor}
                            >
                              {doctor.prefix} {doctor.firstNameTh} {doctor.lastNameTh}
                              {isAssigned && doctor.id !== selectedDoctor && ' (ถูกมอบหมายแล้ว)'}
                            </MenuItem>
                          );
                        })
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                {/* เลือกพยาบาล */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>พยาบาลประจำห้องตรวจ</InputLabel>
                    <Select
                      value={selectedNurse}
                      onChange={(e: SelectChangeEvent<string>) => setSelectedNurse(e.target.value)}
                      label="พยาบาลประจำห้องตรวจ"
                      disabled={dataLoading.employees}
                    >
                      <MenuItem value="">ไม่ระบุ</MenuItem>
                      {dataLoading.employees ? (
                        <MenuItem disabled>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={16} />
                            <Typography variant="body2">กำลังโหลดรายชื่อพยาบาล...</Typography>
                          </Box>
                        </MenuItem>
                      ) : (
                        filterEmployeesByTypeAndDepartment('nurse', selectedDepartment).map((nurse) => {
                          const isAssigned = isEmployeeAssigned(nurse.id, currentRoom?.id);
                          return (
                            <MenuItem 
                              key={nurse.id} 
                              value={nurse.id}
                              disabled={isAssigned && nurse.id !== selectedNurse}
                            >
                              {nurse.prefix} {nurse.firstNameTh} {nurse.lastNameTh}
                              {isAssigned && nurse.id !== selectedNurse && ' (ถูกมอบหมายแล้ว)'}
                            </MenuItem>
                          );
                        })
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                {/* เวลาเปิด-ปิด */}
                <Grid item xs={12} md={6}>
                  <TextField
                    label="เวลาเปิด"
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="เวลาปิด"
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* จำนวนผู้ป่วยสูงสุด */}
                <Grid item xs={12}>
                  <TextField
                    label="จำนวนผู้ป่วยสูงสุดที่รับได้"
                    type="number"
                    value={maxPatients}
                    onChange={(e) => setMaxPatients(parseInt(e.target.value) || 0)}
                    fullWidth
                    InputProps={{ inputProps: { min: 1, max: 100 } }}
                  />
                </Grid>

                {/* หมายเหตุ */}
                <Grid item xs={12}>
                  <TextField
                    label="หมายเหตุ"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">
            ยกเลิก
          </Button>
          <Button onClick={handleSaveRoom} color="primary" variant="contained">
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManageRoom;