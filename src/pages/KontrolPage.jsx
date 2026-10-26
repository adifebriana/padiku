import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import AppShell from '../components/AppShell.jsx';

const controlRows = [
  { action: 'machine_power', label: 'Power Mesin' },
  { action: 'battery', label: 'Battery' },
];

export default function KontrolPage({ navigate }) {
  const [session, setSession] = useState(null);
  const [controlRequests, setControlRequests] = useState([]);
  const [busyAction, setBusyAction] = useState('');

  useEffect(() => {
    let pageIsOpen = true;

    async function loadControlData() {
      try {
        const sessionResult = await apiRequest('/api/session');
        if (pageIsOpen) setSession(sessionResult);

        if (sessionResult.authenticated) {
          const requestResult = await apiRequest('/api/control-requests');
          if (pageIsOpen) {
            setControlRequests(requestResult.requests);
          }
        } else if (pageIsOpen) {
          setControlRequests([]);
        }
      } catch {
      }
    }

    loadControlData();
    const timer = window.setInterval(loadControlData, 5_000);
    return () => {
      pageIsOpen = false;
      window.clearInterval(timer);
    };
  }, []);

  function latestFor(action) {
    return controlRequests.find((request) => request.action === action);
  }

  async function sendRequest(action, requestedValue) {
    if (!session?.authenticated) {
      navigate('/login');
      return;
    }

    setBusyAction(action);

    try {
      const result = await apiRequest('/api/control-requests', {
        method: 'POST',
        body: JSON.stringify({ action, requestedValue }),
      });
      setControlRequests((current) => [
        result.request,
        ...current.filter((item) => item.id !== result.request.id),
      ]);
    } catch (error) {
      if (error.status === 401) navigate('/login');
    } finally {
      setBusyAction('');
    }
  }

  return (
    <AppShell title="Kontrol" active="kontrol">
      <section className="emergency-section">
        <button
          className="emergency-button"
          type="button"
          aria-label="Simpan permintaan emergency stop"
          disabled={busyAction === 'emergency_stop'}
          onClick={() => sendRequest('emergency_stop', true)}
        >
          <img src="/assets/bx_power-off.png" alt="" />
        </button>
        <span className="emergency-label">Emergency Button</span>
      </section>

      <div className="controls-list">
        {controlRows.map((row) => {
          const latest = latestFor(row.action);
          const isOn = ['queued', 'published', 'acknowledged'].includes(latest?.status)
            && latest.requestedValue === true;

          return (
            <section className="control-row" key={row.action}>
              <span className="control-label">{row.label}</span>
              <div className="control-action">
                <button
                  className={`switch${isOn ? ' is-on' : ''}`}
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  aria-label={`${row.label}, permintaan ${isOn ? 'nyala' : 'mati'}; klik untuk meminta perubahan`}
                  disabled={busyAction === row.action || !session?.authenticated}
                  onClick={() => sendRequest(row.action, !isOn)}
                >
                  <span className="switch-knob" />
                </button>
                <span className="switch-label">{isOn ? 'ON' : 'OFF'}</span>
              </div>
            </section>
          );
        })}
      </div>

      {!session?.authenticated && (
        <button className="login-link" type="button" onClick={() => navigate('/login')}>
          Login
        </button>
      )}
    </AppShell>
  );
}
