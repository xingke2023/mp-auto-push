# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WeChat Official Account auto-publishing tool that:
- Fetches daily news from 60s API
- Uses AI (YuanBao/OpenAI) to generate articles
- Publishes articles to WeChat Official Account draft box or publishes directly
- Runs as a scheduled background service (daemon)
- Provides REST API for remote integration

## Key Commands

### Development & Execution
```bash
# Single execution (manual push)
npm start

# Development mode (with debug output)
npm run dev

# Start API server
npm run api                  # Production mode
npm run api:dev              # Development mode

# View help and configuration
npm run help
npm run config
```

### Background Service Management
```bash
# Using daemon directly
npm run daemon:start         # Start background service
npm run daemon:stop          # Stop background service
npm run daemon:restart       # Restart service
npm run daemon:status        # Check status
npm run daemon:run           # Manually trigger one push

# Using PM2 (recommended for production)
npm run pm2:start            # Start with PM2
npm run pm2:stop             # Stop PM2 service
npm run pm2:restart          # Restart PM2 service
npm run pm2:status           # Check PM2 status
npm run pm2:logs             # View PM2 logs

# Restart specific PM2 service (useful after code changes)
pm2 restart mp-auto-push-api # Restart API server
pm2 status                   # Check all PM2 services
pm2 logs mp-auto-push-api --lines 50  # View recent logs
```

### Environment Configuration
Configuration is loaded from `.env` file with `override: true`, meaning `.env` takes priority over system environment variables. See `.env.example` for all available options.

## Architecture Overview

### Three-Mode Operation

1. **Single Execution Mode** (`src/index.js`)
   - Runs once: fetch news → generate article → push to WeChat/save locally
   - Entry: `npm start` or `node src/index.js`
   - Used for manual/on-demand publishing

2. **Background Daemon Mode** (`src/daemon.js`)
   - Runs continuously with scheduled tasks via `src/scheduler.js`
   - Default schedule: Daily at 8:00 AM (configurable via cron expressions)
   - Health checks every hour
   - Signal handling: SIGTERM/SIGINT for shutdown, SIGUSR2 for restart, SIGUSR1 for status
   - Entry: `npm run daemon:start` or `node src/daemon.js start`

3. **API Server Mode** (`src/apiServer.js`)
   - RESTful API for remote integration
   - Endpoints for draft creation, publishing, image upload, OCR, AI image generation, translation
   - Authentication via `X-API-Key` header or `Authorization: Bearer <token>`
   - CORS enabled for cross-origin requests
   - Entry: `npm run api` or `node src/apiServer.js`
   - Default port: 5003 (configurable via `API_PORT`)

### Core Services Architecture

**Service Layer** (all in `src/`):
- `newsService.js` - Fetches from 60s API
- `aiService.js` - YuanBao AI article generation
- `wechatService.js` - WeChat Official Account API integration (access token management, draft/publish operations)
- `googleImageService.js` - Google Gemini image generation (text-to-image, image editing, composition)
- `deepseekService.js` - DeepSeek AI for article rewriting
- `translateService.js` - Google Translate integration (100+ languages)
- `paddleOCRService.js` - Paddle OCR for PDF and image text recognition
- `paddleLayoutService.js` - Paddle Layout for advanced PDF/image layout parsing to Markdown
- `db.js` - MySQL database for image URL storage
- `logger.js` - Winston logging (app.log, error.log, schedule.log)

**Flow in Single/Daemon Mode**:
```
AutoPushApp (index.js)
  → NewsService.getLatestNews()
  → AIService.generateArticle()
  → WeChatService.parseArticle()
  → WeChatService.createDraft() + optional publishDraft()
  → saveArticleToFile() (local backup in output/<year>/<month>/)
```

**API Server Integration**:
- Provides HTTP endpoints exposing service functionality
- Supports client-provided credentials (appId/appsecret) for multi-tenant scenarios
- Database integration for tracking uploaded images
- Combines multiple services (OCR + AI rewriting, AI image generation + WeChat upload)

