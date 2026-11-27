# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Strict Owner Isolation (`users/{uid}`)**: Every document and subcollection lives strictly under `/users/{uid}`. Only an authenticated user with a verified email (`request.auth.token.email_verified == true`) whose `request.auth.uid == uid` can read, list, create, update, or delete any document under `/users/{uid}`.
2. **Path Variable Hardening**: Every `{uid}` and child document ID `{docId}` on single-document operations (`get`, `create`, `update`, `delete`) must satisfy `^[a-zA-Z0-9_\-]+$` and `.size() <= 128`.
3. **No Ghost / Shadow Fields**: Every `create` verifies `keys().hasAll([...]) && keys().hasOnly([...])`. Every `update` validates `incoming().diff(existing()).affectedKeys().hasOnly([...])` and runs the entity's `isValid[Entity]` helper.
4. **Immutable Ownership & Creation Timestamps**: `ownerId` (or `uid` on `/users/{uid}`) must match `request.auth.uid` on `create` and cannot change on `update`. `createdAt` must equal `request.time` on `create` and remain unchanged on `update`; `updatedAt` must equal `request.time`.
5. **Bounded Strings & Arrays**: Every string field has an explicit `.size()` upper bound and every array has a `.size() <= MAX` bound with element-type checks.

## 2. "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated read on `/users/userA`**: `request.auth == null` -> `PERMISSION_DENIED`.
2. **Cross-user read on `/users/userA/journalEntries/entry1` by `userB`**: `request.auth.uid != 'userA'` -> `PERMISSION_DENIED`.
3. **Unverified email write on `/users/userA/tasks/t1`**: `email_verified == false` -> `PERMISSION_DENIED`.
4. **UID spoofing on create (`/users/userA/tasks/t1` with `ownerId: 'userB'`)**: `ownerId != request.auth.uid` -> `PERMISSION_DENIED`.
5. **Shadow field injection on create (`/users/userA/vaultItems/v1` with extra `isAdmin: true`)**: fails `keys().hasOnly(...)` -> `PERMISSION_DENIED`.
6. **Shadow field injection on update (`/users/userA/people/p1` updating `ownerId`)**: fails `affectedKeys().hasOnly(...)` and `ownerId == existing().ownerId` -> `PERMISSION_DENIED`.
7. **ID poisoning (`/users/userA/notes/` with 200-char ID or invalid characters)**: fails `isValidId()` -> `PERMISSION_DENIED`.
8. **Resource exhaustion (1MB string in `JournalEntrySummary.summary`)**: fails `summary.size() <= 4000` -> `PERMISSION_DENIED`.
9. **Unbounded array (30 tags in `VaultItem.tags`)**: fails `tags.size() <= 12` -> `PERMISSION_DENIED`.
10. **Array element type poisoning (`VaultItem.tags: [123]`)**: fails `tags[0] is string` -> `PERMISSION_DENIED`.
11. **Backdated `createdAt` spoofing (`createdAt` != `request.time`)**: fails `createdAt == request.time` -> `PERMISSION_DENIED`.
12. **Invalid enum state (`ReviewSuggestion.status: 'hacked'`)**: fails enum allowlist check -> `PERMISSION_DENIED`.
13. **Invalid mood date key or out-of-range rating (`/users/userA/moodRatings/bad-date` or `rating: 11`)**: fails `isValidDateKey` and integer `[1..10]` bounds -> `PERMISSION_DENIED`.
14. **Cross-user write or shadow field on `lifeChapters` / `lifeProfiles`**: fails `isOwner(uid)` and strict `keys().hasOnly(...)` / `affectedKeys().hasOnly(...)` -> `PERMISSION_DENIED`.
15. **Invalid countdown icon, bad date, or cross-user write on `countdowns`**: fails `isOwner(uid)`, `isValidDateKey(targetDate)`, and curated `icon` enum -> `PERMISSION_DENIED`.
16. **Out-of-range `studyWeeklyGoalHours`, oversized `categoryAreaMap`, or shadow field on `areaSettings`**: fails `isOwner(uid)`, `[1..80]` integer bounds, and `keys().hasOnly(...)` -> `PERMISSION_DENIED`.

