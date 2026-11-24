export interface ParsedJournalEntry {
  entryDate: string;
  heading: string;
  text: string;
  contentHash: string;
  snippet: string;
}

interface PickerDocument {
  id: string;
  name?: string;
  url?: string;
}

interface PickerResponse {
  action: string;
  docs?: PickerDocument[];
}

declare global {
  interface Window {
    gapi?: {
      load: (api: string, callback: () => void) => void;
    };
    google?: {
      picker?: {
        ViewId: { DOCS: string };
        Action: { PICKED: string; CANCEL: string };
        DocsView: new (viewId: string) => {
          setMimeTypes: (mimeTypes: string) => void;
          setIncludeFolders: (include: boolean) => void;
        };
        PickerBuilder: new () => {
          addView: (view: unknown) => unknown;
          setOAuthToken: (token: string) => unknown;
          setOrigin: (origin: string) => unknown;
          setTitle: (title: string) => unknown;
          setCallback: (cb: (data: PickerResponse) => void) => unknown;
          build: () => { setVisible: (visible: boolean) => void };
        };
      };
    };
  }
}

let gapiLoaderPromise: Promise<void> | null = null;

function ensureGooglePickerLoaded(): Promise<void> {
  if (window.google?.picker) {
    return Promise.resolve();
  }
  if (gapiLoaderPromise) return gapiLoaderPromise;

  gapiLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.onload = () => {
      if (!window.gapi) {
        reject(new Error('Google Picker script loaded without gapi.'));
        return;
      }
      window.gapi.load('picker', () => resolve());
    };
    script.onerror = () => reject(new Error('Failed to load Google Picker API script.'));
    document.head.appendChild(script);
  });

  return gapiLoaderPromise;
}

export async function pickJournalGoogleDoc(accessToken: string): Promise<{
  id: string;
  name: string;
  url: string;
} | null> {
  await ensureGooglePickerLoaded();

  const pickerNs = window.google?.picker;
  if (!pickerNs) {
    throw new Error('Google Picker is not available in this browser.');
  }

  return new Promise((resolve) => {
    const pickerOrigin =
      window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
        ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
        : window.location.origin;

    const docsView = new pickerNs.DocsView(pickerNs.ViewId.DOCS);
    docsView.setMimeTypes('application/vnd.google-apps.document');
    docsView.setIncludeFolders(true);

    const builder = new pickerNs.PickerBuilder();
    builder.addView(docsView);
    builder.setOAuthToken(accessToken);
    builder.setOrigin(pickerOrigin);
    builder.setTitle('Select your Google Docs journal');
    builder.setCallback((data: PickerResponse) => {
      if (data.action === pickerNs.Action.PICKED && data.docs && data.docs[0]) {
        const picked = data.docs[0];
        resolve({
          id: picked.id,
          name: picked.name || 'Journal Document',
          url: picked.url || `https://docs.google.com/document/d/${picked.id}/edit`,
        });
      } else if (data.action === pickerNs.Action.CANCEL) {
        resolve(null);
      }
    });

    const picker = builder.build();
    picker.setVisible(true);
  });
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface GoogleDocParagraphElement {
  textRun?: { content?: string };
}

interface GoogleDocStructuralElement {
  paragraph?: {
    paragraphStyle?: { namedStyleType?: string };
    elements?: GoogleDocParagraphElement[];
  };
}

interface GoogleDocPayload {
  title?: string;
  body?: {
    content?: GoogleDocStructuralElement[];
  };
}

const DATE_LINE_PATTERNS: RegExp[] = [
  /^(\d{4}-\d{2}-\d{2})\b/,
  /^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
  /^(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,
  /^(\d{1,2}\/\d{1,2}\/\d{2,4})/,
];

function tryExtractDateHeading(line: string, isHeadingStyle: boolean): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 90) return null;

  for (const regex of DATE_LINE_PATTERNS) {
    const match = trimmed.match(regex);
    if (match) {
      const parsed = new Date(match[1]);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(match[1])) {
        return match[1];
      }
    }
  }

  if (isHeadingStyle && trimmed.length <= 45) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return null;
}

export async function fetchGoogleDocEntries(
  docId: string,
  accessToken: string
): Promise<{ docTitle: string; entries: ParsedJournalEntry[] }> {
  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (res.status === 401) {
    throw new Error('Your Google session expired. Please reconnect your Google account.');
  }
  if (res.status === 403 || res.status === 404) {
    throw new Error(
      'Unable to read the selected Google Doc. Please re-select the document using the Google Doc Picker.'
    );
  }
  if (!res.ok) {
    throw new Error(`Google Docs request failed (${res.status}).`);
  }

  const doc = (await res.json()) as GoogleDocPayload;
  const content = doc.body?.content ?? [];
  const docTitle = doc.title || 'Google Docs Journal';

  const blocks: Array<{ heading: string; entryDate: string; lines: string[] }> = [];
  let current: { heading: string; entryDate: string; lines: string[] } | null = null;

  for (const item of content) {
    const para = item.paragraph;
    if (!para) continue;
    const text = (para.elements ?? []).map((el) => el.textRun?.content ?? '').join('');
    const cleanLine = text.replace(/\r/g, '').trimEnd();
    if (!cleanLine.trim()) {
      if (current) current.lines.push('');
      continue;
    }

    const styleType = para.paragraphStyle?.namedStyleType || '';
    const isHeading = styleType.startsWith('HEADING_');
    const detectedDate = tryExtractDateHeading(cleanLine, isHeading);

    if (detectedDate) {
      if (current && current.lines.join('\n').trim().length > 0) {
        blocks.push(current);
      }
      current = {
        heading: cleanLine.trim().slice(0, 250),
        entryDate: detectedDate,
        lines: [],
      };
    } else {
      if (!current) {
        current = {
          heading: docTitle,
          entryDate: new Date().toISOString().slice(0, 10),
          lines: [],
        };
      }
      current.lines.push(cleanLine);
    }
  }

  if (current && current.lines.join('\n').trim().length > 0) {
    blocks.push(current);
  }

  // Sort ascending by entryDate while preserving document order for identical dates
  blocks.sort((a, b) => a.entryDate.localeCompare(b.entryDate));

  const entries: ParsedJournalEntry[] = [];
  for (const block of blocks) {
    const bodyText = block.lines.join('\n').trim();
    if (bodyText.length < 10) continue;
    const contentHash = await sha256Hex(`${block.entryDate}::${block.heading}::${bodyText}`);
    entries.push({
      entryDate: block.entryDate,
      heading: block.heading,
      text: bodyText,
      contentHash,
      snippet: bodyText.slice(0, 280),
    });
  }

  return { docTitle, entries };
}
