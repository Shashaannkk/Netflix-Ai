import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export const Layout = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isCinemaPage = location.pathname.startsWith('/space');
  const isCreateSpacePage = location.pathname === '/create-space';

  if (isCinemaPage) {
    return <Outlet />;
  }

  if (isAuthPage || isCreateSpacePage) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--netflix-black)', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1, width: '100%', overflow: isCreateSpacePage ? 'hidden' : 'visible' }}>
          <Outlet />
        </main>
        {!isCreateSpacePage && <Footer />}
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
