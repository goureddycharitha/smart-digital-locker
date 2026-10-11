process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'super_secret_test_jwt_key_123456789_abcdef';
process.env.DB_PATH = './database/test_docs.sqlite';
process.env.UPLOAD_DIR = './uploads/test_doc_uploads';

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app } = require('../server');
const { closeDatabase } = require('../config/database');

describe('Documents API Endpoints', () => {
  const testDbFile = path.resolve(process.cwd(), './database/test_docs.sqlite');
  const testUploadDir = path.resolve(process.cwd(), './uploads/test_doc_uploads');

  let userAToken;
  let userBToken;
  let userADocId;

  // Sample valid PDF buffer (%PDF-1.4 header)
  const validPdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  // Sample valid PNG buffer
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
  ]);
  // Sample valid text buffer
  const validTxtBuffer = Buffer.from('This is a test plain text document for digital locker.');
  // Sample valid DOCX buffer (starts with PK\x03\x04 zip magic header)
  const validDocxBuffer = Buffer.from([
    0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00, 0x21, 0x00, 0x00, 0x00
  ]);

  beforeAll(async () => {
    closeDatabase();
    if (fs.existsSync(testDbFile)) {
      try {
        fs.unlinkSync(testDbFile);
      } catch {
        // Ignore
      }
    }
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }

    // Register User A
    const regA = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'User A',
        email: 'user.a@example.com',
        password: 'Password123!'
      });

    // Login User A
    const loginA = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user.a@example.com',
        password: 'Password123!'
      });
    userAToken = loginA.body.token;

    // Register & Login User B (for cross-user isolation tests)
    await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'User B',
        email: 'user.b@example.com',
        password: 'Password123!'
      });

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user.b@example.com',
        password: 'Password123!'
      });
    userBToken = loginB.body.token;
  });

  afterAll(() => {
    closeDatabase();
    if (fs.existsSync(testDbFile)) {
      try {
        fs.unlinkSync(testDbFile);
      } catch {
        // Ignore
      }
    }
    if (fs.existsSync(testUploadDir)) {
      try {
        fs.rmSync(testUploadDir, { recursive: true, force: true });
      } catch {
        // Ignore
      }
    }
  });

  describe('Unauthenticated Access Control', () => {
    it('1. should reject document uploads without authentication', async () => {
      const res = await request(app).post('/api/documents');
      expect(res.status).toBe(401);
    });

    it('2. should reject document listing without authentication', async () => {
      const res = await request(app).get('/api/documents');
      expect(res.status).toBe(401);
    });
  });

  describe('Document Upload: POST /api/documents', () => {
    it('3. should successfully upload a valid PDF document', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('title', 'College Degree Certificate')
        .field('description', 'Official graduation degree document')
        .field('category', 'Education')
        .attach('file', validPdfBuffer, {
          filename: 'degree.pdf',
          contentType: 'application/pdf'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('College Degree Certificate');
      expect(res.body.category).toBe('Education');
      expect(res.body.originalFileName).toBe('degree.pdf');
      expect(res.body.mimeType).toBe('application/pdf');
      expect(res.body.fileSize).toBe(validPdfBuffer.length);
      expect(res.body.uploadedAt).toBeDefined();

      // Security check: Never leak internal storage filename or server paths
      expect(res.body.stored_file_name).toBeUndefined();
      expect(res.body.path).toBeUndefined();

      userADocId = res.body.id;
    });

    it('4. should upload a valid PNG image document', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('title', 'Passport Photo')
        .field('category', 'Identity')
        .attach('file', validPngBuffer, {
          filename: 'passport.png',
          contentType: 'image/png'
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Passport Photo');
    });

    it('5. should upload a valid TXT document', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('title', 'Emergency Contacts')
        .field('category', 'Personal')
        .attach('file', validTxtBuffer, {
          filename: 'contacts.txt',
          contentType: 'text/plain'
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Emergency Contacts');
    });

    it('5b. should upload a valid DOCX document safely with verified magic bytes', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('title', 'Project Report Document')
        .field('category', 'Academics')
        .attach('file', validDocxBuffer, {
          filename: 'report.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Project Report Document');
      expect(res.body.originalFileName).toBe('report.docx');
      expect(res.body.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('6. should reject upload with missing required title', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('category', 'Education')
        .attach('file', validPdfBuffer, 'test.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('7. should reject upload with missing required category', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('title', 'Missing Category Doc')
        .attach('file', validPdfBuffer, 'test.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('8. should reject upload when no file is attached', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('title', 'No File Doc')
        .field('category', 'Misc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('A file is required');
    });

    it('9. should reject unsupported file extensions (e.g. .exe)', async () => {
      const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('title', 'Malicious Script')
        .field('category', 'Misc')
        .attach('file', exeBuffer, {
          filename: 'script.exe',
          contentType: 'application/x-msdownload'
        });

      expect(res.status).toBe(415);
      expect(res.body.error).toContain('not supported');
    });

    it('10. should reject disguised files with mismatched magic byte content', async () => {
      // Named as .pdf, but contains plain ASCII without %PDF header
      const fakePdfBuffer = Buffer.from('This is completely fake PDF content.');
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('title', 'Fake PDF')
        .field('category', 'Misc')
        .attach('file', fakePdfBuffer, {
          filename: 'fake.pdf',
          contentType: 'application/pdf'
        });

      expect(res.status).toBe(415);
      expect(res.body.error).toContain('signature validation failed');
    });

    it('11. should reject files exceeding the 10 MB limit', async () => {
      // 10MB + 1KB buffer
      const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024, '%PDF-1.4 large content');
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('title', 'Huge File')
        .field('category', 'Misc')
        .attach('file', oversizedBuffer, {
          filename: 'huge.pdf',
          contentType: 'application/pdf'
        });

      expect(res.status).toBe(413);
      expect(res.body.error).toContain('File too large');
    });
  });

  describe('Document Listing, Search & Filtering: GET /api/documents', () => {
    it('12. should return paginated list of documents belonging to the authenticated user', async () => {
      const res = await request(app)
        .get('/api/documents?page=1&limit=10')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.documents).toBeInstanceOf(Array);
      expect(res.body.documents.length).toBeGreaterThanOrEqual(3);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(1);
      expect(res.body.pagination.totalBytes).toBeGreaterThan(0);
      expect(res.body.pagination.categoriesCount).toBeGreaterThanOrEqual(1);
    });

    it('13. should filter documents by title search term', async () => {
      const res = await request(app)
        .get('/api/documents?search=Degree')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.documents.length).toBe(1);
      expect(res.body.documents[0].title).toBe('College Degree Certificate');
    });

    it('14. should filter documents by category', async () => {
      const res = await request(app)
        .get('/api/documents?category=Identity')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.documents.length).toBe(1);
      expect(res.body.documents[0].category).toBe('Identity');
    });
  });

  describe('Document Details: GET /api/documents/:id', () => {
    it('15. should retrieve single document metadata for owner', async () => {
      const res = await request(app)
        .get(`/api/documents/${userADocId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.document).toBeDefined();
      expect(res.body.document.id).toBe(userADocId);
      expect(res.body.document.title).toBe('College Degree Certificate');
    });

    it('16. should return 404 for a nonexistent document ID', async () => {
      const res = await request(app)
        .get('/api/documents/999999')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Document not found.');
    });

    it('17. should prevent cross-user document detail access (User B cannot view User A document)', async () => {
      const res = await request(app)
        .get(`/api/documents/${userADocId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Document not found.');
    });

    it('17a. should reject requests with invalid document ID format (non-integer)', async () => {
      const res = await request(app)
        .get('/api/documents/not-a-number')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('Document Update: PUT /api/documents/:id', () => {
    it('17b. should allow owner to update document title, category, and description', async () => {
      const res = await request(app)
        .put(`/api/documents/${userADocId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Updated Degree Certificate',
          category: 'Higher Education',
          description: 'Updated official graduation degree'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Document updated successfully');
      expect(res.body.document).toBeDefined();
      expect(res.body.document.id).toBe(userADocId);
      expect(res.body.document.title).toBe('Updated Degree Certificate');
      expect(res.body.document.category).toBe('Higher Education');
      expect(res.body.document.description).toBe('Updated official graduation degree');
    });

    it('17b_2. should allow updating document category alone without changing title', async () => {
      const res = await request(app)
        .put(`/api/documents/${userADocId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          category: 'Certificates'
        });

      expect(res.status).toBe(200);
      expect(res.body.document.title).toBe('Updated Degree Certificate');
      expect(res.body.document.category).toBe('Certificates');
    });

    it('17c. should reject cross-user document update (User B cannot update User A document)', async () => {
      const res = await request(app)
        .put(`/api/documents/${userADocId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          title: 'Hacked Title By User B',
          category: 'Malicious'
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Document not found.');
    });

    it('17d. should return 404 when updating a nonexistent document ID', async () => {
      const res = await request(app)
        .put('/api/documents/999999')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Nonexistent Document',
          category: 'Testing'
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Document not found.');
    });

    it('17e. should reject update with empty or invalid title', async () => {
      const res = await request(app)
        .put(`/api/documents/${userADocId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: ' ',
          category: 'Testing'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('Document Download: GET /api/documents/:id/download', () => {
    it('18. should download document file for valid owner', async () => {
      const res = await request(app)
        .get(`/api/documents/${userADocId}/download`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('degree.pdf');
      expect(res.body).toEqual(validPdfBuffer);
    });

    it('18b. should expose Content-Disposition header in cross-origin download response', async () => {
      const res = await request(app)
        .get(`/api/documents/${userADocId}/download`)
        .set('Origin', 'http://localhost:3000')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-expose-headers']).toContain('Content-Disposition');
      expect(res.headers['content-disposition']).toContain('degree.pdf');
    });

    it('19. should prevent cross-user document download (User B cannot download User A document)', async () => {
      const res = await request(app)
        .get(`/api/documents/${userADocId}/download`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Document not found.');
    });
  });

  describe('Document Deletion: DELETE /api/documents/:id', () => {
    it('20. should prevent cross-user document deletion (User B cannot delete User A document)', async () => {
      const res = await request(app)
        .delete(`/api/documents/${userADocId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Document not found.');
    });

    it('21. should successfully delete document by owner and return 204', async () => {
      const res = await request(app)
        .delete(`/api/documents/${userADocId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(204);

      // Verify subsequent fetch returns 404
      const verifyRes = await request(app)
        .get(`/api/documents/${userADocId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(verifyRes.status).toBe(404);
    });
  });
});
