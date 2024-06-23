const bcrypt = require('bcrypt');
const pool = require('../models/db');

exports.getProfile = async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query('SELECT username, email, phone_number AS "phoneNumber" FROM users WHERE id = $1', [userId]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};

exports.updateProfile = async (req, res) => {
    const userId = req.user.id;
    const { username, email, phoneNumber } = req.body;

    try {
        await pool.query(
            'UPDATE users SET username = $1, email = $2, phone_number = $3 WHERE id = $4',
            [username, email, phoneNumber, userId]
        );
        res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};

exports.changePassword = async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    try {
        const result = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};
