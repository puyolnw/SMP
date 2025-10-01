import React, { useState, useEffect, useMemo } from 'react';
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
  Alert,
  Button,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { th } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@mui/material';

interface DashboardData {
  totalPatients: number;
  emergencyCount: number;
  screenedPatients: number;
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
  screeningStats: {
    totalScreened: number;
    averageScreeningTime: number;
    mostCommonSymptoms: Array<{
      symptom: string;
      count: number;
    }>;
    screeningTrends: Array<{
      hour: number;
      count: number;
    }>;
  };
  reportDate: string;
  reportType: string;
}

const DashboardReport: React.FC = () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('daily');
  const [useMockData, setUseMockData] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  // Mock data สำหรับการทดสอบ
  const MOCK_DASHBOARD_DATA: DashboardData = {
    totalPatients: 156,
    emergencyCount: 23,
    screenedPatients: 133,
    triageLevels: [
      { level: 1, count: 8, color: '#DC2626' },
      { level: 2, count: 15, color: '#F59E0B' },
      { level: 3, count: 45, color: '#EAB308' },
      { level: 4, count: 67, color: '#22C55E' },
      { level: 5, count: 21, color: '#3B82F6' }
    ],
    recentRooms: [
      { roomName: 'ห้องฉุกเฉิน 1', usageCount: 28, lastUsed: '2024-01-15T14:30:00Z' },
      { roomName: 'ห้องตรวจทั่วไป 2', usageCount: 24, lastUsed: '2024-01-15T13:45:00Z' },
      { roomName: 'ห้องตรวจเด็ก', usageCount: 19, lastUsed: '2024-01-15T12:20:00Z' },
      { roomName: 'ห้องตรวจผู้สูงอายุ', usageCount: 16, lastUsed: '2024-01-15T11:15:00Z' },
      { roomName: 'ห้องตรวจผู้ป่วยนอก', usageCount: 12, lastUsed: '2024-01-15T10:30:00Z' }
    ],
    departmentData: [
      { department: 'แผนกอายุรกรรม', departmentId: 'dept_001', patients: 45 },
      { department: 'แผนกศัลยกรรม', departmentId: 'dept_002', patients: 38 },
      { department: 'แผนกกุมารเวชกรรม', departmentId: 'dept_003', patients: 32 },
      { department: 'แผนกสูติ-นรีเวชกรรม', departmentId: 'dept_004', patients: 28 },
      { department: 'แผนกจักษุวิทยา', departmentId: 'dept_005', patients: 15 },
      { department: 'แผนกหูคอจมูก', departmentId: 'dept_006', patients: 12 }
    ],
    screeningStats: {
      totalScreened: 133,
      averageScreeningTime: 8.5,
      mostCommonSymptoms: [
        { symptom: 'ปวดศีรษะ', count: 28 },
        { symptom: 'เจ็บหน้าอก', count: 22 },
        { symptom: 'หายใจลำบาก', count: 18 },
        { symptom: 'ปวดท้อง', count: 15 },
        { symptom: 'ไข้สูง', count: 12 },
        { symptom: 'เวียนศีรษะ', count: 10 }
      ],
      screeningTrends: [
        { hour: 8, count: 12 },
        { hour: 9, count: 18 },
        { hour: 10, count: 25 },
        { hour: 11, count: 22 },
        { hour: 12, count: 15 },
        { hour: 13, count: 8 },
        { hour: 14, count: 20 },
        { hour: 15, count: 28 },
        { hour: 16, count: 24 },
        { hour: 17, count: 18 },
        { hour: 18, count: 12 },
        { hour: 19, count: 8 }
      ]
    },
    reportDate: new Date().toISOString().split('T')[0],
    reportType: 'daily'
  };

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
      
      // ถ้าเลือกใช้ mock data
      if (useMockData) {
        console.log('Using mock data for dashboard');
        
        // Filter data based on selected department
        let filteredData = { ...MOCK_DASHBOARD_DATA };
        
        if (selectedDepartment !== 'all') {
          // Filter department data
          const filteredDeptData = MOCK_DASHBOARD_DATA.departmentData.filter(
            dept => dept.departmentId === selectedDepartment
          );
          
          // Calculate new totals based on filtered department
          const totalPatients = filteredDeptData.reduce((sum, dept) => sum + dept.patients, 0);
          const emergencyCount = Math.floor(totalPatients * 0.15); // 15% emergency
          const screenedPatients = Math.floor(totalPatients * 0.85); // 85% screened
          
          filteredData = {
            ...MOCK_DASHBOARD_DATA,
            totalPatients,
            emergencyCount,
            screenedPatients,
            departmentData: filteredDeptData,
            reportType: reportType,
            reportDate: getDateRange(reportType)
          };
        } else {
          filteredData = {
            ...MOCK_DASHBOARD_DATA,
            reportType: reportType,
            reportDate: getDateRange(reportType)
          };
        }
        
        setDashboardData(filteredData);
        setLoading(false);
        return;
      }
      
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
      console.error('Error fetching dashboard data:', error);
      
      // ใช้ mock data เมื่อไม่สามารถเชื่อมต่อกับ backend ได้
      console.log('Using mock data for dashboard (fallback)');
      setDashboardData({
        ...MOCK_DASHBOARD_DATA,
        reportType: reportType,
        reportDate: getDateRange(reportType)
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [reportType, useMockData, selectedDate, selectedDepartment]);

  const exportExcel = async () => {
    if (!dashboardData) return;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/reports/dashboard/export/excel`,
        { 
          dashboardData: dashboardData,
          reportType: reportType,
          selectedDate: selectedDate?.toISOString().split('T')[0],
          selectedDepartment: selectedDepartment
        },
        { 
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          }, 
          responseType: 'blob' 
        }
      );
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screening-report-${reportType}-${selectedDate?.toISOString().split('T')[0] || 'today'}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export Excel failed', err);
    }
  };

  // Default structure to show fields even when no data
  const defaultData: DashboardData = {
    totalPatients: 0,
    emergencyCount: 0,
    screenedPatients: 0,
    triageLevels: [
      { level: 1, count: 0, color: '#DC2626' },
      { level: 2, count: 0, color: '#F59E0B' },
      { level: 3, count: 0, color: '#EAB308' },
      { level: 4, count: 0, color: '#22C55E' },
      { level: 5, count: 0, color: '#3B82F6' }
    ],
    recentRooms: [],
    departmentData: [],
    screeningStats: {
      totalScreened: 0,
      averageScreeningTime: 0,
      mostCommonSymptoms: [],
      screeningTrends: []
    },
    reportDate: '',
    reportType: reportType
  };
  const data = dashboardData || defaultData;


  if (loading) {
    return (
      <Box sx={{ p: 4, md: { p: 6 } }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4, color: '#1976d2' }}>
          รายงานการคัดกรอง
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
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Skeleton variant="text" width={120} sx={{ mx: 'auto' }} />
                  <Skeleton variant="rounded" height={48} width={120} sx={{ mt: 1, mx: 'auto' }} />
                  <Skeleton variant="text" width={60} sx={{ mt: 1, mx: 'auto' }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Patient Activity Chart Skeleton */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
            จำนวนผู้ป่วยในแต่ละเวลา
          </Typography>
          <Box sx={{ height: 400, width: '100%' }}>
            <Skeleton variant="rectangular" height={400} width="100%" />
          </Box>
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
        รายงานการคัดกรอง
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filter Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
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
          <Grid item xs={12} sm={6} md={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
              <DatePicker
                label="เลือกวันที่"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>แผนก</InputLabel>
              <Select
                value={selectedDepartment}
                label="แผนก"
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value="dept_001">แผนกอายุรกรรม</MenuItem>
                <MenuItem value="dept_002">แผนกศัลยกรรม</MenuItem>
                <MenuItem value="dept_003">แผนกกุมารเวชกรรม</MenuItem>
                <MenuItem value="dept_004">แผนกสูติ-นรีเวชกรรม</MenuItem>
                <MenuItem value="dept_005">แผนกจักษุวิทยา</MenuItem>
                <MenuItem value="dept_006">แผนกหูคอจมูก</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={useMockData}
                  onChange={(e) => setUseMockData(e.target.checked)}
                  color="primary"
                />
              }
              label="Mock Data"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              onClick={fetchDashboardData}
              disabled={loading}
              fullWidth
            >
              {loading ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              color="success"
              onClick={exportExcel}
              disabled={!dashboardData || loading}
              startIcon={<Download />}
              fullWidth
            >
              ส่งออก Excel
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Always render structure; use zeros when no data */}
      {(
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    ผู้ป่วยทั้งหมด
                  </Typography>
                  <Typography variant="h3" component="div" color="primary" sx={{ fontWeight: 'bold' }}>
                    {data.totalPatients}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    คน
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    วิกฤติ
                  </Typography>
                  <Typography variant="h3" component="div" color="error" sx={{ fontWeight: 'bold' }}>
                    {data.emergencyCount}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    คน
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    คัดกรองผ่านแล้ว
                  </Typography>
                  <Typography variant="h3" component="div" color="success.main" sx={{ fontWeight: 'bold' }}>
                    {data.screenedPatients}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    คน
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Patient Activity Chart */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
              จำนวนผู้ป่วยในแต่ละเวลา
            </Typography>
            <Box sx={{ height: 400, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.screeningStats.screeningTrends}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(value) => `${value}:00`}
                    label={{ value: 'เวลา', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'จำนวนผู้ป่วย', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    labelFormatter={(value) => `เวลา ${value}:00 - ${value + 1}:00`}
                    formatter={(value) => [`${value} คน`, 'จำนวนผู้ป่วย']}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#1976d2" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          {/* Screening Statistics */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
              สถิติการคัดกรอง
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      จำนวนการคัดกรองทั้งหมด
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {data.screeningStats.totalScreened}
                    </Typography>
                    <Typography color="textSecondary">
                      ครั้ง
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      เวลาเฉลี่ยการคัดกรอง
                    </Typography>
                    <Typography variant="h4" color="secondary">
                      {data.screeningStats.averageScreeningTime}
                    </Typography>
                    <Typography color="textSecondary">
                      นาที
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          {/* Most Common Symptoms */}
          {data.screeningStats.mostCommonSymptoms.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                อาการที่พบบ่อยที่สุด
              </Typography>
              <Grid container spacing={2}>
                {data.screeningStats.mostCommonSymptoms.slice(0, 6).map((symptom, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {symptom.symptom}
                        </Typography>
                        <Typography color="textSecondary">
                          {symptom.count} ครั้ง
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Department Data */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
              แผนกที่ได้รับผู้ป่วยมากที่สุด
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
