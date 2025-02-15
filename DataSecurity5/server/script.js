'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const sha256 = require('sha256');

const app = express();
const port = 3000;
const mitSalt = 'mitHemmeligeSalt';

// Middleware til at parse JSON og URL-encoded data
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Opret forbindelse til databasen
const db = new sqlite3.Database('./test.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the test.db database.');
        db.run(`CREATE TABLE IF NOT EXISTS user256 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userid TEXT UNIQUE,
            password TEXT
        )`);
    }
});

// **Registrer en bruger**
app.post('/register', (req, res) => {
    const { userId, password } = req.body;

    if (!userId || !password) {
        return res.status(400).json({ error: 'Missing userId or password' });
    }

    const hashedPassword = sha256(password + mitSalt);

    db.run('INSERT INTO user256 (userid, password) VALUES (?, ?)', [userId, hashedPassword], function (err) {
        if (err) {
            return res.status(400).json({ error: 'User already exists' });
        }
        res.json({ success: true, message: 'User registered' });
    });
});

// **Login bruger**
app.post('/login', (req, res) => {
    const { userId, password } = req.body;

    if (!userId || !password) {
        return res.status(400).json({ error: 'Missing userId or password' });
    }

    db.get('SELECT id, userid, password FROM user256 WHERE userid = ?', [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        } else if (!row) {
            return res.status(401).json({ error: 'Invalid login' });
        } else {
            const hashedInput = sha256(password + mitSalt);
            if (hashedInput === row.password) {
                res.json({ success: true, message: `Login successful! Welcome ${row.userid}` });
            } else {
                res.status(401).json({ error: 'Invalid login' });
            }
        }
    });
});

// **Vis alle brugere (kun til test)**
app.get('/users', (req, res) => {
    db.all('SELECT id, userid FROM user256', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error retrieving users' });
        }
        res.json(rows);
    });
});

// **Start serveren**
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
