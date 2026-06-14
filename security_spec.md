# Security Specification: Personal Blog (Fortress Access Plan)

This security specification details the Attribute-Based Access Control (ABAC) and state integrity guarantees designed for the **Personal Blog** application.

## 1. Data Invariants
- **Identity Invariant (Single Author)**: Only the user authenticated with the email `saravanandhesingu1992@gmail.com` and with `email_verified == true` is permitted to perform any WRITE actions (`create`, `update`, `delete`).
- **Visibility Invariant (Reader Access)**: Unauthenticated or non-author authenticated readers are **STRICTLY BLOCKED** from reading drafts (`published == false`). They have pure read-only (`get`, `list`) access to fully published posts (`published == true`).
- **Immutability Invariant**: The `createdAt` and `authorEmail` fields are terminal and can never be altered on update.
- **Resource Poisoning Preventer**: Any document ID (the `postId`/slug) must match a verified regular expression, guarding against denial-of-service or database bloated attacks.
- **Timestamp Integrity**: `createdAt` and `updatedAt` are strictly bound to `request.time` (server timestamp), preventing clients from spoofing post dates.

---

## 2. The "Dirty Dozen" Malicious Exploits
These 12 JSON payloads list malicious transaction attempts designed to bypass security. Our `firestore.rules` will strictly return `PERMISSION_DENIED` for all of them.

### exploit_01: Identity Spoofing (Impersonating Author)
An anonymous visitor or a user logged with email `hacker@evil.com` attempts to create a published post setting `authorEmail: "saravanandhesingu1992@gmail.com"`.
- **Expected Action**: `create`
- **Verdict**: `PERMISSION_DENIED` (auth.token.email does not match, and write is forbidden)

### exploit_02: Create Post as Anonymous User
An unauthenticated sender attempts of write a dummy post.
- **Expected Action**: `create`
- **Verdict**: `PERMISSION_DENIED` (Missing auth state)

### exploit_03: Draft Leak (Harvesting Drafts)
An unauthenticated or regular authenticated user attempts to perform a listing query or individual fetch on a post with `published: false`.
- **Expected Action**: `get` / `list`
- **Verdict**: `PERMISSION_DENIED` (Cannot read draft without author credentials)

### exploit_04: Author Email Mutation
The author is logged in, but a buggy or hacked frontend UI tries to change `authorEmail` to `co-author@gmail.com` during an update.
- **Expected Action**: `update`
- **Verdict**: `PERMISSION_DENIED` (Changing authorEmail violates field immutability)

### exploit_05: Timeline Manipulation (Spoofing Timestamp)
The author attempts to publish a new post but overrides `createdAt` with a timestamp set in 2030 to list it at the top artificially.
- **Expected Action**: `create`
- **Verdict**: `PERMISSION_DENIED` (createdAt must match request.time)

### exploit_06: ID Poisoning / Bloated Slug
The author attempts to write a post with an ID containing $10\text{KB}$ of random junk characters or illegal paths.
- **Expected Action**: `create`
- **Verdict**: `PERMISSION_DENIED` (Post ID fails `isValidId()` regex + size constraint)

### exploit_07: Key Bloat / Ghost Field Shadow Update
The author or an attacker attempts to update a post, adding an unauthorized `role` or an arbitrary field `"isAdmin": true` to the model.
- **Expected Action**: `update`
- **Verdict**: `PERMISSION_DENIED` (affectedKeys contains keys outside the allowed update schema)

### exploit_08: Read-Time Exhaustion / Overlarge Payload
An authorized user attempts to save a document where `readTime` is set to a $100\text{KB}$ string.
- **Expected Action**: `create`
- **Verdict**: `PERMISSION_DENIED` (Size of string fields must have strict maximum bounds)

### exploit_09: View Counter Inflation Attack
A reader attempts to update the views of a post by sending a custom update payload modifying views but also changing the markdown body or categories.
- **Expected Action**: `update`
- **Verdict**: `PERMISSION_DENIED` (Non-author lacks write access to modify post contents)

### exploit_10: Type Confusion / Field Poisoning
An authorized user tries to upload `tags` as a boolean (`tags: true`) instead of a safe array of strings.
- **Expected Action**: `create`
- **Verdict**: `PERMISSION_DENIED` (Type check validation filters invalid data shapes)

### exploit_11: Delete Post by Random Reader
An authenticated user attempts to delete a post.
- **Expected Action**: `delete`
- **Verdict**: `PERMISSION_DENIED` (Only verified 'saravanandhesingu1992@gmail.com' can delete)

### exploit_12: Direct Database List Query Scraping
A user executes a blanket list query that bypasses UI filters to fetch all drafts.
- **Expected Action**: `list`
- **Verdict**: `PERMISSION_DENIED` (The list rule explicitly enforces `resource.data.published == true` unless signed in as author)
