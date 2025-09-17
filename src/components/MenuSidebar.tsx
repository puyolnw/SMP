import {
  PersonSearch,
  WavingHand,
  HealthAndSafety,
  MeetingRoom,
  AdminPanelSettings,
  People,
  Badge,
  EventNote,

  FactCheck,
  Grading,
  MonitorHeart,
  Verified,
  Assignment,
  QueuePlayNext,
  PersonAdd,
  ManageAccounts,
  Business,
  Smartphone,
  Home,
} from '@mui/icons-material';

export const menuItems = [
  {
    text: 'หน้าหลัก',
    icon: Home,
    path: '/',
    nameTH: 'หน้าหลัก',
  },

  {
    text: 'ผู้ป่วย',
    icon: HealthAndSafety,
    path: '',
    nameTH: 'จัดการผู้ป่วย',
    children: [
      {
        text: 'เพิ่มผู้ป่วย',
        icon: PersonAdd,
        path: '/member/patient/addpatient',
        nameTH: 'เพิ่มผู้ป่วย',
      },
      {
        text: 'ค้นหาผู้ป่วย',
        icon: PersonSearch,
        path: '/member/patient/searchpatient',
        nameTH: 'ค้นหาผู้ป่วย',
      },
    ],
  },
  {
    text: 'บุคลากร',
    icon: People,
    path: '/dat',
    nameTH: 'จัดการบุคลากร',
    children: [
      {
        text: 'ค้นหาบุคลากร',
        icon: ManageAccounts,
        path: '/member/employee/searchemployee',
        nameTH: 'ค้นหาบุคลากร',
      },
      {
        text: 'เพิ่มบุคลากร',
        icon: Badge,
        path: '/member/employee/addemployee',
        nameTH: 'เพิ่มบุคลากร',
      },
    ],
  },
  {
    text: 'ระบบจัดการ',
    icon: AdminPanelSettings,
    path: '/dat',
    nameTH: 'ระบบจัดการ',
    children: [

      {
        text: 'จัดการคิว',
        icon: EventNote,
        path: '/queue/manage',
        nameTH: 'จัดการคิว',
      },
      {
        text: 'จัดการแผนก',
        icon: Business,
        path: '/manage/departments',
        nameTH: 'จัดการแผนก',
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
    text: 'การแสดงผล',
    icon: MonitorHeart,
    path: '/dat',
    nameTH: 'ระบบแสดงผล',
    children: [
      {
        text: 'ยืนยันตัวตน มินิ',
        icon: Verified,
        path: '/Screening/AuthenPatient',
        nameTH: 'ยืนยันตัวตน 1',
      },
      {
        text: 'คัดกรอง มินิ',
        icon: Assignment,
        path: '/Screening/Patient',
        nameTH: 'คัดกรองผู้ป่วย 1',
      },
      {
        text: 'ยืนยันตัวตน FULL',
        icon: FactCheck,
        path: '/Screening/AuthenPatient2',
        nameTH: 'ยืนยันตัวตน 2',
      },
      {
        text: 'คัดกรอง FULL',
        icon: Grading,
        path: '/Screening/Patient2',
        nameTH: 'คัดกรองผู้ป่วย 2',
      },
      {
        text: 'จอแสดงคิว',
        icon: QueuePlayNext,
        path: '/queue/showqueue',
        nameTH: 'จอแสดงคิว',
      },
    ],
  },
  {
    text: 'ระบบผู้ป่วย',
    icon: Smartphone,
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