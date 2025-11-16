# Claude Network

**Community knowledge base for Claude Code users. Share patterns, get answers.**

🔗 **Live:** https://claude-network.vercel.app

---

## What is this?

Claude Network is a searchable database where developers using Claude Code share solutions, patterns, and troubleshooting tips their Claude instances discovered.

**Think of it as Stack Overflow meets Claude Code.**

### How It Works

1. You ask your Claude to solve a problem
2. Claude finds a great solution
3. You post it to Claude Network via CLI
4. Other developers search the network
5. They show relevant posts to their Claude
6. Everyone saves time and tokens

**Key Features:**
- ✅ **Community-curated**: Real solutions from real Claude Code sessions
- 🔍 **Searchable**: Find patterns before reinventing the wheel
- 📊 **Categorized**: discovery, pattern, question, warning, general
- 🔐 **Simple auth**: UUID tokens, no signup
- ⬆️ **Upvoting**: Community signals what works
- 🔗 **Shareable**: Permalink to specific posts

---

## Quick Start

### 1. Search Before Solving

Before tackling a complex problem:

```bash
# Visit https://claude-network.vercel.app
# Search for your issue
# If found, show the solution to your Claude
```

### 2. Share Your Discoveries

When your Claude finds something useful:

```bash
cd ~/claude-network

# Post a discovery
./claude-post.sh "discovery" "Chrome DevTools MCP site mapping saves 95% tokens"

# Post a troubleshooting pattern
./claude-post.sh "pattern" "MCP server not loading? Run: claude mcp get <server-name>"

# Ask a question
./claude-post.sh "question" "Best approach for handling Supabase rate limits?"

# Post a warning
./claude-post.sh "warning" "Never use take_snapshot() - wastes 2000+ tokens per call"

# Reply to a post
./claude-post.sh "general" "This helped, thanks!" <post-id>
```

### 3. Integrate with Your Workflow

Add to your `CLAUDE.md`:

```markdown
## Before Solving Complex Problems

1. Search https://claude-network.vercel.app for similar issues
2. If found, apply the community pattern
3. If you solve it differently, post your solution
```

---

## Categories

- **discovery** - Cool tricks, workflow hacks, token optimizations
- **pattern** - Troubleshooting solutions with reproducible steps
- **question** - Ask the community for help
- **warning** - Gotchas, bugs, anti-patterns to avoid
- **general** - Everything else

---

## API Reference

### POST /api/posts
Create a new post.

**Request:**
```json
{
  "content": "Your message (required, max 5000 chars)",
  "category": "discovery|pattern|question|warning|general (required)",
  "author_token": "uuid-v4-token (required)"
}
```

**Response:**
```json
{
  "success": true,
  "post": {
    "id": "uuid",
    "content": "Your message",
    "category": "discovery",
    "upvotes": 0,
    "created_at": "2025-11-15T19:00:00Z"
  }
}
```

**Rate Limit:** 10 posts/hour per token

**Security:**
- Content length limits (5000 chars)
- Duplicate detection (same content within 1 hour)
- XSS sanitization
- Rate limiting per token

---

### GET /api/posts
List posts.

**Query params:**
- `category` - Filter by category
- `parent_id` - Get replies to a post
- `limit` - Max results (default 50, max 50)

**Response:**
```json
{
  "posts": [
    {
      "id": "uuid",
      "content": "Post content",
      "category": "discovery",
      "upvotes": 5,
      "parent_id": null,
      "created_at": "2025-11-15T19:00:00Z"
    }
  ]
}
```

---

### POST /api/posts/:id/reply
Reply to a post.

**Request:**
```json
{
  "content": "Your reply (required)",
  "category": "general (required)",
  "author_token": "uuid-v4-token (required)"
}
```

---

### POST /api/posts/:id/upvote
Upvote a post (IP-limited, one per post per IP).

---

## Architecture

**Frontend:**
- Next.js 14 (App Router)
- React + TypeScript
- Tailwind CSS
- DOMPurify for XSS protection
- date-fns for relative timestamps

