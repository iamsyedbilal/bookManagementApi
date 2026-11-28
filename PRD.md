# Book Management API — Product Requirements Document

**Version:** 2.0  
**Status:** Active development  
**Repository:** https://github.com/iamsyedbilal/bookManagementApi  
**Runtime:** Node.js · JavaScript (ES Modules)  
**Framework:** Express 5  
**Database:** MongoDB · Mongoose

---

## 1. Purpose

Build a secure, maintainable REST API for managing a catalogue of books. The project is both a usable backend service and a learning project: each feature must be implemented, tested, documented, and understood.

This PRD is the source of truth for the agreed project scope. Implementation decisions or scope changes must be recorded here so we do not repeatedly rediscover requirements during reviews.

## 2. Product goals

- Provide authentication and role-based authorization.
- Allow authorized administrators to manage books.
- Allow authenticated users to browse and discover books.
- Support search, filtering, sorting, and **cursor-based pagination**.
- Keep HTTP handling, business logic, persistence, validation, and shared middleware clearly separated.
- Provide consistent errors and predictable API responses.
- Verify behavior with unit, integration, and end-to-end API tests where appropriate.
- Document setup, environment configuration, endpoints, and examples.
- Review database query plans and indexes against actual query patterns.

## 3. User roles and permissions

### Administrator

- Register/login like other users (subject to the registration policy below).
- Read the book catalogue and individual book details.
- Create books.
- Update books.
- Delete books.

### Regular user

- Register, log in, refresh a session, and log out.
- Read the book catalogue and individual book details.
- Search, filter, sort, and paginate the catalogue.
- Cannot create, update, or delete books.

Authorization must be enforced on the server for every protected write operation. Hiding UI controls is not an authorization mechanism.

### Administrator provisioning policy

The project must define how the first administrator is created and how later users can or cannot become administrators. Do not allow a public registration request to assign an arbitrary privileged role. The chosen provisioning method must be documented and tested before release.

**Chosen policy:** Public registration creates regular users only and rejects unknown fields, including `role`. An operator provisions the initial or additional administrator by setting `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` and running `scripts/seedAdmin.js`. This path is not exposed as an API endpoint.

## 4. Functional requirements

### 4.1 Authentication and sessions

Required capabilities:

- User registration.
- User login using the agreed credential (email and password).
- Password hashing with bcrypt; plaintext passwords must never be stored.
- Short-lived access-token generation and verification.
- Refresh-token generation and rotation.
- Secure refresh-token storage (store a hash, not the raw refresh token).
- Refresh endpoint that validates the presented refresh token and its session state.
- Logout that revokes the relevant refresh-token session.
- Authentication middleware for protected routes.
- Role authorization middleware for administrator-only actions.
- Safe user responses that never expose password hashes, refresh-token hashes, or secrets.

Required failure behavior includes invalid credentials, missing/invalid/expired access tokens, invalid/revoked refresh tokens, and insufficient role permissions.

Cookie transport, token expiry values, refresh-token reuse handling, and multi-device session policy must be made explicit in configuration/documentation and covered by tests. Do not silently assume a policy that has not been agreed.

**Chosen refresh-token policy:** Each successful login starts an independent token family. Rotation consumes the presented token and issues a new refresh token in that family. Reuse of a still-valid rotated token revokes every active refresh token in that family; other login families for the same user remain valid. Logout revokes the refresh token supplied with the authenticated request. Refresh tokens are HttpOnly cookies scoped to `/api/auth`, use `SameSite=Lax`, are `Secure` in production, and expire after seven days. Access tokens expire after 15 minutes.

### 4.2 Book data model

A book contains:

| Field | Requirement |
|---|---|
| `title` | Required, trimmed string |
| `author` | Required, trimmed string |
| `ISBN` | Required unique identifier |
| `description` | Required description with the validation limits defined in the validation schema |
| `publicationYear` | Required valid year; must not be in the future |
| `genre` | Required value from the supported genre list |
| `availability` | Boolean; defaults to `true` when omitted on creation |
| `createdAt` | Automatically maintained creation timestamp |
| `updatedAt` | Automatically maintained update timestamp |

Mongoose timestamps should be enabled. Password/user fields must not be included in book responses unless explicitly required by a future approved feature.

### 4.3 Book management

- Create a book (administrator only).
- List books (authenticated users).
- Retrieve a book by ID (authenticated users).
- Partially update a book (administrator only).
- Delete a book (administrator only).
- Validate IDs and return a not-found response when a valid ID does not exist.
- Enforce ISBN uniqueness and return a consistent client error for duplicate ISBN values.
- Do not allow clients to update immutable/system-managed fields such as `_id`, `createdAt`, or `updatedAt`.

### 4.4 Search

The list endpoint supports partial, case-insensitive search across:

