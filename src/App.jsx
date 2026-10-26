import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage.jsx';
import SuhuPage from './pages/SuhuPage.jsx';
import KelembapanPage from './pages/KelembapanPage.jsx';
import KontrolPage from './pages/KontrolPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import BantuanPage from './pages/BantuanPage.jsx';

export default function App() {
  const [path, setPath] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    function changePage() {
      setPath(window.location.hash.slice(1) || '/');
    }

    window.addEventListener('hashchange', changePage);
    return () => window.removeEventListener('hashchange', changePage);
  }, []);

  function navigate(nextPath) {
    window.location.hash = nextPath;
  }

  if (path === '/suhu') return <SuhuPage />;
  if (path === '/kelembapan') return <KelembapanPage />;
  if (path === '/kontrol') return <KontrolPage navigate={navigate} />;
  if (path === '/bantuan') return <BantuanPage />;
  if (path === '/login') return <LoginPage navigate={navigate} />;
  return <HomePage />;
}
