import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { usePageDebug } from '../../../../hooks/usePageDebug';
import { TableSchema } from '../../../../types/Debug';
import { DebugManager } from '../../../../utils/Debuger';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Avatar,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Security as SecurityIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Schedule as ScheduleIcon,
  MedicalServices as MedicalIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AccountCircle as AccountIcon
} from '@mui/icons-material';
import axios from 'axios';

interface Employee {
  id: string;
  prefix: string;
  firstNameTh: string;
  lastNameTh: string;
  gender: string;
  phone: string;
  nationalId: string;
  profileImage?: string;
  employeeType: 'doctor' | 'nurse' | 'staff';
  departmentId: string;
  position: string;
  licenseNumber?: string;
  specialties?: string[];
  startDate: string;
  status: 'active' | 'inactive' | 'leave';
  username: string;
  password: string;
  role: 'admin' | 'doctor' | 'nurse' | 'staff';
  email?: string;
  address?: string;
  workingDays?: string[];
  workingHours?: {
    start: string;
    end: string;
  };
}

interface Department {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
}

const DataEmployee: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const debugManager = DebugManager.getInstance();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  // Debug setup
  const requiredTables: TableSchema[] = [
    {
      tableName: 'employees',
      columns: ['id', 'prefix', 'firstNameTh', 'lastNameTh', 'gender', 'phone', 'nationalId', 'profileImage', 'employeeType', 'departmentId', 'position', 'licenseNumber', 'specialties', 'startDate', 'status', 'username', 'password', 'role', 'email', 'address', 'workingDays', 'workingHours'],
      description: 'ข้อมูลพนักงานทั้งหมด'
    },
    {
      tableName: 'departments',
      columns: ['id', 'name', 'description', 'color', 'isActive'],
      description: 'แผนกต่างๆ ในโรงพยาบาล'
    }
  ];

  usePageDebug('ข้อมูลพนักงาน', requiredTables);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const loadEmployeeData = async () => {
      try {
        setIsLoading(true);
        let employeeId = id;
        // ถ้า location.state มี employee ให้ใช้เลย
        let stateEmployee = location.state?.employee;
        if (stateEmployee) {
          setEmployee(stateEmployee);
          // ดึง department จาก backend
          const deptRes = await axios.get(`${API_BASE_URL}/api/workplace/department`);
          const foundDept = deptRes.data.find((d: any) => d.id === stateEmployee.departmentId);
          setDepartment(foundDept || null);
          setIsLoading(false);
          return;
        }
        // ถ้ามี id ใน url ให้ดึงจาก backend
        if (employeeId) {
          const empRes = await axios.get(`${API_BASE_URL}/api/worker/${employeeId}`);
          setEmployee(empRes.data);
          // ดึง department จาก backend
          const deptRes = await axios.get(`${API_BASE_URL}/api/workplace/department`);
          const foundDept = deptRes.data.find((d: any) => d.id === empRes.data.departmentId);
          setDepartment(foundDept || null);
        } else {
          setEmployee(null);
        }
        setIsLoading(false);
      } catch (error) {
        setEmployee(null);
        setIsLoading(false);
      }
    };
    loadEmployeeData();
  }, [id, location.state]);

  const handleEdit = () => {
    navigate('/member/employee/addemployee', {
      state: {
        isEdit: true,
        employee: employee
      }
    });
  };

  const handleDelete = async () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (employee) {
      try {
        await axios.delete(`${API_BASE_URL}/api/worker/${employee.id}`);
        setSuccess(true);
        setDeleteDialogOpen(false);
        setTimeout(() => {
          navigate('/member/employee/searchemployee');
        }, 2000);
      } catch (error) {
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'leave': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'ทำงานปกติ';
      case 'inactive': return 'พักงาน';
      case 'leave': return 'ลาออก';
      default: return 'ไม่ระบุ';
    }
  };

  const getEmployeeTypeText = (type: string) => {
    switch (type) {
      case 'doctor': return 'แพทย์';
      case 'nurse': return 'พยาบาล';
      case 'staff': return 'เจ้าหน้าที่';
      default: return 'ไม่ระบุ';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'doctor': return 'แพทย์';
      case 'nurse': return 'พยาบาล';
      case 'staff': return 'เจ้าหน้าที่';
      default: return 'ไม่ระบุ';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Typography>กำลังโหลดข้อมูล...</Typography>
      </Box>
    );
  }

  if (!employee) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            ไม่พบข้อมูลพนักงาน
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            ไม่สามารถค้นหาข้อมูลพนักงานที่ระบุได้
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/member/employee/searchemployee')}
          >
            กลับไปหน้าค้นหา
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          ลบข้อมูลพนักงานเรียบร้อยแล้ว กำลังกลับไปหน้าค้นหา...
        </Alert>
      )}

      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              onClick={() => navigate('/member/employee/searchemployee')}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Avatar
              src={employee.profileImage || undefined}
              sx={{ width: 80, height: 80, mr: 3, border: '2px solid #e0e0e0' }}
            />
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {employee.prefix} {employee.firstNameTh} {employee.lastNameTh}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Chip 
                  label={getEmployeeTypeText(employee.employeeType)} 
                  color="primary" 
                  size="small"
                />
                <Chip 
                  label={getStatusText(employee.status)} 
                  color={getStatusColor(employee.status) as any}
                  size="small"
                />
              </Box>
              <Typography variant="body1" color="text.secondary">
                {employee.position} • {department?.name || 'ไม่ระบุแผนก'}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="แก้ไขข้อมูล">
              <IconButton color="primary" onClick={handleEdit}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="ลบข้อมูล">
              <IconButton color="error" onClick={handleDelete}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* ข้อมูลส่วนตัว */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  ข้อมูลส่วนตัว
                </Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <BadgeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="รหัสพนักงาน" 
                    secondary={employee.id}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="เพศ" 
                    secondary={employee.gender}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="เบอร์โทรศัพท์" 
                    secondary={employee.phone}
                  />
                </ListItem>
                {employee.email && (
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="อีเมล" 
                      secondary={employee.email}
                    />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemIcon>
                    <BadgeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="หมายเลขบัตรประชาชน" 
                    secondary={employee.nationalId}
                  />
                </ListItem>
                {employee.address && (
                  <ListItem>
                    <ListItemIcon>
                      <LocationIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="ที่อยู่" 
                      secondary={employee.address}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* ข้อมูลการทำงาน */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WorkIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  ข้อมูลการทำงาน
                </Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <WorkIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="ประเภทพนักงาน" 
                    secondary={getEmployeeTypeText(employee.employeeType)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <MedicalIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="แผนก" 
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {department?.color && (
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              bgcolor: department.color,
                              mr: 1
                            }} 
                          />
                        )}
                        {department?.name || 'ไม่ระบุ'}
                      </Box>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <BadgeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="ตำแหน่ง" 
                    secondary={employee.position}
                  />
                </ListItem>
                {employee.licenseNumber && (
                  <ListItem>
                    <ListItemIcon>
                      <MedicalIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="เลขที่ใบอนุญาต" 
                      secondary={employee.licenseNumber}
                    />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemIcon>
                    <CalendarIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="วันที่เริ่มงาน" 
                    secondary={new Date(employee.startDate).toLocaleDateString('th-TH')}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* ข้อมูลระบบ */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  ข้อมูลระบบ
                </Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <AccountIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="ชื่อผู้ใช้" 
                    secondary={employee.username}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="บทบาทในระบบ" 
                    secondary={getRoleText(employee.role)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <BadgeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="สถานะการทำงาน" 
                    secondary={
                      <Chip 
                        label={getStatusText(employee.status)} 
                        color={getStatusColor(employee.status) as any}
                        size="small"
                      />
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* ความเชี่ยวชาญ (สำหรับแพทย์) */}
        {employee.employeeType === 'doctor' && employee.specialties && employee.specialties.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <MedicalIcon sx={{ mr: 1, color: 'primary.main' }} />
                                    <Typography variant="h6" fontWeight="bold">
                    ความเชี่ยวชาญพิเศษ
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {employee.specialties.map((specialty, index) => (
                    <Chip
                      key={index}
                      label={specialty}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* ตารางการทำงาน */}
        {employee.workingDays && employee.workingDays.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    ตารางการทำงาน
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      วันทำงาน:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {employee.workingDays.map((day, index) => (
                        <Chip
                          key={index}
                          label={day}
                          color="primary"
                          variant="filled"
                          size="small"
                        />
                      ))}
                    </Box>
                  </Grid>
                  {employee.workingHours && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        เวลาทำงาน:
                      </Typography>
                      <Typography variant="body1">
                        {employee.workingHours.start} - {employee.workingHours.end} น.
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/member/employee/searchemployee')}
          size="large"
        >
          กลับไปหน้าค้นหา
        </Button>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={handleEdit}
          size="large"
        >
          แก้ไขข้อมูล
        </Button>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          ยืนยันการลบข้อมูล
        </DialogTitle>
        <DialogContent>
          <Typography>
            คุณต้องการลบข้อมูลพนักงาน "{employee.prefix} {employee.firstNameTh} {employee.lastNameTh}" ใช่หรือไม่?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
          >
            ยกเลิก
          </Button>
          <Button 
            onClick={confirmDelete}
            color="error"
            variant="contained"
          >
            ลบข้อมูล
          </Button>
        </DialogActions>
      </Dialog>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mt: 4, pt: 3, borderTop: '1px dashed #ccc' }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Debug Info (Development Only)
          </Typography>
          <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, maxHeight: 300, overflow: 'auto' }}>
            <pre style={{ margin: 0, fontSize: '0.75rem' }}>
              {JSON.stringify({
                employee,
                department
              }, null, 2)}
            </pre>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DataEmployee;

