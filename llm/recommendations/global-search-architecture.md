# ERP Global Search Architecture

PostgreSQL Full-Text Search with Table-Per-Company Design

Technical Implementation Guide

January 2026

## Table of Contents

1. Executive Summary  
2. Architecture Overview  
3. Database Schema Design  
4. Search Index Tables  
5. Core SQL Functions  
6. Entity Synchronization  
7. Application Layer Implementation  
8. REST API Design  
9. Performance Optimization  
10. Usage Examples  
11. Maintenance & Operations  

## 1. Executive Summary

This document outlines a comprehensive global search architecture for an ERP system using PostgreSQL's native full-text search capabilities combined with array-based tagging. The solution provides fast, scalable search across multiple entity types (invoices, items, purchases, jobs) with strong data isolation using a table-per-company approach.

Key Features:

| Feature          | Description                                      |
|------------------|--------------------------------------------------|
| Multi-Entity Search | Search across invoices, items, purchases, jobs, and more |
| Full-Text Search | Leverages PostgreSQL's tsvector and GIN indexes  |
| Tag-Based Filtering | Array-based tags with efficient overlap operators |
| Data Isolation   | Separate table per company for security and performance |
| Faceted Search   | Filter by entity type with result counts         |
| Real-Time Sync   | Automatic index updates via database triggers    |

## 2. Architecture Overview

The architecture follows a table-per-company design pattern where each company has its own dedicated search index table. This provides strong data isolation, improved query performance, and simplified data management.

### 2.1 Design Principles

- **Data Isolation**: Each company's search data is physically separated in its own table  
- **Performance**: Smaller tables mean faster queries and more efficient indexes  
- **Scalability**: Add new companies without impacting existing ones  
- **Security**: Company data cannot accidentally leak across boundaries  
- **Maintainability**: Can reindex, backup, or modify individual company data  

### 2.2 Architecture Components

| Component       | Purpose                                      |
|-----------------|----------------------------------------------|
| Registry Table  | Tracks all company search tables             |
| Company Tables  | Individual search indexes per company        |
| Sync Functions  | Automatically update search indexes          |
| Search Functions| Dynamic queries across company tables        |
| Triggers        | Real-time synchronization from source entities |

## 3. Database Schema Design

### 3.1 Registry Table

The registry table maintains a catalog of all company search tables. It serves as the central directory for the search system.
```sql
CREATE TABLE "searchIndexRegistry" (
    "id" BIGSERIAL PRIMARY KEY,
    "companyId" TEXT UNIQUE NOT NULL,
    "tableName" TEXT UNIQUE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "lastIndexedAt" TIMESTAMP WITH TIME ZONE,
    "rowCount" BIGINT DEFAULT 0,

    CONSTRAINT "searchIndexRegistry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "searchIndexRegistry_companyId_idx"
    ON "searchIndexRegistry"("companyId");
```

### 3.2 Company Search Table Structure

Each company has its own search table with the following structure. Tables are created dynamically when a company is first registered.

```sql
CREATE TABLE "searchIndex_{companyId}" (
    "id" BIGSERIAL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "searchVector" tsvector,
    "tags" TEXT[] DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE,

    CONSTRAINT "searchIndex_{companyId}_entityType_entityId_key" UNIQUE ("entityType", "entityId")
);
```

Field Descriptions:

| Field        | Type     | Description                              |
|--------------|----------|------------------------------------------|
| entityType   | TEXT     | Type of entity (invoice, item, purchase, job) |
| entityId     | TEXT     | Unique identifier of the source entity   |
| title        | TEXT     | Primary searchable text (weighted highest) |
| description  | TEXT     | Secondary searchable text                |
| searchVector | tsvector | Full-text search index                   |
| tags         | TEXT[]   | Array of tags for filtering              |
| metadata     | JSONB    | Additional structured data               |

## 4. Search Index Tables

### 4.1 Index Creation

Each company search table has several indexes to optimize different query patterns:

```sql
-- GIN index for full-text search (most important)
CREATE INDEX "searchIndex_{companyId}_searchVector_idx"
    ON "searchIndex_{companyId}" USING GIN("searchVector");

-- GIN index for tag array operations
CREATE INDEX "searchIndex_{companyId}_tags_idx"
    ON "searchIndex_{companyId}" USING GIN("tags");

-- B-tree indexes for filtering
CREATE INDEX "searchIndex_{companyId}_entityType_idx"
    ON "searchIndex_{companyId}"("entityType");

CREATE INDEX "searchIndex_{companyId}_updatedAt_idx"
    ON "searchIndex_{companyId}"("updatedAt" DESC);

-- Composite index for lookups
CREATE INDEX "searchIndex_{companyId}_entityType_entityId_idx"
    ON "searchIndex_{companyId}"("entityType", "entityId");
```

