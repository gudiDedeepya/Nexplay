import jwt from "jsonwebtoken";

export function auth(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Token missing"
        });
    }

    const token = authHeader.split(" ")[1];

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