import axios from 'axios';
import { JSDOM } from "jsdom";
import { ESLint } from 'eslint';

// URL to analyze
const url = 'https://fi.wikipedia.org/wiki/Wikipedia:Etusivu'; // Change this

async function fetchAndAnalyze() {
  try {
    // Step 1: Fetch HTML
    const { data: html } = await axios.get(url);

    // Step 2: Extract JS from <script> tags
    const dom = new JSDOM(html);
    const scripts = dom.window.document.querySelectorAll('script');
    const jsCodeSnippets: string[] = [];

    analyzeHTMLForSecurity(dom);
    /*
    scripts.forEach(script => {
      const code = script.textContent?.trim();
      if (code && !script.src) { // Inline JS only
        jsCodeSnippets.push(code);
      }
    });

    if (jsCodeSnippets.length === 0) {
      console.log('No inline JS found.');
      return;
    }

    // Step 3: Setup ESLint
    const eslint = new ESLint({
      baseConfig: {
        extends: ['plugin:security/recommended'],
        plugins: ['security'],
        parserOptions: {
          ecmaVersion: 2020,
          sourceType: 'script',
        },
      } as any,
    });
    

    // Step 4: Analyze each script block
    for (const [i, code] of jsCodeSnippets.entries()) {
      const results = await eslint.lintText(code, { filePath: `inline-script-${i}.js` });

      results.forEach(result => {
        console.log(`\n--- Issues in inline-script-${i}.js ---`);
        result.messages.forEach(msg => {
          console.log(`${msg.line}:${msg.column} ${msg.message} [${msg.ruleId}]`);
        });
      });
    }
      */
  } catch (err) {
    console.error('Error analyzing remote code:', err);
  }
}

function analyzeHTMLForSecurity(dom: JSDOM) {
  const doc = dom.window.document;
  const findings: string[] = [];

  // Dangerous tags
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'link'];
  dangerousTags.forEach(tag => {
    const elements = doc.querySelectorAll(tag);
    elements.forEach(el => {
      const tagName = el.tagName.toLowerCase();
      if (tagName === 'link' && el.getAttribute('rel') !== 'import') return;
      findings.push(`<${tagName}> tag found`);
    });
  });

  // Inline event handlers
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    for (const attr of Array.from(el.attributes) as Attr[]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase();

      if (name.startsWith('on')) {
        findings.push(`Inline event handler "${name}" on <${el.tagName.toLowerCase()}>`);
      }

      if (name === 'href' || name === 'src') {
        if (value.startsWith('javascript:')) {
          findings.push(`"javascript:" URI in ${name} attribute on <${el.tagName.toLowerCase()}>`);
        }
      }

      if (name === 'style' && /expression\s*\(/.test(value)) {
        findings.push(`"expression()" detected in style attribute on <${el.tagName.toLowerCase()}>`);
      }
    }
  });

  if (findings.length === 0) {
    console.log('\n✅ No dangerous HTML patterns detected.');
  } else {
    console.log('\n🚨 Dangerous HTML patterns found:');
    findings.forEach(msg => console.log('• ' + msg));
  }
}


fetchAndAnalyze();
