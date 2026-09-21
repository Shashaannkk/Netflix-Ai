import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import WatchSpace from './pages/WatchSpace';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Public browsing routes */}
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />

            {/* Protected: Any authenticated user (viewer, host, admin) */}
            <Route
              path="space"
              element={
                <ProtectedRoute>
                  <WatchSpace />
                </ProtectedRoute>
              }
            />
            <Route
              path="space/:roomId"
              element={
                <ProtectedRoute>
                  <WatchSpace />
                </ProtectedRoute>
              }
            />

            {/* Protected: RBAC Admin only */}
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Admin />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
