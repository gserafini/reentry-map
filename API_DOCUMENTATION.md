# Reentry Map - API Documentation

## Overview

This document describes the Reentry Map REST API endpoints, authentication,
request/response formats, and error handling.

## Base URL
```
Development: http://localhost:3000/api
Production: https://reentry-map.vercel.app/api
```

## Authentication

Most endpoints require authentication via Supabase session cookies.

### Authentication Flow

1. **Sign In** - Request OTP code
2. **Verify** - Submit OTP code to create session
3. **Session** - Session cookie automatically sent with requests
4. **Sign Out** - Clear session

### Headers
```http
Content-Type: application/json
Cookie: sb-access-token=...; sb-refresh-token=...
```

## Rate Limiting

- **Anonymous**: 60 requests per minute
- **Authenticated**: 300 requests per minute
- **Admin**: 600 requests per minute

## Common Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  }
}
```

---

## Resources API

### List Resources

Get a paginated list of active resources.

**Endpoint**: `GET /api/resources`

**Query Parameters**:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `search` | string | Search by name, description, tags | - |
| `category` | string | Filter by primary category | - |
| `categories` | string[] | Filter by multiple categories (comma-separated) | - |
| `lat` | number | User latitude for distance calculation | - |
| `lng` | number | User longitude for distance calculation | - |
| `radius` | number | Search radius in miles (requires lat/lng) | 25 |
| `page` | number | Page number | 1 |
| `limit` | number | Results per page (max 100) | 20 |
| `sort` | string | Sort by: `name`, `distance`, `rating`, `created_at` | `name` |
| `order` | string | Sort order: `asc`, `desc` | `asc` |

**Example Request**:
```http
GET /api/resources?search=employment&lat=37.8044&lng=-122.2712&radius=10&sort=distance&limit=20
```

**Example Response**:
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Hope Employment Center",
      "description": "Job placement services for people with criminal records",
      "address": "123 Main St, Oakland, CA 94612",
      "city": "Oakland",
      "state": "CA",
      "zip": "94612",
      "latitude": 37.8044,
      "longitude": -122.2712,
      "phone": "(510) 555-0100",
      "website": "https://example.com",
      "primary_category": "employment",
      "categories": ["employment", "education"],
      "tags": ["job training", "resume help", "second chance"],
      "hours": {
        "monday": {"open": "09:00", "close": "17:00"},
        "tuesday": {"open": "09:00", "close": "17:00"},
        "wednesday": {"open": "09:00", "close": "17:00"},
        "thursday": {"open": "09:00", "close": "17:00"},
        "friday": {"open": "09:00", "close": "17:00"}
      },
      "rating_average": 4.5,
      "rating_count": 10,
      "review_count": 8,
      "verified": true,
      "distance": 2.3,
      "photos": [
        {
          "url": "https://storage.supabase.co/...",
          "caption": "Front entrance"
        }
      ],
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasMore": true
  }
}
```

---

### Get Resource

Get detailed information about a specific resource.

**Endpoint**: `GET /api/resources/:id`

**Example Request**:
```http
GET /api/resources/550e8400-e29b-41d4-a716-446655440000
```

