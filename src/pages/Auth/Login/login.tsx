import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';
import axios from 'axios';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
      // ใช้ API URL จาก .env
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
   
      // เปลี่ยนเส้นทางไปหน้า Dashboard
      navigate('/');
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

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        padding: 2,
      }}
    >
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
        {/* ชื่อเว็บไซต์ */}
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          textAlign="center"
          sx={{
            fontWeight: 'bold',
            color: 'var(--accent-blue)',
            marginBottom: 3,
          }}
        >
         SM : Smart Patient
        </Typography>

        {/* แสดงข้อความ error */}
        {error && (
          <Alert severity="error" sx={{ marginBottom: 2 }}>
            {error}
          </Alert>
        )}

        {/* แบบฟอร์มเข้าสู่ระบบ */}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            variant="outlined"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              marginTop: 3,
              paddingY: 1.5,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 'bold',
              backgroundColor: '#1976d2',
              '&:hover': {
                backgroundColor: '#1565c0',
              },
            }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default LoginPage;
