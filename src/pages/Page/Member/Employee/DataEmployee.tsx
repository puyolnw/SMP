import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DebugManager } from '../../../../utils/Debuger';
import { usePageDebug } from '../../../../hooks/usePageDebug';
import { TableSchema } from '../../../../types/Debug';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Divider,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Schedule as ScheduleIcon,
  LocalHospital as LocalHospitalIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';

interface Employee {
  id: string;
  // ข้อมูลส่วนตัว
  prefix: string;
  firstNameTh: string;
  lastNameTh: string;
  firstNameEn?: string;
  lastNameEn?: string;
  gender: string;
  birthDate: string;
  age: number;
  nationalId: string;
  address: {
    houseNumber: string;
    village?: string;
    street?: string;
    subDistrict: string;
    district: string;
    province: string;
    postalCode: string;
  };
  phone: string;
  email?: string;
  profileImage?: string;
  
  // ข้อมูลการทำงาน
  employeeType: 'doctor' | 'nurse' | 'staff';
  departmentId: string;
  position: string;
  specialties?: string[];
  licenseNumber?: string;
  education?: string[];
  startDate: string;
  status: 'active' | 'inactive' | 'leave';
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
  const location = useLocation();
  const navigate = useNavigate();
  const debugManager = DebugManager.getInstance();
  
  // รับข้อมูลพนักงานจาก state หรือ localStorage
  const employeeFromState = location.state?.employee as Employee | undefined;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [notFound, setNotFound] = useState(false);
  
  // Debug setup
  const requiredTables: TableSchema[] = [
    {
      tableName: 'employees',
      columns: ['id', 'prefix', 'firstNameTh', 'lastNameTh', 'firstNameEn', 'lastNameEn', 'gender', 'birthDate', 'age', 'nationalId', 'address', 'phone', 'email', 'profileImage', 'employeeType', 'departmentId', 'position', 'specialties', 'licenseNumber', 'education', 'startDate', 'status', 'workingDays', 'workingHours'],
      description: 'ข้อมูลพนักงานทั้งหมด (หมอ พยาบาล เจ้าหน้าที่)'
    },
    {
      tableName: 'departments',
      columns: ['id', 'name', 'description', 'color', 'isActive'],
      description: 'แผนกต่างๆ ในโรงพยาบาล'
    }
  ];

  usePageDebug('ข้อมูลพนักงาน', requiredTables);

  useEffect(() => {
    // ถ้ามีข้อมูลจาก state ให้ใช้ข้อมูลนั้น
    if (employeeFromState) {
      setEmployee(employeeFromState);
      
      // ดึงข้อมูลแผนก
      const departmentsData = debugManager.getData('departments') as Department[];
      const dept = departmentsData.find(d => d.id === employeeFromState.departmentId) || null;
      setDepartment(dept);
      return;
    }
    
    // ถ้าไม่มีข้อมูลจาก state ให้ดึงจาก URL parameter
    const urlParams = new URLSearchParams(location.search);
    const employeeId = urlParams.get('id');
    
    if (employeeId) {
      // ดึงข้อมูลพนักงานจาก localStorage
      const employeesData = debugManager.getData('employees') as Employee[];
      const foundEmployee = employeesData.find(e => e.id === employeeId) || null;
      
      if (foundEmployee) {
        setEmployee(foundEmployee);
        
        // ดึงข้อมูลแผนก
        const departmentsData = debugManager.getData('departments') as Department[];
        const dept = departmentsData.find(d => d.id === foundEmployee.departmentId) || null;
        setDepartment(dept);
      } else {
        setNotFound(true);
      }
    } else {
      setNotFound(true);
    }
  }, [location, employeeFromState, debugManager]);

  const handleBack = () => {
    navigate('/member/employee/searchemployee');
  };

  const handleEdit = () => {
    if (employee) {
      navigate('/member/employee/addemployee', { state: { employee, isEdit: true } });
    }
  };

  // แปลงประเภทพนักงานเป็นภาษาไทย
  const getEmployeeTypeText = (type: string): string => {
    switch (type) {
      case 'doctor': return 'แพทย์';
      case 'nurse': return 'พยาบาล';
      case 'staff': return 'เจ้าหน้าที่';
      default: return type;
    }
  };

