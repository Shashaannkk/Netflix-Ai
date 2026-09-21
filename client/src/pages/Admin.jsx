import React, { useState } from 'react';
import { Shield, FileUp, CheckCircle, Database, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { testViewerAccess, testHostAccess, testAdminAccess } from '../services/api';

export const Admin = () => {
  const { user } = useAuth();
  const [testResult, setTestResult] = useState(null);
  const [loadingTest, setLoadingTest] = useState(false);

  const runRbacTest = async (testFn, label) => {
    setLoadingTest(true);
    setTestResult(null);
    try {
      const res = await testFn();
      setTestResult({
        success: true,
        endpoint: label,
        message: res.message,
        data: res.data
      });
    } catch (err) {
      setTestResult({
        success: false,
        endpoint: label,
        message: err.message
      });
    } finally {
      setLoadingTest(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '80px auto 40px', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--netflix-red)', padding: '0.6rem', borderRadius: '8px' }}>
            <Shield size={28} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Studio Metadata & Ingestion CMS</h1>
            <p style={{ color: '#888', fontSize: '0.9rem' }}>
              Restricted Area &bull; Authenticated Admin: <strong style={{ color: '#fff' }}>{user?.displayName}</strong> ({user?.email})
            </p>
          </div>
        </div>

        <span style={{
          background: 'rgba(229, 9, 20, 0.2)',
          color: 'var(--netflix-red)',
          border: '1px solid var(--netflix-red)',
          fontSize: '0.75rem',
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: '4px',
          letterSpacing: '1px'
        }}>
          ROLE: ADMIN AUTHORIZED
        </span>
      </div>

      {/* RBAC Verification Live Playground */}
      <div style={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: '6px', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Lock size={18} color="var(--netflix-red)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Live RBAC Middleware Testing</h2>
        </div>
        <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Trigger protected backend routes with your current JWT access token to verify backend permission enforcement.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button
            onClick={() => runRbacTest(testViewerAccess, 'GET /api/test/viewer')}
            disabled={loadingTest}
            style={{
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #444',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Test Viewer Route
          </button>

          <button
            onClick={() => runRbacTest(testHostAccess, 'GET /api/test/host')}
            disabled={loadingTest}
            style={{
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #444',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Test Host Route
          </button>

          <button
            onClick={() => runRbacTest(testAdminAccess, 'GET /api/test/admin')}
            disabled={loadingTest}
            style={{
              background: 'var(--netflix-red)',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Test Admin Route
          </button>
        </div>

        {/* Live Test Response Box */}
        {testResult && (
          <div style={{
            background: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${testResult.success ? '#22c55e' : '#ef4444'}`,
            borderRadius: '4px',
            padding: '1rem',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: testResult.success ? '#22c55e' : '#ef4444', marginBottom: '4px' }}>
              {testResult.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              <span>{testResult.endpoint} &bull; {testResult.message}</span>
            </div>
            {testResult.data && (
              <pre style={{ color: '#ccc', fontSize: '0.8rem', marginTop: '6px', overflowX: 'auto' }}>
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Admin Feature Cards (Placeholders for Part 4) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: '#181818', border: '1px solid #333', borderRadius: '6px', padding: '1.5rem' }}>
          <FileUp size={24} color="#3b82f6" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>Timeline JSON Ingestion</h3>
          <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: '1.4' }}>
            Upload timestamped dialogue scripts, scene chunks, and trivia milestones for titles.
          </p>
          <span style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>
            SCHEDULED: PART 4
          </span>
        </div>

        <div style={{ background: '#181818', border: '1px solid #333', borderRadius: '6px', padding: '1.5rem' }}>
          <Database size={24} color="#a855f7" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>Schema Validator</h3>
          <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: '1.4' }}>
            Automated boundary checks to guarantee scene chunks do not leak spoilers ahead of time.
          </p>
          <span style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>
            SCHEDULED: PART 4
          </span>
        </div>
      </div>
    </div>
  );
};

export default Admin;
