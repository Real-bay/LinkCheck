import axios from 'axios';
import { JSDOM } from 'jsdom';
import { ESLint } from 'eslint';
import fs from 'fs/promises';
import path from 'path';

// Types for analysis results
type HTMLFindings = {
  tags: Record<string, unknown>; // Counts of specific HTML tags
  findings: string[]; // Security-related findings in the HTML
};
type HTMLAnalysisResult = {
  url: string;
  htmlFindings: HTMLFindings;
  jsFindings?: object[];
  error?: string;
};

// Environment variable for the job ID, used to identify the shared directory
const JOB_ID = process.env.JOB_ID || '';
if (!JOB_ID) {
  throw new Error('JOB_ID is not set in environment variables');
}

// Paths for input and output files in the shared volume
const FILE_DIR = path.join('/app/shared', JOB_ID); // Shared directory for the job
const INPUT_FILE = path.join(FILE_DIR, 'url.txt'); // File containing the URL to analyze
const RESULT_FILE = path.join(FILE_DIR, 'result.json'); // File to store the analysis results

// Utility function to pause execution for a given time
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Waits for the URL file to appear in the shared directory
async function waitForUrlFile(timeoutMs = 30000): Promise<string> {
  const start = Date.now();
  while (true) {
    try {
      const url = await fs.readFile(INPUT_FILE, 'utf-8');
      if (url) return url.trim(); // Return the URL if the file is found and contains data
    } catch (error) {
      if (Date.now() - start > timeoutMs) {
        console.error(
          `Timed out waiting for VirusTotal check after ${timeoutMs / 1000} seconds:`,
          error,
        );
      } else {
        console.error('Unclassified error while waiting for URL file:', error);
      }
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        `Timed out waiting for VirusTotal check after ${timeoutMs / 1000} seconds.`,
      );
    }
    await sleep(5000);
    console.log('Waiting for URL file...');
  }
}

// Writes the analysis result to the result file in the shared directory
async function writeResultFile(result: object) {
  await fs.writeFile(RESULT_FILE, JSON.stringify(result, null, 2), 'utf-8');
  console.log('Analysis complete, result written.');
}

// Main function to idle and wait for a URL to analyze
export async function idle() {
  try {
    console.log('Waiting for URL...');
    const url = await waitForUrlFile(); // Wait for the URL file
    console.log(`Received URL: ${url}`);

    const result = await analyzePage(url); // Perform the analysis

    await writeResultFile(result); // Write the results to the shared directory
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

// Analyzes the HTML and JavaScript of the given URL
export async function analyzePage(url: string): Promise<HTMLAnalysisResult> {
  try {
    const { data: html } = await axios.get(url); // Fetch the HTML content of the URL
    const dom = new JSDOM(html); // Parse the HTML using JSDOM

    const htmlFindings = analyzeHTMLForSecurity(dom); // Analyze the HTML for security issues
    const jsFindings = await analyzeInlineJS(dom); // Analyze inline JavaScript

    return {
      url,
      htmlFindings,
      jsFindings,
    };
  } catch (error) {
    console.error('Error during analysis:', error);
    return {
      url,
      htmlFindings: { findings: [], tags: {} },
      error: 'Failed to analyze page',
    };
  }
}

// Analyzes the HTML for security-related issues
function analyzeHTMLForSecurity(dom: JSDOM): HTMLFindings {
  const doc = dom.window.document;
  const findings: string[] = [];
  const tagCounts = new Map<string, number>();

  // List of potentially dangerous HTML tags
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'link'];
  dangerousTags.forEach((tag) => {
    const elements = doc.querySelectorAll(tag);
    elements.forEach((el) => {
      if (
        el.tagName.toLowerCase() === 'link' &&
        el.getAttribute('rel') !== 'import'
      )
        return; // Skip harmless <link> tags
      // Count the tags
      if (!tagCounts.has(tag)) {
        tagCounts.set(tag, 0);
      }
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  // Check for inline event handlers and dangerous attributes
  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el) => {
    for (const attr of Array.from(el.attributes) as Attr[]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase();

      if (name.startsWith('on')) {
        findings.push(
          `Inline event handler "${name}" on <${el.tagName.toLowerCase()}>`,
        );
      }

      if (['href', 'src'].includes(name) && value.startsWith('javascript:')) {
        findings.push(
          `"javascript:" URI in ${name} on <${el.tagName.toLowerCase()}>`,
        );
      }

      if (name === 'style' && /expression\s*\(/.test(value)) {
        findings.push(
          `"expression()" detected in style on <${el.tagName.toLowerCase()}>`,
        );
      }
    }
  });

  const allFindings: HTMLFindings = {
    tags: Object.fromEntries(tagCounts), // Convert tag counts to an object
    findings: findings,
  };
  console.log(allFindings);
  return allFindings;
}

// Analyzes inline JavaScript using ESLint
async function analyzeInlineJS(dom: JSDOM): Promise<object[]> {
  const scripts = dom.window.document.querySelectorAll('script');
  const jsCodeSnippets: string[] = [];

  // Collect inline JavaScript code snippets
  scripts.forEach((script) => {
    const code = script.textContent?.trim();
    if (code && !script.src) {
      jsCodeSnippets.push(code);
    }
  });

  if (jsCodeSnippets.length === 0) return [];

  const eslint = new ESLint({
    overrideConfigFile: './eslint.config.mjs', // Use project ESLint configuration
  });

  const findings: object[] = [];

  // Lint each inline JavaScript snippet
  for (const [i, code] of jsCodeSnippets.entries()) {
    const results = await eslint.lintText(code, {
      filePath: `inline-script-${i}.js`, // Simulate file paths for inline scripts
    });

    results.forEach((result) => {
      if (result.messages.length > 0) {
        findings.push({
          file: result.filePath,
          messages: result.messages.map((m) => ({
            line: m.line,
            column: m.column,
            message: m.message,
            ruleId: m.ruleId,
          })),
        });
      }
    });
  }

  return findings;
}

// Only run idle() if this file is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  idle();
}