- Book title.
- Author.

Search input must be treated as literal user text. Escape regular-expression metacharacters; do not allow user input to inject arbitrary regular-expression behavior.

### 4.5 Filtering

Supported filters:

- `genre`: case-insensitive exact match.
- `author`: case-insensitive exact match.
- `availability`: `true` or `false`.

Search and filters must be combinable in one request. Invalid, empty, or incorrectly typed query values must be rejected with a clear validation error.

### 4.6 Sorting

Allow sorting only by explicitly approved fields:

- `title`
- `author`
- `genre`
- `availability`
- `createdAt`
- `updatedAt`

Support ascending and descending order using the API's documented query syntax. Reject unknown sort fields and invalid sort directions. Add a deterministic tie-breaker (the MongoDB `_id`) so records with equal sort values have a stable order.

### 4.7 Cursor-based pagination

**Cursor pagination is the agreed pagination strategy. Offset/page-based pagination is not part of the current API contract.**

Requirements:

- The list endpoint accepts a `limit` and an optional opaque `cursor`.
- Default limit: 10.
- Maximum limit: 100.
- Reject zero, negative, non-integer, malformed, or excessive limits.
- The default ordering is newest first using `createdAt` and `_id` as a deterministic compound ordering.
- The cursor represents the last record in the previous page and must be opaque to API clients (Base64URL encoding is acceptable; encoding is not encryption).
- Use a stable continuation predicate that accounts for both the primary sort field and the `_id` tie-breaker.
- Fetch at most `limit + 1` records to determine whether another page exists.
- Return at most `limit` records.
- Return pagination metadata containing `limit`, `hasNextPage`, and `nextCursor` (null when there is no next page).
- Reject malformed or invalid cursors with a client error; do not silently restart at the first page.
- Apply the same search and filter criteria consistently on every page.
- Cursor behavior for non-default sort fields must be explicitly supported and tested, or those combinations must be rejected until implemented. Never return a cursor that cannot correctly continue the selected sort.

The implementation and tests must not mix offset metadata (page, totalPages, skip) with cursor pagination. If an exact total count is not required by the product, do not run an expensive count query solely to preserve the old offset response shape.

### 4.8 Validation

Use Zod for request validation.

- Validate request body and query parameters at the route boundary.
- Trim applicable strings.
- Reject invalid types rather than silently coercing them unless a specific coercion is deliberately documented.
- Reject unknown fields for strict create/update schemas.
- Create schema validates all required fields and defaults.
- Update schema permits partial updates but rejects an empty update.
- Validate IDs and cursor/limit query parameters.
- Return consistent validation errors without leaking internal stack traces.

The validation schema is the source of truth for field limits and allowed enum values; tests and API documentation must agree with it.

### 4.9 Error handling and response format

- A centralized not-found handler handles unknown routes.
- A centralized error handler maps known application, validation, Mongoose, and duplicate-key errors to appropriate HTTP statuses.
- Unexpected errors return a generic 500 response; internal details are logged server-side, not exposed to clients.
- Success and error response shapes must be consistent and documented.
- Do not return stack traces, secrets, password hashes, or raw token hashes in production responses.

## 5. API contract

The following routes are the agreed baseline. The exact response envelope and cookie/header behavior must be documented in Swagger and integration tests.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Health check |
| POST | `/api/auth/register` | Public | Register a user |
| POST | `/api/auth/login` | Public | Authenticate a user |
| POST | `/api/auth/refresh` | Refresh session | Rotate/refresh an access session |
| POST | `/api/auth/logout` | Authenticated session | Revoke the relevant refresh session |
| GET | `/api/books` | Authenticated | List/search/filter/sort/cursor-paginate books |
| GET | `/api/books/:id` | Authenticated | Get one book |
| POST | `/api/books/create` | Administrator | Create a book |
| PATCH | `/api/books/:id` | Administrator | Partially update a book |
| DELETE | `/api/books/:id` | Administrator | Delete a book |
| GET | `/api-docs` | As configured | Swagger UI |
| GET | `/api-docs/json` | As configured | OpenAPI JSON |

No additional endpoint should be treated as required unless it is added to this document.

## 6. Architecture and code organization

Use a clear separation of responsibilities:

- **Routes:** declare endpoints and attach middleware in the correct order.
- **Controllers:** translate HTTP requests into application calls and format HTTP responses. Controllers should remain thin.
- **Services:** contain business/use-case logic, coordinate models and other services, and enforce application-level rules. Services should not depend on Express request/response objects.
- **Models:** define Mongoose schemas, indexes, and persistence-level behavior.
- **Validations:** define Zod schemas for request input.
- **Middlewares:** authentication, authorization, validation, not-found, and error handling.
- **Database/config:** connection setup and environment configuration.
- **Utils:** small shared helpers with a clear purpose; avoid turning this folder into a dumping ground.
- **Tests:** unit and integration tests organized around the behavior under test.
- **Docs:** API documentation and project-level technical notes.

