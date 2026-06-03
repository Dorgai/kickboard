import type { FanChatDeliveryStatus } from "@/lib/fan-chat/store";

const LABELS: Record<FanChatDeliveryStatus, string> = {
  pending: "Sending",
  sent: "Sent",
  read: "Read"
};

export function FanChatMessageStatus({ status }: { status: FanChatDeliveryStatus }) {
  const label = LABELS[status];

  if (status === "pending") {
    return (
      <span aria-label={label} className="fan-chat-delivery fan-chat-delivery--pending" title={label}>
        <svg aria-hidden className="fan-chat-delivery-icon" viewBox="0 0 16 16">
          <circle cx="8" cy="8" fill="currentColor" r="2" />
        </svg>
      </span>
    );
  }

  if (status === "sent") {
    return (
      <span aria-label={label} className="fan-chat-delivery fan-chat-delivery--sent" title={label}>
        <svg aria-hidden className="fan-chat-delivery-icon" viewBox="0 0 16 16">
          <path
            d="M2.5 8.2 6.2 11.5 13.5 4.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      </span>
    );
  }

  return (
    <span aria-label={label} className="fan-chat-delivery fan-chat-delivery--read" title={label}>
      <svg aria-hidden className="fan-chat-delivery-icon fan-chat-delivery-icon--double" viewBox="0 0 20 16">
        <path
          d="M1.5 8.2 5.2 11.5 12.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M5.5 8.2 9.2 11.5 16.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    </span>
  );
}
