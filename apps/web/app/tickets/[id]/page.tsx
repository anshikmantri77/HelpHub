'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTicket, useClaimTicket } from '../../../lib/queries/tickets';
import { useAuthStore } from '../../../lib/store';
import { TransitionActions } from '../../../components/TransitionActions';
import { AccessDenied } from '../../../components/AccessDenied';
import type { TicketInfo, UserInfo, Status, Comment } from '@helphub/shared';
import { apiFetch, ApiError } from '../../../lib/api-client';
import {
  formatRelativeTime,
  formatSlaDue,
  priorityMeta,
  statusLabel,
  statusClassName,
} from '../../../lib/utils';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TicketDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header block */}
      <div className="mb-6">
        <div className="mb-3 h-7 w-64 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
        <div className="mb-2 h-4 w-full animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
      </div>
      {/* Two-column layout skeleton */}
      <div className="flex gap-6">
        <div className="flex-1 space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        </div>
        <div className="w-56 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        </div>
      </div>
      {/* Comments skeleton */}
      <div className="mt-8 space-y-3 border-t pt-6">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}

// ─── Error state by status code ──────────────────────────────────────────────

function TicketError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="mb-1 text-sm font-mono font-medium uppercase tracking-wider text-gray-400">
          404 NOT_FOUND
        </p>
        <h2 className="mb-2 text-xl font-semibold text-gray-700">Ticket not found</h2>
        <p className="text-gray-500">
          This ticket doesn't exist or you don't have access to it.
        </p>
      </div>
    );
  }
  if (error instanceof ApiError && error.status === 403) {
    return (
      <AccessDenied reason="This ticket is assigned to another agent and is not visible to you." />
    );
  }
  const code = error instanceof ApiError ? error.code : 'ERROR';
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded border border-red-300 bg-red-50 px-6 py-10 text-center">
        <p className="mb-1 text-xs font-mono font-medium uppercase tracking-wider text-red-500">
          {code}
        </p>
        <p className="mb-4 text-red-700">{error.message}</p>
        <button
          onClick={onRetry}
          className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// ─── SLA badge ───────────────────────────────────────────────────────────────

function SlaBadge({ slaDueAt, slaBreached }: { slaDueAt: string | null; slaBreached: boolean }) {
  if (slaBreached) {
    return (
      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-red-700">
        SLA BREACHED
      </span>
    );
  }
  const meta = formatSlaDue(slaDueAt);
  if (!meta) return <span className="text-xs text-gray-400">No SLA</span>;
  const colorClass =
    meta.color === 'red'
      ? 'text-red-600'
      : meta.color === 'amber'
        ? 'text-amber-600'
        : 'text-green-700';
  return <span className={`text-sm ${colorClass}`}>{meta.label}</span>;
}

// ─── Comment item ─────────────────────────────────────────────────────────────

