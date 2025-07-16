import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { DebugManager } from '../../utils/Debuger';

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
  const debugManager = DebugManager.getInstance();
  const [stats, setStats] = useState({
    emergency: 0,
    waiting: 0,
    screened: 0,
    inQueue: 0,
    totalPatients: 0,
    activeRooms: 0
  });
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load data from localStorage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    
    try {
      // Get patients data
      const patients = debugManager.getData('patients') || [];
      
      // Get screenings data
      const screenings = debugManager.getData('screenings') || [];
      
      // Get queues data
      const queues = debugManager.getData('patientQueues') || [];
      
      // Get rooms data
      const rooms = debugManager.getData('rooms') || [];
      const activeRooms = rooms.filter((room: any) => room.isActive).length;
      
      // Calculate stats
      const emergency = screenings.filter((s: any) => s.triageLevel === 1).length;
      const waiting = patients.length - screenings.length;
      const screened = screenings.length;
      const inQueue = queues.length;
      
      // Update stats
      setStats({
        emergency,
        waiting,
        screened,
        inQueue,
        totalPatients: patients.length,
        activeRooms
      });
      
      // Get recent patients (last 5)
      const sortedPatients = [...patients].sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }).slice(0, 5);
      
      setRecentPatients(sortedPatients);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const navigateTo = (path: string) => {
    navigate(path);
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
            ระบบคัดกรองและจัดคิวผู้ป่วย
          </Typography>
          <Typography variant="h6" color="text.secondary">
            ระบบคัดกรองผู้ป่วยเพื่อจัดลำดับความสำคัญและจัดคิวการรักษา
          </Typography>
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
              <Typography variant="body2">ฉุกเฉิน</Typography>
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
              <Grid item xs={12} sm={6}>
                <StyledCard>
                  <CardActionArea 
                    onClick={() => navigateTo('/member/patient/addpatient')}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60, mb: 2 }}>
                        <AddPatientIcon sx={{ fontSize: 30 }} />
                      </Avatar>
                      <Typography variant="h6" component="div" gutterBottom>
                        เพิ่มผู้ป่วยใหม่
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ลงทะเบียนผู้ป่วยใหม่เข้าสู่ระบบ
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </StyledCard>
              </Grid>
              <Grid item xs={12} sm={6}>
                <StyledCard>
                  <CardActionArea 
                    onClick={() => navigateTo('/Screening/AuthenPatient')}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 60, height: 60, mb: 2 }}>
                        <AuthenIcon sx={{ fontSize: 30 }} />
                      </Avatar>
                      <Typography variant="h6" component="div" gutterBottom>
                        ยืนยันตัวตนผู้ป่วย
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ยืนยันตัวตนผู้ป่วยเพื่อเข้าสู่กระบวนการคัดกรอง
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </StyledCard>
              </Grid>
              <Grid item xs={12} sm={6}>
                <StyledCard>
                  <CardActionArea 
                    onClick={() => navigateTo('/Screening/Patient')}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'success.main', width: 60, height: 60, mb: 2 }}>
                        <ScreeningFormIcon sx={{ fontSize: 30 }} />
                      </Avatar>
                      <Typography variant="h6" component="div" gutterBottom>
                        คัดกรองผู้ป่วย
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        บันทึกข้อมูลสัญญาณชีพและอาการเบื้องต้น
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </StyledCard>
              </Grid>
              <Grid item xs={12} sm={6}>
                <StyledCard>
                  <CardActionArea 
                    onClick={() => navigateTo('/queue/manage')}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'warning.main', width: 60, height: 60, mb: 2 }}>
                        <QueueManageIcon sx={{ fontSize: 30 }} />
                      </Avatar>
                      <Typography variant="h6" component="div" gutterBottom>
                        จัดการคิว
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        จัดการคิวผู้ป่วยตามห้องตรวจและแผนก
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </StyledCard>
              </Grid>
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
                      <React.Fragment key={patient.id || index}>
                        <ListItem 
                          alignItems="flex-start"
                          secondaryAction={
                            <Button 
                              variant="outlined" 
                              size="small"
                              onClick={() => navigateTo(`/member/patient/data?id=${patient.id}`)}
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
                                {patient.chronicDiseases && patient.chronicDiseases.length > 0 && (
                                  <Box sx={{ mt: 0.5 }}>
                                    {patient.chronicDiseases.slice(0, 2).map((disease: string, i: number) => (
                                      <Chip 
                                        key={i} 
                                        label={disease} 
                                        size="small" 
                                        color="primary" 
                                        variant="outlined"
                                        sx={{ mr: 0.5, mb: 0.5 }}
                                      />
                                    ))}
                                    {patient.chronicDiseases.length > 2 && (
                                      <Chip 
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
                <Typography variant="body1">ผู้ป่วยทั้งหมดในระบบ:</Typography>
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
              <Grid item xs={6}>
                <StyledPaper 
                  elevation={2}
                  onClick={() => navigateTo('/member/patient/searchpatient')}
                >
                  <ScreeningIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body1" fontWeight="medium">ค้นหาผู้ป่วย</Typography>
                </StyledPaper>
              </Grid>
              <Grid item xs={6}>
                <StyledPaper 
                  elevation={2}
                  onClick={() => navigateTo('/Screening/Patient2')}
                >
                  <TriageIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body1" fontWeight="medium">คัดแยกประเภท</Typography>
                </StyledPaper>
              </Grid>
              <Grid item xs={6}>
                <StyledPaper 
                  elevation={2}
                  onClick={() => navigateTo('/welcome')}
                >
                  <VitalIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body1" fontWeight="medium">ระบบผู้ป่วย</Typography>
                </StyledPaper>
              </Grid>
              <Grid item xs={6}>
                <StyledPaper 
                  elevation={2}
                  onClick={() => navigateTo('/queue/manage/room')}
                >
                  <RoomIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body1" fontWeight="medium">จัดการห้อง</Typography>
                </StyledPaper>
              </Grid>
            </Grid>

            {/* System Info */}
            <Paper elevation={2} sx={{ p: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="h6" gutterBottom>
                ข้อมูลระบบ
              </Typography>
              <Typography variant="body2" paragraph>
                ระบบคัดกรองและจัดคิวผู้ป่วยอัตโนมัติ ช่วยให้การบริหารจัดการผู้ป่วยมีประสิทธิภาพมากขึ้น
              </Typography>
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
