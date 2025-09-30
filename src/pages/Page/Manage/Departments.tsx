import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Card,
  CardContent,
  Grid,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  MenuItem,
  Chip,
  Snackbar,
  Alert,
  Avatar,
 
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fab,
  Tooltip,

} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Business as BuildingIcon,
  Layers as FloorIcon,
  MeetingRoom as RoomIcon,
  LocalHospital as DepartmentIcon,
  ExpandMore as ExpandMoreIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function getWorkplaceItems<T>(type: string): Promise<T[]> {
  const res = await axios.get(`${API_BASE_URL}/api/workplace/${type}`);
  return res.data;
}
async function editWorkplaceItem<T extends object>(type: string, id: string, data: T) {
  const res = await axios.put(`${API_BASE_URL}/api/workplace/${type}/${id}`, data);
  return res.data;
}
async function deleteWorkplaceItem(type: string, id: string) {
  const res = await axios.delete(`${API_BASE_URL}/api/workplace/${type}/${id}`);
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
  room_type?: string; // เพิ่ม room_type field
}

// ประเภทห้องตรวจที่รองรับ
const ROOM_TYPES = [
  { value: 'general', label: 'ห้องตรวจโรคทั่วไป', color: '#4caf50' },
  { value: 'orthopedic', label: 'ห้องตรวจแผนกกระดูกและข้อ', color: '#ff9800' },
  { value: 'pediatric', label: 'ห้องตรวจกุมารเวช', color: '#2196f3' },
  { value: 'cardiology', label: 'ห้องตรวจแผนกอายุรกรรมโรคหัวใจ', color: '#f44336' },
  { value: 'eye', label: 'ห้องตรวจแผนกจักษุกรรม', color: '#9c27b0' },
  { value: 'ent', label: 'ห้องตรวจแผนกหู คอ จมูก', color: '#00bcd4' },
  { value: 'obgyn', label: 'ห้องตรวจแผนกสูตินรีเวช', color: '#e91e63' },
  { value: 'emergency', label: 'ห้องฉุกเฉิน', color: '#d32f2f' }
];

// Helper function เพื่อหาข้อมูลประเภทห้อง
const getRoomTypeInfo = (roomType: string) => {
  return ROOM_TYPES.find(type => type.value === roomType) || 
         { value: roomType, label: roomType, color: '#757575' };
};