### Configuration Priority

Environment variables are loaded with `override: true` in all entry points, meaning:
1. `.env` file values (highest priority)
2. System environment variables (lowest priority)

This is critical for deployment - local `.env` always wins.

### WeChat Title Optimization

The `wechatService.js` supports intelligent title optimization via `titleMode` parameter:
- `smart` (default): Automatically optimizes title if needed
- `keep`: Keeps original title unchanged
- `force`: Forces title optimization regardless

Title optimization includes:
- Adding emoji strategically
- Adding numbers/statistics
- Adding question marks for engagement
- Optimizing structure (contrast, suspense, benefit)

### Logging System

Winston-based logging with multiple outputs:
- `logs/app.log` - General application logs
- `logs/error.log` - Error logs only
- `logs/schedule.log` - Scheduler-specific logs
- Console output (colored) in development mode

Service mode (`serviceMode: true`) uses logger, CLI mode uses console directly.

### File Storage

Articles are saved locally to `output/<YYYY>/<MM>/` with:
- Markdown format: `article_<date>_<timestamp>.md`
- JSON metadata: `article_<date>_<timestamp>.json`

Both formats are saved as backup regardless of WeChat push status.

## API Server Details

### Authentication
- Set `API_KEY` in `.env` for production
- Pass via `X-API-Key` header or `Authorization: Bearer <key>`
- If `API_KEY` not set, authentication is skipped (development only)

### Key Endpoints
- `POST /api/draft/create` - Create draft with server credentials
- `POST /api/draft/create-with-credentials` - Create draft with client credentials (supports `appId` or `appID` parameter names)
- `POST /api/draft/publish` - Publish existing draft
- `POST /api/draft/create-and-publish` - Create and publish in one call
- `POST /api/media/upload-image-url` - Upload image from URL (auto-saves to database)
- `POST /api/image/generate` - Generate AI image via Google Gemini
- `POST /api/image/generate-wechat` - Generate AI image and upload to WeChat
- `POST /api/image/ocr` - Batch OCR for image text extraction (Tencent Cloud)
- `POST /api/image/generate-article` - OCR + AI rewriting pipeline
- `POST /api/paddle-ocr/pdf` - PDF document OCR (Paddle OCR, max 50MB)
- `POST /api/paddle-ocr/image` - Image OCR (Paddle OCR, max 10MB)
- `POST /api/paddle-ocr/batch` - Batch document OCR (Paddle OCR, max 20 files)
- `POST /api/paddle-layout/pdf` - PDF layout parsing to Markdown (Paddle Layout, preserves structure, max 50MB)
- `POST /api/paddle-layout/image` - Image layout parsing to Markdown (Paddle Layout, max 10MB)
- `POST /api/paddle-layout/batch` - Batch layout parsing to Markdown (Paddle Layout, max 20 files)
- `POST /api/translate` - Translate text (Google Translate)
- `POST /api/translate/batch` - Batch translation
- `GET /api/images/list` - Query uploaded images from database

### Database Schema
Image records stored in MySQL with fields:
- `url` - WeChat image URL
- `basename` - Category/tag for grouping
- `original_url` - Source URL (if uploaded from URL)
- `file_size` - Image size in bytes
- `content_type` - MIME type
- `created_at` - Upload timestamp

Database is optional - API continues working without it, but won't track uploaded images.

## Development Notes

### Adding New Scheduled Tasks
Use `Scheduler.addTask(name, cronExpression, taskFunction)` in `src/scheduler.js`:
```javascript
scheduler.addTask('custom-task', '0 12 * * *', async () => {
  // Custom logic
});
```

### Service Mode Flag
When creating `AutoPushApp`, pass `{ serviceMode: true }` to use logger instead of console. This is important for background services.

### Access Token Caching
`WeChatService` automatically manages access token lifecycle:
- Caches token in memory with expiration
- Auto-refreshes when expired
- Thread-safe (prevents concurrent refresh)

