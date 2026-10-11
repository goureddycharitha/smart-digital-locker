process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'super_secret_test_jwt_key_123456789_abcdef';
process.env.DB_PATH = './database/test_auth.sqlite';

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app } = require('../server');
const { getDatabase, closeDatabase } = require('../config/database');
const { generateToken } = require('../utils/tokenUtils');

describe('Authentication & User Profile API Endpoints', () => {
  const testDbFile = path.resolve(process.cwd(), './database/test_auth.sqlite');

  beforeAll(() => {
    // Ensure clean state before suite
    closeDatabase();
    if (fs.existsSync(testDbFile)) {
      try {
        fs.unlinkSync(testDbFile);
      } catch {
        // Ignore
      }
    }
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
  });

  describe('Health Check: GET /api/health', () => {
    it('should return 200 with server status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.message).toContain('Smart Digital Locker API is running');
    });
  });

  describe('User Registration: POST /api/auth/register', () => {
    it('1. should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Alice Test',
          email: 'alice.test@example.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Registration successful');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBeDefined();
      expect(res.body.user.fullName).toBe('Alice Test');
      expect(res.body.user.email).toBe('alice.test@example.com');
      // Crucial security check: password_hash must never be leaked
      expect(res.body.user.password_hash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
    });

    it('2. should reject duplicate email registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Alice Duplicate',
          email: 'ALICE.TEST@example.com', // Test case-insensitivity
          password: 'Password123!'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('3. should reject registration with password shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Short Pass User',
          email: 'short@example.com',
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' })
        ])
      );
    });

    it('4. should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Invalid Email',
          email: 'not-an-email',
          password: 'ValidPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' })
        ])
      );
    });
  });

  describe('User Login: POST /api/auth/login', () => {
    it('5. should login successfully with valid credentials and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice.test@example.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.token).toBeDefined();
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.user.email).toBe('alice.test@example.com');
      expect(res.body.user.password_hash).toBeUndefined();
    });

    it('6. should reject login with incorrect password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice.test@example.com',
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password.');
    });

    it('7. should reject login with nonexistent email without leaking account existence', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent.user@example.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password.');
    });
  });

  describe('JWT Authentication Middleware & Profile: GET & PUT /api/users/me', () => {
    let authToken;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice.test@example.com',
          password: 'Password123!'
        });
      authToken = res.body.token;
    });

    it('8. should reject profile access when Authorization header is missing', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Authorization header missing');
    });

    it('9. should reject profile access when token is invalid or malformed', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid.bogus.token');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid token');
    });

    it('9b. should reject profile access when token has expired', async () => {
      const expiredToken = generateToken({ id: 1, email: 'alice.test@example.com' }, '-1s');
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Token has expired');
    });

    it('10. should allow profile retrieval with valid JWT token', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.fullName).toBe('Alice Test');
      expect(res.body.user.email).toBe('alice.test@example.com');
      expect(res.body.user.password_hash).toBeUndefined();
    });

    it('10b. should allow profile retrieval when token is wrapped in quotes or has extra whitespace', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer "${authToken}"`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('alice.test@example.com');
    });

    it('10c. should allow profile retrieval with lowercase bearer header prefix', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
    });

    it('10d. should persist user data in SQLite database after closing and re-opening connection', async () => {
      closeDatabase();
      const db = getDatabase();
      const user = db.prepare('SELECT email FROM users WHERE email = ?').get('alice.test@example.com');
      expect(user).toBeDefined();
      expect(user.email).toBe('alice.test@example.com');
    });

    it('11. should allow updating profile fullName', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fullName: 'Alice Updated Test'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Profile updated successfully');
      expect(res.body.user.fullName).toBe('Alice Updated Test');
    });

    it('12. should reject updating profile with empty fullName', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fullName: ' '
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('Password Change: PUT /api/users/change-password', () => {
    let authToken;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice.test@example.com',
          password: 'Password123!'
        });
      authToken = res.body.token;
    });

    it('13. should reject password change without authentication', async () => {
      const res = await request(app)
        .put('/api/users/change-password')
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Authorization header missing');
    });

    it('14. should reject password change with incorrect current password', async () => {
      const res = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPassword999!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Current password is incorrect.');
    });

    it('15. should reject password change when new password is too short', async () => {
      const res = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('16. should reject password change when new password is identical to current', async () => {
      const res = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'Password123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('New password must be different from current password.');
    });

    it('17. should successfully change password with valid credentials', async () => {
      const res = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'BrandNewPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password changed successfully.');
    });

    it('18. should allow login with new password and reject old password', async () => {
      // Old password must fail
      const oldRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice.test@example.com',
          password: 'Password123!'
        });
      expect(oldRes.status).toBe(401);

      // New password must succeed
      const newRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice.test@example.com',
          password: 'BrandNewPassword123!'
        });
      expect(newRes.status).toBe(200);
      expect(newRes.body.token).toBeDefined();
    });
  });

  describe('Rate Limiting: HTTP 429 Enforcement', () => {
    it('19. should return HTTP 429 when rate limit threshold is exceeded', async () => {
      const rateLimit = require('express-rate-limit');
      const express = require('express');
      const testApp = express();

      const testLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 2,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests' }
      });

      testApp.get('/test-limit', testLimiter, (req, res) => {
        res.json({ ok: true });
      });

      // 1st request -> 200
      const res1 = await request(testApp).get('/test-limit');
      expect(res1.status).toBe(200);

      // 2nd request -> 200
      const res2 = await request(testApp).get('/test-limit');
      expect(res2.status).toBe(200);

      // 3rd request -> 429 Too Many Requests
      const res3 = await request(testApp).get('/test-limit');
      expect(res3.status).toBe(429);
      expect(res3.body.error).toBe('Too many requests');
    });
  });

  describe('JWT Secret Security & Validation', () => {
    const originalSecret = process.env.JWT_SECRET;

    afterEach(() => {
      process.env.JWT_SECRET = originalSecret;
    });

    it('20. should throw a safe fatal error when JWT_SECRET is missing or empty', () => {
      delete process.env.JWT_SECRET;
      expect(() => generateToken({ id: 1 })).toThrow(/JWT_SECRET environment variable is missing or empty/);
    });

    it('21. should throw a safe fatal error when JWT_SECRET is below 32 characters', () => {
      process.env.JWT_SECRET = 'short_insecure_secret_123';
      expect(() => generateToken({ id: 1 })).toThrow(/JWT_SECRET is insecure/);
    });
  });

  describe('CORS Configuration & Headers', () => {
    it('22. should allow explicitly configured local origins and expose Content-Disposition', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-expose-headers']).toBe('Content-Disposition');
    });

    it('23. should support 127.0.0.1:3000 local development origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://127.0.0.1:3000');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');
    });

    it('24. should block unconfigured cross-origin requests', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://unauthorized-domain.com');

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/CORS policy/i);
    });
  });
});

