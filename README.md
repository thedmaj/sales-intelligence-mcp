# Sales Intelligence MCP Server

An MCP (Model Context Protocol) server that provides AI assistants like Cursor and Claude with access to sales intelligence, competitive analysis, and playbook discovery capabilities.

## 🚀 Quick Start with Cursor

### 1. Install and Run

```bash
# Run directly with npx (no installation needed)
npx @your-org/sales-intelligence-mcp

# Server will start on http://localhost:3001
```

### 2. Configure Cursor

1. **Open Cursor Settings** → **Extensions** → **MCP Servers**
2. **Add New Server**:
   - **Name**: `Sales Intelligence`
   - **URL**: `http://localhost:3001`
   - **Authentication**: `Bearer YOUR_API_KEY_HERE`

### 3. Start Using in Cursor

Try these example queries in Cursor:

> **"I am selling account verification to a large bank, what playbook plays exist?"**

> **"How should I position against Early Warning System in fraud prevention?"**

> **"Show me POC workflows for payment processing solutions"**

## 📋 Prerequisites

- **API Key**: Your existing sales intelligence platform API key
- **Node.js**: Version 16 or higher
- **Cursor**: Latest version with MCP support

## ⚙️ Configuration

### Environment Setup

Create a `.env` file or set environment variables:

```env
# Required
API_BASE_URL=https://your-api-server.com
API_KEY=your_existing_api_key_here

# Optional
MCP_PORT=3001
MCP_TIMEOUT=10000
MCP_LOG_LEVEL=info
```

### Advanced Configuration

```env
# Production settings
NODE_ENV=production
MCP_RATE_LIMIT=100
MCP_CACHE_TTL=3600

# Development settings
NODE_ENV=development
MCP_LOG_LEVEL=debug
```

## 🛠️ Available Tools

### 1. **Sales Content Search** (`find_sales_content`)

Find relevant playbooks, plays, and content using natural language.

**Example Cursor queries**:
- *"Find discovery plays for account verification in banking"*
- *"Show me demo content for fraud prevention in fintech"*
- *"What competitive positioning plays exist for payment processing?"*

**Parameters**:
- `query` (required): Natural language search query
- `solution`: Filter by solution name
- `segment`: Market segment (Enterprise, Mid-Market, SMB)
- `playType`: Play type (DISCOVERY, DEMO, VALUE_PROPOSITION, etc.)
- `limit`: Number of results (default: 10)

### 2. **Competitive Intelligence** (`get_competitive_intel`)

Get talking points and battle cards for competing against specific competitors.

**Example Cursor queries**:
- *"How do I compete against Early Warning System?"*
- *"Give me talking points for competing with Plaid in account verification"*
- *"What's our competitive advantage over Zelle in payments?"*

**Parameters**:
- `competitor` (required): Competitor name (supports abbreviations like "EWS")
- `solution`: Filter by solution context
- `includeExamples`: Include example talking points (default: true)

### 3. **Process Workflows** (`find_process_workflows`)

Discover process workflows, POCs, and implementation guides.

**Example Cursor queries**:
- *"Show me POC workflows for account verification"*
- *"Find implementation processes for fraud prevention"*
- *"What onboarding workflows exist for payment solutions?"*

**Parameters**:
- `processType` (required): `poc`, `implementation`, `onboarding`, etc.
- `solution`: Filter by solution
- `includeRoles`: Include role assignments in workflows

### 4. **Playbook Discovery** (`discover_playbooks`)

Find available playbooks and identify content gaps.

**Example Cursor queries**:
- *"What playbooks exist for enterprise banking clients?"*
- *"Show me playbook coverage for fraud prevention"*
- *"Find gaps in our fintech playbook content"*

**Parameters**:
- `solution`: Filter by solution
- `segment`: Market segment
- `vertical`: Vertical market
- `industry`: Industry focus
- `showGaps`: Include gap analysis (default: true)

## 🔧 Installation Options

### Option 1: NPX (Recommended)
```bash
npx @your-org/sales-intelligence-mcp
```

### Option 2: Global Installation
```bash
npm install -g @your-org/sales-intelligence-mcp
sales-intelligence-mcp
```

### Option 3: Local Development
```bash
git clone https://github.com/your-username/sales-intelligence-mcp.git
cd sales-intelligence-mcp
npm install
npm run build
npm start
```

## 🐛 Troubleshooting

### Common Issues

**❌ "Authentication failed. Please check your API key"**
```bash
# Solution: Verify your API key
export API_KEY=your_actual_api_key_here
npx @your-org/sales-intelligence-mcp
```

**❌ "Connection refused" in Cursor**
```bash
# Solution: Ensure server is running
npx @your-org/sales-intelligence-mcp
# Then check http://localhost:3001/health
```

