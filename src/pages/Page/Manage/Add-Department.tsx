import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  AlertTitle,
  Divider,
  IconButton,
  Card,
  CardContent,

  Chip,
  Avatar,

} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Business as BuildingIcon,
  Layers as FloorIcon,
  MeetingRoom as RoomIcon,
  LocalHospital as DepartmentIcon,
  Save as SaveIcon,

  LocationOn as LocationIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ฟังก์ชัน generic ต้องอยู่นอก component!
async function getWorkplaceItems<T>(type: string): Promise<T[]> {
  const res = await axios.get(`${API_BASE_URL}/api/workplace/${type}`);
  return res.data;
}
async function addWorkplaceItem<T extends object>(type: string, data: T) {
  const res = await axios.post(`${API_BASE_URL}/api/workplace/${type}`, data);
  return res.data;
}

// Define interfaces for our data structures
interface Department {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
}

interface Building {
  id: string;
  name: string;
  address?: string;
  description?: string;
  isActive: boolean;
}

interface Floor {
  id: string;
  buildingId: string;
  number: number;
  name: string;
  description?: string;
  isActive: boolean;
}

interface Room {
  id: string;
  name: string;
  floorId: string;
  departmentId: string;
  capacity?: number;
  description?: string;
  isActive: boolean;
  room_type?: string;
}