Expected request flow:

`request → route → middleware (auth/role/validation) → controller → service → model/database → service → controller → response`

Not every operation needs an artificial abstraction, but business logic must be moved into a service when it is reusable, non-trivial, or obscures controller responsibilities. The project must use a consistent service-layer convention rather than mixing arbitrary patterns.

## 7. Security requirements

- Keep secrets and credentials in environment variables.
- Commit an `.env.example` containing names and safe placeholders only.
- Ensure `.env`, local database files, coverage output, and `node_modules` are excluded from Git.
- Hash passwords with bcrypt.
- Hash refresh tokens before persistence.
- Never expose password or token hashes in API responses.
- Validate and normalize input.
- Enforce authentication and role permissions server-side.
- Configure CORS using explicit trusted origins when credentials/cookies are used; do not combine wildcard origin with credentialed requests.
- Use secure cookie options appropriate to the deployment environment if refresh tokens are cookie-based.
- Avoid leaking stack traces or sensitive internal errors.
- Apply reasonable request/body limits and security headers as part of the production-readiness review.
- Do not log passwords, raw tokens, or secrets.

## 8. Testing strategy

Use Vitest, Supertest, and mongodb-memory-server.

### Unit tests

- Zod create/update validation boundaries and invalid types.
- Query parsing and cursor encode/decode behavior.
- Search escaping and filter composition.
- Sort allowlist and deterministic tie-breaking.
- Service business rules and expected error cases.
- Error mapping for application and Mongoose errors.

### Integration tests

- Health endpoint.
- Registration success and duplicate/invalid registration.
- Login success and invalid credentials.
- Access-token protected route behavior.
- Missing, malformed, expired, and invalid access-token behavior.
- Refresh success, rotation, invalid token, expired/revoked token, and replay behavior according to the chosen session policy.
- Logout revokes the relevant session; verify that the revoked refresh token cannot be reused.
- Regular users can read books but cannot create/update/delete them.
- Administrators can perform permitted book writes.
- Book create/read/update/delete success and failure cases.
- Duplicate ISBN handling.
- Search, each filter, combined filters, sorting, and invalid query values.
- Cursor first page, next page, final page, empty collection, invalid cursor, invalid limit, and records sharing the same `createdAt` value.
- Error and not-found response behavior.
- Database test setup, cleanup, and teardown.

### Test quality rules

- Tests must be isolated and deterministic.
- Use a dedicated test database; never point tests at the development or production database.
- Clear data between tests where needed.
- Close database connections and other resources after the suite.
- Assert meaningful response bodies and persisted database state, not only status codes.
- Ensure the test suite does not unintentionally include `node_modules` or generated coverage output.
- Run both the normal test command and the one-shot CI command before considering a change complete.

## 9. Database and performance requirements

- Use Mongoose models with explicit validation and timestamps.
- Enforce unique ISBN at the database level and handle duplicate-key errors.
- Add indexes based on actual filters, sorts, and cursor patterns.
- For the default newest-first cursor list, evaluate a compound index compatible with `createdAt` and `_id`.
- Avoid speculative indexes; each index has write and storage costs.
- Use projection/lean reads where appropriate.
- Inspect representative queries with `explain('executionStats')`.
- Review `IXSCAN` versus `COLLSCAN`, keys examined, documents examined, and returned records.
- Do not claim a performance improvement based only on a tiny in-memory dataset.
- Keep index creation/management appropriate for development versus production.

**Index review (2026-11-28):** The unique ISBN and user email indexes enforce required uniqueness. The book `{createdAt: -1, _id: -1}` index matches the default cursor sort and recent-book analytics. The `{title: 1}`, `{author: 1}`, and `{genre: 1, author: 1}` indexes do not reliably support the current case-insensitive regular-expression search/filter predicates; retain them provisionally, but do not claim these queries are indexed without representative execution plans. A spot check against 2,000 synthetic in-memory books used the default sort index (11 keys/documents examined for 11 results); the case-insensitive filter examined all 2,000 documents, while partial search examined 99 to return 11 using the sort index. These synthetic results are diagnostic only and are not performance claims. The refresh-token hash unique index supports token lookup; `{familyId: 1, revokedAt: 1}` supports replay revocation, and the `expiresAt` TTL index removes expired sessions. Revisit the book indexes with representative production-like data before adding composites or removing indexes.

## 10. API documentation and developer experience