**Example Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Hope Employment Center",
  "description": "Job placement services for people with criminal records...",
  "services_offered": [
    "Resume writing assistance",
    "Interview preparation",
    "Job placement",
    "Follow-up support"
  ],
  "address": "123 Main St, Oakland, CA 94612",
  "city": "Oakland",
  "state": "CA",
  "zip": "94612",
  "latitude": 37.8044,
  "longitude": -122.2712,
  "phone": "(510) 555-0100",
  "email": "info@example.com",
  "website": "https://example.com",
  "primary_category": "employment",
  "categories": ["employment", "education"],
  "tags": ["job training", "resume help", "second chance"],
  "hours": {
    "monday": {"open": "09:00", "close": "17:00"},
    "tuesday": {"open": "09:00", "close": "17:00"},
    "wednesday": {"open": "09:00", "close": "17:00"},
    "thursday": {"open": "09:00", "close": "17:00"},
    "friday": {"open": "09:00", "close": "17:00"}
  },
  "eligibility_requirements": "Open to all adults seeking employment",
  "accepts_records": true,
  "appointment_required": false,
  "rating_average": 4.5,
  "rating_count": 10,
  "review_count": 8,
  "verified": true,
  "verified_date": "2025-01-15T00:00:00Z",
  "photos": [
    {
      "url": "https://storage.supabase.co/...",
      "caption": "Front entrance"
    }
  ],
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-20T14:30:00Z"
}
```

**Error Responses**:
```json
{
  "error": "Resource not found",
  "code": "RESOURCE_NOT_FOUND"
}
```

---

### Create Resource (Admin Only)

Create a new resource.

**Endpoint**: `POST /api/resources`

**Authentication**: Required (Admin)

**Request Body**:
```json
{
  "name": "New Resource Center",
  "description": "Helping people succeed",
  "address": "456 Oak Ave, Oakland, CA 94601",
  "phone": "(510) 555-0200",
  "website": "https://example.org",
  "primary_category": "housing",
  "categories": ["housing"],
  "services_offered": ["Emergency shelter", "Case management"],
  "hours": {
    "monday": {"open": "08:00", "close": "20:00"}
  },
  "eligibility_requirements": "Adults 18+",
  "accepts_records": true
}
```

**Validation**:
- `name`: Required, 1-200 characters
- `address`: Required, will be geocoded automatically
- `primary_category`: Required, must be valid category
- `phone`: Must match format (XXX) XXX-XXXX
- `website`: Must be valid URL

**Example Response**:
```json
{
  "id": "660f9500-f39c-52e5-b827-557766550111",
  "name": "New Resource Center",
  "latitude": 37.7850,
  "longitude": -122.2364,
  "status": "active",
  "verified": false,
  "created_at": "2025-01-22T15:00:00Z"
}
```

**Error Responses**:
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```
```json
{
  "error": "Admin access required",
  "code": "FORBIDDEN"
}
```
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "name": "Name is required",
    "phone": "Invalid phone format"
  }
}
```

---

### Update Resource (Admin Only)

Update an existing resource.

**Endpoint**: `PATCH /api/resources/:id`

**Authentication**: Required (Admin)

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "phone": "(510) 555-9999",
  "hours": {
    "monday": {"open": "09:00", "close": "18:00"}
  },
  "verified": true
}
```

