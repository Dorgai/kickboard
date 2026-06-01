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
import {
  featureCards,
  matchEvents,
  notifications,
  railwayServices,
  safetyPillars,
  tiers,
  widgets
} from "@/lib/kickstats-data";

const groups = ["A", "B", "C", "D", "E", "F"];

export default function Home() {
  return (
    <>
      <AppChrome />
      <main id="main-content">
        <section className="hero section">
          <div className="hero-copy">
            <p className="eyebrow">Railway-ready greenfield scaffold</p>
            <h1>Build KickStats as a safe, real-time World Cup fan platform.</h1>
            <p className="hero-text">
              This first implementation turns the uploaded UI, functional and data-model specs into a
              deployable Next.js foundation with health checks, service boundaries and safety constraints
              visible from day one.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#railway">
                Railway services
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="button secondary" href="#safety">
                Safety architecture
              </a>
            </div>
          </div>

          <div className="live-card" aria-label="Live match preview">
            <div className="live-card-header">
              <span className="live-dot" aria-hidden="true" />
              73' LIVE
            </div>
            <div className="score-row">
              <span>Team A</span>
              <strong>2 - 1</strong>
              <span>Team B</span>
            </div>
            <div className="timeline">
              {matchEvents.map((event) => (
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
              The layout starts with the default Fan dashboard and keeps child-account restrictions explicit.
            </p>
          </div>
          <div className="widget-grid">
            {widgets.map((widget) => (
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
            <h2>Group tables now, knockout tree next</h2>
          </div>
          <div className="group-grid">
            {groups.map((group) => (
              <article className="group-card" key={group}>
                <h3>Group {group}</h3>
                {["Team A", "Team B", "Team C", "Team D"].map((team, index) => (
                  <div className="standing-row" key={`${group}-${team}`}>
                    <span>{index + 1}</span>
                    <strong>{team}</strong>
                    <span>{7 - index * 2} pts</span>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </section>

        <section className="section split-section" id="squads">
          <div className="section-heading">
            <p className="eyebrow">Squad builder</p>
            <h2>Pitch-first interaction model</h2>
            <p>
              The scaffold establishes the UX target for drag-and-drop squads, keyboard alternatives and
              match-lock behaviour.
            </p>
          </div>
          <div className="pitch-card" aria-label="Squad pitch preview">
            {["FWD", "MID", "DEF", "GK"].map((line) => (
              <div className="pitch-line" key={line}>
                {[1, 2, 3].map((slot) => (
                  <span key={`${line}-${slot}`}>{line}</span>
                ))}
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
        KickStats scaffold based on UI, functional and data model specs v1.0.
      </footer>
    </>
  );
}