- Maintain Swagger/OpenAPI documentation for every public route.
- Document authentication requirements, roles, query parameters, cursor behavior, request schemas, success responses, and error responses.
- Ensure documentation reflects the actual implementation and tests.
- README must explain prerequisites, installation, environment variables, database setup, running the server, running tests, and opening Swagger.
- Provide an `.env.example` without real credentials.
- Include example requests and responses for authentication and book listing, including cursor continuation.

## 11. Operational requirements

- Configuration is loaded and validated at startup.
- The application must fail clearly when required environment variables are missing or invalid.
- Database connection failures must be reported clearly.
- Separate application creation from server startup so tests can import the Express app without opening a production listener.
- Provide development, production start, and test scripts.
- Keep generated files such as coverage reports out of source control.

Deployment to a specific cloud provider is not required in this project scope. Production-readiness checks should still be documented.

## 12. Acceptance criteria

The project is complete when all of the following are true:

- [ ] Registration, login, refresh, and logout work according to the documented session policy.
- [ ] Passwords and refresh tokens are stored securely.
- [ ] Access-token authentication and role authorization work.
- [ ] Public registration cannot grant administrator privileges.
- [ ] Regular users can read books but cannot write them.
- [ ] Administrators can create, update, and delete books.
- [ ] Book schema constraints and unique ISBN behavior are enforced.
- [ ] Search works for title and author and safely treats input as literal text.
- [ ] Genre, author, and availability filters work independently and together.
- [ ] Sorting accepts only supported fields and has deterministic ordering.
- [ ] Cursor pagination follows this PRD; offset/page pagination is not mixed into the contract.
- [ ] Zod validation covers body and query inputs.
- [ ] Error and not-found responses are consistent.
- [ ] Unit and integration tests cover the required success, failure, and authorization cases.
- [ ] Tests are isolated and close their resources.
- [ ] Swagger describes the actual API.
- [ ] README and `.env.example` allow another developer to run the project safely.
- [ ] Database indexes are justified by query patterns and reviewed with execution statistics.
- [ ] No secrets, local environment files, or generated artifacts are committed.
- [ ] The developer can explain the architecture and the important implementation decisions.

### Final acceptance review (2026-11-28)

**Outcome: Partial acceptance; the project is not yet complete against this PRD.** The listed authentication, documentation, environment, CORS/security-header, and index-review work is implemented. Both full test commands passed with 150 tests.

**Verified:** Refresh rotation/replay/logout follow the documented per-login-family policy; public registration rejects privileged role assignment; authentication Swagger docs describe cookies and bearer auth; README and `.env.example` cover local setup; required runtime configuration is validated before database startup; CORS uses exact configured origins with credentials and standard security headers; production dependencies pass `npm audit --omit=dev`.

**Remaining acceptance gaps:**

- Book query parameters are validated by a custom parser rather than Zod, so the Zod body-and-query requirement is not met.
- Business logic remains in controllers; the service-layer convention in Section 6 is not implemented.
- Index execution plans were checked only with synthetic in-memory data. Production-like query statistics are still required before claiming the book indexes are justified or changing them.
- The full dependency audit still reports two moderate advisories in the development-only `nodemon`/`minimatch` dependency chain; no forced downgrade was applied.
- Administrator provisioning is documented and public role escalation is tested, but the seed script's success/idempotence path lacks an automated integration test.

## 13. Explicitly out of scope

Unless separately approved and added to this PRD, this project does not include:

- Frontend application.
- Shopping cart, checkout, or payments.
- Online reading or ebook file hosting.
- Book recommendations or personalization.
- External book catalogue integrations.
- Reviews, ratings, comments, or social features.
- Inventory purchasing or shipping workflows.
- Microservices or distributed infrastructure.
- A production cloud deployment as a mandatory deliverable.

## 14. Definition of done

A task is done only when:

1. Its requirement and expected behavior are clear.
2. The implementation follows the agreed architecture.
3. Validation, authorization, and error cases are handled where relevant.
4. Relevant tests are added or updated and pass.
5. API documentation is updated when the contract changes.
6. The implementation has been reviewed for security and data consistency.
7. The developer can explain the code and the reason for the design.

## 15. Project workflow and change control

- This PRD is the baseline for all future reviews and task assignments.
- Work is delivered in small, prioritized tasks; do not start unrelated features while a higher-priority requirement is incomplete.
- Before changing an agreed design (for example, pagination strategy or token transport), update this PRD and explain the trade-offs.
- A code review must distinguish between: **bug/requirement gap**, **security risk**, **maintainability improvement**, and **optional enhancement**.
- Do not label an intentional, documented design choice as a bug merely because it differs from a previous draft.
- Do not introduce new dependencies or architecture layers without explaining the need and getting agreement.
- At the start of each task, identify the relevant PRD section and acceptance criteria.

---

**Guiding principle:** Build a reliable backend that you understand deeply. Finishing the checklist matters, but being able to explain and maintain the system matters just as much.
