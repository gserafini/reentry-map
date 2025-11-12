# AI Usage Tracking & Budget Control

## Overview

Complete system for tracking Claude API usage, monitoring costs, and budgeting for large operations.

**Note:** This tracks **API usage only**. For zero-cost verification, use **Claude Web** instead (included in your Claude Max subscription). See [CLAUDE_WEB_PROMPTS.md](./CLAUDE_WEB_PROMPTS.md) for workflows.

### Verification Methods

**Claude Web (Zero Cost - Recommended)**

- Uses existing Claude Max subscription
- Manual verification with AI assistance
- More accurate than API (browses websites)
- No API credits required
- See [CLAUDE_WEB_PROMPTS.md](./CLAUDE_WEB_PROMPTS.md)

**Claude API (Requires Credits)**

- Automated verification
- ~$0.0012 per resource
- Good for periodic re-verification at scale
- Tracked by this system

## Features

### Real-Time Cost Tracking

- Per-API-call cost logging
- Token usage tracking (input + output)
- Provider-specific pricing (Claude Haiku 4.5)
- Operation-level cost attribution

### Budget Monitoring

- Monthly budget limits
- Visual budget progress bars
- Alerts when > 80% budget used
- Budget exceeded warnings

### Cost Projections

- Estimated cost for 100 resources
- Estimated cost for 1,000 resources (new county)
- Estimated cost for 10,000 resources (new state)
- Remaining budget display

## Setup

### 1. Add Anthropic API Key

**Get your API key:**

- Go to https://console.anthropic.com/settings/keys
- Create a new API key
- Copy the key (starts with `sk-ant-`)

**Add to environment:**

```bash
# In .env.local
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

### 2. Run Database Migrations

Run these in order in Supabase SQL Editor:

**Migration 1: Verification System**

```bash
# File: supabase/migrations/20250109000000_verification_system.sql
```

**Migration 2: AI Usage Tracking**

```bash
# File: supabase/migrations/20250109000001_ai_usage_tracking.sql
```

### 3. Restart Dev Server

```bash
# Kill current server
killall -9 node

# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

## Admin Dashboard

**URL:** `/admin/ai-usage`

### Dashboard Features

**Budget Status Card:**

- Current month spending vs limit
- Progress bar (green → yellow → red)
- Total API calls this month

**Stats Cards:**

- Total Cost (last N days)
- API Calls (total requests)
- Tokens Used (input + output)
- Avg Cost Per Call

**Usage Table:**

- Date breakdown
- Operation type (verification, enrichment, etc.)
- Provider (Anthropic/OpenAI)
- Model used
- API calls, tokens, cost

**Cost Projections:**

- 100 resources: ~$0.12
- 1,000 resources: ~$1.20
- 10,000 resources: ~$12.00
- Remaining budget

## Pricing

### Claude Haiku 4.5

- **Input**: $0.80 per 1M tokens
- **Output**: $4.00 per 1M tokens

### Typical Verification

- Input: ~1,300 tokens (prompt + website content)
- Output: ~50 tokens (JSON response)
- **Cost**: ~$0.0012 per verification

### Actual Costs at Scale

| Resources | AI Cost | Human Review  | Total  | Savings |
| --------- | ------- | ------------- | ------ | ------- |
| 100       | $0.12   | $7 (1 hr)     | $7.12  | 99%     |
| 1,000     | $1.20   | $66 (2.2 hrs) | $67.20 | 87%     |
| 10,000    | $12.00  | $660 (22 hrs) | $672   | 87%     |

## Budget Control

### Default Monthly Budget

- **Limit**: $50/month
- **Configurable** in `/app/admin/ai-usage/page.tsx`:
  ```typescript
  const MONTHLY_BUDGET_LIMIT = 50 // Change this value
  ```

### Budget Alerts

- **80% Warning** (yellow): You've used $40 of $50
- **100% Exceeded** (red): You've used $50 of $50

### Preventing Overruns

