import scanUrl from '../../frontend/src/api/linkverify.js';

// TODO: Prune this file or re-implement CLI functionality.

const url = process.argv[2];

if (!url) {
  console.error('No URL provided.');
  process.exit(1);
}

console.log(`🔍 Checking URL: ${url}...`);

scanUrl(url);
