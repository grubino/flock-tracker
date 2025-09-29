import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  makeStyles,
  tokens,
  Text,
  Button
} from '@fluentui/react-components';
import { Navigation20Regular } from '@fluentui/react-icons';
import { useAuth } from '../../contexts/AuthContext';
import UserProfileMenu from './UserProfileMenu';

interface HeaderProps {
  onMenuToggle: () => void;
}

const useStyles = makeStyles({
  header: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorNeutralForegroundInverted,
    boxShadow: tokens.shadow4,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalXL}`,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForegroundInverted,
    textDecoration: 'none',
  },
  menuButton: {
    color: tokens.colorNeutralForegroundInverted,
    '&:hover': {
      backgroundColor: tokens.colorPaletteGreenBackground3,
    },
  },
});

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const styles = useStyles();
  const { isAuthenticated } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.leftSection}>
          <Button
            appearance="subtle"
            icon={<Navigation20Regular />}
            onClick={onMenuToggle}
            className={styles.menuButton}
            aria-label="Toggle navigation menu"
          />
          <RouterLink to="/" className={styles.logo}>
            <Text size={600} weight="bold">
              Flock Tracker
            </Text>
          </RouterLink>
        </div>
        <div className={styles.rightSection}>
          {isAuthenticated && <UserProfileMenu />}
        </div>
      </div>
    </header>
  );
};

export default Header;