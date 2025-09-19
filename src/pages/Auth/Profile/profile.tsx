import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Grid,
  Paper,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Work as WorkIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocalHospital as HospitalIcon,
  Logout as LogoutIcon,
  Lock as LockIcon,
  Badge as BadgeIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  MedicalServices as MedicalIcon,
  Home as HomeIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

interface User {
  _id: string;
  username: string;
  role: string;
  fullname?: string[];
  national_id?: string;
  phone?: string;
  email?: string;
  specialization?: string[];
  perfession_type?: string;
  emt_status?: string;
  department?: string;
  position?: string;
  // เพิ่มฟิลด์ใหม่ตาม DataEmployee
  id?: string;
  prefix?: string;
  firstNameTh?: string;
  lastNameTh?: string;
  gender?: string;
  nationalId?: string;
  profileImage?: string;
  employeeType?: 'doctor' | 'nurse' | 'staff';
  departmentId?: string;
  licenseNumber?: string;
  specialties?: string[];
  startDate?: string;
  status?: 'active' | 'inactive' | 'leave';
  address?: string;
  workingDays?: string[];
  workingHours?: {
    start: string;
    end: string;
  };
  regis_date?: string;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<User>>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('userData');
      
      if (!token || !userData) {
        navigate('/auth/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      const userId = id || parsedUser._id; // ใช้ id จาก URL หรือจาก localStorage
      
      // ดึงข้อมูลผู้ใช้จาก API
      const response = await axios.get(
        `${API_BASE_URL}/api/doctor/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data) {
        setUser(response.data);
        setEditData(response.data);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth/login');
  };

  const handleEditProfile = () => {
    setError('');
    setSuccessMessage('');
    setEditDialogOpen(true);
  };

  const handleChangePassword = () => {
    setError('');
    setSuccessMessage('');
    setPasswordDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    setUpdateLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.put(
        `${API_BASE_URL}/api/doctor/${user?._id}`,
        editData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data) {
        // อัปเดต user state ด้วยข้อมูลใหม่
        const updatedUser = { ...user, ...editData } as User;
        setUser(updatedUser);
        setEditDialogOpen(false);
        setSuccessMessage('อัพเดทข้อมูลสำเร็จ');
        
        // รีเฟรชข้อมูลจาก API
        setTimeout(() => {
          loadUserProfile();
        }, 500);
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      if (err.response?.status === 404) {
        setError('ไม่พบข้อมูลผู้ใช้ที่ต้องการแก้ไข');
      } else {
        setError(err.response?.data?.error || 'ไม่สามารถอัพเดทข้อมูลได้');
      }
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    setUpdateLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `${API_BASE_URL}/api/doctor/${user?._id}/password`,
        {
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setPasswordDialogOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccessMessage('เปลี่ยนรหัสผ่านสำเร็จ');
    } catch (err: any) {
      console.error('Error updating password:', err);
      if (err.response?.status === 404) {
        setError('ไม่พบข้อมูลผู้ใช้');
      } else {
        setError(err.response?.data?.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
      }
    } finally {
      setUpdateLoading(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'doctor': return 'แพทย์';
      case 'nurse': return 'พยาบาล';
      case 'admin': return 'ผู้ดูแลระบบ';
      default: return role;
    }
  };

  const getDisplayName = (fullname?: string[]) => {
    if (fullname && fullname.length > 0) {
      return fullname.join(' ');
    }
    // ใช้ข้อมูลจาก employee format หากมี
    if (user?.firstNameTh || user?.lastNameTh) {
      return `${user.prefix || ''} ${user.firstNameTh || ''} ${user.lastNameTh || ''}`.trim();
    }
    return user?.username || 'ไม่ระบุชื่อ';
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'leave': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active': return 'ทำงานปกติ';
      case 'inactive': return 'พักงาน';
      case 'leave': return 'ลาออก';
      default: return 'ไม่ระบุ';
    }
  };

  const getEmployeeTypeText = (type?: string) => {
    switch (type) {
      case 'doctor': return 'แพทย์';
      case 'nurse': return 'พยาบาล';
      case 'staff': return 'เจ้าหน้าที่';
      default: return 'ไม่ระบุ';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">ไม่พบข้อมูลผู้ใช้</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} md={8} lg={6}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              โปรไฟล์ผู้ใช้
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ID: {user._id}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          {/* Profile Card */}
          <Card elevation={3} sx={{ mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              {/* Profile Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar 
                  src={user.profileImage || undefined}
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    mr: 3,
                    bgcolor: user.role === 'doctor' ? 'primary.main' : 'secondary.main',
                    border: '2px solid #e0e0e0'
                  }}
                >
                  {user.role === 'doctor' ? <HospitalIcon sx={{ fontSize: 40 }} /> : <PersonIcon sx={{ fontSize: 40 }} />}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {getDisplayName(user.fullname)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Chip 
                      label={getRoleDisplayName(user.role)} 
                      color={user.role === 'doctor' ? 'primary' : 'secondary'}
                      size="small"
                    />
                    {user.status && (
                      <Chip 
                        label={getStatusText(user.status)} 
                        color={getStatusColor(user.status) as any}
                        size="small"
                      />
                    )}
                  </Box>
                  <Typography variant="body1" color="text.secondary">
                    {user.position || user.perfession_type} • {user.department || 'ไม่ระบุแผนก'}
                  </Typography>
                  {user.specialization && user.specialization.length > 0 && (
                    <Chip 
                      label={user.specialization[0]} 
                      variant="outlined"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleEditProfile}
                  >
                    แก้ไขข้อมูล
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<LockIcon />}
                    onClick={handleChangePassword}
                  >
                    เปลี่ยนรหัสผ่าน
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Profile Details */}
              <Grid container spacing={3}>
                {/* ข้อมูลส่วนตัว */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                    ข้อมูลส่วนตัว
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <BadgeIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="รหัสพนักงาน" 
                        secondary={user.id || user._id}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <AssignmentIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="ชื่อผู้ใช้" 
                        secondary={user.username}
                      />
                    </ListItem>
                    {user.gender && (
                      <ListItem>
                        <ListItemIcon>
                          <PersonIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="เพศ" 
                          secondary={user.gender}
                        />
                      </ListItem>
                    )}
                    <ListItem>
                      <ListItemIcon>
                        <PhoneIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="เบอร์โทรศัพท์" 
                        secondary={user.phone || 'ไม่ระบุ'}
                      />
                    </ListItem>
                    {user.email && (
                      <ListItem>
                        <ListItemIcon>
                          <EmailIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="อีเมล" 
                          secondary={user.email}
                        />
                      </ListItem>
                    )}
                    <ListItem>
                      <ListItemIcon>
                        <BadgeIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="หมายเลขบัตรประชาชน" 
                        secondary={user.national_id || user.nationalId || 'ไม่ระบุ'}
                      />
                    </ListItem>
                    {user.address && (
                      <ListItem>
                        <ListItemIcon>
                          <HomeIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="ที่อยู่" 
                          secondary={user.address}
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>

                {/* ข้อมูลการทำงาน */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <WorkIcon sx={{ mr: 1, color: 'primary.main' }} />
                    ข้อมูลการทำงาน
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <WorkIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="ประเภทพนักงาน" 
                        secondary={getEmployeeTypeText(user.employeeType) || getRoleDisplayName(user.role)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <MedicalIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="แผนก" 
                        secondary={user.department || 'ไม่ระบุ'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <AssignmentIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="ตำแหน่ง" 
                        secondary={user.position || user.perfession_type || 'ไม่ระบุ'}
                      />
                    </ListItem>
                    {user.licenseNumber && (
                      <ListItem>
                        <ListItemIcon>
                          <BadgeIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="หมายเลขใบประกอบวิชาชีพ" 
                          secondary={user.licenseNumber}
                        />
                      </ListItem>
                    )}
                    {(user.startDate || user.regis_date) && (
                      <ListItem>
                        <ListItemIcon>
                          <ScheduleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="วันที่เริ่มงาน" 
                          secondary={user.startDate || user.regis_date ? 
                            new Date(user.startDate || user.regis_date || '').toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>

                {/* ข้อมูลระบบ */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                    ข้อมูลระบบ
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <AssignmentIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="บทบาทในระบบ" 
                        secondary={getRoleDisplayName(user.role)}
                      />
                    </ListItem>
                    {user.status && (
                      <ListItem>
                        <ListItemIcon>
                          <SecurityIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="สถานะการทำงาน" 
                          secondary={
                            <Chip 
                              label={getStatusText(user.status)} 
                              color={getStatusColor(user.status) as any}
                              size="small"
                            />
                          }
                        />
                      </ListItem>
                    )}
                    {user.emt_status && (
                      <ListItem>
                        <ListItemIcon>
                          <MedicalIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="สถานะ EMT" 
                          secondary={user.emt_status}
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>

                {/* ความเชี่ยวชาญ (สำหรับแพทย์) */}
                {(user.role === 'doctor' && (user.specialization || user.specialties)) && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <MedicalIcon sx={{ mr: 1, color: 'primary.main' }} />
                      ความเชี่ยวชาญ
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {(user.specialization || user.specialties || []).map((spec, index) => (
                        <Chip 
                          key={index} 
                          label={spec} 
                          variant="outlined" 
                          size="small"
                        />
                      ))}
                    </Box>
                  </Grid>
                )}

                {/* ตารางการทำงาน */}
                {user.workingDays && user.workingDays.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
                      ตารางการทำงาน
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">วันทำงาน</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {user.workingDays.map((day, index) => (
                            <Chip key={index} label={day} size="small" />
                          ))}
                        </Box>
                      </Grid>
                      {user.workingHours && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">เวลาทำงาน</Typography>
                          <Typography variant="body1">
                            {user.workingHours.start} - {user.workingHours.end}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              การดำเนินการ
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate('/')}
                >
                  กลับไปหน้าหลัก
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEditProfile}
                >
                  แก้ไขข้อมูล
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<LockIcon />}
                  onClick={handleChangePassword}
                >
                  เปลี่ยนรหัสผ่าน
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<LogoutIcon />}
                  onClick={handleLogout}
                >
                  ออกจากระบบ
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>แก้ไขข้อมูลโปรไฟล์</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="เบอร์โทรศัพท์"
                value={editData.phone || ''}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="อีเมล"
                type="email"
                value={editData.email || ''}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ที่อยู่"
                multiline
                rows={2}
                value={editData.address || ''}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
              />
            </Grid>
            {(user.role === 'doctor' || user.role === 'nurse') && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="ประเภทอาชีพ"
                    value={editData.perfession_type || ''}
                    onChange={(e) => setEditData({ ...editData, perfession_type: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="สถานะ EMT"
                    value={editData.emt_status || ''}
                    onChange={(e) => setEditData({ ...editData, emt_status: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="หมายเลขใบประกอบวิชาชีพ"
                    value={editData.licenseNumber || ''}
                    onChange={(e) => setEditData({ ...editData, licenseNumber: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="ความเชี่ยวชาญ (คั่นด้วยเครื่องหมายจุลภาค)"
                    value={(editData.specialization || editData.specialties || []).join(', ')}
                    onChange={(e) => {
                      const specs = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                      setEditData({ 
                        ...editData, 
                        specialization: specs,
                        specialties: specs 
                      });
                    }}
                    helperText="ตัวอย่าง: อายุรกรรม, โรคหัวใจ, อายุรกรรมทั่วไป"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>ยกเลิก</Button>
          <Button 
            onClick={handleSaveProfile} 
            variant="contained"
            disabled={updateLoading}
          >
            {updateLoading ? <CircularProgress size={20} /> : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>เปลี่ยนรหัสผ่าน</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="รหัสผ่านปัจจุบัน"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="รหัสผ่านใหม่"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="ยืนยันรหัสผ่านใหม่"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>ยกเลิก</Button>
          <Button 
            onClick={handleSavePassword} 
            variant="contained"
            disabled={updateLoading}
          >
            {updateLoading ? <CircularProgress size={20} /> : 'เปลี่ยนรหัสผ่าน'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;