const express = require('express');
const router = express.Router();
const sqlite3 = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const authController = require('../controllers/controllers');
require('dotenv').config();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const db = new sqlite3('db/sampleAPI.db');
const gradesDb = new sqlite3('db/upddb.sql');

const secretKey = Buffer.from(process.env.SECRET_CRYPTO, 'hex');
if (secretKey.length !== 32) {
	throw new Error("SECRET_KEY skal være 32 bytes lang!");
}

const JWT_SECRET = process.env.SECRET || 'fakeKey';

function authenticateUser(req, res, next) {
	const token = req.cookies.jwt;
	if (!token) {
		return res.status(401).json({ error: 'Access Denied: No Token Provided!' });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);

		// Fetch user data from `sampleAPI.db`
		const userStmt = db.prepare('SELECT email, admin FROM user WHERE email = ?');
		const user = userStmt.get(decoded.email);

		if (!user) {
			return res.status(401).json({ error: 'Invalid user' });
		}

		req.user = user; // Add user data to request
		next();
	} catch (error) {
		return res.status(400).json({ error: 'Invalid Token' });
	}
}

router.post('/enable-2fa', authenticateUser, async (req, res) => {
	const { email } = req.user;

	const secret = speakeasy.generateSecret({ length: 20 });

	const stmt = db.prepare('UPDATE user SET two_factor_secret = ?, two_factor_enabled = 1 WHERE email = ?');
	stmt.run(secret.base32, email);

	QRCode.toDataURL(secret.otpauth_url, (err, qrCodeUrl) => {
		if (err) {
			return res.status(500).json({ error: 'Failed to generate QR code' });
		}

		res.json({ qrCodeUrl, secret: secret.base32 });
	});
});

router.post('/verify-2fa', authenticateUser, async (req, res) => {
	const { email } = req.user;
	const { token } = req.body;

	const user = db.prepare('SELECT two_factor_secret FROM user WHERE email = ?').get(email);
	if (!user || !user.two_factor_secret) return res.status(400).json({ error: "2FA not set up" });

	const verified = speakeasy.totp.verify({
		secret: user.two_factor_secret,
		encoding: 'base32',
		token,
		window: 1
	});

	if (!verified) return res.status(400).json({ error: "Invalid OTP" });

	// Return updated 2FA status to frontend
	res.json({ message: "2FA Enabled Successfully!", two_factor_enabled: true });
});

router.post('/disable-2fa', authenticateUser, async (req, res) => {
	const { email } = req.user;

	const stmt = db.prepare('UPDATE user SET two_factor_enabled = 0, two_factor_secret = NULL WHERE email = ?');
	stmt.run(email);

	res.json({ message: "2FA disabled successfully!" });
});

router.post('/verify-login-otp', authenticateUser, async (req, res) => {
	const { token } = req.body; // OTP entered by user
	const email = req.user?.email; // Authenticated user

	if (!email) {
		console.log("❌ No user found in request!");
		return res.status(400).json({ error: "User not authenticated" });
	}

	const user = db.prepare('SELECT two_factor_secret FROM user WHERE email = ?').get(email);

	if (!user || !user.two_factor_secret) {
		console.log("❌ 2FA secret not found in DB for:", email);
		return res.status(400).json({ error: "2FA not set up for this user" });
	}

	console.log("🔑 Stored Secret for", email, ":", user.two_factor_secret);
	console.log("📩 Received OTP:", token);

	// Verify the OTP
	const verified = speakeasy.totp.verify({
		secret: user.two_factor_secret,  // The stored secret
		encoding: 'base32',
		token,  // OTP entered by user
		window: 1  // Allow slight time drift
	});

	if (!verified) {
		console.log("❌ OTP verification failed!");
		return res.status(400).json({ error: "Invalid OTP" });
	}

	console.log("✅ OTP verified successfully!");

	// Issue a new JWT upon successful verification
	const authToken = generateToken({ email, admin: req.user.admin });

	res.cookie('jwt', authToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'Strict',
		maxAge: 3600000 // 1 hour
	});

	res.json({ message: "2FA Verified Successfully", redirect: "/users/profile" });
});

