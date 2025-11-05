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
  PersonAdd24Regular,
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
  success: {
    color: tokens.colorPaletteGreenForeground1,
    fontSize: tokens.fontSizeBase200,
    marginBottom: tokens.spacingVerticalS,
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacingVerticalM,
  },
  passwordStrength: {
    fontSize: tokens.fontSizeBase100,
    marginTop: '4px',
  },
  weak: {
    color: tokens.colorPaletteRedForeground1,
  },
  medium: {
    color: tokens.colorPaletteYellowForeground1,
  },
  strong: {
    color: tokens.colorPaletteGreenForeground1,
  },
});

const DEFAULT_SERVER_URL = import.meta.env.VITE_API_URL || '';

export const Register: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [serverUrl, setServerUrl] = useState(() => {
    // Load from localStorage or use default
    return localStorage.getItem('server_url') || DEFAULT_SERVER_URL;
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { strength: 'weak', text: 'Too short' };
    if (password.length < 8) return { strength: 'medium', text: 'Could be stronger' };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { strength: 'medium', text: 'Add uppercase, lowercase and numbers' };
    }
    return { strength: 'strong', text: 'Strong password' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLocalLoading(true);

    try {
      // Store the server URL before registering
      localStorage.setItem('server_url', serverUrl);

      await register(formData.email, formData.password, formData.name);
      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      // TODO: Send the credential to your backend for verification
      // and user creation/login
      console.log('Google registration success:', credentialResponse);

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
      console.error('Google registration error:', error);
      setError('Google registration failed');
    }
  };

  const handleGoogleError = () => {
    setError('Google registration failed');
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

  const isFormValid = formData.name && formData.email && formData.password &&
                     formData.confirmPassword && formData.password === formData.confirmPassword;

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <PersonAdd24Regular className={styles.icon} />
          <Text as="h1" size={800} weight="bold">
            Create Account
          </Text>
          <Text size={400} style={{ color: tokens.colorNeutralForeground2 }}>
            Join Flock Tracker to manage your farm
          </Text>
        </div>

        {error && (
          <Text className={styles.error}>
            {error}
          </Text>
        )}

        {success && (
          <Text className={styles.success}>
            {success}
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
            />
          </div>

          <Input
            type="text"
            placeholder="Full name"
            value={formData.name}
            onChange={handleInputChange('name')}
            required
          />

          <Input
            type="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleInputChange('email')}
            required
          />

          <div className={styles.passwordContainer}>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange('password')}
              required
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

          {formData.password && (
            <Text className={`${styles.passwordStrength} ${styles[passwordStrength.strength as keyof typeof styles]}`}>
              {passwordStrength.text}
            </Text>
          )}

          <div className={styles.passwordContainer}>
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              required
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              title={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff24Regular /> : <Eye24Regular />}
            </button>
          </div>

          <Button
            type="submit"
            appearance="primary"
            disabled={localLoading || !isFormValid}
          >
            {localLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerText}>or sign up with</span>
        </div>

        <div className={styles.oauthButtons}>
          <div className={styles.googleButton}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              text="signup_with"
              width="100%"
            />
          </div>

        </div>

        <div className={styles.footer}>
          <Text size={300}>
            Already have an account?{' '}
            <RouterLink
              to="/login"
              style={{
                color: tokens.colorBrandBackground,
                textDecoration: 'none'
              }}
            >
              Sign in
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