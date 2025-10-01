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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { th } from 'date-fns/locale';
import { Skeleton } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

interface DashboardData {
  totalPatients: number;
  emergencyCount: number;
  roomUtilization: number; // เปลี่ยนจาก screenedPatients
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
  hourlyTrends: Array<{
    hour: number;
    count: number;
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const token = useMemo(() => localStorage.getItem('token') || '', []);

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
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const dateToSend = getDateRange(reportType);
      console.log('Fetching dashboard data with params:', { date: dateToSend, type: reportType });
      
      const response = await axios.get(`${API_BASE_URL}/api/reports/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          date: dateToSend,
          type: reportType,
          department: selectedDepartment !== 'all' ? selectedDepartment : undefined
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('Dashboard API response:', response.data);
      setDashboardData(response.data);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      
      // Show specific error message for debugging
      if (error.response?.status === 401) {
        setError('Authentication failed. Please login again.');
      } else if (error.response?.status === 404) {
        setError('Dashboard API endpoint not found.');
      } else if (error.code === 'NETWORK_ERROR') {
        setError('Network connection error.');
      } else {
        setError(`API Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [reportType, selectedDate, selectedDepartment]);

  const exportDepartmentExcel = () => {
    if (!dashboardData) return;
    try {
      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = data.departmentData.map((dept, index) => ({
        'ลำดับ': index + 1,
        'ชื่อแผนก': dept.department || 'ไม่ระบุแผนก',
        'จำนวนผู้ป่วย': dept.patients
      }));
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูลแผนก');
      
      // Generate Excel file and download
      XLSX.writeFile(wb, `department-data-${reportType}-${selectedDate?.toISOString().split('T')[0] || 'today'}.xlsx`);
    } catch (err) {
      console.error('Export Department Excel failed', err);
    }
  };

  const exportRoomsExcel = () => {
    if (!dashboardData) return;
    try {
      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = data.recentRooms.map((room, index) => ({
        'ลำดับ': index + 1,
        'ชื่อห้อง': room.roomName,
        'จำนวนการใช้งาน': room.usageCount,
        'ใช้งานล่าสุด': new Date(room.lastUsed).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }));
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูลห้องตรวจ');
      
      // Generate Excel file and download
      XLSX.writeFile(wb, `room-usage-${reportType}-${selectedDate?.toISOString().split('T')[0] || 'today'}.xlsx`);
    } catch (err) {
      console.error('Export Rooms Excel failed', err);
    }
  };

  const exportHourlyExcel = () => {
    if (!dashboardData) return;
    try {
      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = data.hourlyTrends.map((trend, index) => ({
        'ลำดับ': index + 1,
        'ชั่วโมง': `${trend.hour.toString().padStart(2, '0')}:00`,
        'จำนวนผู้ป่วย': trend.count
      }));
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูลรายชั่วโมง');
      
      // Generate Excel file and download
      XLSX.writeFile(wb, `hourly-trends-${reportType}-${selectedDate?.toISOString().split('T')[0] || 'today'}.xlsx`);
    } catch (err) {
      console.error('Export Hourly Trends Excel failed', err);
    }
  };

  const exportComprehensiveExcel = async () => {
    if (!dashboardData) return;
    try {
      const startDate = selectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
      
      // Always try local generation first to ensure consistency
      console.log('Current data state:', {
        totalPatients: data.totalPatients,
        departmentCount: data.departmentData?.length || 0,
        roomCount: data.recentRooms?.length || 0,
        hourlyCount: data.hourlyTrends?.length || 0,
        triageCount: data.triageLevels?.length || 0
      });
      
      generateLocalComprehensiveExcel(startDate);
      
      // Try backend for additional download option
      try {
        const response = await axios.get(`${API_BASE_URL}/api/reports/dashboard/export/excel`, {
          params: {
            start_date: startDate,
            end_date: startDate
          },
          headers: {
            'Authorization': `Bearer ${token}`
          },
          responseType: 'blob',
          timeout: 30000
        });

        // If backend works, offer it as alternative download
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backend-comprehensive-report-${startDate}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (backendError) {
        console.log('Backend not available, using local generation only:', backendError);
      }
    } catch (err: any) {
      console.error('Export Comprehensive Excel failed', err);
      setError(`ไม่สามารถส่งออกรายงานได้: ${err.message || 'Unknown error'}`);
    }
  };

  const generateLocalComprehensiveExcel = (startDate: string) => {
    try {
      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      
      // Summary sheet
      const summaryData = [
        { 'รายการ': 'ผู้ป่วยทั้งหมด', 'ค่า': data.totalPatients },
        { 'รายการ': 'ผู้ป่วยวิกฤติ', 'ค่า': data.emergencyCount },
        { 'รายการ': 'การใช้งานห้อง', 'ค่า': data.roomUtilization },
        { 'รายการ': 'วันที่รายงาน', 'ค่า': startDate },
        { 'รายการ': 'เวลาที่สร้าง', 'ค่า': new Date().toLocaleString('th-TH') }
      ];
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'สรุปข้อมูล');
      
      // Department sheet
      console.log('Department data:', data.departmentData);
      let deptData = [];
      if (data.departmentData && data.departmentData.length > 0) {
        deptData = data.departmentData.map((dept, index) => ({
          'ลำดับ': index + 1,
          'ชื่อแผนก': dept.department || 'ไม่ระบุแผนก',
          'จำนวนผู้ป่วย': dept.patients
        }));
      } else {
        // Create empty row if no data
        deptData = [{ 'ลำดับ': '-', 'ชื่อแผนก': 'ไม่มีข้อมูล', 'จำนวนผู้ป่วย': 0 }];
      }
      const deptWs = XLSX.utils.json_to_sheet(deptData);
      XLSX.utils.book_append_sheet(wb, deptWs, 'ข้อมูลแผนก');
      
      // Room sheet
      console.log('Room data:', data.recentRooms);
      let roomData = [];
      if (data.recentRooms && data.recentRooms.length > 0) {
        roomData = data.recentRooms.map((room, index) => ({
          'ลำดับ': index + 1,
          'ชื่อห้อง': room.roomName,
          'จำนวนการใช้งาน': room.usageCount,
          'ใช้งานล่าสุด': new Date(room.lastUsed).toLocaleDateString('th-TH')
        }));
      } else {
        // Create empty row if no data
        roomData = [{ 'ลำดับ': '-', 'ชื่อห้อง': 'ไม่มีข้อมูล', 'จำนวนการใช้งาน': 0, 'ใช้งานล่าสุด': '-' }];
      }
      const roomWs = XLSX.utils.json_to_sheet(roomData);
      XLSX.utils.book_append_sheet(wb, roomWs, 'ข้อมูลห้องตรวจ');
      
      // Hourly sheet
      console.log('Hourly data:', data.hourlyTrends);
      let hourlyData = [];
      if (data.hourlyTrends && data.hourlyTrends.length > 0) {
        hourlyData = data.hourlyTrends.map((trend, index) => ({
          'ลำดับ': index + 1,
          'ชั่วโมง': `${trend.hour.toString().padStart(2, '0')}:00`,
          'จำนวนผู้ป่วย': trend.count
        }));
      } else {
        // Create sample hourly data if empty
        hourlyData = [];
        for (let hour = 0; hour < 24; hour++) {
          hourlyData.push({
            'ลำดับ': hour + 1,
            'ชั่วโมง': `${hour.toString().padStart(2, '0')}:00`,
            'จำนวนผู้ป่วย': 0
          });
        }
      }
      const hourlyWs = XLSX.utils.json_to_sheet(hourlyData);
      XLSX.utils.book_append_sheet(wb, hourlyWs, 'ข้อมูลรายชั่วโมง');
      
      // Triage sheet
      console.log('Triage data:', data.triageLevels);
      let triageData = [];
      if (data.triageLevels && data.triageLevels.length > 0) {
        triageData = data.triageLevels.map((triage, index) => ({
          'ลำดับ': index + 1,
          'ระดับความรุนแรง': `ระดับ ${triage.level}`,
          'จำนวนผู้ป่วย': triage.count
        }));
      } else {
        // Create default triage levels if empty
        triageData = [
          { 'ลำดับ': 1, 'ระดับความรุนแรง': 'ระดับ 1 (วิกฤติ)', 'จำนวนผู้ป่วย': 0 },
          { 'ลำดับ': 2, 'ระดับความรุนแรง': 'ระดับ 2 (เร่งด่วน)', 'จำนวนผู้ป่วย': 0 },
          { 'ลำดับ': 3, 'ระดับความรุนแรง': 'ระดับ 3 (ปานกลาง)', 'จำนวนผู้ป่วย': 0 },
          { 'ลำดับ': 4, 'ระดับความรุนแรง': 'ระดับ 4 (ไม่เร่งด่วน)', 'จำนวนผู้ป่วย': 0 },
          { 'ลำดับ': 5, 'ระดับความรุนแรง': 'ระดับ 5 (ทั่วไป)', 'จำนวนผู้ป่วย': 0 }
        ];
      }
      const triageWs = XLSX.utils.json_to_sheet(triageData);
      XLSX.utils.book_append_sheet(wb, triageWs, 'ข้อมูล Triage');
      
      // Generate and download Excel file
      XLSX.writeFile(wb, `comprehensive-dashboard-report-${startDate}.xlsx`);
      
      console.log('Excel file generated successfully with all sheets');
    } catch (err) {
      console.error('Local Excel generation failed', err);
      setError('ไม่สามารถสร้างไฟล์ Excel ได้');
    }
  };

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
    hourlyTrends: [],
    reportDate: '',
    reportType: reportType
  };
  