### 4.2 Automatic Table Creation

The system automatically creates search tables for new companies using a function that handles all necessary setup including indexes and triggers:

```sql
CREATE OR REPLACE FUNCTION create_company_search_table(
    p_company_id TEXT
) RETURNS TEXT AS $$
DECLARE
    v_table_name TEXT;
    v_safe_company_id TEXT;
BEGIN
    -- Sanitize companyId for table name
    v_safe_company_id := regexp_replace(
        p_company_id, '[^a-zA-Z0-9]', '_', 'g'
    );
    v_table_name := 'searchIndex_' || v_safe_company_id;

    -- Create table, indexes, and triggers
    -- (Full implementation in source code)

    RETURN v_table_name;
END;
$$ LANGUAGE plpgsql;
```

## 5. Core SQL Functions

### 5.1 Global Search Function

The main search function dynamically queries the appropriate company table and returns ranked results:

```sql
CREATE OR REPLACE FUNCTION global_search(
    p_company_id TEXT,
    p_query TEXT,
    p_entity_types TEXT[] DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
) RETURNS TABLE (
    "entityType" TEXT,
    "entityId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "rank" REAL
) AS $$
DECLARE
    v_table_name TEXT;
BEGIN
    v_table_name := get_search_table_name(p_company_id);

    RETURN QUERY EXECUTE format('
        SELECT "entityType", "entityId", "title", "description",
               "tags", "metadata",
               ts_rank("searchVector",
                       websearch_to_tsquery(''english'', $1)) AS rank
        FROM %I
        WHERE "searchVector" @@ websearch_to_tsquery(''english'', $1)
            AND ($2::TEXT[] IS NULL OR "entityType" = ANY($2))
            AND ($3::TEXT[] IS NULL OR "tags" && $3)
        ORDER BY rank DESC, "updatedAt" DESC
        LIMIT $4 OFFSET $5
    ', v_table_name)
    USING p_query, p_entity_types, p_tags, p_limit, p_offset;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 Tag Suggestion Function

Suggests relevant tags based on search query or shows all available tags:

```sql
CREATE OR REPLACE FUNCTION suggest_tags(
    p_company_id TEXT,
    p_query TEXT DEFAULT '',
    p_limit INT DEFAULT 10
) RETURNS TABLE ("tag" TEXT, "count" BIGINT) AS $$
DECLARE
    v_table_name TEXT;
