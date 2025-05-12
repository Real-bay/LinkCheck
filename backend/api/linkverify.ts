import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type {
  VirusTotalStats,
  VirusTotalResult,
  VirusTotalResponse,
  AnalysisResponse,
  AnalysisResult,
} from '../../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: __dirname + '/../../' });

const VIRUSTOTAL_API_URL = 'https://www.virustotal.com/api/v3/urls';
const VIRUSTOTAL_ANALYSIS_URL = 'https://www.virustotal.com/api/v3/analyses';
const API_KEY = process.env.VIRUSTOTAL_API_KEY || '';

if (!API_KEY) {
  throw new Error('VIRUSTOTAL_API_KEY is not set in environment variables');
}

export default async function scanUrl(
  urlToScan: string,
): Promise<AnalysisResult> {
  const requestBody = new URLSearchParams();
  requestBody.append('url', urlToScan);

  try {
    const response = await axios.post<VirusTotalResponse>(
      VIRUSTOTAL_API_URL,
      requestBody,
      {
        headers: {
          'x-apikey': API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const analysisId = response.data.data.id;
    console.log('Scan submitted successfully! Analysis ID:', analysisId);

    return await ResolveAnalysis(analysisId);
  } catch (error) {
    console.error('Error scanning URL:', error);
    return {
      harmful: true,
      stats: {
        harmless: 0,
        malicious: 0,
        suspicious: 0,
        undetected: 0,
      },
      results: [],
      error: 'Failed to scan URL: ' + error,
    };
  }
}

async function getAnalysis(
  analysisId: string,
): Promise<AnalysisResponse | null> {
  try {
    const response = await axios.get(
      `${VIRUSTOTAL_ANALYSIS_URL}/${analysisId}`,
      {
        headers: {
          'x-apikey': API_KEY,
          accept: 'application/json',
        },
      },
    );

    return response.data as AnalysisResponse;
  } catch (error) {
    console.error('Error retrieving analysis:', error);
    return null;
  }
}

async function ResolveAnalysis(analysisId: string): Promise<AnalysisResult> {
  let analysis: AnalysisResponse | null;
  while (true) {
    analysis = await getAnalysis(analysisId);
    if (analysis && analysis.data.attributes.status === 'completed') {
      const stats: VirusTotalStats = analysis.data.attributes.stats;
      const harmful = stats.malicious > 0 || stats.suspicious > 0;
      const results: VirusTotalResult[] = analysis.data.attributes.results;
      return { harmful, stats, results };
    }
    console.log('Analysis still queued, waiting 5 seconds...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
