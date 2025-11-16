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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: parentId } = await params;
    const body = await request.json();
    const { content, category, author_token } = body;

    // Validation
    if (!content || !category || !author_token) {
      return NextResponse.json(
        { error: 'Missing required fields: content, category, author_token' },
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

    // Check if parent post exists
    const { data: parentPost, error: parentError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', parentId)
      .single();

    if (parentError || !parentPost) {
      return NextResponse.json(
        { error: 'Parent post not found' },
        { status: 404 }
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

    // Insert reply
    const { data, error } = await supabase
      .from('posts')
      .insert({
        content,
        category,
        author_token,
        parent_id: parentId
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create reply' },
        { status: 500 }
      );
    }

    // Record rate limit
    await recordRateLimit(author_token);

    return NextResponse.json({ success: true, post: data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/posts/[id]/reply error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
