import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageDebug } from '../../../../hooks/usePageDebug';
import { TableSchema } from '../../../../types/Debug';
import { DebugManager } from '../../../../utils/Debuger';

interface Patient {
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
  qrCode?: string;
  
  // ข้อมูลสุขภาพพื้นฐาน
  bloodType?: string;
  chronicDiseases?: string[];
  allergies?: string[];
  currentMedications?: string[];
  
  // ข้อมูลผู้ติดต่อฉุกเฉิน
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

const AddPatient: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.state?.isEdit || false;
  const existingPatient = location.state?.patient as Patient;
  
   const debugManager = useMemo(() => DebugManager.getInstance(), []);
  const [isNavigating, setIsNavigating] = useState(false);
  // Debug setup
  const requiredTables: TableSchema[] = useMemo(() => [
    {
      tableName: 'patients',
      columns: ['id', 'prefix', 'firstNameTh', 'lastNameTh', 'firstNameEn', 'lastNameEn', 'gender', 'birthDate', 'age', 'nationalId', 'address', 'phone', 'email', 'profileImage', 'qrCode', 'bloodType', 'chronicDiseases', 'allergies', 'currentMedications', 'emergencyContact'],
      description: 'ข้อมูลผู้ป่วยทั้งหมด'
    }
  ], []);
  const debugPageData = usePageDebug('เพิ่มผู้ป่วยใหม่', requiredTables);
  const debugData = usePageDebug('เพิ่มผู้ป่วยใหม่', requiredTables);
  console.log('debugData', debugData,debugPageData);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<Patient>({
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
    qrCode: '',
    bloodType: '',
    chronicDiseases: [],
    allergies: [],
    currentMedications: [],
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  // States for adding items
  const [newChronicDisease, setNewChronicDisease] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  console.log('profileImageFile', profileImageFile);
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

useEffect(() => {
    if (isEdit && existingPatient) {
      setFormData(existingPatient);
    } else {
      const newId = 'P' + Date.now().toString().slice(-6);
      setFormData(prev => ({ ...prev, id: newId }));
    }
  }, [isEdit, existingPatient]); // dependency ที่ชัดเจน

  // useEffect แยกสำหรับ sample data
  useEffect(() => {
    const initializeSampleData = () => {
      try {
        const existingData = debugManager.getData('patients');
        if (existingData.length === 0) {
          const sampleData = {
            id: 'P000001',
            prefix: 'นาย',
            firstNameTh: 'สมชาย',
            lastNameTh: 'ใจดี',
            gender: 'ชาย',
            birthDate: '1990-01-01',
            age: 34,
            nationalId: '1234567890123',
            address: {
              houseNumber: '123/45',
              subDistrict: 'บางนา',
              district: 'บางนา',
              province: 'กรุงเทพมหานคร',
              postalCode: '10260'
            },
            phone: '081-234-5678',
            email: 'somchai@email.com',
            bloodType: 'O+',
            chronicDiseases: ['เบาหวาน'],
            allergies: ['ยาปฏิชีวนะ'],
            currentMedications: ['ยาเบาหวาน'],
            emergencyContact: {
              name: 'สมหญิง ใจดี',
              phone: '081-234-5679',
              relationship: 'คู่สมรส'
            }
          };
          debugManager.addData('patients', sampleData);
        }
      } catch (error) {
        console.error('Error initializing sample data:', error);
      }
    };
    
    // เรียกใช้เพียงครั้งเดียว
    initializeSampleData();
  }, []); // empty dependency array


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
    } else if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact!,
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

  // Add chronic disease
  const addChronicDisease = () => {
    if (newChronicDisease.trim() && !formData.chronicDiseases?.includes(newChronicDisease.trim())) {
      setFormData(prev => ({
        ...prev,
        chronicDiseases: [...(prev.chronicDiseases || []), newChronicDisease.trim()]
      }));
      setNewChronicDisease('');
    }
  };

  const removeChronicDisease = (index: number) => {
    setFormData(prev => ({
      ...prev,
      chronicDiseases: prev.chronicDiseases?.filter((_, i) => i !== index) || []
    }));
  };

  // Add allergy
  const addAllergy = () => {
    if (newAllergy.trim() && !formData.allergies?.includes(newAllergy.trim())) {
      setFormData(prev => ({
        ...prev,
        allergies: [...(prev.allergies || []), newAllergy.trim()]
      }));
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies?.filter((_, i) => i !== index) || []
    }));
  };

  // Add medication
  const addMedication = () => {
    if (newMedication.trim() && !formData.currentMedications?.includes(newMedication.trim())) {
      setFormData(prev => ({
        ...prev,
        currentMedications: [...(prev.currentMedications || []), newMedication.trim()]
      }));
      setNewMedication('');
    }
  };

  const removeMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      currentMedications: prev.currentMedications?.filter((_, i) => i !== index) || []
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
        return true; // ข้อมูลสุขภาพไม่บังคับ
      case 3:
        return true; // ข้อมูลผู้ติดต่อฉุกเฉินไม่บังคับ
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3) as 1 | 2 | 3);
    } else {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isNavigating || isLoading) return; // ป้องกันการ submit ซ้ำ
    
    if (!validateStep(1)) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      setCurrentStep(1);
      return;
    }

    setIsLoading(true);

    try {
      // บันทึกข้อมูลลง localStorage ผ่าน DebugManager
      debugManager.addData('patients', formData);
      
      // จำลองการบันทึกข้อมูล
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert(isEdit ? 'แก้ไขข้อมูลผู้ป่วยเรียบร้อยแล้ว' : 'เพิ่มผู้ป่วยใหม่เรียบร้อยแล้ว');
      
      setIsNavigating(true);
      navigate('/member/patient/dataPatient', { state: { patient: formData } });
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsLoading(false);
    }
  }, [formData, isEdit, isLoading, isNavigating, navigate, debugManager]);

  // Cleanup function
  useEffect(() => {
    return () => {
      setIsNavigating(false);
    };
  }, []);


   const handleCancel = useCallback(() => {
    if (isNavigating) return; // ป้องกันการ navigate ซ้ำ
    
    setIsNavigating(true);
    if (isEdit) {
      navigate('/member/patient/data', { state: { patient: existingPatient } });
    } else {
      navigate('/member/patient/searchpatient');
    }
  }, [isEdit, existingPatient, navigate, isNavigating]);

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= step
                ? 'bg-green-600 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}
          >
            {step}
          </div>
          {step < 3 && (
            <div
              className={`w-16 h-1 mx-2 ${
                currentStep > step ? 'bg-green-600' : 'bg-gray-300'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // Step 1: Personal Information
  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
        ข้อมูลส่วนตัว
      </h2>

      {/* Profile Image */}
      <div className="flex items-center space-x-6">
        <div className="flex-shrink-0">
          <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
            {formData.profileImage ? (
              <img
                src={formData.profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-xs text-gray-500">รูปถ่าย</p>
              </div>
            )}
          </div>
        </div>
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="profileImage"
          />
          <label
            htmlFor="profileImage"
            className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 inline-block"
          >
            อัปโหลดรูปภาพ
          </label>
          <p className="text-sm text-gray-500 mt-1">
            ไฟล์ JPG, PNG ขนาดไม่เกิน 5MB
          </p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            คำนำหน้า <span className="text-red-500">*</span>
          </label>
          <select
            name="prefix"
            value={formData.prefix}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">เลือกคำนำหน้า</option>
            <option value="นาย">นาย</option>
            <option value="นาง">นาง</option>
            <option value="นางสาว">นางสาว</option>
            <option value="เด็กชาย">เด็กชาย</option>
            <option value="เด็กหญิง">เด็กหญิง</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ชื่อ (ภาษาไทย) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="firstNameTh"
            value={formData.firstNameTh}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="ชื่อ"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            นามสกุล (ภาษาไทย) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="lastNameTh"
            value={formData.lastNameTh}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="นามสกุล"
          />
        </div>
      </div>

      {/* English Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ชื่อ (ภาษาอังกฤษ)
          </label>
          <input
            type="text"
            name="firstNameEn"
            value={formData.firstNameEn}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="First Name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            นามสกุล (ภาษาอังกฤษ)
          </label>
          <input
            type="text"
            name="lastNameEn"
            value={formData.lastNameEn}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Last Name"
          />
        </div>
      </div>

      {/* Gender and Birth Date */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            เพศ <span className="text-red-500">*</span>
          </label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">เลือกเพศ</option>
            <option value="ชาย">ชาย</option>
            <option value="หญิง">หญิง</option>
            <option value="อื่นๆ">อื่นๆ</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            วันเดือนปีเกิด <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="birthDate"
            value={formData.birthDate}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">อายุ</label>
          <input
            type="number"
            value={formData.age}
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            placeholder="คำนวณอัตโนมัติ"
          />
        </div>
      </div>

      {/* National ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          หมายเลขบัตรประชาชน <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="nationalId"
          value={formData.nationalId}
          onChange={handleInputChange}
          required
          maxLength={13}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
            formData.nationalId && !validateNationalId(formData.nationalId)
              ? 'border-red-500'
              : 'border-gray-300'
          }`}
          placeholder="1234567890123"
        />
        {formData.nationalId && !validateNationalId(formData.nationalId) && (
          <p className="text-red-500 text-sm mt-1">หมายเลขบัตรประชาชนไม่ถูกต้อง</p>
        )}
      </div>

      {/* Address */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4">ที่อยู่</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              บ้านเลขที่ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="address.houseNumber"
              value={formData.address.houseNumber}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="123/45"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">หมู่บ้าน</label>
            <input
              type="text"
              name="address.village"
              value={formData.address.village}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="หมู่บ้าน/โครงการ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ถนน</label>
            <input
              type="text"
              name="address.street"
              value={formData.address.street}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="ถนน"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ตำบล/แขวง <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="address.subDistrict"
              value={formData.address.subDistrict}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="ตำบล/แขวง"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              อำเภอ/เขต <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="address.district"
              value={formData.address.district}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="อำเภอ/เขต"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              จังหวัด <span className="text-red-500">*</span>
            </label>
            <select
              name="address.province"
              value={formData.address.province}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">เลือกจังหวัด</option>
              {provinces.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รหัสไปรษณีย์ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="address.postalCode"
              value={formData.address.postalCode}
              onChange={handleInputChange}
              required
              maxLength={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="10110"
            />
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            เบอร์โทรศัพท์ <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="081-234-5678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="example@email.com"
          />
        </div>
      </div>

      {/* QR Code */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          QR Code / รหัสคนไข้ (สำหรับสแกนภายหลัง)
        </label>
        <input
          type="text"
          name="qrCode"
          value={formData.qrCode}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="QR Code หรือรหัสพิเศษ"
        />
      </div>
    </div>
  );

  // Step 2: Health Information
  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
        ข้อมูลสุขภาพพื้นฐาน
      </h2>

      {/* Blood Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">กรุ๊ปเลือด</label>
        <select
          name="bloodType"
          value={formData.bloodType}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">เลือกกรุ๊ปเลือด</option>
          <option value="A+">A+</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B-">B-</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>
          <option value="O+">O+</option>
          <option value="O-">O-</option>
        </select>
      </div>

      {/* Chronic Diseases */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">โรคประจำตัว</label>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newChronicDisease}
              onChange={(e) => setNewChronicDisease(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChronicDisease())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="เช่น เบาหวาน, ความดันโลหิตสูง, โรคหัวใจ"
            />
            <button
              type="button"
              onClick={addChronicDisease}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              เพิ่ม
            </button>
          </div>
          {formData.chronicDiseases && formData.chronicDiseases.length > 0 && (
            <div className="space-y-2">
              {formData.chronicDiseases.map((disease, index) => (
                <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                  <span className="text-blue-700">{disease}</span>
                  <button
                    type="button"
                    onClick={() => removeChronicDisease(index)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Allergies */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">แพ้ยา/แพ้อาหาร</label>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="เช่น ยาปฏิชีวนะ Penicillin, อาหารทะเล, ถั่ว"
            />
            <button
              type="button"
              onClick={addAllergy}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              เพิ่ม
            </button>
          </div>
          {formData.allergies && formData.allergies.length > 0 && (
            <div className="space-y-2">
              {formData.allergies.map((allergy, index) => (
                <div key={index} className="flex items-center justify-between bg-red-50 p-3 rounded-lg">
                  <span className="text-red-700">{allergy}</span>
                  <button
                    type="button"
                    onClick={() => removeAllergy(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Current Medications */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ยาที่รับประทานประจำ</label>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMedication}
              onChange={(e) => setNewMedication(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="เช่น ยาลดความดัน, ยาเบาหวาน, วิตามิน"
            />
            <button
              type="button"
              onClick={addMedication}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              เพิ่ม
            </button>
          </div>
          {formData.currentMedications && formData.currentMedications.length > 0 && (
            <div className="space-y-2">
              {formData.currentMedications.map((medication, index) => (
                <div key={index} className="flex items-center justify-between bg-yellow-50 p-3 rounded-lg">
                  <span className="text-yellow-700">{medication}</span>
                  <button
                    type="button"
                    onClick={() => removeMedication(index)}
                    className="text-yellow-500 hover:text-yellow-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Step 3: Emergency Contact
  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
        ข้อมูลผู้ติดต่อฉุกเฉิน
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อ-นามสกุล</label>
          <input
            type="text"
            name="emergencyContact.name"
            value={formData.emergencyContact?.name || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="ชื่อผู้ติดต่อฉุกเฉิน"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">เบอร์โทรศัพท์</label>
          <input
            type="tel"
            name="emergencyContact.phone"
            value={formData.emergencyContact?.phone || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="081-234-5678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ความสัมพันธ์</label>
          <select
            name="emergencyContact.relationship"
            value={formData.emergencyContact?.relationship || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">เลือกความสัมพันธ์</option>
            <option value="คู่สมรส">คู่สมรส</option>
            <option value="บิดา">บิดา</option>
            <option value="มารดา">มารดา</option>
            <option value="บุตร">บุตร</option>
            <option value="บุตรี">บุตรี</option>
            <option value="พี่ชาย">พี่ชาย</option>
            <option value="พี่สาว">พี่สาว</option>
            <option value="น้องชาย">น้องชาย</option>
            <option value="น้องสาว">น้องสาว</option>
            <option value="ญาติ">ญาติ</option>
            <option value="เพื่อน">เพื่อน</option>
            <option value="อื่นๆ">อื่นๆ</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800 mb-4">สรุปข้อมูล</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>ชื่อ-นามสกุล:</strong> {formData.prefix} {formData.firstNameTh} {formData.lastNameTh}</p>
            <p><strong>เพศ:</strong> {formData.gender}</p>
            <p><strong>อายุ:</strong> {formData.age} ปี</p>
            <p><strong>เบอร์โทร:</strong> {formData.phone}</p>
          </div>
          <div>
            <p><strong>กรุ๊ปเลือด:</strong> {formData.bloodType || 'ไม่ระบุ'}</p>
            <p><strong>โรคประจำตัว:</strong> {formData.chronicDiseases?.length || 0} รายการ</p>
            <p><strong>แพ้ยา/อาหาร:</strong> {formData.allergies?.length || 0} รายการ</p>
            <p><strong>ยาประจำ:</strong> {formData.currentMedications?.length || 0} รายการ</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="bg-green-600 text-white p-6 rounded-t-lg">
          <h1 className="text-2xl font-bold">
            {isEdit ? 'แก้ไขข้อมูลผู้ป่วย' : 'เพิ่มผู้ป่วยใหม่'}
          </h1>
          <p className="text-green-100">
            {isEdit ? `แก้ไขข้อมูลของ ${formData.firstNameTh} ${formData.lastNameTh}` : 'กรอกข้อมูลผู้ป่วยใหม่'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Step Indicator */}
          <StepIndicator />

          {/* Step Content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t mt-8">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  ย้อนกลับ
                </button>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                ยกเลิก
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  ถัดไป
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ป่วย'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Progress Info */}
          <div className="mt-4 text-center text-sm text-gray-500">
            ขั้นตอนที่ {currentStep} จาก 3: {
              currentStep === 1 ? 'ข้อมูลส่วนตัว' :
              currentStep === 2 ? 'ข้อมูลสุขภาพพื้นฐาน' :
              'ข้อมูลผู้ติดต่อฉุกเฉิน'
            }
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatient;


