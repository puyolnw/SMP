import {
  PersonSearch,
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
  Home,
  Assessment,
  Person,
  BarChart,
  History,
  LocalHospital,
} from '@mui/icons-material';


// Helper function to get user role from localStorage
const getUserRole = () => {
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      return user.role || '';
    }
    return '';
  } catch (error) {
    console.error('getUserRole - Error:', error);
    return '';
  }
};

export const getMenuItems = () => {
  const userRole = getUserRole();
  
  // เมนูสำหรับแอดมิน
  if (userRole === 'admin') {
    return [
      {
        text: 'หน้าหลัก',
        icon: Home,
        path: '/',
        nameTH: 'หน้าหลัก',
      },
      {
        text: 'จัดการคิว',
        icon: EventNote,
        path: '/queue/manage',
        nameTH: 'จัดการคิว',
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
        text: 'รายงาน',
        icon: Assessment,
        path: '',
        nameTH: 'ระบบรายงาน',
        children: [
          {
            text: 'รายงานการคัดกรอง',
            icon: BarChart,
            path: '/reports/dashboard',
            nameTH: 'รายงานการคัดกรอง',
          },
          {
            text: 'รายงานผู้ป่วย',
            icon: History,
            path: '/reports/patient',
            nameTH: 'รายงานประวัติผู้ป่วย',
          },
          {
            text: 'รายงานแพทย์',
            icon: Person,
            path: '/reports/doctor',
            nameTH: 'รายงานผลงานแพทย์',
          },
          {
            text: 'รายงานพยาบาล',
            icon: LocalHospital,
            path: '/reports/nurse',
            nameTH: 'รายงานผลงานพยาบาล',
          },
        ],
      },
    ];
  }
  
  // เมนูสำหรับหมอ
  if (userRole === 'doctor') {
    return [
      {
        text: 'หน้าหลัก',
        icon: Home,
        path: '/',
        nameTH: 'หน้าหลัก',
      },
      {
        text: 'จัดการคิว',
        icon: EventNote,
        path: '/queue/manage',
        nameTH: 'จัดการคิว',
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
        ],
      },
      {
        text: 'รายงานการรักษา',
        icon: Assignment,
        path: '/reports/doctor-treatment',
        nameTH: 'รายงานการรักษาของหมอ',
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
    ];
  }
  
  // เมนูสำหรับพยาบาล
  if (userRole === 'nurse') {
    return [
      {
        text: 'หน้าหลัก',
        icon: Home,
        path: '/',
        nameTH: 'หน้าหลัก',
      },
      {
        text: 'จัดการคิว',
        icon: EventNote,
        path: '/queue/manage',
        nameTH: 'จัดการคิว',
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
      
      
    ];
  }
  
  // เมนูสำหรับผู้ใช้อื่นๆ (default)
  return [
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
      ],
    },
    {
      text: 'ระบบจัดการ',
      icon: AdminPanelSettings,
      path: '/dat',
      nameTH: 'ระบบจัดการ',
      children: [
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
      text: 'รายงาน',
      icon: Assessment,
      path: '',
      nameTH: 'ระบบรายงาน',
      children: [
        {
          text: 'รายงานการคัดกรอง',
          icon: BarChart,
          path: '/reports/dashboard',
          nameTH: 'รายงานการคัดกรอง',
        },
        {
          text: 'รายงานผู้ป่วย',
          icon: History,
          path: '/reports/patient',
          nameTH: 'รายงานประวัติผู้ป่วย',
        },
        {
          text: 'รายงานแพทย์',
          icon: Person,
          path: '/reports/doctor',
          nameTH: 'รายงานผลงานแพทย์',
        },
        {
          text: 'รายงานพยาบาล',
          icon: LocalHospital,
          path: '/reports/nurse',
          nameTH: 'รายงานผลงานพยาบาล',
        },
      ],
    },
  ];
};

// Keep the old export for backward compatibility
export const menuItems = getMenuItems();