import express, { Request, Response, Router } from 'express';
import scanUrl from '../frontend/src/api/linkverify.js';
import Docker from 'dockerode';
import { writeFile, readFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const router: Router = express.Router();
const docker = new Docker();
const RESULT_BASE = '/results'; // Volume mount path

router.post('/analyze', async (req: Request, res: Response) => {
  const url: string = req.body.url;
  if (!url) {
    res.status(400).json({ error: 'Missing URL' });
    return;
  }

  const jobId = `job-${randomUUID()}`;
  const jobPath = path.join(RESULT_BASE, jobId);
  const urlPath = path.join(jobPath, 'url.txt');
  const resultPath = path.join(jobPath, 'result.json');

  try {
    // Create job directory
    fs.mkdirSync(jobPath, { recursive: true });

    // 1. Start analyzer container
    const container = await docker.createContainer({
      Image: 'analyzer:latest',
      name: jobId,
      HostConfig: {
        Binds: [`shared-data:${RESULT_BASE}`],
        AutoRemove: true,
      },
    });
    await container.start();

    // 2. Run VirusTotal check
    const vt = await scanUrl(url);

    if (vt.harmful) {
      await container.stop();
      res.status(200).json({
        vtResult: vt,
        pageAnalysis: null,
        skipped: true,
      });
      return;
    }

    // 3. Write URL file to trigger analyzer
    await writeFile(urlPath, url);

    // 4. Wait for result file
    for (let i = 0; i < 30; i++) {
      if (fs.existsSync(resultPath)) {
        const resultContent = await readFile(resultPath, 'utf-8');
        res.status(200).json({
          vtResult: vt,
          pageAnalysis: JSON.parse(resultContent),
          skipped: false,
        });
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    await container.stop();
    res.status(500).json({ error: 'Timeout waiting for analysis' });
    return;
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Internal error' });
    return;
  }
});

export default router;
