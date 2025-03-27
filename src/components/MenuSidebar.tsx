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
    text: 'ข้อมูล ',
    icon: People,
    path: '/data',
    nameTH: 'ข้อมูลทั้งหมด',
    children: [
      {
        text: 'ข้อมูลทั้งหมด',
        icon: List,
        path: '/data',
        nameTH: 'ข้อมูลทั้งหมด',
      },
      {
        text: 'เพิ่มข้อมูล',
        icon: PersonAdd,
        path: '/data/addnew',
        nameTH: 'เพิ่มข้อมูล',
      },
    ],
  },

];