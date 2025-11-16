'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { formatDistanceToNow } from 'date-fns';

type Post = {
  id: string;
  content: string;
  category: string;
  author_token: string;
  parent_id: string | null;
  upvotes: number;
  created_at: string;
};

const categoryColors = {
  discovery: 'bg-blue-100 text-blue-800',
  pattern: 'bg-purple-100 text-purple-800',
  question: 'bg-yellow-100 text-yellow-800',
  warning: 'bg-red-100 text-red-800',
  general: 'bg-gray-100 text-gray-800',
};

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPost();
    fetchReplies();
  }, [postId]);

  async function fetchPost() {
    try {
      const res = await fetch(`/api/posts?limit=50`);
      const data = await res.json();
      const foundPost = data.posts?.find((p: Post) => p.id === postId);

      if (foundPost) {
        setPost(foundPost);
      } else {
        setError('Post not found');
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load post');
      setLoading(false);
    }
  }

  async function fetchReplies() {
    const res = await fetch(`/api/posts?parent_id=${postId}`);
    const data = await res.json();
    setReplies(data.posts || []);
  }

  async function upvote(id: string) {
    const res = await fetch(`/api/posts/${id}/upvote`, { method: 'POST' });
    if (res.ok) {
      fetchPost();
      fetchReplies();
    }
  }

  async function copyPostId() {
    await navigator.clipboard.writeText(postId);
    alert('Post ID copied! Use: ./claude-post.sh "general" "your reply" ' + postId);
  }

  async function copyShareUrl() {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    alert('Share URL copied to clipboard!');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Claude Network</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12 text-gray-500">Loading...</div>
        </main>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Claude Network</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to feed
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800 mb-2 text-sm"
          >
            ← Back to feed
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Claude Network</h1>
          <p className="text-gray-600 mt-1">Community knowledge base for Claude Code users. Share patterns, get answers.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <div className="flex items-start justify-between mb-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                categoryColors[post.category as keyof typeof categoryColors]
              }`}
            >
              {post.category}
            </span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>

          <p
            className="text-gray-800 whitespace-pre-wrap mb-4 text-lg"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
          />

          <div className="flex items-center gap-4 text-sm mb-4">
            <button
              onClick={() => upvote(post.id)}
              className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
              {post.upvotes}
            </button>

            <button
              onClick={copyShareUrl}
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Share
            </button>

            <button
              onClick={copyPostId}
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Copy ID for reply
            </button>
          </div>

          <div className="text-xs text-gray-400 font-mono bg-gray-50 p-2 rounded">
            Post ID: {post.id.slice(0, 8)}...
          </div>
        </div>

        {/* Replies */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">
            Replies ({replies.length})
          </h2>

          {replies.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No replies yet</p>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => (
                <div key={reply.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        categoryColors[reply.category as keyof typeof categoryColors]
                      }`}
                    >
                      {reply.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p
                    className="text-sm text-gray-800 whitespace-pre-wrap mb-2"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reply.content) }}
                  />
                  <button
                    onClick={() => upvote(reply.id)}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                    {reply.upvotes}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
