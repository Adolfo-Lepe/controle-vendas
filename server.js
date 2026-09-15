const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexão com o Neon (substitua a linha abaixo pela sua URL do Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_LcAoteRn0Gq6@ep-falling-poetry-acxjr0yq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

// Servir a página HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para cadastrar Cliente e Pedido
app.post('/api/vendas', async (req, res) => {
  const {
    nome_razao_social, cpf_cnpj, endereco, cidade, bairro, cep, email,
    data_nascimento, data_ordenacao, diocese_paroquia, telefone_paroquia,
    nome_produto, observacoes, forma_pagamento, data_compra, data_estimada_entrega,
    valor, status_confeccao, status_entrega
  } = req.body;

  try {
    const clienteResult = await pool.query(
      `INSERT INTO clientes (nome_razao_social, cpf_cnpj, endereco, cidade, bairro, cep, email, data_nascimento, data_ordenacao, diocese_paroquia, telefone_paroquia) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [nome_razao_social, cpf_cnpj, endereco, cidade, bairro, cep, email, data_nascimento, data_ordenacao, diocese_paroquia, telefone_paroquia]
    );
    const clienteId = clienteResult.rows[0].id;

    await pool.query(
      `INSERT INTO pedidos (cliente_id, nome_produto, observacoes, forma_pagamento, data_compra, data_estimada_entrega, valor, status_confeccao, status_entrega) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [clienteId, nome_produto, observacoes, forma_pagamento, data_compra, data_estimada_entrega, valor, status_confeccao, status_entrega]
    );

    res.json({ sucesso: true, mensagem: 'Venda cadastrada com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// Rota para buscar os pedidos
app.get('/api/pedidos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.nome_razao_social, c.telefone_paroquia 
      FROM pedidos p 
      JOIN clientes c ON p.cliente_id = c.id 
      ORDER BY p.data_compra DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));