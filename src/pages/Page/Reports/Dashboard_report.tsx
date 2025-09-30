import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { Skeleton } from '@mui/material';

interface DashboardData {
  totalPatients: number;
  emergencyCount: number;
  roomUtilization: number;
  triageLevels: Array<{
    level: number;
    count: number;
    color: string;
  }>;
  recentRooms: Array<{
    roomName: string;
    usageCount: number;
    lastUsed: string;
  }>;
  departmentData: Array<{
    department: string;
    departmentId: string;
    patients: number;
  }>;
  reportDate: string;
  reportType: string;
}

const DashboardReport: React.FC = () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('daily');

  const getDateRange = (type: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (type) {
      case 'daily':
        return todayStr;
      case 'weekly':
        // Start of current week (Monday)
        const startOfWeek = new Date(today);
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        return startOfWeek.toISOString().split('T')[0];
      case 'monthly':
        // Start of current month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return startOfMonth.toISOString().split('T')[0];
      default:
        return todayStr;
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const dateToSend = getDateRange(reportType);
      
      const response = await axios.get(`${API_BASE_URL}/api/reports/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          date: dateToSend,
          type: reportType
        }
      });
      
      setDashboardData(response.data);
    } catch (error: any) {
      setError(error.response?.data?.error || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [reportType]);

  // Default structure to show fields even when no data
  const defaultData: DashboardData = {
    totalPatients: 0,
    emergencyCount: 0,
    roomUtilization: 0,
    triageLevels: [
      { level: 1, count: 0, color: '#DC2626' },
      { level: 2, count: 0, color: '#F59E0B' },
      { level: 3, count: 0, color: '#EAB308' },
      { level: 4, count: 0, color: '#22C55E' },
      { level: 5, count: 0, color: '#3B82F6' }
    ],
    recentRooms: [],
    departmentData: [],
    reportDate: '',
    reportType: reportType
  };
  const data = dashboardData || defaultData;

  const getTriageLabel = (level: number) => {
    const labels: Record<number, string> = {
      1: 'วิกฤติ',
      2: 'เร่งด่วน',
      3: 'ปานกลาง',
      4: 'ไม่เร่งด่วน',
      5: 'ปกติ'
    };
    return `${level} ${labels[level] || 'ไม่ระบุ'}`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, md: { p: 6 } }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4, color: '#1976d2' }}>
          Dashboard รายงาน
        </Typography>

        {/* Filter Controls (disabled while loading) */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth disabled>
                <InputLabel>ประเภทรายงาน</InputLabel>
                <Select value={reportType} label="ประเภทรายงาน">
                  <MenuItem value="daily">วันนี้</MenuItem>
                  <MenuItem value="weekly">อาทิตย์นี้</MenuItem>
                  <MenuItem value="monthly">เดือนนี้</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Summary Cards Skeleton */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[...Array(3)].map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width={120} />
                  <Skeleton variant="rounded" height={36} width={120} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Triage Levels Skeleton */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
            การกระจายระดับคัดกรอง
          </Typography>
          <Grid container spacing={2}>
            {[1,2,3,4,5].map((lvl) => (
              <Grid item xs={12} sm={6} md={2.4} key={lvl}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width={80} />
                    <Skeleton variant="rounded" height={28} width={80} sx={{ mt: 1 }} />
                    <Skeleton variant="text" width={100} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Department Data Skeleton */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
            สถิติตามแผนก
          </Typography>
          <Grid container spacing={2}>
            {[...Array(6)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card variant="outlined">
                  <CardContent>
                    <Skeleton variant="text" width={160} />
                    <Skeleton variant="text" width={120} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Recent Room Usage Skeleton */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
            การใช้งานห้องตรวจล่าสุด (5 ห้อง)
          </Typography>
          <Grid container spacing={2}>
            {[...Array(5)].map((_, i) => (
              <Grid item xs={12} sm={6} md={2.4} key={i}>
                <Card variant="outlined" sx={{ textAlign: 'center' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Skeleton variant="text" width={120} sx={{ mx: 'auto' }} />
                    <Skeleton variant="rounded" height={36} width={60} sx={{ mx: 'auto', mt: 1 }} />
                    <Skeleton variant="text" width={80} sx={{ mx: 'auto' }} />
                    <Skeleton variant="text" width={140} sx={{ mx: 'auto' }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, md: { p: 6 } }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, color: '#1976d2' }}>
        Dashboard รายงาน
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filter Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>ประเภทรายงาน</InputLabel>
               <Select
                 value={reportType}
                 label="ประเภทรายงาน"
                 onChange={(e) => setReportType(e.target.value)}
               >
                 <MenuItem value="daily">วันนี้</MenuItem>
                 <MenuItem value="weekly">อาทิตย์นี้</MenuItem>
                 <MenuItem value="monthly">เดือนนี้</MenuItem>
               </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Always render structure; use zeros when no data */}
      {(
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    ผู้ป่วยทั้งหมด
                  </Typography>
                  <Typography variant="h4" component="div" color="primary">
                    {data.totalPatients}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    วิกฤติ
                  </Typography>
                  <Typography variant="h4" component="div" color="error">
                    {data.emergencyCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    คัดกรองผ่านแล้ว
                  </Typography>
                  <Typography variant="h4" component="div" color="success.main">
                    {data.roomUtilization}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Triage Levels */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
              การกระจายระดับคัดกรอง
            </Typography>
            <Grid container spacing={2}>
              {data.triageLevels.map((triage) => (
                <Grid item xs={12} sm={6} md={2.4} key={triage.level}>
                  <Card sx={{ backgroundColor: triage.color + '20', border: `2px solid ${triage.color}` }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ color: triage.color, fontWeight: 'bold' }}>
                        ระดับ {triage.level}
                      </Typography>
                      <Typography variant="h4" sx={{ color: triage.color }}>
                        {triage.count}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {getTriageLabel(triage.level)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Department Data */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
              สถิติตามแผนก
            </Typography>
            <Grid container spacing={2}>
              {data.departmentData.length > 0 ? data.departmentData.slice(0, 6).map((dept, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {dept.department || 'ไม่ระบุแผนก'}
                      </Typography>
                      <Typography color="textSecondary">
                        ผู้ป่วย: {dept.patients} คน
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )) : (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="textSecondary">
                        ไม่มีข้อมูลในช่วงเวลาที่เลือก
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Recent Room Usage */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
              การใช้งานห้องตรวจล่าสุด (5 ห้อง)
            </Typography>
            <Grid container spacing={2}>
              {data.recentRooms.length > 0 ? data.recentRooms.map((room, index) => (
                <Grid item xs={12} sm={6} md={2.4} key={index}>
                  <Card variant="outlined" sx={{ textAlign: 'center' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        {room.roomName}
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {room.usageCount}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        ครั้ง
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        ล่าสุด: {new Date(room.lastUsed).toLocaleDateString('th-TH')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )) : (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="textSecondary">
                        ไม่มีข้อมูลในช่วงเวลาที่เลือก
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default DashboardReport;
