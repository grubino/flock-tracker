import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  makeStyles,
  tokens,
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
  Avatar,
  Text,
} from '@fluentui/react-components';
import {
  Person20Regular,
  SignOut20Regular,
  ChevronDown20Regular,
} from '@fluentui/react-icons';
import { useAuth } from '../../contexts/AuthContext';

const useStyles = makeStyles({
  profileButton: {
    color: tokens.colorNeutralForegroundInverted,
    backgroundColor: 'transparent',
    border: 'none',
    padding: tokens.spacingVerticalS,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    cursor: 'pointer',
    borderRadius: tokens.borderRadiusMedium,
    '&:hover': {
      backgroundColor: tokens.colorPaletteGreenBackground3,
    },
  },
  userName: {
    color: tokens.colorNeutralForegroundInverted,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightMedium,
  },
  userEmail: {
    color: tokens.colorNeutralForegroundInverted,
    fontSize: tokens.fontSizeBase200,
    opacity: 0.8,
  },
  menuContent: {
    minWidth: '200px',
  },
  userInfo: {
    padding: tokens.spacingVerticalM,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
});

const UserProfileMenu: React.FC = () => {
  const styles = useStyles();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!user) {
    return null;
  }

  const handleProfileClick = () => {
    setIsMenuOpen(false);
    navigate('/profile');
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    navigate('/login');
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Menu
      open={isMenuOpen}
      onOpenChange={(_, data) => setIsMenuOpen(data.open)}
    >
      <MenuTrigger disableButtonEnhancement>
        <Button
          appearance="transparent"
          className={styles.profileButton}
          aria-label="User profile menu"
        >
          <Avatar
            name={user.name}
            image={{ src: user.picture }}
            initials={getUserInitials(user.name)}
            size={32}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Text className={styles.userName}>{user.name}</Text>
          </div>
          <ChevronDown20Regular />
        </Button>
      </MenuTrigger>

      <MenuPopover className={styles.menuContent}>
        <MenuList>
          <div className={styles.userInfo}>
            <Text weight="semibold">{user.name}</Text>
            <Text className={styles.userEmail}>{user.email}</Text>
          </div>

          <MenuDivider />

          <MenuItem onClick={handleProfileClick}>
            <div className={styles.menuItem}>
              <Person20Regular />
              <Text>View Profile</Text>
            </div>
          </MenuItem>

          <MenuDivider />

          <MenuItem onClick={handleLogout}>
            <div className={styles.menuItem}>
              <SignOut20Regular />
              <Text>Sign Out</Text>
            </div>
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};

export default UserProfileMenu;