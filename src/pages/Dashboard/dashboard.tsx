import React from 'react';
import { 
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Container,
  styled
} from '@mui/material';
import { 
  LocalHospital as HospitalIcon,
  PersonSearch as ScreeningIcon,
  Queue as QueueIcon,
  Assessment as ReportIcon,
  PriorityHigh as UrgentIcon,
  //Notifications as NotificationIcon,
  People as PatientsIcon,
  //MedicalServices as MedicalIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Assignment as FormIcon,
  MonitorHeart as VitalIcon
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

const Dashboard: React.FC = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        {/* Header Section */}
        <Box sx={{ py: 5, textAlign: 'center' }}>
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
            <HospitalIcon sx={{ fontSize: 80, color: '#e53e3e' }} />
            ระบบคัดกรองและจัดคิวผู้ป่วย
          </Typography>
          <Typography variant="h5" color="text.secondary">
            ระบบคัดกรองผู้ป่วยเพื่อจัดลำดับความสำคัญและจัดคิวการรักษา
          </Typography>
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
              <Typography variant="h4" fontWeight="bold">5</Typography>
              <Typography variant="body2">ฉุกเฉิน</Typography>
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
              <Typography variant="h4" fontWeight="bold">18</Typography>
              <Typography variant="body2">รอคัดกรอง</Typography>
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
              <Typography variant="h4" fontWeight="bold">42</Typography>
              <Typography variant="body2">คัดกรองแล้ว</Typography>
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
              <Typography variant="h4" fontWeight="bold">24</Typography>
              <Typography variant="body2">คิวรอรักษา</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Main Features Grid */}
        <Grid container spacing={4} sx={{ mb: 6 }}>
          <Grid item xs={12} md={6} lg={3}>
            <StyledPaper elevation={3}>
              <ScreeningIcon color="primary" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                คัดกรองผู้ป่วย
              </Typography>
              <Typography color="text.secondary">
                ประเมินอาการและจัดลำดับความสำคัญ
              </Typography>
            </StyledPaper>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <StyledPaper elevation={3}>
              <FormIcon color="primary" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                แบบฟอร์มคัดกรอง
              </Typography>
              <Typography color="text.secondary">
                กรอกข้อมูลอาการและประวัติผู้ป่วย
              </Typography>
            </StyledPaper>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <StyledPaper elevation={3}>
              <QueueIcon color="primary" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                จัดการคิว
              </Typography>
              <Typography color="text.secondary">
                จัดคิวตามลำดับความสำคัญ
              </Typography>
            </StyledPaper>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <StyledPaper elevation={3}>
              <VitalIcon color="primary" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                ตรวจสัญญาณชีพ
              </Typography>
              <Typography color="text.secondary">
                บันทึกความดัน ชีพจร อุณหภูมิ
              </Typography>
            </StyledPaper>
          </Grid>
        </Grid>

        {/* Secondary Features */}
        <Grid container spacing={4} sx={{ mb: 6 }}>
          <Grid item xs={12} md={6} lg={4}>
            <StyledPaper elevation={3}>
              <UrgentIcon color="error" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                ผู้ป่วยฉุกเฉิน
              </Typography>
              <Typography color="text.secondary">
                จัดการผู้ป่วยที่ต้องการความช่วยเหลือด่วน
              </Typography>
            </StyledPaper>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <StyledPaper elevation={3}>
              <PatientsIcon color="secondary" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                รายชื่อผู้ป่วย
              </Typography>
              <Typography color="text.secondary">
                ดูรายชื่อและสถานะผู้ป่วยทั้งหมด
              </Typography>
            </StyledPaper>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <StyledPaper elevation={3}>
              <ReportIcon color="secondary" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                รายงานการคัดกรอง
              </Typography>
              <Typography color="text.secondary">
                สถิติและรายงานการคัดกรองผู้ป่วย
              </Typography>
            </StyledPaper>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Priority Levels Info */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom textAlign="center" fontWeight="bold">
            ระดับความสำคัญในการคัดกรอง
          </Typography>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText', textAlign: 'center' }}>
                <Typography variant="h6" fontWeight="bold">ระดับ 1</Typography>
                <Typography variant="body2">ฉุกเฉิน - ต้องรักษาทันที</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: 'warning.light', color: 'warning.contrastText', textAlign: 'center' }}>
                <Typography variant="h6" fontWeight="bold">ระดับ 2</Typography>
                <Typography variant="body2">เร่งด่วน - รักษาภายใน 15 นาที</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText', textAlign: 'center' }}>
                <Typography variant="h6" fontWeight="bold">ระดับ 3</Typography>
                <Typography variant="body2">ปานกลาง - รักษาภายใน 30 นาที</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText', textAlign: 'center' }}>
                <Typography variant="h6" fontWeight="bold">ระดับ 4</Typography>
                <Typography variant="body2">ไม่เร่งด่วน - รักษาภายใน 60 นาที</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Welcome Message */}
        <Box sx={{ 
          bgcolor: 'primary.light', 
          p: 4, 
          borderRadius: 2,
          textAlign: 'center'
        }}>
          <Typography variant="h4" gutterBottom sx={{ color: 'primary.contrastText' }}>
            ระบบคัดกรองผู้ป่วยอัจฉริยะ
          </Typography>
          <Typography variant="body1" sx={{ color: 'primary.contrastText', mb: 2 }}>
            ช่วยให้การจัดลำดับความสำคัญของผู้ป่วยเป็นไปอย่างมีประสิทธิภาพและปลอดภัย
          </Typography>
          <Typography variant="body2" sx={{ color: 'primary.contrastText' }}>
            เริ่มต้นด้วยการคัดกรองผู้ป่วยเพื่อจัดคิวการรักษาที่เหมาะสม
          </Typography>
        </Box>

        {/* Current Time Display */}
        <Box sx={{ 
          mt: 4, 
          p: 2, 
          textAlign: 'center',
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="h6" color="text.secondary">
            เวลาปัจจุบัน: {new Date().toLocaleString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard;
