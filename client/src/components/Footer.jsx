import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="netflix-footer">
      <p className="footer-contact">
        Questions? Call <a href="tel:0008009191694">000-800-919-1694</a>
      </p>

      <div className="footer-links-grid">
        <a href="#faq" className="footer-link">FAQ</a>
        <a href="#help" className="footer-link">Help Centre</a>
        <a href="#account" className="footer-link">Account</a>
        <a href="#media" className="footer-link">Media Centre</a>
        <a href="#investor" className="footer-link">Investor Relations</a>
        <a href="#jobs" className="footer-link">Jobs</a>
        <a href="#ways" className="footer-link">Ways to Watch</a>
        <a href="#terms" className="footer-link">Terms of Use</a>
        <a href="#privacy" className="footer-link">Privacy</a>
        <a href="#cookies" className="footer-link">Cookie Preferences</a>
        <a href="#corporate" className="footer-link">Corporate Information</a>
        <a href="#contact" className="footer-link">Contact Us</a>
        <a href="#speedtest" className="footer-link">Speed Test</a>
        <a href="#legal" className="footer-link">Legal Notices</a>
        <a href="#onlyon" className="footer-link">Only on Netflix</a>
        <Link to="/space" className="footer-link">Watch Spaces</Link>
      </div>

      <button className="footer-service-btn">
        Service Code
      </button>

      <p className="footer-country">
        Netflix India
      </p>
    </footer>
  );
};

export default Footer;
