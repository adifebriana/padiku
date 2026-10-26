const navItems = [
  { href: '/', label: 'Home', icon: '1.png' },
  { href: '/suhu', label: 'Suhu', icon: '2.png' },
  { href: '/kelembapan', label: 'Kelembapan', icon: '3.png' },
  { href: '/kontrol', label: 'Kontrol', icon: '4.png' },
  { href: '/bantuan', label: 'Bantuan', icon: '5.png' },
];

function Header({ title, home }) {
  return (
    <header className={`topbar${home ? ' topbar-home' : ''}`}>
      <h1>{title}</h1>
      {home && <img className="brand-mark" src="/assets/logo_ppk.png" alt="Logo PPK Ormawa" />}
    </header>
  );
}

function BottomNav({ active }) {
  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {navItems.map((item) => (
        <a
          key={item.href}
          href={`#${item.href}`}
          className={`nav-item${active === item.label.toLowerCase() ? ' is-active' : ''}`}
          aria-current={active === item.label.toLowerCase() ? 'page' : undefined}
        >
          <img className="icon" src={`/assets/navbar/${item.icon}`} alt="" />
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

export default function AppShell({ title, active, home = false, children }) {
  return (
    <div className={`app-shell${home ? ' home-shell' : ''}`}>
      <Header title={title} home={home} />
      <main className={`page-content${home ? ' home-content' : ''}`}>
        {children}
      </main>
      <BottomNav active={active} />
    </div>
  );
}
