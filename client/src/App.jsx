import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WatchSpaceProvider } from './context/WatchSpaceContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import CinebyHome from './pages/CinebyHome';
import Login from './pages/Login';
import Register from './pages/Register';
import WatchSpace from './pages/WatchSpace';
import CreateWatchSpace from './pages/CreateWatchSpace';
import JoinWatchSpace from './pages/JoinWatchSpace';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          {/* WatchSpaceProvider needs BrowserRouter (uses useNavigate) */}
          <WatchSpaceProvider>
            <Routes>
              {/* Netflix AI Main Streaming & Nav Category Routes */}
              <Route path="/" element={<CinebyHome activeCategory="browse" />} />
              <Route path="browse" element={<CinebyHome activeCategory="browse" />} />
              <Route path="home" element={<CinebyHome activeCategory="browse" />} />
              <Route path="movies" element={<CinebyHome activeCategory="movies" />} />
              <Route path="tv-shows" element={<CinebyHome activeCategory="series" />} />
              <Route path="top-imdb" element={<CinebyHome activeCategory="top-imdb" />} />

              {/* Shared Layout Routes */}
              <Route element={<Layout />}>
                <Route path="login"     element={<Login />} />
                <Route path="register"  element={<Register />} />

                {/* ── Dashboard compatibility route (redirect to Home) ── */}
                <Route
                  path="dashboard"
                  element={<Navigate to="/#watch-activity" replace />}
                />

                {/* ── Join Watch Space (public page, auth checked inside) ── */}
                <Route path="join" element={<JoinWatchSpace />} />

                {/* ── Create Watch Space (protected) ── */}
                <Route
                  path="create-space"
                  element={
                    <ProtectedRoute>
                      <CreateWatchSpace />
                    </ProtectedRoute>
                  }
                />

                {/* ── Watch Room (protected, requires roomId) ── */}
                <Route
                  path="space/:roomId"
                  element={
                    <ProtectedRoute>
                      <WatchSpace />
                    </ProtectedRoute>
                  }
                />

                {/* Legacy /space route → redirect to create */}
                <Route
                  path="space"
                  element={
                    <ProtectedRoute>
                      <CreateWatchSpace />
                    </ProtectedRoute>
                  }
                />

                {/* Protected: Admin only */}
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
          </WatchSpaceProvider>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

