import express from 'express';
import { body } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate, authorize, checkBranchAccess } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = express.Router();

router.get('/:branch', authenticate, checkBranchAccess, asyncHandler(async (req, res) => {
  const { branch } = req.params;
  const { product } = req.query;
  
  let sql = 'SELECT * FROM stock WHERE branch = $1';
  const params = [branch];
  
  if (product) {
    sql += ` AND product = $2`;
    params.push(product);
  }
  
  sql += ' ORDER BY date DESC, created_at DESC';
  
  const result = await query(sql, params);
  res.json(result.rows);
}));

router.get('/:branch/balance/:product', authenticate, checkBranchAccess, asyncHandler(async (req, res) => {
  const { branch, product } = req.params;
  
  const result = await query(
    'SELECT balance FROM stock WHERE branch = $1 AND product = $2 ORDER BY date DESC, created_at DESC LIMIT 1',
    [branch, product]
  );
  
  res.json({ balance: result.rows[0]?.balance || 0 });
}));

router.post('/:branch', authenticate, authorize('admin', 'manager'), checkBranchAccess, [
  body('date').isDate(),
  body('product').isIn(['Sachet Water', 'Bottled Water']),
  body('stock_in').isInt({ min: 0 }),
  body('stock_out').isInt({ min: 0 }),
  body('leakage').isInt({ min: 0 }),
  body('theft').isInt({ min: 0 })
], asyncHandler(async (req, res) => {
  const { branch } = req.params;
  const { date, product, stock_in, stock_out, leakage, theft, remarks } = req.body;
  
  const lastBalance = await query(
    'SELECT balance FROM stock WHERE branch = $1 AND product = $2 ORDER BY date DESC, created_at DESC LIMIT 1',
    [branch, product]
  );
  
  const currentBalance = (lastBalance.rows[0]?.balance || 0) + stock_in - stock_out - (leakage || 0) - (theft || 0);
  
  const result = await query(
    `INSERT INTO stock (date, product, stock_in, stock_out, leakage, theft, balance, remarks, branch, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [date, product, stock_in, stock_out, leakage, theft, currentBalance, remarks, branch, req.user.username]
  );
  
  res.status(201).json(result.rows[0]);
}));

export default router;