  // Merge with defaultData to ensure all fields exist
  const data = dashboardData ? {
    ...defaultData,
    ...dashboardData,
    triageLevels: dashboardData.triageLevels || defaultData.triageLevels,
    recentRooms: dashboardData.recentRooms || [],
    departmentData: dashboardData.departmentData || [],
    hourlyTrends: dashboardData.hourlyTrends || []
  } : defaultData;

  // Debug log to check data
  console.log('Current merged data:', {
    totalPatients: data.totalPatients,
    departmentData: data.departmentData,
    recentRooms: data.recentRooms,
    hourlyTrends: data.hourlyTrends,
    triageLevels: data.triageLevels
  });


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
              onClick={exportComprehensiveExcel}
              disabled={!dashboardData || loading}
              startIcon={<Download />}
              fullWidth
            >
              ส่งออก Excel ครบถ้วน
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
                    การใช้งานห้อง
                  </Typography>
                  <Typography variant="h3" component="div" color="success.main" sx={{ fontWeight: 'bold' }}>
                    {data.roomUtilization}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    ครั้ง
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Hourly Trends Chart */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ 
                fontWeight: 'bold', 
                color: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                padding: '8px 12px',
                borderRadius: '4px'
              }}>
                การเข้ารับบริการรายชั่วโมง
              </Typography>
              <Button
                variant="outlined"
                color="success"
                onClick={() => exportHourlyExcel()}
                startIcon={<Download />}
                size="small"
              >
                Export Excel
              </Button>
            </Box>
            
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.hourlyTrends.map(trend => ({
                    hour: `${trend.hour.toString().padStart(2, '0')}:00`,
                    count: trend.count
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    label={{ value: 'จำนวนผู้ป่วย', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    labelStyle={{ color: '#1976d2' }}
                    contentStyle={{ 
                      backgroundColor: '#f5f5f5', 
                      border: '1px solid #1976d2',
                      borderRadius: '4px'
                    }}
                    formatter={(value: any) => [`${value} คน`, 'จำนวนผู้ป่วย']}
                    labelFormatter={(label: any) => `เวลา ${label}`}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#1976d2" 
                    radius={[4, 4, 0, 0]}
                    name="จำนวนผู้ป่วย"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          {/* Department Data Table */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ 
                color: '#1976d2',
                fontWeight: 'bold',
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                padding: '8px 12px',
                borderRadius: '4px'
              }}>
                แผนกที่ได้รับผู้ป่วยมากที่สุด
              </Typography>
              <Button
                variant="outlined"
                color="success"
                onClick={() => exportDepartmentExcel()}
                startIcon={<Download />}
                size="small"
              >
                Export Excel
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.08)' }}>
                    <TableCell><strong>ลำดับ</strong></TableCell>
                    <TableCell><strong>ชื่อแผนก</strong></TableCell>
                    <TableCell align="right"><strong>จำนวนผู้ป่วย</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.departmentData?.length > 0 ? data.departmentData.map((dept, index) => {
                    return (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{dept.department || 'ไม่ระบุแผนก'}</TableCell>
                        <TableCell align="right">{dept.patients} คน</TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography color="textSecondary">
                          ไม่มีข้อมูลในช่วงเวลาที่เลือก
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>


          {/* Recent Room Usage Table */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ 
                color: '#1976d2',
                fontWeight: 'bold',
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                padding: '8px 12px',
                borderRadius: '4px'
              }}>
                การใช้งานห้องตรวจล่าสุด (5 ห้อง)
              </Typography>
              <Button
                variant="outlined"
                color="success"
                onClick={() => exportRoomsExcel()}
                startIcon={<Download />}
                size="small"
              >
                Export Excel
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.08)' }}>
                    <TableCell><strong>ลำดับ</strong></TableCell>
                    <TableCell><strong>ชื่อห้อง</strong></TableCell>
                    <TableCell align="right"><strong>จำนวนการใช้งาน</strong></TableCell>
                    <TableCell align="center"><strong>ใช้งานล่าสุด</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recentRooms?.length > 0 ? data.recentRooms.map((room, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{room.roomName}</TableCell>
                      <TableCell align="right">{room.usageCount} ครั้ง</TableCell>
                      <TableCell align="center">
                        {new Date(room.lastUsed).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="textSecondary">
                          ไม่มีข้อมูลในช่วงเวลาที่เลือก
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default DashboardReport;
