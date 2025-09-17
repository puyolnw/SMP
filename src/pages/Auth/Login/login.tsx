import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // ใช้ useNavigate สำหรับการเปลี่ยนเส้นทาง
import { Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';
//import axios from 'axios'; // เพิ่ม import axios

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // ใช้ navigate เพื่อเปลี่ยนเส้นทาง

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

    // Bypass authentication - allow any username/password combination
    try {
      // Simulate a successful login response
      const mockResponse = {
        token: 'mock-token-' + Date.now(),
        user: {
          id: 1,
          username: username || 'guest',
          role: 'user',
          branchid: '001' // Default branch ID
        }
      };

      console.log('Mock login successful:', mockResponse);
   
      // บันทึก token และ user ลงใน localStorage
      localStorage.setItem('token', mockResponse.token); // เก็บ token
      
      // เก็บข้อมูลผู้ใช้ (รวมถึง branchid)
      localStorage.setItem('user', JSON.stringify({
        id: mockResponse.user.id,
        username: mockResponse.user.username,
        role: mockResponse.user.role,
        branchid: mockResponse.user.branchid // เพิ่ม branchid ในข้อมูลที่เก็บ
      }));
      
      // Log เพื่อตรวจสอบว่า branchid ถูกเก็บหรือไม่
      console.log('Stored user data:', {
        id: mockResponse.user.id,
        username: mockResponse.user.username,
        role: mockResponse.user.role,
        branchid: mockResponse.user.branchid
      });
   
      // เปลี่ยนเส้นทางไปหน้า Dashboard
      navigate('/');
    } catch (err) {
      console.error('Error during login:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }

    // Original API call code (commented out for bypass)
    /*
    try {
      // ใช้ API URL จาก .env
      const apiUrl = import.meta.env.VITE_API_URL;
      console.log('API URL:', apiUrl); // แสดง API URL ที่ใช้
     
      // ใช้ axios.post แทน fetch
      const response = await axios.post(`${apiUrl}/login`, {
        username,
        password
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // axios จะจัดการ JSON parsing ให้อัตโนมัติ
      const data = response.data;
     
      console.log('Login successful:', data);
   
      // บันทึก token และ user ลงใน localStorage
      localStorage.setItem('token', data.token); // เก็บ token
      
      // เก็บข้อมูลผู้ใช้ (รวมถึง branchid)
      localStorage.setItem('user', JSON.stringify({
        id: data.user.id,
        username: data.user.username,
        role: data.user.role,
        branchid: data.user.branchid // เพิ่ม branchid ในข้อมูลที่เก็บ
      }));
      
      // Log เพื่อตรวจสอบว่า branchid ถูกเก็บหรือไม่
      console.log('Stored user data:', {
        id: data.user.id,
        username: data.user.username,
        role: data.user.role,
        branchid: data.user.branchid
      });
   
      // เปลี่ยนเส้นทางไปหน้า Dashboard
      navigate('/');
    } catch (err) {
      console.error('Error during login:', err);
     
      // จัดการกับข้อผิดพลาดจาก axios
      if (axios.isAxiosError(err)) {
        // ถ้ามีข้อมูล response จาก server
        if (err.response) {
          setError(err.response.data.error || 'Login failed. Please try again.');
        } else if (err.request) {
          // ถ้าส่งคำขอแล้วแต่ไม่ได้รับการตอบกลับ
          setError('No response from server. Please check your connection.');
        } else {
          // มีข้อผิดพลาดอื่นๆ
          setError('An error occurred. Please try again later.');
        }
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
    */
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)', // ใช้สีพื้นหลังจาก theme.css
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
          boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)', // เพิ่มเงาให้ดูเด่น
          backgroundColor: 'var(--primary-light)', // ใช้สีพื้นหลังของ Paper
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
            color: 'var(--accent-blue)', // ใช้สีจาก theme.css
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
            placeholder="Enter any username"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: 'var(--font-primary)', // ใช้ฟอนต์จาก theme.css
              },
            }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            variant="outlined"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter any password"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: 'var(--font-primary)', // ใช้ฟอนต์จาก theme.css
              },
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading} // ปิดปุ่มขณะกำลังโหลด
            sx={{
              marginTop: 3,
              paddingY: 1.5,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 'bold',
              backgroundColor: 'var(--accent-blue)', // ใช้สีจาก theme.css
              '&:hover': {
                backgroundColor: 'var(--accent-green)', // ใช้สี hover จาก theme.css
              },
            }}
          >
            {loading ? 'Logging in...' : 'Login (Bypass Mode)'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default LoginPage;
