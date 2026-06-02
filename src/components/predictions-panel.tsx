"use client";

import { AuthGate } from "@/components/auth-gate";

export function PredictionsPanel() {
  return (
    <AuthGate featureLabel="Predictions">
      <div className="predictions-panel">
        <p className="community-panel-lead">
          Predictions are <strong>free-to-play skill games</strong> — virtual points only, not betting or
          real-money stakes (see <code>docs/predictions-legal.md</code>).
        </p>
        <div className="predictions-coming-soon data-card surface-muted">
          <h3>Exact score & MOTM — coming next</h3>
          <p>
            The database already has <code>predictions</code> and <code>wallet_ledger</code> tables. The
            worker will settle points after matches when API-Football live data is connected.
          </p>
          <ul className="predictions-spec-list">
            <li>Lock picks before kickoff</li>
            <li>Points credited via wallet ledger (no cash value)</li>
            <li>Leaderboard widget per <code>docs/widget-contract.md</code></li>
          </ul>
        </div>
      </div>
    </AuthGate>
  );
}
