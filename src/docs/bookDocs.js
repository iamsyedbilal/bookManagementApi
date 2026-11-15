/**
 * @openapi
 * /api/books:
 *   get:
 *     summary: Fetch all books
 *     description: Retrieves all books from the database.
 *     tags:
 *       - Books
 *     responses:
 *       200:
 *         description: Books retrieved successfully.
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
 *       400:
 *         description: Invalid book ID.
 *       404:
 *         description: Book not found.
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
 *       400:
 *         description: Invalid ID or request data.
 *       404:
 *         description: Book not found.
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
 *       400:
 *         description: Invalid book ID.
 *       404:
 *         description: Book not found.
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
 *       400:
 *         description: Validation error.
 *
 * components:
 *   schemas:
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
 *           example: The Great Gatsby
 *         author:
 *           type: string
 *           example: F. Scott Fitzgerald
 *         ISBN:
 *           type: string
 *           example: '978-0743273565'
 *         description:
 *           type: string
 *           minLength: 100
 *           maxLength: 500
 *         publicationYear:
 *           type: integer
 *           example: 1925
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
 *           type: integer
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
