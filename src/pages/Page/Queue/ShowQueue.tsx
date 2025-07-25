import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Container,
  ButtonBase,
  Grid,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
  IconButton,
} from '@mui/material';   
import {
  LocalHospital as HospitalIcon,
  MonitorHeart as HeartIcon,
  Psychology as PsychologyIcon,
  Healing as HealingIcon,
  Visibility as EyeIcon,
  Emergency as EmergencyIcon,
  Settings as SettingsIcon,
  Close as CloseIcon
} from '@mui/icons-material';

interface QueueItem {
  id: string;
  queue_code: string;
  room: string;
  status: string;
  isUpdated?: boolean;
}

interface Department {
  id: string;
  name: string;
  shortName: string;
  thaiCode: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  rooms: string[];
}

const ShowQueue: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('NEU');
  const [activeRooms, setActiveRooms] = useState<number>(3);
  const [currentQueues, setCurrentQueues] = useState<QueueItem[]>([]);
  const [nextQueues, setNextQueues] = useState<QueueItem[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);


  // Department configuration
  const departments: Department[] = [
    {
      id: 'GEN',
      name: 'ห้องตรวจโรคทั่วไป',
      shortName: 'GEN',
      thaiCode: 'ทว',
      icon: <HospitalIcon />,
      color: '#1976d2',
      bgColor: '#e3f2fd',
      rooms: ['ห้องตรวจ 1', 'ห้องตรวจ 2', 'ห้องตรวจ 3']
    },
    {
      id: 'CAR',
      name: 'ห้องรักษาหัวใจ',
      shortName: 'CAR',
      thaiCode: 'หจ',
      icon: <HeartIcon />,
      color: '#d32f2f',
      bgColor: '#ffebee',
      rooms: ['ห้องตรวจหัวใจ 1', 'ห้องตรวจหัวใจ 2', 'ห้องตรวจหัวใจ 3']
    },
    {
      id: 'NEU',
      name: 'ห้องตรวจระบบประสาท',
      shortName: 'NEU',
      thaiCode: 'ปส',
      icon: <PsychologyIcon />,
      color: '#7b1fa2',
      bgColor: '#f3e5f5',
      rooms: ['ห้องตรวจประสาท 1', 'ห้องตรวจประสาท 2', 'ห้องตรวจประสาท 3']
    },
    {
      id: 'ORT',
      name: 'ห้องกระดูกและข้อ',
      shortName: 'ORT',
      thaiCode: 'กข',
      icon: <HealingIcon />,
      color: '#388e3c',
      bgColor: '#e8f5e8',
      rooms: ['ห้องตรวจกระดูก 1', 'ห้องตรวจกระดูก 2', 'ห้องตรวจกระดูก 3']
    },
    {
      id: 'EYE',
      name: 'ห้องตรวจตา',
      shortName: 'EYE',
      thaiCode: 'ตา',
      icon: <EyeIcon />,
      color: '#f57c00',
      bgColor: '#fff3e0',
      rooms: ['ห้องตรวจตา 1', 'ห้องตรวจตา 2', 'ห้องตรวจตา 3']
    },
    {
      id: 'EMR',
      name: 'ห้องฉุกเฉิน',
      shortName: 'EMR',
      thaiCode: 'ฉก',
      icon: <EmergencyIcon />,
      color: '#c62828',
      bgColor: '#ffebee',
      rooms: ['ห้องฉุกเฉิน 1', 'ห้องฉุกเฉิน 2', 'ห้องฉุกเฉิน 3']
    }
  ];

  // Mock queue data
  const generateMockData = () => {
    const currentDept = getCurrentDepartment();
    const baseQueueNum = Math.floor(Math.random() * 50) + 1;
    
    // Generate current queues for active rooms only
    const current = Array.from({ length: activeRooms }, (_, index) => ({
      id: `current-${index}`,
      queue_code: `${currentDept.thaiCode}${(baseQueueNum + index).toString().padStart(3, '0')}`,
      room: currentDept.rooms[index],
      status: 'กำลังตรวจ',
      isUpdated: Math.random() > 0.7 // Random chance for update animation
    }));

    // Generate next queues
    const next = Array.from({ length: 8 }, (_, index) => ({
      id: `next-${index}`,
      queue_code: `${currentDept.thaiCode}${(baseQueueNum + activeRooms + index).toString().padStart(3, '0')}`,
      room: '',
      status: 'รอตรวจ',
      isUpdated: Math.random() > 0.8
    }));

    return { current, next };
  };

  // Auto refresh data every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadQueueData();
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedDepartment, activeRooms]);

  // Load queue data when department or active rooms change
  useEffect(() => {
    loadQueueData();
  }, [selectedDepartment, activeRooms]);

  const loadQueueData = () => {
    const mockData = generateMockData();
    setCurrentQueues(mockData.current);
    setNextQueues(mockData.next);
  };

  const getCurrentDepartment = () => {
    return departments.find(dept => dept.id === selectedDepartment) || departments[0];
  };

  const handleDepartmentSelect = (deptId: string) => {
    setSelectedDepartment(deptId);
    setActiveRooms(3); // Reset to 3 rooms when changing department
    setShowSettings(false);
  };

  const handleActiveRoomsChange = (rooms: number) => {
    setActiveRooms(rooms);
  };

  const currentDept = getCurrentDepartment();

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: currentDept.bgColor,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Floating Settings Button */}
      <Fab
        color="primary"
        onClick={() => setShowSettings(true)}
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000,
          bgcolor: currentDept.color,
          '&:hover': {
            bgcolor: currentDept.color,
            opacity: 0.8
          }
        }}
      >
        <SettingsIcon />
      </Fab>

      {/* Settings Dialog */}
      <Dialog 
        open={showSettings} 
        onClose={() => setShowSettings(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          bgcolor: currentDept.color,
          color: 'white'
        }}>
          <Typography variant="h6">ตั้งค่าการแสดงผล</Typography>
          <IconButton onClick={() => setShowSettings(false)} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {/* Department Selection */}
          <Typography variant="h6" sx={{ mb: 2 }}>เลือกแผนก</Typography>
          <Grid container spacing={1} sx={{ mb: 3 }}>
            {departments.map((dept) => (
              <Grid item xs={4} key={dept.id}>
                <ButtonBase
                  onClick={() => handleDepartmentSelect(dept.id)}
                  sx={{
                    width: '100%',
                    borderRadius: '12px',
                    p: 2,
                    border: selectedDepartment === dept.id ? `3px solid ${dept.color}` : '2px solid #e0e0e0',
                    bgcolor: selectedDepartment === dept.id ? dept.bgColor : 'white',
                    transition: 'all 0.3s',
                    '&:hover': {
                      bgcolor: dept.bgColor,
                      transform: 'scale(1.02)'
                    }
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ color: dept.color, mb: 1 }}>
                      {React.cloneElement(dept.icon as React.ReactElement, { sx: { fontSize: 30 } })}
                    </Box>
                    <Typography variant="body2" fontWeight="bold" color={dept.color}>
                      {dept.shortName}
                    </Typography>
                  </Box>
                </ButtonBase>
              </Grid>
            ))}
          </Grid>

          {/* Active Rooms Selection */}
          <Typography variant="h6" sx={{ mb: 2 }}>จำนวนห้องตรวจที่เปิดใช้งาน</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[1, 2, 3].map((num) => (
              <Chip
                key={num}
                label={`${num} ห้อง`}
                onClick={() => handleActiveRoomsChange(num)}
                color={activeRooms === num ? 'primary' : 'default'}
                variant={activeRooms === num ? 'filled' : 'outlined'}
                sx={{
                  fontSize: '1rem',
                  py: 2,
                  px: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: activeRooms === num ? 'primary.dark' : 'primary.light'
                  }
                }}
              />
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Full Screen Department Name */}
      <Box sx={{ 
        textAlign: 'center', 
        py: { xs: 2, md: 4 },
        background: `linear-gradient(135deg, ${currentDept.color}15 0%, ${currentDept.color}25 100%)`
      }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 2, md: 4 } }}>
            <Box sx={{ color: currentDept.color }}>
              {React.cloneElement(currentDept.icon as React.ReactElement, { 
                sx: { fontSize: { xs: 60, md: 100 } } 
              })}
            </Box>
            <Typography 
              variant="h1" 
              fontWeight="bold" 
              color={currentDept.color}
              sx={{ 
                fontSize: { xs: '3rem', md: '6rem', lg: '8rem' },
                lineHeight: 1,
                textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {currentDept.name}
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Main Queue Display */}
       <Container maxWidth="xl" sx={{ pb: 5, pt: { xs: 3, md: 4 } }}>
        <Card 
          elevation={8}
          sx={{ 
            borderRadius: '24px',
            background: `linear-gradient(135deg, ${currentDept.color}20 0%, ${currentDept.color}40 100%)`,
            border: `4px solid ${currentDept.color}`,
            animation: 'pulse 3s infinite'
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            {/* Current Queues Title */}
            <Typography 
              variant="h2" 
              fontWeight="bold" 
              color={currentDept.color} 
              sx={{ 
                mb: 3, 
                textAlign: 'center',
                fontSize: { xs: '2.5rem', md: '4rem' }
              }}
            >
              คิวปัจจุบัน
            </Typography>
            
            {/* Current Queues Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }} >
              {currentQueues.map((queue) => (
                <Grid item xs={12} md={activeRooms === 3 ? 4 : activeRooms === 2 ? 6 : 12} key={queue.id}>
                  <Card 
                    sx={{ 
                      height: { xs: '200px', md: '300px' },
                      borderRadius: '20px',
                      textAlign: 'center',
                      bgcolor: 'white',
                      border: `3px solid ${currentDept.color}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography 
                        variant="h5" 
                        fontWeight="bold" 
                        color={currentDept.color} 
                        sx={{ 
                          mb: 2,
                          fontSize: { xs: '1.2rem', md: '1.5rem' }
                        }}
                      >
                        {queue.room}
                      </Typography>
                      <Typography 
                        variant="h1" 
                        fontWeight="bold" 
                        color={currentDept.color}
                        sx={{ 
                                                    fontSize: { xs: '4rem', md: '6rem', lg: '8rem' },
                          lineHeight: 1,
                          mb: 2,
                          animation: queue.isUpdated ? 'blink 1s ease-in-out 3' : 'none'
                        }}
                      >
                        {queue.queue_code}
                      </Typography>
                      <Box sx={{ 
                        bgcolor: currentDept.color,
                        color: 'white',
                        borderRadius: '25px',
                        py: 1,
                        px: 2,
                        display: 'inline-block'
                      }}>
                        <Typography variant="h6" fontWeight="bold">
                          กำลังตรวจ
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Next Queues Section */}
            <Box sx={{ 
              borderTop: `3px solid ${currentDept.color}60`,
              pt: 3,
              textAlign: 'center'
            }}>
              <Typography 
                variant="h3" 
                fontWeight="bold" 
                color={currentDept.color} 
                sx={{ 
                  mb: 3,
                  fontSize: { xs: '2rem', md: '3rem' }
                }}
              >
                คิวถัดไป
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: { xs: 2, md: 4 }, 
                flexWrap: 'wrap',
                maxWidth: '100%'
              }}>
                {nextQueues.slice(0, 8).map((queue, index) => (
                  <Typography 
                    key={queue.id}
                    variant="h4" 
                    fontWeight="bold" 
                    color={index < 3 ? currentDept.color : 'text.secondary'}
                    sx={{ 
                      fontSize: { xs: '1.5rem', md: '2.5rem' },
                      opacity: index < 3 ? 1 : 0.7,
                      animation: queue.isUpdated ? 'blink 1s ease-in-out 3' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {queue.queue_code}
                  </Typography>
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>

      {/* CSS for animations */}
      <style>
        {`
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 ${currentDept.color}40;
            }
            70% {
              box-shadow: 0 0 0 30px ${currentDept.color}00;
            }
            100% {
              box-shadow: 0 0 0 0 ${currentDept.color}00;
            }
          }
          
          @keyframes blink {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.3;
              transform: scale(1.05);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default ShowQueue;
