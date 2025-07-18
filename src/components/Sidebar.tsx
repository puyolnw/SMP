import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Typography,
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import { menuItems } from './MenuSidebar';

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State to manage the open/close state of collapsible menus
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});

  const handleToggle = (itemText: string) => {
    setOpenMenus((prev) => ({ ...prev, [itemText]: !prev[itemText] }));
  };

  const drawerContent = (
    <>
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
        }}
        onClick={() => navigate('/')}
      >

        <Typography variant="h6" sx={{ color: 'var(--bg-primary)' }}>
       SM : Smart Patient
        </Typography>
      </Box>

      <List>
        {menuItems.map((item) => (
          <React.Fragment key={item.text}>
            {/* Main Menu Item */}
            <ListItem
              component="div"
              onClick={() =>
                item.children ? handleToggle(item.text) : navigate(item.path)
              }
              className={
                location.pathname === item.path ? 'nav-item active' : 'nav-item'
              }
              sx={{
                cursor: 'pointer',
                bgcolor: location.pathname === item.path ? 'var(--hover-overlay)' : 'inherit',
                color: location.pathname === item.path ? 'var(--accent-green)' : 'inherit',
                '&:hover': {
                  bgcolor: 'var(--hover-overlay)',
                  color: 'var(--accent-blue)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    location.pathname === item.path
                      ? 'var(--accent-green)'
                      : 'inherit', // Green when active
                }}
              >
                <item.icon />
              </ListItemIcon>
              <ListItemText primary={item.text} />
              {item.children && (
                openMenus[item.text] ? <ExpandLess /> : <ExpandMore />
              )}
            </ListItem>

            {/* Submenu Items */}
            {item.children && (
              <Collapse in={openMenus[item.text]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <ListItem
                      key={child.text}
                      onClick={() => navigate(child.path)}
                      sx={{
                        pl: 4,
                        cursor: 'pointer',
                        bgcolor: location.pathname === child.path ? 'var(--hover-overlay)' : 'inherit',
                        color: location.pathname === child.path ? 'var(--accent-green)' : 'inherit',
                        '&:hover': {
                          bgcolor: 'var(--hover-overlay)',
                          color: 'var(--accent-blue)',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color:
                            location.pathname === child.path
                              ? 'var(--accent-green)'
                              : 'inherit', // Green when active
                        }}
                      >
                        <child.icon />
                      </ListItemIcon>
                      <ListItemText primary={child.text} />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        ))}
      </List>
    </>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : true}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 240,
          bgcolor: 'var(--primary-dark)',
          color: 'var(--bg-primary)',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export default Sidebar;