  // แปลงสถานะเป็นภาษาไทยและกำหนดสี
  const getStatusChip = (status: string) => {
    let label = '';
    let color: 'success' | 'error' | 'warning' | 'default' = 'default';
    
    switch (status) {
      case 'active':
        label = 'ทำงานปกติ';
        color = 'success';
        break;
      case 'inactive':
        label = 'พักงาน';
        color = 'warning';
        break;
      case 'leave':
        label = 'ลาออก';
        color = 'error';
        break;
      default:
        label = status;
    }
    
    return <Chip label={label} color={color} />;
  };

  // แปลงวันที่เป็นรูปแบบไทย
  const formatThaiDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // คำนวณอายุงาน
  const calculateWorkDuration = (startDate: string): string => {
    try {
      const start = new Date(startDate);
      const now = new Date();
      
      const yearDiff = now.getFullYear() - start.getFullYear();
      const monthDiff = now.getMonth() - start.getMonth();
      
      if (monthDiff < 0) {
        return `${yearDiff - 1} ปี ${monthDiff + 12} เดือน`;
      } else {
        return `${yearDiff} ปี ${monthDiff} เดือน`;
      }
    } catch (error) {
      return 'ไม่สามารถคำนวณได้';
    }
  };

  // สร้างที่อยู่เต็มรูปแบบ
  const getFullAddress = (address: any): string => {
    if (!address) return 'ไม่ระบุที่อยู่';
    
    const parts = [
      address.houseNumber,
      address.village,
      address.street,
      `ต.${address.subDistrict}`,
      `อ.${address.district}`,
      `จ.${address.province}`,
      address.postalCode
    ];
    
    return parts.filter(Boolean).join(' ');
  };

  if (notFound) {
    return (
      <Paper sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            ข้อมูลพนักงาน
          </Typography>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            กลับ
          </Button>
        </Box>
        
        <Alert severity="error">
          ไม่พบข้อมูลพนักงาน
        </Alert>
      </Paper>
    );
  }