### PM2 Configuration
See `ecosystem.config.js`:
- Auto-restart on crashes
- Memory limit: 1GB
- Daily restart at 4:00 AM
- Logs in `logs/pm2-*.log`

### Image Generation Capabilities
Google Gemini 2.5 Flash Image supports:
1. **Text-to-Image**: Generate from text prompt
2. **Image Editing**: Modify single image with instructions
3. **Image Composition**: Combine multiple images (up to 10)

### Translation Features
Google Translate integration provides:
- 100+ language support
- Auto language detection
- Word dictionary lookup (definitions, examples, synonyms)
- Batch translation (up to 100 texts)

### Paddle OCR Features
Paddle OCR integration provides:
- PDF document text recognition (up to 50MB per file)
- Image text recognition (JPG, PNG, GIF, BMP, up to 10MB per file)
- Batch processing (up to 20 files at once)
- Optional features: document orientation classification, document unwarping, text line orientation
- Optional image saving: saves recognition result images to `output/paddle-ocr/`
- Base64 conversion handled automatically by service
- Supports both server-level and client-level configuration (via `paddleApiUrl` and `paddleToken` parameters)

### Paddle Layout Features (Advanced)
Paddle Layout integration provides (more advanced than Paddle OCR):
- **PDF/Image to Markdown conversion**: Preserves document structure and formatting
- **Document structure recognition**: Identifies headers, paragraphs, lists, tables, images
- **Markdown output with embedded images**: Returns Markdown text with image references
- **Image extraction**: Saves all document images separately
- **Output images**: Saves processed page images for verification
- File support: PDF (up to 50MB), Images (JPG, PNG, GIF, BMP, up to 10MB)
- Batch processing (up to 20 files at once)
- Optional features: document orientation classification, document unwarping, chart recognition
- Optional file saving: saves Markdown files and all images to `output/paddle-layout/`
- Base64 conversion handled automatically by service
- Supports both server-level and client-level configuration (via `paddleLayoutApiUrl` and `paddleLayoutToken` parameters)

## Common Development Tasks

### Testing API Endpoints Locally
```bash
# Start API server in dev mode
npm run api:dev

# Test with curl
curl -X POST http://localhost:5003/api/draft/create \
  -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Content"}'
```

### Testing Translation API
```bash
# Translate text
curl -X POST http://localhost:5003/api/translate \
  -H "X-API-Key: 0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","to":"zh-CN"}'
```

### Testing Paddle OCR API
```bash
# Test PDF recognition
curl -X POST http://localhost:5003/api/paddle-ocr/pdf \
  -H "X-API-Key: 0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647" \
  -F "file=@./test.pdf" \
  -F "saveImages=true"

# Test image recognition
curl -X POST http://localhost:5003/api/paddle-ocr/image \
  -H "X-API-Key: 0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647" \
  -F "file=@./test.jpg"

# Or use the test script (requires test.pdf and test.jpg in project root)
node test-paddle-ocr.js           # Test all features
node test-paddle-ocr.js pdf       # Test PDF only
node test-paddle-ocr.js image     # Test image only
node test-paddle-ocr.js batch     # Test batch processing
```

### Testing Paddle Layout API (Advanced)
```bash
# Test PDF layout parsing
curl -X POST http://localhost:5003/api/paddle-layout/pdf \
  -H "X-API-Key: 0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647" \
  -F "file=@./test.pdf" \
  -F "saveFiles=true"

# Test image layout parsing
curl -X POST http://localhost:5003/api/paddle-layout/image \
  -H "X-API-Key: 0dbe66d87befa7a9d5d7c1bdbc631a9b7dc5ce88be9a20e41c26790060802647" \
  -F "file=@./test.jpg"

# Or use the test script (requires test.pdf and test.jpg in project root)
node test-paddle-layout.js           # Test all features
node test-paddle-layout.js pdf       # Test PDF only
node test-paddle-layout.js image     # Test image only
node test-paddle-layout.js batch     # Test batch processing
```

