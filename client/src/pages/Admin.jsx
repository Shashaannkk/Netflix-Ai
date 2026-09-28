import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileUp,
  CheckCircle,
  Database,
  Lock,
  AlertTriangle,
  Code,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader,
  RefreshCw,
  FileCode,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  testViewerAccess,
  testHostAccess,
  testAdminAccess,
  validateTimelineApi,
  updateTimelineApi,
  apiClient,
} from '../services/api';

// Sample Valid Timeline Metadata for Demo / Testing
const SAMPLE_TIMELINE_METADATA = [
  {
    timestampStart: 0,
    eventType: 'scene',
    payload: {
      sceneName: "Opening Laboratory Sequence",
      description: "Scientists work against time in Amsterdam underground lab.",
    },
  },
  {
    timestampStart: 15,
    eventType: 'trivia',
    payload: {
      question: "What rendering engine was used for Tears of Steel?",
      answer: "Blender Cycles open-source path tracer.",
    },
  },
  {
    timestampStart: 30,
    eventType: 'variation',
    payload: {
      promptText: "Bunny faces a tactical roadblock. Which path should the team pursue?",
      optionA: { id: "opt_crossroads_a", text: "Take the high-tech highway escape" },
      optionB: { id: "opt_crossroads_b", text: "Duck into the neon alley shortcut" },
      canonicalChoice: "opt_crossroads_b",
    },
  },
  {
    timestampStart: 60,
    eventType: 'character',
    payload: {
      characterName: "Celia",
      role: "Lead Scientist",
      firstAppearedSec: 10,
    },
  },
  {
    timestampStart: 90,
    eventType: 'glossary',
    payload: {
      term: "Open Movie",
      definition: "A film project where all production assets are released under Creative Commons.",
    },
  },
];

