import React from 'react';
import { LogIn } from 'lucide-react';

export const Login = () => {
  return (
    <div className="placeholder-container">
      <LogIn className="placeholder-icon" />
      <h1 className="placeholder-title">Sign In</h1>
      <p className="placeholder-subtitle">
        Authentication screen placeholder. In Part 2, users will sign in with JWT credential verification.
      </p>
      <span className="placeholder-tag">Part 2: Authentication Module</span>
    </div>
  );
};

export default Login;
