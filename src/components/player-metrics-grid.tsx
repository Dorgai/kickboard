export type PlayerMetricGridItem = {
  id: string;
  label: string;
  value: string;
};

type PlayerMetricsGridProps = {
  items: PlayerMetricGridItem[];
};

export function PlayerMetricsGrid({ items }: PlayerMetricsGridProps) {
  if (!items.length) return null;

  return (
    <div className="player-metrics-grid">
      {items.map((item) => (
        <div className="player-metrics-grid-row" key={item.id}>
          <span className="player-metrics-grid-stat">{item.label}</span>
          <span className="player-metrics-grid-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
