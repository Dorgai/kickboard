export function mapFanChatError(error: unknown) {
  if (!(error instanceof Error)) return null;

  switch (error.message) {
    case "MESSAGE_EMPTY":
      return { status: 400, error: "Enter a message." };
    case "RECIPIENT_REQUIRED":
      return { status: 400, error: "Choose who to message." };
    case "NOT_CONNECTED":
      return { status: 403, error: "You can only message accepted connections." };
    case "NO_CONNECTIONS":
      return {
        status: 400,
        error: "You have no connections yet. Add friends under Community before broadcasting."
      };
    case "SEND_FAILED":
      return { status: 500, error: "Unable to send message." };
    default:
      return null;
  }
}
