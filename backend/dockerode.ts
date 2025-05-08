import express, { Request, Response, Router } from 'express';
import scanUrl from './api/linkverify.js';
import Docker from 'dockerode';
import { writeFile, readFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const router: Router = express.Router();
const docker = new Docker();

router.post('/analyze', async (req: Request, res: Response) => {
  const url: string = req.body.url;
  if (!url) {
    res.status(400).json({ error: 'Missing URL' });
    return;
  }

  //const HOST_SHARED_BASE = path.resolve('shared'); // Host path: ./shared/
  const CONTAINER_SHARED_BASE = '/app/shared'; // Mount point inside container

  const jobId = `job-${randomUUID()}`;
  //const hostJobPath = path.join(HOST_SHARED_BASE, jobId); // e.g. ./shared/job-xxxx
  const containerJobPath = path.join(CONTAINER_SHARED_BASE, jobId); // e.g. /app/shared/job-xxxx
  const urlPath = path.join(containerJobPath, 'url.txt');
  const resultPath = path.join(containerJobPath, 'result.json');

  try {
    // 1. Create job folder on the host
    fs.mkdirSync(containerJobPath, { recursive: true });

    // 1.5. Create url.txt and result.json files in the job folder
    await writeFile(path.join(containerJobPath, 'url.txt'), '', {
      mode: 0o666,
    });
    await writeFile(path.join(containerJobPath, 'result.json'), '{}', {
      mode: 0o666,
    });
    console.log(
      'Initialized url.txt and result.json files in:',
      containerJobPath,
    );

    // 2. Run VirusTotal check
    const vt = await scanUrl(url);

    if (vt.harmful) {
      console.log('URL is harmful, skipping analysis');
      res.status(200).json({
        vtResult: vt,
        pageAnalysis: null,
        skipped: true,
      });
      return;
    }

    console.log('URL is not harmful on VirusTotal, proceeding with analysis');

    // 3. Create and start the Docker container
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
      await new Promise((r) => setTimeout(r, 500));
    }

    // 5. Write URL to trigger analysis
    console.log('Writing URL to file:', urlPath);
    await writeFile(urlPath, url);
    console.log('URL file written, waiting for analysis...');

    // 6. Wait for analysis result
    for (let i = 0; i < 30; i++) {
      console.log('Checking result file at path:', resultPath);
      if (fs.existsSync(resultPath)) {
        await new Promise((r) => setTimeout(r, 1000)); // Wait before reading
        const resultContent = await readFile(resultPath, 'utf-8');
        try {
          if (resultContent.trim() === '{}') {
            console.log('Result file is empty, waiting...');
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          console.log('Result file found, parsing...');
          const parsedResult = JSON.parse(resultContent);
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
      await new Promise((r) => setTimeout(r, 1000));
    }

    await container.stop();
    res.status(500).json({ error: 'Timeout waiting for analysis' });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
