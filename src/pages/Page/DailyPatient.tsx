import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  Chip,
  TablePagination,
  Tooltip,
  Fade,
  useTheme,
  useMediaQuery,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Avatar
} from '@mui/material';
import { 
  PersonAdd as AddPatientIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon,
  FileDownload as ExportIcon,
  CalendarMonth as DateIcon,
  LocalHospital as HospitalIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Assignment as MedicalRecordIcon,
  Emergency as EmergencyIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
//import axios from 'axios';
import { getUserBranchId } from '../../utils/auth';

interface PatientData {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  address?: string;
  medical_condition?: string;
  priority_level: string;
  status: string;
  admission_date: string;
  last_visit?: string;
  created_at: string;
}

const AllData: React.FC = () => {
  const [data, setData] = useState<PatientData[]>([]);
  const [filteredData, setFilteredData] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  
  // Action menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  //const apiUrl = import.meta.env.VITE_API_URL;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // ดึง branchId ของ user ที่ login
  const userBranchId = getUserBranchId();

  // Mock data for demonstration
  useEffect(() => {
    const mockPatients: PatientData[] = [
      {
        id: '1',
        patient_id: 'P001',
        first_name: 'สมชาย',
        last_name: 'ใจดี',
        age: 45,
        gender: 'ชาย',
        phone: '081-234-5678',
        email: 'somchai@email.com',
        address: '123 ถนนสุขุมวิท กรุงเทพฯ',
        medical_condition: 'เบาหวาน, ความดันโลหิตสูง',
        priority_level: 'ปานกลาง',
        status: 'รอตรวจ',
        admission_date: '2024-01-15',
        last_visit: '2024-01-10',
        created_at: '2024-01-15T08:30:00Z'
      },
      {
        id: '2',
        patient_id: 'P002',
        first_name: 'สมหญิง',
        last_name: 'รักสุขภาพ',
        age: 32,
        gender: 'หญิง',
        phone: '082-345-6789',
        email: 'somying@email.com',
        address: '456 ถนนพหลโยธิน กรุงเทพฯ',
        medical_condition: 'ไมเกรน',
        priority_level: 'เร่งด่วน',
        status: 'กำลังรักษา',
        admission_date: '2024-01-15',
        last_visit: '2024-01-12',
        created_at: '2024-01-15T09:15:00Z'
      },
      {
        id: '3',
        patient_id: 'P003',
        first_name: 'วิชัย',
        last_name: 'แข็งแรง',
        age: 28,
        gender: 'ชาย',
        phone: '083-456-7890',
        address: '789 ถนนรัชดาภิเษก กรุงเทพฯ',
        medical_condition: 'หวัด',
        priority_level: 'ไม่เร่งด่วน',
        status: 'รักษาเสร็จ',
        admission_date: '2024-01-14',
        last_visit: '2024-01-14',
        created_at: '2024-01-14T14:20:00Z'
      }
    ];

    setData(mockPatients);
    setStatuses(['รอตรวจ', 'กำลังรักษา', 'รักษาเสร็จ', 'นัดติดตาม']);
    setPriorities(['ฉุกเฉิน', 'เร่งด่วน', 'ปานกลาง', 'ไม่เร่งด่วน']);
    setLoading(false);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      // Mock delete - in real app, call API
      setSnackbarMessage('ลบข้อมูลผู้ป่วยเรียบร้อยแล้ว');
      setOpenSnackbar(true);
      
      setData(prevData => prevData.filter(item => item.id !== id));
      handleCloseMenu();
    } catch (err) {
      console.error('Error deleting patient:', err);
      setSnackbarMessage('ไม่สามารถลบข้อมูลผู้ป่วยได้');
      setOpenSnackbar(true);
    }
  };

  // Filter data based on search term and filters
  useEffect(() => {
    let result = data;
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(item => 
        item.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.phone.includes(searchTerm) ||
        (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.medical_condition && item.medical_condition.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply date filter
    if (filterType !== 'all') {
      const today = new Date();
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);
      
      switch (filterType) {
        case 'today':
          result = result.filter(item => {
            const itemDate = new Date(item.created_at);
            return itemDate.toDateString() === today.toDateString();
          });
          break;
        case 'week':
          result = result.filter(item => {
            const itemDate = new Date(item.created_at);
            return itemDate >= oneWeekAgo;
          });
          break;
        case 'month':
          result = result.filter(item => {
            const itemDate = new Date(item.created_at);
            return itemDate >= oneMonthAgo;
          });
          break;
      }
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      result = result.filter(item => item.priority_level === priorityFilter);
    }

    // Apply gender filter
    if (genderFilter !== 'all') {
      result = result.filter(item => item.gender === genderFilter);
    }
    
    setFilteredData(result);
    setPage(0);
  }, [searchTerm, filterType, statusFilter, priorityFilter, genderFilter, data]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setGenderFilter('all');
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
  };

  const handlePriorityFilterChange = (event: SelectChangeEvent) => {
    setPriorityFilter(event.target.value);
  };

  const handleGenderFilterChange = (event: SelectChangeEvent) => {
    setGenderFilter(event.target.value);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedItemId(null);
  };

  // Slice data for current page
  const currentPageData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'รักษาเสร็จ':
        return 'success';
      case 'รอตรวจ':
        return 'warning';
      case 'กำลังรักษา':
        return 'info';
      case 'นัดติดตาม':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'ฉุกเฉิน':
        return 'error';
      case 'เร่งด่วน':
        return 'warning';
      case 'ปานกลาง':
        return 'info';
      case 'ไม่เร่งด่วน':
        return 'success';
      default:
        return 'default';
    }
  };

  // Get gender avatar color
  const getGenderColor = (gender: string) => {
    return gender === 'ชาย' ? '#1976d2' : '#e91e63';
  };

  return (
    <Fade in={true} timeout={800}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Card 
          elevation={3} 
          sx={{ 
            borderRadius: '16px',
            overflow: 'hidden',
            mb: 4
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Grid container spacing={2} alignItems="center" justifyContent="space-between">
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <HospitalIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
                      จัดการข้อมูลผู้ป่วย
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                      ค้นหา จัดการ และเรียกดูข้อมูลผู้ป่วยในระบบ
                      {userBranchId && (
                        <Typography component="span" fontWeight="medium" color="primary.main">
                          {` (${userBranchId})`}
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  startIcon={<AddPatientIcon />}
                  component={Link}
                  to="/patients/addnew"
                  sx={{ 
                    borderRadius: '10px',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)'
                    }
                  }}
                >
                  เพิ่มผู้ป่วยใหม่
                </Button>
                
                <Button 
                  variant="outlined" 
                  startIcon={<ExportIcon />}
                  component={Link}
                  to="/patients/export"
                  sx={{ 
                    borderRadius: '10px',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                    }
                  }}
                >
                  ส่งออกข้อมูล
                </Button>
                
                <Tooltip title="รีเฟรชข้อมูล">
                  <IconButton 
                    onClick={() => setLoading(true)} 
                    color="primary"
                    sx={{ 
                      borderRadius: '10px',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'rotate(180deg)',
                        backgroundColor: 'rgba(63, 81, 181, 0.1)'
                      }
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <EmergencyIcon sx={{ fontSize: 30, mb: 1 }} />
                <Typography variant="h5" fontWeight="bold">
                  {filteredData.filter(p => p.priority_level === 'ฉุกเฉิน').length}
                </Typography>
                <Typography variant="body2">ผู้ป่วยฉุกเฉิน</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <HospitalIcon sx={{ fontSize: 30, mb: 1 }} />
                <Typography variant="h5" fontWeight="bold">
                  {filteredData.filter(p => p.status === 'กำลังรักษา').length}
                </Typography>
                <Typography variant="body2">กำลังรักษา</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <MedicalRecordIcon sx={{ fontSize: 30, mb: 1 }} />
                <Typography variant="h5" fontWeight="bold">
                  {filteredData.filter(p => p.status === 'รอตรวจ').length}
                </Typography>
                <Typography variant="body2">รอตรวจ</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <AddPatientIcon sx={{ fontSize: 30, mb: 1 }} />
                <Typography variant="h5" fontWeight="bold">{filteredData.length}</Typography>
                <Typography variant="body2">ผู้ป่วยทั้งหมด</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card 
          elevation={3} 
          sx={{ 
            borderRadius: '16px',
            overflow: 'hidden',
            mb: 4
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="ค้นหาผู้ป่วย (ชื่อ, นามสกุล, รหัสผู้ป่วย, เบอร์โทร)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchTerm('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: '12px',
                      '&.Mui-focused': {
                        boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.2)'
                      }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                  <Chip 
                    label="ทั้งหมด" 
                    color={filterType === 'all' ? 'primary' : 'default'} 
                    onClick={() => setFilterType('all')}
                    sx={{ borderRadius: '8px' }}
                  />
                  <Chip 
                    icon={<DateIcon fontSize="small" />}
                    label="วันนี้" 
                    color={filterType === 'today' ? 'primary' : 'default'} 
                    onClick={() => setFilterType('today')}
                    sx={{ borderRadius: '8px' }}
                  />
                  <Chip 
                    icon={<DateIcon fontSize="small" />}
                    label="สัปดาห์นี้" 
                    color={filterType === 'week' ? 'primary' : 'default'} 
                    onClick={() => setFilterType('week')}
                    sx={{ borderRadius: '8px' }}
                  />
                  <Chip 
                    icon={<DateIcon fontSize="small" />}
                    label="เดือนนี้" 
                    color={filterType === 'month' ? 'primary' : 'default'} 
                    onClick={() => setFilterType('month')}
                    sx={{ borderRadius: '8px' }}
                  />
                </Box>
              </Grid>
            </Grid>

            {/* Advanced Filters */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>สถานะ</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    label="สถานะ"
                    sx={{ borderRadius: '8px' }}
                  >
                    <MenuItem value="all">ทั้งหมด</MenuItem>
                    {statuses.map((status) => (
                      <MenuItem key={status} value={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>ระดับความสำคัญ</InputLabel>
                  <Select
                    value={priorityFilter}
                    onChange={handlePriorityFilterChange}
                    label="ระดับความสำคัญ"
                    sx={{ borderRadius: '8px' }}
                  >
                    <MenuItem value="all">ทั้งหมด</MenuItem>
                    {priorities.map((priority) => (
                      <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>เพศ</InputLabel>
                  <Select
                    value={genderFilter}
                    onChange={handleGenderFilterChange}
                    label="เพศ"
                    sx={{ borderRadius: '8px' }}
                  >
                    <MenuItem value="all">ทั้งหมด</MenuItem>
                    <MenuItem value="ชาย">ชาย</MenuItem>
                    <MenuItem value="หญิง">หญิง</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="outlined" 
                  startIcon={<ClearIcon />} 
                  onClick={handleClearFilters}
                  fullWidth
                  sx={{ borderRadius: '8px', height: '40px' }}
                >
                  ล้างตัวกรอง
                </Button>
              </Grid>
            </Grid>
            
            {filteredData.length === 0 && !loading && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                py: 5 
              }}>
                <SearchIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" color="text.secondary">
                  ไม่พบข้อมูลผู้ป่วยที่ค้นหา
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  ลองค้นหาด้วยคำค้นอื่น หรือล้างตัวกรองเพื่อดูข้อมูลทั้งหมด
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
  
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)'
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
  
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
            <CircularProgress size={60} thickness={4} />
          </Box>
        ) : (
          <Card 
            elevation={3} 
            sx={{ 
              borderRadius: '16px',
              overflow: 'hidden'
            }}
          >
            {!isMobile ? (
              // Desktop/Tablet view - Table
              <>
                <TableContainer sx={{ minHeight: '400px' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'primary.main' }}>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>ผู้ป่วย</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>รหัสผู้ป่วย</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>อายุ/เพศ</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>ติดต่อ</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>อาการ/โรค</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>ความสำคัญ</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>สถานะ</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>วันที่เข้ารับการรักษา</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>จัดการ</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {currentPageData.map((patient) => (
                        <TableRow 
                          key={patient.id} 
                          hover
                          sx={{
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: 'rgba(63, 81, 181, 0.08)',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)'
                            }
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar 
                                sx={{ 
                                  bgcolor: getGenderColor(patient.gender),
                                  width: 40,
                                  height: 40
                                }}
                              >
                                {patient.first_name.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body1" fontWeight="medium">
                                  {patient.first_name} {patient.last_name}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'medium' }}>{patient.patient_id}</TableCell>
                          <TableCell>{patient.age} ปี / {patient.gender}</TableCell>
                          <TableCell>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <PhoneIcon fontSize="small" color="action" />
                                <Typography variant="body2">{patient.phone}</Typography>
                              </Box>
                              {patient.email && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <EmailIcon fontSize="small" color="action" />
                                  <Typography variant="body2">{patient.email}</Typography>
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {patient.medical_condition || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={patient.priority_level} 
                              color={getPriorityColor(patient.priority_level) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                              size="small"
                              sx={{ borderRadius: '4px' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={patient.status} 
                              color={getStatusColor(patient.status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                              size="small"
                              sx={{ borderRadius: '4px' }}
                            />
                          </TableCell>
                          <TableCell>{formatDate(patient.admission_date)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="ดูข้อมูล">
                                <IconButton 
                                  color="info" 
                                  onClick={() => navigate(`/patients/view/${patient.id}`)}
                                  size="small"
                                  sx={{ 
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                      backgroundColor: 'info.light',
                                      color: 'white'
                                    }
                                  }}
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="แก้ไข">
                                <IconButton 
                                  color="primary" 
                                  onClick={() => navigate(`/patients/edit/${patient.id}`)}
                                  size="small"
                                  sx={{ 
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                      backgroundColor: 'primary.light',
                                      color: 'white'
                                    }
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="ลบ">
                                <IconButton 
                                  color="error" 
                                  onClick={() => handleDelete(patient.id)}
                                  size="small"
                                  sx={{ 
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                      backgroundColor: 'error.light',
                                      color: 'white'
                                    }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <TablePagination
                  rowsPerPageOptions={[15, 25, 50]}
                  component="div"
                  count={filteredData.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage="แสดง:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
                  sx={{
                    borderTop: '1px solid rgba(224, 224, 224, 1)',
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                      fontWeight: 'medium'
                    }
                  }}
                />
              </>
            ) : (
              // Mobile view - Card style
              <>
                <Box sx={{ p: 2, minHeight: '400px' }}>
                  {currentPageData.map((patient) => (
                    <Card 
                      key={patient.id} 
                      variant="outlined" 
                      sx={{ 
                        mb: 2, 
                        borderRadius: '12px',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <CardContent sx={{ pb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: getGenderColor(patient.gender),
                              width: 50,
                              height: 50
                            }}
                          >
                            {patient.first_name.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight="medium">
                              {patient.first_name} {patient.last_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              รหัส: {patient.patient_id} | {patient.age} ปี ({patient.gender})
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <PhoneIcon fontSize="small" color="action" />
                              <Typography variant="body2">{patient.phone}</Typography>
                            </Box>
                            {patient.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <EmailIcon fontSize="small" color="action" />
                                <Typography variant="body2">{patient.email}</Typography>
                              </Box>
                            )}
                            {patient.address && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationIcon fontSize="small" color="action" />
                                <Typography variant="body2" noWrap>
                                  {patient.address}
                                </Typography>
                              </Box>
                            )}
                          </Grid>
                        </Grid>
                        
                        {patient.medical_condition && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                              อาการ/โรค
                            </Typography>
                            <Typography variant="body2">
                              {patient.medical_condition}
                            </Typography>
                          </Box>
                        )}
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            วันที่เข้ารับการรักษา
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(patient.admission_date)}
                          </Typography>
                        </Box>
                        
                        <Divider sx={{ my: 1.5 }} />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip 
                              label={patient.priority_level} 
                              color={getPriorityColor(patient.priority_level) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                              size="small"
                              sx={{ borderRadius: '4px' }}
                            />
                            <Chip 
                              label={patient.status} 
                              color={getStatusColor(patient.status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                              size="small"
                              sx={{ borderRadius: '4px' }}
                            />
                          </Box>
                          
                          <Box>
                            <Tooltip title="ดูข้อมูล">
                              <IconButton 
                                color="info" 
                                size="small"
                                onClick={() => navigate(`/patients/view/${patient.id}`)}
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="แก้ไข">
                              <IconButton 
                                color="primary" 
                                size="small"
                                onClick={() => navigate(`/patients/edit/${patient.id}`)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="ลบ">
                              <IconButton 
                                color="error" 
                                size="small"
                                onClick={() => handleDelete(patient.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
                
                <TablePagination
                  rowsPerPageOptions={[15, 25, 50]}
                  component="div"
                  count={filteredData.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage="แสดง:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
                  sx={{
                    borderTop: '1px solid rgba(224, 224, 224, 1)',
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                      fontWeight: 'medium'
                    }
                  }}
                />
              </>
            )}
          </Card>
        )}
  
        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          PaperProps={{
            sx: { 
              borderRadius: '12px',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          <MenuItem onClick={() => {
            if (selectedItemId) {
              navigate(`/patients/edit/${encodeURIComponent(selectedItemId)}`);
              handleCloseMenu();
            }
          }}>
            <ListItemIcon>
              <EditIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText>แก้ไขข้อมูลผู้ป่วย</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => {
            if (selectedItemId) {
              handleDelete(selectedItemId);
            }
          }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>ลบข้อมูลผู้ป่วย</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => {
            if (selectedItemId) {
              navigate(`/patients/view/${encodeURIComponent(selectedItemId)}`);
              handleCloseMenu();
            }
          }}>
            <ListItemIcon>
              <ViewIcon fontSize="small" color="info" />
            </ListItemIcon>
            <ListItemText>ดูรายละเอียด</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => {
            if (selectedItemId) {
              navigate(`/patients/medical-record/${encodeURIComponent(selectedItemId)}`);
              handleCloseMenu();
            }
          }}>
            <ListItemIcon>
              <MedicalRecordIcon fontSize="small" color="secondary" />
            </ListItemIcon>
            <ListItemText>ประวัติการรักษา</ListItemText>
          </MenuItem>
        </Menu>

        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={() => setOpenSnackbar(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setOpenSnackbar(false)} 
            severity="success" 
            variant="filled"
            sx={{ width: '100%', borderRadius: '8px' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
};

export default AllData;
