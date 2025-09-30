import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Avatar,
  Alert,
  IconButton,
  InputAdornment,
  Card,
  CardContent
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import axios from 'axios';

interface Employee {
  id: string;
  // ข้อมูลส่วนตัว (จำเป็น)
  prefix: string;
  firstNameTh: string;
  lastNameTh: string;
  gender: string;
  phone: string;
  nationalId: string;
  profileImage?: string;
  
  // ข้อมูลการทำงาน (จำเป็น)
  employeeType: 'doctor' | 'nurse';
  departmentId: string;
  position: string;
  licenseNumber?: string; // จำเป็นสำหรับหมอและพยาบาล
  specialties?: string[]; // สำหรับหมอ
  startDate: string;
  status: 'active' | 'inactive' | 'leave';
  
  // ข้อมูลระบบ (จำเป็น)
  username: string;
  password: string;
  role: 'doctor' | 'nurse';
  
  // ข้อมูลเสริม (ไม่จำเป็น)
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

const AddEmployee: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.state?.isEdit || false;
  const existingEmployee = location.state?.employee as Employee;

  const [formData, setFormData] = useState<Employee>({
    id: '',
    prefix: '',
    firstNameTh: '',
    lastNameTh: '',
    gender: '',
    phone: '',
    nationalId: '',
    profileImage: '',
    employeeType: 'doctor',
    departmentId: '',
    position: '',
    licenseNumber: '',
    specialties: [],
    startDate: new Date().toISOString().split('T')[0],
    status: 'active',
    username: '',
    password: '',
    role: 'doctor',
    email: '',
    address: '',
    workingDays: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'],
    workingHours: {
      start: '08:00',
      end: '16:00'
    }
  });

  // States
  const [newSpecialty, setNewSpecialty] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // ตำแหน่งตามประเภทพนักงาน
  const positionsByType = {
    doctor: [
      'แพทย์ทั่วไป',
      'แพทย์เฉพาะทาง',
      'แพทย์ผู้เชี่ยวชาญ',
      'หัวหน้าแพทย์',
      'ผู้อำนวยการแพทย์'
    ],
    nurse: [
      'พยาบาลวิชาชีพ',
      'พยาบาลเทคนิค',
      'ผู้ช่วยพยาบาล',
      'หัวหน้าพยาบาล'
    ],
    staff: [
      'เจ้าหน้าที่ธุรการ',
      'เจ้าหน้าที่การเงิน',
      'เจ้าหน้าที่ประชาสัมพันธ์',
      'เจ้าหน้าที่เวชระเบียน',
      'เจ้าหน้าที่ IT',
      'เจ้าหน้าที่รักษาความปลอดภัย',
      'พนักงานทำความสะอาด'
    ]
  };

  // วันทำงาน
  const allWorkingDays = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

  useEffect(() => {
    // โหลดข้อมูลแผนกจาก backend
    axios.get(`${API_BASE_URL}/api/workplace/department`).then(res => {
      const deptData = res.data || [];
      setDepartments(deptData);
      
      if (isEdit && existingEmployee) {
        // ตรวจสอบว่า departmentId ที่มีอยู่นั้นมีใน options หรือไม่
        const validDeptId = deptData.find((d: Department) => d.id === existingEmployee.departmentId) 
          ? existingEmployee.departmentId 
          : '';
        
        setFormData({
          ...existingEmployee,
          departmentId: validDeptId,
          password: '' // ไม่แสดงรหัสผ่านเดิม
        });
      } else {
        const newId = 'E' + Date.now().toString().slice(-6);
        setFormData(prev => ({ ...prev, id: newId }));
      }
    });
  }, [isEdit, existingEmployee]);

  // Validate National ID (simple checksum)
  const validateNationalId = (id: string): boolean => {
    if (id.length !== 13) return false;
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(id.charAt(i)) * (13 - i);
    }
    
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;
    