**Example Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Name",
  "updated_at": "2025-01-22T16:00:00Z"
}
```

---

### Delete Resource (Admin Only)

Soft delete a resource (sets status to 'inactive').

**Endpoint**: `DELETE /api/resources/:id`

**Authentication**: Required (Admin)

**Example Response**:
```json
{
  "message": "Resource deleted successfully",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Favorites API

### Get User Favorites

Get list of user's favorite resources.

**Endpoint**: `GET /api/favorites`

**Authentication**: Required

**Example Response**:
```json
{
  "data": [
    {
      "id": "770g0600-g49d-63f6-c938-668877661222",
      "resource_id": "550e8400-e29b-41d4-a716-446655440000",
      "notes": "Great job placement program",
      "created_at": "2025-01-20T10:00:00Z",
      "resource": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Hope Employment Center",
        "address": "123 Main St, Oakland, CA 94612",
        "primary_category": "employment",
        "rating_average": 4.5
      }
    }
  ]
}
```

---

### Add Favorite

Add a resource to user's favorites.

**Endpoint**: `POST /api/resources/:id/favorite`

**Authentication**: Required

**Request Body** (optional):
```json
{
  "notes": "Remember to bring resume"
}
```

**Example Response**:
```json
{
  "message": "Resource added to favorites",
  "favorite_id": "770g0600-g49d-63f6-c938-668877661222"
}
```

**Error Responses**:
```json
{
  "error": "Resource already in favorites",
  "code": "ALREADY_FAVORITED"
}
```

---

### Remove Favorite

Remove a resource from user's favorites.

**Endpoint**: `DELETE /api/resources/:id/favorite`

**Authentication**: Required

**Example Response**:
```json
{
  "message": "Resource removed from favorites"
}
```

---

## Ratings API

### Add/Update Rating

Rate a resource (1-5 stars).

**Endpoint**: `POST /api/resources/:id/rate`

**Authentication**: Required

**Request Body**:
```json
{
  "rating": 5
}
```

**Validation**:
- `rating`: Required, integer between 1-5

**Example Response**:
```json
{
  "message": "Rating submitted successfully",
  "rating": 5,
  "resource_rating_average": 4.6,
  "resource_rating_count": 11
}
```

**Note**: One rating per user per resource. Subsequent requests update the existing rating.

---

## Reviews API

### Get Reviews

Get reviews for a specific resource.

**Endpoint**: `GET /api/resources/:id/reviews`

**Query Parameters**:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | number | Page number | 1 |
| `limit` | number | Reviews per page | 20 |
| `sort` | string | Sort by: `helpful`, `recent`, `rating` | `helpful` |

**Example Response**:
```json
{
  "data": [
    {
      "id": "880h1711-h50e-74g7-d049-779988772333",
      "resource_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "user-uuid",
      "rating": 5,
      "review_text": "Excellent service! They helped me find a job within 2 weeks.",
      "visited_date": "2025-01-10",
      "was_helpful": true,
      "would_recommend": true,
      "tips": "Bring multiple copies of your resume and dress professionally.",
      "helpful_count": 12,
      "not_helpful_count": 1,
      "created_at": "2025-01-15T14:00:00Z",
      "user": {
        "name": "John D."
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "hasMore": false
  }
}
```

---

### Create Review

Write a review for a resource.

**Endpoint**: `POST /api/resources/:id/review`

**Authentication**: Required

**Request Body**:
```json
{
  "rating": 5,
  "review_text": "Excellent service!",
  "visited_date": "2025-01-10",
  "was_helpful": true,
  "would_recommend": true,
  "pros": "Quick response, professional staff",
  "cons": "Limited hours on weekends",
  "tips": "Call ahead to confirm hours"
}
```

**Validation**:
- `rating`: Required, 1-5
- `review_text`: Optional, max 1000 characters
- `tips`: Optional, max 500 characters

**Example Response**:
```json
{
  "message": "Review submitted successfully",
  "review_id": "880h1711-h50e-74g7-d049-779988772333"
}
```

**Error Responses**:
```json
{
  "error": "You have already reviewed this resource",
  "code": "ALREADY_REVIEWED"
}
```

---

### Update Review

Update your own review.

**Endpoint**: `PATCH /api/reviews/:id`

**Authentication**: Required (must be review author)

**Request Body** (all fields optional):
```json
{
  "rating": 4,
  "review_text": "Updated review text",
  "tips": "Updated tips"
}
```

**Example Response**:
```json
{
  "message": "Review updated successfully",
  "updated_at": "2025-01-22T10:00:00Z"
}
```

---

### Mark Review Helpful

Vote on review helpfulness.

**Endpoint**: `POST /api/reviews/:id/helpful`

**Authentication**: Required

**Request Body**:
```json
{
  "helpful": true
}
```

**Example Response**:
```json
{
  "message": "Vote recorded",
  "helpful_count": 13
}
```

**Note**: One vote per user per review. Subsequent requests update the vote.

---

## Suggestions API

### Submit Resource Suggestion

Suggest a new resource to be added.

**Endpoint**: `POST /api/suggestions`

**Authentication**: Required

**Request Body**:
```json
{
  "name": "Suggested Resource",
  "address": "789 Pine St, Oakland, CA",
  "phone": "(510) 555-0300",
  "website": "https://example.net",
  "description": "They provide great housing services",
  "category": "housing",
  "reason": "I used their services and they really helped me",
  "personal_experience": "They helped me find affordable housing within a week"
}
```

**Validation**:
- `name`: Required, 1-200 characters
- `address`: Required
- `description`: Required, 1-1000 characters
- `category`: Required, must be valid category

**Example Response**:
```json
{
  "message": "Suggestion submitted successfully. We'll review it soon!",
  "suggestion_id": "990i2822-i61f-85h8-e150-880099883444"
}
```

---

### Get User Suggestions

Get list of user's submitted suggestions.

**Endpoint**: `GET /api/suggestions/my-suggestions`

**Authentication**: Required

**Example Response**:
```json
{
  "data": [
    {
      "id": "990i2822-i61f-85h8-e150-880099883444",
      "name": "Suggested Resource",
      "status": "pending",
      "created_at": "2025-01-20T12:00:00Z"
    }
  ]
}
```

---

## Admin API

### Get Suggestions (Admin)

Get all pending resource suggestions.

**Endpoint**: `GET /api/admin/suggestions`

**Authentication**: Required (Admin)

**Query Parameters**:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `status` | string | Filter by status: `pending`, `approved`, `rejected` | `pending` |

**Example Response**:
```json
{
  "data": [
    {
      "id": "990i2822-i61f-85h8-e150-880099883444",
      "name": "Suggested Resource",
      "address": "789 Pine St",
      "description": "Housing services",
      "suggested_by": "user-uuid",
      "reason": "Used their services",
      "status": "pending",
      "created_at": "2025-01-20T12:00:00Z",
      "user": {
        "name": "Jane Doe",
        "phone": "555-1234"
      }
    }
  ]
}
```

---

### Approve Suggestion (Admin)

Approve a suggestion and create the resource.

**Endpoint**: `POST /api/admin/suggestions/:id/approve`

**Authentication**: Required (Admin)

**Request Body** (optional):
```json
{
  "review_notes": "Verified with organization, looks good"
}
```

**Example Response**:
```json
{
  "message": "Suggestion approved and resource created",
  "resource_id": "aa0j3933-j72g-96i9-f261-991100994555"
}
```

**Note**: This will:
1. Create the resource in the database
2. Mark suggestion as approved
3. Trigger AI enrichment agent automatically
4. Link created resource to suggestion

---

### Reject Suggestion (Admin)

Reject a suggestion.

**Endpoint**: `POST /api/admin/suggestions/:id/reject`

**Authentication**: Required (Admin)

**Request Body** (optional):
```json
{
  "review_notes": "Duplicate of existing resource"
}
```

**Example Response**:
```json
{
  "message": "Suggestion rejected"
}
```

---

## AI Agents API

### Enrich Resource (Admin)

Manually trigger AI enrichment for a resource.

**Endpoint**: `POST /api/agents/enrich`

**Authentication**: Required (Admin)

**Request Body**:
```json
{
  "resource_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Example Response**:
```json
{
  "message": "Enrichment started",
  "job_id": "enrichment-job-123",
  "status": "processing"
}
```

**Process**:
1. Geocode address (if not already done)
2. Scrape website for additional info
3. Get photos from Google Maps
4. Get hours from Google Business
5. Auto-categorize based on description
6. Generate tags
7. Calculate completeness score

**Completion** (check status endpoint):
```json
{
  "job_id": "enrichment-job-123",
  "status": "completed",
  "updates": {
    "photos_added": 3,
    "categories_assigned": ["employment", "education"],
    "tags_generated": ["job training", "resume help"],
    "completeness_score": 0.85
  }
}
```

---

### Verify Resources (Admin)

Manually trigger verification for resources.

**Endpoint**: `POST /api/agents/verify`

**Authentication**: Required (Admin)

**Request Body** (optional):
```json
{
  "resource_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660f9500-f39c-52e5-b827-557766550111"
  ]
}
```

**Note**: If no `resource_ids` provided, verifies all resources not verified in past 90 days.

**Example Response**:
```json
{
  "message": "Verification started",
  "job_id": "verification-job-456",
  "resources_to_verify": 50
}
```

**Verification Checks**:
- Phone number still works
- Website still accessible
- Business status (not permanently closed)
- Hours still accurate
- Address still valid

---

### Discover Resources (Admin)

Trigger AI discovery of new resources.

**Endpoint**: `POST /api/agents/discover`

**Authentication**: Required (Admin)

**Request Body**:
```json
{
  "city": "Oakland",
  "state": "CA",
  "category": "employment"
}
```

**Example Response**:
```json
{
  "message": "Discovery started",
  "job_id": "discovery-job-789"
}
```

**Process**:
1. Search 211 directory
2. Search Google for reentry services
3. Scrape government websites
4. Deduplicate against existing resources
5. Validate with AI
6. Create pending suggestions for review

---

## Authentication API

### Request OTP

Request OTP code sent via SMS.

**Endpoint**: `POST /api/auth/otp`

**Request Body**:
```json
{
  "phone": "+15551234567"
}
```

**Validation**:
- Phone must be valid US format
- Rate limited: 3 requests per phone per hour

**Example Response**:
```json
{
  "message": "OTP sent to +1 (555) 123-4567"
}
```

**Error Responses**:
```json
{
  "error": "Too many OTP requests. Please wait before trying again.",
  "code": "RATE_LIMITED",
  "retry_after": 3600
}
```
```json
{
  "error": "Invalid phone number",
  "code": "INVALID_PHONE"
}
```

---

### Verify OTP

Verify OTP code and create session.

**Endpoint**: `POST /api/auth/verify`

**Request Body**:
```json
{
  "phone": "+15551234567",
  "code": "123456"
}
```

**Example Response**:
```json
{
  "message": "Authentication successful",
  "user": {
    "id": "user-uuid",
    "phone": "+15551234567",
    "name": null,
    "created_at": "2025-01-22T10:00:00Z"
  }
}
```

**Note**: Sets session cookies automatically

**Error Responses**:
```json
{
  "error": "Invalid or expired code",
  "code": "INVALID_CODE"
}
```

---

### Get Current User

Get authenticated user's profile.

**Endpoint**: `GET /api/auth/me`

**Authentication**: Required

**Example Response**:
```json
{
  "id": "user-uuid",
  "phone": "+15551234567",
  "name": "John Doe",
  "is_admin": false,
  "created_at": "2025-01-22T10:00:00Z"
}
```

**Error Responses**:
```json
{
  "error": "Not authenticated",
  "code": "UNAUTHORIZED"
}
```

---

### Update Profile

Update user's profile information.

**Endpoint**: `PATCH /api/auth/profile`

**Authentication**: Required

**Request Body**:
```json
{
  "name": "John Doe"
}
```

**Example Response**:
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "updated_at": "2025-01-22T11:00:00Z"
  }
}
```