const AddDepartment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get type from location state
  const type = location.state?.type || 'department';
  
  // States for data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  // States for form data
  const [departmentForm, setDepartmentForm] = useState<Department>({
    id: `DEPT-${Date.now().toString().slice(-6)}`,
    name: '',
    description: '',
    color: '#3f51b5',
    isActive: true
  });
  
  const [buildingForm, setBuildingForm] = useState<Building>({
    id: `BLDG-${Date.now().toString().slice(-6)}`,
    name: '',
    address: '',
    description: '',
    isActive: true
  });
  
  const [floorForm, setFloorForm] = useState<Floor>({
    id: `FLOOR-${Date.now().toString().slice(-6)}`,
    buildingId: '',
    number: 1,
    name: '',
    description: '',
    isActive: true
  });
  
  const [roomForm, setRoomForm] = useState<Room>({
    id: `ROOM-${Date.now().toString().slice(-6)}`,
    name: '',
    floorId: '',
    departmentId: '',
    capacity: 0,
    description: '',
    isActive: true,
    room_type: 'general'
  });
  
  // Form validation states
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  
  // โหลดข้อมูล workplace ทุก type
  useEffect(() => {
    const loadData = async () => {
      try {
        const depData = await getWorkplaceItems<Department>('department');
        setDepartments(depData);
        setBuildings(await getWorkplaceItems<Building>('building'));
        setFloors(await getWorkplaceItems<Floor>('floor'));
        setRooms(await getWorkplaceItems<Room>('room'));
      } catch (err) {
        console.error('Error loading workplace data:', err);
        setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่');
      }
    };
    loadData();
  }, []);
  
  // Generate page title based on type
  const getPageTitle = () => {
    switch (type) {
      case 'department': return 'เพิ่มแผนกใหม่';
      case 'building': return 'เพิ่มอาคารใหม่';
      case 'floor': return 'เพิ่มชั้นใหม่';
      case 'room': return 'เพิ่มห้องใหม่';
      default: return 'เพิ่มข้อมูลใหม่';
    }
  };
  
  // Generate page icon based on type
  const getPageIcon = () => {
    switch (type) {
      case 'department': return <DepartmentIcon sx={{ fontSize: 40, color: '#2196f3' }} />;
      case 'building': return <BuildingIcon sx={{ fontSize: 40, color: '#ff9800' }} />;
      case 'floor': return <FloorIcon sx={{ fontSize: 40, color: '#4caf50' }} />;
      case 'room': return <RoomIcon sx={{ fontSize: 40, color: '#9c27b0' }} />;
      default: return <DepartmentIcon sx={{ fontSize: 40, color: '#2196f3' }} />;
    }
  };
  
  // Validate form based on type
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    switch (type) {
      case 'department':
        if (!departmentForm.name) newErrors.name = 'กรุณาระบุชื่อแผนก';
        break;
      case 'building':
        if (!buildingForm.name) newErrors.name = 'กรุณาระบุชื่ออาคาร';
        break;
      case 'floor':
        if (!floorForm.buildingId) newErrors.buildingId = 'กรุณาเลือกอาคาร';
        if (!floorForm.name) newErrors.name = 'กรุณาระบุชื่อชั้น';
        break;
      case 'room':
        if (!roomForm.name) newErrors.name = 'กรุณาระบุชื่อห้อง';
        if (!roomForm.departmentId) newErrors.departmentId = 'กรุณาเลือกแผนก';
        if (!roomForm.floorId) newErrors.floorId = 'กรุณาเลือกชั้น';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // handleSubmit สำหรับแต่ละ type
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      if (type === 'department') {
        await addWorkplaceItem('department', departmentForm);
      } else if (type === 'building') {
        await addWorkplaceItem('building', buildingForm);
      } else if (type === 'floor') {
        await addWorkplaceItem('floor', floorForm);
      } else if (type === 'room') {
        await addWorkplaceItem('room', roomForm);
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/manage/departments');
      }, 2000);
    } catch (error: any) {
      console.error('Error saving data:', error);
      
      // แสดงข้อความ error ที่เจาะจงจากเซิร์ฟเวอร์
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่');
      }
    }
  };

  // Helper functions
  const getBuildingName = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    return building ? building.name : 'ไม่ระบุ';
  };
  
  // Get department statistics
  const getDepartmentStats = (departmentId: string) => {
    const departmentRooms = rooms.filter(r => r.departmentId === departmentId);
    const floorIds = [...new Set(departmentRooms.map(r => r.floorId))];
    const buildingIds = [...new Set(floors.filter(f => floorIds.includes(f.id)).map(f => f.buildingId))];
    
    return {
      buildings: buildingIds.length,
      floors: floorIds.length,
      rooms: departmentRooms.length
    };
  };

  // Render form based on type
  const renderForm = () => {
    switch (type) {
      case 'department':
        return (
          <Card elevation={2}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#2196f3', mr: 2 }}>
                  <DepartmentIcon />
                </Avatar>
                <Typography variant="h6">ข้อมูลแผนก</Typography>
              </Box>
              
              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="รหัสแผนก"
                      fullWidth
                      value={departmentForm.id}
                      disabled
                      variant="outlined"
                      helperText="รหัสจะถูกสร้างโดยอัตโนมัติ"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="ชื่อแผนก"
                      fullWidth
                      value={departmentForm.name}
                      onChange={(e) => setDepartmentForm({...departmentForm, name: e.target.value})}
                      required
                      error={!!errors.name}
                      helperText={errors.name}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="รายละเอียด"
                      fullWidth
                      multiline
                      rows={3}
                      value={departmentForm.description}
                      onChange={(e) => setDepartmentForm({...departmentForm, description: e.target.value})}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="สี (รหัสสี HTML)"
                      fullWidth
                      value={departmentForm.color}
                      onChange={(e) => setDepartmentForm({...departmentForm, color: e.target.value})}
                      placeholder="#RRGGBB"
                      variant="outlined"
                      InputProps={{
                        endAdornment: (
                          <Box 
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              borderRadius: 1, 
                              bgcolor: departmentForm.color || '#ccc',
                              ml: 1,
                              border: '2px solid #e0e0e0'
                            }} 
                          />
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>สถานะ</InputLabel>
                      <Select
                        value={departmentForm.isActive ? 'active' : 'inactive'}
                        onChange={(e) => setDepartmentForm({...departmentForm, isActive: e.target.value === 'active'})}
                        label="สถานะ"
                      >
                        <MenuItem value="active">
                          <Chip label="เปิดใช้งาน" color="success" size="small" />
                        </MenuItem>
                        <MenuItem value="inactive">
                          <Chip label="ปิดใช้งาน" color="default" size="small" />
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <Button 
                    variant="outlined"
                    onClick={() => navigate('/manage/departments')}
                    size="large"
                  >
                    ยกเลิก
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary"
                    startIcon={<SaveIcon />}
                    size="large"
                  >
                    บันทึกข้อมูล
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        );
        
      case 'building':
        return (
          <Card elevation={2}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <Avatar sx={{ bgcolor: '#ff9800', mr: 2 }}>
                  <BuildingIcon />
                </Avatar>
                <Typography variant="h6">ข้อมูลอาคาร</Typography>
              </Box>
              
              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="รหัสอาคาร"
                      fullWidth
                      value={buildingForm.id}
                      disabled
                      variant="outlined"
                      helperText="รหัสจะถูกสร้างโดยอัตโนมัติ"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="ชื่ออาคาร"
                      fullWidth
                      value={buildingForm.name}
                      onChange={(e) => setBuildingForm({...buildingForm, name: e.target.value})}
                      required
                      error={!!errors.name}
                      helperText={errors.name}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="ที่อยู่"
                      fullWidth
                      value={buildingForm.address}
                      onChange={(e) => setBuildingForm({...buildingForm, address: e.target.value})}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="รายละเอียด"
                      fullWidth
                      multiline
                      rows={3}
                      value={buildingForm.description}
                      onChange={(e) => setBuildingForm({...buildingForm, description: e.target.value})}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>สถานะ</InputLabel>
                      <Select
                        value={buildingForm.isActive ? 'active' : 'inactive'}
                        onChange={(e) => setBuildingForm({...buildingForm, isActive: e.target.value === 'active'})}
                        label="สถานะ"
                      >
                        <MenuItem value="active">
                          <Chip label="เปิดใช้งาน" color="success" size="small" />
                        </MenuItem>
                        <MenuItem value="inactive">
                          <Chip label="ปิดใช้งาน" color="default" size="small" />
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <Button 
                    variant="outlined"
                    onClick={() => navigate('/manage/departments')}
                    size="large"
                  >
                    ยกเลิก
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary"
                    startIcon={<SaveIcon />}
                    size="large"
                  >
                    บันทึกข้อมูล
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        );
        
      case 'floor':
        return (
          <Card elevation={2}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#4caf50', mr: 2 }}>
                  <FloorIcon />
                </Avatar>
                <Typography variant="h6">ข้อมูลชั้น</Typography>
              </Box>
              
              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="รหัสชั้น"
                      fullWidth
                      value={floorForm.id}
                      disabled
                      variant="outlined"
                      helperText="รหัสจะถูกสร้างโดยอัตโนมัติ"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined" error={!!errors.buildingId} required>
                      <InputLabel>อาคาร</InputLabel>
                      <Select
                        value={floorForm.buildingId}
                        onChange={(e) => setFloorForm({...floorForm, buildingId: e.target.value})}
                        label="อาคาร"
                      >
                        {buildings.map((building) => (
                          <MenuItem key={building.id} value={building.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <BuildingIcon sx={{ mr: 1, color: '#ff9800' }} />
                              {building.name}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.buildingId && <Typography variant="caption" color="error">{errors.buildingId}</Typography>}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="ชั้น"
                      type="number"
                      fullWidth
                      value={floorForm.number}
                      onChange={(e) => setFloorForm({...floorForm, number: parseInt(e.target.value)})}
                      required
                      InputProps={{ inputProps: { min: -10, max: 200 } }}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="ชื่อชั้น"
                      fullWidth
                      value={floorForm.name}
                      onChange={(e) => setFloorForm({...floorForm, name: e.target.value})}
                      required
                      error={!!errors.name}
                      helperText={errors.name || 'เช่น ชั้นล็อบบี้, ชั้นผู้ป่วยใน, ชั้นผู้ป่วยนอก'}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="รายละเอียด"
                      fullWidth
                      multiline
                      rows={3}
                      value={floorForm.description}
                      onChange={(e) => setFloorForm({...floorForm, description: e.target.value})}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>สถานะ</InputLabel>
                      <Select
                        value={floorForm.isActive ? 'active' : 'inactive'}
                        onChange={(e) => setFloorForm({...floorForm, isActive: e.target.value === 'active'})}
                        label="สถานะ"
                      >
                        <MenuItem value="active">
                          <Chip label="เปิดใช้งาน" color="success" size="small" />
                        </MenuItem>
                        <MenuItem value="inactive">
                          <Chip label="ปิดใช้งาน" color="default" size="small" />
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <Button 
                    variant="outlined"
                    onClick={() => navigate('/manage/departments')}
                    size="large"
                  >
                    ยกเลิก
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary"
                    startIcon={<SaveIcon />}
                    size="large"
                  >
                    บันทึกข้อมูล
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        );
        
      case 'room':
        return (
          <Card elevation={2}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#9c27b0', mr: 2 }}>
                  <RoomIcon />
                </Avatar>
                <Typography variant="h6">ข้อมูลห้อง</Typography>
              </Box>
              
              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="รหัสห้อง"
                      fullWidth
                      value={roomForm.id}
                      disabled
                      variant="outlined"
                      helperText="รหัสจะถูกสร้างโดยอัตโนมัติ"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="ชื่อห้อง"
                      fullWidth
                      value={roomForm.name}
                      onChange={(e) => setRoomForm({...roomForm, name: e.target.value})}
                      required
                      error={!!errors.name}
                      helperText={errors.name}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined" error={!!errors.departmentId} required>
                      <InputLabel>แผนก</InputLabel>
                      <Select
                        value={roomForm.departmentId}
                        onChange={(e) => setRoomForm({...roomForm, departmentId: e.target.value})}
                        label="แผนก"
                      >
                        {departments.map((department) => (
                          <MenuItem key={department.id} value={department.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box 
                                sx={{ 
                                  width: 16, 
                                  height: 16, 
                                  borderRadius: '50%', 
                                  bgcolor: department.color || '#ccc',
                                  mr: 1
                                }} 
                              />
                              {department.name}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.departmentId && <Typography variant="caption" color="error">{errors.departmentId}</Typography>}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined" error={!!errors.floorId} required>
                      <InputLabel>ชั้น</InputLabel>
                      <Select
                        value={roomForm.floorId}
                        onChange={(e) => setRoomForm({...roomForm, floorId: e.target.value})}
                        label="ชั้น"
                      >
                        {floors.map((floor) => (
                          <MenuItem key={floor.id} value={floor.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LocationIcon sx={{ mr: 1, color: '#4caf50' }} />
                              {getBuildingName(floor.buildingId)} ชั้น {floor.number} ({floor.name})
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.floorId && <Typography variant="caption" color="error">{errors.floorId}</Typography>}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="ความจุ (คน)"
                      type="number"
                      fullWidth
                      value={roomForm.capacity}
                      onChange={(e) => setRoomForm({...roomForm, capacity: parseInt(e.target.value)})}
                      InputProps={{ inputProps: { min: 0 } }}
                      helperText="จำนวนคนที่รองรับได้ (ถ้ามี)"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>ประเภทห้อง</InputLabel>
                      <Select
                        value={roomForm.room_type}
                        onChange={(e) => setRoomForm({...roomForm, room_type: e.target.value})}
                        label="ประเภทห้อง"
                      >
                        <MenuItem value="general">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <RoomIcon sx={{ mr: 1, color: '#2196f3' }} />
                            ห้องตรวจทั่วไป
                          </Box>
                        </MenuItem>
                        <MenuItem value="emergency">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <RoomIcon sx={{ mr: 1, color: '#f44336' }} />
                            ห้องวิกฤต
                          </Box>
                        </MenuItem>
                        <MenuItem value="cardiology">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <RoomIcon sx={{ mr: 1, color: '#e91e63' }} />
                            ห้องหัวใจ
                          </Box>
                        </MenuItem>
                        <MenuItem value="pediatric">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <RoomIcon sx={{ mr: 1, color: '#ff9800' }} />
                            ห้องเด็ก
                          </Box>
                        </MenuItem>
                        <MenuItem value="orthopedic">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <RoomIcon sx={{ mr: 1, color: '#4caf50' }} />
                            ห้องกระดูก
                          </Box>
                        </MenuItem>
                        <MenuItem value="eye">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <RoomIcon sx={{ mr: 1, color: '#9c27b0' }} />
                            ห้องตา
                          </Box>
                        </MenuItem>
                        <MenuItem value="ent">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <RoomIcon sx={{ mr: 1, color: '#607d8b' }} />
                            ห้องหู คอ จมูก
                          </Box>
                        </MenuItem>
                        <MenuItem value="obgyn">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <RoomIcon sx={{ mr: 1, color: '#795548' }} />
                            ห้องสูติ-นรีเวช
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="รายละเอียด"
                      fullWidth
                      multiline
                      rows={3}
                      value={roomForm.description}
                      onChange={(e) => setRoomForm({...roomForm, description: e.target.value})}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>สถานะ</InputLabel>
                      <Select
                        value={roomForm.isActive ? 'active' : 'inactive'}
                        onChange={(e) => setRoomForm({...roomForm, isActive: e.target.value === 'active'})}
                        label="สถานะ"
                      >
                        <MenuItem value="active">
                          <Chip label="เปิดใช้งาน" color="success" size="small" />
                        </MenuItem>
                        <MenuItem value="inactive">
                          <Chip label="ปิดใช้งาน" color="default" size="small" />
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <Button 
                    variant="outlined"
                    onClick={() => navigate('/manage/departments')}
                    size="large"
                  >
                    ยกเลิก
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary"
                    startIcon={<SaveIcon />}
                    size="large"
                  >
                    บันทึกข้อมูล
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        );
        
      default:
        return <Typography>ไม่พบแบบฟอร์มที่เลือก</Typography>;
    }
  };

  // Show preview of what will be added
  const renderPreview = () => {
    if (type !== 'department' || !departmentForm.name) return null;
    
    return (
      <Card elevation={1} sx={{ mt: 3, bgcolor: '#f8f9fa' }}>
        <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <InfoIcon sx={{ mr: 1, color: '#2196f3' }} />
            ตัวอย่างข้อมูลที่จะเพิ่ม
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box 
              sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: 1, 
                bgcolor: departmentForm.color || '#ccc',
                mr: 2,
                border: '2px solid #e0e0e0'
              }} 
            />
            <Box>
              <Typography variant="h6">{departmentForm.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                รหัส: {departmentForm.id}
              </Typography>
            </Box>
          </Box>
          
          {departmentForm.description && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              {departmentForm.description}
            </Typography>
          )}
          
          <Chip 
            label={departmentForm.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} 
            color={departmentForm.isActive ? 'success' : 'default'}
            size="small"
          />
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ width: '100%', bgcolor: '#f5f5f5', minHeight: '100vh', py: 3 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        {/* Header */}
        <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton 
              color="primary" 
              onClick={() => navigate('/manage/departments')}
              sx={{ mr: 2, bgcolor: '#f0f0f0' }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {getPageIcon()}
              <Box sx={{ ml: 2 }}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                  {getPageTitle()}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  เพิ่มข้อมูลใหม่เข้าสู่ระบบจัดการโรงพยาบาล
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
        
        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>บันทึกข้อมูลสำเร็จ</AlertTitle>
            ข้อมูลถูกบันทึกเรียบร้อยแล้ว กำลังกลับไปยังหน้าจัดการข้อมูล...
          </Alert>
        )}
        
        {/* Main Form */}
        {renderForm()}
        
        {/* Preview */}
        {renderPreview()}
        
        {/* Department Statistics (แสดงเฉพาะเมื่อเป็นแผนก) */}
        {type === 'department' && departments.length > 0 && (
          <Card elevation={1} sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                สถิติแผนกในระบบ
              </Typography>
              <Grid container spacing={2}>
                {departments.slice(0, 3).map((dept) => {
                  const stats = getDepartmentStats(dept.id);
                  return (
                    <Grid item xs={12} md={4} key={dept.id}>
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box 
                            sx={{ 
                              width: 20, 
                              height: 20, 
                              borderRadius: '50%', 
                              bgcolor: dept.color || '#ccc',
                              mr: 1
                            }} 
                          />
                          <Typography variant="subtitle2" noWrap>
                            {dept.name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="primary">
                              {stats.buildings}
                            </Typography>
                            <Typography variant="caption">อาคาร</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="secondary">
                              {stats.floors}
                            </Typography>
                            <Typography variant="caption">ชั้น</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="success.main">
                              {stats.rooms}
                            </Typography>
                            <Typography variant="caption">ห้อง</Typography>
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default AddDepartment;

