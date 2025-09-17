import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageDebug } from '../../../../hooks/usePageDebug';
import { TableSchema } from '../../../../types/Debug';
import { DebugManager } from '../../../../utils/Debuger';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  InputAdornment,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import axios from 'axios';

interface Employee {
  id: string;
  prefix: string;
  firstNameTh: string;
  lastNameTh: string;
  gender: string;
  phone: string;
  nationalId: string;
  profileImage?: string;
  employeeType: 'doctor' | 'nurse' | 'staff';
  departmentId: string;
  position: string;
  licenseNumber?: string;
  specialties?: string[];
  startDate: string;
  status: 'active' | 'inactive' | 'leave';
  username: string;
  password: string;
  role: 'admin' | 'doctor' | 'nurse' | 'staff';
  email?: string;
  address?: string;
  workingDays?: string[];
  workingHours?: {
    start: string;
    end: string;
  };
}

interface Department {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
}

const SearchEmployee: React.FC = () => {
  const navigate = useNavigate();
  const debugManager = DebugManager.getInstance();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Debug setup
  const requiredTables: TableSchema[] = [
    {
      tableName: 'employees',
      columns: ['id', 'prefix', 'firstNameTh', 'lastNameTh', 'gender', 'phone', 'nationalId', 'profileImage', 'employeeType', 'departmentId', 'position', 'licenseNumber', 'specialties', 'startDate', 'status', 'username', 'password', 'role', 'email', 'address', 'workingDays', 'workingHours'],
      description: 'ข้อมูลพนักงานทั้งหมด'
    },
    {
      tableName: 'departments',
      columns: ['id', 'name', 'description', 'color', 'isActive'],
      description: 'แผนกต่างๆ ในโรงพยาบาล'
    }
  ];

  usePageDebug('ค้นหาพนักงาน', requiredTables);

  // โหลดข้อมูลพนักงานและแผนก
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [empRes, deptRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/worker/`),
          axios.get(`${API_BASE_URL}/api/workplace/department`)
        ]);
        setAllEmployees(empRes.data || []);
        setDepartments(deptRes.data || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  // ค้นหาแบบ real-time
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(() => {
      const results = allEmployees.filter(employee => {
        const fullName = `${employee.prefix} ${employee.firstNameTh} ${employee.lastNameTh}`;
        const department = departments.find(d => d.id === employee.departmentId);
        
        return (
          fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.phone.includes(searchTerm) ||
          employee.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.nationalId?.includes(searchTerm) ||
          employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
          department?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      setSearchResults(results);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm, allEmployees, departments]);

  const handleViewEmployee = (employee: Employee) => {
    navigate(`/member/employee/dataemployee/${employee.id}`, { 
      state: { employee } 
    });
  };

  const handleEditEmployee = (employee: Employee) => {
    navigate('/member/employee/addemployee', { 
      state: { 
        isEdit: true, 
        employee: employee 
      } 
    });
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (window.confirm(`คุณต้องการลบข้อมูลพนักงาน "${employee.prefix} ${employee.firstNameTh} ${employee.lastNameTh}" ใช่หรือไม่?`)) {
      setIsLoading(true);
      try {
        await axios.delete(`${API_BASE_URL}/api/worker/${employee.id}`);
        setAllEmployees(prev => prev.filter(emp => emp.id !== employee.id));
        if (searchTerm.trim()) {
          setSearchResults(prev => prev.filter(emp => emp.id !== employee.id));
        }
      } catch (error) {
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      }
      setIsLoading(false);
    }
  };

  const handleAddEmployee = () => {
    navigate('/member/employee/addemployee');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'leave': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'ทำงานปกติ';
      case 'inactive': return 'พักงาน';
      case 'leave': return 'ลาออก';
      default: return 'ไม่ระบุ';
    }
  };

  const getEmployeeTypeText = (type: string) => {
    switch (type) {
      case 'doctor': return 'แพทย์';
      case 'nurse': return 'พยาบาล';
      case 'staff': return 'เจ้าหน้าที่';
      default: return 'ไม่ระบุ';
    }
  };

  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    return department?.name || 'ไม่ระบุแผนก';
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            ค้นหาพนักงาน
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddEmployee}
            size="large"
          >
            เพิ่มพนักงานใหม่
          </Button>
        </Box>

        {/* Search Box */}
        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            placeholder="ค้นหาด้วย ชื่อ-นามสกุล, เบอร์โทร, รหัสพนักงาน, เลขบัตรประชาชน, ตำแหน่ง, แผนก, ชื่อผู้ใช้..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Results */}
        {isLoading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>กำลังค้นหา...</Typography>
          </Box>
        ) : searchTerm.trim() === '' ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              ค้นหาพนักงาน
            </Typography>
            <Typography variant="body1" color="text.secondary">
              กรอกชื่อ หรือข้อมูลที่ต้องการค้นหาในช่องด้านบน
            </Typography>
          </Box>
                ) : searchResults.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              ไม่พบข้อมูลพนักงาน
            </Typography>
            <Typography variant="body1" color="text.secondary">
              ไม่พบพนักงานที่ตรงกับคำค้นหา "{searchTerm}"
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>
              ผลการค้นหา ({searchResults.length} รายการ)
            </Typography>
            <Grid container spacing={3}>
              {searchResults.map((employee) => (
                <Grid item xs={12} sm={6} md={4} key={employee.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4
                      }
                    }}
                  >
                    <CardContent>
                      {/* Header with Avatar and Status */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                        <Avatar
                          src={employee.profileImage ? `${API_BASE_URL}/uploads/${employee.profileImage}` : undefined}
                          sx={{ width: 56, height: 56, mr: 2 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="h6" noWrap>
                            {employee.prefix} {employee.firstNameTh} {employee.lastNameTh}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            <Chip 
                              label={getEmployeeTypeText(employee.employeeType)} 
                              color="primary" 
                              size="small"
                            />
                            <Chip 
                              label={getStatusText(employee.status)} 
                              color={getStatusColor(employee.status) as any}
                              size="small"
                            />
                          </Box>
                        </Box>
                      </Box>

                      {/* Employee Details */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <WorkIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                          {employee.position}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          🏥 {getDepartmentName(employee.departmentId)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          📞 {employee.phone}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          🆔 {employee.id}
                        </Typography>
                      </Box>

                      {/* Specialties (for doctors) */}
                      {employee.employeeType === 'doctor' && employee.specialties && employee.specialties.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" gutterBottom>
                            ความเชี่ยวชาญ:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {employee.specialties.slice(0, 2).map((specialty, index) => (
                              <Chip
                                key={index}
                                label={specialty}
                                size="small"
                                variant="outlined"
                                color="secondary"
                              />
                            ))}
                            {employee.specialties.length > 2 && (
                              <Chip
                                label={`+${employee.specialties.length - 2}`}
                                size="small"
                                variant="outlined"
                                color="default"
                              />
                            )}
                          </Box>
                        </Box>
                      )}

                      {/* Action Buttons */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Tooltip title="ดูข้อมูล">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleViewEmployee(employee)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="แก้ไข">
                          <IconButton 
                            size="small" 
                            color="warning"
                            onClick={() => handleEditEmployee(employee)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ลบ">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteEmployee(employee)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Summary Info */}
        {allEmployees.length > 0 && (
          <Box sx={{ mt: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              สรุปข้อมูลพนักงาน
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {allEmployees.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    พนักงานทั้งหมด
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {allEmployees.filter(emp => emp.employeeType === 'doctor').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    แพทย์
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {allEmployees.filter(emp => emp.employeeType === 'nurse').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    พยาบาล
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {allEmployees.filter(emp => emp.employeeType === 'staff').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    เจ้าหน้าที่
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* No Data Alert */}
        {allEmployees.length === 0 && !isLoading && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              ยังไม่มีข้อมูลพนักงาน
            </Typography>
            <Typography>
              คลิกปุ่ม "เพิ่มพนักงานใหม่" เพื่อเริ่มเพิ่มข้อมูลพนักงาน
            </Typography>
          </Alert>
        )}

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px dashed #ccc' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Debug Info (Development Only)
            </Typography>
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
              <pre style={{ margin: 0, fontSize: '0.75rem' }}>
                {JSON.stringify({
                  totalEmployees: allEmployees.length,
                  searchResults: searchResults.length,
                  searchTerm,
                  departments: departments.length,
                  employeeTypes: {
                    doctors: allEmployees.filter(emp => emp.employeeType === 'doctor').length,
                    nurses: allEmployees.filter(emp => emp.employeeType === 'nurse').length,
                    staff: allEmployees.filter(emp => emp.employeeType === 'staff').length
                  }
                }, null, 2)}
              </pre>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SearchEmployee;

