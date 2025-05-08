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
        <div style={{ textAlign: 'left', paddingLeft: '20px' }}>
          <h1>Results</h1>
          {loadingResults && <div>Loading...</div>}
          {results && (
            <div style={{ fontSize: '20px' }}>
              {results.error && <div>Error: {results.error}</div>}
              {results.vtResult && (
                <div style={{ marginBottom: '20px' }}>
                  <h2>VirusTotal Results:</h2>
                  {results.vtResult.harmful && (
                    <div style={{ fontSize: '30px' }}>
                      This website might be malicious!
                    </div>
                  )}
                  {!results.vtResult.harmful && (
                    <div style={{ fontSize: '30px' }}>
                      This website is most likely safe!
                    </div>
                  )}
                  <div>
                    <div>
                      Harmless results: {results.vtResult.stats.harmless}
                    </div>
                    <div>
                      Malicious results: {results.vtResult.stats.malicious}
                    </div>
                    <div>
                      Suspicious results: {results.vtResult.stats.suspicious}
                    </div>
                    <div>
                      Undetected results: {results.vtResult.stats.undetected}
                    </div>
                  </div>
                </div>
              )}
              {results.pageAnalysis && (
                <div>
                  <h2>Page Analysis Results:</h2>
                  <h4>HTML findings</h4>
                  <ul>
                    {Object.entries(results.pageAnalysis.htmlFindings.tags).map(
                      ([tag, count]) => (
                        <li key={tag}>
                          Number of &lt;{tag}&gt;-tags found: {count}
                        </li>
                      ),
                    )}
                  </ul>
                  <ul>
                    {results.pageAnalysis.htmlFindings.findings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                  <h4>JavaScript findings</h4>
                  <div>{results.pageAnalysis.jsFindings.file}</div>
                  {results.pageAnalysis.jsFindings.map((finding, index) => (
                    <div key={index} style={{ marginBottom: '5px' }}>
                      <h5>{finding.file.split('/').at(-1)}</h5>
                      <ul>
                        {finding.messages.map((msg, idx) => (
                          <li key={idx}>
                            Line {msg.line}, Column {msg.column}:{' '}
                            <strong>{msg.message}</strong> ({msg.ruleId})
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
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
