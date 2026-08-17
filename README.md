# Modern Site Inspection PDF Generator

A production-ready, enterprise-grade Node.js & TypeScript microservice that builds publication-quality PDF site inspection reports from structured Monday.com JSON metadata and Make.com binary image uploads.

---

## Key Capabilities

* 📥 **Binary Stream Uploads**: Accepts `multipart/form-data` with structured `metadata` JSON + repeated binary file fields (`images`) downloaded directly from Monday.com by Make.com (no public image URLs needed).
* 📝 **Fixed Questions & Dynamic Answers**: Maps dynamic Monday.com column responses to fixed template questions without re-sending question labels on every request.
* 🏷️ **Automatic Status Normalisation**: Maps raw answers ("Completed", "Partially Completed", "Cannot Install", "Water Onsite") to status badges (`completed`, `attention`, `cannot_install`, `not_required`, `ordered`) with visual icons.
* 🚨 **Outstanding Items Summary**: Automatically extracts non-compliant items requiring builder action into a highlighted executive summary card.
* 🖼️ **Sharp Image Processing**: EXIF auto-rotation, mime-type validation, adaptive downscaling, and JPEG quality optimization.
* 🗜️ **Multi-Pass Adaptive PDF Compression**: Monitors rendered PDF size against target (default 20 MB) and dynamically executes Pass 1 (High), Pass 2 (Balanced), or Pass 3 (Compressed) profiles.
* 🎨 **Publication-Grade PDF Design System**: Dark Navy (`#0F172A`), Electric Blue (`#00AEEF`), Teal (`#14B8A6`), rounded cards, crisp borders, cover page hero image gradient overlay, and structured photographic evidence gallery.
* 🖥️ **Integrated Web Preview Interface**: Built-in interactive Web UI at `http://localhost:3000` for testing metadata JSON, uploading binary images, previewing generated PDFs inline, and inspecting compression diagnostics.
* 🔒 **Security & Reliability**: Bearer token authentication, idempotency caching (`Idempotency-Key` header), multipart file size limits, and graceful error handling.

---

## Technology Stack

* **Language & Runtime**: Node.js & TypeScript
* **Web Framework**: Fastify (`@fastify/multipart`, `@fastify/static`, `@fastify/cors`)
* **PDF Rendering Engine**: Playwright Chromium (Headless)
* **Image Processing Engine**: Sharp
* **Template Engine**: Handlebars HTML/CSS
* **Validation**: Zod Schemas

---

## Directory Structure

```text
├── public/
│   └── index.html                # Interactive Web Preview & Test Application
├── src/
│   ├── api/
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts# Bearer API Key Authentication
│   │   └── routes/
│   │       └── inspection.routes.ts # Primary POST /generate & GET /download routes
│   ├── config/
│   │   ├── inspection-templates/ # JSON template configurations
│   │   │   └── lower-hebel-site-check-1.json
│   │   └── template-loader.ts    # Template registry & loader
│   ├── schemas/
│   │   ├── inspection.schema.ts  # Zod validation schemas & TypeScript types
│   │   └── template.schema.ts    # Inspection template Zod schema
│   ├── services/
│   │   ├── image-processing.service.ts # Sharp auto-orient & resizing
│   │   ├── multipart.service.ts        # Fastify multipart stream extractor
│   │   ├── pdf-compression.service.ts  # Adaptive multi-pass PDF optimizer
│   │   ├── pdf-rendering.service.ts    # Playwright Chromium HTML-to-PDF compiler
│   │   ├── report-data.service.ts      # ViewModel builder & stats aggregator
│   │   ├── status-normaliser.service.ts# Response status categorizer
│   │   └── storage.service.ts          # Local temporary PDF storage manager
│   ├── templates/
│   │   ├── inspection-report.hbs       # Master print HTML template
│   │   └── styles.css                  # Print CSS design system
│   └── server.ts                       # Fastify application bootstrap
├── scripts/
│   ├── generate-sample-pdf.ts          # CLI script generating production sample PDF
│   ├── generate-preview-images.ts      # Screenshot generator script
│   └── test-runner.ts                  # Comprehensive automated test suite
├── docs/
│   ├── MAKE_INTEGRATION.md             # Make.com scenario setup & mapping guide
│   ├── POSTMAN_CURL_EXAMPLES.md        # cURL scripts & Postman collection format
│   └── TEMPLATE_GUIDE.md               # Guide for creating new inspection templates
├── package.json
└── tsconfig.json
```

---

## Quick Start & Setup

### 1. Installation

```bash
# Clone or navigate to directory
cd /Users/ihtishamali/Jon_pdf_setup

# Install dependencies
npm install

# Install Playwright Chromium browser
npx playwright install chromium
```

### 2. Run Sample PDF Generation CLI

Compile sample inspection data and 3 test images into a real PDF output:

```bash
npm run generate:sample
```

Output file created: `sample_output_inspection_report.pdf` (approx. 0.64 MB).

### 3. Run Automated Test Suite

Verify all service modules, Zod validation, status normalizer, Sharp image processing, and PDF rendering:

```bash
npm test
```

### 4. Start Development Server & Preview UI

```bash
npm run dev
```

Open your browser at `http://localhost:3000` to access the interactive previewer.

---

## Environment Variables Configuration (`.env`)

Create a `.env` file in the root directory:

```env
PORT=3000
HOST=0.0.0.0
API_KEY=YOUR_SECURE_API_KEY
LOG_LEVEL=info
```

---

---

## API Endpoints

### 1. Generate Report (`POST /api/v1/inspection-reports/generate`)

```http
POST /api/v1/inspection-reports/generate
Content-Type: multipart/form-data
Authorization: Bearer YOUR_SECURE_API_KEY
Idempotency-Key: HSC1-4106-20260402
```

#### Request Fields

* `metadata` (Text/JSON string): JSON containing property, inspector, template ID, and dynamic answers.
* `images` (Binary file, repeated): One or multiple binary image files downloaded by Make.com.
* `logo` *(optional binary file)*: Company logo image.
* `coverImage` *(optional binary file)*: Custom hero image for cover page.

#### JSON Response Example

```json
{
  "success": true,
  "reportId": "HSC1-4106-20260402",
  "fileName": "HSC1-4106-20260402.pdf",
  "pdfUrl": "http://localhost:3000/api/v1/inspection-reports/download/HSC1-4106-20260402.pdf",
  "pdfSizeBytes": 673385,
  "pdfSizeMb": 0.64,
  "pageCount": 5,
  "receivedImageCount": 3,
  "processedImageCount": 3,
  "failedImageCount": 0,
  "compressionProfile": "high",
  "warnings": []
}
```

### 2. Download Report by ID / Filename (`GET /api/v1/inspection-reports/download/:fileName`)

Download or preview a specific generated PDF report.

### 3. Get / Download Latest Generated Report

* **Get Metadata (JSON):** `GET /api/v1/inspection-reports/latest`
* **Direct Binary PDF Stream:** `GET /api/v1/inspection-reports/latest/download` (or `GET /api/v1/inspection-reports/latest?format=binary`)

Returns the most recently created inspection report automatically.

### 4. List Templates (`GET /api/v1/inspection-reports/templates`)

Returns all available inspection templates.

---

## Documentation Links

* 📖 [Make.com Integration Guide](docs/MAKE_INTEGRATION.md)
* 🧪 [Postman & cURL Examples](docs/POSTMAN_CURL_EXAMPLES.md)
* 📋 [Adding New Inspection Templates](docs/TEMPLATE_GUIDE.md)

---

## License

MIT License. Developed for enterprise construction site inspection workflows.
