import { query } from '../config/database.js';

const initDB = async () => {
  try {
    console.log('Initializing database...');

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
        branch VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS production (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        product VARCHAR(50) NOT NULL CHECK (product IN ('Sachet Water', 'Bottled Water')),
        qty_produced INTEGER NOT NULL DEFAULT 0,
        materials_used TEXT,
        loss INTEGER DEFAULT 0,
        net_output INTEGER NOT NULL,
        cost DECIMAL(10,2) DEFAULT 0,
        remarks TEXT,
        branch VARCHAR(50) NOT NULL,
        created_by VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS stock (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        product VARCHAR(50) NOT NULL,
        stock_in INTEGER DEFAULT 0,
        stock_out INTEGER DEFAULT 0,
        leakage INTEGER DEFAULT 0,
        theft INTEGER DEFAULT 0,
        balance INTEGER NOT NULL,
        remarks TEXT,
        branch VARCHAR(50) NOT NULL,
        created_by VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        product VARCHAR(50) NOT NULL,
        qty_sold INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        returns INTEGER DEFAULT 0,
        net_sales DECIMAL(10,2) NOT NULL,
        payment VARCHAR(20) NOT NULL CHECK (payment IN ('Cash', 'Transfer', 'Credit')),
        remarks TEXT,
        branch VARCHAR(50) NOT NULL,
        created_by VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        category VARCHAR(50) NOT NULL,
        item VARCHAR(50) NOT NULL,
        stock_in INTEGER DEFAULT 0,
        stock_out INTEGER DEFAULT 0,
        waste INTEGER DEFAULT 0,
        theft INTEGER DEFAULT 0,
        balance INTEGER NOT NULL,
        remarks TEXT,
        branch VARCHAR(50) NOT NULL,
        created_by VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const adminExists = await query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (adminExists.rows.length === 0) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await query(
        'INSERT INTO users (username, password, role, branch) VALUES ($1, $2, $3, $4)',
        ['admin', hashedPassword, 'admin', 'all']
      );
      console.log('Default admin user created: admin/admin123');
    }

    console.log('Database initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

initDB();