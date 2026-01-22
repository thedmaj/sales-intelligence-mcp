# Sales Intelligence MCP Server - Error Analysis

## Issue Summary

The sales_intelligence MCP server is showing errors when attempting to connect to the API. Analysis reveals multiple issues in the API client configuration and endpoint construction.

## Root Causes Identified

### 1. **Incorrect Endpoint Path Construction** ⚠️ CRITICAL

**Problem**: The API endpoint is being constructed incorrectly, causing double path segments.

**Location**: `src/tools/findSalesContent.ts:59`

```typescript
const apiResponse = await apiClient.request('/api/mcp/find_sales_content', input);
```

**Issue**: 
- `baseUrl` is already: `https://solutions-master.replit.app/api/mcp`
- Endpoint passed is: `/api/mcp/find_sales_content`
- **Result**: Final URL becomes `https://solutions-master.replit.app/api/mcp/api/mcp/find_sales_content` ❌

**Expected**: Endpoint should be `/find_sales_content` since baseUrl already includes `/api/mcp`

**Fix Required**:
```typescript
// Change from:
const apiResponse = await apiClient.request('/api/mcp/find_sales_content', input);

// To:
const apiResponse = await apiClient.request('/find_sales_content', input);
```

### 2. **Incorrect Authorization Header Format** ⚠️ CRITICAL

**Problem**: The API client uses `Bearer` token format, but the API key format suggests it should be `MCP-Key`.

**Location**: `src/auth/apiClient.ts:24`

```typescript
'Authorization': `Bearer ${this.config.apiKey}`,
```

**Issue**:
- API key in config: `MCP-Key 7011e28ea76944738369f335c1e14fd4e34dc061b547d31f502b2da6bd1e5acbdbdd84ab6d733f63`
- Current header: `Authorization: Bearer MCP-Key 7011e28ea76944738369f335c1e14fd4e34dc061b547d31f502b2da6bd1e5acbdbdd84ab6d733f63`
- **Expected**: `Authorization: MCP-Key 7011e28ea76944738369f335c1e14fd4e34dc061b547d31f502b2da6bd1e5acbdbdd84ab6d733f63`

**Fix Required**:
```typescript
// Check if API key already includes the prefix
const authHeader = this.config.apiKey.startsWith('MCP-Key ') 
  ? this.config.apiKey 
  : `Bearer ${this.config.apiKey}`;

// Or simply use the API key as-is if it's already formatted
'Authorization': this.config.apiKey,
```

### 3. **API Endpoint Returns HTML Instead of JSON**

**Test Result**: When testing the API endpoint directly:
```bash
curl https://solutions-master.replit.app/api/mcp/find_sales_content
```

**Response**: Returns HTML page instead of JSON API response.

**Possible Causes**:
1. API endpoint doesn't exist at that path
2. Server is returning an error page
3. Authentication is failing and redirecting to HTML error page
4. Wrong base URL configuration

### 4. **Missing Error Handling for API Failures**

**Location**: `src/tools/findSalesContent.ts:72-75`

**Current Behavior**: 
- API errors are caught and fallback to demo data
- Error message is returned to user, but not logged properly
- No distinction between network errors, auth errors, and API errors

**Improvement Needed**: Better error categorization and logging.

## Error Flow Analysis

### Current Flow (With Errors):

1. **Server Startup**:
   ```
   ✅ API client configured for real data
   ✅ Server starts successfully
   ✅ Tools registered
   ```

2. **Tool Execution**:
   ```
   ✅ Tool called: find_sales_content
   ⚠️ API request to: https://solutions-master.replit.app/api/mcp/api/mcp/find_sales_content
   ❌ Wrong URL (double path)
   ❌ Wrong auth header format
   ❌ API returns error or HTML
   ⚠️ Falls back to demo data
   ✅ Returns demo results (works, but not using real API)
   ```

### Expected Flow (Fixed):

1. **Server Startup**: Same as above ✅

