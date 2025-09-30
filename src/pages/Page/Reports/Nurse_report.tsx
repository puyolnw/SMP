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

type Nurse = {
  id: string;
  employeeId: string;
  prefix: string;
  firstNameTh: string;
  lastNameTh: string;
  position: string;
  licenseNumber: string;
  status: string;
  startDate?: string;
};

type NurseData = {
  nurseId: string;
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
  department: { id: string; name: string };
};

const NurseReport: React.FC = () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // list state (same pattern as Doctor_report)
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchAll, setSearchAll] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // detail state
  const [selectedNurse, setSelectedNurse] = useState<NurseData | null>(null);
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  // fetch list
  const fetchNurses = async (p = page, ps = pageSize, q = searchAll) => {
    setListLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/reports/nurses`, {
        params: { page: p, pageSize: ps, search: q },
        headers: { Authorization: `Bearer ${token}` },
      });
      setNurses(res.data.items || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || p);
      setPageSize(res.data.pageSize || ps);
    } catch (e) {
      setNurses([]);
      setTotal(0);
      console.error('Load nurses failed', e);
    } finally {
      setListLoading(false);
    }
  };

  // fetch detail
  const fetchNurse = async (employeeId: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/reports/nurse/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedNurse(res.data as NurseData);
    } catch (err) {
      setSelectedNurse(null);
      console.error('Fetch nurse report failed', err);
    } finally {
      setLoading(false);
    }
  };

  // export
  const exportExcel = async () => {
    if (!selectedNurse) return;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/reports/nurse/export/excel`,
        { nurseData: selectedNurse },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nurse-report-${selectedNurse.employeeId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export Excel failed', err);
    }
  };

  useEffect(() => {
    fetchNurses();
  }, []);

  return (
    <Box sx={{ p: 4, md: { p: 6 } }}>
      {/* All Nurses Table */}
      <Typography variant="h4" gutterBottom sx={{ mb: 4, color: '#1976d2' }}>
        รายชื่อพยาบาลทั้งหมด
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={7}>
            <TextField fullWidth label="ค้นหา (รหัสพนักงาน/ชื่อ/ใบประกอบวิชาชีพ)" value={searchAll} onChange={(e)=>setSearchAll(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button fullWidth variant="contained" onClick={()=>fetchNurses(1, pageSize, searchAll)}>ค้นหา</Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" color="success" onClick={async()=>{
              try {
                const res = await axios.post(
                  `${API_BASE_URL}/api/reports/nurses/export/excel`,
                  { search: searchAll },
                  { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, responseType: 'blob' }
                );
                const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `nurses-list.xlsx`;
                a.click();
                window.URL.revokeObjectURL(url);
              } catch (e) { console.error('Export nurses failed', e); }
            }} startIcon={<Download />}>ส่งออกทั้งหมด (Excel)</Button>
          </Grid>
        </Grid>
        <TableContainer sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>รหัสพนักงาน</TableCell>
                <TableCell>ชื่อ-สกุล</TableCell>
                <TableCell>ตำแหน่ง</TableCell>
                <TableCell>ใบประกอบวิชาชีพ</TableCell>
                <TableCell>วันที่เริ่มงาน</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell>การดำเนินการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listLoading ? (
                <TableRow><TableCell colSpan={7}>กำลังโหลด...</TableCell></TableRow>
              ) : nurses.length === 0 ? (
                <TableRow><TableCell colSpan={7}>ไม่พบข้อมูล</TableCell></TableRow>
              ) : (
                nurses.map((n) => (
                  <TableRow key={n.id} hover>
                    <TableCell>{n.employeeId}</TableCell>
                    <TableCell>{n.prefix} {n.firstNameTh} {n.lastNameTh}</TableCell>
                    <TableCell>{n.position}</TableCell>
                    <TableCell>{n.licenseNumber}</TableCell>
                    <TableCell>{n.startDate ? new Date(n.startDate).toLocaleDateString('th-TH') : '-'}</TableCell>
                    <TableCell>
                      <Chip label={n.status} color={n.status === 'active' ? 'success' : n.status === 'suspended' ? 'warning' : 'error'} size="small" />
                    </TableCell>
                    <TableCell>
                      <Button size="small" variant="contained" onClick={()=>fetchNurse(n.employeeId)}>เปิด</Button>
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
              onChange={(e) => { setPageSize(Number(e.target.value)); fetchNurses(1, Number(e.target.value), searchAll); }}
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
            onChange={(_e, val) => fetchNurses(val, pageSize, searchAll)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      </Paper>

      {loading && (<Paper sx={{ p: 3 }}>กำลังโหลด...</Paper>)}

      {selectedNurse && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>ข้อมูลพยาบาล</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="outlined" color="success" onClick={exportExcel} startIcon={<Download />}>ส่งออก Excel (รายละเอียดพยาบาล)</Button>
          </Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>รหัสพนักงาน: <b>{selectedNurse.employeeId}</b></Grid>
            <Grid item xs={12} md={6}>ชื่อ: <b>{selectedNurse.prefix}{selectedNurse.firstNameTh} {selectedNurse.lastNameTh}</b></Grid>
            <Grid item xs={12} md={6}>ตำแหน่ง: <b>{selectedNurse.position}</b></Grid>
            <Grid item xs={12} md={6}>แผนก: <b>{selectedNurse.department.name}</b></Grid>
            <Grid item xs={12} md={6}>ใบประกอบวิชาชีพ: <b>{selectedNurse.licenseNumber}</b></Grid>
            <Grid item xs={12} md={6}>เบอร์โทร: <b>{selectedNurse.phone}</b></Grid>
            <Grid item xs={12} md={6}>อีเมล: <b>{selectedNurse.email}</b></Grid>
            <Grid item xs={12} md={6}>สถานะ: <b>{selectedNurse.status}</b></Grid>
            <Grid item xs={12}>ความเชี่ยวชาญ: <b>{selectedNurse.specialties.join(', ')}</b></Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default NurseReport;


