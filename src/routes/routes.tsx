import { createBrowserRouter } from 'react-router-dom';
import { lazy } from 'react';
import Dashboard from '../pages/Dashboard/dashboard';
import Layout from '../components/Layout';
import EmLayout from '../components/EmLayout';
import AuthenLayout from '../components/Auth/AuthenLayout';
import ProtectedRoute from '../components/Auth/ProtectedRoute'; // นำเข้า ProtectedRoute

// Lazy load components
const AllData = lazy(() => import('../pages/Page/DailyPatient'));
const EditData = lazy(() => import('../pages/Page/EditData'));
const ExportData = lazy(() => import('../pages/Page/ExportData'));
const ShowQueue = lazy(() => import('../pages/Page/Queue/ShowQueue'));
const ManageQueue = lazy(() => import('../pages/Page/Queue/ManageQueue'));
const AddPatient = lazy(() => import('../pages/Page/Member/Patient/AddPatient'));
const SearchPatient = lazy(() => import('../pages/Page/Member/Patient/SeachPatient'));
const DataPatient = lazy(() => import('../pages/Page/Member/Patient/DataPatient'));
const Welcome = lazy(() => import('../pages/Page/Screening/Welcome'));
const AuthenPatient = lazy(() => import('../pages/Page/Screening/AuthenPatient'));
const AllProcess = lazy(() => import('../pages/Page/Screening/AllProcess'));
const AddDepartment = lazy(() => import('../pages/Page/Manage/Add-Department'));
const Departments = lazy(() => import('../pages/Page/Manage/Departments'));
const AddEmployee = lazy(() => import('../pages/Page/Member/Employee/AddEmployee'));
const DataEmployee = lazy(() => import('../pages/Page/Member/Employee/DataEmployee'));
const SearchEmployee = lazy(() => import('../pages/Page/Member/Employee/SearchEmployee'));
const ManageRoom = lazy(() => import('../pages/Page/Queue/MangeRoom'));
const ProfilePage = lazy(() => import('../pages/Auth/Profile/profile'));
const LoginPage = lazy(() => import('../pages/Auth/Login/login'));
const PatientReport = lazy(() => import('../pages/Page/Reports/Patientreport'));
const DoctorReport = lazy(() => import('../pages/Page/Reports/Doctor_report'));
const NurseReport = lazy(() => import('../pages/Page/Reports/Nurse_report'));
const DashboardReport = lazy(() => import('../pages/Page/Reports/Dashboard_report'));

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
            path: '/Member/Patient/AddPatient',
            name: 'Add New Patient',
            nameTH: 'เพิ่มผู้ป่วยใหม่',
            icon: DashboardIcon,
            element: <AddPatient />
          },
          {
            path: '/member/patient/add',
            name: 'Add Patient',
            nameTH: 'เพิ่มผู้ป่วย',
            icon: DashboardIcon,
            element: <AddPatient />
          },
          {
            path: '/member/patient/edit/:id',
            name: 'Edit Patient',
            nameTH: 'แก้ไขผู้ป่วย',
            icon: DashboardIcon,
            element: <AddPatient />
          },
           {
            path: '/member/patient/searchpatient',
            name: 'Seach Patient',
            nameTH: 'ค้นหาผู้ป่วย',
            icon: DashboardIcon,
            element: <SearchPatient />
          },
           {
            path: '/member/patient/dataPatient',
            name: 'dataPatient',
            nameTH: 'ข้อมูลผู้ป่วย',
            icon: DashboardIcon,
            element: <DataPatient />
          },
          {
            path: '/member/patient/dataPatient/:id',
            name: 'dataPatientById',
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
          {
            path: '/manage/add-department',
            name: 'AddDepartment',
            nameTH: 'จัดการแผนก',
            icon: DashboardIcon,
            element: <AddDepartment />
          },
            {
            path: '/manage/departments',
            name: 'Department',
            nameTH: 'จัดการแผนก',
            icon: DashboardIcon,
            element: <Departments />
          },
          {
            path: '/member/employee/addemployee',
            name: 'addemployee',
            nameTH: 'เพิ่มบุคลากร',
            icon: DashboardIcon,
            element: <AddEmployee />
          },
           {
            path: '/member/employee/searchemployee',
            name: 'Search employee',
            nameTH: 'ค้นหาบุคลากร',
            element: <SearchEmployee />
          },
           {
            path: '/member/employee',
            name: 'dataemployee',
            nameTH: 'ข้อมูลบุคลากร',
            element: <DataEmployee />
          },
          {
            path: '/member/employee/dataemployee/:id',
            name: 'dataemployee-detail',
            nameTH: 'ข้อมูลบุคลากร',
            element: <DataEmployee />
          },
          {
            path: '/reports/patient',
            name: 'Patient Report',
            nameTH: 'รายงานประวัติผู้ป่วย',
            element: <PatientReport />
          },
          {
            path: '/reports/doctor',
            name: 'Doctor Report',
            nameTH: 'รายงานผลงานแพทย์',
            element: <DoctorReport />
          },
          {
            path: '/reports/nurse',
            name: 'Nurse Report',
            nameTH: 'รายงานผลงานพยาบาล',
            element: <NurseReport />
          },
          {
            path: '/reports/dashboard',
            name: 'Dashboard Report',
            nameTH: 'Dashboard รายงาน',
            element: <DashboardReport />
          },
          {
            path: '/Queue/Manage/room',
            name: 'QManageRoom',
            nameTH: 'จัดการห้อง',
            element: <ManageRoom/>
          },
          {
            path: '/profile/:id',
            name: 'Profile',
            nameTH: 'โปรไฟล์',
            icon: DashboardIcon,
            element: <ProfilePage />
          },
          
        ]
      }
    ]
  },
  {
    path: '/',
    element: <EmLayout />, // Layout สำหรับหน้าที่ไม่ต้อง login
    children: [
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