router.get('/profile', authenticateUser, (req, res) => {
	console.log("✅ Rendering profile.pug for:", req.user.email);

	// Fetch user data
	const stmt = db.prepare('SELECT email, bio, admin, two_factor_enabled FROM user WHERE email = ?');
	const user = stmt.get(req.user.email);

	if (!user) {
		console.log("❌ No user found for email:", req.user.email);
		return res.status(404).json({ error: 'User not found' });
	}

	console.log("🔍 User Data Before Rendering Profile:", user);

	// Fetch continents, countries, cities, and languages
	const continentsStmt = db.prepare('SELECT name FROM continent');
	const continents = continentsStmt.all();

	const countriesStmt = db.prepare('SELECT name, code FROM country');
	const countries = countriesStmt.all();

	const citiesStmt = db.prepare('SELECT ROWID, name FROM city');
	const cities = citiesStmt.all();

	const languagesStmt = db.prepare('SELECT DISTINCT language FROM countrylanguage ORDER BY language ASC');
	const languages = languagesStmt.all();

	// ✅ Render profile.pug with all required data
	res.render('profile', {
		title: 'Profile',
		subtitle: 'Your profile',
		user,
		continents,
		countries,
		cities,
		languages
	});
});

router.get('/login', (req, res) => {
	res.render('login', {
		title: 'Login',
		subtitle: 'Enter your credentials below'
	});
});

router.get('/register', (req, res) => {
	res.render('register', {
		title: 'Register',
		subtitle: 'Create your account'
	});
});

router.get('/courses-grades', authenticateUser, (req, res) => {
	const email = req.user.email;
	const isAdmin = req.user.admin === 1;

	console.log(`✅ Fetching grades for: ${email} (Admin: ${isAdmin})`);

	let stmt;
	let grades;
	let users = [];
	let courses = [];

	if (isAdmin) {
		// ✅ Admins can see all users' grades from upddb.sql
		stmt = gradesDb.prepare('SELECT email, course, grade, juncture FROM exam ORDER BY juncture DESC');
		grades = stmt.all();

		// ✅ Fetch all users from sampleAPI.db for dropdown
		stmt = db.prepare('SELECT email FROM user ORDER BY email');
		users = stmt.all();

		// ✅ Fetch all courses from upddb.sql for dropdown
		stmt = gradesDb.prepare('SELECT course FROM course ORDER BY course');
		courses = stmt.all();
	} else {
		// ✅ Regular users can only see their own grades from upddb.sql
		stmt = gradesDb.prepare('SELECT course, grade, juncture FROM exam WHERE email = ? ORDER BY juncture DESC');
		grades = stmt.all(email);
	}

	console.log("📊 Grades Data:", grades);
	console.log("👥 Users Data:", users);
	console.log("📚 Courses Data:", courses);

	// ✅ Render `courses-grades.pug` with fetched data
	res.render('courses-grades', {
		title: 'Course Grades',
		subtitle: 'Manage and View Grades',
		user: req.user,
		grades,
		users,
		courses
	});
});