BEGIN
    v_table_name := get_search_table_name(p_company_id);

    IF p_query = '' THEN
        -- Return all tags with counts
        RETURN QUERY EXECUTE format('
            SELECT UNNEST("tags") AS tag, COUNT(*) AS count
            FROM %I
            GROUP BY tag
            ORDER BY count DESC
            LIMIT $1
        ', v_table_name) USING p_limit;
    ELSE
        -- Return tags from matching documents
        RETURN QUERY EXECUTE format('
            SELECT UNNEST("tags") AS tag, COUNT(*) AS count
            FROM %I
            WHERE "searchVector" @@
                  websearch_to_tsquery(''english'', $1)
            GROUP BY tag
            ORDER BY count DESC
            LIMIT $2
        ', v_table_name) USING p_query, p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### 5.3 Faceted Search Function

Returns entity type counts for a given search query, enabling faceted filtering in the UI:

```sql
CREATE OR REPLACE FUNCTION get_search_facets(
    p_company_id TEXT,
    p_query TEXT
) RETURNS TABLE ("entityType" TEXT, "count" BIGINT) AS $$
DECLARE
    v_table_name TEXT;
BEGIN
    v_table_name := get_search_table_name(p_company_id);

    RETURN QUERY EXECUTE format('
        SELECT "entityType", COUNT(*) as count
        FROM %I
        WHERE "searchVector" @@
              websearch_to_tsquery(''english'', $1)
        GROUP BY "entityType"
        ORDER BY count DESC
    ', v_table_name) USING p_query;
END;
$$ LANGUAGE plpgsql;
```

## 6. Entity Synchronization

### 6.1 Generic Sync Function

A generic function handles inserting or updating search index entries for any entity type:

```sql
CREATE OR REPLACE FUNCTION sync_to_company_search(
    p_company_id TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_title TEXT,
    p_description TEXT,
    p_tags TEXT[],
    p_metadata JSONB
) RETURNS VOID AS $$
DECLARE
    v_table_name TEXT;
BEGIN
    v_table_name := get_search_table_name(p_company_id);

    EXECUTE format('
        INSERT INTO %I (
            "entityType", "entityId", "title",
            "description", "tags", "metadata"
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT ("entityType", "entityId")
        DO UPDATE SET
            "title" = EXCLUDED."title",
            "description" = EXCLUDED."description",
            "tags" = EXCLUDED."tags",
            "metadata" = EXCLUDED."metadata",
            "updatedAt" = NOW()
    ', v_table_name)
    USING p_entity_type, p_entity_id, p_title,
          p_description, p_tags, p_metadata;
END;
$$ LANGUAGE plpgsql;
```

### 6.2 Entity-Specific Triggers

Each entity type (invoices, items, purchases, jobs) has its own trigger function that extracts relevant data and calls the generic sync function:

Invoice Sync Example:

```sql
CREATE OR REPLACE FUNCTION sync_invoice_to_search()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM delete_from_company_search(
            OLD."companyId", 'invoice', OLD."id"::TEXT
        );
        RETURN OLD;
    ELSE
        PERFORM sync_to_company_search(
            NEW."companyId",
            'invoice',
            NEW."id"::TEXT,
            CONCAT('Invoice #', NEW."invoiceNumber"),
            CONCAT('Customer: ', NEW."customerName",
                   ' Amount: ', NEW."totalAmount"),
            ARRAY[NEW."status", NEW."paymentStatus"] ||
                COALESCE(NEW."tags", '{}'),
            jsonb_build_object(
                'invoiceNumber', NEW."invoiceNumber",
                'totalAmount', NEW."totalAmount",
                'customerName', NEW."customerName",
                'dueDate', NEW."dueDate"
            )
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "invoice_search_sync"
    AFTER INSERT OR UPDATE OR DELETE ON "invoice"
    FOR EACH ROW
    EXECUTE FUNCTION sync_invoice_to_search();
```

Item Sync Example:

```sql
CREATE OR REPLACE FUNCTION sync_item_to_search()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM delete_from_company_search(
            OLD."companyId", 'item', OLD."id"::TEXT
        );
        RETURN OLD;
    ELSE
        PERFORM sync_to_company_search(
            NEW."companyId",
            'item',
            NEW."id"::TEXT,
            NEW."name",
            CONCAT('SKU: ', NEW."sku", ' Category: ', NEW."category"),
            ARRAY[NEW."category", NEW."itemType"] ||
                COALESCE(NEW."tags", '{}'),
            jsonb_build_object(
                'sku', NEW."sku",
                'category', NEW."category",
                'price', NEW."price"
            )
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "item_search_sync"
    AFTER INSERT OR UPDATE OR DELETE ON "part"
    FOR EACH ROW
    EXECUTE FUNCTION sync_item_to_search();
```

Note: Similar trigger functions should be created for purchases, jobs, and any other searchable entities in your ERP system.

## 7. Application Layer Implementation

### 7.1 TypeScript Service Class

A service class encapsulates all search functionality with type-safe interfaces:

```typescript
// TypeScript interfaces
interface SearchParams {
    query: string;
    companyId: string;
    entityTypes?: string[];
    tags?: string[];
    limit?: number;
    offset?: number;
}

interface SearchResult {
    entityType: string;
    entityId: string;
    title: string;
    description: string;
    tags: string[];
    metadata: Record;
    rank: number;
}

// Main service class
class GlobalSearchService {
    async search(params: SearchParams): Promise {
        const { query, companyId, entityTypes, tags, 
                limit = 20, offset = 0 } = params;
        
        const result = await db.query(
            `SELECT * FROM global_search($1, $2, $3, $4, $5, $6)`,
            [companyId, query, entityTypes, tags, limit, offset]
        );
        
        return result.rows;
    }
    
    async searchWithFacets(params: SearchParams) {
        const [results, facets] = await Promise.all([
            this.search(params),
            this.getFacets(params.companyId, params.query)
        ]);
        
        return { results, facets };
    }
    
    async getFacets(companyId: string, query: string) {
        const result = await db.query(
            `SELECT * FROM get_search_facets($1, $2)`,
            [companyId, query]
        );
        return result.rows;
    }
    
    async suggestTags(companyId: string, query: string = '') {
        const result = await db.query(
            `SELECT * FROM suggest_tags($1, $2, 10)`,
            [companyId, query]
        );
        return result.rows;
    }
}
```

## 8. REST API Design

### 8.1 Search Endpoint

The main search endpoint accepts query parameters and returns paginated results with facets:

```javascript
// GET /api/search
app.get('/api/search', async (req, res) => {
    try {
        const { 
            q: query,           // Search query
            types,              // Comma-separated entity types
            tags,               // Comma-separated tags
            limit = 20,         // Results per page
            offset = 0          // Pagination offset
        } = req.query;
        
        const companyId = req.user.companyId; // From auth
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ 
                error: 'Query parameter is required' 
            });
        }
        
        const searchService = new GlobalSearchService();
        const results = await searchService.searchWithFacets({
            query,
            companyId,
            entityTypes: types ? types.split(',') : undefined,
            tags: tags ? tags.split(',') : undefined,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});
```

Example Request:

GET /api/search?q=invoice+2024&types=invoice,purchase&tags=urgent&limit=10

Response:
```json
{
  "results": [
    {
      "entityType": "invoice",
      "entityId": "inv_123",
      "title": "Invoice #INV-2024-001",
      "description": "Customer: Acme Corp Amount: $5,000",
      "tags": ["urgent", "paid"],
      "metadata": {
        "invoiceNumber": "INV-2024-001",
        "totalAmount": 5000,
        "customerName": "Acme Corp"
      },
      "rank": 0.9876
    }
  ],
  "facets": [
    { "entityType": "invoice", "count": 15 },
    { "entityType": "purchase", "count": 3 }
  ]
}
```

### 8.2 Tag Suggestions Endpoint

```javascript
// GET /api/search/tags
app.get('/api/search/tags', async (req, res) => {
    try {
        const { q: query = '' } = req.query;
        const companyId = req.user.companyId;
        
        const searchService = new GlobalSearchService();
        const tags = await searchService.suggestTags(
            companyId, 
            query
        );
        
        res.json(tags);
    } catch (error) {
        console.error('Tag suggestion error:', error);
        res.status(500).json({ error: 'Failed to fetch tags' });
    }
});
```

### 8.3 Search Statistics Endpoint

```javascript
// GET /api/search/stats
app.get('/api/search/stats', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        
        const result = await db.query(
            `SELECT * FROM get_index_stats($1)`,
            [companyId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
```

## 9. Performance Optimization

### 9.1 Index Optimization

GIN indexes are crucial for full-text search performance. Monitor and maintain them regularly:

| Strategy          | Implementation                   | Benefit                          |
|-------------------|----------------------------------|----------------------------------|
| Regular VACUUM   | Schedule weekly VACUUM ANALYZE   | Keeps indexes efficient          |
| Index Monitoring | Track index size and usage       | Identify unused indexes          |
| Query Planning   | Use EXPLAIN ANALYZE              | Optimize query performance       |
| Connection Pooling | Use pgBouncer or similar        | Reduce connection overhead       |

### 9.2 Search Vector Weights

The search vector uses weighted components to prioritize different fields:

| Weight     | Field       | Priority         |
|------------|-------------|------------------|
| A (highest)| Title       | Primary searchable content |
| B         | Description | Secondary content |
| C (lowest) | Tags        | Metadata and keywords |

### 9.3 Caching Strategy

Implement caching at multiple levels for frequently accessed searches:

- **Application Cache**: Cache popular searches in Redis (5-15 minute TTL)  
- **Query Result Cache**: PostgreSQL can cache query plans automatically  
- **Tag Cache**: Cache tag suggestions as they change infrequently  
- **Facet Cache**: Cache entity type counts for common queries  

## 10. Usage Examples

### 10.1 Basic Search

```typescript
// Search for "invoice" across all entity types
const results = await searchService.search({
    query: 'invoice',
    companyId: 'company_abc123'
});

// Results contain ranked matches with highlighting
console.log(results);
// [
//   {
//     entityType: 'invoice',
//     entityId: 'inv_001',
//     title: 'Invoice #2024-001',
//     rank: 0.9876
//   }
// ]
```

### 10.2 Filtered Search

```typescript
// Search only invoices with specific tags
const results = await searchService.search({
    query: 'urgent payment',
    companyId: 'company_abc123',
    entityTypes: ['invoice'],
    tags: ['urgent', 'overdue'],
    limit: 10
});
```

### 10.3 Faceted Search with Pagination

```typescript
// Get search results with entity type facets
const { results, facets } = await searchService.searchWithFacets({
    query: 'acme corp',
    companyId: 'company_abc123',
    limit: 20,
    offset: 0
});

// facets shows distribution:
// [
//   { entityType: 'invoice', count: 45 },
//   { entityType: 'purchase', count: 12 },
//   { entityType: 'job', count: 8 }
// ]

// User can then filter by clicking a facet
const filteredResults = await searchService.search({
    query: 'acme corp',
    companyId: 'company_abc123',
    entityTypes: ['invoice']  // Now only invoices
});
```

### 10.4 Tag Autocomplete

```typescript
// Get tag suggestions for autocomplete
const tags = await searchService.suggestTags(
    'company_abc123',
    'payment'  // Context query
);

// Returns tags with counts:
// [
//   { tag: 'payment_pending', count: 23 },
//   { tag: 'payment_received', count: 156 },
//   { tag: 'payment_overdue', count: 7 }
// ]
```

### 10.5 Frontend React Component

```javascript
import { useState, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';

const SearchBar = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [facets, setFacets] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [tags, setTags] = useState([]);
    
    const debouncedSearch = useMemo(
        () => debounce(async (searchQuery) => {
            const params = new URLSearchParams({
                q: searchQuery,
                types: selectedTypes.join(','),
                tags: tags.join(',')
            });
            
            const response = await fetch(`/api/search?${params}`);
            const data = await response.json();
            
            setResults(data.results);
            setFacets(data.facets);
        }, 300),
        [selectedTypes, tags]
    );
    
    useEffect(() => {
        if (query.length > 2) {
            debouncedSearch(query);
        }
    }, [query, debouncedSearch]);
    
    return (
        <div>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search invoices, items, jobs..."
                className="search-input"
            />
            
            {facets.length > 0 && (
                <div>
                    {facets.map(f => (
                        <button
                            key={f.entityType}
                            onClick={() =>
                                setSelectedTypes([f.entityType])
                            }
                            className="facet-button"
                        >
                            {f.entityType} ({f.count})
                        </button>
                    ))}
                </div>
            )}
            
            
        </div>
    );
};
```

## 11. Maintenance & Operations

### 11.1 Reindexing

Reindex a company's search data to rebuild search vectors:

```sql
-- Reindex all search vectors for a company
SELECT reindex_company_search('company_abc123');

-- Or rebuild from source entities
DO $$
DECLARE
    company_id_val TEXT := 'company_abc123';
BEGIN
    -- Clear existing index
    EXECUTE format('TRUNCATE TABLE %I', 
        get_search_table_name(company_id_val));
    
    -- Trigger re-sync from source tables
    -- (Depends on your data model)
END $$;
```

### 11.2 Monitoring Queries

```sql
-- Check index health
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename LIKE 'searchIndex_%'
ORDER BY idx_scan DESC;

-- Find slow queries
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%global_search%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 11.3 Backup and Restore

Company search tables can be backed up independently:

```
# Backup single company
pg_dump -t 'searchIndex_abc123' \
    -t 'searchIndexRegistry' \
    your_database > company_abc123_search.sql

# Restore
psql your_database < company_abc123_search.sql
```

### 11.4 Cleanup Old Companies

```sql
-- Drop search table for inactive company
SELECT drop_company_search_table('old_company_id');

-- Remove orphaned registry entries
DELETE FROM "searchIndexRegistry"
WHERE "companyId" NOT IN (SELECT "id" FROM "company");
```

## Conclusion

This architecture provides a robust, scalable foundation for global search across your ERP system. The table-per-company design ensures data isolation and performance, while PostgreSQL's native full-text search capabilities deliver fast, relevant results.

Key Takeaways:

- **Scalability**: Each company's search data is isolated and independently scalable  
- **Performance**: GIN indexes and ts_rank provide sub-second search results  
- **Flexibility**: Tag-based filtering and faceted search enable powerful UIs  
- **Maintainability**: Automatic triggers keep search index in sync with source data  
- **Security**: Physical table separation prevents cross-company data leaks  

Next Steps:

- Implement the registry and table creation functions  
- Create sync triggers for all entity types in your ERP  
- Build the application service layer and REST APIs  
- Design and implement the frontend search UI  
- Set up monitoring and alerting for search performance  
- Consider adding fuzzy matching with pg_trgm extension  
- Implement search analytics to track popular queries  

For additional support or questions about implementing this architecture, refer to the PostgreSQL documentation on full-text search and the Crunch Data blog articles on tags and arrays.
