'use strict';
const readlineSync = require('readline-sync');
const sqlite3 = require('sqlite3').verbose();
const Rock = require('./rockyou.js');
const bcrypt = require('bcrypt');
const saltRounds = 10;

Rock.getRockyou();

const db = new sqlite3.Database('./test.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the test.db database.');
    }
});

db.run(`CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid TEXT NOT NULL,
    password TEXT NOT NULL
)`, (err) => {
    if (err) {
        console.error('Error creating table:', err.message);
    } else {
        console.log('Table "user" is ready.');

        askUser();
    }
});

function askUser() {
    const userId = readlineSync.question('User ID: ');
    const password = readlineSync.question('Password: ', { hideEchoBack: true });

    if (Rock.rockyou.includes(password)) {
        console.log('Not good enough, try again');
        db.close();
    } else {
        console.log('You chose wisely!');

        // Indsæt bruger i databasen, efter vi bcypter passwordet
        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) {
                console.error('Error hashing password:', err.message);
            } else {
                const stmt = db.prepare('INSERT INTO user (userid, password) VALUES (?, ?)');
                stmt.run(userId, hash, function (err) {
                    if (err) {
                        console.error('Error inserting data:', err.message);
                    } else {
                        console.log('User successfully stored in the database.');
                    }
                    stmt.finalize();

                    // Luk databasen
                    db.close((err) => {
                        if (err) {
                            console.error('Error closing database:', err.message);
                        } else {
                            console.log('Database connection closed.');
                        }
                    });
                });
            }
        });
    }
}
