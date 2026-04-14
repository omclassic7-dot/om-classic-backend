import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = express.Router();

router.post('/login', [
  body('username').trim().notEmpty(),
  body('password').notEmpty(),
  body('branch').notEmpty()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, branch } = req.body;

  const result = await query('SELECT * FROM users WHERE username = $1', [username]);
  const user = result.rows[0];

  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.branch !== 'all' && user.branch !== branch) {
    return res.status(403).json({ message: 'Access denied for this branch' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role, branch: user.branch },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      branch: user.branch
    }
  });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  const valid = await bcrypt.compare(currentPassword, req.user.password);
  if (!valid) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);
  
  res.json({ message: 'Password updated successfully' });
}));

export default router;