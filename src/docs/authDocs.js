/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     RegisterUserRequest:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           example: Jane Reader
 *         email:
 *           type: string
 *           format: email
 *           example: jane@example.com
 *         password:
 *           type: string
 *           minLength: 8
 *           format: password
 *       description: Public registration always creates a regular user. The role property is not accepted.
 *     LoginRequest:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: jane@example.com
 *         password:
 *           type: string
 *           minLength: 8
 *           format: password
 *     AuthenticatedUser:
 *       type: object
 *       required:
 *         - _id
 *         - name
 *         - email
 *         - role
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         _id:
 *           type: string
 *           example: 673abc123456789012345678
 *         name:
 *           type: string
 *           example: Jane Reader
 *         email:
 *           type: string
 *           format: email
 *           example: jane@example.com
 *         role:
 *           type: string
 *           enum: [user, admin]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     AuthTokenResponse:
 *       type: object
 *       required:
 *         - success
 *         - accessToken
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         accessToken:
 *           type: string
 *           description: Short-lived bearer access token. The refresh token is only sent as an HttpOnly cookie.
 *         user:
 *           $ref: '#/components/schemas/AuthenticatedUser'
 *   responses:
 *     Unauthorized:
 *       description: Authentication failed or the refresh token is invalid, expired, revoked, or replayed.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Forbidden:
 *       description: The authenticated user does not have permission for this operation.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a regular user
 *     description: Creates a public user account. Administrator accounts must be provisioned privately with scripts/seedAdmin.js; public registration rejects unknown fields such as role.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUserRequest'
 *     responses:
 *       201:
 *         description: User registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, user]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/AuthenticatedUser'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: The email address is already registered.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * /api/auth/login:
 *   post:
 *     summary: Log in
 *     description: Returns a short-lived access token and sets the refresh token in an HttpOnly cookie scoped to /api/auth.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login succeeded.
 *         headers:
 *           Set-Cookie:
 *             description: HttpOnly refreshToken cookie; Secure in production, SameSite=Lax, Path=/api/auth, and expires after seven days.
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/AuthTokenResponse'
 *                 - type: object
 *                   required: [user]
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/AuthenticatedUser'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * /api/auth/refresh:
 *   post:
 *     summary: Rotate a refresh token
 *     description: Accepts the refreshToken cookie, consumes it, and returns a new access token and refresh cookie. Reuse of a rotated token revokes active refresh tokens in that token family only; other login sessions remain valid.
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: cookie
 *         name: refreshToken
 *         required: true
 *         schema:
 *           type: string
 *         description: HttpOnly cookie set by login or the previous refresh.
 *     responses:
 *       200:
 *         description: Tokens rotated successfully.
 *         headers:
 *           Set-Cookie:
 *             description: New HttpOnly refreshToken cookie with the same scope and security attributes as login.
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokenResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * /api/auth/logout:
 *   post:
 *     summary: Log out and revoke the refresh session
 *     description: Requires an access token. Send the current refreshToken cookie to revoke that refresh session; the cookie is cleared whether or not it is present. Other login sessions are unaffected.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: cookie
 *         name: refreshToken
 *         required: false
 *         schema:
 *           type: string
 *         description: Send the cookie to revoke the current refresh session. The response clears it whether or not it is present.
 *     responses:
 *       200:
 *         description: Logout succeeded and the refresh cookie was cleared.
 *         headers:
 *           Set-Cookie:
 *             description: Expired refreshToken cookie scoped to /api/auth.
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
