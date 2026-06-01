"use client";

import { useMemo, useState } from "react";
import { TeamLabel } from "@/components/team-label";

export type PlayerStatRow = {
  playerId: number | null;
  player: string;
  team: string;
  passes: number;
  passAccuracy: number | null;
  shots: number;
  goals: number;
  assists: number;
  xg: number;
  carries: number;
  dribbles: number;
};

type ColumnId =
  | "player"
  | "team"
  | "goals"
  | "assists"
  | "shots"
  | "xg"
  | "passes"
  | "passAccuracy"
  | "carries"
  | "dribbles";

type ColumnDef = {
  id: ColumnId;
  label: string;
  tooltip: string;
  kind: "text" | "number";
  value: (row: PlayerStatRow) => string | number | null;
};

const COLUMNS: ColumnDef[] = [
  {
    id: "player",
    label: "Player",
    tooltip: "Player name aggregated from StatsBomb match events.",
    kind: "text",
    value: (row) => row.player
  },
  {
    id: "team",
    label: "Team",
    tooltip: "National team the player represented in this match.",
    kind: "text",
    value: (row) => row.team
  },
  {
    id: "goals",
    label: "G",
    tooltip: "Goals scored in this match.",
    kind: "number",
    value: (row) => row.goals
  },
  {
    id: "assists",
    label: "A",
    tooltip: "Goal assists recorded in this match.",
    kind: "number",
    value: (row) => row.assists
  },
  {
    id: "shots",
    label: "Sh",
    tooltip: "Shot attempts including goals.",
    kind: "number",
    value: (row) => row.shots
  },
  {
    id: "xg",
    label: "xG",
    tooltip: "Expected goals total from shot quality in this match.",
    kind: "number",
    value: (row) => row.xg
  },
  {
    id: "passes",
    label: "Ps",
    tooltip: "Passes attempted in this match.",
    kind: "number",
    value: (row) => row.passes
  },
  {
    id: "passAccuracy",
    label: "Acc%",
    tooltip: "Pass completion rate when pass outcomes are available.",
    kind: "number",
    value: (row) => row.passAccuracy
  },
  {
    id: "carries",
    label: "Car",
    tooltip: "Ball carries in this match.",
    kind: "number",
    value: (row) => row.carries
  },
  {
    id: "dribbles",
    label: "Dr",
    tooltip: "Dribbles attempted in this match.",
    kind: "number",
    value: (row) => row.dribbles
  }
];

const GRID_TEMPLATE =
  "minmax(150px, 1.3fr) minmax(110px, 1fr) repeat(8, minmax(52px, 0.55fr))";

type SortState = {
  column: ColumnId;
  direction: "asc" | "desc";
} | null;

type PlayerStatsTableProps = {
  players: PlayerStatRow[];
  selectedPlayerId: number | null;
  onSelectPlayer: (playerId: number | null) => void;
};

