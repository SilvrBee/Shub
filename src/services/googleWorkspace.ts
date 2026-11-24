export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  isAllDay: boolean;
  location?: string;
  htmlLink?: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
  isGoogleDoc: boolean;
}

export interface GoogleGmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export function sanitizeExternalUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export class WorkspaceAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceAuthError';
  }
}

async function fetchGoogleJson<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    throw new WorkspaceAuthError('Your Google session expired. Please reconnect your account.');
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) {
        detail = body.error.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

interface RawCalendarResponse {
  items?: Array<{
    id: string;
    summary?: string;
    location?: string;
    htmlLink?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  }>;
}

export async function fetchUpcomingCalendarEvents(
  accessToken: string
): Promise<GoogleCalendarEvent[]> {
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const params = new URLSearchParams({
    timeMin,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '8',
  });

  const data = await fetchGoogleJson<RawCalendarResponse>(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    accessToken
  );

  return (data.items ?? []).map((item) => {
    const start = item.start?.dateTime ?? item.start?.date ?? '';
    const end = item.end?.dateTime ?? item.end?.date ?? '';
    return {
      id: item.id,
      summary: item.summary?.trim() || 'Untitled Event',
      start,
      end,
      isAllDay: !item.start?.dateTime,
      location: item.location,
      htmlLink: sanitizeExternalUrl(item.htmlLink),
    };
  });
}

interface RawDriveResponse {
  files?: Array<{
    id: string;
    name?: string;
    mimeType?: string;
    modifiedTime?: string;
    webViewLink?: string;
  }>;
}

export async function fetchRecentDriveFiles(
  accessToken: string
): Promise<GoogleDriveFile[]> {
  const params = new URLSearchParams({
    pageSize: '10',
    orderBy: 'modifiedTime desc',
    q: 'trashed = false',
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
  });

  const data = await fetchGoogleJson<RawDriveResponse>(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    accessToken
  );

  return (data.files ?? []).map((file) => ({
    id: file.id,
    name: file.name || 'Untitled File',
    mimeType: file.mimeType || 'application/octet-stream',
    modifiedTime: file.modifiedTime || '',
    webViewLink: sanitizeExternalUrl(file.webViewLink),
    isGoogleDoc: file.mimeType === 'application/vnd.google-apps.document',
  }));
}

interface RawGmailListResponse {
  messages?: Array<{ id: string }>;
}

interface RawGmailMessageResponse {
  id: string;
  snippet?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
  };
}

export async function fetchRecentGmailMessages(
  accessToken: string
): Promise<GoogleGmailMessage[]> {
  const listData = await fetchGoogleJson<RawGmailListResponse>(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=6&labelIds=INBOX',
    accessToken
  );

  const ids = (listData.messages ?? []).map((m) => m.id);
  if (ids.length === 0) return [];

  const details = await Promise.all(
    ids.map((id) =>
      fetchGoogleJson<RawGmailMessageResponse>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(
          id
        )}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        accessToken
      )
    )
  );

  return details.map((msg) => {
    const headers = msg.payload?.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

    return {
      id: msg.id,
      subject: getHeader('Subject') || '(No Subject)',
      from: getHeader('From') || 'Unknown Sender',
      date: getHeader('Date') || '',
      snippet: msg.snippet || '',
    };
  });
}
