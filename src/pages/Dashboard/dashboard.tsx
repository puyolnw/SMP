import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Container,
  styled,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  LocalHospital as HospitalIcon,
  PersonSearch as ScreeningIcon,
  QueueMusic as QueueIcon,

  PriorityHigh as UrgentIcon,
 
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,

  MonitorHeart as VitalIcon,
  MeetingRoom as RoomIcon,
  PersonAddAlt1 as AddPatientIcon,
  HowToReg as AuthenIcon,
  ContentPaste as ScreeningFormIcon,
  Grading as TriageIcon,
  ReceiptLong as QueueDisplayIcon,
  EventNote as QueueManageIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  transition: 'transform 0.3s, box-shadow 0.3s',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8]
  }
}));

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: theme.shadows[6]
  }
}));

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    emergency: 0,
    waiting: 0,
    screened: 0,
    inQueue: 0,
    totalPatients: 0,
    activeRooms: 0
  });
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [userRole, setUserRole] = useState<string>('staff'); // default role

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  // ฟังก์ชันดึง role จาก token
  const getUserRoleFromToken = () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        console.log('No token found, using default role: staff');
        return 'staff';
      }

      // Decode JWT token (แค่ payload ส่วน base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload:', payload);
      
      // ดึง role จาก token payload
      const role = payload.role || payload.userType || payload.employee_type || 'staff';
      console.log('User role from token:', role);
      
      return role.toLowerCase();
    } catch (error) {
      console.error('Error decoding token:', error);
      return 'staff';
    }
  };

  // ฟังก์ชันดึงข้อมูล dashboard จาก API
  const fetchDashboardData = async () => {
    try {
      console.log('🔄 Fetching dashboard data from API...');
      const response = await axios.get(`${API_BASE_URL}/api/queue-logs/dashboard/stats`);
      
      console.log('📊 API Response:', response.data);
      
      if (response.data.success) {
        const { stats: apiStats, recent_patients, system_info } = response.data;
        
        setStats({
          emergency: apiStats.emergency || 0,
          waiting: apiStats.waiting || 0,
          screened: apiStats.screened || 0,
          inQueue: apiStats.inQueue || 0,
          totalPatients: apiStats.totalPatients || 0,
          activeRooms: apiStats.activeRooms || 0
        });
        
        setRecentPatients(recent_patients || []);
        setSystemInfo(system_info || {});
        
        console.log('✅ Dashboard data loaded successfully from API');
        return true;
      } else {
        throw new Error(response.data.error || 'API returned success: false');
      }
    } catch (err) {
      console.error('❌ API Error:', err);
      
      // ถ้า API ไม่ทำงาน ให้ใช้ mock data เป็น fallback
      console.log('🔄 Using fallback mock data...');
      const mockStats = {
        emergency: 2,
        waiting: 5,
        screened: 10,
        inQueue: 7,
        totalPatients: 20,
        activeRooms: 3
      };
      setStats(mockStats);
      
      // Mock recent patients
      setRecentPatients([
        {
          id: '1',
          prefix: 'นาย',
          firstNameTh: 'สมชาย',
          lastNameTh: 'ใจดี',
          age: 35,
          gender: 'ชาย',
          phone: '0812345678',
          bloodType: 'O',
          chronicDiseases: ['เบาหวาน'],
          profileImage: '',
          queue_number: 'A001',
          queue_status: 'waiting',
          queue_priority: 2
        },
        {
          id: '2',
          prefix: 'นางสาว',
          firstNameTh: 'สายใจ',
          lastNameTh: 'สุขใจ',
          age: 28,
          gender: 'หญิง',
          phone: '0898765432',
          bloodType: 'A',
          chronicDiseases: [],
          profileImage: '',
          queue_number: 'A002',
          queue_status: 'waiting',
          queue_priority: 3
        }
      ]);
      
      setSystemInfo({ system_status: 'offline' });
      
      console.log('⚠️ Fallback to mock data completed');
      return false;
    }
  };

  useEffect(() => {
    // ดึง role จาก token
    const role = getUserRoleFromToken();
    setUserRole(role);
    
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchDashboardData();
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLastUpdated(new Date());
        setLoading(false);
      }
    };
    
    loadData();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchDashboardData();
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    } finally {
      setLastUpdated(new Date());
      setLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    navigate(path);
  };

  // ฟังก์ชันกำหนดเมนูตาม role
  const getMenuItemsByRole = () => {
    const allMenuItems = [
      {
        id: 'addpatient',
        title: 'เพิ่มผู้ป่วยใหม่',
        description: 'ลงทะเบียนผู้ป่วยใหม่เข้าสู่ระบบ',
        path: '/member/patient/addpatient',
        icon: AddPatientIcon,
        color: 'primary.main',
        roles: ['admin', 'staff', 'nurse']
      },
      {
        id: 'authen',
        title: 'ยืนยันตัวตนผู้ป่วย',
        description: 'ยืนยันตัวตนผู้ป่วยเพื่อเข้าสู่กระบวนการคัดกรอง',
        path: '/Screening/AuthenPatient',
        icon: AuthenIcon,
        color: 'secondary.main',
        roles: ['admin', 'staff', 'nurse']
      },
      {
        id: 'screening',
        title: 'คัดกรองผู้ป่วย',
        description: 'บันทึกข้อมูลสัญญาณชีพและอาการเบื้องต้น',
        path: '/Screening/Patient',
        icon: ScreeningFormIcon,
        color: 'success.main',
        roles: ['admin', 'nurse']
      },
      {
        id: 'queue',
        title: 'จัดการคิว',
        description: 'จัดการคิวผู้ป่วยตามห้องตรวจและแผนก',
        path: '/queue/manage',
        icon: QueueManageIcon,
        color: 'warning.main',
        roles: ['admin', 'doctor', 'nurse']
      }
    ];

    return allMenuItems.filter(item => item.roles.includes(userRole));
  };

  // ฟังก์ชันกำหนด Quick Links ตาม role
  const getQuickLinksByRole = () => {
    const allQuickLinks = [
      {
        id: 'search',
        title: 'ค้นหาผู้ป่วย',
        path: '/member/patient/searchpatient',
        icon: ScreeningIcon,
        color: 'primary' as const,
        roles: ['admin', 'doctor', 'nurse', 'staff']
      },
      {
        id: 'triage',
        title: 'คัดแยกประเภท',
        path: '/Screening/Patient2',
        icon: TriageIcon,
        color: 'error' as const,
        roles: ['admin', 'nurse']
      },
      {
        id: 'patient-system',
        title: 'ระบบผู้ป่วย',
        path: '/welcome',
        icon: VitalIcon,
        color: 'success' as const,
        roles: ['admin', 'staff', 'nurse']
      },
      {
        id: 'room-manage',
        title: 'จัดการห้อง',
        path: '/queue/manage/room',
        icon: RoomIcon,
        color: 'warning' as const,
        roles: ['admin']
      }
    ];

    return allQuickLinks.filter(link => link.roles.includes(userRole));
  };



  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        {/* Header Section */}
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2
            }}
          >
            <HospitalIcon sx={{ fontSize: 60, color: '#e53e3e' }} />
            ระบบคัดกรองและจัดคิวผู้ป่วยสูงอายุ
          </Typography>
          <Typography variant="h6" color="text.secondary">
            ระบบคัดกรองผู้ป่วยเพื่อจัดลำดับความสำคัญและจัดคิวการรักษา
          </Typography>
          
          {/* แสดง role ปัจจุบัน */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              สถานะ:
            </Typography>
            <Chip 
              label={
                userRole === 'admin' ? 'ผู้ดูแลระบบ' :
                userRole === 'doctor' ? 'แพทย์' :
                userRole === 'nurse' ? 'พยาบาล' :
                userRole === 'staff' ? 'เจ้าหน้าที่' :
                'ผู้ใช้งาน'
              }
              color={
                userRole === 'admin' ? 'primary' :
                userRole === 'doctor' ? 'error' :
                userRole === 'nurse' ? 'success' :
                'default'
              }
              size="small"
            />
            {/* Debug: แสดง role value */}
            <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>
              ({userRole})
            </Typography>
          </Box>
        </Box>

        {/* Last updated and refresh button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
            อัพเดทล่าสุด: {lastUpdated.toLocaleTimeString('th-TH')}
          </Typography>
          <Tooltip title="รีเฟรชข้อมูล">
            <IconButton onClick={handleRefresh} color="primary" sx={{ bgcolor: 'background.paper' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Quick Stats Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                bgcolor: 'error.light',
                color: 'error.contrastText'
              }}
            >
              <UrgentIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{stats.emergency}</Typography>
              <Typography variant="body2">วิกฤต</Typography>
              {loading && <LinearProgress color="inherit" sx={{ mt: 1 }} />}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                bgcolor: 'warning.light',
                color: 'warning.contrastText'
              }}
            >
              <ScheduleIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{stats.waiting}</Typography>
              <Typography variant="body2">รอคัดกรอง</Typography>
              {loading && <LinearProgress color="inherit" sx={{ mt: 1 }} />}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                bgcolor: 'success.light',
                color: 'success.contrastText'
              }}
            >
              <CheckIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{stats.screened}</Typography>
              <Typography variant="body2">คัดกรองแล้ว</Typography>
              {loading && <LinearProgress color="inherit" sx={{ mt: 1 }} />}
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                bgcolor: 'info.light',
                color: 'info.contrastText'
              }}
            >
              <QueueIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{stats.inQueue}</Typography>
              <Typography variant="body2">คิวรอรักษา</Typography>
              {loading && <LinearProgress color="inherit" sx={{ mt: 1 }} />}
            </Paper>
          </Grid>
        </Grid>

        {/* Main Content */}
        <Grid container spacing={4}>
          {/* Left Column */}
          <Grid item xs={12} md={8}>
            {/* Quick Actions */}
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium' }}>
              การดำเนินการ
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {getMenuItemsByRole().map((item) => (
                <Grid item xs={12} sm={6} key={item.id}>
                  <StyledCard>
                    <CardActionArea 
                      onClick={() => navigateTo(item.path)}
                      sx={{ height: '100%', p: 2 }}
                    >
                      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: item.color, width: 60, height: 60, mb: 2 }}>
                          <item.icon sx={{ fontSize: 30 }} />
                        </Avatar>
                        <Typography variant="h6" component="div" gutterBottom>
                          {item.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </StyledCard>
                </Grid>
              ))}
            </Grid>

            {/* Recent Patients */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 'medium' }}>
                  ผู้ป่วยล่าสุด
                </Typography>
                <Button 
                  endIcon={<ArrowIcon />} 
                  onClick={() => navigateTo('/data')}
                >
                  ดูทั้งหมด
                </Button>
              </Box>
              <Paper elevation={2}>
                {loading ? (
                  <Box sx={{ p: 2 }}>
                    <LinearProgress />
                    <Typography variant="body2" sx={{ textAlign: 'center', mt: 2 }}>
                      กำลังโหลดข้อมูล...
                    </Typography>
                  </Box>
                ) : recentPatients.length > 0 ? (
                  <List>
                    {recentPatients.map((patient, index) => (
                      <React.Fragment key={`patient-${patient.id || 'unknown'}-${index}`}>
                        <ListItem 
                          alignItems="flex-start"
                          secondaryAction={
                            <Button 
                              variant="outlined" 
                              size="small"
                              onClick={() => navigateTo(`/member/patient/dataPatient/${patient.id}`)}
                            >
                              ดูข้อมูล
                            </Button>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar 
                              src={patient.profileImage} 
                              alt={`${patient.prefix} ${patient.firstNameTh}`}
                              sx={{ bgcolor: 'primary.main' }}
                            >
                              {patient.firstNameTh?.charAt(0) || 'P'}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" fontWeight="medium">
                                {patient.prefix} {patient.firstNameTh} {patient.lastNameTh}
                              </Typography>
                            }
                            secondary={
                              <React.Fragment>
                                <Typography variant="body2" component="span" color="text.primary">
                                  อายุ: {patient.age} ปี | {patient.gender}
                                </Typography>
                                <Typography variant="body2" component="div" color="text.secondary">
                                  เบอร์โทร: {patient.phone}
                                  {patient.bloodType && ` | กรุ๊ปเลือด: ${patient.bloodType}`}
                                </Typography>
                                {/* แสดงข้อมูลคิว */}
                                {patient.queue_number && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                    <Chip 
                                      label={`คิว: ${patient.queue_number}`}
                                      size="small"
                                      color={patient.queue_status === 'waiting' ? 'warning' : 
                                             patient.queue_status === 'in_progress' ? 'info' : 'default'}
                                    />
                                    {patient.queue_priority === 1 && (
                                      <Chip 
                                        label="วิกฤต"
                                        size="small"
                                        color="error"
                                        icon={<UrgentIcon />}
                                      />
                                    )}
                                    {patient.queue_priority === 2 && (
                                      <Chip 
                                        label="เร่งด่วน"
                                        size="small"
                                        color="warning"
                                      />
                                    )}
                                  </Box>
                                )}
                                {patient.chronicDiseases && patient.chronicDiseases.length > 0 && (
                                  <Box sx={{ mt: 0.5 }}>
                                    {patient.chronicDiseases.slice(0, 2).map((disease: string, i: number) => (
                                      <Chip 
                                        key={`${patient.id || 'unknown'}-disease-${i}-${disease}`} 
                                        label={disease} 
                                        size="small" 
                                        color="primary" 
                                        variant="outlined"
                                        sx={{ mr: 0.5, mb: 0.5 }}
                                      />
                                    ))}
                                    {patient.chronicDiseases.length > 2 && (
                                      <Chip 
                                        key={`${patient.id || 'unknown'}-more-diseases`}
                                        label={`+${patient.chronicDiseases.length - 2}`} 
                                        size="small" 
                                        color="default" 
                                        variant="outlined"
                                        sx={{ mr: 0.5, mb: 0.5 }}
                                      />
                                    )}
                                  </Box>
                                )}
                              </React.Fragment>
                            }
                          />
                        </ListItem>
                        {index < recentPatients.length - 1 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      ไม่พบข้อมูลผู้ป่วย
                    </Typography>
                    <Button 
                      variant="contained" 
                      sx={{ mt: 2 }}
                      onClick={() => navigateTo('/member/patient/addpatient')}
                    >
                      เพิ่มผู้ป่วยใหม่
                    </Button>
                  </Box>
                )}
              </Paper>
            </Box>
          </Grid>

          {/* Right Column */}
          <Grid item xs={12} md={4}>
            {/* System Status */}
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium' }}>
              สถานะระบบ
            </Typography>
            <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <RoomIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">ห้องตรวจที่เปิดให้บริการ</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                <Typography variant="h2" color="primary.main" fontWeight="bold">
                  {stats.activeRooms}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ ml: 1 }}>
                  ห้อง
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">ผู้ป่วยที่คัดกรองผ่านแล้ว:</Typography>
                <Typography variant="body1" fontWeight="bold">{stats.totalPatients} คน</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">คิวที่กำลังรอ:</Typography>
                <Typography variant="body1" fontWeight="bold">{stats.inQueue} คิว</Typography>
              </Box>
              <Box sx={{ mt: 3 }}>
                <Button 
                  variant="outlined" 
                  fullWidth
                  onClick={() => navigateTo('/queue/showqueue')}
                  startIcon={<QueueDisplayIcon />}
                >
                  ดูสถานะคิวทั้งหมด
                </Button>
              </Box>
            </Paper>

            {/* Quick Links */}
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium' }}>
              ลิงก์ด่วน
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {getQuickLinksByRole().map((link) => (
                <Grid item xs={6} key={link.id}>
                  <StyledPaper 
                    elevation={2}
                    onClick={() => navigateTo(link.path)}
                  >
                    <link.icon color={link.color} sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="body1" fontWeight="medium">{link.title}</Typography>
                  </StyledPaper>
                </Grid>
              ))}
            </Grid>

            {/* System Info */}
            <Paper elevation={2} sx={{ p: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="h6" gutterBottom>
                ข้อมูลระบบ
              </Typography>
              <Typography variant="body2" paragraph>
                ระบบคัดกรองและจัดคิวผู้ป่วยอัตโนมัติ ช่วยให้การบริหารจัดการผู้ป่วยมีประสิทธิภาพมากขึ้น
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">สถานะระบบ:</Typography>
                <Chip 
                  label={systemInfo.system_status === 'online' ? 'ออนไลน์' : 'ออฟไลน์'} 
                  size="small" 
                  color={systemInfo.system_status === 'online' ? 'success' : 'error'}
                  sx={{ bgcolor: 'white', color: systemInfo.system_status === 'online' ? 'green' : 'red' }}
                />
              </Box>
              {systemInfo.total_logs_today && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">กิจกรรมวันนี้:</Typography>
                  <Typography variant="body2" fontWeight="bold">{systemInfo.total_logs_today} รายการ</Typography>
                </Box>
              )}
              <Typography variant="body2">
                เวอร์ชัน: 1.0.0 | อัพเดทล่าสุด: {new Date().toLocaleDateString('th-TH')}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
