const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET
    || (process.env.NODE_ENV === 'production' ? null : 'dev-only-secret');
if (!JWT_SECRET) throw new Error('JWT_SECRET must be set in production');

const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = { verifyAdmin, JWT_SECRET };
