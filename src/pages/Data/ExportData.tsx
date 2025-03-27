import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  SelectChangeEvent,
  Tooltip,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  TablePagination,
  Fade,
  Chip,
} from '@mui/material';
import {
  TableChart as ExcelIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format} from 'date-fns';
import { th } from 'date-fns/locale';
import * as XLSX from 'xlsx';

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

const ExportData: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(15);
  const rowsPerPageOptions = [15, 25, 50];
  const [data, setData] = useState<DataItem[]>([]);
  const [filteredData, setFilteredData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'id', 'document_date', 'sender_name', 'receiver_name', 'document_name', 'action', 'status', 'notes'
  ]);
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const apiUrl = import.meta.env.VITE_API_URL;

  // Updated columns to match AllData.tsx
  const columns = [
    { id: 'id', label: 'เลขที่เอกสาร' },
    { id: 'document_date', label: 'วันที่' },
    { id: 'sender_name', label: 'จาก' },
    { id: 'receiver_name', label: 'ถึง' },
    { id: 'document_name', label: 'เรื่อง' },
    { id: 'action', label: 'การปฏิบัติ' },
    { id: 'status', label: 'สถานะ' },
    { id: 'notes', label: 'หมายเหตุ' }
  ];
  
  const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/data`);
      setData(response.data);
      setFilteredData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [startDate, endDate, data]);

  const filterData = () => {
    let filtered = [...data];

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate <= end;
      });
    }

    setFilteredData(filtered);
    setPage(0); // Reset to first page when filtering
  };

  const handleColumnChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setSelectedColumns(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // ฟังก์ชันสำหรับตัดข้อความที่ยาวเกินไป

  // Get status color (copied from AllData.tsx)
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

  const exportToExcel = () => {
    try {
      if (filteredData.length === 0) {
        setSnackbarMessage('ไม่มีข้อมูลที่จะส่งออก');
        setOpenSnackbar(true);
        return;
      }

      // สร้างข้อมูลสำหรับส่งออก
      const exportData = filteredData.map(item => {
        const row: Record<string, any> = {};
        
        selectedColumns.forEach(col => {
          const column = columns.find(c => c.id === col);
          if (column) {
            if (col === 'document_date') {
              row[column.label] = item.document_date ? formatDate(item.document_date) : '-';
            } else if (col === 'status') {
              row[column.label] = item.status || '-';
            } else {
              row[column.label] = item[col as keyof DataItem] || '-';
            }
          }
        });
        
        return row;
      });

      // สร้าง worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // สร้าง workbook และเพิ่ม worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Documents');
      
      // กำหนดชื่อไฟล์
      const fileName = `document_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
      
      // ส่งออกไฟล์
      XLSX.writeFile(wb, fileName);
      
      setSnackbarMessage('ส่งออกข้อมูลเป็น Excel สำเร็จ');
      setOpenSnackbar(true);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      setSnackbarMessage('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
      setOpenSnackbar(true);
    }
  };

  // แสดงผลแบบ Card สำหรับมือถือ
  const renderMobileView = () => {
    return (
      <Box>
        {filteredData.length > 0 ? (
          filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item) => (
            <Card 
              key={item.id} 
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
                
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    สถานะ
                  </Typography>
                  <Chip 
                    label={item.status} 
                    color={getStatusColor(item.status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                    size="small"
                    sx={{ borderRadius: '4px', mt: 0.5 }}
                  />
                </Box>
                
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
              </CardContent>
            </Card>
          ))
        ) : (
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</Typography>
          </Paper>
        )}
      </Box>
    );
  };

  // แสดงผลแบบตารางสำหรับแท็บเล็ตและเดสก์ท็อป
  const renderTableView = () => {
    // คำนวณข้อมูลที่จะแสดงในหน้าปัจจุบัน
    const paginatedData = filteredData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  
    return (
      <>
        <TableContainer sx={{ minHeight: '400px' }}>
          <Table size={isTablet ? "small" : "medium"}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {selectedColumns.map((colId) => {
                  const column = columns.find(col => col.id === colId);
                  return (
                    <TableCell key={colId} sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>
                      {column ? column.label : colId}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => (
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
                    {selectedColumns.map((colId) => {
                      if (colId === 'document_date') {
                        return (
                          <TableCell key={colId}>
                                                        {item.document_date ? formatDate(item.document_date) : '-'}
                          </TableCell>
                        );
                      } else if (colId === 'status') {
                        return (
                          <TableCell key={colId}>
                            <Chip 
                              label={item.status} 
                              color={getStatusColor(item.status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                              size="small"
                              sx={{ borderRadius: '4px' }}
                            />
                          </TableCell>
                        );
                      } else {
                        return (
                          <TableCell key={colId}>
                            {item[colId as keyof DataItem] || '-'}
                          </TableCell>
                        );
                      }
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={selectedColumns.length} align="center">
                    ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
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
    );
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
                  ส่งออกข้อมูลเอกสาร
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  กรองและส่งออกข้อมูลเอกสารตามเงื่อนไขที่ต้องการ
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  startIcon={<ExcelIcon />}
                  onClick={exportToExcel}
                  color="success"
                  disabled={filteredData.length === 0}
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
                  ส่งออก Excel
                </Button>
                
                <Button 
                  variant="outlined" 
                  startIcon={<ArrowBackIcon />}
                  component={Link}
                  to="/data"
                  sx={{ 
                    borderRadius: '10px',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                    }
                  }}
                >
                  กลับไปหน้าข้อมูล
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
  
        <Card 
          elevation={3} 
          sx={{ 
            borderRadius: '16px',
            overflow: 'hidden',
            mb: 4
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" gutterBottom fontWeight="medium">
              ตัวกรองข้อมูล
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
                  <DatePicker
                    label="วันที่เริ่มต้น"
                    value={startDate}
                    onChange={(newValue: Date | null) => setStartDate(newValue)}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        size: isMobile ? "small" : "medium",
                        sx: {
                          borderRadius: '12px',
                          '&.Mui-focused': {
                            boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.2)'
                          }
                        }
                      } 
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
                  <DatePicker
                    label="วันที่สิ้นสุด"
                    value={endDate}
                    onChange={(newValue: Date | null) => setEndDate(newValue)}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        size: isMobile ? "small" : "medium",
                        sx: {
                          borderRadius: '12px',
                          '&.Mui-focused': {
                            boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.2)'
                          }
                        }
                      } 
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl 
                  fullWidth 
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    }
                  }}
                >
                  <InputLabel id="columns-select-label">คอลัมน์ที่ต้องการส่งออก</InputLabel>
                  <Select
                    labelId="columns-select-label"
                    multiple
                    value={selectedColumns}
                    onChange={handleColumnChange}
                    input={<OutlinedInput label="คอลัมน์ที่ต้องการส่งออก" />}
                    renderValue={(selected) => {
                      return selected.map(value => {
                        const column = columns.find(col => col.id === value);
                        return column ? column.label : value;
                      }).join(', ');
                    }}
                  >
                    {columns.map((column) => (
                      <MenuItem key={column.id} value={column.id}>
                        <Checkbox checked={selectedColumns.indexOf(column.id) > -1} />
                        <ListItemText primary={column.label} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
  
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2,
          px: 1
        }}>
          <Typography variant="h6" fontWeight="medium">
            ผลลัพธ์: {filteredData.length} รายการ
          </Typography>
        </Box>
  
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
            {isMobile ? renderMobileView() : renderTableView()}
          </Card>
        )}
  
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
  
export default ExportData;