function CommentItem({ comment, userRole }: { comment: Comment; userRole: string }) {
  // Internal notes: only visible to agents/admins (enforced server-side too,
  // but we guard client-side for clarity)
  if (comment.isInternal && userRole === 'customer') return null;

  return (
    <div
      className={`rounded border px-4 py-3 text-sm ${
        comment.isInternal
          ? 'border-yellow-200 bg-yellow-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="font-mono text-xs text-gray-500">
          {comment.authorId.slice(0, 8)}
        </span>
        {comment.isInternal && (
          <span className="rounded bg-yellow-200 px-1.5 py-0.5 text-xs font-medium text-yellow-800">
            Internal note
          </span>
        )}
        <span
          className="ml-auto text-xs text-gray-400"
          title={new Date(comment.createdAt).toLocaleString()}
        >
          {formatRelativeTime(comment.createdAt)}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-gray-700">{comment.content}</p>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const { data: ticket, isLoading, isError, error, refetch } = useTicket(ticketId);
  const claimMutation = useClaimTicket();
  const user = useAuthStore((s) => s.user);

  const [commentContent, setCommentContent] = useState('');
  const [commentIsInternal, setCommentIsInternal] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-load comments when ticket is ready
  useEffect(() => {
    if (ticket && user && !commentsLoaded) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id, user?.id]);

  function loadComments() {
    if (!user) return;
    setCommentsLoading(true);
    setCommentError(null);
    apiFetch<Comment[]>(`/tickets/${ticketId}/comments`)
      .then((data) => {
        setComments(data);
        setCommentsLoaded(true);
      })
      .catch((err) =>
        setCommentError(err instanceof Error ? err.message : 'Failed to load comments'),
      )
      .finally(() => setCommentsLoading(false));
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentContent.trim()) return;
    setSubmittingComment(true);
    setSubmitError(null);
    try {
      const newComment = await apiFetch<Comment>(`/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentContent, isInternal: commentIsInternal }),
      });
      setComments((prev) => [...prev, newComment]);
      setCommentContent('');
      setCommentIsInternal(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  }

  if (isLoading) return <TicketDetailSkeleton />;

  if (isError) {
    return <TicketError error={error as Error} onRetry={() => refetch()} />;
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-gray-500">
        Ticket not found.
      </div>
    );
  }

  const ticketInfo: TicketInfo = {
    id: ticket.id,
    status: ticket.status as Status,
    requesterId: ticket.requesterId,
    assigneeId: ticket.assigneeId,
  };

  const userInfo: UserInfo | null = user
    ? { id: user.id, role: user.role as UserInfo['role'] }
    : null;

  const pMeta = priorityMeta(ticket.priority);
  const canClaim =
    userInfo &&
    (userInfo.role === 'agent' || userInfo.role === 'admin') &&
    !ticket.assigneeId;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Back link */}
      <button
        onClick={() => router.push('/tickets')}
        className="mb-4 text-sm text-blue-600 underline focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        ← Back to tickets
      </button>

      {/* Two-column layout: main content + metadata sidebar */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Main column */}
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-start gap-2">
            <h1 className="text-2xl font-bold">{ticket.title}</h1>
            {ticket.slaBreached && (
              <span className="mt-1 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-red-700">
                BREACH
              </span>
            )}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${statusClassName(ticket.status)}`}
            >
              {statusLabel(ticket.status)}
            </span>
            <span className={`text-sm capitalize ${pMeta.className}`}>
              {pMeta.label}
            </span>
          </div>

          <p className="mb-6 whitespace-pre-wrap text-gray-700">
            {ticket.description}
          </p>

          {/* Actions */}
          {userInfo && (
            <div className="mb-6 flex flex-wrap gap-2">
              <TransitionActions ticket={ticketInfo} user={userInfo} />
              {canClaim && (
                <button
                  onClick={() => claimMutation.mutate(ticketId)}
                  disabled={claimMutation.isPending}
                  aria-busy={claimMutation.isPending}
                  aria-label="Claim this ticket"
                  className="rounded border border-green-600 px-3 py-1 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {claimMutation.isPending ? (
                    <span className="flex items-center gap-1">
                      <span
                        className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-green-600 border-t-transparent motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                      Claiming...
                    </span>
                  ) : (
                    'Claim'
                  )}
                </button>
              )}
              {claimMutation.isError && (
                <p className="w-full text-xs text-red-600">
                  {claimMutation.error instanceof Error
                    ? claimMutation.error.message
                    : 'Failed to claim ticket'}
                </p>
              )}
            </div>
          )}

          {/* Comments section */}
          <section className="border-t pt-6" aria-label="Comments">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Comments</h2>
              <button
                onClick={loadComments}
                disabled={commentsLoading}
                className="text-xs text-blue-600 underline disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {commentsLoading ? 'Loading…' : 'Refresh'}
              </button>
            </div>

            {commentsLoading && (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded bg-gray-100 motion-reduce:animate-none"
                  />
                ))}
              </div>
            )}

            {commentError && (
              <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {commentError}
                <button
                  onClick={loadComments}
                  className="ml-2 underline focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  Retry
                </button>
              </div>
            )}

            {!commentsLoading && commentsLoaded && comments.length === 0 && (
              <p className="mb-4 text-sm text-gray-500">
                No comments yet. Be the first to add one.
              </p>
            )}

            {comments.length > 0 && (
              <div className="mb-6 space-y-3">
                {comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    userRole={userInfo?.role ?? 'customer'}
                  />
                ))}
              </div>
            )}

            {/* Comment form */}
            {userInfo && (
              <form onSubmit={handleAddComment} className="space-y-3" noValidate>
                <textarea
                  id="comment-content"
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Write a comment…"
                  rows={3}
                  disabled={submittingComment}
                  aria-label="Comment text"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {submitError && (
                  <p className="text-sm text-red-600" role="alert">
                    {submitError}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  {userInfo.role !== 'customer' && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={commentIsInternal}
                        onChange={(e) => setCommentIsInternal(e.target.checked)}
                        disabled={submittingComment}
                        className="focus:ring-2 focus:ring-blue-500"
                      />
                      Internal note
                    </label>
                  )}
                  <button
                    type="submit"
                    disabled={submittingComment || !commentContent.trim()}
                    aria-busy={submittingComment}
                    className="ml-auto rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {submittingComment ? 'Posting…' : 'Post comment'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        {/* Metadata sidebar */}
        <aside className="w-full shrink-0 space-y-4 rounded border border-gray-200 bg-white px-4 py-4 text-sm lg:w-56">
          <div>
            <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-gray-400">
              Status
            </p>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${statusClassName(ticket.status)}`}
            >
              {statusLabel(ticket.status)}
            </span>
          </div>

          <div>
            <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-gray-400">
              Priority
            </p>
            <span className={`capitalize ${pMeta.className}`}>{pMeta.label}</span>
          </div>

          <div>
            <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-gray-400">
              SLA
            </p>
            <SlaBadge slaDueAt={ticket.slaDueAt} slaBreached={ticket.slaBreached} />
          </div>

          <div>
            <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-gray-400">
              Requester
            </p>
            <span className="font-mono text-xs text-gray-600">
              {ticket.requesterId.slice(0, 8)}
            </span>
          </div>

          <div>
            <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-gray-400">
              Assignee
            </p>
            {ticket.assigneeId ? (
              <span className="font-mono text-xs text-gray-600">
                {ticket.assigneeId.slice(0, 8)}
              </span>
            ) : (
              <span className="text-gray-400 italic">Unassigned</span>
            )}
          </div>

          <div>
            <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-gray-400">
              Created
            </p>
            <span
              className="text-xs text-gray-600"
              title={new Date(ticket.createdAt).toLocaleString()}
            >
              {formatRelativeTime(ticket.createdAt)}
            </span>
          </div>

          <div>
            <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-gray-400">
              Updated
            </p>
            <span
              className="text-xs text-gray-600"
              title={new Date(ticket.updatedAt).toLocaleString()}
            >
              {formatRelativeTime(ticket.updatedAt)}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
