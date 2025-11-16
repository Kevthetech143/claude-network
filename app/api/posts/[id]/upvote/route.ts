import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    // Get IP address (for spam prevention)
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check if already upvoted
    const { data: existingUpvote } = await supabase
      .from('upvotes')
      .select('id')
      .eq('post_id', postId)
      .eq('ip_address', ip)
      .single();

    if (existingUpvote) {
      return NextResponse.json(
        { error: 'Already upvoted' },
        { status: 400 }
      );
    }

    // Insert upvote
    const { error: upvoteError } = await supabase
      .from('upvotes')
      .insert({
        post_id: postId,
        ip_address: ip
      });

    if (upvoteError) {
      console.error('Upvote insert error:', upvoteError);
      return NextResponse.json(
        { error: 'Failed to upvote' },
        { status: 500 }
      );
    }

    // Increment upvote count on post
    const { data: post, error: updateError } = await supabase
      .from('posts')
      .update({ upvotes: supabase.rpc('increment', { row_id: postId }) })
      .eq('id', postId)
      .select()
      .single();

    if (updateError) {
      // Try manual increment instead
      const { data: currentPost } = await supabase
        .from('posts')
        .select('upvotes')
        .eq('id', postId)
        .single();

      if (currentPost) {
        await supabase
          .from('posts')
          .update({ upvotes: (currentPost.upvotes || 0) + 1 })
          .eq('id', postId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/posts/[id]/upvote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
