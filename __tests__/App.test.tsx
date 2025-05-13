import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../frontend/src/App';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

import axios from 'axios';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input and submit button', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/enter a link/i)).toBeInTheDocument();
    expect(screen.getByText(/submit/i)).toBeInTheDocument();
  });

  it('shows loading and displays VirusTotal and Page Analysis results', async () => {
    vi.mocked(axios.post).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: {
                  vtResult: {
                    harmful: false,
                    stats: {
                      harmless: 10,
                      malicious: 0,
                      suspicious: 0,
                      undetected: 2,
                    },
                  },
                  pageAnalysis: {
                    url: 'http://test.com',
                    htmlFindings: {
                      tags: { script: 2 },
                      findings: ['Inline event handler "onclick" on <div>'],
                    },
                    jsFindings: [
                      {
                        file: 'inline-script-0.js',
                        messages: [
                          {
                            line: 1,
                            column: 1,
                            message: 'Unexpected alert.',
                            ruleId: 'no-alert',
                          },
                        ],
                      },
                    ],
                  },
                  skipped: false,
                },
              }),
            50,
          ),
        ),
    );

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/enter a link/i), {
      target: { value: 'http://test.com' },
    });
    fireEvent.click(screen.getByText(/submit/i));

    expect(await screen.findByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/this website is most likely safe/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/number of <script>-tags found: 2/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/inline event handler "onclick" on <div>/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Unexpected alert./i)).toBeInTheDocument();
    });
  });

  it('shows error message on axios failure', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/enter a link/i), {
      target: { value: 'http://fail.com' },
    });
    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(
        screen.getByText(/failed to fetch analysis results/i),
      ).toBeInTheDocument();
    });
  });

  it('shows "Static analysis skipped." if skipped is true', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        vtResult: {
          harmful: true,
          stats: {
            harmless: 0,
            malicious: 1,
            suspicious: 0,
            undetected: 0,
          },
        },
        skipped: true,
      },
    });

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/enter a link/i), {
      target: { value: 'http://malicious.com' },
    });
    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(screen.getByText(/static analysis skipped/i)).toBeInTheDocument();
    });
  });
});
