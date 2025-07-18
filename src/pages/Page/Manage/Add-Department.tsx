import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Alert,
  AlertTitle,
  Divider,
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Business as BuildingIcon,
  Layers as FloorIcon,
  MeetingRoom as RoomIcon,
  LocalHospital as DepartmentIcon,
  Save as SaveIcon
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
    isActive: true
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
        console.log('departments from backend:', depData);
        setBuildings(await getWorkplaceItems<Building>('building'));
        setFloors(await getWorkplaceItems<Floor>('floor'));
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
      case 'department':
        return 'เพิ่มแผนกใหม่';
      case 'building':
        return 'เพิ่มอาคารใหม่';
      case 'floor':
        return 'เพิ่มชั้นใหม่';
      case 'room':
        return 'เพิ่มห้องใหม่';
      default:
        return 'เพิ่มข้อมูลใหม่';
    }
  };
  
  // Generate page icon based on type
  const getPageIcon = () => {
    switch (type) {
      case 'department':
        return <DepartmentIcon fontSize="large" />;
      case 'building':
        return <BuildingIcon fontSize="large" />;
      case 'floor':
        return <FloorIcon fontSize="large" />;
      case 'room':
        return <RoomIcon fontSize="large" />;
      default:
        return <DepartmentIcon fontSize="large" />;
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
      // รีโหลดข้อมูลหลังบันทึกสำเร็จ
      const updatedDepartments = await getWorkplaceItems<Department>('department');
      setDepartments(updatedDepartments);
      setSuccess(true);
      setTimeout(() => {
        navigate('/manage/departments');
      }, 2000);
    } catch (error) {
      console.error('Error saving data:', error);
      setError('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่');
    }
  };
  
  // Helper function to get building name by ID
  const getBuildingName = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    return building ? building.name : 'ไม่ระบุ';
  };
  
  // Helper function to get floor name by ID
  const getFloorName = (floorId: string) => {
    const floor = floors.find(f => f.id === floorId);
    return floor ? `${floor.name} (ชั้น ${floor.number})` : 'ไม่ระบุ';
  };
  
  // Helper function to get department name by ID
  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'ไม่ระบุ';
  };
  
  // Render form based on type
  const renderForm = () => {
    switch (type) {
      case 'department':
        return (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="รหัสแผนก"
                  fullWidth
                  value={departmentForm.id}
                  onChange={(e) => setDepartmentForm({...departmentForm, id: e.target.value})}
                  margin="normal"
                  disabled
                  helperText="รหัสจะถูกสร้างโดยอัตโนมัติ"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="ชื่อแผนก"
                  fullWidth
                  value={departmentForm.name}
                  onChange={(e) => setDepartmentForm({...departmentForm, name: e.target.value})}
                  margin="normal"
                  required
                  error={!!errors.name}
                  helperText={errors.name}
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
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="สี (รหัสสี HTML)"
                  fullWidth
                  value={departmentForm.color}
                  onChange={(e) => setDepartmentForm({...departmentForm, color: e.target.value})}
                  margin="normal"
                  placeholder="#RRGGBB"
                  InputProps={{
                    endAdornment: (
                      <Box 
                        sx={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%', 
                          bgcolor: departmentForm.color || '#ccc',
                          ml: 1,
                          border: '1px solid #ccc'
                        }} 
                      />
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="สถานะ"
                  fullWidth
                  value={departmentForm.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setDepartmentForm({...departmentForm, isActive: e.target.value === 'active'})}
                  margin="normal"
                >
                  <MenuItem value="active">เปิดใช้งาน</MenuItem>
                  <MenuItem value="inactive">ปิดใช้งาน</MenuItem>
                </TextField>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                type="button" 
                onClick={() => navigate('/manage/departments')}
                sx={{ mr: 2 }}
              >
                ยกเลิก
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                startIcon={<SaveIcon />}
              >
                บันทึกข้อมูล
              </Button>
            </Box>
          </Box>
        );
        
      case 'building':
        return (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="รหัสอาคาร"
                  fullWidth
                  value={buildingForm.id}
                  onChange={(e) => setBuildingForm({...buildingForm, id: e.target.value})}
                  margin="normal"
                  disabled
                  helperText="รหัสจะถูกสร้างโดยอัตโนมัติ"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="ชื่ออาคาร"
                  fullWidth
                  value={buildingForm.name}
                  onChange={(e) => setBuildingForm({...buildingForm, name: e.target.value})}
                  margin="normal"
                  required
                  error={!!errors.name}
                  helperText={errors.name}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="ที่อยู่"
                  fullWidth
                  value={buildingForm.address}
                  onChange={(e) => setBuildingForm({...buildingForm, address: e.target.value})}
                  margin="normal"
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
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="สถานะ"
                  fullWidth
                  value={buildingForm.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setBuildingForm({...buildingForm, isActive: e.target.value === 'active'})}
                  margin="normal"
                >
                  <MenuItem value="active">เปิดใช้งาน</MenuItem>
                  <MenuItem value="inactive">ปิดใช้งาน</MenuItem>
                </TextField>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                type="button" 
                onClick={() => navigate('/manage/departments')}
                sx={{ mr: 2 }}
              >
                ยกเลิก
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                startIcon={<SaveIcon />}
              >
                บันทึกข้อมูล
              </Button>
            </Box>
          </Box>
        );
        
      case 'floor':
        return (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="รหัสชั้น"
                  fullWidth
                  value={floorForm.id}
                  onChange={(e) => setFloorForm({...floorForm, id: e.target.value})}
                  margin="normal"
                  disabled
                  helperText="รหัสจะถูกสร้างโดยอัตโนมัติ"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" error={!!errors.buildingId} required>
                  <InputLabel>อาคาร</InputLabel>
                  <Select
                    value={floorForm.buildingId}
                    onChange={(e) => setFloorForm({...floorForm, buildingId: e.target.value})}
                    label="อาคาร"
                  >
                    {buildings.map((building) => (
                      <MenuItem key={building.id} value={building.id}>
                        {building.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.buildingId && <FormHelperText>{errors.buildingId}</FormHelperText>}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="ชั้น"
                  type="number"
                  fullWidth
                  value={floorForm.number}
                  onChange={(e) => setFloorForm({...floorForm, number: parseInt(e.target.value)})}
                  margin="normal"
                  required
                  InputProps={{ inputProps: { min: -10, max: 200 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="ชื่อชั้น"
                  fullWidth
                  value={floorForm.name}
                  onChange={(e) => setFloorForm({...floorForm, name: e.target.value})}
                  margin="normal"
                  required
                  error={!!errors.name}
                  helperText={errors.name || 'เช่น ชั้นล็อบบี้, ชั้นผู้ป่วยใน, ชั้นผู้ป่วยนอก'}
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
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="สถานะ"
                  fullWidth
                  value={floorForm.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setFloorForm({...floorForm, isActive: e.target.value === 'active'})}
                  margin="normal"
                >
                  <MenuItem value="active">เปิดใช้งาน</MenuItem>
                  <MenuItem value="inactive">ปิดใช้งาน</MenuItem>
                </TextField>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                type="button" 
                onClick={() => navigate('/manage/departments')}
                sx={{ mr: 2 }}
              >
                ยกเลิก
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                startIcon={<SaveIcon />}
              >
                บันทึกข้อมูล
              </Button>
            </Box>
          </Box>
        );
        
      case 'room':
        return (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="รหัสห้อง"
                  fullWidth
                  value={roomForm.id}
                  onChange={(e) => setRoomForm({...roomForm, id: e.target.value})}
                  margin="normal"
                  disabled
                  helperText="รหัสจะถูกสร้างโดยอัตโนมัติ"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="ชื่อห้อง"
                  fullWidth
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({...roomForm, name: e.target.value})}
                  margin="normal"
                  required
                  error={!!errors.name}
                  helperText={errors.name}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" error={!!errors.departmentId} required>
                  <InputLabel>แผนก</InputLabel>
                  <Select
                    value={roomForm.departmentId}
                    onChange={(e) => setRoomForm({...roomForm, departmentId: e.target.value})}
                    label="แผนก"
                  >
                    {departments.map((department) => (
                      <MenuItem key={department.id} value={department.id}>
                        {department.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.departmentId && <FormHelperText>{errors.departmentId}</FormHelperText>}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" error={!!errors.floorId} required>
                  <InputLabel>ชั้น</InputLabel>
                  <Select
                    value={roomForm.floorId}
                    onChange={(e) => setRoomForm({...roomForm, floorId: e.target.value})}
                    label="ชั้น"
                  >
                    {floors.map((floor) => (
                      <MenuItem key={floor.id} value={floor.id}>
                        {getBuildingName(floor.buildingId)} ชั้น {floor.number} ({floor.name})
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.floorId && <FormHelperText>{errors.floorId}</FormHelperText>}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="ความจุ (คน)"
                  type="number"
                  fullWidth
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({...roomForm, capacity: parseInt(e.target.value)})}
                  margin="normal"
                  InputProps={{ inputProps: { min: 0 } }}
                  helperText="จำนวนคนที่รองรับได้ (ถ้ามี)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="รายละเอียด"
                  fullWidth
                  multiline
                  rows={3}
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({...roomForm, description: e.target.value})}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="สถานะ"
                  fullWidth
                  value={roomForm.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setRoomForm({...roomForm, isActive: e.target.value === 'active'})}
                  margin="normal"
                >
                  <MenuItem value="active">เปิดใช้งาน</MenuItem>
                  <MenuItem value="inactive">ปิดใช้งาน</MenuItem>
                </TextField>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                type="button" 
                onClick={() => navigate('/manage/departments')}
                sx={{ mr: 2 }}
              >
                ยกเลิก
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                startIcon={<SaveIcon />}
              >
                บันทึกข้อมูล
              </Button>
            </Box>
          </Box>
        );
        
      default:
        return <Typography>ไม่พบแบบฟอร์มที่เลือก</Typography>;
    }
  };
  
  // Show summary of what will be added
  const renderSummary = () => {
    switch (type) {
      case 'department':
        if (!departmentForm.name) return null;
        return (
          <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle1" gutterBottom>ข้อมูลที่จะเพิ่ม:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">รหัสแผนก:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{departmentForm.id}</Typography>
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">ชื่อแผนก:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{departmentForm.name}</Typography>
              </Grid>
              
              {departmentForm.description && (
                <>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">รายละเอียด:</Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">{departmentForm.description}</Typography>
                  </Grid>
                </>
              )}
              
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">สี:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box 
                    sx={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: '50%', 
                      bgcolor: departmentForm.color || '#ccc',
                      mr: 1,
                      border: '1px solid #ccc'
                    }} 
                  />
                  <Typography variant="body2">{departmentForm.color}</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">สถานะ:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{departmentForm.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</Typography>
              </Grid>
            </Grid>
          </Box>
        );
        
      case 'building':
        if (!buildingForm.name) return null;
        return (
          <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle1" gutterBottom>ข้อมูลที่จะเพิ่ม:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">รหัสอาคาร:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{buildingForm.id}</Typography>
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">ชื่ออาคาร:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{buildingForm.name}</Typography>
              </Grid>
              
              {buildingForm.address && (
                <>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">ที่อยู่:</Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">{buildingForm.address}</Typography>
                  </Grid>
                </>
              )}
              
              {buildingForm.description && (
                <>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">รายละเอียด:</Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">{buildingForm.description}</Typography>
                  </Grid>
                </>
              )}
              
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">สถานะ:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{buildingForm.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</Typography>
              </Grid>
            </Grid>
          </Box>
        );
        
      case 'floor':
        if (!floorForm.name || !floorForm.buildingId) return null;
        return (
          <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle1" gutterBottom>ข้อมูลที่จะเพิ่ม:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">รหัสชั้น:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{floorForm.id}</Typography>
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">อาคาร:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{getBuildingName(floorForm.buildingId)}</Typography>
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">ชั้น:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{floorForm.number}</Typography>
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">ชื่อชั้น:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{floorForm.name}</Typography>
              </Grid>
              
              {floorForm.description && (
                <>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">รายละเอียด:</Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">{floorForm.description}</Typography>
                  </Grid>
                </>
              )}
              
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">สถานะ:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{floorForm.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</Typography>
              </Grid>
            </Grid>
          </Box>
        );
        
      case 'room':
        if (!roomForm.name || !roomForm.departmentId || !roomForm.floorId) return null;
        return (
          <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle1" gutterBottom>ข้อมูลที่จะเพิ่ม:</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">รหัสห้อง:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{roomForm.id}</Typography>
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">ชื่อห้อง:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{roomForm.name}</Typography>
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">แผนก:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{getDepartmentName(roomForm.departmentId)}</Typography>
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">ตำแหน่ง:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{getFloorName(roomForm.floorId)}</Typography>
              </Grid>
              
              {roomForm.capacity !== undefined && roomForm.capacity > 0 && (
                <>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">ความจุ:</Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">{roomForm.capacity} คน</Typography>
                  </Grid>
                </>
              )}
              
              {roomForm.description && (
                <>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">รายละเอียด:</Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">{roomForm.description}</Typography>
                  </Grid>
                </>
              )}
              
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">สถานะ:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{roomForm.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</Typography>
              </Grid>
            </Grid>
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton 
            color="primary" 
            onClick={() => navigate('/manage/departments')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {getPageIcon()}
            <Typography variant="h5" component="h1" sx={{ ml: 2 }}>
              {getPageTitle()}
            </Typography>
          </Box>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
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
        
        {renderForm()}
        {renderSummary()}
      </Paper>
      {/* ตัวอย่าง UI แสดง department ทั้งหมด */}
      {/* <div style={{ marginTop: 32 }}>
        <h3>รายชื่อแผนกทั้งหมด</h3>
        <ul>
          {departments.map(dep => (
            <li key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{dep.name}</span>
              <button
                style={{ marginLeft: 8 }}
                onClick={async () => {
                  try {
                    await addWorkplaceItem('department', { ...dep, name: dep.name + ' (แก้ไขแล้ว)' });
                    const updatedDepartments = await getWorkplaceItems<Department>('department');
                    setDepartments(updatedDepartments);
                  } catch (err) {
                    console.error('Error editing department:', err);
                    setError('ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่');
                  }
                }}
              >Edit</button>
              <button
                style={{ marginLeft: 8 }}
                onClick={async () => {
                  try {
                    await addWorkplaceItem('department', { ...dep, isActive: false }); // Soft delete
                    const updatedDepartments = await getWorkplaceItems<Department>('department');
                    setDepartments(updatedDepartments);
                  } catch (err) {
                    console.error('Error deleting department:', err);
                    setError('ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่');
                  }
                }}
              >Delete</button>
            </li>
          ))}
        </ul>
      </div> */}
    </Box>
  );
};

export default AddDepartment;