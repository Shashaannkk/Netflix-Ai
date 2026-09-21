import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotFound = () => {
  return (
    <div className="placeholder-container">
      <AlertCircle className="placeholder-icon" />
      <h1 className="placeholder-title">404 - Lost Your Way?</h1>
      <p className="placeholder-subtitle">
        Sorry, we can't find that page. You'll find lots to explore on the home dashboard.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
