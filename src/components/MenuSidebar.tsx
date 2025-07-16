import {
  Dashboard as DashboardIcon,

  LocalHospital,
  PersonSearch,

  WavingHand,
  MedicalServices,
  HealthAndSafety,
  MeetingRoom,
  AdminPanelSettings,
  AddBusiness,
  People,
  PersonAddAlt1,
  Badge,
  EventNote,
  MedicalInformation,

  ReceiptLong,

  FactCheck,
  HowToReg,
  ContentPaste,
  Grading,
} from '@mui/icons-material';

export const menuItems = [
  {
    text: 'หน้าหลัก',
    icon: DashboardIcon,
    path: '/',
    nameTH: 'หน้าหลัก',
  },
  {
    text:'ความสำคัญ',
    icon: MedicalServices,
    path: '/dat',
    nameTH: 'ข้อมูล',
    children: [
      {
        text: '1. เพิ่มผู้ป่วย',
        icon: PersonAddAlt1,
        path: '/member/patient/addpatient',
        nameTH: 'เพิ่มผู้ป่วย',
      },
      {
        text: '2. ค้นหาผู้ป่วย',
        icon: PersonSearch,
        path: '/member/patient/searchpatient',
        nameTH: 'ค้นหาผู้ป่วย',
      },
      {
        text: '3. ยืนยันตัวตน 1',
        icon: HowToReg,
        path: '/Screening/AuthenPatient',
        nameTH: 'ยืนยันตัวตน 1',
      },
        
     
        {
        text: '5. คัดกรอง 1',
        icon: ContentPaste,
        path: '/Screening/Patient',
        nameTH: 'คัดกรองผู้ป่วย 1',
      },
      {
        text: 'จัดการแผนก',
        icon: LocalHospital,
        path: '/manage/departments',
        nameTH: 'จัดการแผนก',
      },
      {
        text: 'เพิ่มแผนก',
        icon: AddBusiness,
        path: '/manage/add-department',
        nameTH: 'เพิ่มแผนก',
      },
       {
        text: 'ค้นหาบุคลากร',
        icon: People,
        path: '/member/employee/searchemployee',
        nameTH: 'ค้นหาบุคลากร',
      },
      {
        text: 'เพิ่มบุคลากร',
        icon: Badge,
        path: '/member/employee/addemployee',
        nameTH: 'เพิ่มบุคลากร',
      },
       {
        text: 'จัดการห้องตรวจ',
        icon: MeetingRoom,
        path: '/queue/manage/room',
        nameTH: 'จัดการห้องตรวจ',
      },

    ],
  },
  {
    text:'ระบบจัดการ',
    icon: AdminPanelSettings,
    path: '/dat',
    nameTH: 'ข้อมูล',
    children: [
      {
        text: 'ผู้ป่วย',
        icon: MedicalInformation,
        path: '/data',
        nameTH: 'ผู้ป่วยประจำวัน',
      },
       {
        text: 'จอแสดงคิว',
        icon: ReceiptLong,
        path: '/queue/showqueue',
        nameTH: 'จอแสดงคิว',
      },
      {
        text: 'จัดการคิว',
        icon: EventNote,
        path: '/queue/manage',
        nameTH: 'จัดการคิว',
      },
         
     
        {
        text: '4. ยืนยันตัวตน 2',
        icon: FactCheck,
        path: '/Screening/AuthenPatient2',
        nameTH: 'ยืนยันตัวตน 2',
      },
            {
        text: '6. คัดกรอง 2',
        icon: Grading,
        path: '/Screening/Patient2',
        nameTH: 'คัดกรองผู้ป่วย 2',
      },
    ],
  },

   {
    text:'ระบบผู้ป่วย', //ใช้สำหรับเป็นแสดงผลแบบ user ผู้ป่วยที่เข้ามาใช้
    icon: HealthAndSafety,
    path: '/dat',
    nameTH: 'ระบบผู้ป่วย',
    children: [
      {
        text: 'ยินดีต้อนรับ',
        icon: WavingHand,
        path: '/welcome',
        nameTH: 'ยินดีต้อนรับ',
      },
    ],
  },
];
