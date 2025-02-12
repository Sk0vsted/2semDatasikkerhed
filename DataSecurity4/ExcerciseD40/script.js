'use strict';
const readlineSync = require('readline-sync');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const Rock = require('./rockyou.js');
const saltRounds = 10;

Rock.getRockyou();

const db = new sqlite3.Database('./test.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the test.db database.');
    }
});

db.serialize(() => {
    console.log('Database is ready.');
    mainMenu();
});

function mainMenu() {
    console.log("\n1: Register\n2: Login\n3: Show all users\n4: Exit");
    const choice = readlineSync.question("Choose an option: ");

    if (choice === '1') {
        registerUser();
    } else if (choice === '2') {
        loginUser();
    } else if (choice === '3') {
        showAllUsers();
    } else {
        db.close();
        console.log("Goodbye!");
    }
}

function registerUser() {
    const userId = readlineSync.question('User ID: ');
    const password = readlineSync.question('Password: ', { hideEchoBack: true });

    if (Rock.rockyou.includes(password)) {
        console.log('Not good enough, try again');
        mainMenu();
    } else {
        console.log('You chose wisely!');

        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) {
                console.error('Error hashing password:', err.message);
            } else {
                const stmt = db.prepare('INSERT INTO user (userid, password) VALUES (?, ?)');
                stmt.run(userId, hash, function (err) {
                    if (err) {
                        console.error('Error inserting data:', err.message);
                    } else {
                        console.log('User successfully registered.');
                    }
                    stmt.finalize();
                    mainMenu();
                });
            }
        });
    }
}

function loginUser() {
    const userId = readlineSync.question('User ID: ');
    const password = readlineSync.question('Password: ', { hideEchoBack: true });

    db.get('SELECT id, userid, password FROM user WHERE userid = ?', [userId], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
        } else if (!row) {
            console.log('Error: Invalid login.');
            mainMenu();
        } else {
            bcrypt.compare(password, row.password, (err, result) => {
                if (result) {
                    console.log(`Login successful! ID: ${row.id}, User ID: ${row.userid}`);
                } else {
                    console.log('Error: Invalid login.');
                }
                mainMenu();
            });
        }
    });
}

function showAllUsers() {
    db.all('SELECT id, userid, password FROM user', [], (err, rows) => {
        if (err) {
            console.error('Error retrieving users:', err.message);
        } else if (rows.length === 0) {
            console.log('No users found.');
        } else {
            console.log("\nRegistered Users:");
            rows.forEach((row) => {
                console.log(`ID: ${row.id}, User ID: ${row.userid}, User Password: ${row.password}`);
            });
        }
        mainMenu();
    });
}
