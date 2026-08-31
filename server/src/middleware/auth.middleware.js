import jwt from "jsonwebtoken"

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split('')[1];

    if (!token){
        return res.status(401).json({ message: 'Unauthorized. No token provided.'})
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded;
        next();
    } catch {
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ message: 'Token has expired. Please login again.' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ message: 'Invalid token format.' });
        }
        return res.status(403).json({ message: 'Forbidden - Invalid or expired token' });
        
    }

}

export default authenticateToken;