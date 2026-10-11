# Smart Digital Locker

> A modern, secure, and responsive full-stack Document Vault built with **Spring Boot 3**, **MySQL 8**, and **React 18**.

---

## 1. Project Introduction

**Smart Digital Locker** is an enterprise-grade document management application designed for students and professionals to store, categorize, view, download, and safeguard vital academic certificates, government IDs, and records. It replaces insecure local file storage with a centralized, authenticated, and defense-in-depth document vault.

---

## 2. Project Objectives

- **Confidentiality:** Zero unauthorized access to student or user records.
- **Relational Integrity:** Strict MySQL foreign key cascading, user-to-document relationships, and database indexes.
- **Defense in Depth:** True binary magic-byte inspection (blocking spoofed file extensions), path-traversal prevention, and 12-round BCrypt password hashing.
- **Modern User Experience:** Fast single-page application built on React 18, React Router 7, and glassmorphism styling tokens.
- **Automated Verification:** Comprehensive JUnit 5, Mockito, and Spring Boot integration tests verifying authentication, file uploads, and cross-user authorization barriers.

---

## 3. Technology Stack

### Frontend
- **Framework:** React 18
- **Routing:** React Router DOM
- **Build Tool:** Vite 8
- **Styling:** Custom Modular CSS with CSS Variables, Flexbox, CSS Grid, and Glassmorphism design tokens
- **Icons & Typography:** Font Awesome 6.4.0 & Google Font Inter
- **HTTP Client:** Fetch API with centralized bearer token injection and 401 interceptors

### Backend
- **Language & Runtime:** Java 21 / 25
- **Framework:** Spring Boot 3.4.3
- **Security:** Spring Security 6 (Stateless JWT Filter chain, BCrypt 12 rounds)
- **Data Persistence:** Spring Data JPA & Hibernate ORM
- **Database Driver:** MySQL Connector/J (`mysql-connector-j`)
- **JWT Provider:** JJWT (`io.jsonwebtoken:jjwt-api:0.12.6`)
- **Validation:** Jakarta Bean Validation (`spring-boot-starter-validation`)
- **Build Tool:** Apache Maven 3.9+

### Database
- **Engine:** MySQL 8.0 Community Edition
- **Collation:** `utf8mb4_unicode_ci`
- **Tables:** `users`, `documents`
- **Testing Database:** H2 in-memory database for isolated unit/integration tests

---

## 4. Architecture Overview

```text
Browser Client (React 18 + React Router)
   │
   │  HTTPS / REST APIs (JSON & multipart/form-data)
   ▼
Spring Boot REST API (Port 8080)
   ├── Security Filter Chain (JwtAuthenticationFilter & CORS)
   ├── Controllers (AuthController, DocumentController, UserController, HealthController)
   ├── Services (AuthService, DocumentService, UserService, FileStorageService)
   │     ├── Magic-Byte Signature Verification (PDF, PNG, JPG, DOCX, TXT)
   │     └── Normalized Storage Path Traversal Guard
   ├── Spring Data JPA Repositories (UserRepository, DocumentRepository)
   ▼
MySQL 8.0 Database (Relational Metadata) + Private Filesystem (Stored Binaries)
```

---

## 5. Prerequisites

Ensure the following tools are installed on your environment:
- **Java JDK 21+** (Java 25 supported)
- **Node.js v18+** & **npm v9+**
- **MySQL Server 8.0+**
- **Apache Maven 3.9+** (or included Maven binary)

---

## 6. MySQL Database Setup

1. Open your MySQL client (e.g. MySQL Command Line Client or MySQL Workbench):
   ```sql
   CREATE DATABASE IF NOT EXISTS smart_digital_locker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Verify MySQL user credentials (default development uses username `root`, password `root`). If your password differs, update `.env` or set the `DB_PASSWORD` environment variable.

---

## 7. Environment Variables Configuration

Create a `.env` file in the project root based on `.env.example`:

```env
PORT=8080
DB_URL=jdbc:mysql://localhost:3306/smart_digital_locker?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
DB_USERNAME=root
DB_PASSWORD=root
JWT_SECRET=your_super_secret_jwt_signing_key_min_32_characters_production
JWT_EXPIRATION_MS=86400000
UPLOAD_DIR=./uploads
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
VITE_API_BASE_URL=http://localhost:8080/api
```

---

## 8. Startup Instructions

### Running the Backend (Spring Boot)
Option 1: Using root npm shortcut:
```bash
npm run start:backend
```
Option 2: Using Maven directly in `backend-spring/`:
```bash
cd backend-spring
mvn spring-boot:run
```
Option 3: Running the packaged JAR:
```bash
java -jar backend-spring/target/smart-digital-locker-backend-1.0.0.jar
```
*Backend runs on `http://localhost:8080`.*

### Running the Frontend (React)
Option 1: Using root npm shortcut:
```bash
npm run start:frontend
```
Option 2: Running directly in `frontend-react/`:
```bash
cd frontend-react
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 9. API Endpoint Documentation

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT | No |
| `GET` | `/api/auth/me` | Get authenticated user info | Yes |
| `GET` | `/api/users/me` | Get detailed user profile | Yes |
| `PUT` | `/api/users/me` | Update user profile | Yes |
| `PUT` | `/api/users/change-password` | Update account password | Yes |
| `POST` | `/api/documents` | Upload document (`multipart/form-data`) | Yes |
| `GET` | `/api/documents` | Query documents (search, filter, pagination) | Yes |
| `GET` | `/api/documents/{id}` | Retrieve document metadata | Yes |
| `PUT` | `/api/documents/{id}` | Update document title, category, description | Yes |
| `GET` | `/api/documents/{id}/download` | Stream authorized file download | Yes |
| `DELETE`| `/api/documents/{id}` | Permanently delete file and metadata | Yes |
| `GET` | `/api/health` | Service health status | No |

---

## 10. Automated Testing

Run the full automated test suite using Maven:
```bash
mvn -f backend-spring/pom.xml test
```
Or via root npm script:
```bash
npm test
```
All 9 automated JUnit tests cover:
- User registration and duplicate email rejection
- Login with BCrypt verification and invalid credential rejection
- Document upload and magic-byte signature inspection
- Cross-user isolation (User B is denied access to User A's documents)
- Application context loading

---

## 11. Database Inspection & Migration Tools

- Inspect current MySQL users and documents in tabular format:
  ```bash
  npm run db:status
  ```
- Re-run SQLite to MySQL data migration:
  ```bash
  npm run db:migrate
  ```

---

## 12. Security Notes & Best Practices

1. **Password Hashing:** Passwords are never stored in plaintext. Spring Security's `BCryptPasswordEncoder` uses cost factor 12.
2. **JWT Signing:** The signing key is verified at application boot to have at least 256 bits (32 characters).
3. **No Direct Object References:** Queries strictly enforce `user_id = :userId`, preventing IDOR vulnerabilities.
4. **Binary Validation:** Uploaded files undergo binary stream header inspection before being saved to disk.
5. **Path Traversal Protection:** All storage paths are normalized and asserted to reside strictly within `UPLOAD_DIR`.

---

## 13. License

Distributed under the MIT License. Developed for educational and institutional document protection.
