import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(229, 9, 20, 0.2)',
          borderTopColor: 'var(--netflix-red)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ color: '#888', fontSize: '0.9rem' }}>Verifying authorization...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 1. Unauthenticated -> Redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role-Based Check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '520px',
          background: 'rgba(26, 26, 26, 0.9)',
          border: '1px solid rgba(229, 9, 20, 0.4)',
          borderRadius: '6px',
          padding: '2.5rem',
          textAlign: 'center'
        }}>
          <ShieldAlert size={48} color="var(--netflix-red)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontWeight: 700 }}>
            Access Restricted
          </h2>
          <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
            Your account role is <strong style={{ color: '#fff', textTransform: 'uppercase' }}>{user.role}</strong>.
            This area requires one of the following roles:{' '}
            <strong style={{ color: 'var(--netflix-red)' }}>[{allowedRoles.join(', ')}]</strong>.
          </p>
          <Link to="/" className="btn-netflix-play" style={{ fontSize: '0.9rem', padding: '0.6rem 1.2rem' }}>
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
