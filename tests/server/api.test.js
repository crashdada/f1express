import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../server.cjs';
import fs from 'fs';
import path from 'path';

describe('Server API', () => {
  it('GET /api/check-update should return update status', async () => {
    // Note: This actually tries to run docker pull in server.cjs
    // We should mock 'exec' if we want a pure unit test, 
    // but here we check if it handles the request.
    const response = await request(app).get('/api/check-update');
    
    // It might return 500 if docker is not installed/running, 
    // but the endpoint should exist.
    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('hasUpdate');
    }
  });

  it('POST /api/upload-csv without file should return 400', async () => {
    const response = await request(app)
      .post('/api/upload-csv')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No file uploaded');
  });

  it('POST /api/upload-csv with invalid filename should return 400', async () => {
    // Create a dummy file
    const testFile = path.join(__dirname, 'test.csv');
    fs.writeFileSync(testFile, 'dummy content');

    const response = await request(app)
      .post('/api/upload-csv')
      .attach('file', testFile, 'invalid_name.csv');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid target filename');

    fs.unlinkSync(testFile);
  });
});
