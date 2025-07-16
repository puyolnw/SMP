import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { routes } from '../routes/routes';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem
} from '@mui/material';
import { AccountCircle, Menu as MenuIcon } from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import { logout } from '../utils/auth';

// ประเภทของ Route
type Route = {
  path: string;
  nameTH?: string; // nameTH อาจไม่มีในบาง route
  children?: Route[]; // children เป็น array ของ Route
};

// ฟังก์ชันค้นหา nameTH จาก Nested Routes
function findCurrentPageName(routes: Route[], pathname: string): string | null {
  for (const route of routes) {
    // ตรวจสอบเส้นทางที่ตรงกัน
    if (route.path === pathname || (route.path === '' && pathname === '/')) {
      return route.nameTH || null; // คืนค่า nameTH หรือ null หากไม่มี nameTH
    }
    // ตรวจสอบ children
    if (route.children) {
      const childName = findCurrentPageName(route.children, pathname);
      if (childName) {
        return childName; // คืนค่า nameTH ที่เจอใน children
      }
    }
  }
  return null; // ไม่เจอ path ที่ตรงกัน
}

function NavBar({ onSidebarToggle }: { onSidebarToggle: () => void }) {
  const location = useLocation();
  const currentPage = findCurrentPageName(routes, location.pathname) || 'SM : Smart Patient'; // Default หากไม่เจอ

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // Detect screen size

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Retrieve user information from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user.username || 'ผู้ใช้งาน'; // ดึง username จาก user object

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        ml: isMobile ? 0 : '240px', /* Adjust margin-left for sidebar */
        width: isMobile ? '100%' : `calc(100% - 240px)`, /* Adjust width for sidebar */
        bgcolor: 'var(--primary-dark)', /* Use primary dark color from theme */
        borderBottom: `1px solid var(--border-dark)`, /* Use border dark color from theme */
        boxShadow: 'none' /* Remove default shadow for a cleaner look */
      }}
    >
      <Toolbar>
        {/* Sidebar Toggle Button */}
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={onSidebarToggle} // Call the toggle function
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Website Name */}
        <Typography
          variant="h6"
          sx={{
            color: 'var(--text-primary)', /* Use primary text color from theme */
            flexGrow: 1
          }}
        >
          {isMobile ? 'SMP : SMART PATIENT' : currentPage}
        </Typography>

        {/* User Greeting and Icon */}
        <Box
  sx={{
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    flexDirection: isMobile ? 'column' : 'row', // จัดเรียงข้อความและไอคอนในแนวตั้งสำหรับมือถือ
  }}
>
  <Typography
    variant="body1"
    sx={{
      color: 'var(--text-primary)',
      textAlign: isMobile ? 'center' : 'left', // จัดข้อความให้อยู่ตรงกลางสำหรับมือถือ
    }}
  >
    สวัสดี {userName}
  </Typography>
  <IconButton
    sx={{
      color: 'var(--primary-main)', /* Use primary main color */
      width: '40px', /* กำหนดขนาดปุ่ม */
      height: '40px', /* กำหนดขนาดปุ่ม */
      borderRadius: '50%', /* ทำให้ปุ่มเป็นวงกลม */
      transition: 'background-color 0.3s ease', /* เพิ่ม transition */
      '&:hover': {
        backgroundColor: 'var(--hover-overlay)', /* เพิ่มสี hover */
      },
    }}
    onClick={handleMenuOpen}
          >
            <AccountCircle />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={() => { /* Navigate to profile page */ handleMenuClose(); }}>
              ไปที่หน้าโปรไฟล์
            </MenuItem>
            <MenuItem onClick={() => { logout(); handleMenuClose(); }}>
              ออกจากระบบ
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;