**❌ "No results found"**
- Try broader search terms
- Check your solution/segment filters
- Verify data exists in your system

### Health Check

Test server connectivity:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": "5m 23s"
}
```

### Debug Mode

Enable detailed logging:
```bash
MCP_LOG_LEVEL=debug npx @your-org/sales-intelligence-mcp
```

## 📖 Cursor Integration Examples

### Basic Sales Queries

Ask Cursor natural language questions:

> **User**: *"I'm meeting with JPMorgan Chase about account verification. What content should I prepare?"*
>
> **Cursor with MCP**: *I found 5 relevant plays for account verification in enterprise banking. Here are the key ones to prepare:*
>
> *1. **Account Verification Discovery** - Essential questions about their current verification process*
> *2. **Enterprise Demo Flow** - Technical demonstration focusing on API integration*
> *3. **ROI Value Proposition** - Cost savings analysis for large transaction volumes*

### Competitive Positioning

> **User**: *"The client mentioned they're also looking at Early Warning System. How should I position against them?"*
>
> **Cursor with MCP**: *Here are key talking points for competing against Early Warning System:*
>
> *🎯 **Our Advantages:***
> *- Real-time fraud detection (vs. EWS batch processing)*
> *- More flexible API integration*
> *- Better false positive rates*

### Process Planning

> **User**: *"What's involved in a POC for fraud prevention with a fintech client?"*
>
> **Cursor with MCP**: *I found a comprehensive POC workflow for fraud prevention:*
>
> *📋 **POC Process (4-6 weeks):***
> *1. **Week 1-2**: Environment setup and data integration*
> *2. **Week 3-4**: Model configuration and testing*
> *3. **Week 5-6**: Performance evaluation and reporting*

## 🔐 Security & Best Practices

### API Key Security
- Never commit API keys to version control
- Use environment variables or secure secret management
- Rotate API keys regularly per your security policy

### Rate Limiting
- Default: 100 requests per hour per API key
- Monitor usage through server logs
- Contact admin for limit increases if needed

### Network Security
- Server runs on localhost by default
- Use HTTPS in production deployments
- Consider VPN access for remote usage

## 🚀 Advanced Usage

### Custom Queries

You can ask complex, multi-part questions:

> *"I'm selling fraud prevention to a mid-market fintech that's currently using manual review processes. They're concerned about false positives and mentioned they're also evaluating Featurespace. What content should I prepare, and how should I position against the competition?"*

Cursor will use multiple MCP tools to provide comprehensive answers covering:
- Relevant sales content and playbooks
- Competitive positioning against Featurespace
- Process workflows for implementation
- Value proposition specific to their pain points

### Workflow Integration

Use MCP responses to build complete sales strategies:

1. **Discovery Phase**: Use `find_sales_content` for discovery questions
2. **Competitive Research**: Use `get_competitive_intel` for positioning
3. **Demo Planning**: Use `find_process_workflows` for POC planning
4. **Proposal Building**: Use `discover_playbooks` for comprehensive coverage

## 📊 Response Format

All MCP responses are formatted for easy reading:

```
# Sales Content Search Results

## Summary
Found 3 plays matching your query for Account Verification in Enterprise segment.

## Results

### 1. Account Verification Discovery
- **Type**: Discovery
- **Playbook**: Enterprise Banking Playbook
- **Description**: Essential discovery questions for account verification setup
- **Use When**: Initial client meetings and needs assessment

### 2. Enterprise API Demo
- **Type**: Demo
- **Playbook**: Technical Integration Playbook
- **Description**: Step-by-step API demonstration for enterprise clients
- **Use When**: Technical evaluation phase

## Insights
- Strong coverage for Discovery and Demo phases
- Consider adding more competitive positioning content
- ROI calculators available for enterprise deals

## Recommendations
- Start with discovery play to understand current process
- Prepare technical demo focusing on API simplicity
- Have competitive battle cards ready for EWS comparison
```

## 🤝 Contributing

Found a bug or want to contribute?

1. **Issues**: Report bugs at [GitHub Issues](https://github.com/your-username/sales-intelligence-mcp/issues)
2. **Feature Requests**: Suggest improvements via issues
3. **Pull Requests**: Contributions welcome!

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **GitHub Repository**: https://github.com/your-username/sales-intelligence-mcp
- **NPM Package**: https://www.npmjs.com/package/@your-org/sales-intelligence-mcp
- **Issues & Support**: https://github.com/your-username/sales-intelligence-mcp/issues
- **MCP Protocol**: https://modelcontextprotocol.io/

---

**Ready to get started?** Run `npx @your-org/sales-intelligence-mcp` and configure Cursor to unlock AI-powered sales intelligence! 🚀