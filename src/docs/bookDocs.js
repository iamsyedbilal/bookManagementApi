/**
 * @openapi
 * /api/books:
 *   get:
 *     summary: Fetch all books
 *     description: Retrieves books with pagination support.
 *     tags:
 *       - Books
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number to retrieve.
 *         example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of books per page. Maximum allowed is 100.
 *         example: 10
 *     responses:
 *       200:
 *         description: Books retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedBooksResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/books/{id}:
 *   get:
 *     summary: Fetch a book by ID
 *     description: Retrieves a single book using its MongoDB ObjectId.
 *     tags:
 *       - Books
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the book.
 *     responses:
 *       200:
 *         description: Book retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 *   patch:
 *     summary: Update a book
 *     description: Updates specific fields of an existing book.
 *     tags:
 *       - Books
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the book.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBook'
 *     responses:
 *       200:
 *         description: Book updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 *   delete:
 *     summary: Delete a book
 *     description: Permanently deletes a book from the database.
 *     tags:
 *       - Books
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the book.
 *     responses:
 *       200:
 *         description: Book deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Book deleted successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * /api/books/create:
 *   post:
 *     summary: Create a new book
 *     description: Validates and creates a new book.
 *     tags:
 *       - Books
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBook'
 *     responses:
 *       201:
 *         description: Book created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * components:
 *   responses:
 *     BadRequest:
 *       description: The request contains invalid data or an invalid ID.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 *     NotFound:
 *       description: The requested book was not found.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 *     InternalServerError:
 *       description: An unexpected server error occurred.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       required:
 *         - success
 *         - statusCode
 *         - message
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         statusCode:
 *           type: integer
 *           example: 400
 *         message:
 *           type: string
 *           example: Invalid ID format
 *
 *     Pagination:
 *       type: object
 *       required:
 *         - totalRecords
 *         - totalPages
 *         - currentPage
 *         - limit
 *       properties:
 *         totalRecords:
 *           type: integer
 *           description: Total number of books matching the query.
 *           example: 43
 *         totalPages:
 *           type: integer
 *           description: Total number of available pages.
 *           example: 5
 *         currentPage:
 *           type: integer
 *           description: Currently requested page.
 *           example: 1
 *         limit:
 *           type: integer
 *           description: Maximum number of books per page.
 *           example: 10
 *
 *     PaginatedBooksResponse:
 *       type: object
 *       required:
 *         - success
 *         - data
 *         - pagination
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Book'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 *
 *     Book:
 *       type: object
 *       required:
 *         - _id
 *         - title
 *         - author
 *         - ISBN
 *         - description
 *         - publicationYear
 *         - genre
 *         - availability
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         _id:
 *           type: string
 *           example: '673abc123456789012345678'
 *         title:
 *           type: string
 *           minLength: 3
 *           example: The Great Gatsby
 *         author:
 *           type: string
 *           minLength: 3
 *           example: F. Scott Fitzgerald
 *         ISBN:
 *           type: string
 *           example: '978-0743273565'
 *         description:
 *           type: string
 *           minLength: 100
 *           maxLength: 500
 *         publicationYear:
 *           type: number
 *           minimum: 1900
 *         genre:
 *           type: string
 *           enum:
 *             - Fiction
 *             - Non-Fiction
 *             - Science Fiction
 *             - Fantasy
 *             - Mystery
 *             - Romance
 *             - Biography
 *             - History
 *             - Self-Help
 *         availability:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CreateBook:
 *       type: object
 *       required:
 *         - title
 *         - author
 *         - ISBN
 *         - description
 *         - publicationYear
 *         - genre
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *           example: The Great Gatsby
 *         author:
 *           type: string
 *           minLength: 3
 *         ISBN:
 *           type: string
 *           example: '978-0743273565'
 *         description:
 *           type: string
 *           minLength: 100
 *           maxLength: 500
 *         publicationYear:
 *           type: number
 *           minimum: 1900
 *         genre:
 *           type: string
 *           enum:
 *             - Fiction
 *             - Non-Fiction
 *             - Science Fiction
 *             - Fantasy
 *             - Mystery
 *             - Romance
 *             - Biography
 *             - History
 *             - Self-Help
 *         availability:
 *           type: boolean
 *           default: true
 *
 *     UpdateBook:
 *       type: object
 *       minProperties: 1
 *       additionalProperties: false
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *         author:
 *           type: string
 *           minLength: 3
 *         ISBN:
 *           type: string
 *         description:
 *           type: string
 *           minLength: 100
 *           maxLength: 500
 *         publicationYear:
 *           type: number
 *           minimum: 1900
 *         genre:
 *           type: string
 *           enum:
 *             - Fiction
 *             - Non-Fiction
 *             - Science Fiction
 *             - Fantasy
 *             - Mystery
 *             - Romance
 *             - Biography
 *             - History
 *             - Self-Help
 *         availability:
 *           type: boolean
 */
