const express = require('express');
const session = require('express-session');
const passport = require('./config/passport');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();  // Завантаження змінних середовища

const app = express();

app.use(cors());
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,  // Використання секретного ключа з .env
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

module.exports = app;
