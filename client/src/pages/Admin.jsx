import React from 'react';
import { Shield, FileUp, CheckCircle, Database } from 'lucide-react';

export const Admin = () => {
  return (
    <div className="placeholder-container">
      <Shield className="placeholder-icon" />
      <h1 className="placeholder-title">Admin Metadata & Timeline CMS</h1>
      <p className="placeholder-subtitle">
        Administrative tool for uploading and validating movie timeline JSON (scenes, transcripts, trivia milestones, and character dossiers).
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', width: '100%', maxWidth: '700px', marginBottom: '1.5rem', textAlign: 'left' }}>
        <div className="card">
          <FileUp size={20} color="var(--accent-green)" style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Timeline JSON Ingestion</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload timestamped scene chunks and trivia cues.</p>
        </div>

        <div className="card">
          <Database size={20} color="var(--accent-blue)" style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Schema Validation</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Automated checks preventing timeline overlaps & invalid bounds.</p>
        </div>
      </div>

      <span className="placeholder-tag">Part 4: Admin Ingestion & Grounding CMS</span>
    </div>
  );
};

export default Admin;
