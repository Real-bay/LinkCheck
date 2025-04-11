import axios from 'axios';
import { JSDOM } from 'jsdom';
import { ESLint, Linter } from 'eslint';

type HTMLAnalysisResult = {
  url: string;
  htmlFindings: string[];
  jsFindings?: object[];
  error?: string;
};

export async function analyzePage(url: string): Promise<HTMLAnalysisResult> {
  try {
    const { data: html } = await axios.get(url);
    const dom = new JSDOM(html);

    const htmlFindings = analyzeHTMLForSecurity(dom);
    const jsFindings = await analyzeInlineJS(dom); // TODO: Fix this to work with the new ESLint version

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
