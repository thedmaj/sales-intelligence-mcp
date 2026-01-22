# Sales Intelligence MCP Server - Log Troubleshooting Guide

## Overview

The sales_intelligence MCP server uses a custom logger that writes to `stderr` (standard error output). This is the correct approach for MCP servers, as it prevents log messages from interfering with JSON-RPC protocol communication on `stdout`.

## Log Configuration

### Current Configuration

The logger is configured in `/src/utils/logger.ts` with the following behavior:

- **Default Log Level**: `error` (if `MCP_LOG_LEVEL` is not set)
- **Log Output**: `stderr` (console.error)
- **Log Format**: `[TIMESTAMP] [LEVEL] MESSAGE [METADATA]`

### Log Levels

The logger supports 4 log levels (in order of verbosity):

1. **error** (0) - Only error messages
2. **warn** (1) - Warnings and errors
3. **info** (2) - Info, warnings, and errors
4. **debug** (3) - All messages including debug

### Current Cursor Configuration

In `~/.cursor/mcp.json`, the server is configured with:

```json
{
  "sales_intelligence": {
    "type": "stdio",
    "command": "node",
    "args": ["/Users/dmajetic/Development/MCP2/solutions-master/sales-intelligence-mcp/dist/mcp-server.js"],
    "cwd": "/Users/dmajetic/Development/MCP2/solutions-master/sales-intelligence-mcp",
    "env": {
      "API_BASE_URL": "https://solutions-master.replit.app/api/mcp",
      "API_KEY": "MCP-Key 7011e28ea76944738369f335c1e14fd4e34dc061b547d31f502b2da6bd1e5acbdbdd84ab6d733f63",
      "MCP_LOG_LEVEL": "info"
    }
  }
}
```

✅ **Status**: Log level is set to `info`, so info, warn, and error logs should be visible.

## How to View Logs in Cursor

### Method 1: Cursor Developer Tools

1. Open Cursor
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Developer: Toggle Developer Tools"
4. Go to the "Console" tab
5. Look for MCP server messages (they may appear in stderr output)

### Method 2: Terminal Testing

Test the server directly in a terminal to see logs:

```bash
cd /Users/dmajetic/Development/MCP2/solutions-master/sales-intelligence-mcp

# Test with info logging
MCP_LOG_LEVEL=info node dist/mcp-server.js <<< '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'

# Test with debug logging (most verbose)
MCP_LOG_LEVEL=debug node dist/mcp-server.js <<< '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}'
```

### Method 3: Enable Debug Logging in Cursor

To see more detailed logs, update your Cursor MCP configuration:

```json
{
  "sales_intelligence": {
    "env": {
      "MCP_LOG_LEVEL": "debug"  // Change from "info" to "debug"
    }
  }
}
```

Then restart Cursor.

## Common Issues and Solutions

### Issue 1: No Logs Visible

**Symptoms**: You don't see any log output when using the MCP server.

**Possible Causes**:
1. Log level is too high (only errors showing)
2. Logs are going to stderr, not stdout
3. Cursor is not displaying stderr output

**Solutions**:
1. ✅ **Verify log level**: Check that `MCP_LOG_LEVEL` is set to `info` or `debug` in your Cursor config
2. ✅ **Test in terminal**: Run the server directly to verify logs work
3. ✅ **Check Cursor console**: Look in Cursor's developer console for stderr messages

### Issue 2: Logs Only Show Errors

**Symptoms**: Only error messages appear, no info or debug logs.

**Cause**: Log level is set to `error` (default) or `warn`.

**Solution**: Update `MCP_LOG_LEVEL` to `info` or `debug` in your Cursor MCP configuration.

### Issue 3: Too Many Logs

**Symptoms**: Logs are too verbose and cluttering the output.

**Solution**: Set `MCP_LOG_LEVEL` to `warn` or `error` to reduce verbosity.

### Issue 4: Server Not Starting

**Symptoms**: Server fails to start or Cursor can't connect.

**Check**:
1. ✅ Verify the compiled JavaScript exists: `dist/mcp-server.js`
2. ✅ Rebuild if needed: `npm run build`
3. ✅ Check Node.js version: `node --version` (needs >= 16.0.0)
4. ✅ Verify file permissions: The file should be executable

