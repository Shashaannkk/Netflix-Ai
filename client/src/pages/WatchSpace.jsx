import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Sparkles,
  MessageSquare,
  Users,
  Copy,
  Check,
  Send,
  HelpCircle
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export const WatchSpace = () => {
  const { roomId } = useParams();
  const roomCode = roomId || 'NX-8821';

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'chat' | 'users'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');

  const videoRef = useRef(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="cinema-view">
      {/* 1. CINEMA VIDEO STAGE */}
      <div className="cinema-video-area">
        {/* Top Header Overlay */}
        <div className="cinema-top-bar">
          <Link to="/" className="cinema-back-btn">
            <ArrowLeft size={24} />
            <span>Tears of Steel</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="cinema-room-badge">
              SPACE: #{roomCode}
            </div>

            <button
              className="circle-icon-btn"
              onClick={copyRoomLink}
              title="Copy Room Link"
            >
              {copied ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Video Canvas */}
        <video
          ref={videoRef}
          className="cinema-video-canvas"
          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
          poster="https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop"
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Netflix Video Controls Bar */}
        <div className="cinema-controls-bar">
          {/* Scrubber Track */}
          <div className="netflix-scrubber-track">
            <div className="netflix-scrubber-progress">
              <div className="netflix-scrubber-thumb" />
            </div>
          </div>

          <div className="cinema-control-buttons">
            <div className="controls-left">
              <button className="player-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" />}
              </button>

              <button className="player-btn" title="Back 10 seconds">
                <RotateCcw size={22} />
              </button>

              <button className="player-btn" title="Forward 10 seconds">
                <RotateCw size={22} />
              </button>

              <button
                className="player-btn"
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>

              <span style={{ fontSize: '0.9rem', color: '#b3b3b3', fontWeight: 500 }}>
                03:48 / 12:14
              </span>
            </div>

            <div className="controls-right">
              {/* Toggle Sidebar Dock */}
              <button
                className="circle-icon-btn"
                style={{
                  backgroundColor: isSidebarOpen ? 'var(--netflix-red)' : 'rgba(42, 42, 42, 0.6)',
                  borderColor: isSidebarOpen ? 'var(--netflix-red)' : 'rgba(255, 255, 255, 0.5)'
                }}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                title="Toggle AI Co-Pilot & Social Dock"
              >
                <Sparkles size={16} />
              </button>

              <button className="player-btn" title="Full Screen">
                <Maximize size={22} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CINEMA SIDEBAR (AI Co-Pilot, Live Chat, Participants) */}
      {isSidebarOpen && (
        <aside className="cinema-sidebar">
          {/* Navigation Tabs */}
          <div className="cinema-sidebar-tabs">
            <button
              className={`sidebar-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <Sparkles size={16} />
              <span>AI Co-Pilot</span>
            </button>

            <button
              className={`sidebar-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={16} />
              <span>Room Chat</span>
            </button>

            <button
              className={`sidebar-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={16} />
              <span>Viewers (3)</span>
            </button>
          </div>

          {/* Sidebar Tab Contents */}
          <div className="cinema-sidebar-body">
            {activeTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{
                  padding: '0.6rem 0.8rem',
                  background: 'rgba(229, 9, 20, 0.1)',
                  border: '1px solid rgba(229, 9, 20, 0.3)',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '0.8rem'
                }}>
                  <strong style={{ color: 'var(--netflix-red)', display: 'block', marginBottom: '2px' }}>
                    Timeline Grounded &bull; Anti-Spoiler Active
                  </strong>
                  <span style={{ color: '#aaa' }}>Current Scene: Old Amsterdam Bridge (03:12 - 04:45)</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{
                    background: '#1f1f1f',
                    padding: '0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    lineHeight: '1.4'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--netflix-red)', fontWeight: 700, marginBottom: '4px' }}>
                      <Sparkles size={14} />
                      <span>Netflix Co-Pilot</span>
                    </div>
                    Hello! I'm watching along with your space. Ask me anything about the characters, location, or lore at the current second without fear of spoilers.
                  </div>

                  <div style={{ marginTop: 'auto', marginBottom: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#777', marginBottom: '0.4rem' }}>SUGGESTED QUESTIONS</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <button
                        onClick={() => setAiQuestion('Who is Thom and why is he on the crane?')}
                        style={{
                          background: '#242424',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#e5e5e5',
                          padding: '0.45rem 0.7rem',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        "Who is Thom and why is he on the crane?"
                      </button>
                      <button
                        onClick={() => setAiQuestion('What caused the mechanical uprising in this scene?')}
                        style={{
                          background: '#242424',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#e5e5e5',
                          padding: '0.45rem 0.7rem',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        "What caused the mechanical uprising in this scene?"
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Input */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Ask about this scene..."
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    style={{
                      flex: 1,
                      height: '38px',
                      background: '#222',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      padding: '0 0.8rem',
                      color: '#fff',
                      fontSize: '0.85rem'
                    }}
                  />
                  <button className="circle-icon-btn space-btn" style={{ width: '38px', height: '38px' }}>
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  <div style={{ fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--netflix-red)' }}>Alex (Host): </span>
                    <span style={{ color: '#e5e5e5' }}>Welcome to the space! Let me know when everyone is ready.</span>
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>Priya: </span>
                    <span style={{ color: '#e5e5e5' }}>The 4K stream looks amazing 🔥</span>
                  </div>
                </div>

                {/* Quick Emoji Burst Dock */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  {['🔥', '🍿', '😱', '🤯', '❤️', '👏'].map((emoji) => (
                    <button
                      key={emoji}
                      style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
                      title={`Send ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Send a message to the room..."
                    style={{
                      flex: 1,
                      height: '38px',
                      background: '#222',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      padding: '0 0.8rem',
                      color: '#fff',
                      fontSize: '0.85rem'
                    }}
                  />
                  <button className="circle-icon-btn primary" style={{ width: '38px', height: '38px' }}>
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: '#1c1c1c', borderRadius: '4px' }}>
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
                    alt="Host"
                    style={{ width: '32px', height: '32px', borderRadius: '4px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Alex (You)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--netflix-red)' }}>Room Host</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    P
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Priya</div>
                    <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>In Sync</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    R
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Rahul</div>
                    <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>In Sync</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};

export default WatchSpace;
