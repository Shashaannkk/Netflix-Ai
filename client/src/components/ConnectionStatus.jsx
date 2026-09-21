import React, { useState, useEffect } from 'react';
import { checkApiHealth } from '../services/api';
import socket from '../services/socket';

export const ConnectionStatus = () => {
  const [apiOnline, setApiOnline] = useState(null); // null = checking, true = ok, false = fail
  const [socketConnected, setSocketConnected] = useState(socket.connected);

  useEffect(() => {
    // 1. Check REST API
    const verifyApi = async () => {
      try {
        await checkApiHealth();
        setApiOnline(true);
      } catch (err) {
        setApiOnline(false);
      }
    };

    verifyApi();
    const apiInterval = setInterval(verifyApi, 15000);

    // 2. Listen to Socket.IO events
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      clearInterval(apiInterval);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div className="status-bar" title="Real-time connectivity diagnostics">
      {/* REST API Status */}
      <div className="status-pill">
        <span className={`dot ${apiOnline === true ? 'green' : apiOnline === false ? 'red' : 'yellow'}`} />
        <span>REST API: {apiOnline === true ? 'Online' : apiOnline === false ? 'Offline' : 'Checking...'}</span>
      </div>

      <span style={{ color: 'var(--border-subtle)' }}>|</span>

      {/* Socket.IO Status */}
      <div className="status-pill">
        <span className={`dot ${socketConnected ? 'green' : 'red'}`} />
        <span>Socket.IO: {socketConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </div>
  );
};

export default ConnectionStatus;
