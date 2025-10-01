import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@mui/system';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Alert,
  AppBar,
  Toolbar,
  Container,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { HealthAndSafety, MonitorHeart, Verified, QueuePlayNext } from '@mui/icons-material';
import axios from 'axios';

// CSS Animation
const bounceAnimation = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
`;

// Mock data สำหรับ user ตัวอย่าง (สำหรับการทำงานแบบออฟไลน์)
const MOCK_USERS = {
  'testadmin': {
    _id: 'mock_admin_001',
    username: 'testadmin',
    role: 'admin',
    password: 'testpassword'
  },
  'testdoctor': {
    _id: 'mock_doctor_001', 
    username: 'testdoctor',
    role: 'doctor',
    password: 'testpassword'
  },
  'testnurse': {
    _id: 'mock_nurse_001',
    username: 'testnurse', 
    role: 'nurse',
    password: 'testpassword'
  }
};

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [displayMenuAnchor, setDisplayMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  // ตรวจสอบสถานะการเข้าสู่ระบบเมื่อโหลดหน้า
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // ถ้ามี token ให้ redirect ไปที่หน้า /
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      // ตรวจสอบ mock users ก่อน (สำหรับการทำงานแบบออฟไลน์)
      if (MOCK_USERS[username as keyof typeof MOCK_USERS] && 
          MOCK_USERS[username as keyof typeof MOCK_USERS].password === password) {
        
        const mockUser = MOCK_USERS[username as keyof typeof MOCK_USERS];
        console.log('Offline login successful:', mockUser);
        
        // สร้าง mock token สำหรับการทำงานแบบออฟไลน์
        const mockToken = `mock_token_${mockUser._id}_${Date.now()}`;
        
        // บันทึก token และ user ลงใน localStorage
        localStorage.setItem('token', mockToken);
        localStorage.setItem('userData', JSON.stringify({
          _id: mockUser._id,
          username: mockUser.username,
          role: mockUser.role
        }));
        
        console.log('Stored mock user data:', mockUser);
        
        // แสดง modal สำเร็จ
        setSuccessModalOpen(true);
        return;
      }

      // ถ้าไม่ใช่ mock user ให้ลองเชื่อมต่อกับ backend
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      console.log('API URL:', apiUrl);
     
      // ใช้ axios.post สำหรับการเข้าสู่ระบบ
      const response = await axios.post(`${apiUrl}/api/auth/login`, {
        username,
        password
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = response.data;
     
      console.log('Login successful:', data);
   
      // บันทึก token และ user ลงใน localStorage
      localStorage.setItem('token', data.token);
      
      // เก็บข้อมูลผู้ใช้
      localStorage.setItem('userData', JSON.stringify({
        _id: data.user._id,
        username: data.user.username,
        role: data.user.role
      }));
      
      console.log('Stored user data:', data.user);
   
      // แสดง modal สำเร็จ
      setSuccessModalOpen(true);
    } catch (err: any) {
      console.error('Error during login:', err);
     
      // จัดการกับข้อผิดพลาดจาก axios
      if (axios.isAxiosError(err)) {
        if (err.response) {
          setError(err.response.data.error || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        } else if (err.request) {
          setError('ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ');
        } else {
          setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        }
      } else {
        setError('เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setSuccessModalOpen(false);
    navigate('/');
  };

  const handleDisplayMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setDisplayMenuAnchor(event.currentTarget);
  };

  const handleDisplayMenuClose = () => {
    setDisplayMenuAnchor(null);
  };

  const handleDisplayMenuNavigate = (path: string) => {
    setDisplayMenuAnchor(null);
    window.open(path, '_blank');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header/Navbar */}
      <AppBar position="static" sx={{ backgroundColor: 'var(--primary-dark)' }}>
        <Toolbar>
          <HealthAndSafety sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            SM : Smart Patient
          </Typography>
          
          {/* การแสดงผล Menu */}
          <Button
            color="inherit"
            onClick={handleDisplayMenuClick}
            startIcon={<MonitorHeart />}
            sx={{ 
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            การแสดงผล
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: 'var(--bg-primary)',
        padding: 2
      }}>
        <Paper
          elevation={4}
          sx={{
            padding: 4,
            width: '100%',
            maxWidth: 400,
            borderRadius: 3,
            boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)',
            backgroundColor: 'var(--primary-light)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ 
              fontWeight: 'bold', 
              color: 'var(--accent-blue)' 
            }}>
              เข้าสู่ระบบ
            </Typography>
          </Box>

          {/* แสดงข้อความ error */}
          {error && (
            <Alert severity="error" sx={{ marginBottom: 2 }}>
              {error}
            </Alert>
          )}

          {/* ฟอร์มเข้าสู่ระบบ */}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="ชื่อผู้ใช้"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="รหัสผ่าน"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ 
                mt: 2, 
                mb: 2, 
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  กำลังเข้าสู่ระบบ...
                </Box>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </Button>
          </Box>

        
        </Paper>
      </Box>

      {/* Footer */}
      <Box 
        component="footer" 
        sx={{ 
          backgroundColor: 'var(--primary-dark)', 
          color: 'var(--bg-primary)',
          py: 2,
          mt: 'auto'
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.8 }}>
            © 2024 Smart Patient System. All rights reserved.
          </Typography>
        </Container>
      </Box>

      {/* Success Modal */}
      <Dialog
        open={successModalOpen}
        onClose={handleSuccessModalClose}
        aria-labelledby="success-dialog-title"
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden'
          }
        }}
      >
        <Box sx={{ 
          background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
          color: 'white',
          p: 3,
          textAlign: 'center'
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mb: 2,
            animation: `${bounceAnimation} 0.6s ease-in-out`
          }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem'
            }}>
              ✅
            </Box>
          </Box>
          <Typography variant="h4" component="h2" sx={{ 
            fontWeight: 'bold',
            mb: 1,
            textShadow: '0px 2px 4px rgba(0,0,0,0.3)'
          }}>
            เข้าสู่ระบบสำเร็จ!
          </Typography>
          <Typography variant="h6" sx={{ 
            opacity: 0.9,
            fontWeight: 400
          }}>
            ยินดีต้อนรับสู่ระบบ Smart Patient
          </Typography>
        </Box>
        
        <DialogContent sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ 
            color: 'text.secondary',
            mb: 3,
            lineHeight: 1.6
          }}>
            คุณได้เข้าสู่ระบบเรียบร้อยแล้ว<br />
            พร้อมใช้งานระบบจัดการผู้ป่วยอัจฉริยะ
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 2,
            flexWrap: 'wrap'
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              px: 2,
              py: 1,
              backgroundColor: '#f5f5f5',
              borderRadius: 2,
              minWidth: 120
            }}>
              <HealthAndSafety sx={{ color: 'var(--accent-blue)', fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                ระบบพร้อมใช้งาน
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ 
          justifyContent: 'center', 
          pb: 3,
          px: 4,
          gap: 2
        }}>
          <Button 
            onClick={handleSuccessModalClose} 
            variant="contained" 
            size="large"
            sx={{ 
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              borderRadius: 2,
              background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              boxShadow: '0px 4px 12px rgba(25, 118, 210, 0.3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
                boxShadow: '0px 6px 16px rgba(25, 118, 210, 0.4)',
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            🚀 เริ่มใช้งาน
          </Button>
        </DialogActions>
      </Dialog>

      {/* การแสดงผล Menu */}
      <Menu
        anchorEl={displayMenuAnchor}
        open={Boolean(displayMenuAnchor)}
        onClose={handleDisplayMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
            borderRadius: 2,
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }
        }}
      >
        <MenuItem 
          onClick={() => handleDisplayMenuNavigate('/Screening/AuthenPatient')}
          sx={{ 
            py: 1.5,
            '&:hover': {
              backgroundColor: 'var(--hover-overlay)'
            }
          }}
        >
          <ListItemIcon>
            <Verified sx={{ color: 'var(--accent-blue)' }} />
          </ListItemIcon>
          <ListItemText 
            primary="ยืนยันตัวตน" 
            secondary="หน้าจอยืนยันตัวตนผู้ป่วย (หน้าใหม่)"
            primaryTypographyProps={{ fontWeight: 'bold' }}
            secondaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
          />
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleDisplayMenuNavigate('/queue/showqueue')}
          sx={{ 
            py: 1.5,
            '&:hover': {
              backgroundColor: 'var(--hover-overlay)'
            }
          }}
        >
          <ListItemIcon>
            <QueuePlayNext sx={{ color: 'var(--accent-green)' }} />
          </ListItemIcon>
          <ListItemText 
            primary="แสดงคิว" 
            secondary="หน้าจอแสดงคิวผู้ป่วย"
            primaryTypographyProps={{ fontWeight: 'bold' }}
            secondaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default LoginPage;
