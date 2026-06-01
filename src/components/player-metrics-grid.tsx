export type PlayerMetricGridItem = {
  id: string;
  label: string;
  value: string;
};

type PlayerMetricsGridProps = {
  items: PlayerMetricGridItem[];
  compact?: boolean;
};

export function PlayerMetricsGrid({ items, compact = false }: PlayerMetricsGridProps) {
  if (!items.length) return null;

  return (
    <div className={`player-metrics-grid${compact ? " player-metrics-grid--compact" : ""}`}>
      {items.map((item) => (
        <div className="player-metrics-grid-row" key={item.id}>
          <span className="player-metrics-grid-stat">{item.label}</span>
          <span className="player-metrics-grid-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
