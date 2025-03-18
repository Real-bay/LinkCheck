import { checkUrl } from './linkverify';

const url = process.argv[2];

if (!url) {
  console.error('No URL provided.');
  process.exit(1);
}

console.log(`🔍 Checking URL: ${url}...`);

checkUrl(url)
  .then((result) => {
    console.log(`Result: ${result}`);
  })
  .catch((err) => {
    console.error('Error while checking URL:', err);
  });
