# Book Management REST API

## Product Requirements Document (PRD)

**Version:** 1.0  
**Project:** Book Management REST API  
**Status:** In Development  
**Backend:** Node.js, Express.js, MongoDB, Mongoose  
**Language:** JavaScript (ES Modules)

---

## 1. Project Overview

The Book Management REST API is a backend application designed to manage a collection of books through RESTful endpoints.

It provides secure authentication, role-based access control, book management, filtering, searching, sorting, pagination, and API documentation.

The project aims to demonstrate practical backend engineering skills, including API architecture, database design, authentication, validation, error handling, testing, and performance optimization.

## 2. Project Goals

- Build a structured and maintainable REST API.
- Implement secure user authentication and authorization.
- Provide complete book CRUD functionality.
- Support searching, filtering, sorting, and pagination.
- Validate incoming requests.
- Handle errors consistently.
- Write meaningful automated tests.
- Document the API using Swagger/OpenAPI.
- Understand database performance and indexing.

## 3. User Roles

### Administrator

- Create books.
- Update books.
- Delete books.
- View the book collection.
- Search, filter, sort, and paginate books.

### Regular User

- Register and authenticate.
- View books.
- Search and filter books.
- Sort and paginate results.

Regular users cannot create, update, or delete books.

## 4. Functional Requirements

### 4.1 Authentication

- User registration.
- User login.
- Access token generation.
- Refresh token generation.
- Access token verification.
- Refresh token endpoint.
- User logout.
- Secure password hashing.
- Role-based authorization.

### 4.2 Book Management

Each book contains:

| Field           | Description            |
| --------------- | ---------------------- |
| title           | Book title             |
| author          | Author name            |
| ISBN            | Unique book identifier |
| description     | Book description       |
| publicationYear | Year of publication    |
| genre           | Book category          |
| availability    | Availability status    |
| createdAt       | Creation timestamp     |
| updatedAt       | Last update timestamp  |

Supported operations:

- Create a book.
- Retrieve all books.
- Retrieve a single book.
- Update a book.
- Delete a book.

### 4.3 Search

Users can search books using:

- Title.
- Author.

Search should support partial, case-insensitive matching.

User input must be safely escaped before being used in regular expressions.

### 4.4 Filtering

Supported filters:

- Genre: case-insensitive exact matching.
- Author: case-insensitive exact matching.
- Availability: true or false.

Filters must work together with search.

### 4.5 Sorting

Support ascending and descending sorting.

Supported fields:

- Title.
- Author.
- Genre.
- Availability.
- Created date.
- Updated date.

A deterministic secondary sort should be used to make pagination more consistent.

### 4.6 Pagination

- Default page: 1.
- Default limit: 10.
- Maximum limit: 100.
- Use offset-based pagination.
- Return total records, total pages, current page, and limit.
- Reject invalid pagination values.

### 4.7 Validation

Use Zod to validate incoming request data.

Requirements:

- Required fields must be present.
- String fields must be trimmed.
- Invalid field types must be rejected.
- Unknown fields must be rejected where strict validation is configured.
- Update requests must support partial updates.
- Empty update objects must be rejected.

### 4.8 Error Handling

Implement centralized error handling.

Expected cases:

- Invalid request data.
- Missing authentication.
- Invalid or expired tokens.
- Insufficient permissions.
- Resource not found.
- Database errors.
- Unknown routes.

Use consistent JSON error responses.

## 5. API Endpoints

### Health

- `GET /api/health`

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Books

- `GET /api/books`
- `GET /api/books/:id`
- `POST /api/books/create`
- `PATCH /api/books/:id`
- `DELETE /api/books/:id`

### API Documentation

- `GET /api-docs`
- `GET /api-docs/json`

## 6. Security Requirements

- Hash passwords using bcrypt.
- Use JWT access and refresh tokens.
- Keep secrets in environment variables.
- Protect private endpoints with authentication middleware.
- Restrict write operations to administrators.
- Validate all incoming user input.
- Avoid exposing passwords and sensitive token data in API responses.
- Safely handle user-provided search expressions.

## 7. Technical Requirements

### Backend

- Node.js
- Express.js
- JavaScript ES Modules

### Database

- MongoDB
- Mongoose

### Validation

- Zod

### Authentication

- JSON Web Tokens
- bcrypt

### Testing

- Vitest
- Supertest
- mongodb-memory-server

### Documentation

- Swagger UI
- swagger-jsdoc
- OpenAPI 3.0

## 8. Testing Requirements

Test the following:

- Health endpoint.
- Authentication flows.
- Authorization and role restrictions.
- Book creation.
- Book retrieval.
- Book updates.
- Book deletion.
- Request validation.
- Filtering and searching.
- Sorting.
- Pagination.
- Error handling.
- Database behavior.

Testing should include unit tests and integration tests where appropriate.

## 9. Performance Requirements

- Avoid unnecessary database queries.
- Use lean queries for read-only operations where appropriate.
- Evaluate frequently used query patterns.
- Add database indexes based on actual query requirements.
- Use MongoDB explain plans to inspect query execution.
- Avoid adding indexes without considering write overhead and storage costs.

Indexing decisions must be validated against actual query patterns and execution statistics.

## 10. Acceptance Criteria

The project is considered complete when:

- [ ] Authentication works correctly.
- [ ] Refresh and logout flows work correctly.
- [ ] Role-based authorization works.
- [ ] All book CRUD operations work.
- [ ] Search works correctly.
- [ ] Filtering works correctly.
- [ ] Multiple filters can be combined.
- [ ] Sorting works correctly.
- [ ] Pagination works correctly.
- [ ] Invalid requests return appropriate errors.
- [ ] Automated tests pass.
- [ ] Swagger documentation accurately describes the API.
- [ ] Environment variables and setup instructions are documented.
- [ ] Database performance has been reviewed.
- [ ] README explains setup, features, and API usage.

## 11. Out of Scope

Unless explicitly added later, this project does not include:

- Frontend application.
- Book purchasing or payment processing.
- Online reading or ebook storage.
- Book recommendations.
- External book catalog integrations.
- Social features or reviews.
- Deployment infrastructure.

## 12. Definition of Done

A feature is complete when:

1. Its requirements are understood.
2. Its implementation follows the project architecture.
3. Relevant validation and error handling are included.
4. It works through the API.
5. Appropriate tests pass.
6. Its documentation is updated.
7. The developer can explain how and why it works.

---

**Project principle:** Build the API to understand backend engineering, not merely to make endpoints work.
