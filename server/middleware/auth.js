const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'miners-admin-secret-2026'; // fallback only for local dev

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