    return checkDigit === parseInt(id.charAt(12));
  };

  // Check username availability
  const checkUsername = (username: string) => {
    if (!username) {
      setUsernameError('');
      return;
    }

    axios.get(`${API_BASE_URL}/api/worker/check-username/${username}`).then(res => {
      if (res.data.exists) {
        setUsernameError('ชื่อผู้ใช้นี้ถูกใช้แล้ว');
      } else {
        setUsernameError('');
      }
    }).catch(error => {
      console.error('Error checking username:', error);
      setUsernameError('เกิดข้อผิดพลาดในการตรวจสอบชื่อผู้ใช้');
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('workingHours.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        workingHours: {
          ...prev.workingHours!,
          [field]: value
        }
      }));
    } else if (name === 'employeeType') {
      const employeeType = value as 'doctor' | 'nurse';
      // Auto set role based on employee type
      let role: 'doctor' | 'nurse' = 'doctor';
      if (employeeType === 'doctor') role = 'doctor';
      else if (employeeType === 'nurse') role = 'nurse';
      
      setFormData(prev => ({
        ...prev,
        employeeType: employeeType,
        role: role,
        position: ''
      }));
    } else if (name === 'username') {
      setFormData(prev => ({ ...prev, [name]: value }));
      checkUsername(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle profile image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          profileImage: event.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle working days selection
  const handleWorkingDayToggle = (day: string) => {
    setFormData(prev => {
      const currentDays = prev.workingDays || [];
      if (currentDays.includes(day)) {
        return {
          ...prev,
          workingDays: currentDays.filter(d => d !== day)
        };
      } else {
        return {
          ...prev,
          workingDays: [...currentDays, day]
        };
      }
    });
  };

  // Add specialty
  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties?.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...(prev.specialties || []), newSpecialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties?.filter((_, i) => i !== index) || []
    }));
  };

  // Generate username suggestion
  const generateUsername = () => {
    const firstName = formData.firstNameTh.toLowerCase();
    const lastName = formData.lastNameTh.toLowerCase();
    const id = formData.id.toLowerCase();
    
    if (firstName && lastName) {
      const suggestion = `${firstName}.${lastName}`;
      setFormData(prev => ({ ...prev, username: suggestion }));
      checkUsername(suggestion);
    } else if (id) {
      setFormData(prev => ({ ...prev, username: id }));
      checkUsername(id);
    }
  };

  // Generate password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const required = [
      'prefix', 'firstNameTh', 'lastNameTh', 'gender', 'phone', 'nationalId',
      'employeeType', 'departmentId', 'position', 'startDate', 'username'
    ];

    // เพิ่ม password ให้ required เฉพาะกรณีที่เป็นการเพิ่มพนักงานใหม่
    if (!isEdit) {
      required.push('password');
    }

    for (const field of required) {
      if (!formData[field as keyof Employee]) {
        return false;
      }
    }

    // Validate national ID
    if (!validateNationalId(formData.nationalId)) {
      return false;
    }

    // Check license number for doctors and nurses
    if ((formData.employeeType === 'doctor' || formData.employeeType === 'nurse') && !formData.licenseNumber) {
      return false;
    }

    // Check username availability
    if (usernameError) {
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('กรุณาเข้าสู่ระบบใหม่');
        navigate('/auth/login');
        return;
      }

      // สร้าง payload สำหรับ employees collection
      const payload = {
        id: formData.id,
        prefix: formData.prefix,
        firstNameTh: formData.firstNameTh,
        lastNameTh: formData.lastNameTh,
        gender: formData.gender,
        phone: formData.phone,
        nationalId: formData.nationalId,
        profileImage: formData.profileImage,
        employeeType: formData.employeeType,
        departmentId: formData.departmentId,
        position: formData.position,
        licenseNumber: formData.licenseNumber,
        specialties: formData.specialties || [],
        startDate: formData.startDate,
        status: formData.status,
        ...((!isEdit) && { username: formData.username }), // เพิ่ม username เฉพาะเมื่อไม่ใช่การแก้ไข
        ...((!isEdit) && { password: formData.password }), // เพิ่ม password เฉพาะเมื่อไม่ใช่การแก้ไข
        role: formData.role,
        email: formData.email,
        address: formData.address,
        workingDays: formData.workingDays || [],
        workingHours: formData.workingHours || { start: '08:00', end: '16:00' }
      };

      
      // ในโหมดแก้ไข ให้ใช้ worker endpoint (employees collection) เป็นหลัก
      if (isEdit) {
        try {
          // ลองแก้ไขใน employees collection ก่อน
          await axios.put(`${API_BASE_URL}/api/worker/${formData.id}`, payload, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json' 
            }
          });
        } catch (workerError: any) {
          // ถ้าแก้ไขใน employees ไม่ได้ ลองแก้ไขใน collection อื่น
          if (workerError.response?.status === 404) {
            if (formData.employeeType === 'doctor') {
              await axios.put(`${API_BASE_URL}/api/doctor/${formData.id}`, payload, {
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json' 
                }
              });
            } else if (formData.employeeType === 'nurse') {
              await axios.put(`${API_BASE_URL}/api/doctor/nurses/${formData.id}`, payload, {
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json' 
                }
              });
            } else {
              await axios.put(`${API_BASE_URL}/api/doctor/${formData.id}`, payload, {
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json' 
                }
              });
            }
          } else {
            throw workerError;
          }
        }
      } else {
        // สำหรับการเพิ่มพนักงานใหม่ ให้ใช้ worker endpoint (employees collection)
        await axios.post(`${API_BASE_URL}/api/worker/`, payload, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          }
        });
      }

      setSuccess(true);
      alert(isEdit ? 'แก้ไขข้อมูลบุคลากรสำเร็จ' : 'เพิ่มบุคลากรใหม่สำเร็จ');
      
      if (!isEdit) {
        // Reset form for new entry
        const newId = 'E' + Date.now().toString().slice(-6);
        setFormData({
          id: newId,
          prefix: '',
          firstNameTh: '',
          lastNameTh: '',
          gender: '',
          phone: '',
          nationalId: '',
          profileImage: '',
          employeeType: 'doctor',
          departmentId: '',
          position: '',
          licenseNumber: '',
          specialties: [],
          startDate: new Date().toISOString().split('T')[0],
          status: 'active',
          username: '',
          password: '',
          role: 'doctor',
          email: '',
          address: '',
          workingDays: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'],
          workingHours: { start: '08:00', end: '16:00' }
        });
      }
      setTimeout(() => {
        setSuccess(false);
        if (isEdit) {
          navigate('/member/employee/searchemployee');
        }
      }, 2000);
    } catch (error: any) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (error?.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/member/employee/searchemployee');
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            {isEdit ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากรใหม่'}
          </Typography>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleCancel}
            variant="outlined"
          >
            กลับ
          </Button>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {isEdit ? 'แก้ไขข้อมูลบุคลากรเรียบร้อยแล้ว' : 'เพิ่มบุคลากรใหม่เรียบร้อยแล้ว'}
          </Alert>
        )}

        {departments.length === 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            ยังไม่มีข้อมูลแผนก กรุณาเพิ่มแผนกก่อนเพิ่มบุคลากร
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={4}>
            {/* ข้อมูลส่วนตัว */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="bold">
                      ข้อมูลส่วนตัว
                    </Typography>
                  </Box>

                  {/* Profile Image */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar
                      src={formData.profileImage || undefined}
                      sx={{ width: 80, height: 80, mr: 3, border: '2px solid #e0e0e0' }}
                    />
                    <Box>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                        id="profileImage"
                      />
                      <label htmlFor="profileImage">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<CloudUploadIcon />}
                          size="small"
                        >
                          อัปโหลดรูปภาพ
                        </Button>
                      </label>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        ไฟล์ JPG, PNG ขนาดไม่เกิน 5MB
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        select
                        label="คำนำหน้า *"
                        name="prefix"
                        value={formData.prefix}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        size="small"
                      >
                        <MenuItem value="">เลือกคำนำหน้า</MenuItem>
                        <MenuItem value="นพ.">นพ. (นายแพทย์)</MenuItem>
                        <MenuItem value="พญ.">พญ. (แพทย์หญิง)</MenuItem>
                        <MenuItem value="นาย">นาย</MenuItem>
                        <MenuItem value="นาง">นาง</MenuItem>
                        <MenuItem value="นางสาว">นางสาว</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4.5}>
                      <TextField
                        label="ชื่อ (ภาษาไทย) *"
                        name="firstNameTh"
                        value={formData.firstNameTh}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4.5}>
                      <TextField
                        label="นามสกุล (ภาษาไทย) *"
                        name="lastNameTh"
                        value={formData.lastNameTh}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl component="fieldset" required>
                        <FormLabel component="legend">เพศ *</FormLabel>
                        <RadioGroup
                          row
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                        >
                          <FormControlLabel value="ชาย" control={<Radio size="small" />} label="ชาย" />
                          <FormControlLabel value="หญิง" control={<Radio size="small" />} label="หญิง" />
                        </RadioGroup>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="เบอร์โทรศัพท์ *"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="อีเมล"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="หมายเลขบัตรประชาชน *"
                        name="nationalId"
                        value={formData.nationalId}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        size="small"
                        error={formData.nationalId.length > 0 && !validateNationalId(formData.nationalId)}
                        helperText={formData.nationalId.length > 0 && !validateNationalId(formData.nationalId) ? 'หมายเลขบัตรประชาชนไม่ถูกต้อง' : ''}
                        inputProps={{ maxLength: 13 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="ที่อยู่"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* ข้อมูลการทำงาน */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <WorkIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="bold">
                      ข้อมูลการทำงาน
                    </Typography>
                  </Box>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        label="ประเภทบุคลากร *"
                        name="employeeType"
                        value={formData.employeeType}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        size="small"
                      >
                        <MenuItem value="doctor">แพทย์</MenuItem>
                        <MenuItem value="nurse">พยาบาล</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        label="แผนก *"
                        name="departmentId"
                        value={formData.departmentId}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        size="small"
                        error={departments.length === 0}
                        helperText={departments.length === 0 ? 'ไม่พบข้อมูลแผนก' : ''}
                      >
                        <MenuItem value="">เลือกแผนก</MenuItem>
                        {departments.map((department) => (
                          <MenuItem key={department.id} value={department.id}>
                            {department.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        label="ตำแหน่ง *"
                        name="position"
                        value={formData.position}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        size="small"
                      >
                        <MenuItem value="">เลือกตำแหน่ง</MenuItem>
                        {formData.employeeType && positionsByType[formData.employeeType].map((position) => (
                          <MenuItem key={position} value={position}>
                            {position}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label={`เลขที่ใบอนุญาตประกอบวิชาชีพ ${(formData.employeeType === 'doctor' || formData.employeeType === 'nurse') ? '*' : ''}`}
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        required={formData.employeeType === 'doctor' || formData.employeeType === 'nurse'}
                        helperText="จำเป็นสำหรับแพทย์และพยาบาล"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="วันที่เริ่มงาน *"
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>

                  {/* Specialties (for doctors) */}
                  {formData.employeeType === 'doctor' && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        ความเชี่ยวชาญพิเศษ
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={8}>
                          <TextField
                            label="เพิ่มความเชี่ยวชาญ"
                            value={newSpecialty}
                            onChange={(e) => setNewSpecialty(e.target.value)}
                            fullWidth
                            size="small"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && newSpecialty.trim()) {
                                e.preventDefault();
                                addSpecialty();
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Button 
                            onClick={addSpecialty}
                            disabled={!newSpecialty.trim()}
                            startIcon={<AddIcon />}
                            variant="outlined"
                            fullWidth
                          >
                            เพิ่ม
                          </Button>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {formData.specialties && formData.specialties.length > 0 ? (
                              formData.specialties.map((specialty, index) => (
                                <Chip
                                  key={index}
                                  label={specialty}
                                  onDelete={() => removeSpecialty(index)}
                                  color="primary"
                                  variant="outlined"
                                  size="small"
                                />
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                ยังไม่มีความเชี่ยวชาญพิเศษ
                              </Typography>
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* Working Schedule */}
                  <Box sx={{ mt: 3 }}>
                                        <Typography variant="subtitle1" gutterBottom>
                      ตารางการทำงาน (ไม่จำเป็น)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="body2" gutterBottom>
                          วันทำงาน:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {allWorkingDays.map((day) => (
                            <Chip
                              key={day}
                              label={day}
                              onClick={() => handleWorkingDayToggle(day)}
                              color={formData.workingDays?.includes(day) ? 'primary' : 'default'}
                              variant={formData.workingDays?.includes(day) ? 'filled' : 'outlined'}
                              size="small"
                            />
                          ))}
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="เวลาเริ่มงาน"
                          name="workingHours.start"
                          type="time"
                          value={formData.workingHours?.start || ''}
                          onChange={handleInputChange}
                          fullWidth
                          size="small"
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="เวลาเลิกงาน"
                          name="workingHours.end"
                          type="time"
                          value={formData.workingHours?.end || ''}
                          onChange={handleInputChange}
                          fullWidth
                          size="small"
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* ข้อมูลระบบ */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="bold">
                      ข้อมูลระบบ
                    </Typography>
                  </Box>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="ชื่อผู้ใช้ *"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        size="small"
                        disabled={isEdit}
                        error={!!usernameError}
                        helperText={isEdit ? 'ไม่สามารถเปลี่ยนชื่อผู้ใช้ได้' : (usernameError || 'ใช้สำหรับเข้าสู่ระบบ')}
                        InputProps={{
                          readOnly: isEdit,
                          endAdornment: !isEdit ? (
                            <InputAdornment position="end">
                              <Button
                                size="small"
                                onClick={generateUsername}
                                disabled={!formData.firstNameTh || !formData.lastNameTh}
                              >
                                สร้างอัตโนมัติ
                              </Button>
                            </InputAdornment>
                          ) : undefined,
                        }}
                      />
                    </Grid>
                    {!isEdit && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="รหัสผ่าน *"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          fullWidth
                          size="small"
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                  size="small"
                                >
                                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                                <Button
                                  size="small"
                                  onClick={generatePassword}
                                  sx={{ ml: 1 }}
                                >
                                  สร้าง
                                </Button>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                    )}
                    {isEdit && (
                      <Grid item xs={12} sm={6}>
                        <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2">
                            การเปลี่ยนรหัสผ่านต้องทำในหน้าโปรไฟล์ของบุคลากร
                          </Typography>
                        </Alert>
                      </Grid>
                    )}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        label="บทบาทในระบบ *"
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        size="small"
                        helperText="บทบาทจะถูกกำหนดตามประเภทบุคลากร"
                        disabled
                      >
                        <MenuItem value="doctor">แพทย์</MenuItem>
                        <MenuItem value="nurse">พยาบาล</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        label="สถานะการทำงาน *"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        size="small"
                      >
                        <MenuItem value="active">ทำงานปกติ</MenuItem>
                        <MenuItem value="inactive">พักงาน</MenuItem>
                        <MenuItem value="leave">ลาออก</MenuItem>
                      </TextField>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Summary Card */}
          {formData.firstNameTh && formData.lastNameTh && (
            <Card sx={{ mt: 4, bgcolor: '#f8f9fa' }} variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  สรุปข้อมูล
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>ชื่อ-นามสกุล:</strong> {formData.prefix} {formData.firstNameTh} {formData.lastNameTh}
                    </Typography>
                    <Typography variant="body2">
                      <strong>ประเภท:</strong> {
                        formData.employeeType === 'doctor' ? 'แพทย์' : 
                        formData.employeeType === 'nurse' ? 'พยาบาล' : 'ไม่ระบุ'
                      }
                    </Typography>
                    <Typography variant="body2">
                      <strong>ตำแหน่ง:</strong> {formData.position || '-'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>แผนก:</strong> {departments.find(d => d.id === formData.departmentId)?.name || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>ชื่อผู้ใช้:</strong> {formData.username || '-'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>บทบาท:</strong> {
                        formData.role === 'doctor' ? 'แพทย์' :
                        formData.role === 'nurse' ? 'พยาบาล' : 'ไม่ระบุ'
                      }
                    </Typography>
                    <Typography variant="body2">
                      <strong>เริ่มงานเมื่อ:</strong> {formData.startDate ? new Date(formData.startDate).toLocaleDateString('th-TH') : '-'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>สถานะ:</strong> {
                        formData.status === 'active' ? 'ทำงานปกติ' : 
                        formData.status === 'inactive' ? 'พักงาน' : 'ลาออก'
                      }
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={isLoading}
              size="large"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              disabled={!validateForm() || isLoading}
              size="large"
            >
              {isLoading ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default AddEmployee;