router.post('/update-grade', authenticateUser, (req, res) => {
	const { email, course, newGrade } = req.body;

	if (req.user.admin !== 1) {
		return res.status(403).json({ error: "Access Denied: Only admins can update grades" });
	}

	console.log(`📝 Adding new grade for: ${email}, Course: ${course}, Grade: ${newGrade}`);

	// ✅ Check if the user exists in `sampleAPI.db`
	const userStmt = db.prepare('SELECT email FROM user WHERE email = ?');
	const userExists = userStmt.get(email);

	if (!userExists) {
		console.log("❌ User not found in sampleAPI.db:", email);
		return res.status(400).json({ error: "User not found" });
	}

	// ✅ Check if the course exists in `upddb.sql`
	const courseStmt = gradesDb.prepare('SELECT course FROM course WHERE course = ?');
	const courseExists = courseStmt.get(course);

	if (!courseExists) {
		console.log("❌ Course not found in upddb.sql:", course);
		return res.status(400).json({ error: "Course not found" });
	}

	// ✅ Disable foreign key enforcement temporarily
	gradesDb.exec('PRAGMA foreign_keys = OFF;');

	// ✅ Insert a new grade record with the current timestamp
	const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

	try {
		const insertStmt = gradesDb.prepare('INSERT INTO exam (email, course, grade, juncture) VALUES (?, ?, ?, ?)');
		insertStmt.run(email, course, newGrade, currentTimestamp);
		console.log("✅ Grade added successfully to upddb.sql!");

		// ✅ Re-enable foreign key enforcement
		gradesDb.exec('PRAGMA foreign_keys = ON;');

		res.json({ message: "Grade added successfully!" });
	} catch (error) {
		console.error("❌ Error inserting new grade:", error);
		gradesDb.exec('PRAGMA foreign_keys = ON;'); // Ensure it's always re-enabled
		res.status(500).json({ error: "Failed to insert new grade" });
	}
});

router.get('/logout', (req, res) => {
	res.clearCookie('jwt', { httpOnly: true, sameSite: 'Strict' }); // Remove JWT
	console.log("✅ User logged out, JWT removed.");
	res.redirect('/users/login'); // Redirect to login page
});


router.post('/register', async function (req, res, next) {
	const { email, password, bio } = req.body;

	if (!email || !password || !bio) {
		return res.status(400).json({ error: 'Missing required fields' });
	}

	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		const encryptedBio = authController.encryptBio(bio);

		const stmt = db.prepare('INSERT INTO user (email, password, bio, admin) VALUES (?, ?, ?, ?)');
		// I better-sqlite3 køres run() synkront og returnerer et info-objekt
		const info = stmt.run(email, hashedPassword, encryptedBio, 0);

		// Valgfrit: tjek info.changes eller info.lastInsertRowid osv.
		if (info.changes > 0) {
			res.status(201).json({ message: 'User registered successfully!' });
		} else {
			res.status(500).json({ error: 'Could not insert user' });
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Database error' });
	}
});

router.post('/login', async function (req, res) {
	const { email, password } = req.body;

	const stmt = db.prepare('SELECT * FROM user WHERE email = ?');
	const user = stmt.get(email);

	if (!user) {
		return res.status(401).json({ error: 'Invalid email or password' });
	}

	const validPassword = await bcrypt.compare(password, user.password);
	if (!validPassword) {
		return res.status(401).json({ error: 'Invalid email or password' });
	}

	// ✅ Generate a new JWT every time the user logs in
	const token = jwt.sign(
		{ email: user.email, admin: user.admin, two_factor_enabled: user.two_factor_enabled },
		process.env.SECRET,
		{ expiresIn: '1h' } // Expiry for security
	);

	// ✅ Store the new JWT as a cookie
	res.cookie('jwt', token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'Strict',
		maxAge: 3600000 // 1 hour
	});

	console.log("✅ New JWT generated for user:", email);

	// ✅ Redirect if 2FA is enabled
	if (user.two_factor_enabled) {
		return res.json({ requires_2fa: true, redirect: "/users/verify-2fa" });
	}

	res.json({ message: "Login successful", redirect: "/users/profile" });
});



router.get('/verify-2fa', authenticateUser, (req, res) => {
	res.render('verify-2fa', {
		title: 'Verify Two-Factor Authentication',
		subtitle: 'Enter your OTP to proceed'
	});
});

function generateToken(user) {
	return jwt.sign(
		{ email: user.email, admin: user.admin },
		process.env.SECRET,
		{ expiresIn: '1h' }
	);
}

module.exports = router;
