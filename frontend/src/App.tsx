import './App.css';
import React, { useState } from 'react';

function App() {
  const [link, setLink] = useState('');
  const [loadingBlacklistResults] = useState(false);
  const [loadingPageAnalysisResults] = useState(false);
  const [blacklistResults] = useState(null);
  const [pageAnalysisResults] = useState(null);

  const handleSubmit = () => {
    alert(`You entered: ${link}`);
    /*
    setLoadingBlacklistResults(true);
    setLoadingPageAnalysisResults(true);

    var blRes =
    setBlacklistResults(blRes);
    setLoadingBlacklistResults(false);

    var paRes =
    setPageAnalysisResults(paRes);
    setLoadingPageAnalysisResults(false);
    */
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
