import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser } from '../../../utils/auth';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Alert,
  Skeleton
} from '@mui/material';
import { Search, Download } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { th } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface TreatmentRecord {
  _id: string;
  patientName: string;
  patientId: string;
  hn: string;
  visitDate: string;
  visitTime: string;
  chiefComplaint: string;
  presentIllness: string;
  physicalExam: string;
  vitalSigns: {
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    respiratoryRate: string;
    oxygenSaturation: string;
    weight: string;
    height: string;
  };
  diagnosis: string;
  treatmentPlan: string;
  medications: string[];
  labResults: string[];
  followUp: string;
  notes: string;
  doctorName: string;
  departmentName: string;
  roomName: string;
  status: 'completed' | 'ongoing' | 'cancelled';
}

interface DoctorData {
  doctorId: string;
  employeeId: string;
  prefix: string;
  firstNameTh: string;
  lastNameTh: string;
  position: string;
  specialties: string[];
  department: {
    name: string;
  };
  totalPatients: number;
  patientHistory: any[];
}

const DoctorTreatmentReport: React.FC = () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentDoctorId, setCurrentDoctorId] = useState<string>(''); // เปลี่ยนจาก selectedDoctorId
  const [doctorData, setDoctorData] = useState<DoctorData | null>(null);
  const [treatmentRecords, setTreatmentRecords] = useState<TreatmentRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TreatmentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token') || '';

  // ดึง user ID ของแพทย์ที่ล็อกอินอยู่เมื่อ component โหลด
  useEffect(() => {
    const currentUser = getCurrentUser();
    console.log('[DEBUG] Current user from localStorage:', currentUser);
    
    if (!currentUser) {
      setError('ไม่สามารถระบุตัวตนผู้ใช้ได้ กรุณาล็อกอินใหม่');
      return;
    }
    
    if (currentUser.role !== 'doctor') {
      setError('ระบบนี้ใช้สำหรับแพทย์เท่านั้น');
      return;
    }
    
    console.log('[DEBUG] Current doctor ID:', currentUser.id);
    setCurrentDoctorId(currentUser.id);
  }, []);

  // Fetch doctor data and treatment records
  const fetchDoctorData = async (doctorId: string) => {
    if (!doctorId) return;
    
    try {
      setLoading(true);
      setError('');
      
      console.log('[DEBUG] Fetching data for doctor ID:', doctorId);
      
      const params: any = {};
      if (startDate) {
        params.startDate = startDate.toISOString().split('T')[0];
      }
      if (endDate) {
        params.endDate = endDate.toISOString().split('T')[0];
      }

      // Try doctor reports API first
      try {
        const response = await axios.get(`${API_BASE_URL}/api/reports/doctor/${doctorId}`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });

        const data = response.data;
        console.log('[DEBUG] Doctor data received:', data);
        setDoctorData(data);
        
        // Transform patient history to treatment records
        const records: TreatmentRecord[] = data.patientHistory.map((record: any) => ({
          _id: record._id || record.recordId || '',
          patientName: `${record.patientFirstName || ''} ${record.patientLastName || ''}`.trim() || record.patientName || 'ไม่ระบุชื่อ',
          patientId: record.patientId || '',
          hn: record.hn || record.patientId || '',
          visitDate: record.visitDate || record.createdAt || '',
          visitTime: record.visitTime || new Date(record.visitDate || record.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          chiefComplaint: record.chiefComplaint || record.symptoms || '',
          presentIllness: record.presentIllness || '',
          physicalExam: record.physicalExam || '',
          vitalSigns: record.vitalSigns || {
            bloodPressure: '',
            heartRate: '',
            temperature: '',
            respiratoryRate: '',
            oxygenSaturation: '',
            weight: '',
            height: ''
          },
          diagnosis: record.diagnosis || '',
          treatmentPlan: record.treatmentPlan || record.treatment || '',
          medications: record.medications || [],
          labResults: record.labResults || [],
          followUp: record.followUp || record.followUpDate || '',
          notes: record.notes || '',
          doctorName: record.doctorName || `${data.prefix}${data.firstNameTh} ${data.lastNameTh}`.trim(),
          departmentName: record.departmentName || data.department?.name || '',
          roomName: record.roomName || '',
          status: record.status || 'completed'
        }));

        setTreatmentRecords(records);
        
      } catch (doctorError) {
        console.log('Doctor reports API failed, trying alternative approach:', doctorError);
        
        // If doctor reports fail, try to get doctor info and medical records separately
        try {
          // Get doctor basic info
          const doctorInfoResponse = await axios.get(`${API_BASE_URL}/api/reports/doctors`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { pageSize: 1000 }
          });
          
          const selectedDoctor = doctorInfoResponse.data.items?.find((d: any) => d._id === doctorId);
          if (selectedDoctor) {
            setDoctorData({
              doctorId: selectedDoctor._id,
              employeeId: selectedDoctor.employeeId,
              prefix: selectedDoctor.prefix,
              firstNameTh: selectedDoctor.firstNameTh,
              lastNameTh: selectedDoctor.lastNameTh,
              position: selectedDoctor.position,
              specialties: selectedDoctor.specialties || [],
              department: selectedDoctor.department || {},
              totalPatients: 0,
              patientHistory: []
            });
          }
          
          // For now, set empty records if we can't get medical records by doctor
          // In future, we might need to add an endpoint to get medical records by doctor ID
          setTreatmentRecords([]);
          setError('ไม่พบข้อมูลการรักษาของแพทย์นี้ หรือยังไม่มีการบันทึกประวัติการรักษา');
          
        } catch (fallbackError) {
          console.error('All methods failed:', fallbackError);
          setError('ไม่สามารถดึงข้อมูลแพทย์ได้');
          setTreatmentRecords([]);
        }
      }

    } catch (error: any) {
      console.error('Error fetching doctor data:', error);
      setError(`ไม่สามารถดึงข้อมูลการรักษาได้: ${error.response?.data?.error || error.message}`);
      setTreatmentRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctor data when currentDoctorId is available or date range changes
  useEffect(() => {
    if (currentDoctorId) {
      console.log('[DEBUG] Fetching data for current doctor:', currentDoctorId);
      fetchDoctorData(currentDoctorId);
    }
  }, [currentDoctorId, startDate, endDate]);

  // Filter records based on search term and date range
  useEffect(() => {
    let filtered = treatmentRecords;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.hn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.chiefComplaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date range
    if (startDate && endDate) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.visitDate);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }

    setFilteredRecords(filtered);
  }, [searchTerm, startDate, endDate, treatmentRecords]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'ongoing':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'เสร็จสิ้น';
      case 'ongoing':
        return 'กำลังรักษา';
      case 'cancelled':
        return 'ยกเลิก';
      default:
        return 'ไม่ระบุ';
    }
  };

  const exportExcel = async () => {
    try {
      if (!currentDoctorId || filteredRecords.length === 0) {
        setError('ไม่มีข้อมูลสำหรับส่งออก');
        return;
      }

      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = filteredRecords.map((record, index) => ({
        'ลำดับ': index + 1,
        'HN': record.hn,
        'ชื่อผู้ป่วย': record.patientName,
        'วันที่มาพบ': new Date(record.visitDate).toLocaleDateString('th-TH'),
        'เวลา': record.visitTime,
        'อาการหลัก': record.chiefComplaint,
        'การวินิจฉัย': record.diagnosis,
        'แผนการรักษา': record.treatmentPlan,
        'ยาที่จ่าย': record.medications.join(', '),
        'หมายเหตุ': record.notes,
        'แพทย์': record.doctorName,
        'แผนก': record.departmentName,
        'สถานะ': getStatusText(record.status)
      }));
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'รายงานการรักษา');
      
      // Generate Excel file and download
      const doctorName = doctorData ? `${doctorData.prefix}${doctorData.firstNameTh}_${doctorData.lastNameTh}`.replace(/\s+/g, '_') : 'doctor';
      const dateRange = startDate && endDate ? `_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}` : '';
      XLSX.writeFile(wb, `doctor-treatment-report_${doctorName}${dateRange}.xlsx`);
      
    } catch (err: any) {
      console.error('Export Excel failed', err);
      setError(`ไม่สามารถส่งออกไฟล์ได้: ${err.message}`);
    }
  };

  return (
    <Box sx={{ p: 4, md: { p: 6 } }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 2, color: '#1976d2' }}>
        รายงานการรักษาของฉัน
      </Typography>
      {doctorData && (
        <Typography variant="h6" gutterBottom sx={{ mb: 4, color: '#666' }}>
          {`${doctorData.prefix}${doctorData.firstNameTh} ${doctorData.lastNameTh}`} - {doctorData.position}
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filter Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="ค้นหาผู้ป่วย"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
              <DatePicker
                label="วันที่เริ่มต้น"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
              <DatePicker
                label="วันที่สิ้นสุด"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              onClick={() => currentDoctorId && fetchDoctorData(currentDoctorId)}
              disabled={!currentDoctorId || loading}
              fullWidth
            >
              {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
            </Button>
          </Grid>
          <Grid item xs={12} md={1}>
            <Button
              variant="outlined"
              color="success"
              onClick={exportExcel}
              startIcon={<Download />}
              disabled={!currentDoctorId || filteredRecords.length === 0 || loading}
              fullWidth
            >
              Excel
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom variant="h6">
                ผู้ป่วยทั้งหมด
              </Typography>
              <Typography variant="h3" component="div" color="primary" sx={{ fontWeight: 'bold' }}>
                {loading ? <Skeleton width={60} /> : (doctorData?.totalPatients || filteredRecords.length)}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                คน
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom variant="h6">
                รักษาเสร็จสิ้น
              </Typography>
              <Typography variant="h3" component="div" color="success.main" sx={{ fontWeight: 'bold' }}>
                {loading ? <Skeleton width={60} /> : filteredRecords.filter(r => r.status === 'completed').length}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                คน
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom variant="h6">
                กำลังรักษา
              </Typography>
              <Typography variant="h3" component="div" color="warning.main" sx={{ fontWeight: 'bold' }}>
                {loading ? <Skeleton width={60} /> : filteredRecords.filter(r => r.status === 'ongoing').length}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                คน
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom variant="h6">
                ยกเลิก
              </Typography>
              <Typography variant="h3" component="div" color="error.main" sx={{ fontWeight: 'bold' }}>
                {loading ? <Skeleton width={60} /> : filteredRecords.filter(r => r.status === 'cancelled').length}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                คน
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Doctor Info */}
      {doctorData && !loading && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>
            ข้อมูลแพทย์
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body1">
                <strong>ชื่อ:</strong> {`${doctorData.prefix}${doctorData.firstNameTh} ${doctorData.lastNameTh}`}
              </Typography>
              <Typography variant="body1">
                <strong>รหัสพนักงาน:</strong> {doctorData.employeeId}
              </Typography>
              <Typography variant="body1">
                <strong>ตำแหน่ง:</strong> {doctorData.position}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body1">
                <strong>แผนก:</strong> {doctorData.department?.name || 'ไม่ระบุ'}
              </Typography>
              <Typography variant="body1">
                <strong>ความเชี่ยวชาญ:</strong> {doctorData.specialties?.join(', ') || 'ไม่ระบุ'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Treatment Records Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>
          รายการการรักษา
        </Typography>
        
        {loading ? (
          <Box>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>ลำดับ</TableCell>
                  <TableCell>ผู้ป่วย</TableCell>
                  <TableCell>วันที่/เวลา</TableCell>
                  <TableCell>อาการหลัก</TableCell>
                  <TableCell>การวินิจฉัย</TableCell>
                  <TableCell>แผนการรักษา</TableCell>
                  <TableCell>ยา</TableCell>
                  <TableCell>สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.length > 0 ? filteredRecords.map((record, index) => (
                  <TableRow key={record._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {index + 1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {record.patientName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {record.patientName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {record.hn}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(record.visitDate).toLocaleDateString('th-TH')}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {record.visitTime}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }}>
                        {record.chiefComplaint || record.presentIllness || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {record.diagnosis || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }}>
                        {record.treatmentPlan || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {record.medications && record.medications.length > 0 ? record.medications.map((med: string, index: number) => (
                          <Chip
                            key={index}
                            label={med}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        )) : (
                          <Typography variant="body2" color="textSecondary">
                            ไม่มียา
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(record.status)}
                        color={getStatusColor(record.status) as any}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="textSecondary" sx={{ py: 4 }}>
                        {currentDoctorId ? 'ไม่พบข้อมูลการรักษาในช่วงเวลาที่เลือก' : 'กำลังโหลดข้อมูลแพทย์...'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default DoctorTreatmentReport;
