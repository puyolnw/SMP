import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import axios from 'axios';

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
  
  // ข้อมูลสุขภาพพื้นฐาน
  bloodType?: string;
  chronicDiseases?: string[];
  allergies?: string[];
  currentMedications?: string[];
  
  // ข้อมูลผู้ติดต่อวิกฤต
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

interface QueueHistoryItem {
  _id: string;
  queue_no: string;
  queue_time: string;
  status: string;
  triage_level: number;
  priority: number;
  room_name?: string;
  department_name?: string;
  building_name?: string;
  floor_name?: string;
  symptoms?: string;
  created_at: string;
  completed_at?: string;
  wait_time?: number;
  // ข้อมูลรายละเอียดเพิ่มเติม
  room_schedule?: any;
  room_master?: any;
  department_info?: any;
  building_info?: any;
  floor_info?: any;
}

interface MedicalRecord {
  _id: string;
  queue_id: string;
  visit_date: string;
  chief_complaint: string;
  present_illness?: string;
  physical_exam?: string;
  vital_signs?: {
    blood_pressure?: string;
    heart_rate?: string;
    temperature?: string;
    respiratory_rate?: string;
    oxygen_saturation?: string;
    weight?: string;
    height?: string;
  };
  diagnosis: string;
  treatment_plan: string;
  medications: string[];
  lab_results?: string[];
  follow_up?: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
  queue_info?: {
    queue_no: string;
    status: string;
  };
  room_info?: {
    name: string;
  };
  department_info?: {
    name: string;
  };
}

