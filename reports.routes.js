import express from 'express';
import { query } from '../config/database.js';
import { authenticate, checkBranchAccess } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = express.Router();

router.get('/:branch/daily/:date', authenticate, checkBranchAccess, asyncHandler(async (req, res) => {
  const { branch, date } = req.params;
  
  const production = await query(
    'SELECT COALESCE(SUM(qty_produced), 0) as total_produced, COALESCE(SUM(loss), 0) as total_loss, COALESCE(SUM(net_output), 0) as net_output FROM production WHERE branch = $1 AND date = $2',
    [branch, date]
  );
  
  const sales = await query(
    'SELECT COALESCE(SUM(qty_sold), 0) as total_sold, COALESCE(SUM(returns), 0) as total_returns, COALESCE(SUM(net_sales), 0) as total_revenue FROM sales WHERE branch = $1 AND date = $2',
    [branch, date]
  );
  
  const stockIssues = await query(
    'SELECT COALESCE(SUM(theft), 0) as theft, COALESCE(SUM(leakage), 0) as damage FROM stock WHERE branch = $1 AND date = $2',
    [branch, date]
  );
  
  res.json({
    date,
    branch,
    production: production.rows[0],
    sales: sales.rows[0],
    stockIssues: stockIssues.rows[0]
  });
}));

router.get('/:branch/range', authenticate, checkBranchAccess, asyncHandler(async (req, res) => {
  const { branch } = req.params;
  const { from, to } = req.query;
  
  const prodResult = await query(
    'SELECT COALESCE(SUM(qty_produced), 0) as total_produced, COALESCE(SUM(loss), 0) as total_loss FROM production WHERE branch = $1 AND date BETWEEN $2 AND $3',
    [branch, from, to]
  );
  
  const salesResult = await query(
    'SELECT COALESCE(SUM(qty_sold), 0) as total_sold, COALESCE(SUM(net_sales), 0) as total_revenue FROM sales WHERE branch = $1 AND date BETWEEN $2 AND $3',
    [branch, from, to]
  );
  
  const currentStock = await query(
    `SELECT product, balance FROM stock s1 
     WHERE branch = $1 
     AND created_at = (SELECT MAX(created_at) FROM stock s2 WHERE s2.product = s1.product AND s2.branch = $1)`,
    [branch]
  );
  
  res.json({
    period: { from, to },
    production: prodResult.rows[0],
    sales: salesResult.rows[0],
    currentStock: currentStock.rows
  });
}));

export default router;