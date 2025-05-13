import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing scanUrl
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import type { AnalysisResult } from '../types';
import axios from 'axios';

describe('scanUrl', () => {
  let scanUrl: typeof import('../backend/api/linkverify.js').default;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.VIRUSTOTAL_API_KEY = 'test-key';
    // Dynamically import after env is set and mocks are in place
    scanUrl = (await import('../backend/api/linkverify.js')).default;
  });

  it('should return a successful AnalysisResult when analysis is completed', async () => {
    // Mock VirusTotal URL submission
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { data: { id: 'analysis-id', type: 'analysis' } },
    });

    // Mock VirusTotal analysis polling
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: {
        data: {
          attributes: {
            status: 'completed',
            stats: {
              harmless: 10,
              malicious: 0,
              suspicious: 0,
              undetected: 2,
            },
            results: [
              {
                author: {
                  method: 'ai',
                  engine_name: 'TestEngine',
                  category: 'harmless',
                  result: 'clean',
                },
              },
            ],
          },
        },
      },
    });

    const result: AnalysisResult = await scanUrl('https://youtube.com');
    expect(result.harmful).toBe(false);
    expect(result.stats.harmless).toBe(10);
    expect(result.stats.malicious).toBe(0);
    expect(result.results.length).toBe(1);
    expect(result.error).toBeUndefined();
  });

  it('should return harmful=true and error on axios post failure', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network error'));

    const result: AnalysisResult = await scanUrl('http://fail.com');
    expect(result.harmful).toBe(true);
    expect(result.error).toContain('Failed to scan URL');
    expect(result.stats.malicious).toBe(0);
    expect(result.results).toEqual([]);
  });

  it('should poll until status is completed', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { data: { id: 'analysis-id', type: 'analysis' } },
    });

    // First poll: not completed
    vi.mocked(axios.get)
      .mockResolvedValueOnce({
        data: {
          data: {
            attributes: {
              status: 'queued',
              stats: {
                harmless: 0,
                malicious: 0,
                suspicious: 0,
                undetected: 0,
              },
              results: [],
            },
          },
        },
      })
      // Second poll: completed
      .mockResolvedValueOnce({
        data: {
          data: {
            attributes: {
              status: 'completed',
              stats: {
                harmless: 5,
                malicious: 1,
                suspicious: 0,
                undetected: 0,
              },
              results: [],
            },
          },
        },
      });

    // Speed up polling for test
    vi.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    const result: AnalysisResult = await scanUrl('http://poll.com');
    expect(result.harmful).toBe(true);
    expect(result.stats.harmless).toBe(5);
    expect(result.stats.malicious).toBe(1);
  });
});