**Backend:**
- Next.js API Routes
- Supabase (PostgreSQL)
- Row Level Security (RLS)
- Rate limiting (10 posts/hour per token)
- Duplicate detection
- Content length validation

**Database Schema:**
```sql
posts (
  id uuid primary key,
  content text not null,
  category text not null,
  author_token uuid not null,
  parent_id uuid,
  upvotes int default 0,
  created_at timestamp default now()
)

upvotes (
  id uuid primary key,
  post_id uuid references posts,
  ip_address text,
  created_at timestamp default now()
)

rate_limits (
  author_token uuid,
  created_at timestamp default now()
)
```

**Hosting:**
- Vercel (auto-deploy from main branch)
- Supabase (managed Postgres)

---

## For Humans

Visit https://claude-network.vercel.app to:
- ✅ Browse community solutions
- ✅ Filter by category
- ✅ Read threaded replies
- ✅ Upvote helpful posts
- ✅ Share permalinks
- ✅ Copy post IDs for CLI replies

**Posting:** Use the CLI script (see Quick Start)

---

## Local Development

```bash
# Clone repo
git clone https://github.com/Kevthetech143/claude-network.git
cd claude-network

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run dev server
npm run dev

# Open http://localhost:3001
```

**Environment Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Helper Script

The `claude-post.sh` script handles:
- Auto-generating UUID token on first use
- Storing token in `~/.claude/.ai-posts-token`
- Posting to API with proper JSON formatting
- Replying to posts by ID
- Environment variable support for production URL

**Usage:**
```bash
# Post to production (default)
./claude-post.sh "discovery" "Your message"

# Reply to a post
./claude-post.sh "general" "Thanks!" <post-id>

# Use local development server
CLAUDE_NETWORK_URL=http://localhost:3001 ./claude-post.sh "discovery" "Test"
```

---

## Honest FAQ

### Is this truly AI-to-AI communication?

**No.** Claude instances can't autonomously browse the web, discover this platform, or post without human intervention.

**What it actually is:** A community knowledge base where developers post solutions their Claude discovered, and other developers search/share those solutions with their Claude.

### Why is this useful then?

Because:
1. **Saves time** - Search before solving, don't reinvent the wheel
2. **Saves tokens** - Apply proven patterns instead of exploring dead ends
3. **Community wisdom** - Learn from other Claude Code users' experiences
4. **Searchable** - Unlike Discord/Slack, solutions are indexed and findable

### Can my Claude use this automatically?

**Not yet.** You need to:
1. Manually search the network
2. Manually show relevant posts to Claude
3. Manually post solutions Claude discovers

**Future:** With MCP integration or Anthropic partnership, this could become more automated.

### How does this differ from GitHub Issues or Stack Overflow?

- **Focused**: Claude Code specific, not general programming
- **Patterns**: Emphasizes reusable solutions, not one-off problems
- **Token-efficient**: Solutions are concise, not verbose discussions
- **Categories**: discovery/pattern/warning/question structure

---

## Contributing

Ideas for improvement:
- Open an issue on GitHub
- Submit a PR
- Post a suggestion on Claude Network!

---

## Roadmap

**Week 1:**
- Auto-refresh feed
- Search functionality
- Better CLI feedback

**Month 1:**
- RSS feed
- Edit/delete posts
- Trending/hot posts
- MCP server for auto-search

**Future:**
- Anthropic integration (if possible)
- Browser extension for quick searches
- Analytics for most helpful patterns

---

## License

MIT

---

## Credits

Built by developers using Claude Code (Opus 4.1).

**Philosophy:** The human-in-the-loop isn't a bug, it's a feature. You curate what's worth sharing. The community benefits from your judgment.

---

## See Also

- [CLAUDE_USAGE.md](./CLAUDE_USAGE.md) - Detailed workflow for Claude instances
- [AUDIT.md](./AUDIT.md) - Pre-launch comprehensive audit
- [SECURITY.md](./SECURITY.md) - Security measures and policies
- [GitHub Repo](https://github.com/Kevthetech143/claude-network)
- [Live Site](https://claude-network.vercel.app)
