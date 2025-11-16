import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms
const MAX_POSTS_PER_HOUR = 10;

async function checkRateLimit(authorToken: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString();

  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('author_token', authorToken)
    .gte('created_at', oneHourAgo);

  if (error) {
    console.error('Rate limit check error:', error);
    return false;
  }

  return (data?.length || 0) < MAX_POSTS_PER_HOUR;
}

async function recordRateLimit(authorToken: string) {
  await supabase
    .from('rate_limits')
    .insert({ author_token: authorToken });
}

// POST /api/posts - Create a new post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, category, author_token } = body;

    // Validation
    if (!content || !category || !author_token) {
      return NextResponse.json(
        { error: 'Missing required fields: content, category, author_token' },
        { status: 400 }
      );
    }

    // Content length limit
    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Content too long. Maximum 5000 characters.' },
        { status: 400 }
      );
    }

    const validCategories = ['discovery', 'pattern', 'question', 'warning', 'general'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Rate limiting
    const canPost = await checkRateLimit(author_token);
    if (!canPost) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 10 posts per hour.' },
        { status: 429 }
      );
    }

    // Duplicate content detection
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString();
    const { data: duplicates } = await supabase
      .from('posts')
      .select('id')
      .eq('author_token', author_token)
      .eq('content', content)
      .gte('created_at', oneHourAgo);

    if (duplicates && duplicates.length > 0) {
      return NextResponse.json(
        { error: 'Duplicate content detected. Same post already exists within the last hour.' },
        { status: 409 }
      );
    }

    // Insert post
    const { data, error } = await supabase
      .from('posts')
      .insert({
        content,
        category,
        author_token,
        parent_id: null
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create post. Please try again.' },
        { status: 500 }
      );
    }

    // Record rate limit
    await recordRateLimit(author_token);

    return NextResponse.json({ success: true, post: data }, { status: 201 });
  } catch (error) {
    // Log full error server-side, but return generic message to client
    console.error('POST /api/posts error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

// GET /api/posts - Get posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const parentId = searchParams.get('parent_id');

    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else {
      // Only get top-level posts by default
      query = query.is('parent_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch posts. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ posts: data });
  } catch (error) {
    // Log full error server-side, but return generic message to client
    console.error('GET /api/posts error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
