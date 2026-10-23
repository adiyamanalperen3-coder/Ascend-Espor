import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  getGetTeamContentQueryKey,
  getGetTeamSummaryQueryKey,
  getListPlayersQueryKey,
  useCreateMatch, useCreatePlayer, useCreateTournament,
  useDeleteMatch, useDeletePlayer, useDeleteTournament,
  useGetAdminAccess, useGetTeamContent, useListPlayers,
  useResetTeamContent, useUpdateMatch, useUpdatePlayer, useUpdateTournament,
  type Match, type Player, type Tournament,
} from '@workspace/api-client-react';

type Section = 'players' | 'matches' | 'tournaments';
type Entry = Player | Match | Tournament;
type FormState = { section: Section; item?: Entry };

const sectionNames: Record<Section, string> = { players: 'Oyuncular', matches: 'Maçlar', tournaments: 'Turnuvalar' };
const blankValues: Record<Section, Record<string, string>> = {
  players: { name: '', initials: '', role: 'Takım oyuncusu', matches: '0', wins: '0', note: '' },
  matches: { opponent: '', date: '', event: '', a: '0', b: '0', result: 'W' },
  tournaments: { name: '', date: '', placement: '', status: 'Katılım' },
};
const fields: Record<Section, { key: string; label: string; type?: string; full?: boolean }[]> = {
  players: [
    { key: 'name', label: 'Oyuncu adı' }, { key: 'initials', label: 'Kısa ad / avatar' },
    { key: 'role', label: 'Rol' }, { key: 'matches', label: 'Maç sayısı', type: 'number' },
    { key: 'wins', label: 'Galibiyet', type: 'number' }, { key: 'note', label: 'Not', full: true },
  ],
  matches: [
    { key: 'opponent', label: 'Rakip takım' }, { key: 'date', label: 'Tarih' },
    { key: 'event', label: 'Turnuva / maç türü' }, { key: 'a', label: 'ASCEND skoru', type: 'number' },
    { key: 'b', label: 'Rakip skoru', type: 'number' }, { key: 'result', label: 'Sonuç' },
  ],
  tournaments: [
    { key: 'name', label: 'Turnuva adı' }, { key: 'date', label: 'Tarih' },
    { key: 'placement', label: 'Sıralama / sonuç' }, { key: 'status', label: 'Durum' },
  ],
};
const asRecord = (item: Entry): Record<string, string | number> => item as unknown as Record<string, string | number>;

function AdminRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const access = useGetAdminAccess({ query: { enabled: Boolean(isLoaded && isSignedIn), queryKey: ['/api/admin/access'] } });
  if (!isLoaded || (isSignedIn && access.isLoading)) return <main className="admin-page"><div className="wrap admin-head"><div className="skeleton" /></div></main>;
  if (!isSignedIn) return <main className="admin-page"><div className="wrap auth-shell"><div className="auth-inner">
    <a className="brand" href="/"><span className="mark">A</span><span>ASCEND<small>STANDOFF 2 ESPORTS</small></span></a>
    <h1 className="admin-head">Yönetim paneli</h1><p className="muted">Devam etmek için hesabına giriş yap.</p>
    <Link href="/sign-in" className="btn btn-primary" data-testid="link-admin-signin">Giriş yap</Link>
    <p><Link href="/" className="muted" data-testid="link-admin-home">Ana sayfaya dön</Link></p>
  </div></div></main>;
  if (access.isError) return <main className="admin-page"><div className="wrap admin-head"><div className="error-box" data-testid="error-admin-access">Yönetici erişimi doğrulanamadı. <button className="btn btn-secondary" onClick={() => access.refetch()} data-testid="button-retry-access">Tekrar dene</button></div></div></main>;
  if (!access.data?.isAdmin) return <main className="admin-page"><div className="wrap auth-shell"><div className="auth-inner">
    <a className="brand" href="/"><span className="mark">A</span><span>ASCEND<small>STANDOFF 2 ESPORTS</small></span></a>
    <h1 className="admin-head">Erişim izni yok</h1><p className="muted" data-testid="status-not-admin">Bu hesap ASCEND içeriklerini yönetme yetkisine sahip değil.</p>
    <Link href="/" className="btn btn-secondary" data-testid="link-denied-home">Ana sayfaya dön</Link>
  </div></div></main>;
  return <OwnerPanel />;
}

