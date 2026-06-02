export function mapConnectionError(error: unknown) {
  if (!(error instanceof Error)) return null;

  const map: Record<string, { status: number; error: string }> = {
    USERNAME_REQUIRED: { status: 400, error: "Enter a username to connect." },
    USER_NOT_FOUND: { status: 404, error: "No user with that username." },
    CANNOT_CONNECT_CHILD: { status: 403, error: "That account cannot receive connection requests." },
    CANNOT_CONNECT_SELF: { status: 400, error: "You cannot connect with yourself." },
    CHILD_CANNOT_CONNECT: { status: 403, error: "Fan Mode accounts cannot use connections." },
    ALREADY_CONNECTED: { status: 409, error: "You are already connected." },
    CONNECTION_BLOCKED: { status: 403, error: "Connection is blocked." },
    REQUEST_ALREADY_PENDING: { status: 409, error: "A request is already pending." },
    FORBIDDEN: { status: 403, error: "Not allowed." },
    ONLY_ADDRESSEE_CAN_ACCEPT: { status: 403, error: "Only the recipient can accept." },
    NOT_PENDING: { status: 409, error: "This request is no longer pending." },
    NOT_CONNECTED: { status: 403, error: "Connect with this user first." }
  };

  return map[error.message] ?? null;
}
