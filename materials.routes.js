import express from 'express';
import { body } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate, authorize, checkBranchAccess } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = express.Router();

router.get('/:branch', authenticate, checkBranchAccess, asyncHandler(async (req, res) => {
  const { branch } = req.params;
  const { category, item } = req.query;
  
  let sql = 'SELECT * FROM materials WHERE branch = $1';
  const params = [branch];
  
  if (category) {
    sql += ` AND category = $${params.length + 1}`;
    params.push(category);
  }
  if (item) {
    sql += ` AND item = $${params.length + 1}`;
    params.push(item);
  }
  
  sql += ' ORDER BY date DESC, created_at DESC';
  
  const result = await query(sql, params);
  res.json(result.rows);
}));

router.post('/:branch', authenticate, authorize('admin', 'manager'), checkBranchAccess, [
  body('date').isDate(),
  body('category').isIn(['Sachet Materials', 'Bottle Materials']),
  body('item').notEmpty(),
  body('stock_in').isInt({ min: 0 }),
  body('stock_out').isInt({ min: 0 })
], asyncHandler(async (req, res) => {
  const { branch } = req.params;
  const { date, category, item, stock_in, stock_out, waste, theft, balance, remarks } = req.body;
  
  const result = await query(
    `INSERT INTO materials (date, category, item, stock_in, stock_out, waste, theft, balance, remarks, branch, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [date, category, item, stock_in, stock_out, waste || 0, theft || 0, balance, remarks, branch, req.user.username]
  );
  
  res.status(201).json(result.rows[0]);
}));

export default router;