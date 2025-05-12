import { describe, it, expect, vi } from 'vitest';

// Mock axios and JSDOM for unit testing
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: '<html><body><script>alert(1)</script></body></html>',
    }),
  },
}));

vi.mock('jsdom', async () => {
  const realJSDOM = await vi.importActual<typeof import('jsdom')>('jsdom');
  return {
    JSDOM: realJSDOM.JSDOM,
  };
});

describe('analyzePage', () => {
  it('should analyze a simple HTML page', async () => {
    process.env.JOB_ID = 'test-job';
    const htmlAnalysis = await import('../analyzer/src/htmlAnalysis.js');
    const result = await htmlAnalysis.analyzePage('https://youtube.com');
    expect(result.htmlFindings.tags).toHaveProperty('script');
    expect(result.htmlFindings.findings).toEqual([]);
    expect(result.url).toBe('https://youtube.com');
  });

  it('should handle axios/network errors gracefully', async () => {
    process.env.JOB_ID = 'test-job';
    vi.mocked((await import('axios')).default.get).mockRejectedValueOnce(
      new Error('Network error'),
    );
    const htmlAnalysis = await import('../analyzer/src/htmlAnalysis.js');
    const result = await htmlAnalysis.analyzePage('https://fail.com');
    expect(result.error).toBe('Failed to analyze page');
    expect(result.htmlFindings.tags).toEqual({});
    expect(result.htmlFindings.findings).toEqual([]);
  });

  it('should count dangerous HTML tags', async () => {
    process.env.JOB_ID = 'test-job';
    vi.mocked((await import('axios')).default.get).mockResolvedValueOnce({
      data: '<script></script><iframe></iframe><object></object><embed></embed><link rel="import">',
    });
    const htmlAnalysis = await import('../analyzer/src/htmlAnalysis.js');
    const result = await htmlAnalysis.analyzePage('https://tags.com');
    expect(result.htmlFindings.tags).toEqual({
      script: 1,
      iframe: 1,
      object: 1,
      embed: 1,
      link: 1,
    });
  });

  it('should detect inline event handlers and dangerous attributes', async () => {
    process.env.JOB_ID = 'test-job';
    vi.mocked((await import('axios')).default.get).mockResolvedValueOnce({
      data: `<a href="javascript:alert(1)">link</a>
           <div onclick="evil()">x</div>
           <span style="width:1px;expression(alert(1));"></span>`,
    });
    const htmlAnalysis = await import('../analyzer/src/htmlAnalysis.js');
    const result = await htmlAnalysis.analyzePage('https://danger.com');
    expect(result.htmlFindings.findings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Inline event handler'),
        expect.stringContaining('"javascript:" URI'),
        expect.stringContaining('"expression()" detected'),
      ]),
    );
  });
});