function OwnerPanel() {
  const queryClient = useQueryClient();
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: getGetTeamContentQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetTeamSummaryQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() }),
  ]);
  const playersQuery = useListPlayers({ query: { queryKey: getListPlayersQueryKey() } });
  const contentQuery = useGetTeamContent({ query: { queryKey: getGetTeamContentQueryKey() } });
  const createPlayer = useCreatePlayer({ mutation: { onSuccess: refresh } });
  const updatePlayer = useUpdatePlayer({ mutation: { onSuccess: refresh } });
  const deletePlayer = useDeletePlayer({ mutation: { onSuccess: refresh } });
  const createMatch = useCreateMatch({ mutation: { onSuccess: refresh } });
  const updateMatch = useUpdateMatch({ mutation: { onSuccess: refresh } });
  const deleteMatch = useDeleteMatch({ mutation: { onSuccess: refresh } });
  const createTournament = useCreateTournament({ mutation: { onSuccess: refresh } });
  const updateTournament = useUpdateTournament({ mutation: { onSuccess: refresh } });
  const deleteTournament = useDeleteTournament({ mutation: { onSuccess: refresh } });
  const reset = useResetTeamContent({ mutation: { onSuccess: refresh } });
  const [section, setSection] = useState<Section>('players');
  const [form, setForm] = useState<FormState | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const isSaving = createPlayer.isPending || updatePlayer.isPending || createMatch.isPending || updateMatch.isPending || createTournament.isPending || updateTournament.isPending || reset.isPending;
  const mutationError = createPlayer.error || updatePlayer.error || deletePlayer.error || createMatch.error || updateMatch.error || deleteMatch.error || createTournament.error || updateTournament.error || deleteTournament.error || reset.error;

  const openForm = (target: Section, item?: Entry) => {
    setForm({ section: target, item });
    const source = item ? asRecord(item) : blankValues[target];
    setValues(Object.fromEntries(Object.entries(source).filter(([key]) => key !== 'id').map(([key, value]) => [key, String(value ?? '')])));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    const payload: Record<string, string | number> = { ...values };
    for (const key of ['matches', 'wins', 'a', 'b']) if (key in payload) payload[key] = Number(payload[key]);
    if (form.section === 'players') {
      const data = payload as unknown as import('@workspace/api-client-react').PlayerInput;
      if (form.item) updatePlayer.mutate({ id: form.item.id, data: data as import('@workspace/api-client-react').PlayerUpdate });
      else createPlayer.mutate({ data });
    } else if (form.section === 'matches') {
      const data = payload as unknown as import('@workspace/api-client-react').MatchInput;
      if (form.item) updateMatch.mutate({ id: form.item.id, data: data as import('@workspace/api-client-react').MatchUpdate });
      else createMatch.mutate({ data });
    } else {
      const data = payload as unknown as import('@workspace/api-client-react').TournamentInput;
      if (form.item) updateTournament.mutate({ id: form.item.id, data: data as import('@workspace/api-client-react').TournamentUpdate });
      else createTournament.mutate({ data });
    }
    setForm(null);
  };
  const remove = (target: Section, item: Entry) => {
    if (!window.confirm(`${itemLabel(target, item)} kaydını silmek istediğine emin misin?`)) return;
    if (target === 'players') deletePlayer.mutate({ id: item.id });
    if (target === 'matches') deleteMatch.mutate({ id: item.id });
    if (target === 'tournaments') deleteTournament.mutate({ id: item.id });
  };
  const currentLoading = section === 'players' ? playersQuery.isLoading : contentQuery.isLoading;
  const currentError = section === 'players' ? playersQuery.isError : contentQuery.isError;
  const currentList: Entry[] = section === 'players' ? (playersQuery.data ?? []) : section === 'matches' ? (contentQuery.data?.matches ?? []) : (contentQuery.data?.tournaments ?? []);
  const retry = () => { if (section === 'players') void playersQuery.refetch(); else void contentQuery.refetch(); };

  return <main className="admin-page">
    <div className="wrap">
      <header className="admin-head">
        <Link href="/" className="brand" data-testid="link-admin-brand"><span className="mark">A</span><span>ASCEND<small>STANDOFF 2 ESPORTS</small></span></Link>
        <p className="eyebrow" style={{ marginTop: 28 }}>İÇERİK YÖNETİMİ</p><h1>Yönetim paneli</h1>
        <p className="muted">Takım kadrosunu, maç kayıtlarını ve turnuva bilgilerini düzenle.</p>
      </header>
      <div className="admin-layout">
        <aside className="card admin-side" aria-label="Yönetim bölümleri">
          {(Object.keys(sectionNames) as Section[]).map(key => <button type="button" className={`admin-tab ${section === key ? 'active' : ''}`} key={key} data-testid={`tab-admin-${key}`} onClick={() => setSection(key)}>{sectionNames[key]}</button>)}
          <button type="button" className="admin-tab" data-testid="button-reset-content" disabled={reset.isPending} onClick={() => {
            if (window.confirm('Tüm maç ve turnuva kayıtları silinip başlangıç kadrosu geri yüklensin mi? Bu işlem geri alınamaz.')) reset.mutate();
          }}><RotateCcw size={15} style={{ marginRight: 8 }} />Başlangıca sıfırla</button>
          <Link href="/" className="admin-tab" data-testid="link-admin-public"><ArrowLeft size={15} style={{ marginRight: 8 }} />Siteye dön</Link>
        </aside>
        <section className="card admin-main">
          <div className="admin-toolbar"><div><span className="eyebrow">İÇERİK</span><h2>{sectionNames[section]}</h2></div>
            <button type="button" className="btn btn-primary" data-testid={`button-add-${section}`} onClick={() => openForm(section)}><Plus size={16} />Yeni ekle</button>
          </div>
          {mutationError && <div className="error-box" role="alert" data-testid="error-admin-mutation">İşlem tamamlanamadı. Bilgileri kontrol edip tekrar dene.</div>}
          {currentLoading ? <div className="admin-list">{[1, 2, 3].map(i => <div className="skeleton" key={i} />)}</div> :
            currentError ? <div className="error-box" data-testid="error-admin-list">Kayıtlar yüklenemedi. <button className="btn btn-secondary" onClick={retry} data-testid="button-retry-admin-list">Tekrar dene</button></div> :
              currentList.length ? <div className="admin-list">{currentList.map(item => <div className="admin-row" key={item.id} data-testid={`row-admin-${section}-${item.id}`}>
                <div className="row-info"><strong>{itemLabel(section, item)}</strong><span className="muted">{itemDetail(section, item)}</span></div>
                <div className="row-actions">
                  <button type="button" className="icon-btn" aria-label="Düzenle" data-testid={`button-edit-${section}-${item.id}`} onClick={() => openForm(section, item)}><Pencil size={15} /></button>
                  <button type="button" className="icon-btn" aria-label="Sil" data-testid={`button-delete-${section}-${item.id}`} onClick={() => remove(section, item)}><Trash2 size={15} /></button>
                </div>
              </div>)}</div> : <div className="empty" data-testid={`empty-admin-${section}`}>Bu bölümde henüz kayıt yok. Yeni kayıt ekleyerek başlayabilirsin.</div>}
          {isSaving && <p className="note" role="status" data-testid="status-saving">Değişiklikler kaydediliyor…</p>}
        </section>
      </div>
    </div>
    {form && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setForm(null); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
        <h2 id="form-title">{form.item ? 'Kaydı düzenle' : 'Yeni kayıt'} · {sectionNames[form.section]}</h2>
        <form onSubmit={submit}>
          <div className="form-grid">{fields[form.section].map(field => <label className={`field ${field.full ? 'full' : ''}`} key={field.key}>{field.label}
            {field.key === 'result' ? <select data-testid={`input-${field.key}`} value={values[field.key] ?? 'W'} onChange={event => setValues({ ...values, [field.key]: event.target.value })}><option value="W">Galibiyet</option><option value="L">Mağlubiyet</option></select> :
              <input data-testid={`input-${field.key}`} type={field.type ?? 'text'} required={field.key !== 'note'} min={field.type === 'number' ? 0 : undefined} maxLength={field.type === 'number' ? undefined : 500} value={values[field.key] ?? ''} onChange={event => setValues({ ...values, [field.key]: event.target.value })} />}
          </label>)}</div>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" data-testid="button-cancel-form" onClick={() => setForm(null)}>Vazgeç</button><button type="submit" className="btn btn-primary" data-testid="button-save-form" disabled={isSaving}>{isSaving ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
        </form>
      </section>
    </div>}
  </main>;
}

function itemLabel(section: Section, item: Entry) {
  if (section === 'players') return (item as Player).name;
  if (section === 'matches') return `ASCEND ${(item as Match).a} : ${(item as Match).b} ${(item as Match).opponent}`;
  return (item as Tournament).name;
}
function itemDetail(section: Section, item: Entry) {
  if (section === 'players') {
    const player = item as Player;
    return `${player.role} · ${player.matches} maç · ${player.wins} galibiyet`;
  }
  if (section === 'matches') {
    const match = item as Match;
    return `${match.event} · ${match.date} · ${match.result === 'W' ? 'Galibiyet' : 'Mağlubiyet'}`;
  }
  const tournament = item as Tournament;
  return `${tournament.date} · ${tournament.placement} · ${tournament.status}`;
}

export default AdminRoute;
