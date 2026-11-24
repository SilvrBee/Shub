/**
 * Payload-First Security Rule Verification Spec
 * Maps each of the 12 adversarial payloads from security_spec.md
 * to the exact Firestore security rule assertions on users/{uid}.
 */

export interface SecurityTestCase {
  name: string;
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  emailVerified: boolean;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED' | 'ALLOW';
}

export const DIRTY_DOZEN_CASES: SecurityTestCase[] = [
  {
    name: '1. Unauthenticated read on user profile',
    path: 'users/userA',
    operation: 'get',
    authUid: null,
    emailVerified: false,
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '2. Cross-user read on journal entries',
    path: 'users/userA/journalEntries/entry-1',
    operation: 'get',
    authUid: 'userB',
    emailVerified: true,
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '3. Unverified email write on tasks',
    path: 'users/userA/tasks/task-1',
    operation: 'create',
    authUid: 'userA',
    emailVerified: false,
    payload: { ownerId: 'userA', title: 'Test', category: 'Work', priority: 'Low', dueDate: '2026-11-24', completed: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. Owner UID spoofing on create',
    path: 'users/userA/tasks/task-1',
    operation: 'create',
    authUid: 'userA',
    emailVerified: true,
    payload: { ownerId: 'userB', title: 'Spoof', category: 'Work', priority: 'Low', dueDate: '2026-11-24', completed: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Shadow field injection on create',
    path: 'users/userA/vaultItems/v-1',
    operation: 'create',
    authUid: 'userA',
    emailVerified: true,
    payload: { ownerId: 'userA', kind: 'quote', title: 'Quote', dateAdded: '2026-11-24', tags: [], isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Immutable ownerId mutation on update',
    path: 'users/userA/people/p-1',
    operation: 'update',
    authUid: 'userA',
    emailVerified: true,
    payload: { ownerId: 'userB' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. Path ID poisoning (>128 chars)',
    path: `users/userA/notes/${'a'.repeat(150)}`,
    operation: 'create',
    authUid: 'userA',
    emailVerified: true,
    payload: { ownerId: 'userA', title: 'Note', category: 'General', content: 'Body' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '8. Oversized summary string (>4000 chars)',
    path: 'users/userA/journalEntries/e-1',
    operation: 'create',
    authUid: 'userA',
    emailVerified: true,
    payload: { ownerId: 'userA', docId: 'd1', entryDate: '2026-11-24', heading: 'Today', contentHash: 'h1', summary: 'x'.repeat(5000), themes: [], mentionedPeople: [], syncedAt: '2026-11-24T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '9. Unbounded array (>12 tags)',
    path: 'users/userA/vaultItems/v-2',
    operation: 'create',
    authUid: 'userA',
    emailVerified: true,
    payload: { ownerId: 'userA', kind: 'note', title: 'Tags', dateAdded: '2026-11-24', tags: Array.from({ length: 20 }, (_, i) => `t${i}`) },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Array element type poisoning',
    path: 'users/userA/vaultItems/v-3',
    operation: 'create',
    authUid: 'userA',
    emailVerified: true,
    payload: { ownerId: 'userA', kind: 'note', title: 'Bad Tag', dateAdded: '2026-11-24', tags: [12345] },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. Client-forged createdAt timestamp',
    path: 'users/userA/commitments/c-1',
    operation: 'create',
    authUid: 'userA',
    emailVerified: true,
    payload: { ownerId: 'userA', title: 'Call Mom', dateMentioned: '2026-11-24', status: 'pending', fingerprint: 'fp1', createdAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Invalid status enum value',
    path: 'users/userA/reviewSuggestions/s-1',
    operation: 'create',
    authUid: 'userA',
    emailVerified: true,
    payload: { ownerId: 'userA', kind: 'sleep', status: 'hacked', title: 'Sleep', proposedValue: '7h', entryDate: '2026-11-24', excerpt: 'slept', fingerprint: 'fp2' },
    expected: 'PERMISSION_DENIED',
  },
];