2. **Tool Execution**:
   ```
   ✅ Tool called: find_sales_content
   ✅ API request to: https://solutions-master.replit.app/api/mcp/find_sales_content
   ✅ Correct auth header: MCP-Key ...
   ✅ API returns JSON
   ✅ Returns real API results
   ```

## Log Analysis

### Current Logs Show:

```
[INFO] API client configured for real data {"baseUrl":"https://solutions-master.replit.app/api/mcp"}
[INFO] Sales Intelligence MCP Server starting on stdio transport
[INFO] Available tools: find_sales_content, get_competitive_intel, find_process_workflows, discover_playbooks
[INFO] Executing tool: find_sales_content {"args":{"query":"account verification"}}
[DEBUG] API request starting {"url":"https://solutions-master.replit.app/api/mcp/api/mcp/find_sales_content","endpoint":"/api/mcp/find_sales_content"}
```

**Issues Visible in Logs**:
1. URL shows double path: `/api/mcp/api/mcp/find_sales_content`
2. No error logged (likely timing out or failing silently)
3. Falls back to demo data without clear error indication

## Recommended Fixes

### Fix 1: Correct Endpoint Paths

Update all tool handlers to use correct endpoint paths:

**File**: `src/tools/findSalesContent.ts`
```typescript
// Line 59: Change from
const apiResponse = await apiClient.request('/api/mcp/find_sales_content', input);
// To
const apiResponse = await apiClient.request('/find_sales_content', input);
```

**Files to Update**:
- `src/tools/findSalesContent.ts`
- `src/tools/getCompetitiveIntel.ts`
- `src/tools/findProcessWorkflows.ts`
- `src/tools/discoverPlaybooks.ts`

### Fix 2: Fix Authorization Header

**File**: `src/auth/apiClient.ts`
```typescript
// Line 24: Change from
'Authorization': `Bearer ${this.config.apiKey}`,
// To
'Authorization': this.config.apiKey.startsWith('Bearer ') || this.config.apiKey.startsWith('MCP-Key ')
  ? this.config.apiKey
  : `Bearer ${this.config.apiKey}`,
```

### Fix 3: Verify API Endpoint

Test the correct API endpoint:
```bash
curl -X POST https://solutions-master.replit.app/api/mcp/find_sales_content \
  -H "Authorization: MCP-Key 7011e28ea76944738369f335c1e14fd4e34dc061b547d31f502b2da6bd1e5acbdbdd84ab6d733f63" \
  -H "Content-Type: application/json" \
  -d '{"query":"test"}'
```

### Fix 4: Improve Error Logging

Add better error logging in tool handlers:
```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`API request failed for ${endpoint}:`, { 
    error: message, 
    url: `${apiClient.config.baseUrl}${endpoint}`,
    status: error.status,
    stack: error.stack 
  });
  return `# API Connection Error\n\n...`;
}
```

## Testing After Fixes

1. **Test Server Startup**:
   ```bash
   MCP_LOG_LEVEL=debug node dist/mcp-server.js
   ```

2. **Test Tool Execution**:
   ```bash
   echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"find_sales_content","arguments":{"query":"test"}},"id":1}' | \
   API_BASE_URL="https://solutions-master.replit.app/api/mcp" \
   API_KEY="MCP-Key 7011e28ea76944738369f335c1e14fd4e34dc061b547d31f502b2da6bd1e5acbdbdd84ab6d733f63" \
   MCP_LOG_LEVEL=debug \
   node dist/mcp-server.js
   ```

3. **Verify Logs Show**:
   - ✅ Correct URL (no double path)
   - ✅ Correct auth header
   - ✅ Successful API response OR clear error message
   - ✅ No silent fallback to demo data

## Current Status

- ✅ **Server starts correctly**
- ✅ **Tools are registered**
- ✅ **Demo data fallback works**
- ❌ **API connection fails** (wrong endpoint path)
- ❌ **Authorization header incorrect**
- ⚠️ **Errors are silent** (falls back to demo data)

## Next Steps

1. Fix endpoint paths in all tool handlers
2. Fix authorization header format
3. Test API connectivity
4. Improve error logging
5. Verify real API data is returned instead of demo data
