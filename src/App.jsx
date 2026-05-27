import { useState, createContext, useContext, useEffect } from 'react';
import './index.css';
import { Icon } from './icons.jsx';
import DashboardView from './views/DashboardView.jsx';
import SettingsView from './views/SettingsView.jsx';
import MemoryView from './views/MemoryView.jsx';

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', iconStr = null) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, message, type, iconStr, exiting: false }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => {
          let TypeIcon = Icon.Info;
          if (t.type === 'success') TypeIcon = Icon.Check;
          if (t.type === 'warning') TypeIcon = Icon.AlertTriangle;
          if (t.type === 'danger') TypeIcon = Icon.X;

          return (
            <div key={t.id} className={`toast ${t.type} ${t.exiting ? 'exiting' : ''}`}>
              <div className="toast-icon">
                {t.iconStr ? <span>{t.iconStr}</span> : <TypeIcon />}
              </div>
              <div dangerouslySetInnerHTML={{ __html: t.message }} />
              <button className="toast-close" onClick={() => removeToast(t.id)}>
                <Icon.X />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// ============================================================
// APP SHELL
// ============================================================
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Kontrol Merkezi', icon: 'Dashboard' },
  { id: 'settings',  label: 'Ayarlar',         icon: 'Settings'  },
  { id: 'memory',    label: 'Sistem Hafızası',  icon: 'Memory'    },
];

function AppContent() {
  const [page, setPage] = useState('dashboard');
  const [connected, setConnected] = useState(true);

  // Simple connection check
  useEffect(() => {
    const checkConn = () => setConnected(navigator.onLine);
    window.addEventListener('online', checkConn);
    window.addEventListener('offline', checkConn);
    return () => {
      window.removeEventListener('online', checkConn);
      window.removeEventListener('offline', checkConn);
    };
  }, []);

  const PageComponent = {
    dashboard: DashboardView,
    settings:  SettingsView,
    memory:    MemoryView,
  }[page] || DashboardView;

  const pageMeta = {
    dashboard: { title: '🎯 Kontrol Merkezi', subtitle: 'Bot durumu, istatistikler ve canlı aktivite' },
    settings:  { title: '⚙️ Ayarlar',         subtitle: 'Sistem yapılandırması, entegrasyonlar ve limitler' },
    memory:    { title: '🧠 Sistem Hafızası', subtitle: 'Yorum geçmişi ve dışa aktarma' },
  }[page];

  return (
    <div className="app-shell">
      {/* ───── SIDEBAR ───── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Icon.Zap /></div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">RepBot Pro</span>
            <span className="sidebar-logo-version">v3.0 SaaS</span>
          </div>
        </div>

        <span className="nav-section-label">Navigasyon</span>

        {NAV_ITEMS.map(item => {
          const ItemIcon = Icon[item.icon];
          return (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <ItemIcon />
              {item.label}
            </button>
          );
        })}

        <div className="sidebar-footer">
          <div className="sidebar-shortcut">
            Kısayol: <kbd>Alt</kbd> + <kbd>R</kbd>
          </div>
          <div className="status-pill" style={{ background: connected ? 'var(--success-dim)' : 'var(--danger-dim)', color: connected ? 'var(--success)' : 'var(--danger)' }}>
            <div className="status-dot" style={{ background: connected ? 'var(--success)' : 'var(--danger)', boxShadow: `0 0 6px ${connected ? 'var(--success)' : 'var(--danger)'}` }} />
            <span>{connected ? "Steam'e Bağlı" : "Bağlantı Yok"}</span>
          </div>
        </div>
      </aside>

      {/* ───── MAIN ───── */}
      <main className="main-area">
        <div className="page-header">
          <h1 className="page-title">{pageMeta.title}</h1>
          <p className="page-subtitle">{pageMeta.subtitle}</p>
        </div>

        <PageComponent onNavigate={setPage} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
