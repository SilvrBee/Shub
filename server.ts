import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface IncomingTaskPayload {
  id: string;
  title: string;
  details?: string;
  dueDate?: string;
  dueTime?: string;
  deadlineDate?: string;
  deadlineTime?: string;
  priority: 'High' | 'Medium' | 'Low' | 'None';
  durationMinutes?: number;
  subtasks?: Array<{ title: string; completed: boolean }>;
  pinned?: boolean;
}

interface IncomingSchedulePayload {
  title: string;
  startTime: string;
  endTime: string;
  category?: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/tasks/ai-sort', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'AI sort is not configured. Using score order instead.',
        code: 'MISSING_API_KEY',
      });
      return;
    }

    const body = req.body as {
      todayDate?: string;
      tasks?: IncomingTaskPayload[];
      schedule?: IncomingSchedulePayload[];
    };

    if (!body || !Array.isArray(body.tasks)) {
      res.status(400).json({ error: 'Invalid task payload.', code: 'BAD_REQUEST' });
      return;
    }

    const tasks = body.tasks.slice(0, 80);
    if (tasks.length === 0) {
      res.json({ orderedTaskIds: [], suggestions: [] });
      return;
    }

    const todayDate =
      typeof body.todayDate === 'string' && body.todayDate.trim()
        ? body.todayDate.trim().slice(0, 20)
        : new Date().toISOString().slice(0, 10);

    const schedule = Array.isArray(body.schedule) ? body.schedule.slice(0, 40) : [];
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    const promptPayload = {
      todayDate,
      scheduleBlocks: schedule.map((b) => ({
        title: String(b.title || '').slice(0, 140),
        startTime: String(b.startTime || '').slice(0, 10),
        endTime: String(b.endTime || '').slice(0, 10),
        category: String(b.category || '').slice(0, 40),
      })),
      openTasks: tasks.map((t) => ({
        id: t.id,
        title: String(t.title || '').slice(0, 220),
        details: t.details ? String(t.details).slice(0, 400) : undefined,
        dueDate: t.dueDate,
        dueTime: t.dueTime,
        deadlineDate: t.deadlineDate,
        deadlineTime: t.deadlineTime,
        priority: t.priority,
        durationMinutes: t.durationMinutes,
        subtasks: Array.isArray(t.subtasks)
          ? t.subtasks.slice(0, 15).map((s) => ({
              title: String(s.title || '').slice(0, 120),
              completed: Boolean(s.completed),
            }))
          : undefined,
        pinned: Boolean(t.pinned),
      })),
    };

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          'Order the openTasks for optimal execution today based on deadlines, due dates, priority flags, subtasks, pinned status, and available time around scheduleBlocks.',
          'Rules:',
          '1. Return strictly JSON matching the schema. Do NOT include explanations or reasons.',
          '2. orderedTaskIds must list task IDs from openTasks in recommended execution order.',
          '3. In suggestions, ONLY include suggestedPriority ("High", "Medium", or "Low") for tasks whose priority is currently "None".',
          '4. In suggestions, ONLY include suggestedDurationMinutes (integer 2..240) for tasks where durationMinutes is missing.',
          '',
          JSON.stringify(promptPayload),
        ].join('\n'),
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              orderedTaskIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    suggestedPriority: {
                      type: Type.STRING,
                      enum: ['High', 'Medium', 'Low'],
                    },
                    suggestedDurationMinutes: {
                      type: Type.INTEGER,
                    },
                  },
                  required: ['id'],
                },
              },
            },
            required: ['orderedTaskIds', 'suggestions'],
          },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        res.status(502).json({
          error: 'AI returned an empty response. Using score order.',
          code: 'EMPTY_RESPONSE',
        });
        return;
      }

      const parsed = JSON.parse(rawText) as {
        orderedTaskIds?: unknown;
        suggestions?: unknown;
      };

      const seenIds = new Set<string>();
      const orderedTaskIds: string[] = [];
      if (Array.isArray(parsed.orderedTaskIds)) {
        for (const id of parsed.orderedTaskIds) {
          if (typeof id === 'string' && taskMap.has(id) && !seenIds.has(id)) {
            seenIds.add(id);
            orderedTaskIds.push(id);
          }
        }
      }

      const validPrios = new Set(['High', 'Medium', 'Low']);
      const suggestions: Array<{
        id: string;
        suggestedPriority?: 'High' | 'Medium' | 'Low';
        suggestedDurationMinutes?: number;
      }> = [];

      if (Array.isArray(parsed.suggestions)) {
        const seenSug = new Set<string>();
        for (const item of parsed.suggestions) {
          if (!item || typeof item !== 'object') continue;
          const rec = item as Record<string, unknown>;
          const id = typeof rec.id === 'string' ? rec.id : '';
          const orig = taskMap.get(id);
          if (!orig || seenSug.has(id)) continue;
          seenSug.add(id);

          const out: {
            id: string;
            suggestedPriority?: 'High' | 'Medium' | 'Low';
            suggestedDurationMinutes?: number;
          } = { id };

          if (
            orig.priority === 'None' &&
            typeof rec.suggestedPriority === 'string' &&
            validPrios.has(rec.suggestedPriority)
          ) {
            out.suggestedPriority = rec.suggestedPriority as 'High' | 'Medium' | 'Low';
          }

          if (
            (orig.durationMinutes === undefined || orig.durationMinutes <= 0) &&
            typeof rec.suggestedDurationMinutes === 'number' &&
            Number.isFinite(rec.suggestedDurationMinutes)
          ) {
            out.suggestedDurationMinutes = Math.max(
              2,
              Math.min(480, Math.round(rec.suggestedDurationMinutes))
            );
          }

          if (out.suggestedPriority || out.suggestedDurationMinutes) {
            suggestions.push(out);
          }
        }
      }

      res.json({ orderedTaskIds, suggestions });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = /429|quota|rate limit|resource_exhausted/i.test(msg);
      res.status(isRateLimit ? 429 : 502).json({
        error: isRateLimit
          ? 'AI rate limit reached. Using score order.'
          : 'AI sort could not be completed. Using score order.',
        code: isRateLimit ? 'RATE_LIMITED' : 'AI_FAILED',
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use('/Shub', express.static(distPath));
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Cadence server listening on port ${port}`);
  });
}

void startServer();