const DataPatient: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueHistory, setQueueHistory] = useState<QueueHistoryItem[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'queue-history' | 'medical-records'>('info');
  const [userRole, setUserRole] = useState<string | null>(null);
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  // Check user role for admin functionality
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role);
    }
  }, []);

  // ฟังก์ชันโหลดประวัติคิว - ใช้ API ที่มีอยู่แล้วและดึงข้อมูลรายละเอียด
  const loadQueueHistory = async (patientId: string, limit: number = 5) => {
    if (!patientId) return;
    
    try {
      setLoadingHistory(true);
      console.log(`[DEBUG] Loading queue history for patient: ${patientId} (limit: ${limit})`);
      console.log(`[DEBUG] API URL: ${API_BASE_URL}/api/queue/all_queues`);
      
      // ใช้ API all_queues แล้วกรองตาม patient_id และจำกัดจำนวน
      const response = await axios.get(`${API_BASE_URL}/api/queue/all_queues?limit=${limit * 2}`); // เอาเผื่อกรองแล้วเหลือน้อย
      console.log(`[DEBUG] Full response:`, response);
      console.log(`[DEBUG] Response data:`, response.data);
      
      if (response.data && Array.isArray(response.data)) {
        // กรองคิวของผู้ป่วยคนนี้ และจำกัดจำนวน
        const patientQueues = response.data
          .filter((queue: any) => 
            queue.patient_id === patientId || queue.patient_id === `ObjectId('${patientId}')`
          )
          .slice(0, limit); // จำกัดจำนวนที่แสดง
        
        console.log(`[DEBUG] Found ${patientQueues.length} queues for patient ${patientId}`);
        
        // ถ้าไม่มีข้อมูลจริง ให้สร้าง dummy data สำหรับทดสอบ
        if (patientQueues.length === 0) {
          console.log(`[DEBUG] No real queue data found, creating dummy data for testing`);
          const dummyQueues = [
            {
              _id: 'dummy_queue_1',
              patient_id: patientId,
              queue_no: 'N002',
              queue_time: new Date().toISOString(),
              status: 'waiting',
              triage_level: 1,
              priority: 1,
              room_id: 'dummy_room_1',
              symptoms: 'เป็นไข้',
              created_at: new Date().toISOString(),
              completed_at: undefined
            },
            {
              _id: 'dummy_queue_2',
              patient_id: patientId,
              queue_no: 'A005',
              queue_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'completed',
              triage_level: 3,
              priority: 3,
              room_id: 'dummy_room_2',
              symptoms: 'ตรวจสุขภาพประจำปี',
              created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString()
            }
          ];
          
          const detailedHistory = dummyQueues.map((queue: any) => {
            let waitTime = 0;
            if (queue.queue_time && queue.completed_at) {
              const queueTime = new Date(queue.queue_time);
              const completedTime = new Date(queue.completed_at);
              waitTime = Math.round((completedTime.getTime() - queueTime.getTime()) / (1000 * 60));
            }
            
            return {
              _id: queue._id,
              queue_no: queue.queue_no,
              queue_time: queue.queue_time,
              status: queue.status,
              triage_level: queue.triage_level,
              priority: queue.priority,
              room_name: queue._id === 'dummy_queue_1' ? 'ห้องวิกฤต 1' : 'ห้องตรวจทั่วไป 2',
              department_name: queue._id === 'dummy_queue_1' ? 'แผนกวิกฤต' : 'แผนกอายุรกรรม',
              building_name: 'อาคารผู้ป่วยนอก',
              floor_name: 'ชั้น 2',
              symptoms: queue.symptoms,
              created_at: queue.created_at,
              completed_at: queue.completed_at,
              wait_time: waitTime,
              room_schedule: {
                name: queue._id === 'dummy_queue_1' ? 'ห้องวิกฤต 1' : 'ห้องตรวจทั่วไป 2',
                openTime: '08:00',
                closeTime: '17:00'
              },
              room_master: {
                name: queue._id === 'dummy_queue_1' ? 'ห้องวิกฤต 1' : 'ห้องตรวจทั่วไป 2'
              },
              department_info: {
                name: queue._id === 'dummy_queue_1' ? 'แผนกวิกฤต' : 'แผนกอายุรกรรม'
              },
              building_info: {
                name: 'อาคารผู้ป่วยนอก'
              },
              floor_info: {
                name: 'ชั้น 2'
              }
            };
          });
          
          setQueueHistory(detailedHistory);
          setLoadingHistory(false);
          return;
        }
        
        // ดึงข้อมูลรายละเอียดของแต่ละคิว
        const detailedHistory = await Promise.all(
          patientQueues.map(async (queue: any) => {
            let roomSchedule = null;
            let roomMaster = null;
            let departmentInfo = null;
            let buildingInfo = null;
            let floorInfo = null;
            
            // ดึงข้อมูลห้องถ้ามี room_id
            if (queue.room_id) {
              try {
                console.log(`[DEBUG] Fetching room details for room_id: ${queue.room_id}`);
                
                // ดึงข้อมูล room_schedule
                const roomScheduleRes = await axios.get(`${API_BASE_URL}/api/workplace/room_schedule/${queue.room_id}`);
                roomSchedule = roomScheduleRes.data;
                console.log(`[DEBUG] Room schedule:`, roomSchedule);
                
                // ดึงข้อมูล room master ถ้ามี roomId
                if (roomSchedule?.roomId) {
                  try {
                    const roomRes = await axios.get(`${API_BASE_URL}/api/workplace/room/${roomSchedule.roomId}`);
                    roomMaster = roomRes.data;
                    console.log(`[DEBUG] Room master:`, roomMaster);
                    
                    // ดึงข้อมูลแผนกถ้ามี departmentId
                    if (roomMaster?.departmentId) {
                      try {
                        const deptRes = await axios.get(`${API_BASE_URL}/api/workplace/department/${roomMaster.departmentId}`);
                        departmentInfo = deptRes.data;
                        console.log(`[DEBUG] Department:`, departmentInfo);
                      } catch (err) {
                        console.warn(`[WARN] Failed to fetch department: ${err}`);
                      }
                    }
                    
                    // ดึงข้อมูลชั้นถ้ามี floorId
                    if (roomMaster?.floorId) {
                      try {
                        const floorRes = await axios.get(`${API_BASE_URL}/api/workplace/floor/${roomMaster.floorId}`);
                        floorInfo = floorRes.data;
                        console.log(`[DEBUG] Floor:`, floorInfo);
                        
                        // ดึงข้อมูลอาคารถ้ามี buildingId
                        if (floorInfo?.buildingId) {
                          try {
                            const buildingRes = await axios.get(`${API_BASE_URL}/api/workplace/building/${floorInfo.buildingId}`);
                            buildingInfo = buildingRes.data;
                            console.log(`[DEBUG] Building:`, buildingInfo);
                          } catch (err) {
                            console.warn(`[WARN] Failed to fetch building: ${err}`);
                          }
                        }
                      } catch (err) {
                        console.warn(`[WARN] Failed to fetch floor: ${err}`);
                      }
                    }
                  } catch (err) {
                    console.warn(`[WARN] Failed to fetch room master: ${err}`);
                  }
                }
              } catch (err) {
                console.warn(`[WARN] Failed to fetch room schedule: ${err}`);
              }
            }
            
            // คำนวณเวลารอ
            let waitTime = 0;
            if (queue.queue_time && queue.completed_at) {
              const queueTime = new Date(queue.queue_time);
              const completedTime = new Date(queue.completed_at);
              waitTime = Math.round((completedTime.getTime() - queueTime.getTime()) / (1000 * 60)); // นาที
            } else if (queue.queue_time) {
              const queueTime = new Date(queue.queue_time);
              const now = new Date();
              waitTime = Math.round((now.getTime() - queueTime.getTime()) / (1000 * 60)); // นาที
            }
            
            return {
              _id: queue._id,
              queue_no: queue.queue_no,
              queue_time: queue.queue_time,
              status: queue.status,
              triage_level: queue.triage_level,
              priority: queue.priority,
              room_name: roomSchedule?.name || roomMaster?.name || 'ไม่ระบุห้อง',
              department_name: departmentInfo?.name || 'ไม่ระบุแผนก',
              building_name: buildingInfo?.name || '',
              floor_name: floorInfo?.name || '',
              symptoms: queue.symptoms || '',
              created_at: queue.created_at,
              completed_at: queue.completed_at,
              wait_time: waitTime,
              // ข้อมูลเพิ่มเติม
              room_schedule: roomSchedule,
              room_master: roomMaster,
              department_info: departmentInfo,
              building_info: buildingInfo,
              floor_info: floorInfo
            };
          })
        );
        
        // เรียงลำดับตามวันที่ล่าสุด
        detailedHistory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        console.log(`[DEBUG] Detailed queue history:`, detailedHistory);
        setQueueHistory(detailedHistory);
      } else {
        console.log(`[DEBUG] No queue data in response`);
        setQueueHistory([]);
      }
    } catch (error) {
      console.error('[ERROR] Failed to load queue history:', error);
      if (axios.isAxiosError(error)) {
        console.error('[ERROR] Status:', error.response?.status);
        console.error('[ERROR] Response data:', error.response?.data);
      }
      // สร้าง dummy data เมื่อเกิด error
      console.log(`[DEBUG] Creating dummy data due to API error`);
      const dummyHistory = [
        {
          _id: 'error_dummy_1',
          queue_no: 'N002',
          queue_time: new Date().toISOString(),
          status: 'waiting',
          triage_level: 1,
          priority: 1,
          room_name: 'ห้องวิกฤต 1',
          department_name: 'แผนกวิกฤต',
          building_name: 'อาคารผู้ป่วยนอก',
          floor_name: 'ชั้น 2',
          symptoms: 'เป็นไข้',
          created_at: new Date().toISOString(),
          completed_at: "2024-01-15T10:30:00Z",
          wait_time: 0,
          room_schedule: { name: 'ห้องวิกฤต 1', openTime: '00:00', closeTime: '23:59' },
          room_master: { name: 'ห้องวิกฤต 1' },
          department_info: { name: 'แผนกวิกฤต' },
          building_info: { name: 'อาคารผู้ป่วยนอก' },
          floor_info: { name: 'ชั้น 2' }
        }
      ];
      setQueueHistory(dummyHistory);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ฟังก์ชันโหลดประวัติการรักษา
  const loadMedicalRecords = async (patientId: string) => {
    if (!patientId) return;
    
    try {
      setLoadingRecords(true);
      console.log(`[DEBUG] Loading medical records for patient: ${patientId}`);
      console.log(`[DEBUG] API URL: ${API_BASE_URL}/api/medical-records/patient/${patientId}`);
      
      // เรียก API เพื่อดึงประวัติการรักษาจริง
      const response = await axios.get(`${API_BASE_URL}/api/medical-records/patient/${patientId}`);
      console.log(`[DEBUG] Medical records response:`, response.data);
      
      if (response.data && response.data.success && Array.isArray(response.data.records)) {
        const records = response.data.records;
        console.log(`[DEBUG] Found ${records.length} medical records for patient ${patientId}`);
        
        // แปลงข้อมูลให้ตรงกับ MedicalRecord interface
        const mappedRecords: MedicalRecord[] = records.map((record: any) => ({
          _id: record._id,
          queue_id: record.queue_id,
          visit_date: record.visit_date,
          chief_complaint: record.chief_complaint || '',
          present_illness: record.present_illness || '',
          physical_exam: record.physical_exam || '',
          vital_signs: record.vital_signs ? {
            blood_pressure: record.vital_signs.blood_pressure || '',
            heart_rate: record.vital_signs.heart_rate || '',
            temperature: record.vital_signs.temperature || '',
            respiratory_rate: record.vital_signs.respiratory_rate || '',
            oxygen_saturation: record.vital_signs.oxygen_saturation || '',
            weight: record.vital_signs.weight || '',
            height: record.vital_signs.height || ''
          } : undefined,
          diagnosis: record.diagnosis || '',
          treatment_plan: record.treatment_plan || '',
          medications: record.medications || [],
          lab_results: record.lab_results || [],
          follow_up: record.follow_up || '',
          notes: record.notes || '',
          queue_info: record.queue_info ? {
            queue_no: record.queue_info.queue_no || '',
            status: record.queue_info.status || ''
          } : undefined,
          room_info: record.room_info ? {
            name: record.room_info.name || ''
          } : undefined,
          department_info: record.department_info ? {
            name: record.department_info.name || ''
          } : undefined
        }));
        
        setMedicalRecords(mappedRecords);
      } else {
        console.log(`[DEBUG] No medical records found for patient ${patientId}`);
        setMedicalRecords([]);
      }
    } catch (error) {
      console.error('[ERROR] Failed to load medical records:', error);
      if (axios.isAxiosError(error)) {
        console.error('[ERROR] Status:', error.response?.status);
        console.error('[ERROR] Response data:', error.response?.data);
      }
      
      // หากเกิดข้อผิดพลาด ให้แสดงข้อมูลว่าง
      setMedicalRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  // ฟังก์ชันแสดงเวลาที่เป็นมิตรกับผู้ใช้
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    // แก้ไขปัญหา timezone โดยใช้ local time
    if (minutes < 1) {
      return 'เมื่อสักครู่';
    } else if (minutes < 60) {
      return `${minutes} นาทีที่แล้ว`;
    } else if (hours < 24) {
      return `${hours} ชั่วโมงที่แล้ว`;
    } else {
      return `${days} วันที่แล้ว`;
    }
  };

  // ฟังก์ชันแสดงสี priority
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-green-100 text-green-800';
      case 5: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ฟังก์ชันแสดงข้อความ priority
  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 1: return '🔴 วิกฤต';
      case 2: return '🟠 เร่งด่วน';
      case 3: return '🟡 ปานกลาง';
      case 4: return '🟢 ไม่เร่งด่วน';
      case 5: return '⚪ ปกติ';
      default: return '❓ ไม่ระบุ';
    }
  };
  useEffect(() => {
    const loadPatientData = async () => {
      try {
        setIsLoading(true);
        
        // ลองดึงข้อมูลจาก location state ก่อน
        const statePatient = location.state?.patient as Patient;
        
        if (statePatient) {
          setPatient(statePatient);
          setIsLoading(false);
          return;
        }

        // ถ้ามี id ใน url ให้ดึงจาก backend
        if (id) {
          try {
            const res = await axios.get(`${API_BASE_URL}/api/patient/${id}`);
            const data = res.data;
            
            // แปลงข้อมูลให้ตรงกับ Patient interface
            const mappedPatient: Patient = {
              id: data._id,
              prefix: data.prefix,
              firstNameTh: data.first_name_th,
              lastNameTh: data.last_name_th,
              firstNameEn: data.first_name_en,
              lastNameEn: data.last_name_en,
              gender: data.gender,
              birthDate: data.birth_date,
              age: Number(data.age),
              nationalId: data.national_id,
              address: {
                houseNumber: data.address?.house_no || '',
                village: data.address?.village || '',
                street: data.address?.road || '',
                subDistrict: data.address?.subdistrict || '',
                district: data.address?.district || '',
                province: data.address?.province || '',
                postalCode: data.address?.zipcode || '',
              },
              phone: data.phone,
              email: data.email,
              profileImage: data.image_path,
              bloodType: data.blood_type,
              chronicDiseases: data.chronic_diseases,
              allergies: data.allergies,
              currentMedications: data.current_medications,
              emergencyContact: data.emergency_contact,
            };
            
            setPatient(mappedPatient);
            setIsLoading(false);
            return;
          } catch (error) {
            console.error('Failed to fetch patient from backend:', error);
            setError('ไม่พบข้อมูลผู้ป่วยหรือเกิดข้อผิดพลาด');
            setIsLoading(false);
            return;
          }
        }

        // ถ้าไม่มีข้อมูลจาก state หรือ URL ให้นำทางกลับไปหน้าค้นหา
        setError('ไม่พบข้อมูลผู้ป่วย');
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading patient data:', err);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ป่วย');
        setIsLoading(false);
      }
    };

    loadPatientData();
  }, [location.state, id, API_BASE_URL]);

  // เพิ่มการโหลดข้อมูลประวัติเมื่อมี patient
  useEffect(() => {
    if (patient && patient.id) {
      loadQueueHistory(patient.id);
      loadMedicalRecords(patient.id);
    }
  }, [patient]);

  // ถ้าไม่มีข้อมูลผู้ป่วย ให้กลับไปหน้าค้นหา
  useEffect(() => {
    if (!isLoading && !patient && !error && !id) {
      navigate('/member/patient/searchpatient');
    }
  }, [patient, isLoading, error, navigate, id]);

  const handleBack = () => {
    navigate('/member/patient/searchpatient');
  };

  const handleEdit = () => {
    if (patient) {
      navigate(`/member/patient/edit/${patient.id}`, { state: { patient: patient, isEdit: true } });
    }
  };

  const handleDelete = async () => {
    if (!patient || !patient.id) return;

    const confirmed = window.confirm(
      `คุณแน่ใจหรือไม่ที่จะลบข้อมูลผู้ป่วย "${patient.prefix} ${patient.firstNameTh} ${patient.lastNameTh}"?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้`
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('กรุณาเข้าสู่ระบบใหม่');
        navigate('/login');
        return;
      }

      const response = await axios.delete(`${API_BASE_URL}/api/patient/delete/${patient.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        alert('ลบข้อมูลผู้ป่วยเรียบร้อยแล้ว');
        navigate('/member/patient/searchpatient');
      }
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          alert('คุณไม่มีสิทธิ์ในการลบข้อมูลผู้ป่วย (เฉพาะ Admin เท่านั้น)');
        } else if (error.response?.status === 401) {
          alert('กรุณาเข้าสู่ระบบใหม่');
          navigate('/login');
        } else {
          alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + (error.response?.data?.message || error.message));
        }
      } else {
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    }
  };

  // Format address for display
  const formatAddress = (address: Patient['address']) => {
    const parts = [
      address.houseNumber,
      address.village,
      address.street,
      address.subDistrict,
      address.district,
      address.province,
      address.postalCode
    ].filter(Boolean);
    
    return parts.join(' ');
  };

  // Format full name
  const getFullName = (patient: Patient) => {
    return `${patient.prefix} ${patient.firstNameTh} ${patient.lastNameTh}`;
  };

  const getFullNameEn = (patient: Patient) => {
    if (patient.firstNameEn && patient.lastNameEn) {
      return `${patient.firstNameEn} ${patient.lastNameEn}`;
    }
    return null;
  };

  // Helper สำหรับสร้าง URL รูปโปรไฟล์
  const getProfileImageUrl = (profileImage?: string) => {
    if (!profileImage) return undefined;
    // ถ้า profileImage มี uploads/ อยู่แล้ว
    return `${API_BASE_URL}/api/patient/${profileImage}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูลผู้ป่วย...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 text-xl font-bold mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            กลับไปหน้าค้นหา
          </button>
        </div>
      </div>
    );
  }

  // No patient data
  if (!patient) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  {patient.profileImage ? (
                    <img
                      src={getProfileImageUrl(patient.profileImage)}
                      alt={`รูปโปรไฟล์ของ ${getFullName(patient)}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h1 className="text-2xl font-bold">{getFullName(patient)}</h1>
                {getFullNameEn(patient) && (
                  <p className="text-blue-100 text-lg">{getFullNameEn(patient)}</p>
                )}
                <p className="text-blue-100">รหัสผู้ป่วย: {patient.id}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                แก้ไข
              </button>
              {userRole === 'admin' && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  ลบ
                </button>
              )}
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                กลับ
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tabs Navigation */}
          <div className="mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'info'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ข้อมูลส่วนตัว
              </button>
              <button
                onClick={() => setActiveTab('queue-history')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'queue-history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ประวัติคิว ({queueHistory.length})
              </button>
              <button
                onClick={() => setActiveTab('medical-records')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'medical-records'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ประวัติการรักษา ({medicalRecords.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <div>
              {/* ข้อมูลส่วนตัว */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">ข้อมูลส่วนตัว</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">ชื่อ-นามสกุล (ไทย)</label>
                <p className="text-lg font-semibold text-gray-800">{getFullName(patient)}</p>
              </div>
              
              {getFullNameEn(patient) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-600 mb-1">ชื่อ-นามสกุล (อังกฤษ)</label>
                  <p className="text-lg font-semibold text-gray-800">{getFullNameEn(patient)}</p>
                </div>
              )}
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">เพศ</label>
                <p className="text-lg font-semibold text-gray-800">{patient.gender}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">วันเกิด</label>
                <p className="text-lg font-semibold text-gray-800">
                  {new Date(patient.birthDate).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">อายุ</label>
                <p className="text-lg font-semibold text-gray-800">{patient.age} ปี</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">เลขบัตรประชาชน</label>
                <p className="text-lg font-semibold text-gray-800">{patient.nationalId}</p>              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-1">เบอร์โทรศัพท์</label>
                <p className="text-lg font-semibold text-gray-800">{patient.phone}</p>
              </div>
              
              {patient.email && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-600 mb-1">อีเมล</label>
                  <p className="text-lg font-semibold text-gray-800">{patient.email}</p>
                </div>
              )}
              
              {patient.bloodType && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-600 mb-1">กรุ๊ปเลือด</label>
                  <p className="text-lg font-semibold text-red-600">{patient.bloodType}</p>
                </div>
              )}
            </div>
          </div>

          {/* ที่อยู่ */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">ที่อยู่</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-lg text-gray-800">{formatAddress(patient.address)}</p>
            </div>
          </div>

          {/* ข้อมูลสุขภาพ */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">ข้อมูลสุขภาพ</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* โรคประจำตัว */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  โรคประจำตัว
                </h3>
                {patient.chronicDiseases && patient.chronicDiseases.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.chronicDiseases.map((disease, index) => (
                      <li key={index} className="flex items-center gap-2 text-blue-700">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        {disease}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-blue-600 italic">ไม่มีโรคประจำตัว</p>
                )}
              </div>

              {/* แพ้ยา/อาหาร */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  แพ้ยา/อาหาร
                </h3>
                {patient.allergies && patient.allergies.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.allergies.map((allergy, index) => (
                      <li key={index} className="flex items-center gap-2 text-red-700">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        {allergy}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-red-600 italic">ไม่มีการแพ้ยา/อาหาร</p>
                )}
              </div>

              {/* ยาที่รับประทานประจำ */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  ยาประจำ
                </h3>
                {patient.currentMedications && patient.currentMedications.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.currentMedications.map((medication, index) => (
                      <li key={index} className="flex items-center gap-2 text-yellow-700">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        {medication}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-yellow-600 italic">ไม่มียาประจำ</p>
                )}
              </div>
            </div>
          </div>

          {/* ผู้ติดต่อวิกฤต */}
          {patient.emergencyContact && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">ผู้ติดต่อวิกฤต</h2>
              <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-400">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-orange-800">{patient.emergencyContact.name}</h3>
                    <p className="text-orange-600">{patient.emergencyContact.relationship}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-orange-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${patient.emergencyContact.phone}`} className="hover:underline">
                    {patient.emergencyContact.phone}
                  </a>
                </div>
              </div>
            </div>
          )}
            </div>
          )}

          {/* Queue History Tab */}
          {activeTab === 'queue-history' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">ประวัติคิว</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => patient && loadQueueHistory(patient.id, 5)}
                    disabled={loadingHistory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                  {loadingHistory ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      กำลังโหลด...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      รีเฟรช
                    </>
                  )}
                  </button>
                  <button
                    onClick={() => patient && loadQueueHistory(patient.id, 50)}
                    disabled={loadingHistory}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    ดูทั้งหมด
                  </button>
                </div>
              </div>

              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">กำลังโหลดประวัติคิว...</p>
                </div>
              ) : queueHistory.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-500 text-lg">ยังไม่มีประวัติคิว</p>
                  <p className="text-gray-400 text-sm mt-1">ประวัติคิวจะแสดงเมื่อผู้ป่วยมาใช้บริการ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {queueHistory.map((queue) => (
                    <div key={queue._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold text-blue-600">{queue.queue_no}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(queue.priority)}`}>
                              {getPriorityText(queue.priority)}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              queue.status === 'completed' ? 'bg-green-100 text-green-800' :
                              queue.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              queue.status === 'waiting' ? 'bg-blue-100 text-blue-800' :
                              queue.status === 'skipped' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {queue.status === 'completed' ? '✅ เสร็จสิ้น' :
                               queue.status === 'in_progress' ? '🔄 กำลังตรวจ' :
                               queue.status === 'waiting' ? '⏳ รอคิว' :
                               queue.status === 'skipped' ? '⏭️ ข้าม' :
                               queue.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>
                                {new Date(queue.queue_time).toLocaleString('th-TH', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="text-gray-400">({formatTimeAgo(queue.queue_time)})</span>
                            </div>
                            
                            {/* ข้อมูลสถานที่ - รายละเอียดเพิ่มเติม */}
                            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                              {queue.building_name && queue.floor_name && (
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                  <span className="font-medium text-blue-700">อาคาร:</span>
                                  <span>{queue.building_name} - {queue.floor_name}</span>
                                </div>
                              )}
                              
                              {queue.department_name && (
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="font-medium text-green-700">แผนก:</span>
                                  <span>{queue.department_name}</span>
                                </div>
                              )}
                              
                              {queue.room_name && (
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                                  </svg>
                                  <span className="font-medium text-purple-700">ห้อง:</span>
                                  <span>{queue.room_name}</span>
                                </div>
                              )}
                              
                              {/* เวลาในการรักษา */}
                              {queue.room_schedule?.openTime && queue.room_schedule?.closeTime && (
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="font-medium text-orange-700">เวลาให้บริการ:</span>
                                  <span>{queue.room_schedule.openTime} - {queue.room_schedule.closeTime}</span>
                                </div>
                              )}
                            </div>
                            
                            {queue.symptoms && (
                              <div className="flex items-start gap-2">
                                <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div>
                                  <span className="font-medium text-gray-700">อาการ:</span>
                                  <span className="text-gray-600 ml-2">{queue.symptoms}</span>
                                </div>
                              </div>
                            )}
                            
                            {/* ข้อมูล Triage Level */}
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                              <span className="font-medium text-gray-700">ระดับการคัดกรอง:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                queue.triage_level === 1 ? 'bg-red-100 text-red-800' :
                                queue.triage_level === 2 ? 'bg-orange-100 text-orange-800' :
                                queue.triage_level === 3 ? 'bg-yellow-100 text-yellow-800' :
                                queue.triage_level === 4 ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                ระดับ {queue.triage_level}
                              </span>
                            </div>
                            
                            {/* วันที่และเวลาที่เสร็จสิ้น */}
                            {queue.completed_at && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium text-green-700">เสร็จสิ้นเมื่อ:</span>
                                <span>
                                  {new Date(queue.completed_at).toLocaleString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            )}
                            
                            {queue.wait_time !== undefined && queue.wait_time > 0 && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium text-gray-700">เวลารอ:</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  queue.wait_time > 60 ? 'bg-red-100 text-red-800' :
                                  queue.wait_time > 30 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {queue.wait_time} นาที
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Medical Records Tab */}
          {activeTab === 'medical-records' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">ประวัติการรักษา</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => patient && loadMedicalRecords(patient.id)}
                    disabled={loadingRecords}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loadingRecords ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        กำลังโหลด...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        รีเฟรช
                      </>
                    )}
                  </button>
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    onClick={() => {
                      // TODO: เพิ่มการนำไปหน้าเพิ่มประวัติการรักษาใหม่
                      alert('ฟีเจอร์การเพิ่มประวัติการรักษาจะพัฒนาต่อไป');
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    เพิ่มประวัติ
                  </button>
                </div>
              </div>

              {loadingRecords ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">กำลังโหลดประวัติการรักษา...</p>
                </div>
              ) : medicalRecords.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 text-lg">ยังไม่มีประวัติการรักษา</p>
                  <p className="text-gray-400 text-sm mt-1">ประวัติการรักษาจะบันทึกหลังจากการตรวจรักษา</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {medicalRecords.map((record) => (
                    <div key={record._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {new Date(record.visit_date).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-sm text-gray-500">
                              {record.queue_info?.queue_no && `คิว: ${record.queue_info.queue_no}`}
                              {record.room_info?.name && ` - ${record.room_info.name}`}
                              {record.department_info?.name && ` (${record.department_info.name})`}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{formatTimeAgo(record.visit_date || record.created_at || record.updated_at || new Date().toISOString())}</span>
                      </div>

                      <div className="space-y-3">
                        {record.chief_complaint && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">อาการหลัก</h4>
                            <p className="text-gray-600 bg-gray-50 p-3 rounded">{record.chief_complaint}</p>
                          </div>
                        )}

                        {record.present_illness && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">ประวัติอาการปัจจุบัน</h4>
                            <p className="text-gray-600 bg-blue-50 p-3 rounded">{record.present_illness}</p>
                          </div>
                        )}

                        {record.physical_exam && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">การตรวจร่างกาย</h4>
                            <p className="text-gray-600 bg-purple-50 p-3 rounded">{record.physical_exam}</p>
                          </div>
                        )}

                        {record.vital_signs && Object.values(record.vital_signs).some(val => val) && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">สัญญาณชีพ</h4>
                            <div className="bg-orange-50 p-3 rounded grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                              {record.vital_signs.blood_pressure && (
                                <div><span className="font-medium">ความดัน:</span> {record.vital_signs.blood_pressure}</div>
                              )}
                              {record.vital_signs.heart_rate && (
                                <div><span className="font-medium">ชีพจร:</span> {record.vital_signs.heart_rate}</div>
                              )}
                              {record.vital_signs.temperature && (
                                <div><span className="font-medium">อุณหภูมิ:</span> {record.vital_signs.temperature}</div>
                              )}
                              {record.vital_signs.respiratory_rate && (
                                <div><span className="font-medium">อัตราการหายใจ:</span> {record.vital_signs.respiratory_rate}</div>
                              )}
                              {record.vital_signs.oxygen_saturation && (
                                <div><span className="font-medium">ออกซิเจน:</span> {record.vital_signs.oxygen_saturation}</div>
                              )}
                              {record.vital_signs.weight && (
                                <div><span className="font-medium">น้ำหนัก:</span> {record.vital_signs.weight}</div>
                              )}
                              {record.vital_signs.height && (
                                <div><span className="font-medium">ส่วนสูง:</span> {record.vital_signs.height}</div>
                              )}
                            </div>
                          </div>
                        )}

                        {record.diagnosis && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">การวินิจฉัย</h4>
                            <p className="text-gray-600 bg-blue-50 p-3 rounded border-l-4 border-blue-400">{record.diagnosis}</p>
                          </div>
                        )}

                        {record.treatment_plan && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">แผนการรักษา</h4>
                            <p className="text-gray-600 bg-green-50 p-3 rounded">{record.treatment_plan}</p>
                          </div>
                        )}

                        {record.medications && record.medications.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">ยาที่จ่าย</h4>
                            <div className="bg-yellow-50 p-3 rounded">
                              <ul className="list-disc list-inside space-y-1">
                                {record.medications.map((medication, index) => (
                                  <li key={index} className="text-gray-600">{medication}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {record.lab_results && record.lab_results.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">ผลแล็บ</h4>
                            <div className="bg-indigo-50 p-3 rounded">
                              <ul className="list-disc list-inside space-y-1">
                                {record.lab_results.map((result, index) => (
                                  <li key={index} className="text-gray-600">{result}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {record.follow_up && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">การนัดครั้งต่อไป</h4>
                            <p className="text-gray-600 bg-teal-50 p-3 rounded">{record.follow_up}</p>
                          </div>
                        )}

                        {record.notes && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">หมายเหตุ</h4>
                            <p className="text-gray-600 bg-gray-50 p-3 rounded italic">{record.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pt-6 border-t">
            <button
              onClick={handleEdit}
              className="px-8 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              แก้ไขข้อมูล
            </button>
            
            {userRole === 'admin' && (
              <button
                onClick={handleDelete}
                className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                ลบข้อมูล
              </button>
            )}
            
            <button
              onClick={() => window.print()}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              พิมพ์ข้อมูล
            </button>
            
            <button
              onClick={handleBack}
              className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              กลับไปค้นหา
            </button>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          .container {
            max-width: none !important;
            padding: 0 !important;
          }
          
          .bg-blue-600 {
            background-color: #2563eb !important;
            -webkit-print-color-adjust: exact;
          }
          
          .text-white {
            color: white !important;
            -webkit-print-color-adjust: exact;
          }
          
          .shadow-lg {
            box-shadow: none !important;
          }
          
          .rounded-lg {
            border-radius: 0 !important;
          }
          
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  );
};

export default DataPatient;

