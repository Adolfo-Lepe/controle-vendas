const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Rota para salvar todas as informações do seu formulário
app.post('/api/vendas', async (req, res) => {
  const {
    nome, cpf_cnpj, endereco, cidade, bairro, cep, email,
    data_nascimento, data_ordenacao, diocese_paroquia, telefone_paroquia,
    nome_produto, observacoes, forma_pagamento, valor,
    data_compra, data_entrega, status_confec, status_entrega
  } = req.body;

  try {
    const query = `
      INSERT INTO pedidos (
        nome, cpf_cnpj, endereco, cidade, bairro, cep, email,
        data_nascimento, data_ordenacao, diocese_paroquia, telefone_paroquia,
        nome_produto, observacoes, forma_pagamento, valor,
        data_compra, data_entrega, status_confec, status_entrega
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *;
    `;
    
    const values = [
      nome, cpf_cnpj, endereco, cidade, bairro, cep, email,
      data_nascimento || null, data_ordenacao || null, diocese_paroquia, telefone_paroquia,
      nome_produto, observacoes, forma_pagamento, valor ? parseFloat(valor.toString().replace(',', '.')) : 0,
      data_compra || null, data_entrega || null, status_confec, status_entrega
    ];

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Rota para listar os pedidos salvos
app.get('/api/vendas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
