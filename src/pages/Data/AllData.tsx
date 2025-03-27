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
  SelectChangeEvent
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon,
  FileDownload as ExportIcon,
  CalendarMonth as DateIcon,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getUserBranchId } from '../../utils/auth';

interface DataItem {
  id: string;
  document_name: string;
  sender_name: string;
  receiver_name: string;
  notes?: string;
  action?: string;
  status: string;
  document_date?: string;
  created_at: string;
}

const AllData: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [filteredData, setFilteredData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statuses, setStatuses] = useState<string[]>([]);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  
  // Action menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // ดึง branchId ของ user ที่ login
  const userBranchId = getUserBranchId();

  // ดึงข้อมูลสถานะทั้งหมด
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await axios.get(`${apiUrl}/data/statuses`);
        setStatuses(response.data);
      } catch (err) {
        console.error('Error fetching statuses:', err);
      }
    };

    fetchStatuses();
  }, [apiUrl]);

  // ดึงข้อมูลทั้งหมด
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(`${apiUrl}/data`);
      
      // ถ้ามี branchId ให้กรองข้อมูลตาม branchId
      if (userBranchId) {
        const filteredData = response.data.filter((item: DataItem) => 
          item.id.startsWith(userBranchId)
        );
        setData(filteredData);
      } else {
        // ถ้าไม่มี branchId ให้แสดงข้อมูลทั้งหมด
        setData(response.data);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // ตรวจสอบว่า user มีสิทธิ์ลบเอกสารนี้หรือไม่
      if (userBranchId && !id.startsWith(userBranchId)) {
        setSnackbarMessage('คุณไม่มีสิทธิ์ลบเอกสารนี้');
        setOpenSnackbar(true);
        return;
      }
      
      await axios.delete(`${apiUrl}/data/${id}`);
      setSnackbarMessage('ลบเอกสารเรียบร้อยแล้ว');
      setOpenSnackbar(true);
      
      // อัปเดตข้อมูลในสเตทโดยไม่ต้อง fetch ใหม่
      setData(prevData => prevData.filter(item => item.id !== id));
      
      handleCloseMenu();
    } catch (err) {
      console.error('Error deleting data:', err);
      setSnackbarMessage('ไม่สามารถลบเอกสารได้');
      setOpenSnackbar(true);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter data based on search term, filter type, and status
  useEffect(() => {
    let result = data;
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(item => 
        item.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.receiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.action && item.action.toLowerCase().includes(searchTerm.toLowerCase()))
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
    
    setFilteredData(result);
    setPage(0); // Reset to first page when filtering
  }, [searchTerm, filterType, statusFilter, data]);

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
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
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
      case 'อนุมัติ':
        return 'success';
      case 'รอดำเนินการ':
        return 'warning';
      case 'แก้ไข':
        return 'error';
      default:
        return 'default';
    }
  };

  // ตรวจสอบว่า user มีสิทธิ์แก้ไขเอกสารหรือไม่
  const canEditDocument = (documentId: string) => {
    if (!userBranchId) return true; // ถ้าไม่มี branchId ให้แก้ไขได้ทั้งหมด
    return documentId.startsWith(userBranchId);
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
                <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
                  จัดการข้อมูลเอกสาร
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  ค้นหา จัดการ และเรียกดูข้อมูลเอกสาร
                  {userBranchId && (
                    <Typography component="span" fontWeight="medium" color="primary.main">
                      {` (${userBranchId})`}
                    </Typography>
                  )}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  component={Link}
                  to="/data/addnew"
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
                  เพิ่มเอกสารใหม่
                </Button>
                
                <Button 
                  variant="outlined" 
                  startIcon={<ExportIcon />}
                  component={Link}
                  to="/data/export"
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
                    onClick={fetchData} 
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
                  placeholder="ค้นหาเอกสาร..."
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
                    sx={{ 
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  />
                  <Chip 
                    icon={<DateIcon fontSize="small" />}
                    label="วันนี้" 
                    color={filterType === 'today' ? 'primary' : 'default'} 
                    onClick={() => setFilterType('today')}
                    sx={{ 
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  />
                  <Chip 
                    icon={<DateIcon fontSize="small" />}
                    label="สัปดาห์นี้" 
                    color={filterType === 'week' ? 'primary' : 'default'} 
                    onClick={() => setFilterType('week')}
                    sx={{ 
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  />
                  <Chip 
                    icon={<DateIcon fontSize="small" />}
                    label="เดือนนี้" 
                    color={filterType === 'month' ? 'primary' : 'default'} 
                    onClick={() => setFilterType('month')}
                    sx={{ 
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  />
                  
                  <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                  
                  <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                    <InputLabel id="status-filter-label">สถานะ</InputLabel>
                    <Select
                      labelId="status-filter-label"
                      id="status-filter"
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
                  
                  {(searchTerm || filterType !== 'all' || statusFilter !== 'all') && (
                    <Chip 
                      icon={<ClearIcon fontSize="small" />}
                      label="ล้างตัวกรอง" 
                      variant="outlined"
                      onClick={handleClearFilters}
                      sx={{ 
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          backgroundColor: 'error.light',
                          color: 'error.main'
                        }
                      }}
                    />
                  )}
                </Box>
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
                  ไม่พบข้อมูลที่ค้นหา
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  ลองค้นหาด้วยคำค้นอื่น หรือล้างตัวกรองเพื่อดูข้อมูลทั้งหมด
                </Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<ClearIcon />} 
                  onClick={handleClearFilters}
                  sx={{ mt: 2 }}
                >
                  ล้างตัวกรอง
                </Button>
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
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>เลขที่เอกสาร</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>วันที่</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>จาก</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>ถึง</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>เรื่อง</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>การปฏิบัติ</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>สถานะ</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>หมายเหตุ</TableCell>
                        <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>จัดการ</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {currentPageData.map((item) => (
                        <TableRow 
                          key={item.id} 
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
                          <TableCell sx={{ fontWeight: 'medium' }}>{item.id}</TableCell>
                          <TableCell>{item.document_date ? formatDate(item.document_date) : '-'}</TableCell>
                          <TableCell>{item.sender_name}</TableCell>
                          <TableCell>{item.receiver_name}</TableCell>
                          <TableCell>{item.document_name}</TableCell>
                          <TableCell>{item.action || '-'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={item.status} 
                              color={getStatusColor(item.status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                              size="small"
                              sx={{ borderRadius: '4px' }}
                            />
                          </TableCell>
                          <TableCell>{item.notes || '-'}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {canEditDocument(item.id) ? (
                                <>
                                  <Tooltip title="แก้ไข">
                                    <IconButton 
                                      color="primary" 
                                      onClick={() => navigate(`/data/edit/${item.id}`)}
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
                                      onClick={() => handleDelete(item.id)}
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
                                </>
                              ) : (
                                <Tooltip title="ดูเท่านั้น">
                                  <IconButton 
                                    color="info" 
                                    onClick={() => navigate(`/data/view/${item.id}`)}
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
                              )}
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
                  {currentPageData.map((item) => (
                    <Card 
                      key={item.id} 
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                              เลขที่เอกสาร
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {item.id}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {item.document_date ? formatDate(item.document_date) : '-'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            เรื่อง
                          </Typography>
                          <Typography variant="body1">
                            {item.document_name}
                          </Typography>
                        </Box>
                        
                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">
                              จาก
                            </Typography>
                            <Typography variant="body2">
                              {item.sender_name}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary">
                              ถึง
                            </Typography>
                            <Typography variant="body2">
                              {item.receiver_name}
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        {item.action && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                              การปฏิบัติ
                            </Typography>
                            <Typography variant="body2">
                              {item.action}
                            </Typography>
                          </Box>
                        )}
                        
                        {item.notes && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                              หมายเหตุ
                            </Typography>
                            <Typography variant="body2">
                              {item.notes}
                            </Typography>
                          </Box>
                        )}
                        
                        <Divider sx={{ my: 1.5 }} />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Chip 
                            label={item.status} 
                            color={getStatusColor(item.status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                            size="small"
                            sx={{ borderRadius: '4px' }}
                          />
                          
                          <Box>
                            {canEditDocument(item.id) ? (
                              <>
                                <Tooltip title="แก้ไข">
                                  <IconButton 
                                    color="primary" 
                                    size="small"
                                    onClick={() => navigate(`/data/edit/${item.id}`)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="ลบ">
                                  <IconButton 
                                    color="error" 
                                    size="small"
                                    onClick={() => handleDelete(item.id)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : (
                              <Tooltip title="ดูเท่านั้น">
                                <IconButton 
                                  color="info" 
                                  size="small"
                                  onClick={() => navigate(`/data/view/${item.id}`)}
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
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
            if (selectedItemId && canEditDocument(selectedItemId)) {
              navigate(`/data/edit/${encodeURIComponent(selectedItemId)}`);
              handleCloseMenu();
            }
          }}>
            <ListItemIcon>
              <EditIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText>แก้ไขเอกสาร</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => {
            if (selectedItemId && canEditDocument(selectedItemId)) {
              handleDelete(selectedItemId);
            }
          }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>ลบเอกสาร</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => {
            if (selectedItemId) {
              navigate(`/data/view/${encodeURIComponent(selectedItemId)}`);
              handleCloseMenu();
            }
          }}>
            <ListItemIcon>
              <ViewIcon fontSize="small" color="info" />
            </ListItemIcon>
            <ListItemText>ดูรายละเอียด</ListItemText>
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


