import './App.css';
import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [link, setLink] = useState('');
  const [loadingResults, setLoadingResults] = useState(false);
  const [results, setResults] = useState(null);

  const handleSubmit = async () => {
    setResults(null);
    setLoadingResults(true);

    try {
      const res = await axios.post('/api/analyze', { url: link });
      setResults(res.data);
    } catch (err) {
      console.error('Error fetching analysis results:', err);
      setResults({ error: 'Failed to fetch analysis results.' });
    } finally {
      setLoadingResults(false);
    }
  };

  return (
    <div className="App">
      <div>
        <div style={{ padding: 20, backgroundColor: '#1f2a47' }}>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            style={{
              width: '500px',
              height: '30px',
              fontSize: '24px',
              padding: '5px',
              borderRadius: '15px',
              marginRight: '5px',
            }}
            placeholder="Enter a link"
          />
          <button
            style={{ height: '30px', fontSize: '24px' }}
            onClick={handleSubmit}
          >
            Submit
          </button>
        </div>
        <div>
          <div style={{ fontSize: '30px' }}>Results</div>
          {loadingResults && <div>Loading...</div>}
          {results && (
            <div style={{ fontSize: '24px' }}>
              {results.error && <div>Error: {results.error}</div>}
              {results.vtResult && (
                <div>
                  <strong>VirusTotal Results:</strong>
                  <pre>{JSON.stringify(results.vtResult, null, 2)}</pre>
                </div>
              )}
              {results.pageAnalysis && (
                <div>
                  <strong>Page Analysis:</strong>
                  <pre>{JSON.stringify(results.pageAnalysis, null, 2)}</pre>
                </div>
              )}
              {results.skipped && <div>Static analysis skipped.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
