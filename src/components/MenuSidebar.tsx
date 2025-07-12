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
        text: 'ค้นหาผู้ป่วย+ข้อมูล',
        icon: PersonSearch,
        path: '/member/pantient/searchpantient',
        nameTH: 'ค้นหาผู้ป่วย',
      },
       {
        text: 'เพิ่มผู้ป่วย',
        icon: PersonAdd,
        path: '/member/pantient/addpantient',
        nameTH: 'เพิ่มผู้ป่วย',
      },
       {
        text: 'ยืนยันตัวตน 1',
        icon: VerifiedUser,
        path: '/Screening/AuthenPatient',
        nameTH: 'ยืนยันตัวตน 1',
      },
       {
        text: 'ยืนยันตัวตน 2',
        icon: Security,
        path: '/Screening/AuthenPatient2',
        nameTH: 'ยืนยันตัวตน 2',
      },
      {
        text: 'คัดกรอง 1',
        icon: Assignment,
        path: '/Screening/Patient',
        nameTH: 'คัดกรองผู้ป่วย 1',
      },
      {
        text: 'คัดกรอง 2',
        icon: Analytics,
        path: '/Screening/Patient2',
        nameTH: 'คัดกรองผู้ป่วย 2',
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
