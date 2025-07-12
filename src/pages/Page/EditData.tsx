import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Container,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
  InputAdornment,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Breadcrumbs,
  Link as MuiLink,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { 
  Save as SaveIcon, 
  ArrowBack as ArrowBackIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  PersonOutline as ReceiverIcon,
  Note as NoteIcon,
  CheckCircleOutline as SuccessIcon,
  Home as HomeIcon,
  Article as ArticleIcon,
  Assignment as ActionIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

interface FormData {
  document_name: string;
  sender_name: string;
  receiver_name: string;
  notes: string;
  action: string;
  status: string;
  document_date: Date | null;
}

const EditData: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<FormData>({
    document_name: '',
    sender_name: '',
    receiver_name: '',
    notes: '',
    action: '',
    status: 'รอดำเนินการ',
    document_date: null
  });
  const [originalData, setOriginalData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [openSuccessDialog, setOpenSuccessDialog] = useState(false);
  const [statuses, setStatuses] = useState<string[]>([]);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  // โหลดข้อมูลสถานะ
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

  // โหลดข้อมูลเมื่อเปิดหน้า
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${apiUrl}/data/${id}`);
        const data = response.data;
        
        // แปลงวันที่จาก string เป็น Date object ถ้ามีข้อมูล
        const documentDate = data.document_date ? new Date(data.document_date) : null;
        
        setFormData({
          document_name: data.document_name || '',
          sender_name: data.sender_name || '',
          receiver_name: data.receiver_name || '',
          notes: data.notes || '',
          action: data.action || '',
          status: data.status || 'รอดำเนินการ',
          document_date: documentDate
        });
        
        // เก็บข้อมูลต้นฉบับไว้เพื่อเปรียบเทียบการเปลี่ยนแปลง
        setOriginalData({
          document_name: data.document_name || '',
          sender_name: data.sender_name || '',
          receiver_name: data.receiver_name || '',
          notes: data.notes || '',
          action: data.action || '',
          status: data.status || 'รอดำเนินการ',
          document_date: documentDate
        });
        
        setError(null);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError('ไม่สามารถโหลดข้อมูลเอกสารได้ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, apiUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date: Date | null) => {
    setFormData(prev => ({
      ...prev,
      document_date: date
    }));
  };

  const hasChanges = () => {
    if (!originalData) return false;
    
    // เปรียบเทียบวันที่แบบพิเศษ
    const originalDateStr = originalData.document_date ? originalData.document_date.toISOString().substring(0, 10) : null;
    const currentDateStr = formData.document_date ? formData.document_date.toISOString().substring(0, 10) : null;
    
    return (
      formData.document_name !== originalData.document_name ||
      formData.sender_name !== originalData.sender_name ||
      formData.receiver_name !== originalData.receiver_name ||
      formData.notes !== originalData.notes ||
      formData.action !== originalData.action ||
      formData.status !== originalData.status ||
      originalDateStr !== currentDateStr
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.document_name || !formData.sender_name || !formData.receiver_name) {
      setError('กรุณากรอกเรื่อง, จาก และถึง');
      return;
    }

    // ถ้าไม่มีการเปลี่ยนแปลง
    if (!hasChanges()) {
      setSnackbarMessage('ไม่มีข้อมูลที่เปลี่ยนแปลง');
      setOpenSnackbar(true);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      // แปลงวันที่ให้เป็นรูปแบบที่เหมาะสม
      const dataToSend = {
        ...formData,
        document_date: formData.document_date ? formData.document_date.toISOString().substring(0, 10) : null
      };
      
      await axios.put(`${apiUrl}/data/${id}`, dataToSend);
      
      // อัพเดทข้อมูลต้นฉบับ
      setOriginalData({...formData});
      
      setOpenSuccessDialog(true);
      setSnackbarMessage('อัพเดทข้อมูลเรียบร้อยแล้ว');
      setOpenSnackbar(true);
    } catch (err) {
      console.error('Error updating document:', err);
      setError('เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSuccessDialog = () => {
    setOpenSuccessDialog(false);
  };

  const handleViewDocuments = () => {
    setOpenSuccessDialog(false);
    navigate('/data');
  };

  // สร้าง Skeleton สำหรับแสดงขณะโหลดข้อมูล
  const renderSkeleton = () => (
    <Box sx={{ p: 4 }}>
      <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={60} sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Skeleton variant="rectangular" height={60} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Skeleton variant="rectangular" height={60} />
        </Grid>
        <Grid item xs={12}>
          <Skeleton variant="rectangular" height={120} />
        </Grid>
      </Grid>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Skeleton variant="rectangular" width={150} height={50} />
      </Box>
    </Box>
  );

  return (
    <Container maxWidth="md">
      <Fade in={true} timeout={800}>
        <Box sx={{ p: 3 }}>
          <Breadcrumbs 
            aria-label="breadcrumb" 
            sx={{ 
              mb: 3,
              '& .MuiBreadcrumbs-ol': {
                alignItems: 'center'
              }
            }}
          >
            <MuiLink 
              component={Link} 
              to="/" 
              color="inherit" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
              หน้าหลัก
            </MuiLink>
            <MuiLink 
              component={Link} 
              to="/data" 
              color="inherit"
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              <ArticleIcon sx={{ mr: 0.5 }} fontSize="small" />
              รายการเอกสาร
            </MuiLink>
            <Typography 
              color="text.primary" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                fontWeight: 'medium'
              }}
            >
              แก้ไขเอกสาร
            </Typography>
          </Breadcrumbs>

          <Button 
            startIcon={<ArrowBackIcon />}
            component={Link}
            to="/data"
            variant="outlined"
            sx={{ 
              mb: 3, 
              borderRadius: '8px',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateX(-5px)'
              }
            }}
          >
            กลับไปหน้ารายการเอกสาร
          </Button>

          <Card 
            elevation={3} 
            sx={{ 
              borderRadius: '16px',
              overflow: 'hidden',
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
              }
            }}
          >
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="h5" component="h2" fontWeight="600" color="primary">
                    แก้ไขเอกสาร
                  </Typography>
                  {!loading && (
                    <Chip 
                      label={id} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ ml: 2, borderRadius: '8px' }}
                    />
                  )}
                </Box>
              }
              subheader={loading ? <Skeleton width="40%" /> : "แก้ไขข้อมูลเอกสารตามต้องการ"}
              sx={{ 
                bgcolor: 'none', 
                color: 'white',
                pb: 1
              }}
            />
            
            <CardContent sx={{ p: 4 }}>
              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3, 
                    borderRadius: '8px',
                    animation: 'fadeIn 0.5s'
                  }}
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              )}

              {loading ? (
                renderSkeleton()
              ) : (
                <form onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="เรื่อง"
                        name="document_name"
                        value={formData.document_name}
                        onChange={handleChange}
                        required
                        variant="outlined"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <DescriptionIcon color="primary" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            transition: 'all 0.3s',
                            '&:hover': {
                              boxShadow: '0 0 0 2px rgba(63, 81, 181, 0.2)'
                            },
                            '&.Mui-focused': {
                              boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.3)'
                            }
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="ชื่อผู้ส่ง"
                        name="sender_name"
                        value={formData.sender_name}
                        onChange={handleChange}
                        required
                        variant="outlined"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonIcon color="primary" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            transition: 'all 0.3s',
                            '&:hover': {
                              boxShadow: '0 0 0 2px rgba(63, 81, 181, 0.2)'
                            },
                            '&.Mui-focused': {
                              boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.3)'
                            }
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="ชื่อผู้รับ"
                        name="receiver_name"
                        value={formData.receiver_name}
                        onChange={handleChange}
                        required
                        variant="outlined"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <ReceiverIcon color="primary" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            transition: 'all 0.3s',
                            '&:hover': {
                              boxShadow: '0 0 0 2px rgba(63, 81, 181, 0.2)'
                            },
                            '&.Mui-focused': {
                              boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.3)'
                            }
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                          label="วันที่เอกสาร"
                          value={formData.document_date}
                          onChange={handleDateChange}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              variant: "outlined",
                              InputProps: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <CalendarIcon color="primary" />
                                  </InputAdornment>
                                ),
                              },
                              sx: {
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '12px',
                                  transition: 'all 0.3s',
                                  '&:hover': {
                                    boxShadow: '0 0 0 2px rgba(63, 81, 181, 0.2)'
                                  },
                                  '&.Mui-focused': {
                                    boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.3)'
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel id="status-label">สถานะ</InputLabel>
                        <Select
                          labelId="status-label"
                          name="status"
                          value={formData.status}
                          onChange={handleSelectChange}
                          label="สถานะ"
                          sx={{
                            borderRadius: '12px',
                            transition: 'all 0.3s',
                            '&:hover': {
                              boxShadow: '0 0 0 2px rgba(63, 81, 181, 0.2)'
                            },
                            '&.Mui-focused': {
                              boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.3)'
                            }
                          }}
                        >
                          {statuses.map((status) => (
                            <MenuItem key={status} value={status}>
                              {status}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="การดำเนินการ"
                        name="action"
                        value={formData.action}
                        onChange={handleChange}
                        variant="outlined"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <ActionIcon color="primary" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            transition: 'all 0.3s',
                            '&:hover': {
                              boxShadow: '0 0 0 2px rgba(63, 81, 181, 0.2)'
                            },
                            '&.Mui-focused': {
                              boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.3)'
                            }
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="หมายเหตุ (ถ้ามี)"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        variant="outlined"
                        multiline
                        rows={4}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                              <NoteIcon color="primary" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            transition: 'all 0.3s',
                            '&:hover': {
                              boxShadow: '0 0 0 2px rgba(63, 81, 181, 0.2)'
                            },
                            '&.Mui-focused': {
                              boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.3)'
                            }
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                        <Button
                          variant="outlined"
                          color="secondary"
                          onClick={() => navigate('/data')}
                          sx={{ 
                            borderRadius: '10px',
                            transition: 'all 0.3s',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                            }
                          }}
                        >
                          ยกเลิก
                        </Button>
                        
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                          disabled={saving || !hasChanges()}
                          size="large"
                          sx={{ 
                            borderRadius: '10px',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.3s',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)'
                            },
                            '&.Mui-disabled': {
                              bgcolor: 'rgba(63, 81, 181, 0.12)',
                              color: 'rgba(0, 0, 0, 0.26)'
                            }
                          }}
                        >
                          {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Dialog แสดงเมื่อบันทึกสำเร็จ */}
          <Dialog
            open={openSuccessDialog}
            onClose={handleCloseSuccessDialog}
            PaperProps={{
              sx: {
                borderRadius: '16px',
                padding: 2,
                maxWidth: '400px'
              }
            }}
          >
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
              <SuccessIcon color="success" sx={{ fontSize: 60, mb: 1 }} />
              <Typography variant="h5" component="div" fontWeight="bold">
                บันทึกข้อมูลสำเร็จ
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" align="center" sx={{ mb: 2 }}>
                อัพเดทข้อมูลเอกสารเรียบร้อยแล้ว
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                เลขที่เอกสาร: <strong>{id}</strong>
              </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
              <Button 
                onClick={handleViewDocuments}
                variant="contained"
                color="primary"
                sx={{ 
                  borderRadius: '10px',
                  minWidth: '150px'
                }}
              >
                ดูรายการเอกสาร
              </Button>
              <Button 
                onClick={handleCloseSuccessDialog}
                variant="outlined"
                sx={{ 
                  borderRadius: '10px',
                  minWidth: '150px'
                }}
              >
                แก้ไขต่อ
              </Button>
            </DialogActions>
          </Dialog>

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
    </Container>
  );
};

export default EditData;

