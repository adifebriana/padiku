import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

export default function LoginPage({ navigate }) {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const result = await apiRequest('/api/session');
        setSession(result);
      } catch (error) {
        setMessage(error.message);
        setMessageIsError(true);
      } finally {
        setSessionLoading(false);
      }
    }

    checkSession();
  }, []);

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    setMessageIsError(false);

    try {
      await apiRequest('/api/session', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      navigate('/kontrol');
    } catch (error) {
      setMessage(error.message);
      setMessageIsError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-heading">
        <div className="login-mark">
          <img src="/assets/logo_ppk.png" alt="Logo PPK Ormawa" />
        </div>
        <h1 id="login-heading">Welcome back</h1>
        <p className="login-subtitle">Masuk ke Padiku</p>

        {session?.authenticated && (
          <p className="login-message" role="status">Anda sudah masuk.</p>
        )}

        <form className="login-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            className="login-input"
            placeholder="Username"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

          <label className="sr-only" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="login-input password-input"
            placeholder="••••••••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <div className="login-actions">
            <button
              className="login-submit"
              type="submit"
              disabled={pending || sessionLoading || session?.authenticated}
            >
              {pending ? 'Memproses…' : 'Login'}
            </button>
            {session?.authenticated
              ? <button className="login-back" type="button" onClick={() => navigate('/kontrol')}>Buka kontrol</button>
              : <a href="#/" className="login-back">Ke dashboard</a>}
          </div>

          {message && (
            <p className={`login-message${messageIsError ? ' is-error' : ''}`} role="status">
              {message}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
