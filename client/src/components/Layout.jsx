import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export const Layout = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isCinemaPage = location.pathname.startsWith('/space');

  if (isCinemaPage) {
    return <Outlet />;
  }

  if (isAuthPage) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000' }}>
        <Outlet />
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--netflix-black)' }}>
      <Navbar />
      <main style={{ flex: 1, width: '100%' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
