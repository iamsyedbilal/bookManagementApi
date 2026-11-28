function validateMiddleware(schema, target = 'body') {
    return (req, res, next) => {
        const result = schema.safeParse(req[target]);

        if (!result.success) {
            return res.status(400).json({ error: result.error.issues[0].message });
        }

        if (target === 'query') {
            req.validatedQuery = result.data;
        } else {
            req.body = result.data;
        }

        next();
    };
}

export default validateMiddleware;
