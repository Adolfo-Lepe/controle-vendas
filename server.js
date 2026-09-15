const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Rota para listar e salvar vendas direto no Neon
app.get('/api/vendas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vendas', async (req, res) => {
  const { cliente, produto, valor, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO pedidos (cliente, produto, valor, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [cliente, produto, valor, status]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));