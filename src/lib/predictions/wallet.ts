import { query } from "@/lib/db";

export async function creditUserPredictionPoints(input: {
  userId: string;
  amount: number;
  referenceId: string;
  note: string;
  partial?: boolean;
}) {
  const amount = Math.trunc(input.amount);
  if (amount <= 0) return;

  const updated = await query<{ points_balance: number }>(
    `UPDATE users
     SET points_balance = points_balance + $2,
         updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING points_balance`,
    [input.userId, amount]
  );

  const balanceAfter = updated.rows[0]?.points_balance;
  if (balanceAfter == null) return;

  await query(
    `INSERT INTO wallet_ledger (user_id, amount, balance_after, transaction_type, reference_id, note)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.userId,
      amount,
      balanceAfter,
      input.partial ? "prediction_partial" : "prediction_correct",
      input.referenceId,
      input.note.slice(0, 240)
    ]
  );
}
