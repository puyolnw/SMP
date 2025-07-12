import { createBrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard/dashboard';
import Layout from '../components/Layout';
import AuthenLayout from '../components/Auth/AuthenLayout';
import LoginPage from '../pages/Auth/Login/login';
import ProtectedRoute from '../components/Auth/ProtectedRoute'; // นำเข้า ProtectedRoute


import AllData from '../pages/Page/DailyPantient';
import EditData from '../pages/Page/EditData';
import ExportData from '../pages/Page/ExportData';
import ShowQueue from '../pages/Page/Queue/ShowQueue';
import ManageQueue from '../pages/Page/Queue/ManageQueue';
import AddPatient from '../pages/Page/Member/Patient/AddPatient';
import SearchPatient from '../pages/Page/Member/Patient/SeachPatient';
import DataPatient from '../pages/Page/Member/Patient/DataPatient';
import Welcome from '../pages/Page/Screening/Welcome';
import AuthenPatient from '../pages/Page/Screening/AuthenPatient';
import AllProcess from '../pages/Page/Screening/AllProcess';



import {
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
export const routes = [
  {
    path: '/',
    element: <ProtectedRoute />, // ใช้ ProtectedRoute เพื่อบังคับให้ต้อง login ก่อน
    children: [
      {
        path: '/',
        element: <Layout />, // Layout หลักสำหรับหน้า Dashboard และอื่นๆ
        children: [
          {
            path: '',
            name: 'Dashboard',
            nameTH: 'แดชบอร์ด',
            icon: DashboardIcon,
            element: <Dashboard />
          },
          {
            path: '/data',
            name: 'Data',
            nameTH: 'ข้อมูลทั้งหมด',
            icon: DashboardIcon,
            element: <AllData />
          },
          {
            path: '/data/edit/:id',
            name: 'Edit Data',
            nameTH: 'แก้ไขข้อมูล',
            icon: DashboardIcon,
            element: <EditData />
          },
          {
            path: '/data/export',
            name: 'Export Data',
            nameTH: 'ส่งออกข้อมูล',
            icon: DashboardIcon,
            element: <ExportData />
          },
            {
            path: '/Queue/Manage',
            name: 'Queue Manager',
            nameTH: 'การจัดการคิว',
            icon: DashboardIcon,
            element: <ManageQueue />
          },
           {
            path: '/Member/Pantient/AddPantient',
            name: 'Add New Pantient',
            nameTH: 'เพิ่มผู้ป่วยใหม่',
            icon: DashboardIcon,
            element: <AddPatient />
          },
           {
            path: '/member/pantient/searchpantient',
            name: 'Seach Pantient',
            nameTH: 'ค้นหาผู้ป่วย',
            icon: DashboardIcon,
            element: <SearchPatient />
          },
           {
            path: '/member/pantient/dataPantient',
            name: 'dataPantient',
            nameTH: 'ข้อมูลผู้ป่วย',
            icon: DashboardIcon,
            element: <DataPatient />
          },
          {
            path: '/Screening/AuthenPatient',
            name: 'AuthenPatient',
            nameTH: 'ยืนยันตัวตนผู้ป่วย',
            icon: DashboardIcon,
            element: <AuthenPatient />
          },
           {
            path: '/Screening/Patient',
            name: 'AuthenPatient',
            nameTH: 'หน้าคัดกรอง',
            icon: DashboardIcon,
            element: <AllProcess />
          },
        ]
      },
      {
          path: '/Queue/ShowQueue',
            name: 'Queue',
            nameTH: 'การแสดงคิว',
            icon: DashboardIcon,
            element: <ShowQueue />
      },
       {
          path: '/welcome',
            name: 'WelcomeQr',
            nameTH: 'ยินดีต้อนรับ',
            icon: DashboardIcon,
            element: <Welcome />
      },
  {
            path: '/Screening/AuthenPatient2',
            name: 'AuthenPatient',
            nameTH: 'ยืนยันตัวตนผู้ป่วย',
            icon: DashboardIcon,
            element: <AuthenPatient />
          },
{
            path: '/Screening/Patient2',
            name: 'AuthenPatient',
            nameTH: 'หน้าคัดกรอง',
            icon: DashboardIcon,
            element: <AllProcess />
          },

    ]
  },
  {
    path: '/auth',
    element: <AuthenLayout />, // Layout สำหรับ Authentication
    children: [
      {
        path: 'login',
        name: 'Login',
        nameTH: 'เข้าสู่ระบบ',
        element: <LoginPage />
      }
    ]
  }
];
const router = createBrowserRouter(routes);
export default router;