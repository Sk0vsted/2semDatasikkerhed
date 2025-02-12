'use strict';
const readlineSync = require('readline-sync');
const sqlite3 = require('sqlite3').verbose();
const sha256 = require('sha256');
const Rock = require('./rockyou.js');
const mitSalt = 'mitHemmeligeSalt';

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

        const hashedPassword = sha256(password + mitSalt);

        const stmt = db.prepare('INSERT INTO user256 (userid, password) VALUES (?, ?)');
        stmt.run(userId, hashedPassword, function (err) {
            if (err) {
                console.error('Error inserting data:', err.message);
            } else {
                console.log('User successfully registered.');
            }
            stmt.finalize();
            mainMenu();
        });
    }
}


function loginUser() {
    const userId = readlineSync.question('User ID: ');
    const password = readlineSync.question('Password: ', { hideEchoBack: true });

    db.get('SELECT id, userid, password FROM user256 WHERE userid = ?', [userId], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
        } else if (!row) {
            console.log('Error: Invalid login.');
            mainMenu();
        } else {
            const hashedInput = sha256(password + mitSalt);

            if (hashedInput === row.password) {
                console.log(`Login successful! ID: ${row.id}, User ID: ${row.userid}`);
            } else {
                console.log('Error: Invalid login.');
            }
            mainMenu();
        }
    });
}

function showAllUsers() {
    db.all('SELECT id, userid, password FROM user256', [], (err, rows) => {
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
