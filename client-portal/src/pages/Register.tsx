import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import MudhroLogo from '../../logos/MudhroLogo.png';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/client-portal/auth/register', {
        email,
        password,
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'white',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        padding: '48px',
        textAlign: 'center',
        border: '1px solid #e0e0e0',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '40px',
          color: 'white',
        }}>
          ✓
        </div>
          <h1 style={{
            marginBottom: '16px',
            fontSize: '28px',
            fontWeight: '700',
            color: '#1a202c',
          }}>
            Registration Successful!
          </h1>
          <p style={{
            color: '#718096',
            fontSize: '16px',
            marginBottom: '32px',
          }}>
            Your account has been created successfully. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'white',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #e0e0e0',
      }}>
        {/* Decorative background elements */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'rgba(0, 0, 0, 0.03)',
          borderRadius: '50%',
          zIndex: 0,
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '150px',
          height: '150px',
          background: 'rgba(0, 0, 0, 0.03)',
          borderRadius: '50%',
          zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <img
              src={MudhroLogo}
              alt="Mudhro Logo"
              style={{
                height: '80px',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Title */}
          <h1 style={{
            textAlign: 'center',
            marginBottom: '8px',
            fontSize: '32px',
            fontWeight: '700',
            color: '#1a202c',
            letterSpacing: '-0.5px',
          }}>
            Create Account
          </h1>
          <p style={{
            textAlign: 'center',
            marginBottom: '40px',
            color: '#718096',
            fontSize: '16px',
          }}>
            Register to access your invoice portal
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2d3748',
                }}
              >
                Email Address
                <span style={{ color: '#a0aec0', fontWeight: '400', marginLeft: '4px' }}>
                  (must match your client email)
                </span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1a1a1a';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2d3748',
                }}
              >
                Password
                <span style={{ color: '#a0aec0', fontWeight: '400', marginLeft: '4px' }}>
                  (min. 8 characters)
                </span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Create a password"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1a1a1a';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2d3748',
                }}
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Confirm your password"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1a1a1a';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#fed7d7',
                color: '#c53030',
                borderRadius: '8px',
                fontSize: '14px',
                border: '1px solid #feb2b2',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '16px',
                background: loading
                  ? '#cbd5e0'
                  : '#1a1a1a',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: loading
                  ? 'none'
                  : '0 4px 12px rgba(0, 0, 0, 0.2)',
                transform: loading ? 'none' : 'translateY(0)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.backgroundColor = '#2d2d2d';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                  e.currentTarget.style.backgroundColor = '#1a1a1a';
                }
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <p style={{ color: '#718096', fontSize: '14px', margin: 0 }}>
                Already have an account?{' '}
                <Link
                  to="/login"
                  style={{
                    color: '#1a1a1a',
                    textDecoration: 'none',
                    fontWeight: '600',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#4a4a4a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#1a1a1a';
                  }}
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
