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
  ListItemText,
  Container
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
  departmentDetails?: {
    id: string;
    name: string;
    description?: string;
  };
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

  // Mock data สำหรับ user ตัวอย่าง (สำหรับการทำงานแบบออฟไลน์)
  const MOCK_USER_DATA = {
    'mock_admin_001': {
      _id: 'mock_admin_001',
      username: 'testadmin',
      role: 'admin',
      fullname: ['นาย', 'ผู้ดูแล', 'ระบบ'],
      prefix: 'นาย',
      firstNameTh: 'ผู้ดูแล',
      lastNameTh: 'ระบบ',
      national_id: '1234567890123',
      nationalId: '1234567890123',
      phone: '0812345678',
      email: 'admin@hospital.com',
      gender: 'ชาย',
      address: '123 ถนนสุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพมหานคร 10110',
      position: 'ผู้ดูแลระบบ',
      perfession_type: 'ผู้ดูแลระบบ',
      department: 'IT Department',
      departmentId: 'dept_001',
      departmentDetails: {
        id: 'dept_001',
        name: 'IT Department',
        description: 'แผนกเทคโนโลยีสารสนเทศ'
      },
      employeeType: 'staff' as const,
      status: 'active' as const,
      startDate: '2023-01-01',
      regis_date: '2023-01-01',
      workingDays: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'],
      workingHours: {
        start: '08:00',
        end: '17:00'
      }
    },
    'mock_doctor_001': {
      _id: 'mock_doctor_001',
      username: 'testdoctor',
      role: 'doctor',
      fullname: ['นพ.', 'แพทย์', 'ตัวอย่าง'],
      prefix: 'นพ.',
      firstNameTh: 'แพทย์',
      lastNameTh: 'ตัวอย่าง',
      national_id: '2345678901234',
      nationalId: '2345678901234',
      phone: '0823456789',
      email: 'doctor@hospital.com',
      gender: 'ชาย',
      address: '456 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร 10900',
      position: 'แพทย์ผู้เชี่ยวชาญ',
      perfession_type: 'แพทย์',
      department: 'Internal Medicine',
      departmentId: 'dept_002',
      departmentDetails: {
        id: 'dept_002',
        name: 'Internal Medicine',
        description: 'แผนกอายุรกรรม'
      },
      employeeType: 'doctor' as const,
      status: 'active' as const,
      startDate: '2022-06-01',
      regis_date: '2022-06-01',
      licenseNumber: 'MD123456',
      specialization: ['อายุรกรรม', 'โรคหัวใจ', 'โรคเบาหวาน'],
      specialties: ['อายุรกรรม', 'โรคหัวใจ', 'โรคเบาหวาน'],
      emt_status: 'Active',
      workingDays: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'],
      workingHours: {
        start: '08:00',
        end: '16:00'
      }
    },
    'mock_nurse_001': {
      _id: 'mock_nurse_001',
      username: 'testnurse',
      role: 'nurse',
      fullname: ['นาง', 'พยาบาล', 'ตัวอย่าง'],
      prefix: 'นาง',
      firstNameTh: 'พยาบาล',
      lastNameTh: 'ตัวอย่าง',
      national_id: '3456789012345',
      nationalId: '3456789012345',
      phone: '0834567890',
      email: 'nurse@hospital.com',
      gender: 'หญิง',
      address: '789 ถนนรัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
      position: 'พยาบาลวิชาชีพ',
      perfession_type: 'พยาบาล',
      department: 'Emergency Room',
      departmentId: 'dept_003',
      departmentDetails: {
        id: 'dept_003',
        name: 'Emergency Room',
        description: 'แผนกฉุกเฉิน'
      },
      employeeType: 'nurse' as const,
      status: 'active' as const,
      startDate: '2022-03-15',
      regis_date: '2022-03-15',
      licenseNumber: 'RN789012',
      specialization: ['การพยาบาลฉุกเฉิน', 'การพยาบาลผู้ป่วยวิกฤต'],
      specialties: ['การพยาบาลฉุกเฉิน', 'การพยาบาลผู้ป่วยวิกฤต'],
      emt_status: 'Active',
      workingDays: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'],
      workingHours: {
        start: '07:00',
        end: '19:00'
      }
    }
  };

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
      
      // ตรวจสอบ mock users ก่อน (สำหรับการทำงานแบบออฟไลน์)
      if (MOCK_USER_DATA[userId as keyof typeof MOCK_USER_DATA]) {
        const mockUserData = MOCK_USER_DATA[userId as keyof typeof MOCK_USER_DATA];
        console.log('Loading mock user data:', mockUserData);
        setUser(mockUserData as User);
        setEditData(mockUserData as Partial<User>);
        setLoading(false);
        return;
      }

      // ถ้าไม่ใช่ mock user ให้ลองเชื่อมต่อกับ backend
      const response = await axios.get(
        `${API_BASE_URL}/api/doctor/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data) {
        const userData = response.data;
        
        // ถ้ามี departmentId ให้ดึงข้อมูล department จาก workplace API
        if (userData.departmentId) {
          try {
            const deptResponse = await axios.get(
              `${API_BASE_URL}/api/workplace/department`,
              {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            );
            
            // หา department ที่ตรงกับ departmentId
            const departments = deptResponse.data || [];
            const department = departments.find((dept: any) => dept.id === userData.departmentId);
            
            if (department) {
              userData.departmentDetails = {
                id: department.id,
                name: department.name,
                description: department.description
              };
            } else {
              // ลบข้อมูล department เก่าออก
              delete userData.department;
            }
          } catch (deptError) {
            console.error('Error loading department:', deptError);
          }
        }
        
        setUser(userData);
        setEditData(userData);
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
      // ตรวจสอบ mock users ก่อน
      if (user?._id && MOCK_USER_DATA[user._id as keyof typeof MOCK_USER_DATA]) {
        // สำหรับ mock users ให้อัปเดตข้อมูลใน state เท่านั้น
        const updatedUser = { ...user, ...editData } as User;
        setUser(updatedUser);
        setEditDialogOpen(false);
        setSuccessMessage('อัพเดทข้อมูลสำเร็จ (Mock Mode)');
        setUpdateLoading(false);
        return;
      }

      // ถ้าไม่ใช่ mock user ให้เชื่อมต่อกับ backend
      const token = localStorage.getItem('token');
      
        const response = await axios.put(
          `${API_BASE_URL}/api/doctor/${user?._id || ''}`,
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
      // ตรวจสอบ mock users ก่อน
      if (user?._id && MOCK_USER_DATA[user._id as keyof typeof MOCK_USER_DATA]) {
        // สำหรับ mock users ให้แสดงข้อความสำเร็จเท่านั้น
        setPasswordDialogOpen(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSuccessMessage('เปลี่ยนรหัสผ่านสำเร็จ (Mock Mode)');
        setUpdateLoading(false);
        return;
      }

      // ถ้าไม่ใช่ mock user ให้เชื่อมต่อกับ backend
      const token = localStorage.getItem('token');
      
        await axios.put(
          `${API_BASE_URL}/api/doctor/${user?._id || ''}/password`,
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
    <>
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'var(--bg-tertiary)', 
      p: 0,
      width: '100%'
    }}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 'bold',
              color: 'var(--primary-dark)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <PersonIcon sx={{ color: 'var(--accent-blue)' }} />
            โปรไฟล์ผู้ใช้
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            flexWrap: 'wrap'
          }}>
            <Chip 
              label={`ID: ${user._id}`}
              variant="outlined"
              size="small"
              sx={{ 
                bgcolor: 'var(--bg-primary)',
                borderColor: 'var(--border-light)'
              }}
            />
            <Chip 
              label={getRoleDisplayName(user.role)}
              color={user.role === 'doctor' ? 'primary' : user.role === 'nurse' ? 'secondary' : 'default'}
              size="small"
            />
          </Box>
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
        <Card 
          elevation={2} 
          sx={{ 
            mb: 3,
            bgcolor: 'var(--bg-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 2
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Profile Header */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 4,
              flexWrap: 'wrap',
              gap: 3
            }}>
              <Avatar 
                src={user.profileImage || undefined}
                sx={{ 
                  width: 100, 
                  height: 100, 
                  bgcolor: user.role === 'doctor' ? 'var(--accent-blue)' : 
                           user.role === 'nurse' ? 'var(--accent-green)' : 'var(--accent-pink)',
                  border: '3px solid var(--border-light)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {user.role === 'doctor' ? <HospitalIcon sx={{ fontSize: 50 }} /> : 
                 user.role === 'nurse' ? <MedicalIcon sx={{ fontSize: 50 }} /> : 
                 <PersonIcon sx={{ fontSize: 50 }} />}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <Typography 
                  variant="h4" 
                  component="h2" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'var(--primary-dark)',
                    mb: 2
                  }}
                >
                  {getDisplayName(user.fullname)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    label={getRoleDisplayName(user.role)} 
                    color={user.role === 'doctor' ? 'primary' : 'secondary'}
                    size="medium"
                    sx={{ fontWeight: 'bold' }}
                  />
                  {user.status && (
                    <Chip 
                      label={getStatusText(user.status)} 
                      color={getStatusColor(user.status) as any}
                      size="medium"
                    />
                  )}
                  {user.employeeType && (
                    <Chip 
                      label={getEmployeeTypeText(user.employeeType)}
                      variant="outlined"
                      size="medium"
                    />
                  )}
                </Box>
                <Typography 
                  variant="h6" 
                  color="var(--neutral-dark)"
                  sx={{ mb: 1 }}
                >
                  {user.position || user.perfession_type}
                </Typography>
                <Typography 
                  variant="body1" 
                  color="var(--neutral-main)"
                  sx={{ mb: 2 }}
                >
                  {user.departmentDetails?.name || 'ไม่ระบุแผนก'}
                </Typography>
                {user.specialization && user.specialization.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {user.specialization.slice(0, 3).map((spec, index) => (
                      <Chip 
                        key={index}
                        label={spec} 
                        variant="outlined"
                        size="small"
                        sx={{ 
                          bgcolor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-light)'
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'row', sm: 'column' }, 
                gap: 2,
                minWidth: 200
              }}>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={handleEditProfile}
                  sx={{
                    bgcolor: 'var(--accent-blue)',
                    '&:hover': {
                      bgcolor: 'var(--secondary-main)'
                    }
                  }}
                >
                  แก้ไขข้อมูล
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<LockIcon />}
                  onClick={handleChangePassword}
                  sx={{
                    borderColor: 'var(--border-dark)',
                    color: 'var(--primary-dark)',
                    '&:hover': {
                      borderColor: 'var(--accent-blue)',
                      bgcolor: 'var(--hover-overlay)'
                    }
                  }}
                >
                  เปลี่ยนรหัสผ่าน
                </Button>
              </Box>
            </Box>

            <Divider sx={{ mb: 4, borderColor: 'var(--border-light)' }} />

            {/* Profile Details */}
            <Grid container spacing={4}>
              {/* ข้อมูลส่วนตัว */}
              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={1}
                  sx={{ 
                    p: 3, 
                    bgcolor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 2
                  }}
                >
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      color: 'var(--primary-dark)',
                      fontWeight: 'bold',
                      mb: 3
                    }}
                  >
                    <PersonIcon sx={{ mr: 1, color: 'var(--accent-blue)' }} />
                    ข้อมูลส่วนตัว
                  </Typography>
                  <List dense>
                    <ListItem sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <BadgeIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="รหัสบุคลากร" 
                        secondary={user.id || user._id}
                        primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                        secondaryTypographyProps={{ color: 'var(--neutral-main)' }}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <AssignmentIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="ชื่อผู้ใช้" 
                        secondary={user.username}
                        primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                        secondaryTypographyProps={{ color: 'var(--neutral-main)' }}
                      />
                    </ListItem>
                    {user.gender && (
                      <ListItem sx={{ py: 1.5 }}>
                        <ListItemIcon>
                          <PersonIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                        </ListItemIcon>
                        <ListItemText 
                          primary="เพศ" 
                          secondary={user.gender}
                          primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                          secondaryTypographyProps={{ color: 'var(--neutral-main)' }}
                        />
                      </ListItem>
                    )}
                    <ListItem sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <PhoneIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="เบอร์โทรศัพท์" 
                        secondary={user.phone || 'ไม่ระบุ'}
                        primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                        secondaryTypographyProps={{ color: 'var(--neutral-main)' }}
                      />
                    </ListItem>
                    {user.email && (
                      <ListItem sx={{ py: 1.5 }}>
                        <ListItemIcon>
                          <EmailIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                        </ListItemIcon>
                        <ListItemText 
                          primary="อีเมล" 
                          secondary={user.email}
                          primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                          secondaryTypographyProps={{ color: 'var(--neutral-main)' }}
                        />
                      </ListItem>
                    )}
                    <ListItem sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <BadgeIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="หมายเลขบัตรประชาชน" 
                        secondary={user.national_id || user.nationalId || 'ไม่ระบุ'}
                        primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                        secondaryTypographyProps={{ color: 'var(--neutral-main)' }}
                      />
                    </ListItem>
                    {user.address && (
                      <ListItem sx={{ py: 1.5 }}>
                        <ListItemIcon>
                          <HomeIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                        </ListItemIcon>
                        <ListItemText 
                          primary="ที่อยู่" 
                          secondary={user.address}
                          primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                          secondaryTypographyProps={{ color: 'var(--neutral-main)' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Grid>

              {/* ข้อมูลการทำงาน */}
              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={1}
                  sx={{ 
                    p: 3, 
                    bgcolor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 2
                  }}
                >
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      color: 'var(--primary-dark)',
                      fontWeight: 'bold',
                      mb: 3
                    }}
                  >
                    <WorkIcon sx={{ mr: 1, color: 'var(--accent-blue)' }} />
                    ข้อมูลการทำงาน
                  </Typography>
                  <List dense>
                    <ListItem sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <WorkIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="ประเภทพนักงาน" 
                        secondary={getEmployeeTypeText(user.employeeType) || getRoleDisplayName(user.role)}
                        primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                        secondaryTypographyProps={{ color: 'var(--neutral-main)' }}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <MedicalIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="แผนก" 
                        secondary={
                          user.departmentDetails?.name ? (
                            <Box>
                              <Typography variant="body2" component="div" sx={{ color: 'var(--neutral-main)' }}>
                                {user.departmentDetails.name}
                              </Typography>
                              {user.departmentDetails?.description && (
                                <Typography variant="caption" sx={{ color: 'var(--neutral-light)' }}>
                                  {user.departmentDetails.description}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            'ไม่ระบุแผนก'
                          )
                        }
                        primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <AssignmentIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="ตำแหน่ง" 
                        secondary={user.position || user.perfession_type || 'ไม่ระบุ'}
                        primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                        secondaryTypographyProps={{ color: 'var(--neutral-main)' }}
                      />
                    </ListItem>
                    {user.licenseNumber && (
                      <ListItem sx={{ py: 1.5 }}>
                        <ListItemIcon>
                          <BadgeIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                        </ListItemIcon>
                        <ListItemText 
                          primary="หมายเลขใบประกอบวิชาชีพ" 
                          secondary={user.licenseNumber}
                          primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                          secondaryTypographyProps={{ color: 'var(--neutral-main)' }}
                        />
                      </ListItem>
                    )}
                    {(user.startDate || user.regis_date) && (
                      <ListItem sx={{ py: 1.5 }}>
                        <ListItemIcon>
                          <ScheduleIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                        </ListItemIcon>
                        <ListItemText 
                          primary="วันที่เริ่มงาน" 
                          secondary={user.startDate || user.regis_date ? 
                            new Date(user.startDate || user.regis_date || '').toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                          primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                          secondaryTypographyProps={{ color: 'var(--neutral-main)' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Grid>

              {/* ข้อมูลระบบ */}
              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={1}
                  sx={{ 
                    p: 3, 
                    bgcolor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 2
                  }}
                >
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      color: 'var(--primary-dark)',
                      fontWeight: 'bold',
                      mb: 3
                    }}
                  >
                    <SecurityIcon sx={{ mr: 1, color: 'var(--accent-blue)' }} />
                    ข้อมูลระบบ
                  </Typography>
                  <List dense>
                    <ListItem sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <AssignmentIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="บทบาทในระบบ" 
                        secondary={getRoleDisplayName(user.role)}
                        primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                        secondaryTypographyProps={{ color: 'var(--neutral-main)' }}
                      />
                    </ListItem>
                    {user.status && (
                      <ListItem sx={{ py: 1.5 }}>
                        <ListItemIcon>
                          <SecurityIcon fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
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
                          primaryTypographyProps={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Grid>

              {/* ความเชี่ยวชาญ (สำหรับแพทย์) */}
              {(user.role === 'doctor' && (user.specialization || user.specialties)) && (
                <Grid item xs={12} md={6}>
                  <Paper 
                    elevation={1}
                    sx={{ 
                      p: 3, 
                      bgcolor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 2
                    }}
                  >
                    <Typography 
                      variant="h6" 
                      gutterBottom 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: 'var(--primary-dark)',
                        fontWeight: 'bold',
                        mb: 3
                      }}
                    >
                      <MedicalIcon sx={{ mr: 1, color: 'var(--accent-blue)' }} />
                      ความเชี่ยวชาญ
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {(user.specialization || user.specialties || []).map((spec, index) => (
                        <Chip 
                          key={index} 
                          label={spec} 
                          variant="outlined" 
                          size="small"
                          sx={{ 
                            bgcolor: 'var(--bg-primary)',
                            borderColor: 'var(--border-light)'
                          }}
                        />
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              )}

              {/* ตารางการทำงาน */}
              {user.workingDays && user.workingDays.length > 0 && (
                <Grid item xs={12}>
                  <Paper 
                    elevation={1}
                    sx={{ 
                      p: 3, 
                      bgcolor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 2
                    }}
                  >
                    <Typography 
                      variant="h6" 
                      gutterBottom 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: 'var(--primary-dark)',
                        fontWeight: 'bold',
                        mb: 3
                      }}
                    >
                      <ScheduleIcon sx={{ mr: 1, color: 'var(--accent-blue)' }} />
                      ตารางการทำงาน
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" sx={{ color: 'var(--neutral-main)', mb: 1 }}>วันทำงาน</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {user.workingDays.map((day, index) => (
                            <Chip 
                              key={index} 
                              label={day} 
                              size="small"
                              sx={{ 
                                bgcolor: 'var(--bg-primary)',
                                borderColor: 'var(--border-light)'
                              }}
                            />
                          ))}
                        </Box>
                      </Grid>
                      {user.workingHours && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ color: 'var(--neutral-main)', mb: 1 }}>เวลาทำงาน</Typography>
                          <Typography variant="body1" sx={{ color: 'var(--primary-dark)', fontWeight: 'bold' }}>
                            {user.workingHours.start} - {user.workingHours.end}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            mb: 3,
            bgcolor: 'var(--bg-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 2
          }}
        >
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ 
              color: 'var(--primary-dark)',
              fontWeight: 'bold',
              mb: 3
            }}
          >
            การดำเนินการ
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/')}
                sx={{
                  borderColor: 'var(--border-dark)',
                  color: 'var(--primary-dark)',
                  '&:hover': {
                    borderColor: 'var(--accent-blue)',
                    bgcolor: 'var(--hover-overlay)'
                  }
                }}
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
                sx={{
                  borderColor: 'var(--border-dark)',
                  color: 'var(--primary-dark)',
                  '&:hover': {
                    borderColor: 'var(--accent-blue)',
                    bgcolor: 'var(--hover-overlay)'
                  }
                }}
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
                sx={{
                  borderColor: 'var(--border-dark)',
                  color: 'var(--primary-dark)',
                  '&:hover': {
                    borderColor: 'var(--accent-blue)',
                    bgcolor: 'var(--hover-overlay)'
                  }
                }}
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
                sx={{
                  borderColor: 'var(--error)',
                  color: 'var(--error)',
                  '&:hover': {
                    borderColor: 'var(--error)',
                    bgcolor: 'rgba(220, 53, 69, 0.1)'
                  }
                }}
              >
                ออกจากระบบ
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>

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
            {(user?.role === 'doctor' || user?.role === 'nurse') && (
              <>
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
    </>
  );
};

export default ProfilePage;