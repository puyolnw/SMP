import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Tabs, 
  Tab, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
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
  Alert
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Business as BuildingIcon,
  Layers as FloorIcon,
  MeetingRoom as RoomIcon,
  LocalHospital as DepartmentIcon
} from '@mui/icons-material';
// import { usePageDebug } from '../../../hooks/usePageDebug';
// import { TableSchema } from '../../../types/Debug';
// import { DebugManager } from '../../../utils/Debuger';
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
}

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`facility-tabpanel-${index}`}
      aria-labelledby={`facility-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Departments: React.FC = () => {
  const navigate = useNavigate();
  // const debugManager = DebugManager.getInstance();
  
  // Define required tables for debug
  // const requiredTables: TableSchema[] = [
  //   {
  //     tableName: 'departments',
  //     columns: ['id', 'name', 'description', 'color', 'isActive'],
  //     description: 'แผนกต่างๆ ในโรงพยาบาล'
  //   },
  //   {
  //     tableName: 'buildings',
  //     columns: ['id', 'name', 'address', 'description', 'isActive'],
  //     description: 'อาคารต่างๆ ในโรงพยาบาล'
  //   },
  //   {
  //     tableName: 'floors',
  //     columns: ['id', 'buildingId', 'number', 'name', 'description', 'isActive'],
  //     description: 'ชั้นต่างๆ ในแต่ละอาคาร'
  //   },
  //   {
  //     tableName: 'rooms',
  //     columns: ['id', 'name', 'floorId', 'departmentId', 'capacity', 'description', 'isActive'],
  //     description: 'ห้องต่างๆ ในแต่ละชั้น'
  //   }
  // ];
  
  // Use debug hook
  // const { debugData, refreshData } = usePageDebug('จัดการแผนกและสถานที่', requiredTables);
  
  // State for tab selection
  const [tabValue, setTabValue] = useState(0);
  
  // States for data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  // States for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: string, id: string}>({type: '', id: ''});
  
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
  
  // Load data from debug storage
  useEffect(() => {
    const loadData = async () => {
      setDepartments(await getWorkplaceItems<Department>('department'));
      setBuildings(await getWorkplaceItems<Building>('building'));
      setFloors(await getWorkplaceItems<Floor>('floor'));
      setRooms(await getWorkplaceItems<Room>('room'));
    };
    loadData();
  }, []);
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
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
          setEditedRoom(room);
          setEditRoomDialog(true);
        }
        break;
      }
    }
  };
  
  // Handle delete item
  const handleDelete = (type: string, id: string) => {
    setItemToDelete({ type, id });
    setDeleteDialogOpen(true);
  };
  
  // Confirm delete
  const confirmDelete = async () => {
    const { type, id } = itemToDelete;
    await deleteWorkplaceItem(type, id);
    // reload data
    setDepartments(await getWorkplaceItems<Department>('department'));
    setBuildings(await getWorkplaceItems<Building>('building'));
    setFloors(await getWorkplaceItems<Floor>('floor'));
    setRooms(await getWorkplaceItems<Room>('room'));
    setSuccessMessage('ลบข้อมูลสำเร็จ');
    setDeleteDialogOpen(false);
  };
  
  // Save edited department
  const saveEditedDepartment = async () => {
    if (editedDepartment) {
      await editWorkplaceItem('department', editedDepartment.id, editedDepartment);
      setDepartments(await getWorkplaceItems<Department>('department'));
      setEditDepartmentDialog(false);
      setEditedDepartment(null);
      setSuccessMessage('แก้ไขข้อมูลสำเร็จ');
    }
  };
  
  // Save edited building
  const saveEditedBuilding = async () => {
    if (editedBuilding) {
      await editWorkplaceItem('building', editedBuilding.id, editedBuilding);
      setBuildings(await getWorkplaceItems<Building>('building'));
      setEditBuildingDialog(false);
      setEditedBuilding(null);
      setSuccessMessage('แก้ไขข้อมูลสำเร็จ');
    }
  };
  
  // Save edited floor
  const saveEditedFloor = async () => {
    if (editedFloor) {
      await editWorkplaceItem('floor', editedFloor.id, editedFloor);
      setFloors(await getWorkplaceItems<Floor>('floor'));
      setEditFloorDialog(false);
      setEditedFloor(null);
      setSuccessMessage('แก้ไขข้อมูลสำเร็จ');
    }
  };
  
  // Save edited room
  const saveEditedRoom = async () => {
    if (editedRoom) {
      await editWorkplaceItem('room', editedRoom.id, editedRoom);
      setRooms(await getWorkplaceItems<Room>('room'));
      setEditRoomDialog(false);
      setEditedRoom(null);
      setSuccessMessage('แก้ไขข้อมูลสำเร็จ');
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
  
  // Helper function to get building and floor name for a room
  const getRoomLocation = (floorId: string) => {
    const floor = floors.find(f => f.id === floorId);
    if (!floor) return 'ไม่ระบุ';
    
    const building = buildings.find(b => b.id === floor.buildingId);
    return `${building?.name || 'ไม่ระบุ'} ชั้น ${floor.number} (${floor.name})`;
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          จัดการแผนกและสถานที่
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          จัดการข้อมูลแผนก อาคาร ชั้น และห้องตรวจรักษาในโรงพยาบาล
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="facility management tabs">
            <Tab icon={<DepartmentIcon />} label="แผนก" />
            <Tab icon={<BuildingIcon />} label="อาคาร" />
            <Tab icon={<FloorIcon />} label="ชั้น" />
            <Tab icon={<RoomIcon />} label="ห้องตรวจ" />
          </Tabs>
        </Box>
        
        {/* Departments Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => handleAddNew('department')}
            >
              เพิ่มแผนกใหม่
            </Button>
          </Box>
          
          <TableContainer>
            <Table>
                              <TableHead>
                  <TableRow>
                    <TableCell>รหัส</TableCell>
                    <TableCell>ชื่อแผนก</TableCell>
                    <TableCell>รายละเอียด</TableCell>
                    <TableCell>สี</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell>จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">ไม่พบข้อมูลแผนก</TableCell>
                    </TableRow>
                  ) : (
                    departments.map((department) => (
                      <TableRow key={department.id}>
                        <TableCell>{department.id}</TableCell>
                        <TableCell>{department.name}</TableCell>
                        <TableCell>{department.description || '-'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box 
                              sx={{ 
                                width: 16, 
                                height: 16, 
                                borderRadius: '50%', 
                                bgcolor: department.color || '#ccc',
                                mr: 1,
                                border: '1px solid #ccc'
                              }} 
                            />
                            {department.color || '-'}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={department.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} 
                            color={department.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
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
                            onClick={() => handleDelete('department', department.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
          
          {/* Buildings Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => handleAddNew('building')}
              >
                เพิ่มอาคารใหม่
              </Button>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>รหัส</TableCell>
                    <TableCell>ชื่ออาคาร</TableCell>
                    <TableCell>ที่อยู่</TableCell>
                    <TableCell>รายละเอียด</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell>จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {buildings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">ไม่พบข้อมูลอาคาร</TableCell>
                    </TableRow>
                  ) : (
                    buildings.map((building) => (
                      <TableRow key={building.id}>
                        <TableCell>{building.id}</TableCell>
                        <TableCell>{building.name}</TableCell>
                        <TableCell>{building.address || '-'}</TableCell>
                        <TableCell>{building.description || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={building.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} 
                            color={building.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
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
                            onClick={() => handleDelete('building', building.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
          
          {/* Floors Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => handleAddNew('floor')}
                disabled={buildings.length === 0}
              >
                เพิ่มชั้นใหม่
              </Button>
            </Box>
            
            {buildings.length === 0 && (
              <Box sx={{ textAlign: 'center', my: 3 }}>
                <Typography color="text.secondary">
                  กรุณาเพิ่มอาคารก่อนเพิ่มชั้น
                </Typography>
              </Box>
            )}
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>รหัส</TableCell>
                    <TableCell>อาคาร</TableCell>
                    <TableCell>ชั้น</TableCell>
                    <TableCell>ชื่อชั้น</TableCell>
                    <TableCell>รายละเอียด</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell>จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {floors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">ไม่พบข้อมูลชั้น</TableCell>
                    </TableRow>
                  ) : (
                    floors.map((floor) => (
                      <TableRow key={floor.id}>
                        <TableCell>{floor.id}</TableCell>
                        <TableCell>{getBuildingName(floor.buildingId)}</TableCell>
                        <TableCell>{floor.number}</TableCell>
                        <TableCell>{floor.name}</TableCell>
                        <TableCell>{floor.description || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={floor.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} 
                            color={floor.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
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
                            onClick={() => handleDelete('floor', floor.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
          
          {/* Rooms Tab */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => handleAddNew('room')}
                disabled={departments.length === 0 || floors.length === 0}
              >
                เพิ่มห้องใหม่
              </Button>
            </Box>
            
            {(departments.length === 0 || floors.length === 0) && (
              <Box sx={{ textAlign: 'center', my: 3 }}>
                <Typography color="text.secondary">
                  กรุณาเพิ่มแผนกและชั้นก่อนเพิ่มห้อง
                </Typography>
              </Box>
            )}
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>รหัส</TableCell>
                    <TableCell>ชื่อห้อง</TableCell>
                    <TableCell>แผนก</TableCell>
                    <TableCell>ตำแหน่ง</TableCell>
                    <TableCell>ความจุ</TableCell>
                    <TableCell>รายละเอียด</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell>จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rooms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">ไม่พบข้อมูลห้อง</TableCell>
                    </TableRow>
                  ) : (
                    rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell>{room.id}</TableCell>
                        <TableCell>{room.name}</TableCell>
                        <TableCell>{getDepartmentName(room.departmentId)}</TableCell>
                        <TableCell>{getRoomLocation(room.floorId)}</TableCell>
                        <TableCell>{room.capacity || '-'}</TableCell>
                        <TableCell>{room.description || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={room.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} 
                            color={room.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
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
                            onClick={() => handleDelete('room', room.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
      </Paper>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <DialogContentText>
            คุณต้องการลบรายการนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
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
                  {department.name}
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
        autoHideDuration={2500}
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

