import { ParsedGoogleDocJournal, parseGoogleDocJournal } from '../utils/journalDocUtils';

export type JournalFetchErrorKind =
  | 'missing_token'
  | 'expired_token'
  | 'missing_scope'
  | 'api_disabled'
  | 'not_found'
  | 'network';

export class JournalFetchError extends Error {
  readonly kind: JournalFetchErrorKind;
  readonly docId?: string;

  constructor(kind: JournalFetchErrorKind, message: string, docId?: string) {
    super(message);
    this.name = 'JournalFetchError';
    this.kind = kind;
    this.docId = docId;
  }
}

interface GoogleApiErrorPayload {
  error?: {
    code?: number;
    status?: string;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
    details?: Array<{
      reason?: string;
      metadata?: Record<string, string>;
    }>;
  };
}

/**
 * Strictly read-only fetch of a Google Doc with all document tabs expanded.
 * Cadence NEVER writes to the user's Google Doc.
 */
export async function fetchAndParseGoogleDocJournal(
  docId: string,
  docYear: number,
  accessToken: string | null
): Promise<ParsedGoogleDocJournal> {
  if (!accessToken) {
    throw new JournalFetchError(
      'missing_token',
      'Reconnect Google to grant read-only access to your Google Docs journal.',
      docId
    );
  }

  const endpoint = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(
    docId
  )}?includeTabsContent=true`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    throw new JournalFetchError(
      'network',
      'Could not reach Google Docs right now. Check your connection and try again.',
      docId
    );
  }

  if (!response.ok) {
    let payload: GoogleApiErrorPayload | null = null;
    try {
      payload = (await response.json()) as GoogleApiErrorPayload;
    } catch {
      payload = null;
    }

    const msg = payload?.error?.message || '';
    const detailReasons = (payload?.error?.details ?? [])
      .map((d) => d.reason || '')
      .filter(Boolean);
    const errReasons = (payload?.error?.errors ?? [])
      .map((e) => e.reason || '')
      .filter(Boolean);
    const allReasons = [...detailReasons, ...errReasons].join(' ').toUpperCase();

    if (response.status === 401) {
      throw new JournalFetchError(
        'expired_token',
        'Your Google session expired. Reconnect Google to refresh your journal.',
        docId
      );
    }

    if (response.status === 403) {
      if (
        allReasons.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
        /insufficient|scope/i.test(msg)
      ) {
        throw new JournalFetchError(
          'missing_scope',
          'Cadence needs read-only Google Docs permission to sync your journal.',
          docId
        );
      }

      if (
        allReasons.includes('SERVICE_DISABLED') ||
        allReasons.includes('ACCESSNOTCONFIGURED') ||
        /docs\.googleapis\.com.*not been used|api.*disabled|not enabled/i.test(msg)
      ) {
        throw new JournalFetchError(
          'api_disabled',
          'The Google Docs API is currently disabled on the Google Cloud project. Enable docs.googleapis.com and retry.',
          docId
        );
      }

      throw new JournalFetchError(
        'not_found',
        'This Google Doc could not be opened. Check that the link belongs to your signed-in Google account.',
        docId
      );
    }

    if (response.status === 404) {
      throw new JournalFetchError(
        'not_found',
        'Google Doc not found. Double-check the URL or document ID.',
        docId
      );
    }

    throw new JournalFetchError(
      'network',
      msg || `Google Docs returned an unexpected error (${response.status}).`,
      docId
    );
  }

  const json = (await response.json()) as unknown;
  return parseGoogleDocJournal(json, docYear);
}
