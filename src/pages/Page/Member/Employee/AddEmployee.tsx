import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  MenuItem,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Avatar,
  Divider,
  Alert,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface Employee {
  id: string;
  // ข้อมูลส่วนตัว
  prefix: string;
  firstNameTh: string;
  lastNameTh: string;
  firstNameEn?: string;
  lastNameEn?: string;
  gender: string;
  birthDate: string;
  age: number;
  nationalId: string;
  address: {
    houseNumber: string;
    village?: string;
    street?: string;
    subDistrict: string;
    district: string;
    province: string;
    postalCode: string;
  };
  phone: string;
  email?: string;
  profileImage?: string;
  
  // ข้อมูลการทำงาน
  employeeType: 'doctor' | 'nurse' | 'staff'; // ประเภทพนักงาน: หมอ, พยาบาล, เจ้าหน้าที่อื่นๆ
  departmentId: string; // แผนกที่สังกัด
  position: string; // ตำแหน่ง
  specialties?: string[]; // ความเชี่ยวชาญพิเศษ (สำหรับหมอ)
  licenseNumber?: string; // เลขที่ใบอนุญาตประกอบวิชาชีพ
  education?: string[]; // ประวัติการศึกษา
  startDate: string; // วันที่เริ่มงาน
  status: 'active' | 'inactive' | 'leave'; // สถานะการทำงาน
  workingDays?: string[]; // วันทำงาน
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
  const debugManager = DebugManager.getInstance();
  
  // Debug setup
  const requiredTables: TableSchema[] = [
    {
      tableName: 'employees',
      columns: ['id', 'prefix', 'firstNameTh', 'lastNameTh', 'firstNameEn', 'lastNameEn', 'gender', 'birthDate', 'age', 'nationalId', 'address', 'phone', 'email', 'profileImage', 'employeeType', 'departmentId', 'position', 'specialties', 'licenseNumber', 'education', 'startDate', 'status', 'workingDays', 'workingHours'],
      description: 'ข้อมูลพนักงานทั้งหมด (หมอ พยาบาล เจ้าหน้าที่)'
    },
    {
      tableName: 'departments',
      columns: ['id', 'name', 'description', 'color', 'isActive'],
      description: 'แผนกต่างๆ ในโรงพยาบาล'
    }
  ];

  // Corrigido: Removendo a desestruturação não utilizada
  usePageDebug('เพิ่มพนักงานใหม่', requiredTables);

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<Employee>({
    id: '',
    prefix: '',
    firstNameTh: '',
    lastNameTh: '',
    firstNameEn: '',
    lastNameEn: '',
    gender: '',
    birthDate: '',
    age: 0,
    nationalId: '',
    address: {
      houseNumber: '',
      village: '',
      street: '',
      subDistrict: '',
      district: '',
      province: '',
      postalCode: ''
    },
    phone: '',
    email: '',
    profileImage: '',
    employeeType: 'doctor',
    departmentId: '',
    position: '',
    specialties: [],
    licenseNumber: '',
    education: [],
    startDate: new Date().toISOString().split('T')[0],
    status: 'active',
    workingDays: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'],
    workingHours: {
      start: '08:00',
      end: '16:00'
    }
  });

  // States for adding items
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newEducation, setNewEducation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Variável não utilizada, mas mantida para possível uso futuro
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  console.log('profileImageFile:', profileImageFile);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [success, setSuccess] = useState(false);

  // Thai provinces for dropdown
  const provinces = [
    'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น',
    'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย',
    'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา',
    'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์',
    'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พังงา',
    'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต', 'มหาสารคาม',
    'มุกดาหาร', 'แม่ฮ่องสอน', 'ยะลา', 'ยโสธร', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี',
    'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
    'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี',
    'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี',
    'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี'
  ];

  // ตำแหน่งตามประเภทพนักงาน
  const positionsByType = {
    doctor: [
      'แพทย์ทั่วไป',
      'แพทย์เฉพาะทาง',
      'แพทย์ผู้เชี่ยวชาญ',
      'แพทย์ผู้ชำนาญการพิเศษ',
      'หัวหน้าแพทย์',
      'ผู้อำนวยการแพทย์'
    ],
    nurse: [
      'พยาบาลวิชาชีพ',
      'พยาบาลเทคนิค',
      'ผู้ช่วยพยาบาล',
      'พยาบาลวิชาชีพชำนาญการ',
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
    // โหลดข้อมูลแผนก
    const departmentsData = debugManager.getData('departments') as Department[];
    setDepartments(departmentsData || []);

    if (isEdit && existingEmployee) {
      setFormData(existingEmployee);
    } else {
      const newId = 'E' + Date.now().toString().slice(-6);
      setFormData(prev => ({ ...prev, id: newId }));
    }
  }, [isEdit, existingEmployee, debugManager]);

  // Calculate age from birth date
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      }));
    } else if (name.startsWith('workingHours.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        workingHours: {
          ...prev.workingHours!,
          [field]: value
        }
      }));
    } else if (name === 'birthDate') {
      const age = calculateAge(value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        age: age
      }));
    } else if (name === 'employeeType') {
      // Corrigido: Garantindo que o valor é um dos tipos válidos
      const employeeType = value as 'doctor' | 'nurse' | 'staff';
      setFormData(prev => ({
        ...prev,
        employeeType: employeeType,
        position: ''
      }));
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
      setProfileImageFile(file);
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

  // Add education
  const addEducation = () => {
    if (newEducation.trim() && !formData.education?.includes(newEducation.trim())) {
      setFormData(prev => ({
        ...prev,
        education: [...(prev.education || []), newEducation.trim()]
      }));
      setNewEducation('');
    }
  };

  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education?.filter((_, i) => i !== index) || []
    }));
  };

  // Validate current step
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.prefix &&
          formData.firstNameTh &&
          formData.lastNameTh &&
          formData.gender &&
          formData.birthDate &&
          formData.nationalId &&
          validateNationalId(formData.nationalId) &&
          formData.address.houseNumber &&
          formData.address.subDistrict &&
          formData.address.district &&
          formData.address.province &&
          formData.address.postalCode &&
          formData.phone
        );
      case 2:
        return !!(
          formData.employeeType &&
          formData.departmentId &&
          formData.position &&
          formData.startDate &&
          formData.status &&
          formData.workingDays?.length &&
          formData.workingHours?.start &&
          formData.workingHours?.end
        );
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(2);
    } else {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(1) || !validateStep(2)) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    setIsLoading(true);

    try {
      // บันทึกข้อมูลลง localStorage ผ่าน DebugManager
      debugManager.addData('employees', formData);
      
      // จำลองการบันทึกข้อมูล
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      
      // รีเซ็ตฟอร์มหลังจากบันทึกสำเร็จ
      if (!isEdit) {
        const newId = 'E' + Date.now().toString().slice(-6);
        setFormData({
          id: newId,
          prefix: '',
          firstNameTh: '',
          lastNameTh: '',
          firstNameEn: '',
          lastNameEn: '',
          gender: '',
          birthDate: '',
          age: 0,
          nationalId: '',
          address: {
            houseNumber: '',
            village: '',
            street: '',
            subDistrict: '',
            district: '',
            province: '',
            postalCode: ''
          },
          phone: '',
          email: '',
          profileImage: '',
          employeeType: 'doctor',
          departmentId: '',
          position: '',
          specialties: [],
          licenseNumber: '',
          education: [],
          startDate: new Date().toISOString().split('T')[0],
          status: 'active',
          workingDays: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'],
          workingHours: {
            start: '08:00',
            end: '16:00'
          }
        });
        setCurrentStep(1);
      }
      
      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => {
        setSuccess(false);
        if (isEdit) {
          navigate('/member/employee/searchemployee');
        }
      }, 3000);
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/member/employee/searchemployee');
  };

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= step
                ? 'bg-blue-600 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}
          >
            {step}
          </div>
          {step < 2 && (
            <div
              className={`w-16 h-1 mx-2 ${
                currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // Step 1: Personal Information
  const renderStep1 = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        ข้อมูลส่วนตัว
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* Profile Image */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Box sx={{ mr: 3 }}>
          <Avatar
            src={formData.profileImage || undefined}
            sx={{ width: 100, height: 100, border: '1px solid #ccc' }}
          />
        </Box>
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
            >
              อัปโหลดรูปภาพ
            </Button>
          </label>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            ไฟล์ JPG, PNG ขนาดไม่เกิน 5MB
          </Typography>
        </Box>
      </Box>

      {/* Basic Info */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            label="คำนำหน้า"
            name="prefix"
            value={formData.prefix}
            onChange={handleInputChange}
            required
            fullWidth
          >
            <MenuItem value="">เลือกคำนำหน้า</MenuItem>
            <MenuItem value="นพ.">นพ. (นายแพทย์)</MenuItem>
            <MenuItem value="พญ.">พญ. (แพทย์หญิง)</MenuItem>
            <MenuItem value="นาย">นาย</MenuItem>
            <MenuItem value="นาง">นาง</MenuItem>
            <MenuItem value="นางสาว">นางสาว</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="ชื่อ (ภาษาไทย)"
            name="firstNameTh"
            value={formData.firstNameTh}
            onChange={handleInputChange}
            required
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="นามสกุล (ภาษาไทย)"
            name="lastNameTh"
            value={formData.lastNameTh}
            onChange={handleInputChange}
            required
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="ชื่อ (ภาษาอังกฤษ)"
            name="firstNameEn"
            value={formData.firstNameEn}
            onChange={handleInputChange}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="นามสกุล (ภาษาอังกฤษ)"
            name="lastNameEn"
            value={formData.lastNameEn}
            onChange={handleInputChange}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl component="fieldset" required>
            <FormLabel component="legend">เพศ</FormLabel>
            <RadioGroup
              row
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
            >
              <FormControlLabel value="ชาย" control={<Radio />} label="ชาย" />
              <FormControlLabel value="หญิง" control={<Radio />} label="หญิง" />
              <FormControlLabel value="อื่นๆ" control={<Radio />} label="อื่นๆ" />
            </RadioGroup>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="วันเดือนปีเกิด"
            name="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={handleInputChange}
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="อายุ"
            value={formData.age}
            InputProps={{ readOnly: true }}
            fullWidth
            disabled
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="หมายเลขบัตรประชาชน"
            name="nationalId"
            value={formData.nationalId}
            onChange={handleInputChange}
            required
            fullWidth
            error={formData.nationalId.length > 0 && !validateNationalId(formData.nationalId)}
            helperText={formData.nationalId.length > 0 && !validateNationalId(formData.nationalId) ? 'หมายเลขบัตรประชาชนไม่ถูกต้อง' : ''}
            inputProps={{ maxLength: 13 }}
          />
        </Grid>
      </Grid>

      {/* Address */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        ที่อยู่
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="บ้านเลขที่"
            name="address.houseNumber"
            value={formData.address.houseNumber}
            onChange={handleInputChange}
            required
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="หมู่บ้าน/อาคาร"
            name="address.village"
            value={formData.address.village}
            onChange={handleInputChange}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="ถนน"
            name="address.street"
            value={formData.address.street}
            onChange={handleInputChange}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="ตำบล/แขวง"
            name="address.subDistrict"
            value={formData.address.subDistrict}
            onChange={handleInputChange}
            required
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="อำเภอ/เขต"
            name="address.district"
            value={formData.address.district}
            onChange={handleInputChange}
            required
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            select
            label="จังหวัด"
            name="address.province"
            value={formData.address.province}
            onChange={handleInputChange}
            required
            fullWidth
          >
            <MenuItem value="">เลือกจังหวัด</MenuItem>
            {provinces.map((province) => (
              <MenuItem key={province} value={province}>
                {province}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="รหัสไปรษณีย์"
            name="address.postalCode"
            value={formData.address.postalCode}
            onChange={handleInputChange}
            required
            fullWidth
            inputProps={{ maxLength: 5 }}
          />
        </Grid>
      </Grid>

      {/* Contact Info */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        ข้อมูลติดต่อ
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="เบอร์โทรศัพท์"
            name="phone"
            value={formData.phone}
                       onChange={handleInputChange}
            required
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="อีเมล"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            fullWidth
          />
        </Grid>
      </Grid>
    </Box>
  );

  // Step 2: Work Information
  const renderStep2 = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        ข้อมูลการทำงาน
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            label="ประเภทพนักงาน"
            name="employeeType"
            value={formData.employeeType}
            onChange={handleInputChange}
            required
            fullWidth
          >
            <MenuItem value="doctor">แพทย์</MenuItem>
            <MenuItem value="nurse">พยาบาล</MenuItem>
            <MenuItem value="staff">เจ้าหน้าที่อื่นๆ</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            label="แผนก"
            name="departmentId"
            value={formData.departmentId}
            onChange={handleInputChange}
            required
            fullWidth
            error={departments.length === 0}
            helperText={departments.length === 0 ? 'ไม่พบข้อมูลแผนก กรุณาเพิ่มแผนกก่อน' : ''}
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
            label="ตำแหน่ง"
            name="position"
            value={formData.position}
            onChange={handleInputChange}
            required
            fullWidth
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
            label="เลขที่ใบอนุญาตประกอบวิชาชีพ"
            name="licenseNumber"
            value={formData.licenseNumber}
            onChange={handleInputChange}
            fullWidth
            required={formData.employeeType === 'doctor' || formData.employeeType === 'nurse'}
            helperText={
              (formData.employeeType === 'doctor' || formData.employeeType === 'nurse') 
                ? 'จำเป็นสำหรับแพทย์และพยาบาล' 
                : ''
            }
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="วันที่เริ่มงาน"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleInputChange}
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            select
            label="สถานะการทำงาน"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            required
            fullWidth
          >
            <MenuItem value="active">ทำงานปกติ</MenuItem>
            <MenuItem value="inactive">พักงาน</MenuItem>
            <MenuItem value="leave">ลาออก</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {/* Specialties (for doctors) */}
      {formData.employeeType === 'doctor' && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            ความเชี่ยวชาญพิเศษ
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="เพิ่มความเชี่ยวชาญ"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button 
                        onClick={addSpecialty}
                        disabled={!newSpecialty.trim()}
                        startIcon={<AddIcon />}
                      >
                        เพิ่ม
                      </Button>
                    </InputAdornment>
                  ),
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newSpecialty.trim()) {
                    e.preventDefault();
                    addSpecialty();
                  }
                }}
              />
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
        </>
      )}

      {/* Education */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        ประวัติการศึกษา
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="เพิ่มประวัติการศึกษา"
            value={newEducation}
            onChange={(e) => setNewEducation(e.target.value)}
            fullWidth
            placeholder="เช่น แพทยศาสตร์บัณฑิต จุฬาลงกรณ์มหาวิทยาลัย (2560)"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button 
                    onClick={addEducation}
                    disabled={!newEducation.trim()}
                    startIcon={<AddIcon />}
                  >
                    เพิ่ม
                  </Button>
                </InputAdornment>
              ),
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newEducation.trim()) {
                e.preventDefault();
                addEducation();
              }
            }}
          />
        </Grid>
        <Grid item xs={12}>
          {formData.education && formData.education.length > 0 ? (
            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
              {formData.education.map((edu, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    borderBottom: index < formData.education!.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}
                >
                  <Typography variant="body2">{edu}</Typography>
                  <IconButton size="small" onClick={() => removeEducation(index)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              ยังไม่มีประวัติการศึกษา
            </Typography>
          )}
        </Grid>
      </Grid>

      {/* Working Schedule */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        ตารางการทำงาน
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" gutterBottom>
            วันทำงาน
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {allWorkingDays.map((day) => (
              <Chip
                key={day}
                label={day}
                onClick={() => handleWorkingDayToggle(day)}
                color={formData.workingDays?.includes(day) ? 'primary' : 'default'}
                variant={formData.workingDays?.includes(day) ? 'filled' : 'outlined'}
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
            required
            fullWidth
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
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      {/* Summary */}
      <Box sx={{ mt: 4, p: 3, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
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
                formData.employeeType === 'nurse' ? 'พยาบาล' : 'เจ้าหน้าที่'
              }
            </Typography>
            <Typography variant="body2">
              <strong>ตำแหน่ง:</strong> {formData.position}
            </Typography>
            <Typography variant="body2">
              <strong>แผนก:</strong> {departments.find(d => d.id === formData.departmentId)?.name || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2">
              <strong>วันทำงาน:</strong> {formData.workingDays?.join(', ') || '-'}
            </Typography>
            <Typography variant="body2">
              <strong>เวลาทำงาน:</strong> {formData.workingHours?.start} - {formData.workingHours?.end}
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
      </Box>
    </Box>
  );

  return (
    <Paper sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          {isEdit ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleCancel}
        >
          กลับ
        </Button>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {isEdit ? 'แก้ไขข้อมูลพนักงานเรียบร้อยแล้ว' : 'เพิ่มพนักงานใหม่เรียบร้อยแล้ว'}
        </Alert>
      )}

      {departments.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          ยังไม่มีข้อมูลแผนก กรุณาเพิ่มแผนกก่อนเพิ่มพนักงาน
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step Indicator */}
        <StepIndicator />

        {/* Step Content */}
        {currentStep === 1 ? renderStep1() : renderStep2()}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, borderTop: '1px solid #e0e0e0' }}>
          {currentStep === 2 ? (
            <Button
              variant="outlined"
              onClick={handlePrevious}
              disabled={isLoading}
            >
              ย้อนกลับ
            </Button>
          ) : (
            <Box /> // Empty box for spacing
          )}

          <Box>
            <Button
                            variant="outlined"
              onClick={handleCancel}
              sx={{ mr: 1 }}
              disabled={isLoading}
            >
              ยกเลิก
            </Button>
            
            {currentStep === 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!validateStep(1) || isLoading}
              >
                ถัดไป
              </Button>
            ) : (
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                disabled={!validateStep(2) || isLoading}
              >
                {isLoading ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
              </Button>
            )}
          </Box>
        </Box>
      </form>

      {/* Debug data for development */}
      {process.env.NODE_ENV !== 'production' && (
        <Box sx={{ mt: 4, pt: 2, borderTop: '1px dashed #ccc' }}>
          <Typography variant="caption" color="text.secondary">
            Debug Info (Development Only)
          </Typography>
          <Box sx={{ mt: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
            <pre style={{ margin: 0, fontSize: '0.75rem' }}>
              {JSON.stringify(formData, null, 2)}
            </pre>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default AddEmployee;
