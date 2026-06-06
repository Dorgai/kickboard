type ConnectionOnlineIndicatorProps = {
  online: boolean;
  lastSeenAt?: string | null;
  showLabel?: boolean;
  className?: string;
};

function formatLastSeen(lastSeenAt: string) {
  const deltaMs = Date.now() - new Date(lastSeenAt).getTime();
  if (Number.isNaN(deltaMs) || deltaMs < 0) return "Recently";

  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ConnectionOnlineIndicator({
  online,
  lastSeenAt = null,
  showLabel = false,
  className = ""
}: ConnectionOnlineIndicatorProps) {
  if (!online && !showLabel) return null;

  if (!online && showLabel) {
    return (
      <span
        className={`connection-presence-label connection-presence-label--offline${className ? ` ${className}` : ""}`}
      >
        {lastSeenAt ? `Last seen ${formatLastSeen(lastSeenAt)}` : "Offline"}
      </span>
    );
  }

  return (
    <span className={`connection-presence${className ? ` ${className}` : ""}`} title="Online now">
      <span aria-hidden={showLabel ? undefined : true} className="connection-online-dot" role="img" />
      {showLabel ? <span className="connection-presence-label connection-presence-label--online">Online</span> : null}
      {!showLabel ? <span className="sr-only">Online now</span> : null}
    </span>
  );
}
