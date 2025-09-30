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
  MenuItem
} from '@mui/material';
import { Download } from '@mui/icons-material';

type VisitItem = {
  visitDate: string;
  symptoms: string;
  triageLevel: number;
  room: string;
  department: string;
  departmentId?: string;
  doctor: string;
  diagnosis: string;
  waitTime: number;
  treatmentTime: number;
  totalCost: number;
};

type PatientData = {
  hn: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  phone: string;
  address: string;
  emergencyContact: string;
  allergies: string[];
  chronicDiseases: string[];
  visitHistory: VisitItem[];
};

const PatientReport: React.FC = () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [hn, setHn] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [patients, setPatients] = useState<Array<{id:string; hn:string; firstName:string; lastName:string; age:number; gender:string; phone:string; createdAt:string;}>>([]);
  const [searchAll, setSearchAll] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  const canSearch = hn || nationalId || name;

  const fetchPatient = async () => {
    if (!canSearch) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (hn) params.hn = hn;
      if (nationalId) params.nationalId = nationalId;
      if (name) params.name = name;
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const res = await axios.get(`${API_BASE_URL}/api/reports/patient`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatient(res.data as PatientData);
    } catch (err) {
      console.error('Fetch patient report failed', err);
      setPatient(null);
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = async () => {
    if (!patient) return;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/reports/patient/export/pdf`,
        { patientData: patient },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      );
      
      // Create a new window to display the HTML report
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(res.data);
        newWindow.document.close();
        
        // Add print styles and instructions
        const style = newWindow.document.createElement('style');
        style.textContent = `
          body::before {
            content: "กด Ctrl+P เพื่อพิมพ์เป็น PDF หรือ Save as PDF";
            display: block;
            background: #e3f2fd;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 4px;
            text-align: center;
            font-weight: bold;
            color: #1976d2;
          }
        `;
        newWindow.document.head.appendChild(style);
      }
    } catch (err) {
      console.error('Export PDF failed', err);
    }
  };

  const exportExcel = async () => {
    if (!patient) return;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/reports/patient/export/excel`,
        { patientData: patient },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient-history-${patient.hn}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export Excel failed', err);
    }
  };

  useEffect(() => {
    // load initial list
    fetchPatients();
  }, []);

  const fetchPatients = async (p = page, ps = pageSize, q = searchAll) => {
    setListLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/reports/patients`, {
        params: { page: p, pageSize: ps, search: q },
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatients(res.data.items || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || p);
      setPageSize(res.data.pageSize || ps);
    } catch (e) {
      console.error('Load patients failed', e);
      setPatients([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  };

  const exportAllExcel = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/reports/patients/export/excel`,
        { search: searchAll },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patients-basic.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export all patients failed', e);
    }
  };

  return (
    <Box sx={{ p: 4, md: { p: 6 } }}>
      {/* All Patients Table */}
      <Typography variant="h4" gutterBottom sx={{ mb: 4, color: '#1976d2' }}>
        รายชื่อผู้ป่วยทั้งหมด
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={7}>
            <TextField
              fullWidth
              label="ค้นหา (รหัสประจำตัวผู้ป่วย/ชื่อ/บัตร/โทร)"
              value={searchAll}
              onChange={(e) => setSearchAll(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button fullWidth variant="contained" onClick={() => fetchPatients(1, pageSize, searchAll)}>ค้นหา</Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" color="success" onClick={exportAllExcel} startIcon={<Download />}>ส่งออกทั้งหมด (Excel)</Button>
          </Grid>
        </Grid>
        <TableContainer sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>รหัสประจำตัวผู้ป่วย</TableCell>
                <TableCell>ชื่อ-สกุล</TableCell>
                <TableCell>อายุ</TableCell>
                <TableCell>เพศ</TableCell>
                <TableCell>โทร</TableCell>
                <TableCell>ดูรายละเอียด</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listLoading ? (
                <TableRow><TableCell colSpan={6}>กำลังโหลด...</TableCell></TableRow>
              ) : patients.length === 0 ? (
                <TableRow><TableCell colSpan={6}>ไม่พบข้อมูล</TableCell></TableRow>
              ) : (
                patients.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.hn}</TableCell>
                    <TableCell>{p.firstName} {p.lastName}</TableCell>
                    <TableCell>{p.age}</TableCell>
                    <TableCell>{p.gender}</TableCell>
                    <TableCell>{p.phone}</TableCell>
                    <TableCell>
                      <Button size="small" variant="contained" onClick={() => { setHn(p.hn); setNationalId(''); setName(''); fetchPatient(); }}>เปิด</Button>
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
              onChange={(e) => { setPageSize(Number(e.target.value)); fetchPatients(1, Number(e.target.value), searchAll); }}
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
            onChange={(_e, val) => fetchPatients(val, pageSize, searchAll)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      </Paper>

      {/* Patient search and details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>รายงานประวัติผู้ป่วย</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="รหัสประจำตัวผู้ป่วย" value={hn} onChange={(e)=>setHn(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="เลขบัตรประชาชน" value={nationalId} onChange={(e)=>setNationalId(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="ชื่อ-นามสกุล" value={name} onChange={(e)=>setName(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="date" label=" " value={startDate} onChange={(e)=>setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="date" label=" " value={endDate} onChange={(e)=>setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="contained" onClick={fetchPatient} disabled={!canSearch || loading}>ค้นหา</Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" color="error" onClick={exportPdf} disabled={!patient} startIcon={<Download />}>PDF</Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" color="success" onClick={exportExcel} disabled={!patient} startIcon={<Download />}>Excel</Button>
          </Grid>
        </Grid>
      </Paper>

      {loading && (
        <Paper sx={{ p: 3 }}>กำลังโหลด...</Paper>
      )}

      {patient && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>ข้อมูลผู้ป่วย</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>รหัสประจำตัวผู้ป่วย: <b>{patient.hn}</b></Grid>
            <Grid item xs={12} md={6}>ชื่อ: <b>{patient.firstName} {patient.lastName}</b></Grid>
            <Grid item xs={12} md={6}>อายุ/เพศ: <b>{patient.age}</b> / <b>{patient.gender}</b></Grid>
            <Grid item xs={12} md={6}>เบอร์โทร: <b>{patient.phone}</b></Grid>
            <Grid item xs={12}>ที่อยู่: <b>{patient.address}</b></Grid>
          </Grid>

          <Typography variant="h6" sx={{ mb: 1 }}>ประวัติการมารับบริการ</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>วันที่</TableCell>
                  <TableCell>อาการ</TableCell>
                  <TableCell align="center">ระดับคัดกรอง</TableCell>
                  <TableCell>แผนก</TableCell>
                  <TableCell>แพทย์</TableCell>
                  <TableCell>วินิจฉัย</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patient.visitHistory
                  .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
                  .map((v, i) => {
                    const triageLabel = v.triageLevel === 1 ? '1 วิกฤติ' : v.triageLevel === 2 ? '2 เร่งด่วนมาก' : v.triageLevel === 3 ? '3 เร่งด่วนปานกลาง' : v.triageLevel === 4 ? '4 ไม่เร่งด่วน' : '5 ปกติ';
                    return (
                      <TableRow key={i}>
                        <TableCell>{new Date(v.visitDate).toLocaleDateString('th-TH')}</TableCell>
                        <TableCell>{v.symptoms}</TableCell>
                        <TableCell align="center">{triageLabel}</TableCell>
                        <TableCell>{v.department}</TableCell>
                        <TableCell>{v.doctor}</TableCell>
                        <TableCell>{v.diagnosis}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default PatientReport;

