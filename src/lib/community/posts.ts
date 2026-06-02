import { query } from "@/lib/db";

export type CommunityPost = {
  id: string;
  postType: "text" | "squad_share" | "prediction" | "rating";
  body: string | null;
  authorDisplayName: string;
  authorUsername: string;
  createdAt: string;
  commentCount: number;
};

export type ModerationPost = CommunityPost & {
  moderationStatus: "approved" | "withheld" | "removed";
};

type PostRow = {
  id: string;
  post_type: string;
  body: string | null;
  display_name: string | null;
  username: string;
  created_at: Date;
  comment_count: number;
  moderation_status?: string;
};

function mapPost(row: PostRow): CommunityPost {
  return {
    id: row.id,
    postType: row.post_type as CommunityPost["postType"],
    body: row.body,
    authorDisplayName: row.display_name ?? row.username,
    authorUsername: row.username,
    createdAt: row.created_at.toISOString(),
    commentCount: row.comment_count
  };
}

export async function listApprovedPosts(limit = 40, fixtureKey?: string | null) {
  const key = fixtureKey?.trim().slice(0, 120);
  const result = key
    ? await query<PostRow>(
        `SELECT p.id, p.post_type, p.body, p.created_at, p.comment_count,
                u.username, u.display_name
         FROM posts p
         JOIN users u ON u.id = p.author_id
         WHERE p.deleted_at IS NULL
           AND p.moderation_status = 'approved'
           AND p.fixture_key = $2
         ORDER BY p.created_at DESC
         LIMIT $1`,
        [limit, key]
      )
    : await query<PostRow>(
        `SELECT p.id, p.post_type, p.body, p.created_at, p.comment_count,
                u.username, u.display_name
         FROM posts p
         JOIN users u ON u.id = p.author_id
         WHERE p.deleted_at IS NULL
           AND p.moderation_status = 'approved'
         ORDER BY p.created_at DESC
         LIMIT $1`,
        [limit]
      );

  return result.rows.map((row) => mapPost(row));
}

export async function createTextPost(authorId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed.length) throw new Error("EMPTY_BODY");
  if (trimmed.length > 280) throw new Error("BODY_TOO_LONG");

  const result = await query<{ id: string }>(
    `INSERT INTO posts (author_id, post_type, body, moderation_status)
     VALUES ($1, 'text', $2, 'withheld')
     RETURNING id`,
    [authorId, trimmed]
  );

  return result.rows[0];
}

export async function listPostsForModeration(limit = 50) {
  const result = await query<PostRow>(
    `SELECT p.id, p.post_type, p.body, p.created_at, p.comment_count, p.moderation_status,
            u.username, u.display_name
     FROM posts p
     JOIN users u ON u.id = p.author_id
     WHERE p.deleted_at IS NULL
       AND p.moderation_status IN ('withheld', 'removed')
     ORDER BY
       CASE p.moderation_status WHEN 'withheld' THEN 0 ELSE 1 END,
       p.created_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map((row) => ({
    ...mapPost(row),
    moderationStatus: row.moderation_status as ModerationPost["moderationStatus"]
  }));
}

export async function setPostModerationStatus(
  postId: string,
  status: "approved" | "withheld" | "removed"
) {
  const result = await query<{ id: string }>(
    `UPDATE posts
     SET moderation_status = $2
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [postId, status]
  );

  if (!result.rowCount) throw new Error("POST_NOT_FOUND");
}

export async function reportPost(
  postId: string,
  reporterId: string | null,
  reason: "spam" | "harassment" | "off_topic" | "other",
  details?: string
) {
  await query(
    `INSERT INTO content_reports (post_id, reporter_id, reason, details)
     VALUES ($1, $2, $3, $4)`,
    [postId, reporterId, reason, details?.trim().slice(0, 500) ?? null]
  );

  await query(
    `UPDATE posts SET moderation_status = 'withheld'
     WHERE id = $1 AND moderation_status = 'approved'`,
    [postId]
  );
}
