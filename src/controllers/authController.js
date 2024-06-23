const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../models/db');
const logger = require('../config/logger');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createToken = (user) => {
    return jwt.sign({ userId: user.id, userType: user.user_type }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

exports.register = async (req, res) => {
    const { username, password, emailOrPhone, userType } = req.body;
    if (!username || !password || !emailOrPhone) {
        logger.warn('Registration failed: missing fields');
        return res.status(400).json({ error: 'Username, password, email or phone, and user type are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phonePattern = /^[0-9]{10,15}$/;
        let result;

        if (emailPattern.test(emailOrPhone)) {
            result = await pool.query(
                'INSERT INTO users (username, password, email, user_type) VALUES ($1, $2, $3, $4) RETURNING *',
                [username, hashedPassword, emailOrPhone, userType]
            );
        } else if (phonePattern.test(emailOrPhone)) {
            result = await pool.query(
                'INSERT INTO users (username, password, phone, user_type) VALUES ($1, $2, $3, $4) RETURNING *',
                [username, hashedPassword, emailOrPhone, userType]
            );
        } else {
            logger.warn('Registration failed: invalid email or phone');
            return res.status(400).json({ error: 'Invalid email or phone' });
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('Error during registration:', error);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.login = async (req, res) => {
    const { emailOrPhone, password } = req.body;
    if (!emailOrPhone || !password) {
        logger.warn('Login failed: missing fields');
        return res.status(400).json({ error: 'Email or phone and password are required' });
    }

    try {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phonePattern = /^[0-9]{10,15}$/;
        let result;

        if (emailPattern.test(emailOrPhone)) {
            result = await pool.query('SELECT * FROM users WHERE email = $1', [emailOrPhone]);
        } else if (phonePattern.test(emailOrPhone)) {
            result = await pool.query('SELECT * FROM users WHERE phone = $1', [emailOrPhone]);
        } else {
            logger.warn('Login failed: invalid email or phone');
            return res.status(400).json({ error: 'Invalid email or phone' });
        }

        const user = result.rows[0];

        if (!user) {
            logger.warn('Login failed: invalid email or phone');
            return res.status(400).json({ error: 'Invalid email or phone or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn('Login failed: invalid password');
            return res.status(400).json({ error: 'Invalid email or phone or password' });
        }

        const token = createToken(user);
        res.status(200).json({ token, userType: user.user_type });
    } catch (error) {
        logger.error('Error during login:', error);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.googleLogin = async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const userId = payload['sub'];
        let userResult = await pool.query('SELECT * FROM users WHERE google_id = $1', [userId]);

        if (userResult.rows.length === 0) {
            const insertResult = await pool.query(
                'INSERT INTO users (google_id, email, user_type) VALUES ($1, $2, $3) RETURNING *',
                [userId, payload['email'], 'client']
            );
            userResult = insertResult;
        }

        const user = userResult.rows[0];
        const authToken = createToken(user);
        res.json({ token: authToken, userType: user.user_type });
    } catch (error) {
        logger.error('Google sign-in error:', error);
        res.status(500).json({ error: 'Failed to authenticate with Google' });
    }
};
