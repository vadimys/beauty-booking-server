const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const pool = require('../models/db');
require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value;
    const username = profile.displayName;

    try {
        let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        let user;

        if (userResult.rows.length === 0) {
            const insertResult = await pool.query(
                'INSERT INTO users (username, email, google_id, user_type) VALUES ($1, $2, $3, $4) RETURNING *',
                [username, email, profile.id, 'CLIENT']  // Припускаючи, що нові користувачі реєструються як 'CLIENT'
            );
            user = insertResult.rows[0];
        } else {
            user = userResult.rows[0];
        }

        done(null, user);
    } catch (err) {
        done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, userResult.rows[0]);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
