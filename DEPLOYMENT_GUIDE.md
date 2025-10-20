# Jack Portal Deployment Guide

## Prerequisites

Before deploying Jack Portal, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Wrangler CLI installed (`npm install -g wrangler`)
- ✅ Cloudflare account with Workers enabled
- ✅ API keys for search providers (see below)

## API Keys Setup

### 1. Google Custom Search
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Custom Search API
4. Create API credentials (API Key)
5. Go to [Custom Search Engine](https://cse.google.com/)
6. Create a new search engine
7. Get your Search Engine ID

### 2. Brave Search API
1. Go to [Brave Search API](https://api.search.brave.com/)
2. Sign up for API access
3. Get your API key from dashboard

### 3. Yandex Search API
1. Go to [Yandex XML](https://xml.yandex.com/)
2. Register for API access
3. Get your API key

### 4. AdultMedia API (Optional)
- Contact provider for API access
- May require special permissions

## Local Development

### 1. Clone and Setup
```bash
git clone https://github.com/itstanner5216/Workspace.git
cd Workspace
npm install
```

### 2. Configure Environment
```bash
# Copy the development vars template
cp .dev.vars.example .dev.vars

# Edit with your API keys
GOOGLE_API_KEY=your_actual_google_api_key
GOOGLE_CSE_ID=your_actual_google_cse_id
BRAVE_API_KEY=your_actual_brave_api_key
YANDEX_API_KEY=your_actual_yandex_api_key
ADULTMEDIA_API_KEY=your_actual_adultmedia_api_key
```

### 3. Test Locally
```bash
# Start development server
npm run dev

# Test the API
curl "http://localhost:8787/api/search?q=test"

# Test health endpoint
curl "http://localhost:8787/health"
```

## Cloudflare Workers Deployment

### 1. Authenticate with Cloudflare
```bash
wrangler auth login
```

### 2. Configure Worker
Edit `wrangler.toml` if needed:
```toml
name = "jack-portal"
main = "src/worker.js"
compatibility_date = "2024-01-01"

# KV namespace (already configured)
[[kv_namespaces]]
binding = "CACHE"
id = "6779e4f7493e4b6ca1c8e2ce5b2ebe39"
preview_id = "02133c1d0165429f8bd8960915d0994e"
```

### 3. Set Production Secrets
```bash
# Set API keys as secrets (more secure than environment variables)
wrangler secret put GOOGLE_API_KEY
wrangler secret put GOOGLE_CSE_ID
wrangler secret put BRAVE_API_KEY
wrangler secret put YANDEX_API_KEY
wrangler secret put ADULTMEDIA_API_KEY
```

### 4. Deploy
```bash
# Test deployment (dry run)
wrangler deploy --dry-run

# Deploy to production
wrangler deploy
```

### 5. Verify Deployment
```bash
# Check deployment status
wrangler tail

# Test production API
curl "https://jack-portal.your-subdomain.workers.dev/api/search?q=test"

# Test health endpoint
curl "https://jack-portal.your-subdomain.workers.dev/health"
```

## Custom Domain Setup (Optional)

### 1. Add Custom Domain to Cloudflare
1. Go to Cloudflare Dashboard
2. Select your domain
3. Go to Workers > Routes
4. Add route: `your-domain.com/*` → `jack-portal`

### 2. Update DNS (if needed)
- Ensure your domain points to Cloudflare
- Add CNAME record if required

### 3. Test Custom Domain
```bash
curl "https://your-domain.com/api/search?q=test"
```

## Environment Configuration

### Production Environment Variables
```bash
# Via wrangler secrets (recommended)
wrangler secret put LOG_LEVEL
wrangler secret put MAX_LIMIT
wrangler secret put CACHE_TTL

# Or via wrangler.toml
[vars]
LOG_LEVEL = "INFO"
MAX_LIMIT = "20"
CACHE_TTL = "3600"
```

### Development vs Production
- **Development:** Uses `.dev.vars` file
- **Production:** Uses Wrangler secrets
- **Staging:** Can use separate environment in `wrangler.toml`

## Monitoring and Maintenance

### 1. Enable Analytics
```bash
# View real-time logs
wrangler tail

# View analytics in Cloudflare Dashboard
# Workers > jack-portal > Analytics
```

### 2. Monitor Performance
- Check response times via `X-Response-Time` header
- Monitor cache hit rates via `X-Cache-Status`
- Track error rates in logs

### 3. Update API Keys
```bash
# Rotate API keys
wrangler secret put GOOGLE_API_KEY
wrangler secret put BRAVE_API_KEY
# ... etc

# Deploy updated configuration
wrangler deploy
```

### 4. Backup Configuration
```bash
# Export current configuration
wrangler kv:key list --namespace-id 6779e4f7493e4b6ca1c8e2ce5b2ebe39 > kv_backup.json
```

## Troubleshooting

### Common Deployment Issues

1. **Authentication Failed**
   ```bash
   wrangler auth login
   wrangler whoami
   ```

2. **Build Errors**
   ```bash
   # Check for syntax errors
   npm run lint

   # Validate wrangler configuration
   wrangler deploy --dry-run
   ```

3. **API Key Issues**
   ```bash
   # Verify secrets are set
   wrangler secret list

   # Check API key validity
   curl "https://your-worker.workers.dev/api/search?q=test"
   ```

4. **Rate Limiting**
   - Check `X-Rate-Limit-*` headers
   - Monitor request patterns
   - Adjust limits in code if needed

5. **CORS Issues**
   - Verify CORS headers in responses
   - Check browser developer tools
   - Ensure proper preflight handling

### Performance Optimization

1. **Enable Caching**
   - KV caching is already configured
   - Monitor cache hit rates
   - Adjust TTL as needed

2. **Optimize Bundle Size**
   ```bash
   # Analyze bundle
   wrangler build --outdir dist
   du -sh dist/*
   ```

3. **Monitor Usage**
   - Check Cloudflare dashboard for usage stats
   - Monitor API provider usage limits
   - Set up alerts for high usage

## Security Checklist

- ✅ API keys stored as secrets
- ✅ Input validation implemented
- ✅ Rate limiting configured
- ✅ CORS properly configured
- ✅ Error messages don't leak sensitive info
- ✅ HTTPS enforced by Cloudflare
- ✅ Request logging enabled

## Rollback Procedure

If deployment fails:

```bash
# Check recent deployments
wrangler deployments list

# Rollback to previous version
wrangler deployments rollback <deployment-id>

# Verify rollback
curl "https://your-worker.workers.dev/health"
```

## Support and Resources

- **Cloudflare Workers Docs:** https://developers.cloudflare.com/workers/
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/
- **KV Storage:** https://developers.cloudflare.com/kv/
- **API Documentation:** See `API_DOCUMENTATION.md`

---

*Deployment Guide Version: 2.0.0 | Last Updated: September 2, 2025*</content>
<parameter name="filePath">c:\Users\tanne\ProjectFolder\Workspace\DEPLOYMENT_GUIDE.md