---

### Sign Out

End user session.

**Endpoint**: `POST /api/auth/signout`

**Authentication**: Required

**Example Response**:
```json
{
  "message": "Signed out successfully"
}
```

**Note**: Clears session cookies

---

## Analytics API (Admin)

### Get Dashboard Stats

Get key metrics for admin dashboard.

**Endpoint**: `GET /api/admin/stats`

**Authentication**: Required (Admin)

**Example Response**:
```json
{
  "resources": {
    "total": 156,
    "active": 150,
    "pending": 6,
    "verified": 142
  },
  "users": {
    "total": 234,
    "active_this_month": 89,
    "new_this_week": 12
  },
  "engagement": {
    "searches_today": 45,
    "reviews_this_week": 8,
    "favorites_this_week": 23
  },
  "suggestions": {
    "pending": 5,
    "approved_this_month": 12,
    "rejected_this_month": 3
  },
  "ai_agents": {
    "last_discovery": "2025-01-20T00:00:00Z",
    "last_verification": "2025-01-21T00:00:00Z",
    "resources_discovered": 15,
    "resources_verified": 50
  }
}
```

---

## Webhooks (Optional)

### Resource Updated Webhook

Triggered when resource is created or updated.

**Payload**:
```json
{
  "event": "resource.updated",
  "timestamp": "2025-01-22T15:00:00Z",
  "data": {
    "resource_id": "550e8400-e29b-41d4-a716-446655440000",
    "action": "updated",
    "changed_fields": ["phone", "hours"],
    "updated_by": "admin-user-uuid"
  }
}
```

