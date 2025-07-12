import {
  Dashboard as DashboardIcon,
  People,
  List,
  PersonAdd,
} from '@mui/icons-material';

export const menuItems = [
  {
    text: 'หน้าหลัก',
    icon: DashboardIcon,
    path: '/',
    nameTH: 'หน้าหลัก',
  },
  {
    text:'Test ',
    icon: People,
    path: '/dat',
    nameTH: 'ข้อมูล',
    children: [
      {
        text: 'ผู้ป่วย',
        icon: List,
        path: '/data',
        nameTH: 'ผู้ป่วยประจำวัน',
      },
       {
        text: 'จอแสดงคิว',
        icon: PersonAdd,
        path: '/queue/showqueue',
        nameTH: 'จอแสดงคิว',
      },
      {
        text: 'จัดการคิว',
        icon: PersonAdd,
        path: '/queue/manage',
        nameTH: 'จัดการคิว',
      },
       {
        text: 'ค้นหาผู้ป่วย+ข้อมูล',
        icon: PersonAdd,
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
        text: 'ยืนยันตัว 1',
        icon: PersonAdd,
        path: '/Screening/AuthenPatient',
        nameTH: 'ยืนยันตัวตน 1',
      },
       {
        text: 'ยืนยันตัว 2',
        icon: PersonAdd,
        path: '/Screening/AuthenPatient2',
        nameTH: 'ยืนยันตัวตน 2',
      },
      {
        text: 'คัดกรอง 1',
        icon: PersonAdd,
        path: '/Screening/Patient',
        nameTH: 'ยืนยันตัวตน 2',
      },
      {
        text: 'คัดกรอง 2',
        icon: PersonAdd,
        path: '/Screening/Patient2',
        nameTH: 'ยืนยันตัวตน 2',
      },

    ],
  },

   {
    text:'Moblie Test ', //ใช้สำหรับเป็นแสดงผลแบบ user ผู้ป่วยที่เข้ามาใช้
    icon: People,
    path: '/dat',
    nameTH: 'ข้อมูล',
    children: [
      {
        text: 'ยินดีต้อนรับ',
        icon: List,
        path: '/welcome',
        nameTH: 'ยินดีต้อนรับ',
      },
   

    ],
  },

];