**Test manually**:
```bash
cd /Users/dmajetic/Development/MCP2/solutions-master/sales-intelligence-mcp
node dist/mcp-server.js <<< '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

Expected output:
```
Sales Intelligence MCP Server ready with 4 tools
{"jsonrpc":"2.0","result":{...},"id":1}
```

### Issue 5: Tool Execution Errors

**Symptoms**: Tools fail to execute or return errors.

**Check logs**: With `MCP_LOG_LEVEL=debug`, you should see:
- Tool execution start: `[INFO] Executing tool: find_sales_content`
- Tool execution errors: `[ERROR] Tool find_sales_content execution failed:`

**Common causes**:
1. Missing dependencies
2. Invalid input parameters
3. Data access issues

**Solution**: Enable debug logging to see detailed error messages.

## Log Examples

### Info Level Logs (MCP_LOG_LEVEL=info)

```
[2026-01-22T04:57:25.597Z] [INFO] Sales Intelligence MCP Server starting on stdio transport
[2026-01-22T04:57:25.600Z] [INFO] Available tools: find_sales_content, get_competitive_intel, find_process_workflows, discover_playbooks
[2026-01-22T04:57:26.123Z] [INFO] Executing tool: find_sales_content {"args":{"query":"account verification"}}
```

### Debug Level Logs (MCP_LOG_LEVEL=debug)

```
[2026-01-22T04:57:25.597Z] [DEBUG] Logger initialized with level: debug
[2026-01-22T04:57:25.600Z] [INFO] Sales Intelligence MCP Server starting on stdio transport
[2026-01-22T04:57:25.601Z] [DEBUG] Tools loaded: 4 tools available
[2026-01-22T04:57:25.602Z] [INFO] Available tools: find_sales_content, get_competitive_intel, find_process_workflows, discover_playbooks
[2026-01-22T04:57:26.123Z] [DEBUG] Received message: {"jsonrpc":"2.0","method":"tools/call",...}
[2026-01-22T04:57:26.124Z] [INFO] Executing tool: find_sales_content {"args":{"query":"account verification"}}
[2026-01-22T04:57:26.250Z] [DEBUG] Tool execution completed successfully
```

### Error Level Logs

```
[2026-01-22T04:57:26.500Z] [ERROR] Tool find_sales_content execution failed: {"error":"Validation error: query is required","args":{"solution":"Account Verification"}}
```

## Verification Checklist

Use this checklist to verify your MCP server logging is working correctly:

- [ ] Server starts without errors
- [ ] `MCP_LOG_LEVEL` is set in Cursor config (info or debug recommended)
- [ ] Can see "Sales Intelligence MCP Server ready" message
- [ ] Info logs appear when tools are executed
- [ ] Error logs appear when tools fail
- [ ] Debug logs appear when `MCP_LOG_LEVEL=debug` (if enabled)

## Quick Test Commands

### Test Server Startup
```bash
cd /Users/dmajetic/Development/MCP2/solutions-master/sales-intelligence-mcp
MCP_LOG_LEVEL=info node dist/mcp-server.js <<< '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

### Test Tool Listing
```bash
MCP_LOG_LEVEL=info node dist/mcp-server.js <<< '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}'
```

### Test Tool Execution
```bash
MCP_LOG_LEVEL=debug node dist/mcp-server.js <<< '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"find_sales_content","arguments":{"query":"account verification"}},"id":3}'
```

## Server Status

✅ **Current Status**: Server is working correctly

- ✅ Server compiles successfully
- ✅ Server starts and responds to initialize
- ✅ Tools are registered (4 tools available)
- ✅ Tool execution works correctly
- ✅ Logger is configured correctly
- ✅ Logs output to stderr (correct for MCP)

## Next Steps

If you're experiencing issues:

1. **Enable debug logging**: Set `MCP_LOG_LEVEL=debug` in your Cursor config
2. **Test in terminal**: Run the server manually to see logs directly
3. **Check Cursor console**: Look for stderr messages in Cursor's developer tools
4. **Verify configuration**: Ensure your Cursor MCP config matches the examples above
5. **Rebuild if needed**: Run `npm run build` if you've made code changes

## Additional Resources

- Server code: `/solutions-master/sales-intelligence-mcp/src/`
- Logger implementation: `/solutions-master/sales-intelligence-mcp/src/utils/logger.ts`
- MCP server implementation: `/solutions-master/sales-intelligence-mcp/src/mcp-server.ts`
- Cursor MCP config: `~/.cursor/mcp.json`
