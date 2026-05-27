import { useState, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { useToast } from '../App.jsx';
import { getMemory, clearMemory } from '../storage.js';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function MemoryView() {
  const { addToast } = useToast();
  const [memory, setMemory] = useState([]);
  const [filter, setFilter] = useState('all'); // all | profile | guide
  const [search, setSearch] = useState('');
  const [cleared, setCleared] = useState(false);

  const load = async () => {
    const m = await getMemory();
    setMemory(m);
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  const handleClear = async () => {
    if (!window.confirm('Tüm hafıza sıfırlansın mı? Bot daha önce yorum yaptığı kişileri unutacak ve onlara tekrar rep atabilecek.')) return;
    await clearMemory();
    setMemory([]);
    setCleared(true);
    addToast('Hafıza başarıyla sıfırlandı.', 'info');
    setTimeout(() => setCleared(false), 2000);
  };

  const handleExportCSV = () => {
    if (memory.length === 0) {
      addToast('Dışa aktarılacak veri yok.', 'warning');
      return;
    }
    
    // Create CSV content
    const headers = ['Tür', 'İsim/Başlık', 'Tarih', 'URL'];
    const rows = memory.map(e => [
      e.type === 'guide' ? 'Rehber' : 'Profil',
      `"${(e.name || '').replace(/"/g, '""')}"`,
      `"${fmtDate(e.date)}"`,
      `"${e.url || ''}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // Download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8 support
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repbot-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    addToast('Geçmiş CSV olarak indirildi.', 'success');
  };

  const filtered = memory.filter(e => {
    if (filter !== 'all' && e.type !== filter) return false;
    if (search && !e.name?.toLowerCase().includes(search.toLowerCase()) && !e.url?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const profileCount = memory.filter(e => e.type === 'profile').length;
  const guideCount = memory.filter(e => e.type === 'guide').length;

  return (
    <div className="page-content fade-in">
      {/* Stats */}
      <div className="grid-3 slide-up" style={{ animationDelay: '0.05s' }}>
        <div className="stat-card">
          <span className="stat-label">Toplam Kayıt</span>
          <span className="stat-number">{memory.length}</span>
          <span className="stat-sub">Hafızadaki giriş sayısı</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Profil Yanıtları</span>
          <span className="stat-number" style={{ color: 'var(--accent)' }}>{profileCount}</span>
          <span className="stat-sub">Benzersiz kullanıcı</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Rehber Yorumları</span>
          <span className="stat-number" style={{ color: 'var(--accent-2)' }}>{guideCount}</span>
          <span className="stat-sub">Benzersiz rehber</span>
        </div>
      </div>

      {/* Controls */}
      <div className="card slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="card-header" style={{ marginBottom: 0, flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('all')}>Tümü</button>
            <button className={`btn btn-sm ${filter === 'profile' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('profile')}>👤 Profiller</button>
            <button className={`btn btn-sm ${filter === 'guide' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('guide')}>📚 Rehberler</button>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="form-input"
              style={{ width: '220px', minWidth: '150px' }}
              placeholder="İsim veya URL'de ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}>
              <Icon.Download /> CSV İndir
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleClear}>
              <Icon.Trash /> {cleared ? 'Silindi!' : 'Hafızayı Sıfırla'}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card slide-up" style={{ animationDelay: '0.15s', padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🧠</span>
            <span className="empty-state-text">
              {memory.length === 0
                ? 'Sistem hafızası boş. Bot çalıştıkça bu liste dolacak.'
                : 'Arama kriterlerine uygun kayıt bulunamadı.'}
            </span>
          </div>
        ) : (
          <div className="memory-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>TÜR</th>
                  <th>İSİM / BAŞLIK</th>
                  <th>URL</th>
                  <th>TARİH</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`memory-type-badge ${entry.type || 'profile'}`}>
                        {entry.type === 'guide' ? '📚 Rehber' : '👤 Profil'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-1)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.name}>
                      {entry.name || '—'}
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      {entry.url ? (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}
                          title={entry.url}
                          onClick={e => {
                            if (typeof chrome !== 'undefined' && chrome.tabs) {
                              e.preventDefault();
                              chrome.tabs.create({ url: entry.url });
                            }
                          }}
                        >
                          <Icon.ExternalLink />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                            {entry.url.replace('https://steamcommunity.com/', '')}
                          </span>
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(entry.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
