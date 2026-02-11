import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { runResearch, ResearchConfig } from './scripts/grok_context_research';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiter: max 3 research requests per minute
const researchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: { error: 'Too many requests. Please wait a moment.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.post('/api/research', researchLimiter, async (req, res) => {
    try {
        console.log('Received research request:', req.body);
        const config: ResearchConfig = {
            apiKey: process.env.XAI_API_KEY || '',
            baseUrl: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
            model: req.body.model || process.env.XAI_MODEL || 'grok-3',
            topic: String(req.body.topic || '').slice(0, 200),
            locale: req.body.locale || 'ja',
            audience: req.body.audience || 'engineer',
            days: Number(req.body.days) || 30,
            outDir: 'data/context-research',
            dryRun: false,
            rawJson: true, // Always save JSON
            goal: req.body.goal,
            depth: req.body.depth || 'simple',
            template: req.body.template || 'general',
            topN: Number(req.body.topN) || 10,
            buzzThreshold: Number(req.body.buzzThreshold) || 100,
            primarySourcePriority: req.body.primarySourcePriority === 'true' || req.body.primarySourcePriority === true
        };

        if (!config.apiKey) {
            console.error('API Key missing');
            return res.status(500).json({ error: 'API key not configured' });
        }

        if (!config.topic || config.topic.trim().length === 0) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        console.log(`Starting ${config.depth} research for topic: ${config.topic}`);
        const result = await runResearch(config);

        console.log('Research completed successfully. Sending response...');
        res.json(result);
        console.log('Response sent.');

    } catch (error: any) {
        console.error('Research error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Load History
app.get('/api/history', async (req, res) => {
    try {
        const dirPath = path.join(process.cwd(), 'data/context-research');

        // Ensure dir exists
        if (!fs.existsSync(dirPath)) {
            return res.json([]);
        }

        const files = await fsPromises.readdir(dirPath);
        const reports = await Promise.all(
            files
                .filter(f => f.endsWith('.md'))
                .map(async f => {
                    const filePath = path.join(dirPath, f);
                    const stats = await fsPromises.stat(filePath);

                    let title = f.replace('.md', '');

                    // Try to extract real topic from file content
                    try {
                        const fileHandle = await fsPromises.open(filePath, 'r');
                        // Read first 1KB to find the topic
                        const buffer = Buffer.alloc(1024);
                        const { bytesRead } = await fileHandle.read(buffer, 0, 1024, 0);
                        await fileHandle.close();

                        if (bytesRead > 0) {
                            const contentStart = buffer.toString('utf-8', 0, bytesRead);

                            // 1. Try Frontmatter title: "Topic"
                            const frontmatterMatch = contentStart.match(/^title:\s*"(.+?)"/m);
                            if (frontmatterMatch && frontmatterMatch[1]) {
                                title = frontmatterMatch[1];
                            }
                            // 2. Try legacy Research Topic: Topic
                            else {
                                const legacyMatch = contentStart.match(/Research Topic:\s*(.+?)(\r?\n|$)/i);
                                if (legacyMatch && legacyMatch[1]) {
                                    title = legacyMatch[1].trim();
                                } else {
                                    // 3. Fallback to filename parts
                                    // Expect: YYYYMMDD_Topic
                                    const parts = f.replace('.md', '').split('_');
                                    // Filter out timestamp parts if possible
                                    if (parts.length >= 2 && !f.includes('_context')) {
                                        // If first part looks like date (8 digits or more), skip it
                                        // Old format: 20260211T...
                                        // New format: 20260211_...
                                        const isDateLike = /^\d{8}/.test(parts[0]);
                                        const startIndex = isDateLike ? 1 : 0;
                                        title = parts.slice(startIndex).join(' ');
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error(`Error reading topic from ${f}:`, e);
                    }

                    return {
                        filename: f,
                        title: title,
                        created: stats.mtime,
                        timestampStr: f.split('_')[0]
                    };
                })
        );

        // Sort by date desc
        reports.sort((a, b) => b.created.getTime() - a.created.getTime());

        res.json(reports);
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Load Specific Report
app.get('/api/history/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        // Security: strict validation
        if (!/^[\w\-\.]+\.md$/.test(filename) || filename.includes('..')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        const allowedDir = path.resolve(process.cwd(), 'data/context-research');
        const filePath = path.resolve(allowedDir, filename);

        // Ensure resolved path is within allowed directory
        if (!filePath.startsWith(allowedDir + path.sep)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const content = await fsPromises.readFile(filePath, 'utf-8');
        res.json({ markdown: content });
    } catch (error) {
        console.error('File read error:', error);
        res.status(500).json({ error: 'Failed to read file' });
    }
});

// Start server with extended timeout
const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Set timeout to 5 minutes (300,000 ms)
server.setTimeout(300000);
