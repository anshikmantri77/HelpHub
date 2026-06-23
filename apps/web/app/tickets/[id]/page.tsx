'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTicket, useClaimTicket } from '../../../lib/queries/tickets';
import { useAuthStore } from '../../../lib/store';
import { TransitionActions } from '../../../components/TransitionActions';
import { AccessDenied } from '../../../components/AccessDenied';
import type { TicketInfo, UserInfo, Status, Comment } from '@helphub/shared';
import { apiFetch, ApiError } from '../../../lib/api-client';

function TicketDetailSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="mb-2 h-4 w-full animate-pulse rounded bg-gray-100" />
      <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-100" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
    </div>
  );
}

function ErrorDisplay({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded border border-red-300 bg-red-50 px-4 py-6 text-center">
        <p className="text-red-700">{message}</p>
        <button
          onClick={onRetry}
          className="mt-3 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

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
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  function loadComments() {
    if (!ticket || !user) return;
    setCommentsLoading(true);
    setCommentError(null);
    apiFetch<Comment[]>(`/tickets/${ticketId}/comments`)
      .then(setComments)
      .catch((err) =>
        setCommentError(err instanceof Error ? err.message : 'Failed to load comments'),
      )
      .finally(() => setCommentsLoading(false));
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentContent.trim()) return;
    setSubmittingComment(true);
    setCommentError(null);
    try {
      const newComment = await apiFetch<Comment>(`/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentContent, isInternal: commentIsInternal }),
      });
      setComments((prev) => [...prev, newComment]);
      setCommentContent('');
      setCommentIsInternal(false);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  }

  if (isLoading) return <TicketDetailSkeleton />;

  if (isError) {
    if (error instanceof ApiError && error.status === 403) {
      return <AccessDenied />;
    }
    return (
      <ErrorDisplay
        message={
          error instanceof Error ? error.message : 'Failed to load ticket'
        }
        onRetry={() => refetch()}
      />
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-gray-500">
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button
        onClick={() => router.push('/tickets')}
        className="mb-4 text-sm text-blue-600 underline"
      >
        &larr; Back to tickets
      </button>

      <h1 className="mb-2 text-2xl font-bold">{ticket.title}</h1>
      <div className="mb-4 flex gap-3 text-sm text-gray-500">
        <span className="capitalize">
          {ticket.status.replace('_', ' ')}
        </span>
        <span className="capitalize">{ticket.priority}</span>
        <span>{ticket.assigneeId ? 'Assigned' : 'Unassigned'}</span>
      </div>

      <p className="mb-6 whitespace-pre-wrap text-gray-700">
        {ticket.description}
      </p>

      {userInfo && (
        <div className="mb-6 flex gap-2">
          <TransitionActions ticket={ticketInfo} user={userInfo} />
          {(userInfo.role === 'agent' || userInfo.role === 'admin') &&
            !ticket.assigneeId && (
              <button
                onClick={() => claimMutation.mutate(ticketId)}
                disabled={claimMutation.isPending}
                className="rounded border border-green-600 px-3 py-1 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
              >
                {claimMutation.isPending ? 'Claiming...' : 'Claim'}
              </button>
            )}
        </div>
      )}

      <section className="border-t pt-6">
        <h2 className="mb-4 text-lg font-semibold">Comments</h2>

        <button
          onClick={loadComments}
          className="mb-4 text-sm text-blue-600 underline"
        >
          {comments.length > 0 ? 'Refresh comments' : 'Load comments'}
        </button>

        {commentsLoading && (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded bg-gray-100"
              />
            ))}
          </div>
        )}

        {commentError && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {commentError}
          </div>
        )}

        {!commentsLoading && comments.length === 0 && (
          <p className="mb-4 text-sm text-gray-500">No comments yet.</p>
        )}

        {comments.length > 0 && (
          <div className="mb-6 space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="rounded border bg-white px-4 py-3 text-sm">
                <p className="text-gray-700">{c.content}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(c.createdAt).toLocaleString()}
                  {c.isInternal && (
                    <span className="ml-2 text-yellow-600">Internal note</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        {userInfo && (
          <form onSubmit={handleAddComment} className="space-y-3">
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex items-center justify-between">
              {userInfo.role !== 'customer' && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={commentIsInternal}
                    onChange={(e) => setCommentIsInternal(e.target.checked)}
                  />
                  Internal note
                </label>
              )}
              <button
                type="submit"
                disabled={submittingComment || !commentContent.trim()}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingComment ? 'Posting...' : 'Post comment'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
