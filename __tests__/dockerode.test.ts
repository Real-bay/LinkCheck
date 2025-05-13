import request from 'supertest';
import express from 'express';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';

// Mock scanUrl
vi.mock('../backend/api/linkverify.js', () => ({
  default: vi.fn().mockResolvedValue({ harmful: false }),
}));

// Mock Docker
vi.mock('dockerode', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      createContainer: vi.fn().mockResolvedValue({
        id: 'test-container',
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      }),
      getContainer: vi.fn().mockReturnValue({
        inspect: vi
          .fn()
          .mockResolvedValue({ State: { Running: true, Status: 'running' } }),
      }),
    })),
  };
});

// Mock fs and fs/promises
vi.mock('fs', () => {
  const actual = vi.importActual('fs');
  return {
    ...(typeof actual === 'object' && actual !== null ? actual : {}),
    mkdirSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
    default: {
      mkdirSync: vi.fn(),
      existsSync: vi.fn().mockReturnValue(true),
    },
  };
});
vi.mock('fs/promises', () => ({
  default: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(
      JSON.stringify({
        htmlFindings: { tags: { script: 1 }, findings: [] },
        url: 'http://test',
      }),
    ),
  },
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(
    JSON.stringify({
      htmlFindings: { tags: { script: 1 }, findings: [] },
      url: 'http://test',
    }),
  ),
}));

// Import the router after mocks
import router from '../backend/dockerode.js';

describe('POST /analyze', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(router);
  });

  it('should return analysis result for a safe URL', async () => {
    const response = await request(app)
      .post('/analyze')
      .send({ url: 'http://test' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('vtResult');
    expect(response.body).toHaveProperty('pageAnalysis');
    expect(response.body.skipped).toBe(false);
    expect(response.body.pageAnalysis.htmlFindings.tags).toHaveProperty(
      'script',
    );
  });

  it('should return 400 if url is missing', async () => {
    const response = await request(app).post('/analyze').send({});
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should return skipped=true if URL is harmful', async () => {
    const scanUrl = (await import('../backend/api/linkverify.js')).default;
    (scanUrl as Mock).mockResolvedValueOnce({ harmful: true });

    const response = await request(app)
      .post('/analyze')
      .send({ url: 'http://malicious' });

    expect(response.status).toBe(200);
    expect(response.body.skipped).toBe(true);
    expect(response.body.pageAnalysis).toBeUndefined();
  });

  it('should return 500 if file system fails', async () => {
    const fs = (await import('fs')).default;
    (fs.mkdirSync as Mock).mockImplementationOnce(() => {
      throw new Error('FS error');
    });

    const response = await request(app)
      .post('/analyze')
      .send({ url: 'http://test' });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});
