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

interface NursingRecord {
  id: string;
  patientName: string;
  patientId: string;
  visitDate: string;
  visitTime: string;
  vitalSigns: {
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    oxygenSaturation: number;
  };
  nursingCare: string[];
  medication: string[];
  observations: string;
  status: 'completed' | 'ongoing' | 'cancelled';
}

const NurseTreatmentReport: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [filteredRecords, setFilteredRecords] = useState<NursingRecord[]>([]);

  // Mock data สำหรับรายงานการรักษาของพยาบาล
  const MOCK_NURSING_RECORDS: NursingRecord[] = [
    {
      id: 'NR001',
      patientName: 'นาย สมชาย ใจดี',
      patientId: 'HN001',
      visitDate: '2024-01-15',
      visitTime: '09:30',
      vitalSigns: {
        bloodPressure: '120/80',
        heartRate: 72,
        temperature: 37.5,
        oxygenSaturation: 98
      },
      nursingCare: ['วัดสัญญาณชีพ', 'ให้ยาลดไข้', 'ประเมินอาการ'],
      medication: ['Paracetamol 500mg', 'Ibuprofen 400mg'],
      observations: 'ผู้ป่วยมีไข้สูง 37.5°C มีอาการปวดศีรษะและคลื่นไส้',
      status: 'completed'
    },
    {
      id: 'NR002',
      patientName: 'นาง สมหญิง รักดี',
      patientId: 'HN002',
      visitDate: '2024-01-15',
      visitTime: '10:15',
      vitalSigns: {
        bloodPressure: '140/90',
        heartRate: 95,
        temperature: 36.8,
        oxygenSaturation: 95
      },
      nursingCare: ['วัดความดันโลหิต', 'ตรวจคลื่นไฟฟ้าหัวใจ', 'ให้ออกซิเจน'],
      medication: ['Nitroglycerin', 'Aspirin 81mg'],
      observations: 'ผู้ป่วยมีอาการเจ็บหน้าอก หายใจลำบาก ความดันโลหิตสูง',
      status: 'ongoing'
    },
    {
      id: 'NR003',
      patientName: 'เด็กชาย สมคิด เรียนดี',
      patientId: 'HN003',
      visitDate: '2024-01-14',
      visitTime: '14:20',
      vitalSigns: {
        bloodPressure: '90/60',
        heartRate: 110,
        temperature: 38.2,
        oxygenSaturation: 97
      },
      nursingCare: ['วัดไข้', 'ให้ยาลดไข้', 'ประเมินอาการหายใจ'],
      medication: ['Paracetamol 250mg', 'Dextromethorphan'],
      observations: 'เด็กมีไข้สูง 38.2°C มีอาการไอและน้ำมูกไหล',
      status: 'completed'
    },
    {
      id: 'NR004',
      patientName: 'นาง สมศรี ใจงาม',
      patientId: 'HN004',
      visitDate: '2024-01-14',
      visitTime: '16:45',
      vitalSigns: {
        bloodPressure: '110/70',
        heartRate: 85,
        temperature: 36.5,
        oxygenSaturation: 99
      },
      nursingCare: ['ประเมินอาการท้องเสีย', 'ให้สารน้ำ', 'ติดตามอาการ'],
      medication: ['Loperamide', 'ORS'],
      observations: 'ผู้ป่วยมีอาการปวดท้องและท้องเสีย ต้องให้สารน้ำทดแทน',
      status: 'completed'
    },
    {
      id: 'NR005',
      patientName: 'นาย สมศักดิ์ ทำงานดี',
      patientId: 'HN005',
      visitDate: '2024-01-13',
      visitTime: '11:30',
      vitalSigns: {
        bloodPressure: '130/85',
        heartRate: 78,
        temperature: 36.7,
        oxygenSaturation: 98
      },
      nursingCare: ['ประเมินความเจ็บปวด', 'ให้ยาแก้ปวด', 'แนะนำการออกกำลังกาย'],
      medication: ['Diclofenac', 'Glucosamine'],
      observations: 'ผู้ป่วยมีอาการปวดหลังและข้อเข่า ต้องให้ยาแก้ปวดและแนะนำการดูแล',
      status: 'ongoing'
    }
  ];

  const [nursingRecords] = useState<NursingRecord[]>(MOCK_NURSING_RECORDS);

  // Filter records based on search term and date range
  useEffect(() => {
    let filtered = nursingRecords;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.observations.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [searchTerm, startDate, endDate, nursingRecords]);

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
        return 'กำลังดูแล';
      case 'cancelled':
        return 'ยกเลิก';
      default:
        return 'ไม่ระบุ';
    }
  };

  const exportExcel = async () => {
    // Mock export function
    console.log('Exporting nursing records to Excel...');
    // In real implementation, this would call the backend API
  };

  return (
    <Box sx={{ p: 4, md: { p: 6 } }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, color: '#1976d2' }}>
        รายงานการรักษาของพยาบาล
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
                ดูแลเสร็จสิ้น
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
                กำลังดูแล
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

      {/* Nursing Records Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>
          รายการการดูแลผู้ป่วย
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>ผู้ป่วย</TableCell>
                <TableCell>วันที่/เวลา</TableCell>
                <TableCell>สัญญาณชีพ</TableCell>
                <TableCell>การดูแล</TableCell>
                <TableCell>ยา</TableCell>
                <TableCell>การสังเกต</TableCell>
                <TableCell>สถานะ</TableCell>
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption">
                        BP: {record.vitalSigns.bloodPressure}
                      </Typography>
                      <Typography variant="caption">
                        HR: {record.vitalSigns.heartRate} bpm
                      </Typography>
                      <Typography variant="caption">
                        Temp: {record.vitalSigns.temperature}°C
                      </Typography>
                      <Typography variant="caption">
                        SpO2: {record.vitalSigns.oxygenSaturation}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {record.nursingCare.map((care, index) => (
                        <Chip
                          key={index}
                          label={care}
                          size="small"
                          variant="outlined"
                          color="info"
                        />
                      ))}
                    </Box>
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
                    <Typography variant="body2" sx={{ maxWidth: 200 }}>
                      {record.observations}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(record.status)}
                      color={getStatusColor(record.status) as any}
                      size="small"
                    />
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

export default NurseTreatmentReport;
