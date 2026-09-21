import React from 'react';
import { Users, Sparkles, MessageSquare, Play } from 'lucide-react';
import { useParams } from 'react-router-dom';

export const WatchSpace = () => {
  const { roomId } = useParams();

  return (
    <div className="placeholder-container">
      <Users className="placeholder-icon" />
      <h1 className="placeholder-title">
        Watch Space {roomId ? `(#${roomId})` : '(Room Preview)'}
      </h1>
      <p className="placeholder-subtitle">
        Real-time synchronized video playback room. Integrates authoritative host controls, live chat, floating reaction bursts, and the timeline-aware AI Co-Pilot.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', width: '100%', maxWidth: '750px', marginBottom: '1.5rem', textAlign: 'left' }}>
        <div className="card">
          <Play size={20} color="var(--netflix-red)" style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Authoritative Sync</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Host-clock broadcasting and automatic guest drift correction.</p>
        </div>

        <div className="card">
          <MessageSquare size={20} color="var(--accent-blue)" style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Social Chat & Emojis</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Live chat feed, participant roster, and animated reaction bursts.</p>
        </div>

        <div className="card">
          <Sparkles size={20} color="var(--accent-purple)" style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>AI Co-Pilot & Trivia</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Spoiler-free scene Q&A grounded in timeline metadata.</p>
        </div>
      </div>

      <span className="placeholder-tag">Part 3: Synchronized Playback & AI Spaces Engine</span>
    </div>
  );
};

export default WatchSpace;
