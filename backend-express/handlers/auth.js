const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { generateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register(req, res) {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Invalid input: email and password are required' });
    }

    email = email.trim().toLowerCase();

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid input: invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Invalid input: password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const now = new Date();

    const insertResult = await db.query(
      `INSERT INTO users (id, email, password_hash, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, created_at, updated_at`,
      [id, email, hashedPassword, now, now]
    );

    const user = insertResult.rows[0];
    const token = generateToken(user.id);

    res.cookie('token', token, {
      maxAge: 72 * 3600 * 1000, // 72 hours in milliseconds
      path: '/',
      secure: false,
      httpOnly: true,
    });

    return res.status(201).json({
      user,
      token,
    });
  } catch (err) {
    console.error('Error during registration:', err);
    return res.status(500).json({ error: 'Failed to create user' });
  }
}

async function login(req, res) {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Invalid input: email and password are required' });
    }

    email = email.trim().toLowerCase();

    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    res.cookie('token', token, {
      maxAge: 72 * 3600 * 1000,
      path: '/',
      secure: false,
      httpOnly: true,
    });

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      token,
    });
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getMe(req, res) {
  try {
    const userID = req.userID;

    const userResult = await db.query(
      'SELECT id, email, created_at, updated_at FROM users WHERE id = $1',
      [userID]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: userResult.rows[0] });
  } catch (err) {
    console.error('Error in getMe:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function logout(req, res) {
  res.cookie('token', '', {
    maxAge: -1,
    path: '/',
    secure: false,
    httpOnly: true,
  });
  return res.status(200).json({ message: 'Logged out successfully' });
}

module.exports = {
  register,
  login,
  getMe,
  logout,
};
