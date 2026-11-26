import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { auth, db } from './googleAuth';
import {
  ActivityLog,
  CommitmentItem,
  FocusSession,
  HabitItem,
  JournalConfig,
  JournalEntrySummary,
  NoteItem,
  PersonProfile,
  PersonSuggestion,
  ReviewSuggestion,
  ScheduleBlock,
  TaskItem,
  TimelineEvent,
  VaultItem,
} from '../types/dashboard';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function cleanPayload<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned || `id_${Date.now()}`;
}

function getDb() {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }
  return db;
}

export async function ensureUserRootProfile(user: User): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return;
  }
  const firestore = getDb();
  const path = `users/${user.uid}`;
  try {
    const ref = doc(firestore, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(
        ref,
        cleanPayload({
          uid: user.uid,
          displayName: (user.displayName || '').slice(0, 120),
          email: (user.email || '').slice(0, 254),
          photoURL: (user.photoURL || '').slice(0, 500),
          scratchpad: '',
          autoSyncEnabled: false,
          autoSyncOnOpen: false,
          aiPrivacyAcknowledged: false,
          syncTime: '21:00',
          syncTimezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC').slice(0, 80),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    } else {
      await updateDoc(
        ref,
        cleanPayload({
          displayName: (user.displayName || '').slice(0, 120),
          email: (user.email || '').slice(0, 254),
          photoURL: (user.photoURL || '').slice(0, 500),
          updatedAt: serverTimestamp(),
        })
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserScratchpad(uid: string, scratchpad: string): Promise<void> {
  const firestore = getDb();
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(firestore, 'users', uid), {
      scratchpad: scratchpad.slice(0, 20000),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserJournalConfig(
  uid: string,
  patch: Partial<JournalConfig>
): Promise<void> {
  const firestore = getDb();
  const path = `users/${uid}`;
  try {
    await updateDoc(
      doc(firestore, 'users', uid),
      cleanPayload({
        ...patch,
        updatedAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (data: { scratchpad: string; journalConfig: JournalConfig }) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const firestore = getDb();
  const path = `users/${uid}`;
  return onSnapshot(
    doc(firestore, 'users', uid),
    (snap) => {
      const raw = snap.data() as Record<string, unknown> | undefined;
      if (!raw) {
        onData({ scratchpad: '', journalConfig: {} });
        return;
      }
      onData({
        scratchpad: typeof raw.scratchpad === 'string' ? raw.scratchpad : '',
        journalConfig: {
          journalDocId: typeof raw.journalDocId === 'string' ? raw.journalDocId : undefined,
          journalDocName: typeof raw.journalDocName === 'string' ? raw.journalDocName : undefined,
          journalDocUrl: typeof raw.journalDocUrl === 'string' ? raw.journalDocUrl : undefined,
          autoSyncEnabled: typeof raw.autoSyncEnabled === 'boolean' ? raw.autoSyncEnabled : false,
          autoSyncOnOpen: typeof raw.autoSyncOnOpen === 'boolean' ? raw.autoSyncOnOpen : false,
          aiPrivacyAcknowledged:
            typeof raw.aiPrivacyAcknowledged === 'boolean' ? raw.aiPrivacyAcknowledged : false,
          syncTime: typeof raw.syncTime === 'string' ? raw.syncTime : '21:00',
          syncTimezone:
            typeof raw.syncTimezone === 'string'
              ? raw.syncTimezone
              : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          lastSyncedAt: typeof raw.lastSyncedAt === 'string' ? raw.lastSyncedAt : undefined,
          lastProcessedEntryDate:
            typeof raw.lastProcessedEntryDate === 'string' ? raw.lastProcessedEntryDate : undefined,
          lastProcessedEntryHash:
            typeof raw.lastProcessedEntryHash === 'string' ? raw.lastProcessedEntryHash : undefined,
          lastSyncError: typeof raw.lastSyncError === 'string' ? raw.lastSyncError : undefined,
        },
      });
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeUserCollection<T extends { id: string }>(
  uid: string,
  collectionName: string,
  onData: (items: T[]) => void
): Unsubscribe {
  const firestore = getDb();
  const path = `users/${uid}/${collectionName}`;
  const q = query(collection(firestore, 'users', uid, collectionName), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        ...(d.data() as Omit<T, 'id'>),
        id: d.id,
      })) as T[];
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Generic create/update/delete under users/{uid}/{subcollection}/{docId}
export async function createUserDoc(
  uid: string,
  collectionName: string,
  docId: string,
  data: Record<string, unknown>,
  withUpdatedAt = true
): Promise<void> {
  const firestore = getDb();
  const safeId = sanitizeId(docId);
  const path = `users/${uid}/${collectionName}/${safeId}`;
  try {
    const payload = cleanPayload({
      ...data,
      ownerId: uid,
      createdAt: serverTimestamp(),
      ...(withUpdatedAt ? { updatedAt: serverTimestamp() } : {}),
    });
    await setDoc(doc(firestore, 'users', uid, collectionName, safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserDoc(
  uid: string,
  collectionName: string,
  docId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const firestore = getDb();
  const safeId = sanitizeId(docId);
  const path = `users/${uid}/${collectionName}/${safeId}`;
  try {
    await updateDoc(
      doc(firestore, 'users', uid, collectionName, safeId),
      cleanPayload({
        ...patch,
        updatedAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserDoc(
  uid: string,
  collectionName: string,
  docId: string
): Promise<void> {
  const firestore = getDb();
  const safeId = sanitizeId(docId);
  const path = `users/${uid}/${collectionName}/${safeId}`;
  try {
    await deleteDoc(doc(firestore, 'users', uid, collectionName, safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Typed helpers for existing dashboard entities
function serializeTaskPatch(patch: Partial<TaskItem>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const has = (k: keyof TaskItem) => Object.prototype.hasOwnProperty.call(patch, k);

  if (has('title') && patch.title !== undefined) {
    out.title = patch.title.trim().slice(0, 300);
  }
  if (has('category')) {
    out.category =
      patch.category && patch.category.trim() ? patch.category.trim().slice(0, 60) : deleteField();
  }
  if (has('priority') && patch.priority !== undefined) {
    out.priority = patch.priority;
  }
  if (has('prioritySource') && patch.prioritySource !== undefined) {
    out.prioritySource = patch.prioritySource === 'auto' ? 'auto' : 'user';
  }
  if (has('priorityAutoPrev')) {
    out.priorityAutoPrev = patch.priorityAutoPrev ? patch.priorityAutoPrev : deleteField();
  }
  if (has('priorityAutoReason')) {
    out.priorityAutoReason = patch.priorityAutoReason
      ? patch.priorityAutoReason.slice(0, 160)
      : deleteField();
  }
  if (has('priorityAutoLocked')) {
    out.priorityAutoLocked = patch.priorityAutoLocked ? true : deleteField();
  }
  if (has('dueDate')) {
    out.dueDate = patch.dueDate ? patch.dueDate.slice(0, 20) : deleteField();
  }
  if (has('dueTime')) {
    out.dueTime = patch.dueTime ? patch.dueTime.slice(0, 10) : deleteField();
  }
  if (has('deadlineDate')) {
    out.deadlineDate = patch.deadlineDate ? patch.deadlineDate.slice(0, 20) : deleteField();
  }
  if (has('deadlineTime')) {
    out.deadlineTime = patch.deadlineTime ? patch.deadlineTime.slice(0, 10) : deleteField();
  }
  if (has('completed') && patch.completed !== undefined) {
    out.completed = Boolean(patch.completed);
  }
  if (has('details')) {
    out.details = patch.details ? patch.details.slice(0, 4000) : deleteField();
  }
  if (has('notes')) {
    out.notes = patch.notes ? patch.notes.slice(0, 2000) : deleteField();
  }
  if (has('subtasks')) {
    out.subtasks =
      patch.subtasks && patch.subtasks.length > 0
        ? patch.subtasks.slice(0, 30).map((st) => ({
            id: st.id.slice(0, 128),
            title: st.title.trim().slice(0, 240),
            completed: Boolean(st.completed),
          }))
        : deleteField();
  }
  if (has('repeat')) {
    out.repeat = patch.repeat ? patch.repeat : deleteField();
  }
  if (has('repeatWeekdays')) {
    out.repeatWeekdays =
      patch.repeatWeekdays && patch.repeatWeekdays.length > 0
        ? patch.repeatWeekdays.slice(0, 7)
        : deleteField();
  }
  if (has('recurrenceChildId')) {
    out.recurrenceChildId = patch.recurrenceChildId
      ? patch.recurrenceChildId.slice(0, 128)
      : deleteField();
  }
  if (has('durationMinutes')) {
    out.durationMinutes =
      typeof patch.durationMinutes === 'number' && Number.isFinite(patch.durationMinutes)
        ? Math.max(1, Math.min(1440, Math.round(patch.durationMinutes)))
        : deleteField();
  }
  if (has('reminderOffset')) {
    out.reminderOffset =
      patch.reminderOffset && patch.reminderOffset !== 'default'
        ? patch.reminderOffset
        : deleteField();
  }
  if (has('pinned')) {
    out.pinned = Boolean(patch.pinned);
  }
  return out;
}

export async function clearLegacyTaskAiFields(uid: string, taskId: string): Promise<void> {
  await updateUserDoc(uid, 'tasks', taskId, {
    prioritySource: 'user',
    durationSource: deleteField(),
  });
}

export const fsTasks = {
  create: (uid: string, item: TaskItem) =>
    createUserDoc(uid, 'tasks', item.id, {
      title: item.title.trim().slice(0, 300),
      category: item.category?.trim() ? item.category.trim().slice(0, 60) : undefined,
      priority: item.priority,
      prioritySource: item.prioritySource === 'auto' ? 'auto' : 'user',
      priorityAutoPrev: item.priorityAutoPrev,
      priorityAutoReason: item.priorityAutoReason ? item.priorityAutoReason.slice(0, 160) : undefined,
      priorityAutoLocked: item.priorityAutoLocked ? true : undefined,
      dueDate: item.dueDate ? item.dueDate.slice(0, 20) : undefined,
      dueTime: item.dueTime ? item.dueTime.slice(0, 10) : undefined,
      deadlineDate: item.deadlineDate ? item.deadlineDate.slice(0, 20) : undefined,
      deadlineTime: item.deadlineTime ? item.deadlineTime.slice(0, 10) : undefined,
      completed: item.completed,
      details: item.details ? item.details.slice(0, 4000) : undefined,
      subtasks:
        item.subtasks && item.subtasks.length > 0
          ? item.subtasks.slice(0, 30).map((st) => ({
              id: st.id.slice(0, 128),
              title: st.title.trim().slice(0, 240),
              completed: Boolean(st.completed),
            }))
          : undefined,
      repeat: item.repeat && item.repeat !== 'none' ? item.repeat : undefined,
      repeatWeekdays:
        item.repeat === 'custom' && item.repeatWeekdays && item.repeatWeekdays.length > 0
          ? item.repeatWeekdays.slice(0, 7)
          : undefined,
      recurrenceChildId: item.recurrenceChildId ? item.recurrenceChildId.slice(0, 128) : undefined,
      durationMinutes:
        typeof item.durationMinutes === 'number' && Number.isFinite(item.durationMinutes)
          ? Math.max(1, Math.min(1440, Math.round(item.durationMinutes)))
          : undefined,
      reminderOffset:
        item.reminderOffset && item.reminderOffset !== 'default' ? item.reminderOffset : undefined,
      pinned: item.pinned ? true : undefined,
    }),
  update: (uid: string, id: string, patch: Partial<TaskItem>) =>
    updateUserDoc(uid, 'tasks', id, serializeTaskPatch(patch)),
  remove: (uid: string, id: string) => deleteUserDoc(uid, 'tasks', id),
};

export const fsSchedule = {
  create: (uid: string, item: ScheduleBlock) =>
    createUserDoc(uid, 'schedule', item.id, {
      title: item.title.slice(0, 200),
      startTime: item.startTime.slice(0, 10),
      endTime: item.endTime.slice(0, 10),
      category: item.category.trim().slice(0, 60) || 'Work',
      location: item.location?.slice(0, 200),
    }),
  update: (uid: string, id: string, patch: Partial<ScheduleBlock>) =>
    updateUserDoc(uid, 'schedule', id, {
      ...(patch.title !== undefined ? { title: patch.title.slice(0, 200) } : {}),
      ...(patch.startTime !== undefined ? { startTime: patch.startTime.slice(0, 10) } : {}),
      ...(patch.endTime !== undefined ? { endTime: patch.endTime.slice(0, 10) } : {}),
      ...(patch.category !== undefined
        ? { category: patch.category.trim().slice(0, 60) || 'Work' }
        : {}),
      ...(patch.location !== undefined ? { location: patch.location?.slice(0, 200) } : {}),
    }),
  remove: (uid: string, id: string) => deleteUserDoc(uid, 'schedule', id),
};

export const fsHabits = {
  create: (uid: string, item: HabitItem) =>
    createUserDoc(uid, 'habits', item.id, {
      name: item.name.slice(0, 160),
      category: item.category.slice(0, 60),
      targetDaysPerWeek: item.targetDaysPerWeek,
      completedDays: item.completedDays,
      completedDates: (item.completedDates ?? []).slice(-400),
    }),
  update: (uid: string, id: string, patch: Partial<HabitItem>) =>
    updateUserDoc(uid, 'habits', id, {
      ...(patch.name !== undefined ? { name: patch.name.slice(0, 160) } : {}),
      ...(patch.category !== undefined ? { category: patch.category.slice(0, 60) } : {}),
      ...(patch.targetDaysPerWeek !== undefined ? { targetDaysPerWeek: patch.targetDaysPerWeek } : {}),
      ...(patch.completedDays !== undefined ? { completedDays: patch.completedDays } : {}),
      ...(patch.completedDates !== undefined
        ? { completedDates: patch.completedDates.slice(-400) }
        : {}),
    }),
  remove: (uid: string, id: string) => deleteUserDoc(uid, 'habits', id),
};

export const fsFocus = {
  create: (uid: string, item: FocusSession) =>
    createUserDoc(
      uid,
      'focusSessions',
      item.id,
      {
        label: item.label.slice(0, 200),
        minutes: item.minutes,
        dateKey: item.dateKey.slice(0, 20),
        completedAt: item.completedAt.slice(0, 64),
      },
      false
    ),
};

export const fsNotes = {
  create: (uid: string, item: NoteItem) =>
    createUserDoc(uid, 'notes', item.id, {
      title: item.title.slice(0, 300),
      category: item.category.slice(0, 80),
      content: item.content.slice(0, 50000),
    }),
  update: (uid: string, id: string, patch: Partial<NoteItem>) =>
    updateUserDoc(uid, 'notes', id, {
      ...(patch.title !== undefined ? { title: patch.title.slice(0, 300) } : {}),
      ...(patch.category !== undefined ? { category: patch.category.slice(0, 80) } : {}),
      ...(patch.content !== undefined ? { content: patch.content.slice(0, 50000) } : {}),
    }),
  remove: (uid: string, id: string) => deleteUserDoc(uid, 'notes', id),
};

// Typed helpers for Journal Intelligence, People, Commitments, Timeline, Vault
export const fsJournal = {
  upsertEntry: async (uid: string, entry: JournalEntrySummary, existsAlready: boolean) => {
    if (existsAlready) {
      await updateUserDoc(uid, 'journalEntries', entry.id, {
        heading: entry.heading.slice(0, 300),
        contentHash: entry.contentHash.slice(0, 128),
        summary: entry.summary.slice(0, 4000),
        themes: entry.themes.slice(0, 12),
        mentionedPeople: entry.mentionedPeople.slice(0, 30),
        entrySnippet: entry.entrySnippet?.slice(0, 800),
        syncedAt: entry.syncedAt.slice(0, 64),
      });
    } else {
      await createUserDoc(uid, 'journalEntries', entry.id, {
        docId: entry.docId.slice(0, 200),
        docUrl: entry.docUrl?.slice(0, 500),
        entryDate: entry.entryDate.slice(0, 30),
        heading: entry.heading.slice(0, 300),
        contentHash: entry.contentHash.slice(0, 128),
        summary: entry.summary.slice(0, 4000),
        themes: entry.themes.slice(0, 12),
        mentionedPeople: entry.mentionedPeople.slice(0, 30),
        entrySnippet: entry.entrySnippet?.slice(0, 800),
        syncedAt: entry.syncedAt.slice(0, 64),
      });
    }
  },
};

export const fsReviewSuggestions = {
  create: (uid: string, item: ReviewSuggestion) =>
    createUserDoc(uid, 'reviewSuggestions', item.id, {
      kind: item.kind,
      status: item.status,
      title: item.title.slice(0, 300),
      proposedValue: item.proposedValue.slice(0, 1000),
      amount: typeof item.amount === 'number' ? item.amount : undefined,
      currency: item.currency?.slice(0, 12),
      category: item.category?.slice(0, 80),
      entryDate: item.entryDate.slice(0, 30),
      sourceEntryId: item.sourceEntryId?.slice(0, 128),
      excerpt: item.excerpt.slice(0, 800),
      fingerprint: item.fingerprint.slice(0, 160),
    }),
  update: (uid: string, id: string, patch: Partial<ReviewSuggestion>) =>
    updateUserDoc(uid, 'reviewSuggestions', id, patch as Record<string, unknown>),
};

export const fsActivityLogs = {
  create: (uid: string, item: ActivityLog) =>
    createUserDoc(uid, 'activityLogs', item.id, {
      kind: item.kind,
      entryDate: item.entryDate.slice(0, 30),
      title: item.title.slice(0, 300),
      value: item.value.slice(0, 1000),
      amount: typeof item.amount === 'number' ? item.amount : undefined,
      currency: item.currency?.slice(0, 12),
      category: item.category?.slice(0, 80),
      notes: item.notes?.slice(0, 1000),
      excerpt: item.excerpt?.slice(0, 800),
      sourceEntryId: item.sourceEntryId?.slice(0, 128),
      fingerprint: item.fingerprint?.slice(0, 160),
    }),
  update: (uid: string, id: string, patch: Partial<ActivityLog>) =>
    updateUserDoc(uid, 'activityLogs', id, patch as Record<string, unknown>),
  remove: (uid: string, id: string) => deleteUserDoc(uid, 'activityLogs', id),
};

export const fsPeople = {
  create: (uid: string, item: PersonProfile) =>
    createUserDoc(uid, 'people', item.id, {
      name: item.name.slice(0, 160),
      aliases: item.aliases.slice(0, 20),
      birthday: item.birthday?.slice(0, 40),
      relationship: item.relationship?.slice(0, 200),
      lastMentionedDate: item.lastMentionedDate?.slice(0, 30),
      mentionCount: item.mentionCount,
      memories: item.memories.slice(0, 40),
      notes: item.notes?.slice(0, 5000),
      sourceEntryIds: item.sourceEntryIds.slice(0, 100),
    }),
  update: (uid: string, id: string, patch: Partial<PersonProfile>) =>
    updateUserDoc(uid, 'people', id, patch as Record<string, unknown>),
  remove: (uid: string, id: string) => deleteUserDoc(uid, 'people', id),
  merge: async (uid: string, target: PersonProfile, duplicate: PersonProfile) => {
    const mergedAliases = Array.from(
      new Set([
        ...target.aliases,
        duplicate.name,
        ...duplicate.aliases,
      ].filter((a) => a && a.toLowerCase() !== target.name.toLowerCase()))
    ).slice(0, 20);

    const mergedMemories = Array.from(
      new Set([...target.memories, ...duplicate.memories])
    ).slice(0, 40);

    const mergedEntryIds = Array.from(
      new Set([...target.sourceEntryIds, ...duplicate.sourceEntryIds])
    ).slice(0, 100);

    const mergedNotes = [target.notes, duplicate.notes]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 5000);

    const latestDate =
      (target.lastMentionedDate || '') >= (duplicate.lastMentionedDate || '')
        ? target.lastMentionedDate
        : duplicate.lastMentionedDate;

    await updateUserDoc(uid, 'people', target.id, {
      aliases: mergedAliases,
      birthday: target.birthday || duplicate.birthday,
      relationship: target.relationship || duplicate.relationship,
      lastMentionedDate: latestDate,
      mentionCount: Math.max(target.mentionCount, mergedEntryIds.length),
      memories: mergedMemories,
      notes: mergedNotes || undefined,
      sourceEntryIds: mergedEntryIds,
    });
    await deleteUserDoc(uid, 'people', duplicate.id);
  },
};

export const fsPeopleSuggestions = {
  create: (uid: string, item: PersonSuggestion) =>
    createUserDoc(uid, 'peopleSuggestions', item.id, {
      name: item.name.slice(0, 160),
      relationship: item.relationship?.slice(0, 200),
      birthday: item.birthday?.slice(0, 40),
      memory: item.memory?.slice(0, 500),
      excerpt: item.excerpt.slice(0, 800),
      entryDate: item.entryDate.slice(0, 30),
      sourceEntryId: item.sourceEntryId?.slice(0, 128),
      status: item.status,
      fingerprint: item.fingerprint.slice(0, 160),
    }),
  update: (uid: string, id: string, patch: Partial<PersonSuggestion>) =>
    updateUserDoc(uid, 'peopleSuggestions', id, patch as Record<string, unknown>),
};

export const fsCommitments = {
  create: (uid: string, item: CommitmentItem) =>
    createUserDoc(uid, 'commitments', item.id, {
      title: item.title.slice(0, 300),
      originalStatement: item.originalStatement?.slice(0, 800),
      context: item.context?.slice(0, 800),
      dateMentioned: item.dateMentioned.slice(0, 30),
      dueDate: item.dueDate?.slice(0, 30),
      status: item.status,
      sourceEntryId: item.sourceEntryId?.slice(0, 128),
      fingerprint: item.fingerprint.slice(0, 160),
    }),
  update: (uid: string, id: string, patch: Partial<CommitmentItem>) =>
    updateUserDoc(uid, 'commitments', id, patch as Record<string, unknown>),
  remove: (uid: string, id: string) => deleteUserDoc(uid, 'commitments', id),
};

export const fsTimeline = {
  create: (uid: string, item: TimelineEvent) =>
    createUserDoc(uid, 'timelineEvents', item.id, {
      title: item.title.slice(0, 240),
      description: item.description.slice(0, 2000),
      eventDate: item.eventDate.slice(0, 30),
      category: item.category?.slice(0, 80),
      excerpt: item.excerpt?.slice(0, 800),
      sourceEntryId: item.sourceEntryId?.slice(0, 128),
      docUrl: item.docUrl?.slice(0, 500),
      status: item.status,
      fingerprint: item.fingerprint.slice(0, 160),
    }),
  update: (uid: string, id: string, patch: Partial<TimelineEvent>) =>
    updateUserDoc(uid, 'timelineEvents', id, patch as Record<string, unknown>),
  remove: (uid: string, id: string) => deleteUserDoc(uid, 'timelineEvents', id),
};

export const fsVault = {
  create: (uid: string, item: VaultItem) =>
    createUserDoc(uid, 'vaultItems', item.id, {
      kind: item.kind,
      title: item.title.slice(0, 300),
      description: item.description?.slice(0, 4000),
      url: item.url?.slice(0, 1000),
      artist: item.artist?.slice(0, 200),
      dateAdded: item.dateAdded.slice(0, 30),
      tags: item.tags.slice(0, 12),
      personId: item.personId?.slice(0, 128),
      personName: item.personName?.slice(0, 160),
      timelineEventId: item.timelineEventId?.slice(0, 128),
      timelineEventTitle: item.timelineEventTitle?.slice(0, 240),
      sourceEntryId: item.sourceEntryId?.slice(0, 128),
    }),
  update: (uid: string, id: string, patch: Partial<VaultItem>) =>
    updateUserDoc(uid, 'vaultItems', id, patch as Record<string, unknown>),
  remove: (uid: string, id: string) => deleteUserDoc(uid, 'vaultItems', id),
};

export async function deleteAllJournalIntelligenceData(uid: string): Promise<void> {
  const firestore = getDb();
  const collections = [
    'journalEntries',
    'reviewSuggestions',
    'activityLogs',
    'peopleSuggestions',
    'commitments',
    'timelineEvents',
  ];

  for (const colName of collections) {
    const path = `users/${uid}/${colName}`;
    try {
      const q = query(collection(firestore, 'users', uid, colName), where('ownerId', '==', uid));
      const snap = await getDocs(q);
      if (snap.empty) continue;
      const batch = writeBatch(firestore);
      for (const d of snap.docs) {
        batch.delete(d.ref);
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  await updateUserJournalConfig(uid, {
    lastProcessedEntryDate: '',
    lastProcessedEntryHash: '',
    lastSyncedAt: '',
    lastSyncError: '',
  });
}