  if (!employee) {
    return (
      <Paper sx={{ p: 3, maxWidth: 1200, mx: 'auto', textAlign: 'center' }}>
        <Typography>กำลังโหลดข้อมูล...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          ข้อมูลพนักงาน
        </Typography>
        <Box>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            กลับ
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEdit}
          >
            แก้ไขข้อมูล
          </Button>
        </Box>
      </Box>

      {/* Employee Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 3, 
          bgcolor: department?.color || '#f5f5f5',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Avatar
                src={employee.profileImage}
                sx={{ width: 100, height: 100, border: '3px solid #fff' }}
              >
                {employee.firstNameTh.charAt(0)}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" gutterBottom>
                {employee.prefix} {employee.firstNameTh} {employee.lastNameTh}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Chip 
                  icon={<BadgeIcon />} 
                  label={employee.id} 
                  variant="outlined" 
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }} 
                />
                <Chip 
                  icon={<WorkIcon />} 
                  label={employee.position} 
                  variant="outlined" 
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }} 
                />
                <Chip 
                  icon={<LocalHospitalIcon />} 
                  label={getEmployeeTypeText(employee.employeeType)} 
                  variant="outlined" 
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }} 
                />
                {department && (
                  <Chip 
                    label={department.name} 
                    variant="outlined" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }} 
                  />
                )}
                {getStatusChip(employee.status)}
              </Box>
            </Grid>
          </Grid>
        </Box>
        {/* Background overlay */}
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          bgcolor: 'rgba(0,0,0,0.3)', 
          zIndex: 0 
        }} />
      </Paper>

      <Grid container spacing={3}>
        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ข้อมูลส่วนตัว
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List disablePadding>
                <ListItem divider>
                  <ListItemText 
                    primary="ชื่อ-นามสกุล (ไทย)" 
                    secondary={`${employee.prefix} ${employee.firstNameTh} ${employee.lastNameTh}`} 
                  />
                </ListItem>
                {(employee.firstNameEn || employee.lastNameEn) && (
                  <ListItem divider>
                    <ListItemText 
                      primary="ชื่อ-นามสกุล (อังกฤษ)" 
                      secondary={`${employee.firstNameEn || ''} ${employee.lastNameEn || ''}`} 
                    />
                  </ListItem>
                )}
                <ListItem divider>
                  <ListItemText 
                    primary="เพศ" 
                    secondary={employee.gender} 
                  />
                </ListItem>
                <ListItem divider>
                  <ListItemText 
                    primary="วันเกิด" 
                    secondary={`${formatThaiDate(employee.birthDate)} (อายุ ${employee.age} ปี)`} 
                  />
                </ListItem>
                <ListItem divider>
                  <ListItemText 
                    primary="เลขบัตรประชาชน" 
                    secondary={employee.nationalId} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="ที่อยู่" 
                    secondary={getFullAddress(employee.address)} 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Contact Information */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ข้อมูลติดต่อ
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PhoneIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="body1">
                  {employee.phone}
                </Typography>
              </Box>
              
              {employee.email && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="body1">
                    {employee.email}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Work Information */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ข้อมูลการทำงาน
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List disablePadding>
                <ListItem divider>
                  <ListItemText 
                    primary="วันที่เริ่มงาน" 
                    secondary={formatThaiDate(employee.startDate)} 
                  />
                </ListItem>
                                <ListItem divider>
                  <ListItemText 
                    primary="อายุงาน" 
                    secondary={calculateWorkDuration(employee.startDate)} 
                  />
                </ListItem>
                <ListItem divider>
                  <ListItemText 
                    primary="ตำแหน่ง" 
                    secondary={employee.position} 
                  />
                </ListItem>
                <ListItem divider>
                  <ListItemText 
                    primary="ประเภทพนักงาน" 
                    secondary={getEmployeeTypeText(employee.employeeType)} 
                  />
                </ListItem>
                <ListItem divider>
                  <ListItemText 
                    primary="แผนก" 
                    secondary={department?.name || 'ไม่ระบุแผนก'} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="สถานะ" 
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        {getStatusChip(employee.status)}
                      </Box>
                    } 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Professional Information */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ข้อมูลวิชาชีพ
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={3}>
                {/* License Number */}
                {employee.licenseNumber && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ bgcolor: '#f9f9f9' }}>
                      <CardContent>
                        <Typography variant="subtitle1" color="primary" gutterBottom>
                          เลขที่ใบอนุญาตประกอบวิชาชีพ
                        </Typography>
                        <Typography variant="body1">
                          {employee.licenseNumber}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Specialties */}
                {employee.specialties && employee.specialties.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ bgcolor: '#f9f9f9' }}>
                      <CardContent>
                        <Typography variant="subtitle1" color="primary" gutterBottom>
                          ความเชี่ยวชาญพิเศษ
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
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

                {/* Education */}
                {employee.education && employee.education.length > 0 && (
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ bgcolor: '#f9f9f9' }}>
                      <CardContent>
                        <Typography variant="subtitle1" color="primary" gutterBottom>
                          ประวัติการศึกษา
                        </Typography>
                        <List disablePadding>
                          {employee.education.map((edu, index) => (
                            <ListItem 
                              key={index} 
                              divider={index < employee.education!.length - 1}
                              sx={{ py: 1 }}
                            >
                              <SchoolIcon sx={{ mr: 2, color: 'primary.main' }} />
                              <ListItemText primary={edu} />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Working Schedule */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ตารางการทำงาน
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={3}>
                {/* Working Days */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <ScheduleIcon sx={{ mr: 2, color: 'primary.main', mt: 0.5 }} />
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        วันทำงาน
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {employee.workingDays && employee.workingDays.length > 0 ? (
                          employee.workingDays.map((day, index) => (
                            <Chip 
                              key={index} 
                              label={day} 
                              color="primary" 
                              variant="outlined" 
                              size="small" 
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            ไม่ระบุวันทำงาน
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                {/* Working Hours */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <ScheduleIcon sx={{ mr: 2, color: 'primary.main', mt: 0.5 }} />
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        เวลาทำงาน
                      </Typography>
                      {employee.workingHours ? (
                        <Typography variant="body1">
                          {employee.workingHours.start} - {employee.workingHours.end} น.
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          ไม่ระบุเวลาทำงาน
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default DataEmployee;