### Debugging Scheduled Tasks
Set `NODE_ENV=development` to enable per-minute test execution:
```bash
NODE_ENV=development npm run daemon:start
```

### Manual Push Execution
When daemon is running, trigger manual push without waiting for schedule:
```bash
npm run daemon:run
```

### Checking Logs
```bash
# Application logs
tail -f logs/app.log

# Scheduler logs
tail -f logs/schedule.log

# Error logs
tail -f logs/error.log

# PM2 logs
npm run pm2:logs
```

### Environment Variable Priority Testing
To verify `.env` takes priority:
```bash
# Set system env
export YUANBAO_TOKEN=system_value

# .env has different value
# Result: .env value will be used (override: true)
npm start
```

## WeChat API Limitations

- Image upload: Max 10MB, formats: JPG/PNG/GIF
- Draft content: Must be valid HTML (use marked library for Markdown conversion)
- Access token: Valid for 7200 seconds (auto-managed)
- Publishing: May require manual review depending on content type
- API rate limits apply per official account

## External Dependencies

- **60s API**: `https://60s.viki.moe/v2/60s` - Daily news source
- **YuanBao AI**: Tencent's AI service for article generation
- **WeChat Official Account API**: For publishing
- **Google Gemini**: For AI image generation
- **Google Translate**: For text translation (via @vitalets/google-translate-api)
- **Tencent Cloud OCR**: For image text recognition
- **DeepSeek AI**: For article rewriting and content generation
- **Paddle OCR**: For PDF and image text recognition (configurable API endpoint)
- **Paddle Layout**: For advanced PDF/image layout parsing to Markdown (configurable API endpoint)

## Important Implementation Details

### Multi-Tenant Support
API endpoints support both server-level and client-level credentials:
- Server-level: Uses `WECHAT_APP_ID` and `WECHAT_APP_SECRET` from `.env`
- Client-level: Accepts `appId`/`appID` and `appsecret` in request body (creates temporary service instances)

### Error Handling
Services throw errors that bubble up to callers. Always wrap service calls in try-catch:
```javascript
try {
  const result = await wechatService.createDraft(data);
} catch (error) {
  logger.error('Draft creation failed:', error);
  // Handle error
}
```

### Auto-Publish Feature
When `AUTO_PUBLISH=true` in `.env`:
1. Draft is created
2. Draft is immediately published
3. Optionally checks publish status if `CHECK_PUBLISH_STATUS=true`

Status codes:
- 0: Published successfully
- 1: Publishing in progress
- 2: Failed

### Database Connection
Database initialization is non-blocking - API server continues working even if DB connection fails. Image tracking features will be unavailable but other endpoints remain functional.

### Paddle OCR Implementation
The Paddle OCR service (`paddleOCRService.js`) provides a JavaScript wrapper for Paddle OCR API:
- Automatically handles file-to-base64 conversion (Python equivalent: `base64.b64encode()`)
- Supports both server-level configuration (`.env`) and client-level configuration (request parameters)
- `fileType` parameter: 0 for PDF, 1 for image (same as Python implementation)
- Optional image downloading and saving from OCR results
- Batch processing with individual error handling per file
- Timeout: 300 seconds (5 minutes) for single files, configurable for batch operations
- Recognition results include text content and optional image URLs
- Saved images stored in `output/paddle-ocr/<filename>_<index>.jpg`

**Python to JavaScript mapping**:
```python
# Python original
file_data = base64.b64encode(file_bytes).decode("ascii")
payload = {"file": file_data, "fileType": 0}
response = requests.post(API_URL, json=payload, headers=headers)
```

```javascript
// JavaScript implementation (in paddleOCRService.js)
const fileData = fileBuffer.toString('base64');
const payload = {file: fileData, fileType: 0};
const response = await axios.post(apiUrl, payload, {headers});
```

See `PADDLE_OCR_API_GUIDE.md` and `PADDLE_OCR_QUICK_START.md` for detailed usage instructions.
