// VirusTotal types
export type VirusTotalStats = {
  harmless: number;
  malicious: number;
  suspicious: number;
  undetected: number;
};

export type VirusTotalResult = {
  author: {
    method: string;
    engine_name: string;
    category: string;
    result: string;
  };
};

export type VirusTotalResponse = {
  data: {
    id: string;
    type: string;
  };
};

export type ApiResponse = {
  vtResult?: AnalysisResult;
  pageAnalysis?: HTMLAnalysisResult;
  skipped?: boolean;
  error?: string;
};

export interface AnalysisResponse {
  data: {
    id: string;
    attributes: {
      date: number;
      status: string;
      results: VirusTotalResult[];
      stats: VirusTotalStats;
    };
  };
}

export type AnalysisResult = {
  harmful: boolean;
  stats: VirusTotalStats;
  results: VirusTotalResult[];
  error?: string;
};

// HTML/JS Analysis types
export type HTMLFindings = {
  tags: Record<string, number>;
  findings: string[];
};

export type JSFindings = {
  file: string;
  messages: {
    line: number;
    column: number;
    message: string;
    ruleId: string | null;
  }[];
};

export type HTMLAnalysisResult = {
  url: string;
  htmlFindings: HTMLFindings;
  jsFindings?: JSFindings[];
  error?: string;
};