export const Admin = () => {
  const { user } = useAuth();

  // RBAC testing state
  const [testResult, setTestResult] = useState(null);
  const [loadingTest, setLoadingTest] = useState(false);

  // Admin Timeline Management state
  const [titles, setTitles] = useState([]);
  const [selectedTitleId, setSelectedTitleId] = useState('');
  const [jsonContent, setJsonContent] = useState(JSON.stringify(SAMPLE_TIMELINE_METADATA, null, 2));
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  // Fetch title list on mount
  useEffect(() => {
    const fetchTitles = async () => {
      try {
        const res = await apiClient.get('/titles');
        const fetchedTitles = res.data?.titles || [];
        setTitles(fetchedTitles);
        if (fetchedTitles.length > 0) {
          setSelectedTitleId(fetchedTitles[0]._id);
        }
      } catch (err) {
        console.error('[Admin] Failed to fetch titles:', err.message);
      }
    };
    fetchTitles();
  }, []);

  const runRbacTest = async (testFn, label) => {
    setLoadingTest(true);
    setTestResult(null);
    try {
      const res = await testFn();
      setTestResult({
        success: true,
        endpoint: label,
        message: res.message,
        data: res.data,
      });
    } catch (err) {
      setTestResult({
        success: false,
        endpoint: label,
        message: err.message,
      });
    } finally {
      setLoadingTest(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const parsed = JSON.parse(text);
        setJsonContent(JSON.stringify(parsed, null, 2));
        setValidationResult(null);
        setSaveResult(null);
      } catch (err) {
        alert('Invalid JSON file format: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);
    setSaveResult(null);

    try {
      const parsedTimeline = JSON.parse(jsonContent);
      if (!selectedTitleId) {
        alert('Please select a target title first.');
        return;
      }

      const res = await validateTimelineApi(selectedTitleId, parsedTimeline);
      setValidationResult(res.data);
    } catch (err) {
      setValidationResult({
        isValid: false,
        eventCount: 0,
        errors: [`JSON Parsing Error: ${err.message}`],
        warnings: [],
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveTimeline = async () => {
    if (!selectedTitleId) {
      alert('Please select a target title first.');
      return;
    }

    setIsSaving(true);
    setSaveResult(null);

    try {
      const parsedTimeline = JSON.parse(jsonContent);
      const res = await updateTimelineApi(selectedTitleId, parsedTimeline);
      setSaveResult({
        success: true,
        message: res.message || 'Timeline metadata saved successfully!',
        data: res.data,
      });
    } catch (err) {
      setSaveResult({
        success: false,
        message: err.message || 'Failed to save timeline metadata.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '80px auto 40px', padding: '0 20px', color: '#fff' }}>
      {/* ── 1. HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--netflix-red)', padding: '0.6rem', borderRadius: '8px' }}>
            <Shield size={28} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Studio Metadata & Timeline Ingestion CMS</h1>
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
          letterSpacing: '1px',
        }}>
          ROLE: ADMIN AUTHORIZED
        </span>
      </div>

      {/* ── 2. PART 9: ADMIN TIMELINE UPLOAD & VALIDATION ENGINE ── */}
      <div style={{ background: '#141414', border: '1px solid #333', borderRadius: '8px', padding: '1.75rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <FileCode size={22} color="var(--netflix-red)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Timeline Metadata Ingestion & Schema Validator</h2>
        </div>
        <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
          Upload or edit JSON timeline metadata. All payloads are validated against timestamp monotonicity, supported eventType enums (<code style={{ color: '#3b82f6' }}>scene, character, trivia, glossary, variation</code>), and schema attributes before persistence.
        </p>

        {/* Title Selector & File Upload Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', fontWeight: 700, marginBottom: '0.4rem' }}>
              Select Target Title
            </label>
            <select
              value={selectedTitleId}
              onChange={(e) => setSelectedTitleId(e.target.value)}
              style={{
                width: '100%',
                background: '#1f1f1f',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: '6px',
                padding: '0.6rem 0.8rem',
                fontSize: '0.85rem',
              }}
            >
              {titles.length === 0 ? (
                <option value="">No published titles found</option>
              ) : (
                titles.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.title} ({t.durationSeconds ? `${Math.floor(t.durationSeconds / 60)}m` : '0m'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', fontWeight: 700, marginBottom: '0.4rem' }}>
              Upload Timeline JSON File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{
                width: '100%',
                background: '#1f1f1f',
                color: '#aaa',
                border: '1px dashed #444',
                borderRadius: '6px',
                padding: '0.45rem 0.8rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>

        {/* JSON Editor Box */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 700 }}>
              Timeline JSON Payload
            </label>
            <button
              onClick={() => setJsonContent(JSON.stringify(SAMPLE_TIMELINE_METADATA, null, 2))}
              style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Load Sample Test Template
            </button>
          </div>

          <textarea
            value={jsonContent}
            onChange={(e) => setJsonContent(e.target.value)}
            rows={12}
            style={{
              width: '100%',
              background: '#0d0d0d',
              color: '#34d399',
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: '0.85rem',
              border: '1px solid #333',
              borderRadius: '6px',
              padding: '0.85rem',
              lineHeight: '1.4',
            }}
          />
        </div>

        {/* Validation & Save Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <button
            onClick={handleValidate}
            disabled={isValidating}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {isValidating ? <Loader size={16} className="spin-icon" /> : <CheckCircle2 size={16} />}
            Validate Schema & Sequence
          </button>

          <button
            onClick={handleSaveTimeline}
            disabled={isSaving}
            style={{
              background: 'var(--netflix-red)',
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {isSaving ? <Loader size={16} className="spin-icon" /> : <Database size={16} />}
            Save & Ingest Timeline (RBAC Protected)
          </button>
        </div>

        {/* Live Validation Alert Result */}
        {validationResult && (
          <div
            style={{
              background: validationResult.isValid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${validationResult.isValid ? '#22c55e' : '#ef4444'}`,
              borderRadius: '6px',
              padding: '1rem',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: validationResult.isValid ? '#22c55e' : '#ef4444', marginBottom: '0.5rem' }}>
              {validationResult.isValid ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{validationResult.isValid ? 'SCHEMA VALIDATION PASSED' : 'SCHEMA VALIDATION ERRORS DETECTED'} ({validationResult.eventCount} Events)</span>
            </div>

            {validationResult.errors && validationResult.errors.length > 0 && (
              <ul style={{ color: '#ef4444', marginLeft: '1.25rem', fontSize: '0.8rem', lineHeight: '1.5' }}>
                {validationResult.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            )}

            {validationResult.warnings && validationResult.warnings.length > 0 && (
              <ul style={{ color: '#f59e0b', marginLeft: '1.25rem', fontSize: '0.8rem', lineHeight: '1.5', marginTop: '0.4rem' }}>
                {validationResult.warnings.map((warn, idx) => (
                  <li key={idx}>Warning: {warn}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Save Result Alert */}
        {saveResult && (
          <div
            style={{
              background: saveResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${saveResult.success ? '#22c55e' : '#ef4444'}`,
              borderRadius: '6px',
              padding: '1rem',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: saveResult.success ? '#22c55e' : '#ef4444' }}>
              {saveResult.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{saveResult.message}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. RBAC VERIFICATION PLAYGROUND ── */}
      <div style={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: '6px', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Lock size={18} color="var(--netflix-red)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Live RBAC Middleware Verification</h2>
        </div>
        <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Trigger protected backend routes with your current JWT access token to verify permission enforcement.
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
              fontWeight: 600,
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
              fontWeight: 600,
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
              fontWeight: 600,
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
            fontSize: '0.85rem',
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
    </div>
  );
};

export default Admin;
