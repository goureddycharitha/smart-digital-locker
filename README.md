# Smart Digital Locker - Backend REST API

A secure, high-performance digital document management backend built with **Node.js**, **Express.js**, **SQLite**, and **JSON Web Tokens (JWT)**.

This system provides RESTful APIs for user registration, authentication, safe profile management, and end-to-end document operations (uploading, categorizing, searching, paginating, downloading, and deleting files) with strict data isolation and ownership enforcement.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture & Folder Structure](#architecture--folder-structure)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Environment Variables](#environment-variables)
7. [Database Schema & Architecture](#database-schema--architecture)
8. [Running the Server](#running-the-server)
9. [Automated Test Suite](#automated-test-suite)
10. [API Documentation](#api-documentation)
    - [Health Check](#health-check)
    - [Authentication APIs](#authentication-apis)
    - [User Profile APIs](#user-profile-apis)
    - [Document Management APIs](#document-management-apis)
11. [Postman Testing Guide](#postman-testing-guide)
12. [Security Architecture & Protections](#security-architecture--protections)
13. [Production Roadmap & Security Limitations](#production-roadmap--security-limitations)
14. [Frontend Integration Guide (React / Vanilla JS)](#frontend-integration-guide)
15. [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## 1. Project Overview

The **Smart Digital Locker** backend addresses the challenge of managing student and institutional documents securely. It eliminates hardcoded static file directories and insecure file sharing by enforcing:
- **Strict User Isolation**: Users cannot view, download, or delete documents belonging to other users.
- **Deep File Inspection**: Uploaded files undergo MIME type verification, extension whitelisting, and low-level magic byte signature validation to prevent file spoofing.
- **Zero Sensitive Data Exposure**: Password hashes, internal server filesystem paths, and cryptographic secrets are never exposed in API responses or error logs.
- **Automatic Lifecycle Management**: Orphaned physical files are purged immediately if validation or database persistence fails.

---

## 2. Technology Stack

- **Runtime Environment**: [Node.js](https://nodejs.org/) (v18.x - v24.x)
- **Web Framework**: [Express.js](https://expressjs.com/) v4.21.2
- **Database Engine**: [SQLite](https://www.sqlite.org/) via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (high-speed synchronous prepared statements)
- **Authentication**: [JSON Web Token (JWT)](https://jwt.io/) via `jsonwebtoken`
- **Password Hashing**: [bcrypt](https://github.com/kelektiv/node.bcrypt.js) (cost factor: 12 salt rounds)
- **File Upload Handler**: [Multer](https://github.com/expressjs/multer)
- **Security Headers**: [Helmet](https://helmetjs.github.io/)
- **CORS Protection**: [cors](https://github.com/expressjs/cors)
- **Rate Limiting**: [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
- **Validation**: [express-validator](https://express-validator.github.io/)
- **Automated Testing**: [Jest](https://jestjs.io/) and [Supertest](https://github.com/ladjs/supertest)

---

## 3. Architecture & Folder Structure

```
smart-digital-locker/
│
├── server.js                      # Application entry point, middleware & route loader
├── package.json                   # Dependency definitions and scripts
├── .env                           # Local environment configuration (git-ignored)
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore rules for node_modules, uploads, DB
├── README.md                      # Comprehensive developer & API documentation
│
├── config/
│   └── database.js                # SQLite connection manager, schema runner & PRAGMAs
│
├── controllers/
│   ├── authController.js          # Registration and login HTTP handlers
│   ├── userController.js          # Profile retrieval and profile update handlers
│   └── documentController.js      # Document upload, query, download, and delete handlers
│
├── middleware/
│   ├── authMiddleware.js          # JWT Bearer verification and user identity extraction
│   ├── uploadMiddleware.js        # Multer disk storage, path resolution & magic byte checks
│   ├── rateLimitMiddleware.js     # IP rate limiters for general APIs and auth brute-force
│   └── errorMiddleware.js         # Centralized error mapping, 404 handler, safe JSON formatting
│
├── routes/
│   ├── authRoutes.js              # /api/auth endpoints (register, login)
│   ├── userRoutes.js              # /api/users endpoints (me)
│   └── documentRoutes.js          # /api/documents endpoints (CRUD, download)
│
├── services/
│   ├── authService.js             # User hashing, credential verification, JWT generation
│   ├── userService.js             # Profile queries and field updates
│   └── documentService.js         # Document metadata DB operations & disk file lifecycle
│
├── utils/
│   ├── tokenUtils.js              # Token signing and cryptographic verification helpers
│   └── validationUtils.js         # express-validator rule chains and validation handler
│
├── database/
│   ├── schema.sql                 # DDL schema for users, documents, and indices
│   └── locker.sqlite              # SQLite database file (created on startup)
│
├── uploads/                       # Secure file storage folder (never exposed statically)
│   └── .gitkeep
│
└── tests/
    ├── auth.test.js               # Tests for auth, validation, tokens, and profiles
    └── documents.test.js          # Tests for uploads, magic bytes, downloads, isolation
```

---

## 4. Prerequisites

Before running the project, verify that your machine has:
1. **Node.js**: Version 18.0.0 or higher.
   Check version:
   ```bash
   node -v
   ```
2. **npm**: Version 8.0.0 or higher.
   Check version:
   ```bash
   npm -v
   ```
   *(Note for Windows PowerShell: If execution policies block `npm`, run `npm.cmd` or use a standard command prompt / Git Bash).*

---

## 5. Installation & Setup

1. Open your terminal in the project directory:
   ```bash
   cd c:\Users\gchar\Downloads\Digilocker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env` (already done by default):
   ```bash
   cp .env.example .env
   ```

4. The SQLite database file (`./database/locker.sqlite`) and tables will automatically initialize on the first server launch. No manual database setup scripts are required!

---

## 6. Environment Variables

All sensitive settings are managed through `.env`:

| Variable | Description | Default Value |
|---|---|---|
| `PORT` | HTTP port where Express listens | `5000` |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` |
| `DB_PATH` | Path to SQLite database file | `./database/locker.sqlite` |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens | *(32+ char secret string)* |
| `JWT_EXPIRES_IN` | Token validity duration | `24h` |
| `UPLOAD_DIR` | Storage directory for uploaded documents | `./uploads` |
| `MAX_FILE_SIZE` | Maximum upload size in bytes (10MB) | `10485760` |
| `ALLOWED_ORIGINS` | Permitted frontend origins for CORS | `http://localhost:3000,http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting evaluation window in ms | `900000` (15 mins) |
| `RATE_LIMIT_MAX_REQUESTS` | Allowed general requests per window | `100` |
| `AUTH_RATE_LIMIT_MAX_REQUESTS`| Allowed auth requests per window | `10` |

---

## 7. Database Schema & Architecture

SQLite operates with **WAL (Write-Ahead Logging)** mode and explicit **Foreign Key enforcement** enabled:

```sql
PRAGMA foreign_keys = ON;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    stored_file_name TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Fast Indexing
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);
```

---

## 8. Running the Server

### Production / Standard Mode
```bash
npm start
```

### Development Mode (Node Auto-Reload)
```bash
npm run dev
```

The server will output:
```
=========================================
 SMART DIGITAL LOCKER SERVER STARTED 
 Port: 5000
 Environment: development
 Health check: http://localhost:5000/api/health
=========================================
```

---

## 9. Automated Test Suite

Run the full automated test suite containing all 16 project scenarios:

```bash
npm test
```

The tests cover:
1. User registration with validation and password policy.
2. Duplicate email rejection (HTTP 409).
3. Login with valid credentials and JWT issuance.
4. Login with invalid credentials and generic user-enumeration defense.
5. Missing JWT Bearer token rejection (HTTP 401).
6. Malformed/tampered JWT token rejection (HTTP 401).
7. Authenticated user profile retrieval and safe updates.
8. Document upload (PDF, PNG, TXT).
9. Mismatched file content / magic byte rejection (HTTP 415).
10. Unsupported file extension rejection (HTTP 415).
11. Oversized file rejection (> 10MB, HTTP 413).
12. Document listing with pagination, search, and category filtering.
13. Document metadata details lookup.
14. Nonexistent document ID handling (HTTP 404).
15. Cross-user isolation (User B cannot view, download, or delete User A's files).
16. Secure document streaming and download with content headers.
17. Document deletion (HTTP 204) with filesystem cleanup.

---

## 10. API Documentation

### Health Check

#### `GET /api/health`
Checks server readiness.

- **Headers**: None
- **Response** (`200 OK`):
  ```json
  {
    "status": "ok",
    "message": "Smart Digital Locker API is running"
  }
  ```

---

### Authentication APIs

#### `POST /api/auth/register`
Creates a new user account.

- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "fullName": "Demo Student",
    "email": "student@example.com",
    "password": "ChangeMe123!"
  }
  ```
- **Validation Rules**:
  - `fullName`: String, 2 to 100 characters.
  - `email`: Valid email format (case-insensitive, normalized).
  - `password`: String, 8 to 128 characters.
- **Success Response** (`201 Created`):
  ```json
  {
    "message": "Registration successful",
    "user": {
      "id": 1,
      "fullName": "Demo Student",
      "email": "student@example.com"
    }
  }
  ```
- **Error Response - Duplicate Email** (`409 Conflict`):
  ```json
  {
    "error": "An account with this email address already exists."
  }
  ```

---

#### `POST /api/auth/login`
Authenticates user credentials and generates a signed JWT.

- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "student@example.com",
    "password": "ChangeMe123!"
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "user": {
      "id": 1,
      "fullName": "Demo Student",
      "email": "student@example.com"
    }
  }
  ```
- **Error Response - Invalid Credentials** (`401 Unauthorized`):
  ```json
  {
    "error": "Invalid email or password."
  }
  ```

---

### User Profile APIs

#### `GET /api/users/me`
Retrieves the authenticated user's profile.

- **Headers**:
  ```http
  Authorization: Bearer <YOUR_JWT_TOKEN>
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "user": {
      "id": 1,
      "fullName": "Demo Student",
      "email": "student@example.com",
      "createdAt": "2026-10-09 14:30:00",
      "updatedAt": "2026-10-09 14:30:00"
    }
  }
  ```

---

#### `PUT /api/users/me`
Updates permitted profile attributes (`fullName`).

- **Headers**:
  ```http
  Authorization: Bearer <YOUR_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Request Body**:
  ```json
  {
    "fullName": "Demo Student Updated"
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "message": "Profile updated successfully",
    "user": {
      "id": 1,
      "fullName": "Demo Student Updated",
      "email": "student@example.com",
      "createdAt": "2026-10-09 14:30:00",
      "updatedAt": "2026-10-09 14:35:10"
    }
  }
  ```

---

#### `PUT /api/users/change-password`
Changes the user's password after verifying their current password.

- **Headers**:
  ```http
  Authorization: Bearer <YOUR_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Request Body**:
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewSecurePassword123!"
  }
  ```
- **Validation Rules**:
  - `currentPassword`: Required string matching stored password hash.
  - `newPassword`: Required string, 8 to 128 characters, must differ from current password.
- **Success Response** (`200 OK`):
  ```json
  {
    "message": "Password changed successfully."
  }
  ```
- **Error Response - Incorrect Current Password** (`400 Bad Request`):
  ```json
  {
    "error": "Current password is incorrect."
  }
  ```


---

### Document Management APIs

#### `POST /api/documents`
Uploads a document file and its metadata.

- **Headers**:
  ```http
  Authorization: Bearer <YOUR_JWT_TOKEN>
  Content-Type: multipart/form-data
  ```
- **Form-Data Fields**:
  - `title` *(text, required)*: Document title (2 to 200 characters).
  - `category` *(text, required)*: Category such as `Education`, `Identity`, `Financial`.
  - `description` *(text, optional)*: Short note or description.
  - `file` *(file, required)*: File attachment (PDF, JPG, PNG, TXT, DOCX; max 10MB).
- **Success Response** (`201 Created`):
  ```json
  {
    "message": "Document uploaded successfully",
    "id": 1,
    "title": "College ID",
    "description": "Sample college identification document",
    "category": "Education",
    "originalFileName": "college-id.pdf",
    "mimeType": "application/pdf",
    "fileSize": 12345,
    "uploadedAt": "2026-10-09 14:40:00",
    "updatedAt": "2026-10-09 14:40:00"
  }
  ```
- **Error Response - File Exceeds 10 MB** (`413 Payload Too Large`):
  ```json
  {
    "error": "File too large. Maximum allowed file size is 10 MB."
  }
  ```
- **Error Response - Invalid File Signature** (`415 Unsupported Media Type`):
  ```json
  {
    "error": "File signature validation failed. The content of 'test.pdf' does not match its declared type."
  }
  ```

---

#### `GET /api/documents`
Lists documents owned by the authenticated user with search, filter, and pagination.

- **Headers**:
  ```http
  Authorization: Bearer <YOUR_JWT_TOKEN>
  ```
- **Query Parameters**:
  - `page` *(optional, default: 1)*: Page number.
  - `limit` *(optional, default: 10, max: 100)*: Items per page.
  - `search` *(optional)*: Substring search across document titles.
  - `category` *(optional)*: Filter by exact category name.
- **Example**: `GET /api/documents?page=1&limit=5&category=Education&search=Degree`
- **Success Response** (`200 OK`):
  ```json
  {
    "documents": [
      {
        "id": 1,
        "title": "College Degree Certificate",
        "description": "Graduation degree certificate",
        "category": "Education",
        "originalFileName": "degree.pdf",
        "mimeType": "application/pdf",
        "fileSize": 12345,
        "uploadedAt": "2026-10-09 14:40:00",
        "updatedAt": "2026-10-09 14:40:00"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

---

#### `GET /api/documents/:id`
Retrieves metadata for a specific document.

- **Headers**:
  ```http
  Authorization: Bearer <YOUR_JWT_TOKEN>
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "document": {
      "id": 1,
      "title": "College Degree Certificate",
      "description": "Graduation degree certificate",
      "category": "Education",
      "originalFileName": "degree.pdf",
      "mimeType": "application/pdf",
      "fileSize": 12345,
      "uploadedAt": "2026-10-09 14:40:00",
      "updatedAt": "2026-10-09 14:40:00"
    }
  }
  ```
- **Error Response - Not Found or Belonging to Another User** (`404 Not Found`):
  ```json
  {
    "error": "Document not found."
  }
  ```

---

#### `PUT /api/documents/:id`
Updates metadata (title, category, description) for an existing document owned by the user.

- **Headers**:
  ```http
  Authorization: Bearer <YOUR_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Request Body**:
  ```json
  {
    "title": "Updated Degree Certificate",
    "category": "Higher Education",
    "description": "Updated official graduation degree"
  }
  ```
- **Validation Rules**:
  - `title`: Required text, 2 to 200 characters.
  - `category`: Required text, 2 to 50 characters.
  - `description`: Optional text, max 1000 characters.
- **Success Response** (`200 OK`):
  ```json
  {
    "message": "Document updated successfully",
    "document": {
      "id": 1,
      "title": "Updated Degree Certificate",
      "description": "Updated official graduation degree",
      "category": "Higher Education",
      "originalFileName": "degree.pdf",
      "mimeType": "application/pdf",
      "fileSize": 12345,
      "uploadedAt": "2026-10-09 14:40:00",
      "updatedAt": "2026-10-09 15:45:00"
    }
  }
  ```
- **Error Response - Not Found or Belonging to Another User** (`404 Not Found`):
  ```json
  {
    "error": "Document not found."
  }
  ```


---

#### `GET /api/documents/:id/download`
Streams and downloads the stored document file.

- **Headers**:
  ```http
  Authorization: Bearer <YOUR_JWT_TOKEN>
  ```
- **Response**: Binary file stream with headers:
  - `Content-Type: <mimeType>`
  - `Content-Disposition: attachment; filename="<originalFileName>"`
- **Security Check**: Returns `404 Not Found` if the document is owned by a different user.

---

#### `DELETE /api/documents/:id`
Permanently deletes a document record and deletes the physical file from server storage.

- **Headers**:
  ```http
  Authorization: Bearer <YOUR_JWT_TOKEN>
  ```
- **Success Response**: `204 No Content` (empty response body).
- **Security Check**: Returns `404 Not Found` if the document does not exist or belongs to another user.

---

## 11. Postman Testing Guide

### Step 1: Create an Environment in Postman
Set an environment variable:
- `baseUrl`: `http://localhost:5000`
- `authToken`: *(leave blank initially)*

### Step 2: Register a New User
1. Method: `POST`
2. URL: `{{baseUrl}}/api/auth/register`
3. Body -> `raw` -> `JSON`:
   ```json
   {
     "fullName": "Student Postman",
     "email": "student.postman@example.com",
     "password": "SecurePassword123!"
   }
   ```
4. Click **Send**. Status should be `201 Created`.

### Step 3: Log In to Obtain JWT Token
1. Method: `POST`
2. URL: `{{baseUrl}}/api/auth/login`
3. Body -> `raw` -> `JSON`:
   ```json
   {
     "email": "student.postman@example.com",
     "password": "SecurePassword123!"
   }
   ```
4. In Postman's **Scripts / Post-response** tab, add:
   ```javascript
   const jsonData = pm.response.json();
   if (jsonData.token) {
       pm.environment.set("authToken", jsonData.token);
   }
   ```
5. Click **Send**. The `token` is now stored in your environment!

### Step 4: Configure Authorization Header
For subsequent requests, go to the **Authorization** tab:
- Type: `Bearer Token`
- Token: `{{authToken}}`

### Step 5: Uploading a File via Postman
1. Method: `POST`
2. URL: `{{baseUrl}}/api/documents`
3. Headers:
   - `Authorization: Bearer {{authToken}}`
4. Body:
   - Select **form-data**
   - Key: `title` | Value: `College Admission Letter` (Type: Text)
   - Key: `category` | Value: `Education` (Type: Text)
   - Key: `description` | Value: `First semester admission letter` (Type: Text)
   - Key: `file` | Hover over the Key field, select **File**, and browse for a `.pdf` or `.png` file.
5. Click **Send**. Expected status: `201 Created`.

### Step 6: Downloading a File in Postman
1. Method: `GET`
2. URL: `{{baseUrl}}/api/documents/1/download`
3. Headers:
   - `Authorization: Bearer {{authToken}}`
4. In Postman, click the dropdown next to **Send** and choose **Send and Download**. Postman will prompt you to save the file to your computer.

---

## 12. Security Architecture & Protections

1. **Bcrypt Password Security**:
   - Passwords hashed using bcrypt with 12 salt rounds. Plaintext passwords never touch disk or logs.
2. **User Enumeration Defense**:
   - Login responses use identical generic messages (`Invalid email or password.`) regardless of whether the email or password was invalid.
3. **Cross-User Data Isolation**:
   - Every document query includes `WHERE id = ? AND user_id = ?`. Users receive `404 Not Found` for any document not belonging to them, preventing information leakage.
4. **File Signature (Magic Byte) Inspection**:
   - Disguised files (e.g. executable malware renamed to `photo.png` or `resume.pdf`) are caught by inspecting the actual raw binary header before saving metadata.
5. **Path Traversal Protection**:
   - Internal files are stored using unguessable cryptographically generated filenames (`timestamp_cryptoHex.ext`).
   - Download routes resolve filenames strictly against the `uploads` directory, blocking traversal attacks like `../../windows/system32`.
6. **No Static Upload Directory**:
   - The `uploads/` directory is **never** mounted via `express.static()`. Files can only be accessed through authenticated streaming with ownership checks.
7. **Rate Limiting**:
   - Login/Auth endpoints limit brute-force attacks (10 attempts per 15 minutes).
   - General API endpoints limit abuse (100 requests per 15 minutes).
8. **Parameterized SQL Queries**:
   - All queries use parameterized statements (`?`), entirely preventing SQL injection attacks.

---

## 13. Production Roadmap & Security Limitations

> [!WARNING]
> **College Prototype Notice**:
> This project is designed as an educational backend prototype. It should not be used in production to store real government identity documents (such as Aadhaar, SSN, or passports) without the additional production hardening steps outlined below.

### Production Hardening Steps:
1. **HTTPS / TLS 1.3**: Terminate TLS at a reverse proxy (e.g. NGINX, Cloudflare) to ensure all in-transit traffic is encrypted.
2. **Encryption at Rest**: Encrypt documents on disk using AES-256-GCM before writing to the storage medium.
3. **Key Management Service (KMS)**: Store cryptographic keys in dedicated KMS solutions (AWS KMS, Google Cloud KMS, or HashiCorp Vault) rather than environment files.
4. **Malware & Antivirus Scanning**: Pass uploaded files through an automated scanner like [ClamAV](https://www.clamav.net/) before persistence.
5. **Cloud Object Storage**: Transition from local disk storage to encrypted cloud buckets (e.g. AWS S3 with Server-Side Encryption SSE-KMS, versioning, and bucket policies).
6. **Database Migration to Managed Postgres/MySQL**: When scaling beyond a single instance, migrate SQLite to a high-availability clustered relational database.
7. **Audit Logging & SIEM**: Implement tamper-evident append-only audit logs tracking every file access, view, and deletion event for compliance.

---

## 14. Frontend Integration Guide

This backend is completely decoupled and ready to connect to any frontend (React, Next.js, Vue, or Vanilla JS).

### Example: Uploading a Document in React

```javascript
import axios from 'axios';

const uploadDocument = async (token, file, title, category, description) => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('category', category);
  formData.append('description', description);
  formData.append('file', file);

  try {
    const response = await axios.post('http://localhost:5000/api/documents', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('Upload success:', response.data);
    return response.data;
  } catch (error) {
    console.error('Upload failed:', error.response?.data?.error || error.message);
    throw error;
  }
};
```

### Example: Downloading a Document in Vanilla JS

```javascript
async function downloadDocument(token, documentId, filename) {
  const response = await fetch(`http://localhost:5000/api/documents/${documentId}/download`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Download failed');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
```

---

## 15. Troubleshooting & FAQs

- **Q: How do I change the port?**
  Set `PORT=8000` in your `.env` file.
- **Q: Can I change the allowed file size?**
  Change `MAX_FILE_SIZE` in `.env` (value in bytes). Default is `10485760` (10 MB).
- **Q: Where are files stored?**
  Inside the `./uploads` directory with cryptographically hashed filenames.
- **Q: How can I reset the database?**
  Stop the server and delete `./database/locker.sqlite`. The database schema will be re-created automatically on the next startup.
