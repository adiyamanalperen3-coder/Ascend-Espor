import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, Shield, Swords, Trophy } from 'lucide-react';
import { useGetTeamContent, useGetTeamSummary } from '@workspace/api-client-react';

function LoadingCards({ count = 4 }: { count?: number }) {
  return <div className="roster">{Array.from({ length: count }, (_, index) => <div className="skeleton" key={index} />)}</div>;
}

export default function Home() {
  const content = useGetTeamContent();
  const summary = useGetTeamSummary();
  const [active, setActive] = useState('home');
  const players = content.data?.players ?? [];
  const matches = content.data?.matches ?? [];
  const tournaments = content.data?.tournaments ?? [];
  const orderedMatches = useMemo(() => [...matches].reverse(), [matches]);
  const jump = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return <div id="home">
    <header className="topbar">
      <div className="wrap nav">
        <a className="brand" href="#home" data-testid="link-brand-home" onClick={() => setActive('home')}>
          <span className="mark">A</span><span>ASCEND<small>STANDOFF 2 ESPORTS</small></span>
        </a>
        <nav className="links" aria-label="Ana menü">
          {[
            ['home', 'Ana Sayfa'], ['players', 'Oyuncular'], ['matches', 'Maçlar'], ['tournaments', 'Turnuvalar'], ['stats', 'İstatistikler'],
          ].map(([id, label]) => <button type="button" key={id} className={`navlink ${active === id ? 'active' : ''}`} data-testid={`nav-${id}`} onClick={() => jump(id)}>{label}</button>)}
          <Link href="/admin" className="navlink admin-link" data-testid="link-admin"><Shield size={14} /> Yönetim</Link>
        </nav>
      </div>
    </header>
    <main>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">STANDOFF 2 · ESPORTS TEAM</div>
            <h1>WE RISE.<br /><span>WE ASCEND.</span></h1>
            <p>Takımımız, maçlarımız ve turnuva yolculuğumuz. Ascend'in rekabetçi sahnesine hoş geldin.</p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary" data-testid="button-discover-roster" onClick={() => jump('players')}>Kadroyu keşfet <ArrowUpRight size={16} /></button>
              <button type="button" className="btn btn-secondary" data-testid="button-view-tournaments" onClick={() => jump('tournaments')}>Turnuvaları gör</button>
            </div>
          </div>
          <div className="crest" aria-label="ASCEND takım arması">A</div>
        </div>
      </section>

      <div className="wrap">
        <section className="stats" id="overview" aria-label="Takım özeti">
          {summary.isLoading ? <>{Array.from({ length: 4 }, (_, i) => <div className="skeleton" key={i} />)}</> :
            summary.isError ? <div className="error-box" data-testid="error-summary">Takım özeti yüklenemedi. Sayfayı yenileyerek tekrar deneyebilirsin.</div> : <>
              <div className="stat" data-testid="stat-total-players"><b>{summary.data?.totalPlayers ?? 0}</b><span>KADRODAKİ OYUNCU</span></div>
              <div className="stat" data-testid="stat-total-matches"><b>{summary.data?.totalMatches ?? 0}</b><span>TOPLAM MAÇ</span></div>
              <div className="stat" data-testid="stat-total-wins"><b>{summary.data?.totalWins ?? 0}</b><span>GALİBİYET</span></div>
              <div className="stat" data-testid="stat-total-tournaments"><b>{summary.data?.totalTournaments ?? 0}</b><span>TURNUVA</span></div>
            </>}
        </section>
        <section className="section" id="players">
          <div className="section-head"><div><h2>Aktif Kadro</h2><p>ASCEND formasını taşıyan oyuncular</p></div><span className="tag">ROSTER</span></div>
          {content.isLoading ? <LoadingCards /> : content.isError ? <div className="error-box" data-testid="error-roster">Kadro yüklenemedi. <button className="btn btn-secondary" onClick={() => content.refetch()} data-testid="button-retry-roster">Tekrar dene</button></div> :
            players.length ? <div className="roster">{players.map(player => <article className="card player-card" key={player.id} data-testid={`card-player-${player.id}`}>
              <div className="avatar" data-testid={`text-player-initials-${player.id}`}>{player.initials || player.name.slice(0, 2)}</div>
              <h3 data-testid={`text-player-name-${player.id}`}>{player.name}</h3><div className="role" data-testid={`text-player-role-${player.id}`}>{player.role}</div>
              <div className="player-foot"><span className="role">{player.matches} maç · {player.wins} galibiyet</span><span className="tag">OYUNCU</span></div>
              {player.note && <p className="note" data-testid={`text-player-note-${player.id}`}>{player.note}</p>}
            </article>)}</div> : <div className="card empty" data-testid="empty-roster">Henüz kadroya oyuncu eklenmedi.</div>}
        </section>

        <section className="section" id="matches">
          <div className="section-head"><div><h2>Son Maçlar</h2><p>Takımın rekabet geçmişi</p></div><span className="tag">MATCH HISTORY</span></div>
          {content.isLoading ? <div className="match-list"><div className="skeleton" /><div className="skeleton" /></div> :
            content.isError ? <div className="error-box" data-testid="error-matches">Maç kayıtları yüklenemedi.</div> : orderedMatches.length ? <div className="match-list">{orderedMatches.map(match =>
              <article className="card match" key={match.id} data-testid={`row-match-${match.id}`}>
                <div className="team"><span className="mini-crest">A</span>ASCEND</div>
                <div className="score" data-testid={`text-match-score-${match.id}`}>{match.a} <span>:</span> {match.b}</div>
                <div className="team right"><span>{match.opponent}</span><span className="mini-crest">{match.opponent.slice(0, 1).toUpperCase()}</span></div>
                <span className="result" data-testid={`status-match-${match.id}`}>{match.result === 'W' ? 'GALİBİYET' : 'MAĞLUBİYET'}</span>
                <span className="muted">{match.event} · {match.date}</span>
              </article>)}</div> : <div className="card empty" data-testid="empty-matches"><Swords size={22} /><p>Henüz maç eklenmedi.</p></div>}
        </section>

        <section className="section" id="tournaments">
          <div className="section-head"><div><h2>Turnuvalar</h2><p>Katıldığımız organizasyonlar ve sonuçlar</p></div><span className="tag">TOURNAMENTS</span></div>
          {content.isLoading ? <LoadingCards count={3} /> :
            content.isError ? <div className="error-box" data-testid="error-tournaments">Turnuva kayıtları yüklenemedi.</div> : tournaments.length ? <div className="tournaments">{tournaments.map(tournament =>
              <article className="card tourney" key={tournament.id} data-testid={`card-tournament-${tournament.id}`}>
                <Trophy size={22} color="var(--teal)" /><span className="tag" data-testid={`status-tournament-${tournament.id}`}>{tournament.status}</span>
                <h3 data-testid={`text-tournament-name-${tournament.id}`}>{tournament.name}</h3><p className="muted">{tournament.date}</p>
                <div className="tourney-foot"><span className="muted">SONUÇ</span><b>{tournament.placement}</b></div>
              </article>)}</div> : <div className="card empty" data-testid="empty-tournaments">Henüz turnuva eklenmedi.</div>}
        </section>

        <section className="section" id="stats">
          <div className="section-head"><div><h2>Takım İstatistikleri</h2><p>Gerçek istatistikler eklendikçe güncellenir</p></div><span className="tag">OVERVIEW</span></div>
          {content.isLoading ? <div className="skeleton" /> : content.isError ? <div className="error-box" data-testid="error-statistics">İstatistikler yüklenemedi.</div> : players.length ?
            <div className="card table-wrap"><table className="table"><thead><tr><th>OYUNCU</th><th>ROL</th><th>MAÇ</th><th>GALİBİYET</th><th>NOT</th></tr></thead>
              <tbody>{players.map(player => <tr key={player.id} data-testid={`row-stat-player-${player.id}`}><td>{player.name}</td><td>{player.role}</td><td>{player.matches}</td><td>{player.wins}</td><td>{player.note || '—'}</td></tr>)}</tbody></table></div> :
            <div className="card empty">Henüz istatistik bulunmuyor.</div>}
          <p className="note">Oyun içi veriler otomatik olarak alınmıyor. Güvenilir bir Standoff 2 API'si bulunmadığında bilgiler yönetim panelinden elle girilir.</p>
        </section>
      </div>
    </main>
    <footer><div className="wrap footrow"><span>© ASCEND ESPORTS · STANDOFF 2</span><span>TAKIM KAYITLARI · Gerçek kayıtlar yönetim panelinden güncellenir</span></div></footer>
  </div>;
}
