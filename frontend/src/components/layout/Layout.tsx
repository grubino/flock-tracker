import React, { useState } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import Header from './Header';
import SideNavigation from './SideNavigation';

interface LayoutProps {
  children: React.ReactNode;
}

const useStyles = makeStyles({
  container: {
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: tokens.spacingVerticalXL,
    paddingTop: '80px', // Account for fixed header
  },
});

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const styles = useStyles();
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);

  const handleMenuToggle = () => {
    setIsSideNavOpen(!isSideNavOpen);
  };

  const handleSideNavClose = () => {
    setIsSideNavOpen(false);
  };

  return (
    <div className={styles.container}>
      <Header onMenuToggle={handleMenuToggle} />
      <SideNavigation isOpen={isSideNavOpen} onClose={handleSideNavClose} />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
};

export default Layout;