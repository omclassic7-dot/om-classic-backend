import express from 'express';
import { body } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate, authorize, checkBranchAccess } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = express.Router();

router.get('/:branch', authenticate, checkBranchAccess, asyncHandler(async (req, res) => {
  const { branch } = req.params;
  const { dateFrom, dateTo, payment } = req.query;
  
  let sql = 'SELECT * FROM sales WHERE branch = $1';
  const params = [branch];
  
  if (dateFrom) {
    sql += ` AND date >= $${params.length + 1}`;
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ` AND date <= $${params.length + 1}`;
    params.push(dateTo);
  }
  if (payment) {
    sql += ` AND payment = $${params.length + 1}`;
    params.push(payment);
  }
  
  sql += ' ORDER BY date DESC, created_at DESC';
  
  const result = await query(sql, params);
  res.json(result.rows);
}));

router.post('/:branch', authenticate, authorize('admin', 'manager'), checkBranchAccess, [
  body('date').isDate(),
  body('product').isIn(['Sachet Water', 'Bottled Water']),
  body('qty_sold').isInt({ min: 0 }),
  body('unit_price').isFloat({ min: 0 }),
  body('payment').isIn(['Cash', 'Transfer', 'Credit'])
], asyncHandler(async (req, res) => {
  const { branch } = req.params;
  const { date, product, qty_sold, unit_price, returns, payment, remarks } = req.body;
  
  const total = qty_sold * unit_price;
  const net_sales = total - ((returns || 0) * unit_price);
  
  const result = await query(
    `INSERT INTO sales (date, product, qty_sold, unit_price, total, returns, net_sales, payment, remarks, branch, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [date, product, qty_sold, unit_price, total, returns || 0, net_sales, payment, remarks, branch, req.user.username]
  );
  
  res.status(201).json(result.rows[0]);
}));

export default router;