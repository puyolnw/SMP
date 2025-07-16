import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DebugManager } from '../../../../utils/Debuger';
import { usePageDebug } from '../../../../hooks/usePageDebug';
import { TableSchema } from '../../../../types/Debug';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  InputAdornment,
  Chip,
  CircularProgress,
  Alert,
  Avatar
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

interface Employee {
  id: string;
  prefix: string;
  firstNameTh: string;
  lastNameTh: string;
  gender: string;
  phone: string;
  email?: string;
  profileImage?: string;
  employeeType: 'doctor' | 'nurse' | 'staff';
  departmentId: string;
  position: string;
  status: 'active' | 'inactive' | 'leave';
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
  
  // Debug setup
  const requiredTables: TableSchema[] = [
    {
      tableName: 'employees',
      columns: ['id', 'prefix', 'firstNameTh', 'lastNameTh', 'gender', 'phone', 'email', 'profileImage', 'employeeType', 'departmentId', 'position', 'status'],
      description: 'ข้อมูลพนักงานทั้งหมด (หมอ พยาบาล เจ้าหน้าที่)'
    },
    {
      tableName: 'departments',
      columns: ['id', 'name', 'description', 'color', 'isActive'],
      description: 'แผนกต่างๆ ในโรงพยาบาล'
    }
  ];

  usePageDebug('ค้นหาพนักงาน', requiredTables);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // โหลดข้อมูลแผนก
  useEffect(() => {
    const departmentsData = debugManager.getData('departments') as Department[];
    setDepartments(departmentsData || []);
  }, [debugManager]);

  const handleSearch = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // ดึงข้อมูลพนักงานจาก localStorage ผ่าน DebugManager
      const allEmployees = debugManager.getData('employees') as Employee[];
      
      // จำลองการค้นหา
      setTimeout(() => {
        if (!allEmployees || allEmployees.length === 0) {
          setSearchResults([]);
          setHasSearched(true);
          setIsLoading(false);
          return;
        }

        const term = searchTerm.toLowerCase().trim();
        
        // ถ้าไม่มีคำค้นหา ให้แสดงทั้งหมด
        if (!term) {
          setSearchResults(allEmployees);
          setHasSearched(true);
          setIsLoading(false);
          return;
        }
        
        // ค้นหาตามเงื่อนไข
        const results = allEmployees.filter(employee => 
          employee.id.toLowerCase().includes(term) ||
          employee.firstNameTh.toLowerCase().includes(term) ||
          employee.lastNameTh.toLowerCase().includes(term) ||
          employee.phone.includes(term) ||
          (employee.email && employee.email.toLowerCase().includes(term))
        );
        
        setSearchResults(results);
        setHasSearched(true);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการค้นหาข้อมูล');
      setIsLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleViewEmployee = (employee: Employee) => {
    navigate('/member/employee', { state: { employee } });
  };

  const handleEditEmployee = (employee: Employee) => {
    navigate('/member/employee/addemployee', { state: { employee, isEdit: true } });
  };

  const handleAddEmployee = () => {
    navigate('/member/employee/addemployee');
  };

  // แปลงประเภทพนักงานเป็นภาษาไทย
  const getEmployeeTypeText = (type: string): string => {
    switch (type) {
      case 'doctor': return 'แพทย์';
      case 'nurse': return 'พยาบาล';
      case 'staff': return 'เจ้าหน้าที่';
      default: return type;
    }
  };

  // แปลงสถานะเป็นภาษาไทยและกำหนดสี
  const getStatusChip = (status: string) => {
    let label = '';
    let color: 'success' | 'error' | 'warning' | 'default' = 'default';
    
    switch (status) {
      case 'active':
        label = 'ทำงานปกติ';
        color = 'success';
        break;
      case 'inactive':
        label = 'พักงาน';
        color = 'warning';
        break;
      case 'leave':
        label = 'ลาออก';
        color = 'error';
        break;
      default:
        label = status;
    }
    
    return <Chip label={label} color={color} size="small" />;
  };

  // หาชื่อแผนกจาก departmentId
  const getDepartmentName = (departmentId: string): string => {
    const department = departments.find(dept => dept.id === departmentId);
    return department ? department.name : 'ไม่ระบุแผนก';
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          ค้นหาพนักงาน
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddEmployee}
        >
          เพิ่มพนักงานใหม่
        </Button>
      </Box>

      {/* Search Box */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
          <TextField
            label="ค้นหาด้วย รหัสพนักงาน, ชื่อ, เบอร์โทร หรืออีเมล"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={isLoading}
            sx={{ minWidth: '120px', height: '56px' }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'ค้นหา'}
          </Button>
        </Box>
      </Paper>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {hasSearched && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              ผลการค้นหา
            </Typography>
            <Typography variant="body2" color="text.secondary">
              พบ {searchResults.length} รายการ
            </Typography>
          </Box>

          {searchResults.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>รหัส</TableCell>
                    <TableCell>ชื่อ-นามสกุล</TableCell>
                    <TableCell>ประเภท</TableCell>
                    <TableCell>ตำแหน่ง</TableCell>
                    <TableCell>แผนก</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell align="center">จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {searchResults.map((employee) => (
                    <TableRow key={employee.id} hover>
                      <TableCell>{employee.id}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            src={employee.profileImage} 
                            sx={{ width: 32, height: 32, mr: 1 }}
                          >
                            {employee.firstNameTh.charAt(0)}
                          </Avatar>
                          {employee.prefix} {employee.firstNameTh} {employee.lastNameTh}
                        </Box>
                      </TableCell>
                      <TableCell>{getEmployeeTypeText(employee.employeeType)}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>{getDepartmentName(employee.departmentId)}</TableCell>
                      <TableCell>{getStatusChip(employee.status)}</TableCell>
                      <TableCell align="center">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleViewEmployee(employee)}
                          title="ดูข้อมูล"
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton 
                          color="secondary" 
                          onClick={() => handleEditEmployee(employee)}
                          title="แก้ไข"
                        >
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              ไม่พบข้อมูลพนักงานที่ตรงกับคำค้นหา
            </Alert>
          )}
        </>
      )}

      {/* No search yet */}
      {!hasSearched && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <SearchIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            กรุณาป้อนคำค้นหาและกดปุ่มค้นหาเพื่อแสดงข้อมูลพนักงาน
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default SearchEmployee;
