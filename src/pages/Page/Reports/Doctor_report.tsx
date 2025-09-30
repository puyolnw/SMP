import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { Download } from '@mui/icons-material';

type PatientHistoryItem = {
  patientId: string;
  patientName: string;
  patientHn: string;
  visitDate: string;
  chiefComplaint: string;
  diagnosis: string;
  treatmentPlan: string;
  medications: string[];
  queueInfo: {
    queue_no: string;
    status: string;
    triage_level: number;
    created_at: string;
  };
  createdAt: string;
};

type DoctorData = {
  doctorId: string;
  employeeId: string;
  prefix: string;
  firstNameTh: string;
  lastNameTh: string;
  position: string;
  licenseNumber: string;
  phone: string;
  email: string;
  status: string;
  specialties: string[];
  department: {
    id: string;
    name: string;
  };
  totalPatients: number;
  patientHistory: PatientHistoryItem[];
  diagnosisStats: Record<string, number>;
  reportPeriod: {
    startDate?: string;
    endDate?: string;
  };
};

const DoctorReport: React.FC = () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [doctor, setDoctor] = useState<DoctorData | null>(null);
  
  // All doctors list
  const [listLoading, setListLoading] = useState(false);
  const [doctors, setDoctors] = useState<Array<{
    id: string;
    employeeId: string;
    prefix: string;
    firstNameTh: string;
    lastNameTh: string;
    position: string;
    departmentId: string;
    licenseNumber: string;
    phone: string;
    email: string;
    status: string;
    specialties: string[];
    createdAt: string;
  }>>([]);
  const [searchAll, setSearchAll] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  const canSearch = employeeId;

  const fetchDoctor = async () => {
    if (!canSearch) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (employeeId) params.doctorId = employeeId;
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const res = await axios.get(`${API_BASE_URL}/api/reports/doctor/${employeeId}`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      setDoctor(res.data as DoctorData);
    } catch (err) {
      console.error('Fetch doctor report failed', err);
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    if (!doctor) return;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/reports/doctor/export/excel`,
        { doctorData: doctor },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doctor-report-${doctor.employeeId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export Excel failed', err);
    }
  };

  useEffect(() => {
    // load initial list
    fetchDoctors();
  }, []);

  const fetchDoctors = async (p = page, ps = pageSize, q = searchAll) => {
    setListLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/reports/doctors`, {
        params: { page: p, pageSize: ps, search: q },
        headers: { Authorization: `Bearer ${token}` },
      });
      setDoctors(res.data.items || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || p);
      setPageSize(res.data.pageSize || ps);
    } catch (e) {
      console.error('Load doctors failed', e);
      setDoctors([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  };

  const exportAllExcel = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/reports/doctors/export/excel`,
        { search: searchAll },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doctors-list.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export all doctors failed', e);
    }
  };

  return (
    <Box sx={{ p: 4, md: { p: 6 } }}>
      {/* All Doctors Table */}
      <Typography variant="h4" gutterBottom sx={{ mb: 4, color: '#1976d2' }}>
        รายชื่อแพทย์ทั้งหมด
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={7}>
            <TextField fullWidth label="ค้นหา (รหัสพนักงาน/ชื่อ/ใบประกอบโรคศิลป์)" value={searchAll} onChange={(e)=>setSearchAll(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button fullWidth variant="contained" onClick={()=>fetchDoctors(1, pageSize, searchAll)}>ค้นหา</Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" color="success" onClick={exportAllExcel} startIcon={<Download />}>ส่งออกทั้งหมด (Excel)</Button>
          </Grid>
        </Grid>
        <TableContainer sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>รหัสพนักงาน</TableCell>
                <TableCell>ชื่อ-สกุล</TableCell>
                <TableCell>ตำแหน่ง</TableCell>
                <TableCell>ใบประกอบโรคศิลป์</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell>ดูรายงาน</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listLoading ? (
                <TableRow><TableCell colSpan={6}>กำลังโหลด...</TableCell></TableRow>
              ) : doctors.length === 0 ? (
                <TableRow><TableCell colSpan={6}>ไม่พบข้อมูล</TableCell></TableRow>
              ) : (
                doctors.map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell>{d.employeeId}</TableCell>
                    <TableCell>{d.prefix}{d.firstNameTh} {d.lastNameTh}</TableCell>
                    <TableCell>{d.position}</TableCell>
                    <TableCell>{d.licenseNumber}</TableCell>
                    <TableCell>
                      <Chip label={d.status} color={d.status === 'active' ? 'success' : d.status === 'suspended' ? 'warning' : 'error'} size="small" />
                    </TableCell>
                    <TableCell>
                      <Button size="small" variant="contained" onClick={()=>{ setEmployeeId(d.employeeId); fetchDoctor(); }}>เปิด</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>จำนวนต่อหน้า</InputLabel>
            <Select
              value={pageSize}
              label="จำนวนต่อหน้า"
              onChange={(e) => { setPageSize(Number(e.target.value)); fetchDoctors(1, Number(e.target.value), searchAll); }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            แสดง {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} จาก {total} รายการ
          </Typography>
          <Pagination
            count={Math.max(Math.ceil(total / pageSize), 1)}
            page={page}
            onChange={(_e, val) => fetchDoctors(val, pageSize, searchAll)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      </Paper>

      {/* Doctor Search Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>รายงานผลงานแพทย์</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="รหัสพนักงาน" value={employeeId} onChange={(e)=>setEmployeeId(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="date" label=" " value={startDate} onChange={(e)=>setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="date" label=" " value={endDate} onChange={(e)=>setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="contained" onClick={fetchDoctor} disabled={!canSearch || loading}>ค้นหา</Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" color="success" onClick={exportAllExcel} startIcon={<Download />}>ส่งออกรายชื่อ</Button>
          </Grid>
        </Grid>
      </Paper>

      {loading && (<Paper sx={{ p: 3 }}>กำลังโหลด...</Paper>)}

      {doctor && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>ข้อมูลแพทย์</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="outlined" color="success" onClick={exportExcel} startIcon={<Download />}>
              ส่งออก Excel (รายละเอียดแพทย์)
            </Button>
          </Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>รหัสพนักงาน: <b>{doctor.employeeId}</b></Grid>
            <Grid item xs={12} md={6}>ชื่อ: <b>{doctor.prefix}{doctor.firstNameTh} {doctor.lastNameTh}</b></Grid>
            <Grid item xs={12} md={6}>ตำแหน่ง: <b>{doctor.position}</b></Grid>
            <Grid item xs={12} md={6}>แผนก: <b>{doctor.department.name}</b></Grid>
            <Grid item xs={12} md={6}>ใบประกอบโรคศิลป์: <b>{doctor.licenseNumber}</b></Grid>
            <Grid item xs={12} md={6}>อีเมล: <b>{doctor.email}</b></Grid>
          </Grid>

          <Typography variant="h6" sx={{ mb: 1 }}>ประวัติการรักษาผู้ป่วย</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>วันที่</TableCell>
                  <TableCell>รหัสผู้ป่วย</TableCell>
                  <TableCell>ชื่อผู้ป่วย</TableCell>
                  <TableCell>อาการหลัก</TableCell>
                  <TableCell>การวินิจฉัย</TableCell>
                  <TableCell>คิว</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {doctor.patientHistory
                  .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
                  .map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>{new Date(p.visitDate).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell>{p.patientHn}</TableCell>
                      <TableCell>{p.patientName}</TableCell>
                      <TableCell>{p.chiefComplaint}</TableCell>
                      <TableCell>{p.diagnosis}</TableCell>
                      <TableCell>{p.queueInfo.queue_no}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default DoctorReport;
