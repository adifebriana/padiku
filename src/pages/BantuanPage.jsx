import AppShell from '../components/AppShell.jsx';

export default function BantuanPage() {
  return (
    <AppShell title="Bantuan" active="bantuan">
      <div className="help-buttons">
        <a
          className="help-button"
          href="https://drive.google.com/file/d/1alGIMqjhot6V4JoFl0on0GmFK9APk_UF/view?usp=share_link"
        >
          <img src="/assets/bantuan/1.png" alt="" />
          <span>Buku Panduan</span>
        </a>
        <button className="help-button" type="button">
          <img src="/assets/bantuan/2.png" alt="" />
          <span>WhatsApp</span>
        </button>
      </div>
    </AppShell>
  );
}