export function PlayerStatsTable({ players, selectedPlayerId, onSelectPlayer }: PlayerStatsTableProps) {
  const [sort, setSort] = useState<SortState>({ column: "goals", direction: "desc" });
  const [filters, setFilters] = useState<Partial<Record<ColumnId, string>>>({});

  const filteredAndSorted = useMemo(() => {
    let rows = players.filter((row) =>
      COLUMNS.every((column) => {
        const rawFilter = filters[column.id]?.trim();
        if (!rawFilter) return true;

        const cell = column.value(row);
        if (column.kind === "text") {
          return String(cell ?? "")
            .toLowerCase()
            .includes(rawFilter.toLowerCase());
        }

        const numeric = typeof cell === "number" ? cell : Number(cell);
        const min = Number(rawFilter);
        if (Number.isNaN(min)) return true;
        return !Number.isNaN(numeric) && numeric >= min;
      })
    );

    if (sort) {
      const column = COLUMNS.find((entry) => entry.id === sort.column);
      if (column) {
        rows = [...rows].sort((left, right) => {
          const a = column.value(left);
          const b = column.value(right);

          if (column.kind === "text") {
            const comparison = String(a ?? "").localeCompare(String(b ?? ""), undefined, { sensitivity: "base" });
            return sort.direction === "asc" ? comparison : -comparison;
          }

          const leftNum = typeof a === "number" ? a : Number(a ?? 0);
          const rightNum = typeof b === "number" ? b : Number(b ?? 0);
          return sort.direction === "asc" ? leftNum - rightNum : rightNum - leftNum;
        });
      }
    }

    return rows;
  }, [filters, players, sort]);

  function toggleSort(columnId: ColumnId) {
    setSort((current) => {
      if (!current || current.column !== columnId) {
        const defaultDesc = columnId !== "player" && columnId !== "team";
        return { column: columnId, direction: defaultDesc ? "desc" : "asc" };
      }
      if (current.direction === "desc") {
        return { column: columnId, direction: "asc" };
      }
      return null;
    });
  }

  function updateFilter(columnId: ColumnId, value: string) {
    setFilters((current) => ({ ...current, [columnId]: value }));
  }

  function formatCell(column: ColumnDef, row: PlayerStatRow) {
    const value = column.value(row);
    if (column.id === "passAccuracy") {
      return value === null || value === undefined ? "n/a" : `${value}%`;
    }
    if (column.id === "xg") {
      return typeof value === "number" ? value.toFixed(2) : "0.00";
    }
    return value ?? (column.kind === "number" ? 0 : "—");
  }

  return (
    <section className="match-detail-section player-stats-section">
      <div className="section-heading compact">
        <div>
          <h3>Player stats</h3>
          <p>
            {filteredAndSorted.length} of {players.length} players · click a column to sort · filter with inputs
            below headers
          </p>
        </div>
        {selectedPlayerId ? (
          <button className="text-button" type="button" onClick={() => onSelectPlayer(null)}>
            Clear selection
          </button>
        ) : null}
      </div>

      <div className="player-stat-table" style={{ ["--player-stat-columns" as string]: GRID_TEMPLATE }}>
        <div className="player-stat-row heading" role="row">
          {COLUMNS.map((column) => {
            const active = sort?.column === column.id;
            const direction = active ? sort?.direction : null;
            return (
              <div className="player-stat-header-cell" key={column.id} role="columnheader">
                <button
                  className={`player-stat-sort${active ? " active" : ""}`}
                  type="button"
                  onClick={() => toggleSort(column.id)}
                >
                  <span className="col-tooltip" tabIndex={0} title={column.tooltip}>
                    {column.label}
                    <span className="col-tooltip-bubble" role="tooltip">
                      {column.tooltip}
                    </span>
                  </span>
                  {direction ? <span className="sort-indicator">{direction === "asc" ? "↑" : "↓"}</span> : null}
                </button>
                <input
                  aria-label={`Filter ${column.label}`}
                  className="player-stat-filter"
                  placeholder={column.kind === "text" ? "Contains…" : "Min"}
                  type={column.kind === "number" ? "number" : "search"}
                  value={filters[column.id] ?? ""}
                  onChange={(event) => updateFilter(column.id, event.target.value)}
                />
              </div>
            );
          })}
        </div>

        {filteredAndSorted.length === 0 ? (
          <p className="inline-status player-stat-empty">No players match the current column filters.</p>
        ) : (
          filteredAndSorted.map((row) => {
            const rowKey = `${row.team}-${row.player}-${row.playerId}`;
            const isSelected = row.playerId !== null && row.playerId === selectedPlayerId;

            return (
              <button
                className={`player-stat-row player-stat-data-row${isSelected ? " selected" : ""}`}
                key={rowKey}
                type="button"
                onClick={() => onSelectPlayer(row.playerId)}
                role="row"
              >
                {COLUMNS.map((column) => (
                  <span key={`${rowKey}-${column.id}`}>
                    {column.id === "team" ? (
                      <TeamLabel name={row.team} size="xs" />
                    ) : column.id === "player" ? (
                      <strong>{row.player}</strong>
                    ) : (
                      formatCell(column, row)
                    )}
                  </span>
                ))}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
