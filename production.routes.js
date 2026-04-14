import express from 'express';
import { body } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate, authorize, checkBranchAccess } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = express.Router();

router.get('/:branch', authenticate, checkBranchAccess, asyncHandler(async (req, res) => {
  const { branch } = req.params;
  const { dateFrom, dateTo, product } = req.query;
  
  let sql = 'SELECT * FROM production WHERE branch = $1';
  const params = [branch];
  
  if (dateFrom) {
    sql += ` AND date >= $${params.length + 1}`;
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ` AND date <= $${params.length + 1}`;
    params.push(dateTo);
  }
  if (product) {
    sql += ` AND product = $${params.length + 1}`;
    params.push(product);
  }
  
  sql += ' ORDER BY date DESC, created_at DESC';
  
  const result = await query(sql, params);
  res.json(result.rows);
}));

router.post('/:branch', authenticate, authorize('admin', 'manager'), checkBranchAccess, [
  body('date').isDate(),
  body('product').isIn(['Sachet Water', 'Bottled Water']),
  body('qty_produced').isInt({ min: 0 }),
  body('loss').isInt({ min: 0 }),
  body('cost').isFloat({ min: 0 })
], asyncHandler(async (req, res) => {
  const { branch } = req.params;
  const { date, product, qty_produced, materials_used, loss, cost, remarks } = req.body;
  
  const net_output = qty_produced - (loss || 0);
  
  const result = await query(
    `INSERT INTO production (date, product, qty_produced, materials_used, loss, net_output, cost, remarks, branch, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [date, product, qty_produced, materials_used, loss, net_output, cost, remarks, branch, req.user.username]
  );
  
  res.status(201).json(result.rows[0]);
}));

router.put('/:branch/:id', authenticate, authorize('admin', 'manager'), checkBranchAccess, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, product, qty_produced, materials_used, loss, cost, remarks } = req.body;
  
  const net_output = qty_produced - (loss || 0);
  
  const result = await query(
    `UPDATE production SET date = $1, product = $2, qty_produced = $3, materials_used = $4, 
     loss = $5, net_output = $6, cost = $7, remarks = $8, updated_at = NOW()
     WHERE id = $9 RETURNING *`,
    [date, product, qty_produced, materials_used, loss, net_output, cost, remarks, id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Record not found' });
  }
  
  res.json(result.rows[0]);
}));

router.delete('/:branch/:id', authenticate, authorize('admin'), checkBranchAccess, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM production WHERE id = $1', [id]);
  res.json({ message: 'Record deleted' });
}));

export default router;