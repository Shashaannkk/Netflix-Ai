import React, { useState } from 'react';
import { Play, Info, Users, Plus, ThumbsUp, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const [isMuted, setIsMuted] = useState(true);

  // Curated cinematic movie catalog
  const trendingMovies = [
    {
      id: 'm1',
      title: 'Tears of Steel',
      image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
      match: '99% Match',
      age: '16+',
      duration: '1h 52m',
      tags: ['Sci-Fi', 'VFX Spectacle', 'AI Rebellion']
    },
    {
      id: 'm2',
      title: 'Neon Odyssey',
      image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
      match: '97% Match',
      age: '18+',
      duration: '2h 10m',
      tags: ['Cyberpunk', 'Gritty', 'Noir']
    },
    {
      id: 'm3',
      title: 'Cosmic Drift',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop',
      match: '95% Match',
      age: '13+',
      duration: '2h 24m',
      tags: ['Mind-Bending', 'Deep Space', 'Cerebral']
    },
    {
      id: 'm4',
      title: 'Shadow Protocol',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
      match: '94% Match',
      age: '16+',
      duration: '1h 45m',
      tags: ['Espionage', 'Thriller', 'Adrenaline']
    },
    {
      id: 'm5',
      title: 'The Silent Horizon',
      image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800&auto=format&fit=crop',
      match: '92% Match',
      age: 'All',
      duration: '1h 38m',
      tags: ['Visual Masterpiece', 'Atmospheric']
    },
    {
      id: 'm6',
      title: 'Quantum Paradox',
      image: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?q=80&w=800&auto=format&fit=crop',
      match: '98% Match',
      age: '16+',
      duration: '2h 05m',
      tags: ['Time Travel', 'Action', 'Dark']
    }
  ];

  const aiWatchPartyPicks = [
    {
      id: 'm7',
      title: 'Apex Synthetic',
      image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=800&auto=format&fit=crop',
      match: '99% Match',
      age: '18+',
      duration: '2h 15m',
      tags: ['AI Co-Pilot', 'Interactive Trivia', 'Thriller']
    },
    {
      id: 'm8',
      title: 'Hyperdrive Zero',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
      match: '96% Match',
      age: '16+',
      duration: '1h 58m',
      tags: ['Space Opera', 'Social Streaming']
    },
    {
      id: 'm9',
      title: 'Midnight Reckoning',
      image: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=800&auto=format&fit=crop',
      match: '93% Match',
      age: '18+',
      duration: '2h 02m',
      tags: ['Heist', 'Plot Twists', 'Action']
    },
    {
      id: 'm10',
      title: 'Solaris Echo',
      image: 'https://images.unsplash.com/photo-1447433819943-74a20887a81e?q=80&w=800&auto=format&fit=crop',
      match: '91% Match',
      age: '13+',
      duration: '1h 44m',
      tags: ['Mystery', 'Timeline Trivia']
    },
    {
      id: 'm11',
      title: 'Bio-Matrix',
      image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop',
      match: '95% Match',
      age: '16+',
      duration: '2h 18m',
      tags: ['Cybernetics', 'Sci-Fi Action']
    },
    {
      id: 'm12',
      title: 'Chronos Enigma',
      image: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=800&auto=format&fit=crop',
      match: '98% Match',
      age: '16+',
      duration: '2h 30m',
      tags: ['Multi-Branching', 'AI Grounded']
    }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--netflix-black)' }}>
      {/* 1. CINEMATIC HERO BILLBOARD */}
      <div
        className="hero-billboard"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop')`
        }}
      >
        <div className="billboard-vignette" />
        <div className="billboard-bottom-fade" />

        <div className="billboard-content">
          <div className="billboard-badge">
            <span className="netflix-n-badge">N</span>
            <span>FILM</span>
          </div>

          <h1 className="billboard-title">CYBER NEXUS</h1>

          <div className="top-10-row">
            <span className="top-10-badge">TOP 10</span>
            <span>#1 in Movies Today</span>
          </div>

          <p className="billboard-synopsis">
            In a neon-drenched dystopia controlled by rogue synthetic minds, a covert operative uncovers a conspiracy that challenges what it means to be human. Every choice alters the pulse of the city.
          </p>

          <div className="billboard-actions">
            <Link to="/space" className="btn-netflix-play">
              <Play size={22} fill="currentColor" />
              <span>Play</span>
            </Link>

            <Link to="/space" className="btn-netflix-space">
              <Users size={20} />
              <span>Watch Together (AI Space)</span>
            </Link>

            <button className="btn-netflix-info">
              <Info size={22} />
              <span>More Info</span>
            </button>
          </div>
        </div>

        {/* Right side rating badge & mute button */}
        <div className="billboard-meta-right">
          <button
            className="circle-icon-btn"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="billboard-rating-badge">U/A 16+</div>
        </div>
      </div>

      {/* 2. NETFLIX CONTENT ROWS */}
      <div className="netflix-content-container">
        {/* Row 1: Trending Now */}
        <div className="netflix-row">
          <div className="row-header">
            <h2 className="row-title">Trending Now</h2>
            <span className="row-explore">Explore All &gt;</span>
          </div>

          <div className="row-slider">
            {trendingMovies.map((movie) => (
              <div key={movie.id} className="movie-card">
                <div className="movie-poster-wrapper">
                  <img src={movie.image} alt={movie.title} className="movie-poster-img" />
                </div>

                {/* Hover Details Card */}
                <div className="card-hover-details">
                  <div className="hover-action-icons">
                    <div className="hover-btn-group">
                      <Link to="/space" className="circle-icon-btn primary" title="Play">
                        <Play size={16} fill="currentColor" />
                      </Link>
                      <Link to="/space" className="circle-icon-btn space-btn" title="Create Watch Space">
                        <Users size={15} />
                      </Link>
                      <button className="circle-icon-btn" title="Add to My List">
                        <Plus size={16} />
                      </button>
                      <button className="circle-icon-btn" title="I like this">
                        <ThumbsUp size={14} />
                      </button>
                    </div>

                    <Link to="/space" className="circle-icon-btn" title="More Info">
                      <ChevronRight size={18} />
                    </Link>
                  </div>

                  <div className="hover-meta-info">
                    <span className="match-score">{movie.match}</span>
                    <span className="age-badge">{movie.age}</span>
                    <span>{movie.duration}</span>
                    <span className="quality-badge">HD</span>
                  </div>

                  <div className="hover-tags">
                    {movie.tags.map((t, idx) => (
                      <span key={idx}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: AI Co-Pilot Enhanced Watch Spaces */}
        <div className="netflix-row">
          <div className="row-header">
            <h2 className="row-title">
              AI Co-Pilot Enhanced Watch Spaces
            </h2>
            <span className="row-explore">Explore All &gt;</span>
          </div>

          <div className="row-slider">
            {aiWatchPartyPicks.map((movie) => (
              <div key={movie.id} className="movie-card">
                <div className="movie-poster-wrapper">
                  <img src={movie.image} alt={movie.title} className="movie-poster-img" />
                </div>

                <div className="card-hover-details">
                  <div className="hover-action-icons">
                    <div className="hover-btn-group">
                      <Link to="/space" className="circle-icon-btn primary" title="Play">
                        <Play size={16} fill="currentColor" />
                      </Link>
                      <Link to="/space" className="circle-icon-btn space-btn" title="Start AI Watch Space">
                        <Users size={15} />
                      </Link>
                      <button className="circle-icon-btn" title="Add to My List">
                        <Plus size={16} />
                      </button>
                    </div>

                    <Link to="/space" className="circle-icon-btn" title="More Info">
                      <ChevronRight size={18} />
                    </Link>
                  </div>

                  <div className="hover-meta-info">
                    <span className="match-score">{movie.match}</span>
                    <span className="age-badge">{movie.age}</span>
                    <span>{movie.duration}</span>
                    <span className="quality-badge">4K</span>
                  </div>

                  <div className="hover-tags">
                    {movie.tags.map((t, idx) => (
                      <span key={idx}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Top 10 Movies Today with Giant Ranking Numbers */}
        <div className="netflix-row">
          <div className="row-header">
            <h2 className="row-title">Top 10 Movies in India Today</h2>
          </div>

          <div className="row-slider">
            {trendingMovies.slice(0, 6).map((movie, index) => (
              <div key={movie.id} className="movie-card top10-card">
                <svg className="rank-number-svg" viewBox="0 0 100 150">
                  <text x="10" y="130">{index + 1}</text>
                </svg>
                <div className="movie-poster-wrapper" style={{ width: '170px' }}>
                  <img src={movie.image} alt={movie.title} className="movie-poster-img" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
