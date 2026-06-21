import jwt from "jsonwebtoken";

export function auth(req, res, next) {

    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({
            message: "Token missing"
        });
    }

    try {

        const decoded = jwt.verify(
            token,
            "secret123"
        );

        req.userId = decoded.userId;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid token"
        });

    }
}