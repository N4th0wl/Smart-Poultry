const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Token tidak diberikan' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            id: decoded.id,
            kodeUser: decoded.kodeUser,
            email: decoded.email,
            nama: decoded.nama,
            role: decoded.role,
            idProcessor: decoded.idProcessor || null,
        };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token tidak valid atau sudah kadaluarsa' });
    }
};

const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Akses ditolak. Hanya admin yang dapat mengakses.' });
    }
    next();
};

module.exports = { authMiddleware, adminOnly };
