import { scanAndAnalyzeUrl } from '../../frontend/src/api/linkverify';

const url = process.argv[2];

if (!url) {
  console.error('No URL provided.');
  process.exit(1);
}

console.log(`🔍 Checking URL: ${url}...`);

scanAndAnalyzeUrl(url);
