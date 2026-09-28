import React from 'react';
import { Link } from 'react-router-dom';
import CinebyLogo from './CinebyLogo';

export const Footer = () => {
  return (
    <footer className="site-footer" style={{ background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '3.5rem 4% 2rem', color: '#9CA3AF' }}>
      <div className="footer-inner" style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        <div className="footer-top" style={{ display: 'grid', gridTemplateColumns: '1.5fr 3fr', gap: '3rem' }}>
          <div className="footer-brand" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/" className="logo">
              <CinebyLogo height={32} />
            </Link>
            <p className="footer-tagline" style={{ fontSize: '0.9rem', color: '#6B7280', maxWidth: '320px', lineHeight: 1.5 }}>
              Free streaming. No registration. No ads. Synchronized AI Watch Spaces to enjoy movies together.
            </p>
          </div>

          <nav className="footer-nav" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            <div className="footer-col">
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>Browse</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <li><Link to="/" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Home</Link></li>
                <li><Link to="/movies" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Movies</Link></li>
                <li><Link to="/tv-shows" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Series</Link></li>
                <li><Link to="/top-imdb" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Top IMDb</Link></li>
                <li><Link to="/create-space" style={{ color: '#E50914', textDecoration: 'none', fontWeight: 600 }}>Watch Spaces (AI)</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>Support</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <li><a href="#help" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Help Center</a></li>
                <li><a href="#contact" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Contact Us</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>Legal</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <li><a href="#privacy" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Privacy Policy</a></li>
                <li><a href="#terms" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Terms of Use</a></li>
                <li><a href="#dmca" style={{ color: '#9CA3AF', textDecoration: 'none' }}>DMCA</a></li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="footer-bottom" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: '#4B5563' }}>
          <p className="footer-copyright">&copy; {new Date().getFullYear()} Netflix AI Watch Spaces. All rights reserved.</p>
          <p className="footer-disclaimer">Netflix AI does not host video files on its servers. All trailers and streams are sourced from third-party services and TMDB API.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

