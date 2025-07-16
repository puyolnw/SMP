import {
  Dashboard as DashboardIcon,
  PersonAdd,
  LocalHospital,
  QueueMusic,
  Visibility,
  PersonSearch,
  VerifiedUser,
  Assignment,
  WavingHand,
  Healing,
  MonitorHeart,
  Security,
  Analytics,

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
    icon: WavingHand,
    path: '/dat',
    nameTH: 'ข้อมูล',
    children: [
      {
        text: '1. เพิ่มผู้ป่วย',
        icon: PersonAdd,
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
        icon: VerifiedUser,
        path: '/Screening/AuthenPatient',
        nameTH: 'ยืนยันตัวตน 1',
      },
        
       {
        text: '4. ยืนยันตัวตน 2',
        icon: Security,
        path: '/Screening/AuthenPatient2',
        nameTH: 'ยืนยันตัวตน 2',
      },
        {
        text: '5. คัดกรอง 1',
        icon: Assignment,
        path: '/Screening/Patient',
        nameTH: 'คัดกรองผู้ป่วย 1',
      },
      {
        text: '6. คัดกรอง 2',
        icon: Analytics,
        path: '/Screening/Patient2',
        nameTH: 'คัดกรองผู้ป่วย 2',
      },

      {
        text: 'ผู้ป่วย',
        icon: MonitorHeart,
        path: '/data',
        nameTH: 'ผู้ป่วยประจำวัน',
      },
       {
        text: 'จอแสดงคิว',
        icon: Visibility,
        path: '/queue/showqueue',
        nameTH: 'จอแสดงคิว',
      },
      {
        text: 'จัดการคิว',
        icon: QueueMusic,
        path: '/queue/manage',
        nameTH: 'จัดการคิว',
      },
      
       
     
    
    ],
  },
  {
    text:'ระบบจัดการ',
    icon: LocalHospital,
    path: '/dat',
    nameTH: 'ข้อมูล',
    children: [
      {
        text: 'ผู้ป่วย',
        icon: MonitorHeart,
        path: '/data',
        nameTH: 'ผู้ป่วยประจำวัน',
      },
       {
        text: 'จอแสดงคิว',
        icon: Visibility,
        path: '/queue/showqueue',
        nameTH: 'จอแสดงคิว',
      },
      {
        text: 'จัดการคิว',
        icon: QueueMusic,
        path: '/queue/manage',
        nameTH: 'จัดการคิว',
      },
         {
        text: 'จัดการแผนก',
        icon: QueueMusic,
        path: '/manage/departments',
        nameTH: 'จัดการแผนก',
      },
      {
        text: 'เพิ่มแผนก',
        icon: QueueMusic,
        path: '/manage/add-department',
        nameTH: 'เพิ่มแผนก',
      },
      {
        text: 'ค้นหาบุคลากร',
        icon: QueueMusic,
        path: '/member/employee/searchemployee',
        nameTH: 'เพิ่มแผนก',
      },
      {
        text: 'เพิ่มบุคลากร',
        icon: QueueMusic,
        path: '/member/employee/addemployee',
        nameTH: 'เพิ่มแผนก',
      },
       {
        text: 'จัดการห้องตรวจ',
        icon: QueueMusic,
        path: '/queue/manage/room',
        nameTH: 'จัดการห้องตรวจ',
      },

    ],
  },

   {
    text:'ระบบผู้ป่วย', //ใช้สำหรับเป็นแสดงผลแบบ user ผู้ป่วยที่เข้ามาใช้
    icon: Healing,
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
