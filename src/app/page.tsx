import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Goal,
  Server,
  Sparkles
} from "lucide-react";
import { AppChrome } from "@/components/app-chrome";
import { UserStatCard } from "@/components/user-stat-card";
import {
  demoDashboardWidgets,
  demoGroups,
  demoLeaderboard,
  demoLiveMatch,
  demoMatches,
  demoSquad,
  demoTopScorers,
  demoTournament,
  demoUserStatCard
} from "@/lib/demo-data";
import {
  featureCards,
  notifications,
  railwayServices,
  safetyPillars,
  tiers
} from "@/lib/kickboard-data";

export default function Home() {
  return (
    <>
      <AppChrome />
      <main id="main-content">
        <section className="hero section">
          <div className="hero-copy">
            <p className="eyebrow">{demoTournament.mode}</p>
            <h1>{demoTournament.name} data is now visible on Kickboard.</h1>
            <p className="hero-text">
              {demoTournament.sourceNote} The page now renders seeded matches, standings, scorers,
              leaderboards and profile data instead of empty placeholders.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#matches">
                View match data
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="button secondary" href="/api/demo">
                Open demo API
              </a>
            </div>
          </div>

          <div className="live-card" aria-label="Live match preview">
            <div className="live-card-header">
              <span className="live-dot" aria-hidden="true" />
              {demoLiveMatch.minute}' {demoLiveMatch.status}
            </div>
            <div className="score-row">
              <span>{demoLiveMatch.homeTeam.name}</span>
              <strong>
                {demoLiveMatch.homeTeam.score} - {demoLiveMatch.awayTeam.score}
              </strong>
              <span>{demoLiveMatch.awayTeam.name}</span>
            </div>
            <p className="match-venue">{demoLiveMatch.venue}</p>
            <div className="match-stat-grid">
              {demoLiveMatch.stats.map((stat) => (
                <div className="match-stat" key={stat.label}>
                  <span>{stat.home}</span>
                  <strong>{stat.label}</strong>
                  <span>{stat.away}</span>
                </div>
              ))}
            </div>
            <div className="timeline">
              {demoLiveMatch.events.map((event) => (
                <div className="timeline-item" data-tone={event.tone} key={`${event.minute}-${event.type}`}>
                  <span>{event.minute}</span>
                  <div>
                    <strong>{event.type}</strong>
                    <p>{event.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section dashboard-section" id="home">
          <div className="section-heading">
            <p className="eyebrow">Home dashboard</p>
            <h2>Widget-native from the first commit</h2>
            <p>
              The layout starts with concrete demo data for the default Fan dashboard and keeps child-account
              restrictions explicit.
            </p>
          </div>
          <div className="widget-grid">
            {demoDashboardWidgets.map((widget) => (
              <article className="widget-card" key={widget.title}>
                <div className="widget-header">
                  <span>{widget.title}</span>
                  <small>{widget.eyebrow}</small>
                </div>
                <strong>{widget.body}</strong>
                <p>{widget.meta}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section bracket-section" id="bracket">
          <div className="section-heading">
            <p className="eyebrow">Tournament bracket</p>
            <h2>Seeded group tables</h2>
          </div>
          <div className="group-grid">
            {demoGroups.map((group) => (
              <article className="group-card" key={group.name}>
                <h3>{group.name}</h3>
                {group.teams.map((team, index) => (
                  <div className="standing-row" key={`${group.name}-${team.code}`}>
                    <span>{index + 1}</span>
                    <strong>
                      {team.name} <small>{team.code}</small>
                    </strong>
                    <span>{team.points} pts</span>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </section>

        <section className="section data-section" id="matches">
          <div className="section-heading">
            <p className="eyebrow">Match center</p>
            <h2>Matches, scorers and leaderboard data</h2>
            <p>
              This is curated seed data for product validation. The worker service will replace it with
              API-Football polling data once ingestion is implemented.
            </p>
          </div>
          <div className="data-grid">
            <article className="data-card">
              <h3>Fixtures</h3>
              {demoMatches.map((match) => (
                <div className="fixture-row" key={match.id}>
                  <div>
                    <strong>
                      {match.homeTeam} vs {match.awayTeam}
                    </strong>
                    <p>{match.venue}</p>
                  </div>
                  <span>
                    {match.score ? `${match.score} ${match.status}` : `${match.kickoff} ${match.status}`}
                  </span>
                </div>
              ))}
            </article>
            <article className="data-card">
              <h3>Top scorers</h3>
              {demoTopScorers.map((player, index) => (
                <div className="table-row" key={player.name}>
                  <span>{index + 1}</span>
                  <strong>{player.name}</strong>
                  <span>{player.team}</span>
                  <span>{player.goals} goals</span>
                </div>
              ))}
            </article>
            <article className="data-card">
              <h3>Prediction leaderboard</h3>
              {demoLeaderboard.map((user) => (
                <div className="table-row" key={user.username}>
                  <span>#{user.rank}</span>
                  <strong>{user.username}</strong>
                  <span>{user.points} pts</span>
                  <span>{user.accuracy}</span>
                </div>
              ))}
            </article>
          </div>
        </section>

        <section className="section split-section" id="squads">
          <div className="section-heading">
            <p className="eyebrow">Squad builder</p>
            <h2>{demoSquad.name}</h2>
            <p>
              Seed formation: {demoSquad.formation}. These player rows show how real roster data will
              populate the drag-and-drop pitch.
            </p>
          </div>
          <div className="squad-card" aria-label="Squad preview">
            {demoSquad.players.map((player) => (
              <div className="squad-player-row" key={`${player.slot}-${player.name}`}>
                <span>{player.slot}</span>
                <strong>{player.name}</strong>
                <small>{player.team}</small>
                <em>{player.rating}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="players">
          <div className="section-heading">
            <p className="eyebrow">Core platform features</p>
            <h2>Scoped around the uploaded specs</h2>
          </div>
          <div className="feature-grid">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <article className="feature-card" key={feature.title}>
                  <Icon size={22} aria-hidden="true" />
                  <span className="status-pill">{feature.status}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.summary}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section stat-card-showcase" id="profile">
          <div className="section-heading">
            <p className="eyebrow">User profile</p>
            <h2>UserStatCard is the tournament passport</h2>
            <p>
              The profile card surfaces points, rank, accuracy, prediction streak, top player and sharing
              actions from the new requirements.
            </p>
          </div>
          <div className="stat-card-layout">
            <UserStatCard data={demoUserStatCard} />
            <div className="stat-card-notes">
              <h3>Share export contract</h3>
              <p>
                The full card renders in React today. The 1080x1080 share image should be generated
                server-side, stored behind a one-hour signed URL and passed to the Web Share API when
                object storage is configured.
              </p>
              <ul>
                <li>Uses users.points_balance for points.</li>
                <li>Uses latest leaderboard snapshot for rank.</li>
                <li>Falls back to a download link when native sharing is unavailable.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section safety-section" id="safety">
          <div className="section-heading">
            <p className="eyebrow">Safety guardrails</p>
            <h2>Safe to build because the constraints are product requirements</h2>
          </div>
          <div className="safety-grid">
            {safetyPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article className="safety-card" key={pillar.title}>
                  <Icon size={24} aria-hidden="true" />
                  <h3>{pillar.title}</h3>
                  <p>{pillar.detail}</p>
                </article>
              );
            })}
          </div>
          <div className="notification-list" aria-label="Accessibility notification constraints">
            {notifications.map((item) => (
              <p key={item}>
                <CheckCircle2 size={18} aria-hidden="true" />
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className="section tier-section" id="community">
          <div className="section-heading">
            <p className="eyebrow">Fan, Pro, Elite</p>
            <h2>Clear monetisation without unsafe prediction mechanics</h2>
          </div>
          <div className="tier-grid">
            {tiers.map((tier) => {
              const Icon = tier.icon;
              return (
                <article className="tier-card" key={tier.name}>
                  <Icon size={24} aria-hidden="true" />
                  <h3>{tier.name}</h3>
                  <strong>{tier.price}</strong>
                  <p>{tier.summary}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section railway-section" id="railway">
          <div className="section-heading">
            <p className="eyebrow">Railway deployment</p>
            <h2>Services to create in Railway</h2>
            <p>
              Create the first three immediately. Add Worker and Analytics API when their code paths exist.
            </p>
          </div>
          <div className="railway-grid">
            {railwayServices.map((service) => {
              const Icon = service.icon;
              return (
                <article className="railway-card" key={service.name}>
                  <div className="railway-card-top">
                    <Icon size={24} aria-hidden="true" />
                    <span className={service.createNow ? "create-now" : "create-later"}>
                      {service.createNow ? "create now" : "later"}
                    </span>
                  </div>
                  <h3>{service.name}</h3>
                  <strong>{service.railwayService}</strong>
                  <p>{service.purpose}</p>
                  <div className="env-list">
                    {service.variables.map((variable) => (
                      <code key={`${service.name}-${variable}`}>{variable}</code>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section readiness-section" id="analytics">
          <div className="readiness-card">
            <div>
              <p className="eyebrow">Operational readiness</p>
              <h2>Built for health checks and progressive service extraction</h2>
              <p>
                Railway can probe <code>/api/health</code>. The app also exposes <code>/api/config</code>
                for non-secret configuration readiness during setup.
              </p>
            </div>
            <div className="readiness-list">
              <p>
                <Server size={18} aria-hidden="true" />
                Standalone Next output enabled
              </p>
              <p>
                <Clock3 size={18} aria-hidden="true" />
                UTC timestamps and Railway env-first config
              </p>
              <p>
                <Goal size={18} aria-hidden="true" />
                Health endpoint ready for deploy checks
              </p>
              <p>
                <Activity size={18} aria-hidden="true" />
                Worker boundary documented before implementation
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <Sparkles size={18} aria-hidden="true" />
        Kickboard scaffold based on UI, functional and data model specs v1.0.
      </footer>
    </>
  );
}