### Review Created Webhook

Triggered when new review submitted.

**Payload**:
```json
{
  "event": "review.created",
  "timestamp": "2025-01-22T15:30:00Z",
  "data": {
    "review_id": "880h1711-h50e-74g7-d049-779988772333",
    "resource_id": "550e8400-e29b-41d4-a716-446655440000",
    "rating": 5,
    "requires_moderation": false
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript
```typescript
// lib/api/client.ts
export class ReentryMapAPI {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  async getResources(params: ResourceSearchParams) {
    const query = new URLSearchParams(params as any);
    const response = await fetch(`${this.baseUrl}/resources?${query}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch resources');
    }
    
    return response.json();
  }

  async getResource(id: string) {
    const response = await fetch(`${this.baseUrl}/resources/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Resource not found');
      }
      throw new Error('Failed to fetch resource');
    }
    
    return response.json();
  }

  async favoriteResource(id: string, notes?: string) {
    const response = await fetch(`${this.baseUrl}/resources/${id}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    
    if (!response.ok) {
      throw new Error('Failed to favorite resource');
    }
    
    return response.json();
  }

  async rateResource(id: string, rating: number) {
    const response = await fetch(`${this.baseUrl}/resources/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating })
    });
    
    if (!response.ok) {
      throw new Error('Failed to rate resource');
    }
    
    return response.json();
  }

  async submitReview(id: string, review: ReviewData) {
    const response = await fetch(`${this.baseUrl}/resources/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit review');
    }
    
    return response.json();
  }
}

// Usage
const api = new ReentryMapAPI();

// Search for resources
const results = await api.getResources({
  search: 'employment',
  lat: 37.8044,
  lng: -122.2712,
  radius: 10
});

// Get specific resource
const resource = await api.getResource('550e8400-...');

// Favorite a resource
await api.favoriteResource('550e8400-...', 'Great job program');

// Rate a resource
await api.rateResource('550e8400-...', 5);

// Submit review
await api.submitReview('550e8400-...', {
  rating: 5,
  review_text: 'Excellent service!',
  tips: 'Call ahead'
});
```

### React Hooks
```typescript
// lib/hooks/useResourcesAPI.ts
import { useState, useEffect } from 'react';
import { ReentryMapAPI } from '@/lib/api/client';

export function useResources(params: ResourceSearchParams) {
  const [data, setData] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = new ReentryMapAPI();

  useEffect(() => {
    async function fetchResources() {
      try {
        setLoading(true);
        const result = await api.getResources(params);
        setData(result.data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchResources();
  }, [JSON.stringify(params)]);

  return { data, loading, error };

  }
export function useResource(id: string) {
const [data, setData] = useState<Resource | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const api = new ReentryMapAPI();
useEffect(() => {
async function fetchResource() {
try {
setLoading(true);
const result = await api.getResource(id);
setData(result);
setError(null);
} catch (err) {
setError(err.message);
} finally {
setLoading(false);
}
}
if (id) {
  fetchResource();
}
}, [id]);
return { data, loading, error };
}
// Usage in component
function ResourceDetail({ id }: { id: string }) {
const { data: resource, loading, error } = useResource(id);
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
if (!resource) return <NotFound />;
return <ResourceCard resource={resource} />;
}

---

## Rate Limit Headers

All responses include rate limit information:
```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1706025600
```

---

## Pagination

Paginated endpoints follow this structure:

**Request**:
```http
GET /api/resources?page=2&limit=20
```

**Response**:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasMore": true,
    "nextPage": 3,
    "prevPage": 1
  }
}
```

**Link Headers** (optional):
```http
Link: </api/resources?page=3&limit=20>; rel="next",
      </api/resources?page=1&limit=20>; rel="prev",
      </api/resources?page=1&limit=20>; rel="first",
      </api/resources?page=8&limit=20>; rel="last"
```

---

## CORS

CORS is configured to allow requests from:
- `http://localhost:3000` (development)
- `https://reentry-map.vercel.app` (production)

---

## API Versioning

Current version: `v1` (implicit)

Future versions will use URL prefix:
- `/api/v2/resources`

---

## Support

For API support:
- Email: gserafini@gmail.com
- Documentation: https://reentry-map.vercel.app/docs
- GitHub Issues: https://github.com/gserafini/reentry-map/issues