import axios from "axios";

type VirusTotalResponse = {
  data: {
    id: string;
    type: string;
  };
};


interface AnalysisResponse {
  data: {
    id: string;
    attributes: {
      date: number;
      status: string;
      results: {};
      stats: {};
    };
  };
}

const VIRUSTOTAL_API_URL = 'https://www.virustotal.com/api/v3/urls';
const VIRUSTOTAL_ANALYSIS_URL = 'https://www.virustotal.com/api/v3/analyses';
const API_KEY = ''; // Replace with your actual API key

async function scanUrl(urlToScan: string): Promise<string | null> {
  const requestBody = new URLSearchParams();
  requestBody.append('url', urlToScan);

  try {
    const response = await axios.post<VirusTotalResponse>(VIRUSTOTAL_API_URL, requestBody, {
      headers: {
        'x-apikey': API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const analysisId = response.data.data.id;
    console.log('Scan submitted successfully! Analysis ID:', analysisId);
    return analysisId;
  } catch (error) {
    console.error('Error scanning URL:', error);
    return null;
  }
}

async function getAnalysis(analysisId: string): Promise<AnalysisResponse | null> {
  try {
    const response = await axios.get(`${VIRUSTOTAL_ANALYSIS_URL}/${analysisId}`, {
    headers: {
      'x-apikey': API_KEY,
      },
    });

    return response.data as AnalysisResponse;
  } catch (error) {
    console.error('Error retrieving analysis:', error);
  }
}

async function waitForAnalysis(analysisId: string): Promise<void> {
  let analysis: AnalysisResponse | null;
  while (true) {
    analysis = await getAnalysis(analysisId);
    if (analysis && analysis.data.attributes.status === 'completed') {
      console.log('Final analysis result:', analysis);
      console.log(analysis.data.attributes.stats);
      break;
    }
    console.log('Analysis still queued, waiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

export async function scanAndAnalyzeUrl(url: string): Promise<void> {
  const analysisId = await scanUrl(url);
  if (analysisId) {
    await waitForAnalysis(analysisId);
  }
}

// Example usage
// scanAndAnalyzeUrl('https://www.facebook.com');

