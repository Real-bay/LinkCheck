import express, { Request, Response, Router } from 'express';
import scanUrl from './api/linkverify.js';
import Docker from 'dockerode';
import { writeFile, readFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { AnalysisResult, HTMLAnalysisResult } from '../types';

const router: Router = express.Router();
const docker = new Docker();

// Utility function to pause execution for a given time
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

router.post('/analyze', async (req: Request, res: Response) => {
  const url: string = req.body.url;
  if (!url) {
    res.status(400).json({ error: 'Missing URL' });
    return;
  }

  const CONTAINER_SHARED_BASE = '/app/shared'; // Mount point inside container

  const jobId = `job-${randomUUID()}`; // Unique job ID for each container
  const containerJobPath = path.join(CONTAINER_SHARED_BASE, jobId); // e.g. /app/shared/job-xxxx
  const urlPath = path.join(containerJobPath, 'url.txt'); // File containing the URL to analyze
  const resultPath = path.join(containerJobPath, 'result.json'); // File to store the analysis results

  try {
    // 1. Create job folder and files on the host
    fs.mkdirSync(containerJobPath, { recursive: true });

    await writeFile(urlPath, '', {
      mode: 0o666,
    });
    await writeFile(resultPath, '{}', {
      mode: 0o666,
    });
    console.log(
      'Initialized url.txt and result.json files in:',
      containerJobPath,
    );

    // 2. Run VirusTotal check
    const vt: AnalysisResult = await scanUrl(url);

    if (vt.harmful) {
      console.log('URL is harmful, skipping analysis');
      res.status(200).json({
        vtResult: vt,
        skipped: true,
      });
      return;
    }

    console.log('URL is not harmful on VirusTotal, proceeding with analysis');

    // 3. Create and start the analyzer Docker container
    const container = await docker.createContainer({
      Image: 'analyzer:latest',
      name: jobId,
      Env: [`JOB_ID=${jobId}`],
      HostConfig: {
        Mounts: [
          {
            Target: '/app/shared',
            Source: 'linkcheck_shared-data',
            Type: 'volume',
          },
        ],
      },
    });

    await container.start();
    console.log('Analyzer container started:', jobId);
    console.log('Bound container path:', containerJobPath);

    // 4. Wait for the container to be fully running
    for (let i = 0; i < 10; i++) {
      const containerInfo = await docker.getContainer(container.id).inspect();
      console.log(
        'Checking container, attempt ',
        i + 1,
        '; Container status:',
        containerInfo.State.Status,
      );
      if (containerInfo.State.Running) {
        console.log('Container is running, writing URL file');
        break;
      }
      await sleep(500);
    }

    // 5. Write URL to trigger analysis
    console.log('Writing URL to file:', urlPath);
    await writeFile(urlPath, url);
    console.log('URL file written, waiting for analysis...');

    // 6. Wait for analysis result
    for (let i = 0; i < 30; i++) {
      console.log('Checking result file at path:', resultPath);
      if (fs.existsSync(resultPath)) {
        await sleep(1000);
        const resultContent = await readFile(resultPath, 'utf-8');
        try {
          if (resultContent.trim() === '{}') {
            console.log('Result file is empty, waiting...');
            await sleep(1000);
            continue;
          }
          console.log('Result file found, parsing...');
          const parsedResult: HTMLAnalysisResult = JSON.parse(resultContent);
          res.status(200).json({
            vtResult: vt,
            pageAnalysis: parsedResult,
            skipped: false,
          });
          console.log('Analysis complete.');
          return;
        } catch (err) {
          console.error('Error parsing JSON:', err);
          res.status(500).json({ error: 'Failed to parse analysis result' });
          return;
        }
      }
      console.log('Result file not found, waiting...');
      await sleep(1000);
    }

    await container.stop();
    res.status(500).json({ error: 'Timeout waiting for analysis' });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