- Monitor dashboard regularly
- Check projections before large operations
- Adjust budget limit as needed

## Usage Tracking

### Database Schema

**Table: `ai_usage_logs`**

```sql
- operation_type: 'verification' | 'enrichment' | 'discovery'
- provider: 'anthropic' | 'openai'
- model: 'claude-haiku-4-20250514'
- input_tokens: INTEGER
- output_tokens: INTEGER
- total_tokens: (computed)
- input_cost_usd: DECIMAL
- output_cost_usd: DECIMAL
- total_cost_usd: (computed)
- operation_context: JSONB (metadata)
```

**Views:**

- `ai_usage_summary` - Daily aggregated stats
- `ai_budget_status` - Monthly budget tracking

### Automatic Logging

AI usage is logged automatically during verification:

- ✅ Tracked on every Claude API call
- ✅ Stored with resource/suggestion ID
- ✅ Cost calculated from actual token usage
- ✅ Never blocks verification (failures logged only)

## Testing the System

### 1. Submit Test Resource

```bash
curl -X POST http://localhost:3000/api/resources/suggest-batch \
  -H "Content-Type: application/json" \
  -d '{
    "resources": [{
      "name": "Test Resource",
      "address": "123 Main St",
      "city": "Oakland",
      "state": "CA",
      "zip": "94601",
      "phone": "(510) 555-1234",
      "website": "https://example.org",
      "primary_category": "employment"
    }],
    "submitter": "test_agent"
  }'
```

### 2. Check Logs

- Server console shows: `💰 Claude API: 1234 in + 56 out = $0.0012`
- Database: Query `ai_usage_logs` table
- Admin dashboard: Visit `/admin/ai-usage`

### 3. Verify Tracking

```sql
-- In Supabase SQL Editor
SELECT * FROM ai_usage_logs ORDER BY created_at DESC LIMIT 10;

SELECT * FROM ai_usage_summary WHERE date > NOW() - INTERVAL '7 days';

SELECT * FROM ai_budget_status;
```

## Cost Optimization Tips

### 1. Batch Operations

- Submit 100 resources at once
- Single API connection
- Reduced overhead

### 2. Skip Verification (if needed)

- For trusted sources (e.g., government databases)
- Add `skip_verification: true` flag
- Direct import without AI checks

### 3. Adjust Thresholds

- Increase auto-approve threshold (currently 0.85)
- Reduce verification depth for low-risk categories
- Configure field-specific cadence

### 4. Monitor Patterns

- Identify high-cost operations
- Optimize prompts to reduce tokens
- Cache common results

## Troubleshooting

### High Costs

**Symptoms**: Budget exceeded quickly
**Causes**:

- Large batch operations
- Inefficient prompts
- Repeated verifications

**Fixes**:

- Check `ai_usage_summary` for spikes
- Review recent operations
- Adjust verification frequency

### Missing Data

**Symptoms**: Dashboard shows $0
**Causes**:

- Migrations not run
- API key not set
- Logging failed

**Fixes**:

- Run both migrations
- Verify `ANTHROPIC_API_KEY` in `.env.local`
- Check server logs for errors

### Incorrect Costs

**Symptoms**: Costs don't match Claude pricing
**Causes**:

- Pricing constants outdated
- Token counting errors

**Fixes**:

- Update pricing in `verification-agent.ts`:
  ```typescript
  const inputCost = (response.usage.input_tokens / 1_000_000) * 0.8
  const outputCost = (response.usage.output_tokens / 1_000_000) * 4.0
  ```

## Future Enhancements

### Planned Features

- Budget alerts via email
- Automatic budget enforcement (stop at limit)
- Cost per resource type analysis
- Provider cost comparison
- Historical trend analysis
- Cost anomaly detection

### API Improvements

- Batch cost estimation API
- Pre-flight cost checks
- Operation approval workflows
- Budget allocation by category

## Support

For issues or questions:

- GitHub: https://github.com/gserafini/reentry-map
- Email: gserafini@gmail.com
