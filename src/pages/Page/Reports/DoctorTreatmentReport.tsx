import React, { useState, useEffect } from 'react';
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
  Avatar
} from '@mui/material';
import { Search, Download } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { th } from 'date-fns/locale';

interface TreatmentRecord {
  id: string;
  patientName: string;
  patientId: string;
  visitDate: string;
  visitTime: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  medication: string[];
  followUpDate?: string;
  status: 'completed' | 'ongoing' | 'cancelled';
}

const DoctorTreatmentReport: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [filteredRecords, setFilteredRecords] = useState<TreatmentRecord[]>([]);

  // Mock data สำหรับรายงานการรักษาของหมอ
  const MOCK_TREATMENT_RECORDS: TreatmentRecord[] = [
    {
      id: 'TR001',
      patientName: 'นาย สมชาย ใจดี',
      patientId: 'HN001',
      visitDate: '2024-01-15',
      visitTime: '09:30',
      symptoms: 'ปวดศีรษะ, ไข้สูง, คลื่นไส้',
      diagnosis: 'ไข้หวัดใหญ่',
      treatment: 'ให้ยาลดไข้, พักผ่อน, ดื่มน้ำมากๆ',
      medication: ['Paracetamol 500mg', 'Ibuprofen 400mg'],
      followUpDate: '2024-01-20',
      status: 'completed'
    },
    {
      id: 'TR002',
      patientName: 'นาง สมหญิง รักดี',
      patientId: 'HN002',
      visitDate: '2024-01-15',
      visitTime: '10:15',
      symptoms: 'เจ็บหน้าอก, หายใจลำบาก',
      diagnosis: 'โรคหัวใจขาดเลือด',
      treatment: 'ให้ยาขยายหลอดเลือด, ตรวจคลื่นไฟฟ้าหัวใจ',
      medication: ['Nitroglycerin', 'Aspirin 81mg'],
      followUpDate: '2024-01-22',
      status: 'ongoing'
    },
    {
      id: 'TR003',
      patientName: 'เด็กชาย สมคิด เรียนดี',
      patientId: 'HN003',
      visitDate: '2024-01-14',
      visitTime: '14:20',
      symptoms: 'ไข้สูง, ไอ, น้ำมูกไหล',
      diagnosis: 'ไข้หวัดธรรมดา',
      treatment: 'ให้ยาลดไข้, ยาแก้ไอ, พักผ่อน',
      medication: ['Paracetamol 250mg', 'Dextromethorphan'],
      followUpDate: '2024-01-18',
      status: 'completed'
    },
    {
      id: 'TR004',
      patientName: 'นาง สมศรี ใจงาม',
      patientId: 'HN004',
      visitDate: '2024-01-14',
      visitTime: '16:45',
      symptoms: 'ปวดท้อง, ท้องเสีย',
      diagnosis: 'อาหารเป็นพิษ',
      treatment: 'ให้ยาแก้ท้องเสีย, งดอาหารรสจัด',
      medication: ['Loperamide', 'ORS'],
      followUpDate: '2024-01-17',
      status: 'completed'
    },
    {
      id: 'TR005',
      patientName: 'นาย สมศักดิ์ ทำงานดี',
      patientId: 'HN005',
      visitDate: '2024-01-13',
      visitTime: '11:30',
      symptoms: 'ปวดหลัง, ข้อเข่าเสื่อม',
      diagnosis: 'โรคข้อเข่าเสื่อม',
      treatment: 'กายภาพบำบัด, ให้ยาแก้ปวด',
      medication: ['Diclofenac', 'Glucosamine'],
      followUpDate: '2024-01-27',
      status: 'ongoing'
    }
  ];

  const [treatmentRecords] = useState<TreatmentRecord[]>(MOCK_TREATMENT_RECORDS);

  // Filter records based on search term and date range
  useEffect(() => {
    let filtered = treatmentRecords;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.symptoms.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    // Mock export function
    console.log('Exporting treatment records to Excel...');
    // In real implementation, this would call the backend API
  };

  return (
    <Box sx={{ p: 4, md: { p: 6 } }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, color: '#1976d2' }}>
        รายงานการรักษาของหมอ
      </Typography>

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
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              color="success"
              onClick={exportExcel}
              startIcon={<Download />}
              fullWidth
            >
              ส่งออก Excel
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
                {filteredRecords.length}
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
                {filteredRecords.filter(r => r.status === 'completed').length}
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
                {filteredRecords.filter(r => r.status === 'ongoing').length}
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
                {filteredRecords.filter(r => r.status === 'cancelled').length}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                คน
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Treatment Records Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>
          รายการการรักษา
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>ผู้ป่วย</TableCell>
                <TableCell>วันที่/เวลา</TableCell>
                <TableCell>อาการ</TableCell>
                <TableCell>การวินิจฉัย</TableCell>
                <TableCell>การรักษา</TableCell>
                <TableCell>ยา</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell>นัดครั้งต่อไป</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id} hover>
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
                          {record.patientId}
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
                      {record.symptoms}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {record.diagnosis}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200 }}>
                      {record.treatment}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {record.medication.map((med, index) => (
                        <Chip
                          key={index}
                          label={med}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(record.status)}
                      color={getStatusColor(record.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {record.followUpDate ? (
                      <Typography variant="body2" color="success.main">
                        {new Date(record.followUpDate).toLocaleDateString('th-TH')}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        ไม่มีการนัด
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default DoctorTreatmentReport;
