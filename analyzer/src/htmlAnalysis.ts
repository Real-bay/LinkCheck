import axios from 'axios';
import { JSDOM } from 'jsdom';
import { ESLint } from 'eslint';
import fs from 'fs/promises';
import path from 'path';

type HTMLAnalysisResult = {
  url: string;
  htmlFindings: string[];
  jsFindings?: object[];
  error?: string;
};

const INPUT_DIR = '/shared/job'; // Adjust this at runtime using env vars if needed
const URL_FILE = path.join(INPUT_DIR, 'url.txt');
const RESULT_FILE = path.join(INPUT_DIR, 'result.json');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForUrlFile(timeoutMs = 30000): Promise<string> {
  const start = Date.now();
  while (true) {
    try {
      const url = await fs.readFile(URL_FILE, 'utf-8');
      if (url) return url.trim();
    } catch (error) {
      console.error(
        'Timed out waiting for VirusTotal check after ',
        timeoutMs / 1000,
        ' seconds:',
        error,
      );
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for URL input');
    }
    await sleep(500);
  }
}

async function writeResultFile(result: object) {
  await fs.writeFile(RESULT_FILE, JSON.stringify(result, null, 2), 'utf-8');
  console.log('Analysis complete, result written.');
}

async function main() {
  try {
    console.log('Waiting for URL...');
    const url = await waitForUrlFile();
    console.log(`Received URL: ${url}`);

    const result = await analyzePage(url);

    await writeResultFile(result);
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

export async function analyzePage(url: string): Promise<HTMLAnalysisResult> {
  try {
    const { data: html } = await axios.get(url);
    const dom = new JSDOM(html);

    const htmlFindings = analyzeHTMLForSecurity(dom);
    const jsFindings = await analyzeInlineJS(dom);

    return {
      url,
      htmlFindings,
      jsFindings,
    };
  } catch (error) {
    console.error('Error during analysis:', error);
    return { url, htmlFindings: [], error: 'Failed to analyze page' };
  }
}

function analyzeHTMLForSecurity(dom: JSDOM): string[] {
  const doc = dom.window.document;
  const findings: string[] = [];

  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'link'];
  dangerousTags.forEach((tag) => {
    const elements = doc.querySelectorAll(tag);
    elements.forEach((el) => {
      if (
        el.tagName.toLowerCase() === 'link' &&
        el.getAttribute('rel') !== 'import'
      )
        return;
      findings.push(`<${tag}> tag found`);
    });
  });

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

  return findings;
}

async function analyzeInlineJS(dom: JSDOM): Promise<object[]> {
  const scripts = dom.window.document.querySelectorAll('script');
  const jsCodeSnippets: string[] = [];

  scripts.forEach((script) => {
    const code = script.textContent?.trim();
    if (code && !script.src) {
      jsCodeSnippets.push(code);
    }
  });

  if (jsCodeSnippets.length === 0) return [];

  const eslint = new ESLint({
    overrideConfigFile: './eslint.config.mjs',
  });

  const findings: object[] = [];

  for (const [i, code] of jsCodeSnippets.entries()) {
    const results = await eslint.lintText(code, {
      filePath: `inline-script-${i}.js`,
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

main();
