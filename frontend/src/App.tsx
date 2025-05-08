import './App.css';
import React, { useState } from 'react';
import scanUrl from './api/linkverify';

function App() {
  const [link, setLink] = useState('');
  const [loadingBlacklistResults, setLoadingBlacklistResults] = useState(false);
  const [loadingPageAnalysisResults, setLoadingPageAnalysisResults] =
    useState(false);
  const [blacklistResults, setBlacklistResults] = useState(null);
  const [pageAnalysisResults, setPageAnalysisResults] = useState(null);

  const handleSubmit = async () => {
    setBlacklistResults(null);
    setPageAnalysisResults(null);
    setLoadingBlacklistResults(true);
    setLoadingPageAnalysisResults(true);

    try {
      const vt = await scanUrl(link);
      setBlacklistResults(
        `VirusTotal scan results: 
        ${vt.stats.malicious} malicious, 
        ${vt.stats.suspicious} suspicious, 
        ${vt.stats.harmless} harmless, 
        ${vt.stats.undetected} undetected`,
      );
      setLoadingBlacklistResults(false);

      if (vt.harmful) {
        setPageAnalysisResults('Static analysis skipped due to blacklist hit.');
        setLoadingPageAnalysisResults(false);
        return;
      }

      // Call backend for static analysis
      const res = await fetch(`/api/dockerode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link }),
      });

      const json = await res.json();
      setPageAnalysisResults(JSON.stringify(json, null, 2));
    } catch (err) {
      setBlacklistResults('VirusTotal check failed.');
      console.error(err);
    } finally {
      setLoadingBlacklistResults(false);
      setLoadingPageAnalysisResults(false);
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
          <div style={{ fontSize: '24px' }}>
            Blacklist results
            {loadingBlacklistResults && <>Loading...</>}
            {blacklistResults && !loadingBlacklistResults && (
              <div>{blacklistResults}</div>
            )}
          </div>
          <div style={{ fontSize: '24px' }}>
            Page analysis results
            {pageAnalysisResults && !loadingPageAnalysisResults && (
              <div>{pageAnalysisResults}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
