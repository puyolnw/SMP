import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { GlobalDebugPanel } from './GlobalDebugPanel';
import { DebugProvider } from '../contexts/DebugContext';
import { Box, useMediaQuery, useTheme } from '@mui/material';

function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSidebarToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <DebugProvider>
      <Box
        sx={{
          display: 'flex',
          bgcolor: 'var(--bg-secondary)',
          minHeight: '100vh',
        }}
      >
        <Sidebar mobileOpen={mobileOpen} onClose={handleSidebarToggle} />

        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            ml: isMobile ? 0 : '240px',
          }}
        >
          <Navbar onSidebarToggle={handleSidebarToggle} />

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              mt: 8,
              bgcolor: 'var(--bg-tertiary)',
              overflowY: 'auto',
            }}
          >
            <Outlet />
          </Box>
        </Box>

        {/* Global Debug Panel */}
        <GlobalDebugPanel />
      </Box>
    </DebugProvider>
  );
}

export default Layout;
