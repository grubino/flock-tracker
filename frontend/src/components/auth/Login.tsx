import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import {
  Card,
  Text,
  Button,
  Input,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import {
  PersonAccounts24Regular,
  Eye24Regular,
  EyeOff24Regular,
  ArrowDownload24Regular,
} from '@fluentui/react-icons';
import { useAuth } from '../../contexts/AuthContext';
import type { User } from '../../contexts/AuthContext';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: tokens.spacingVerticalXL,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: tokens.spacingVerticalXXL,
  },
  header: {
    textAlign: 'center',
    marginBottom: tokens.spacingVerticalXL,
  },
  icon: {
    fontSize: '48px',
    color: tokens.colorBrandBackground,
    marginBottom: tokens.spacingVerticalM,
    display: 'block',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  inputField: {
    width: '100%',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordToggle: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: tokens.colorNeutralForeground2,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: `${tokens.spacingVerticalL} 0`,
    '&::before, &::after': {
      content: '""',
      flex: 1,
      height: '1px',
      backgroundColor: tokens.colorNeutralStroke2,
    },
  },
  dividerText: {
    padding: `0 ${tokens.spacingHorizontalM}`,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  oauthButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  googleButton: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  footer: {
    textAlign: 'center',
    marginTop: tokens.spacingVerticalL,
  },
  downloadSection: {
    textAlign: 'center',
    marginTop: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalL,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
    marginBottom: tokens.spacingVerticalS,
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacingVerticalM,
  },
});

const DEFAULT_SERVER_URL = import.meta.env.VITE_API_URL || '';

export const Login: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { loginWithCredentials, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState(() => {
    // Load from localStorage or use default
    return localStorage.getItem('server_url') || DEFAULT_SERVER_URL;
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLocalLoading(true);

    try {
      // Store the server URL before logging in
      localStorage.setItem('server_url', serverUrl);

      await loginWithCredentials(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential: string }) => {
    try {
      // TODO: Send the credential to your backend for verification
      // and user creation/login
      console.log('Google login success:', credentialResponse);

      // For now, we'll decode the JWT to get user info (in production, do this on backend)
      const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));

      const userData: User = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        provider: 'google',
        role: 'customer', // Default role for OAuth users
      };

      // TODO: Replace with actual backend call
      localStorage.setItem('auth_token', credentialResponse.credential);
      localStorage.setItem('user_data', JSON.stringify(userData));

      // Trigger a page reload to update auth state
      window.location.href = '/';
    } catch (error) {
      console.error('Google login error:', error);
      setError('Google login failed');
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed');
  };


  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Spinner size="large" label="Loading..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <PersonAccounts24Regular className={styles.icon} />
          <Text as="h1" size={800} weight="bold" style={{ marginBottom: tokens.spacingVerticalS, display: 'block' }}>
            Welcome Back
          </Text>
          <Text size={400} style={{ color: tokens.colorNeutralForeground2, display: 'block' }}>
            Sign in to your Flock Tracker account
          </Text>
        </div>

        {error && (
          <Text className={styles.error}>
            {error}
          </Text>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <Text size={200} style={{ marginBottom: tokens.spacingVerticalXXS, display: 'block', color: tokens.colorNeutralForeground2 }}>
              Server URL
            </Text>
            <Input
              type="url"
              placeholder="Server URL (e.g., https://api.example.com)"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className={styles.inputField}
            />
          </div>

          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.inputField}
          />

          <div className={styles.passwordContainer}>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.inputField}
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff24Regular /> : <Eye24Regular />}
            </button>
          </div>

          <Button
            type="submit"
            appearance="primary"
            disabled={localLoading || !email || !password}
          >
            {localLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerText}>or continue with</span>
        </div>

        <div className={styles.oauthButtons}>
          <div className={styles.googleButton}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              text="signin_with"
              width="100%"
            />
          </div>
        </div>

        <div className={styles.footer}>
          <Text size={300}>
            Don't have an account?{' '}
            <RouterLink
              to="/register"
              style={{
                color: tokens.colorBrandBackground,
                textDecoration: 'none'
              }}
            >
              Sign up
            </RouterLink>
          </Text>
        </div>

        <div className={styles.downloadSection}>
          <Text size={200} style={{ marginBottom: tokens.spacingVerticalS, display: 'block', color: tokens.colorNeutralForeground2 }}>
            Download the Android app
          </Text>
          <Button
            as="a"
            href={`${serverUrl}/download/apk`}
            icon={<ArrowDownload24Regular />}
            appearance="subtle"
          >
            Download APK
          </Button>
        </div>
      </Card>
    </div>
  );
};