const Departments: React.FC = () => {
  const navigate = useNavigate();
  
  // States for data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  // States for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: string, id: string, name: string}>({type: '', id: '', name: ''});
  
  // States for edit dialogs
  const [editDepartmentDialog, setEditDepartmentDialog] = useState(false);
  const [editBuildingDialog, setEditBuildingDialog] = useState(false);
  const [editFloorDialog, setEditFloorDialog] = useState(false);
  const [editRoomDialog, setEditRoomDialog] = useState(false);
  
  // States for edited items
  const [editedDepartment, setEditedDepartment] = useState<Department | null>(null);
  const [editedBuilding, setEditedBuilding] = useState<Building | null>(null);
  const [editedFloor, setEditedFloor] = useState<Floor | null>(null);
  const [editedRoom, setEditedRoom] = useState<Room | null>(null);
  
  // State for success message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setDepartments(await getWorkplaceItems<Department>('department'));
        setBuildings(await getWorkplaceItems<Building>('building'));
        setFloors(await getWorkplaceItems<Floor>('floor'));
        setRooms(await getWorkplaceItems<Room>('room'));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);
  
  // Navigate to add page
  const handleAddNew = (type: string) => {
    navigate('/manage/add-department', { state: { type } });
  };
  
  // Handle edit item
  const handleEdit = (type: string, id: string) => {
    switch (type) {
      case 'department': {
        const department = departments.find(d => d.id === id);
        if (department) {
          setEditedDepartment(department);
          setEditDepartmentDialog(true);
        }
        break;
      }
      case 'building': {
        const building = buildings.find(b => b.id === id);
        if (building) {
          setEditedBuilding(building);
          setEditBuildingDialog(true);
        }
        break;
      }
      case 'floor': {
        const floor = floors.find(f => f.id === id);
        if (floor) {
          setEditedFloor(floor);
          setEditFloorDialog(true);
        }
        break;
      }
      case 'room': {
        const room = rooms.find(r => r.id === id);
        if (room) {
          // ตั้งค่า room_type เริ่มต้นเป็น 'general' หากยังไม่มี
          const roomWithType = {
            ...room,
            room_type: room.room_type || 'general'
          };
          setEditedRoom(roomWithType);
          setEditRoomDialog(true);
        }
        break;
      }
    }
  };
  
  // Handle delete item
  const handleDelete = (type: string, id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteDialogOpen(true);
  };
  
  // Confirm delete
  const confirmDelete = async () => {
    const { type, id } = itemToDelete;
    try {
      await deleteWorkplaceItem(type, id);
      // reload data
      setDepartments(await getWorkplaceItems<Department>('department'));
      setBuildings(await getWorkplaceItems<Building>('building'));
      setFloors(await getWorkplaceItems<Floor>('floor'));
      setRooms(await getWorkplaceItems<Room>('room'));
      setSuccessMessage('ลบข้อมูลสำเร็จ');
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };
  
  // Save edited department
  const saveEditedDepartment = async () => {
    if (editedDepartment) {
      try {
        await editWorkplaceItem('department', editedDepartment.id, editedDepartment);
        setDepartments(await getWorkplaceItems<Department>('department'));
        setEditDepartmentDialog(false);
        setEditedDepartment(null);
        setSuccessMessage('แก้ไขข้อมูลสำเร็จ');
      } catch (error) {
        console.error('Error editing department:', error);
      }
    }
  };
  
  // Save edited building
  const saveEditedBuilding = async () => {
    if (editedBuilding) {
      try {
        await editWorkplaceItem('building', editedBuilding.id, editedBuilding);
        setBuildings(await getWorkplaceItems<Building>('building'));
        setEditBuildingDialog(false);
        setEditedBuilding(null);
        setSuccessMessage('แก้ไขข้อมูลสำเร็จ');
      } catch (error) {
        console.error('Error editing building:', error);
      }
    }
  };
  
  // Save edited floor
  const saveEditedFloor = async () => {
    if (editedFloor) {
      try {
        await editWorkplaceItem('floor', editedFloor.id, editedFloor);
        setFloors(await getWorkplaceItems<Floor>('floor'));
        setEditFloorDialog(false);
        setEditedFloor(null);
        setSuccessMessage('แก้ไขข้อมูลสำเร็จ');
      } catch (error) {
        console.error('Error editing floor:', error);
      }
    }
  };
  
  // Save edited room
  const saveEditedRoom = async () => {
    if (editedRoom) {
      try {
              await editWorkplaceItem('room', editedRoom.id, editedRoom);
        setRooms(await getWorkplaceItems<Room>('room'));
        setEditRoomDialog(false);
        setEditedRoom(null);
        setSuccessMessage('แก้ไขข้อมูลสำเร็จ');
      } catch (error) {
        console.error('Error editing room:', error);
      }
    }
  };
  
  // Helper function to get building name by ID
  const getBuildingName = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    return building ? building.name : 'ไม่ระบุ';
  };
  
  // Helper function to get department name by ID
  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'ไม่ระบุ';
  };
  
  // Helper function to get floor name by ID
  const getFloorName = (floorId: string) => {
    const floor = floors.find(f => f.id === floorId);
    return floor ? `${floor.name} (ชั้น ${floor.number})` : 'ไม่ระบุ';
  };

  // Get department statistics with building, floor, and room info
  const getDepartmentStats = (departmentId: string) => {
    const departmentRooms = rooms.filter(r => r.departmentId === departmentId);
    const floorIds = [...new Set(departmentRooms.map(r => r.floorId))];
    const departmentFloors = floors.filter(f => floorIds.includes(f.id));
    const buildingIds = [...new Set(departmentFloors.map(f => f.buildingId))];
    const departmentBuildings = buildings.filter(b => buildingIds.includes(b.id));
    
    return {
      buildings: departmentBuildings,
      floors: departmentFloors,
      rooms: departmentRooms,
      totalCapacity: departmentRooms.reduce((sum, room) => sum + (room.capacity || 0), 0)
    };
  };

  // Render department card with full info
  const renderDepartmentCard = (department: Department) => {
    const stats = getDepartmentStats(department.id);
    
    return (
      <Card key={department.id} elevation={2} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: department.color || '#2196f3', mr: 2 }}>
                <DepartmentIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {department.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  รหัส: {department.id}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={department.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} 
                color={department.isActive ? 'success' : 'default'}
                size="small"
              />
              <IconButton 
                size="small" 
                color="primary"
                onClick={() => handleEdit('department', department.id)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton 
                size="small" 
                color="error"
                onClick={() => handleDelete('department', department.id, department.name)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {department.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {department.description}
            </Typography>
          )}

          {/* Statistics Summary */}
          <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BuildingIcon sx={{ color: '#ff9800', mr: 1 }} />
              <Typography variant="body2">
                <strong>{stats.buildings.length}</strong> อาคาร
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FloorIcon sx={{ color: '#4caf50', mr: 1 }} />
              <Typography variant="body2">
                <strong>{stats.floors.length}</strong> ชั้น
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <RoomIcon sx={{ color: '#9c27b0', mr: 1 }} />
              <Typography variant="body2">
                <strong>{stats.rooms.length}</strong> ห้อง
              </Typography>
            </Box>
            {stats.totalCapacity > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="primary">
                  ความจุรวม: <strong>{stats.totalCapacity}</strong> คน
                </Typography>
              </Box>
            )}
          </Box>

          {/* Detailed Location Info */}
          {stats.buildings.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">
                  รายละเอียดตำแหน่ง ({stats.buildings.length} อาคาร)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {stats.buildings.map((building) => {
                  const buildingFloors = stats.floors.filter(f => f.buildingId === building.id);
                  return (
                    <Box key={building.id} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <BuildingIcon sx={{ color: '#ff9800', mr: 1 }} />
                        <Typography variant="subtitle2" fontWeight="bold">
                          {building.name}
                        </Typography>
                        {building.address && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ({building.address})
                          </Typography>
                        )}
                      </Box>
                      
                      {buildingFloors.map((floor) => {
                        const floorRooms = stats.rooms.filter(r => r.floorId === floor.id);
                        return (
                          <Box key={floor.id} sx={{ ml: 3, mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <FloorIcon sx={{ color: '#4caf50', mr: 1, fontSize: 16 }} />
                              <Typography variant="body2">
                                ชั้น {floor.number} - {floor.name} ({floorRooms.length} ห้อง)
                              </Typography>
                            </Box>
                            
                            {floorRooms.length > 0 && (
                              <Box sx={{ ml: 3, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {floorRooms.map((room) => (
                                  <Chip
                                    key={room.id}
                                    label={`${room.name}${room.capacity ? ` (${room.capacity})` : ''}`}
                                    size="small"
                                    variant="outlined"
                                    icon={<RoomIcon />}
                                  />
                                ))}
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  );
                })}
              </AccordionDetails>
            </Accordion>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ width: '100%', bgcolor: '#f5f5f5', minHeight: '100vh', py: 3, pb: 12 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        {/* Header */}
        <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'white' }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            justifyContent: 'space-between', 
            mb: 2,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 0 }
          }}>
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                จัดการแผนกและสถานที่
              </Typography>
              <Typography variant="body1" color="text.secondary">
                จัดการข้อมูลแผนก อาคาร ชั้น และห้องตรวจรักษาในโรงพยาบาล
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button 
                variant="outlined" 
                startIcon={<BuildingIcon />}
                onClick={() => handleAddNew('building')}
                size="large"
              >
                เพิ่มอาคาร
              </Button>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => handleAddNew('department')}
                size="large"
              >
                เพิ่มแผนก
              </Button>
            </Box>
          </Box>

          {/* Quick Stats */}
          <Grid container spacing={3}>
            <Grid item xs={6} md={3}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 2.5, height: '100%' }}>
                <DepartmentIcon sx={{ fontSize: 36, color: '#2196f3', mb: 1 }} />
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {departments.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  แผนก
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 2.5, height: '100%' }}>
                <BuildingIcon sx={{ fontSize: 36, color: '#ff9800', mb: 1 }} />
                <Typography variant="h4" color="warning.main" fontWeight="bold">
                  {buildings.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  อาคาร
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 2.5, height: '100%' }}>
                <FloorIcon sx={{ fontSize: 36, color: '#4caf50', mb: 1 }} />
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  {floors.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ชั้น
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 2.5, height: '100%' }}>
                <RoomIcon sx={{ fontSize: 36, color: '#9c27b0', mb: 1 }} />
                <Typography variant="h4" color="secondary.main" fontWeight="bold">
                  {rooms.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ห้อง
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Departments Section */}
        <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5" fontWeight="bold">
              รายการแผนก
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {departments.length} แผนก
            </Typography>
          </Box>

          {departments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <DepartmentIcon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                ยังไม่มีแผนกในระบบ
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => handleAddNew('department')}
                sx={{ mt: 2 }}
              >
                เพิ่มแผนกแรก
              </Button>
            </Box>
          ) : (
            departments.map(renderDepartmentCard)
          )}
        </Paper>

        {/* Buildings Section */}
        <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5" fontWeight="bold">
              รายการอาคาร
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={() => handleAddNew('building')}
            >
              เพิ่มอาคาร
            </Button>
          </Box>

          {buildings.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <BuildingIcon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                ยังไม่มีอาคารในระบบ
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {buildings.map((building) => {
                const buildingFloors = floors.filter(f => f.buildingId === building.id);
                const buildingRooms = rooms.filter(r => buildingFloors.some(f => f.id === r.floorId));
                
                return (
                  <Grid item xs={12} md={6} lg={4} key={building.id}>
                    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Avatar sx={{ bgcolor: '#ff9800', mr: 2 }}>
                              <BuildingIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                {building.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {building.id}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleEdit('building', building.id)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDelete('building', building.id, building.name)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>

                        {building.address && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            <LocationIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            {building.address}
                          </Typography>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="success.main">
                              {buildingFloors.length}
                            </Typography>
                            <Typography variant="caption">ชั้น</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="secondary.main">
                              {buildingRooms.length}
                            </Typography>
                            <Typography variant="caption">ห้อง</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Chip 
                              label={building.isActive ? 'เปิด' : 'ปิด'} 
                              color={building.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                        </Box>

                        {buildingFloors.length > 0 && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              ชั้น: {buildingFloors.map(f => f.number).sort((a, b) => a - b).join(', ')}
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
        </Paper>

        {/* Floors and Rooms Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Floors */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 3, bgcolor: 'white', height: 'fit-content' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" fontWeight="bold">
                  รายการชั้น
                </Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />}
                  onClick={() => handleAddNew('floor')}
                  disabled={buildings.length === 0}
                  size="small"
                >
                  เพิ่มชั้น
                </Button>
              </Box>

              {floors.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <FloorIcon sx={{ fontSize: 48, color: '#e0e0e0', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    {buildings.length === 0 ? 'กรุณาเพิ่มอาคารก่อน' : 'ยังไม่มีชั้นในระบบ'}
                  </Typography>
                </Box>
              ) : (
                <List dense>
                  {floors.map((floor) => {
                    const floorRooms = rooms.filter(r => r.floorId === floor.id);
                    return (
                      <ListItem key={floor.id} divider>
                        <ListItemIcon>
                          <FloorIcon color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`ชั้น ${floor.number} - ${floor.name}`}
                          secondary={`${getBuildingName(floor.buildingId)} • ${floorRooms.length} ห้อง`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleEdit('floor', floor.id)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDelete('floor', floor.id, `ชั้น ${floor.number} - ${floor.name}`)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Paper>
          </Grid>

          {/* Rooms */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 3, bgcolor: 'white', height: 'fit-content' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" fontWeight="bold">
                  รายการห้อง
                </Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />}
                  onClick={() => handleAddNew('room')}
                  disabled={departments.length === 0 || floors.length === 0}
                  size="small"
                >
                  เพิ่มห้อง
                </Button>
              </Box>

              {rooms.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <RoomIcon sx={{ fontSize: 48, color: '#e0e0e0', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    {(departments.length === 0 || floors.length === 0) 
                      ? 'กรุณาเพิ่มแผนกและชั้นก่อน' 
                      : 'ยังไม่มีห้องในระบบ'}
                  </Typography>
                </Box>
              ) : (
                <List dense>
                  {rooms.slice(0, 10).map((room) => {
                    const department = departments.find(d => d.id === room.departmentId);
                    return (
                      <ListItem key={room.id} divider sx={{ py: 1.5, pr: 8 }}>
                        <ListItemIcon>
                          <RoomIcon color="secondary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                              {department && (
                                <Box 
                                  sx={{ 
                                    width: 12, 
                                    height: 12, 
                                    borderRadius: '50%', 
                                    bgcolor: department.color || '#ccc',
                                    mr: 1,
                                    flexShrink: 0
                                  }} 
                                />
                              )}
                              <Typography variant="body2" component="span" sx={{ mr: 1 }}>
                                {room.name}
                              </Typography>
                              {room.capacity && (
                                <Chip 
                                  label={`${room.capacity} คน`} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem', height: '20px' }}
                                />
                              )}
                              {room.room_type && (
                                <Chip 
                                  label={getRoomTypeInfo(room.room_type).label} 
                                  size="small" 
                                  sx={{ 
                                    bgcolor: getRoomTypeInfo(room.room_type).color,
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    height: '20px'
                                  }}
                                />
                              )}
                            </Box>
                          }
                          secondary={`${getDepartmentName(room.departmentId)} • ${getFloorName(room.floorId)}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleEdit('room', room.id)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDelete('room', room.id, room.name)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                  {rooms.length > 10 && (
                    <ListItem>
                      <ListItemText 
                        primary={
                          <Typography variant="body2" color="text.secondary" align="center">
                            และอีก {rooms.length - 10} ห้อง...
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Floating Action Buttons */}
        <Box sx={{ 
          position: 'fixed', 
          bottom: 24, 
          right: 24, 
          display: { xs: 'none', md: 'flex' }, 
          flexDirection: 'column', 
          gap: 1,
          zIndex: 1000
        }}>
          <Tooltip title="เพิ่มห้อง" placement="left">
            <Fab 
              color="secondary" 
              size="medium"
              onClick={() => handleAddNew('room')}
              disabled={departments.length === 0 || floors.length === 0}
              sx={{ 
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                '&:hover': { transform: 'scale(1.05)' }
              }}
            >
              <RoomIcon />
            </Fab>
          </Tooltip>
          <Tooltip title="เพิ่มชั้น" placement="left">
            <Fab 
              color="success" 
              size="medium"
              onClick={() => handleAddNew('floor')}
              disabled={buildings.length === 0}
              sx={{ 
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                '&:hover': { transform: 'scale(1.05)' }
              }}
            >
              <FloorIcon />
            </Fab>
          </Tooltip>
          <Tooltip title="เพิ่มอาคาร" placement="left">
            <Fab 
              color="warning" 
              size="medium"
              onClick={() => handleAddNew('building')}
              sx={{ 
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                '&:hover': { transform: 'scale(1.05)' }
              }}
            >
              <BuildingIcon />
            </Fab>
          </Tooltip>
          <Tooltip title="เพิ่มแผนก" placement="left">
            <Fab 
              color="primary"
              onClick={() => handleAddNew('department')}
              sx={{ 
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                '&:hover': { transform: 'scale(1.05)' }
              }}
            >
              <AddIcon />
            </Fab>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <DialogContentText>
            คุณต้องการลบ "{itemToDelete.name}" ใช่หรือไม่? 
            การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>ยกเลิก</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">ลบ</Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Department Dialog */}
      <Dialog
        open={editDepartmentDialog}
        onClose={() => setEditDepartmentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>แก้ไขข้อมูลแผนก</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              label="ชื่อแผนก"
              fullWidth
              margin="normal"
              value={editedDepartment?.name || ''}
              onChange={(e) => setEditedDepartment(prev => prev ? {...prev, name: e.target.value} : null)}
              required
            />
            <TextField
              label="รายละเอียด"
              fullWidth
              margin="normal"
              multiline
              rows={2}
              value={editedDepartment?.description || ''}
              onChange={(e) => setEditedDepartment(prev => prev ? {...prev, description: e.target.value} : null)}
            />
            <TextField
              label="สี (รหัสสี HTML)"
              fullWidth
              margin="normal"
              value={editedDepartment?.color || ''}
              onChange={(e) => setEditedDepartment(prev => prev ? {...prev, color: e.target.value} : null)}
              InputProps={{
                endAdornment: (
                  <Box 
                    sx={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      bgcolor: editedDepartment?.color || '#ccc',
                      ml: 1,
                      border: '1px solid #ccc'
                    }} 
                  />
                )
              }}
            />
            <TextField
              select
              label="สถานะ"
              fullWidth
              margin="normal"
              value={editedDepartment?.isActive ? 'active' : 'inactive'}
              onChange={(e) => setEditedDepartment(prev => prev ? {...prev, isActive: e.target.value === 'active'} : null)}
            >
              <MenuItem value="active">เปิดใช้งาน</MenuItem>
              <MenuItem value="inactive">ปิดใช้งาน</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDepartmentDialog(false)}>ยกเลิก</Button>
          <Button onClick={saveEditedDepartment} color="primary" variant="contained">บันทึก</Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Building Dialog */}
      <Dialog
        open={editBuildingDialog}
        onClose={() => setEditBuildingDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>แก้ไขข้อมูลอาคาร</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              label="ชื่ออาคาร"
              fullWidth
              margin="normal"
              value={editedBuilding?.name || ''}
              onChange={(e) => setEditedBuilding(prev => prev ? {...prev, name: e.target.value} : null)}
              required
            />
            <TextField
              label="ที่อยู่"
              fullWidth
              margin="normal"
              value={editedBuilding?.address || ''}
              onChange={(e) => setEditedBuilding(prev => prev ? {...prev, address: e.target.value} : null)}
            />
                        <TextField
              label="รายละเอียด"
              fullWidth
              margin="normal"
              multiline
              rows={2}
              value={editedBuilding?.description || ''}
              onChange={(e) => setEditedBuilding(prev => prev ? {...prev, description: e.target.value} : null)}
            />
            <TextField
              select
              label="สถานะ"
              fullWidth
              margin="normal"
              value={editedBuilding?.isActive ? 'active' : 'inactive'}
              onChange={(e) => setEditedBuilding(prev => prev ? {...prev, isActive: e.target.value === 'active'} : null)}
            >
              <MenuItem value="active">เปิดใช้งาน</MenuItem>
              <MenuItem value="inactive">ปิดใช้งาน</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditBuildingDialog(false)}>ยกเลิก</Button>
          <Button onClick={saveEditedBuilding} color="primary" variant="contained">บันทึก</Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Floor Dialog */}
      <Dialog
        open={editFloorDialog}
        onClose={() => setEditFloorDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>แก้ไขข้อมูลชั้น</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              select
              label="อาคาร"
              fullWidth
              margin="normal"
              value={editedFloor?.buildingId || ''}
              onChange={(e) => setEditedFloor(prev => prev ? {...prev, buildingId: e.target.value} : null)}
              required
            >
              {buildings.map((building) => (
                <MenuItem key={building.id} value={building.id}>
                  {building.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="ชั้น"
              type="number"
              fullWidth
              margin="normal"
              value={editedFloor?.number || ''}
              onChange={(e) => setEditedFloor(prev => prev ? {...prev, number: parseInt(e.target.value)} : null)}
              required
              InputProps={{ inputProps: { min: -10, max: 200 } }}
            />
            <TextField
              label="ชื่อชั้น"
              fullWidth
              margin="normal"
              value={editedFloor?.name || ''}
              onChange={(e) => setEditedFloor(prev => prev ? {...prev, name: e.target.value} : null)}
              required
            />
            <TextField
              label="รายละเอียด"
              fullWidth
              margin="normal"
              multiline
              rows={2}
              value={editedFloor?.description || ''}
              onChange={(e) => setEditedFloor(prev => prev ? {...prev, description: e.target.value} : null)}
            />
            <TextField
              select
              label="สถานะ"
              fullWidth
              margin="normal"
              value={editedFloor?.isActive ? 'active' : 'inactive'}
              onChange={(e) => setEditedFloor(prev => prev ? {...prev, isActive: e.target.value === 'active'} : null)}
            >
              <MenuItem value="active">เปิดใช้งาน</MenuItem>
              <MenuItem value="inactive">ปิดใช้งาน</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditFloorDialog(false)}>ยกเลิก</Button>
          <Button onClick={saveEditedFloor} color="primary" variant="contained">บันทึก</Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Room Dialog */}
      <Dialog
        open={editRoomDialog}
        onClose={() => setEditRoomDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>แก้ไขข้อมูลห้อง</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              label="ชื่อห้อง"
              fullWidth
              margin="normal"
              value={editedRoom?.name || ''}
              onChange={(e) => setEditedRoom(prev => prev ? {...prev, name: e.target.value} : null)}
              required
            />
            <TextField
              select
              label="แผนก"
              fullWidth
              margin="normal"
              value={editedRoom?.departmentId || ''}
              onChange={(e) => setEditedRoom(prev => prev ? {...prev, departmentId: e.target.value} : null)}
              required
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
            </TextField>
            <TextField
              select
              label="ชั้น"
              fullWidth
              margin="normal"
              value={editedRoom?.floorId || ''}
              onChange={(e) => setEditedRoom(prev => prev ? {...prev, floorId: e.target.value} : null)}
              required
            >
              {floors.map((floor) => (
                <MenuItem key={floor.id} value={floor.id}>
                  {getBuildingName(floor.buildingId)} ชั้น {floor.number} ({floor.name})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="ความจุ (คน)"
              type="number"
              fullWidth
              margin="normal"
              value={editedRoom?.capacity || ''}
              onChange={(e) => setEditedRoom(prev => prev ? {...prev, capacity: parseInt(e.target.value)} : null)}
              InputProps={{ inputProps: { min: 0 } }}
            />
            <TextField
              select
              label="ประเภทห้องตรวจ"
              fullWidth
              margin="normal"
              value={editedRoom?.room_type || 'general'}
              onChange={(e) => setEditedRoom(prev => prev ? {...prev, room_type: e.target.value} : null)}
              required
              helperText="กำหนดประเภทห้องเพื่อให้ระบบจัดคิวได้ถูกต้อง"
            >
              {ROOM_TYPES.map((roomType) => (
                <MenuItem key={roomType.value} value={roomType.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box 
                      sx={{ 
                        width: 16, 
                        height: 16, 
                        borderRadius: '50%', 
                        bgcolor: roomType.color,
                        mr: 1
                      }} 
                    />
                    {roomType.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="รายละเอียด"
              fullWidth
              margin="normal"
              multiline
              rows={2}
              value={editedRoom?.description || ''}
              onChange={(e) => setEditedRoom(prev => prev ? {...prev, description: e.target.value} : null)}
            />
            <TextField
              select
              label="สถานะ"
              fullWidth
              margin="normal"
              value={editedRoom?.isActive ? 'active' : 'inactive'}
              onChange={(e) => setEditedRoom(prev => prev ? {...prev, isActive: e.target.value === 'active'} : null)}
            >
              <MenuItem value="active">เปิดใช้งาน</MenuItem>
              <MenuItem value="inactive">ปิดใช้งาน</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRoomDialog(false)}>ยกเลิก</Button>
          <Button onClick={saveEditedRoom} color="primary" variant="contained">บันทึก</Button>
        </DialogActions>
      </Dialog>

      {/* Success Message Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Departments;

