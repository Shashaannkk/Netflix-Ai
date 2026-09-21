import React from 'react';
import { UserPlus } from 'lucide-react';

export const Register = () => {
  return (
    <div className="placeholder-container">
      <UserPlus className="placeholder-icon" />
      <h1 className="placeholder-title">Sign Up</h1>
      <p className="placeholder-subtitle">
        Account creation placeholder. Users will register profiles with avatar choices and viewing preferences.
      </p>
      <span className="placeholder-tag">Part 2: Authentication Module</span>
    </div>
  );
};

export default Register;
