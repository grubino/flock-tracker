import React from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Card,
  Avatar,
  Badge,
  Button,
} from '@fluentui/react-components';
import { Edit20Regular } from '@fluentui/react-icons';
import { useAuth } from '../../contexts/AuthContext';

const useStyles = makeStyles({
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: tokens.spacingVerticalXL,
  },
  header: {
    marginBottom: tokens.spacingVerticalXL,
  },
  title: {
    marginBottom: tokens.spacingVerticalL,
  },
  profileCard: {
    padding: tokens.spacingVerticalXL,
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalL,
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  infoSection: {
    marginBottom: tokens.spacingVerticalL,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: tokens.spacingVerticalM,
    columnGap: tokens.spacingHorizontalL,
  },
  label: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    minWidth: '120px',
  },
  value: {
    color: tokens.colorNeutralForeground1,
  },
  providerBadge: {
    textTransform: 'capitalize',
  },
  editButton: {
    marginTop: tokens.spacingVerticalL,
  },
});

const ProfileView: React.FC = () => {
  const styles = useStyles();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className={styles.container}>
        <Text>Please log in to view your profile.</Text>
      </div>
    );
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'google':
        return 'brand';
      case 'auth0':
        return 'important';
      case 'local':
        return 'informative';
      default:
        return 'subtle';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text as="h1" size={800} weight="bold" className={styles.title}>
          Profile
        </Text>
      </div>

      <Card className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <Avatar
            name={user.name}
            image={{ src: user.picture }}
            initials={getUserInitials(user.name)}
            size={72}
          />
          <div className={styles.profileInfo}>
            <Text as="h2" size={600} weight="semibold">
              {user.name}
            </Text>
            <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
              {user.email}
            </Text>
            <Badge
              appearance="outline"
              color={getProviderColor(user.provider)}
              className={styles.providerBadge}
            >
              {user.provider} account
            </Badge>
          </div>
        </div>

        <div className={styles.infoSection}>
          <Text as="h3" size={500} weight="semibold" style={{ marginBottom: tokens.spacingVerticalM }}>
            Account Information
          </Text>
          <div className={styles.infoGrid}>
            <Text className={styles.label}>User ID:</Text>
            <Text className={styles.value}>{user.id}</Text>

            <Text className={styles.label}>Email:</Text>
            <Text className={styles.value}>{user.email}</Text>

            <Text className={styles.label}>Display Name:</Text>
            <Text className={styles.value}>{user.name}</Text>

            <Text className={styles.label}>Account Type:</Text>
            <Text className={styles.value} style={{ textTransform: 'capitalize' }}>
              {user.provider}
            </Text>
          </div>
        </div>

        <Button
          appearance="outline"
          icon={<Edit20Regular />}
          className={styles.editButton}
          disabled
        >
          Edit Profile (Coming Soon)
        </Button>
      </Card>
    </div>
  );
};

export default ProfileView;