import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Avatar
} from '@fluentui/react-components';
import {
  AnimalRabbit20Regular,
  Calendar20Regular,
  CalendarClock20Regular,
  Location20Regular,
  Home20Regular,
  Dismiss20Regular,
  PersonAccounts20Regular,
  SignOut20Regular,
  Settings20Regular,
  Money20Regular,
  Building20Regular,
  ShoppingBag20Regular,
  DocumentBulletList20Regular,
  Video20Regular,
  ChatSparkle20Regular
} from '@fluentui/react-icons';
import { useAuth } from '../../contexts/AuthContext';

interface SideNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

const useStyles = makeStyles({
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1001,
    opacity: 0,
    visibility: 'hidden',
    transition: 'opacity 0.3s ease, visibility 0.3s ease',
  },
  backdropOpen: {
    opacity: 1,
    visibility: 'visible',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    width: '280px',
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
    zIndex: 1002,
    transform: 'translateX(-100%)',
    transition: 'transform 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarOpen: {
    transform: 'translateX(0)',
  },
  header: {
    padding: tokens.spacingVerticalL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    color: tokens.colorNeutralForeground2,
  },
  nav: {
    padding: tokens.spacingVerticalM,
    flex: 1,
  },
  navItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground2,
    textDecoration: 'none',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground2,
      color: tokens.colorNeutralForeground1,
    },
    '&:active': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  navItemActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    '&:hover': {
      backgroundColor: tokens.colorBrandBackground2,
      color: tokens.colorBrandForeground2,
    },
  },
  userSection: {
    padding: tokens.spacingVerticalL,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    marginTop: 'auto',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalS,
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    display: 'block',
    fontWeight: tokens.fontWeightMedium,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userEmail: {
    display: 'block',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  authButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
});

const SideNavigation: React.FC<SideNavigationProps> = ({ isOpen, onClose }) => {
  const styles = useStyles();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  // Navigation items for customers (read-only access)
  const customerNavItems = [
    {
      path: '/',
      label: 'Animals',
      icon: <AnimalRabbit20Regular />,
    },
  ];

  // Navigation items for users and admins (full access)
  const standardNavItems = [
    {
      path: '/',
      label: 'Home',
      icon: <Home20Regular />,
    },
    {
      path: '/animals',
      label: 'Animals',
      icon: <AnimalRabbit20Regular />,
    },
    {
      path: '/products',
      label: 'Products',
      icon: <ShoppingBag20Regular />,
    },
    {
      path: '/events',
      label: 'Events',
      icon: <Calendar20Regular />,
    },
    {
      path: '/care-schedules',
      label: 'Care Schedules',
      icon: <CalendarClock20Regular />,
    },
    {
      path: '/expenses',
      label: 'Expenses',
      icon: <Money20Regular />,
    },
    {
      path: '/receipts/batch-upload',
      label: 'Batch Receipt Upload',
      icon: <DocumentBulletList20Regular />,
    },
    {
      path: '/vendors',
      label: 'Vendors',
      icon: <Building20Regular />,
    },
    {
      path: '/locations',
      label: 'Locations',
      icon: <Location20Regular />,
    },
    {
      path: '/livestreams',
      label: 'Livestreams',
      icon: <Video20Regular />,
    },
    {
      path: '/agent',
      label: 'Ask AI Agent',
      icon: <ChatSparkle20Regular />,
    },
  ];

  const navItems = user?.role === 'customer' ? customerNavItems : standardNavItems;

  const adminNavItems = [
    {
      path: '/admin/users',
      label: 'User Management',
      icon: <Settings20Regular />,
      requiresRole: 'admin' as const,
    },
  ];

  const handleNavClick = () => {
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ''}`}
        onClick={onClose}
      />
      <nav className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.header}>
          <Text size={500} weight="semibold">
            Navigation
          </Text>
          <Button
            appearance="subtle"
            icon={<Dismiss20Regular />}
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close navigation menu"
          />
        </div>
        <div className={styles.nav}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
                           (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <RouterLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                {item.icon}
                {item.label}
              </RouterLink>
            );
          })}

          {user?.role === 'admin' && adminNavItems.length > 0 && (
            <>
              <div style={{ borderTop: '1px solid #e5e5e5', margin: '16px 0', paddingTop: '16px' }}>
                <Text size={300} weight="semibold" style={{ paddingLeft: '16px', color: '#6b7280', display: 'block', marginBottom: '8px' }}>
                  Admin
                </Text>
              </div>
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.path ||
                               location.pathname.startsWith(item.path);

                return (
                  <RouterLink
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                  >
                    {item.icon}
                    {item.label}
                  </RouterLink>
                );
              })}
            </>
          )}
        </div>

        <div className={styles.userSection}>
          {isAuthenticated && user ? (
            <>
              <div className={styles.userInfo}>
                <Avatar
                  name={user.name}
                  image={{ src: user.picture }}
                  size={32}
                />
                <div className={styles.userDetails}>
                  <Text className={styles.userName}>{user.name}</Text>
                  <Text className={styles.userEmail}>{user.email}</Text>
                </div>
              </div>
              <Button
                appearance="subtle"
                icon={<SignOut20Regular />}
                onClick={handleLogout}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <div className={styles.authButtons}>
              <RouterLink to="/login" onClick={handleNavClick} style={{ textDecoration: 'none' }}>
                <Button
                  appearance="primary"
                  icon={<PersonAccounts20Regular />}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  Sign In
                </Button>
              </RouterLink>
              <RouterLink to="/register" onClick={handleNavClick} style={{ textDecoration: 'none' }}>
                <Button
                  appearance="outline"
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  Create Account
                </Button>
              </RouterLink>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default SideNavigation;