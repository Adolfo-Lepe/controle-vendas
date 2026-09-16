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

async function configurarBanco() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome_razao_social TEXT NOT NULL,
        cpf_cnpj TEXT,
        endereco TEXT,
        cidade TEXT,
        bairro TEXT,
        cep TEXT,
        email TEXT,
        data_nascimento DATE,
        data_ordenacao DATE,
        diocese_paroquia TEXT,
        telefone_paroquia TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
        nome_produto TEXT NOT NULL,
        observacoes TEXT,
        forma_pagamento TEXT,
        data_compra DATE,
        data_estimada_entrega DATE,
        valor NUMERIC,
        status_confeccao TEXT,
        status_entrega TEXT
      );
    `);

    console.log("Banco de dados estruturado com sucesso!");
  } catch (err) {
    console.error("Erro ao configurar banco:", err);
  }
}
configurarBanco();

app.get('/api/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY nome_razao_social ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vendas', async (req, res) => {
  const {
    nome_razao_social, cpf_cnpj, endereco, cidade, bairro, cep, email,
    data_nascimento, data_ordenacao, diocese_paroquia, telefone_paroquia,
    nome_produto, observacoes, forma_pagamento, data_compra,
    data_estimada_entrega, valor, status_confeccao, status_entrega, cliente_id
  } = req.body;

  try {
    let idClienteFinal = cliente_id;

    if (!idClienteFinal) {
      const clienteQuery = `
        INSERT INTO clientes (
          nome_razao_social, cpf_cnpj, endereco, cidade, bairro, cep, email,
          data_nascimento, data_ordenacao, diocese_paroquia, telefone_paroquia
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id;
      `;
      const clienteValues = [
        nome_razao_social, cpf_cnpj, endereco, cidade, bairro, cep, email,
        data_nascimento || null, data_ordenacao || null, diocese_paroquia, telefone_paroquia
      ];
      const clienteRes = await pool.query(clienteQuery, clienteValues);
      idClienteFinal = clienteRes.rows[0].id;
    }

    const pedidoQuery = `
      INSERT INTO pedidos (
        cliente_id, nome_produto, observacoes, forma_pagamento, data_compra,
        data_estimada_entrega, valor, status_confeccao, status_entrega
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const pedidoValues = [
      idClienteFinal, nome_produto, observacoes, forma_pagamento,
      data_compra || null, data_estimada_entrega || null,
      valor ? parseFloat(valor) : 0, status_confeccao, status_entrega
    ];

    const pedidoRes = await pool.query(pedidoQuery, pedidoValues);
    res.json({ sucesso: true, dados: pedidoRes.rows[0] });
  } catch (err) {
    res.json({ sucesso: false, erro: err.message });
  }
});

// Busca pedidos com pendentes no topo
app.get(['/api/pedidos', '/api/vendas'], async (req, res) => {
  try {
    const query = `
      SELECT p.*, c.nome_razao_social, c.cpf_cnpj, c.endereco, c.cidade, 
             c.bairro, c.cep, c.email, c.data_nascimento, c.data_ordenacao, 
             c.diocese_paroquia, c.telefone_paroquia
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      ORDER BY 
        CASE 
          WHEN p.status_confeccao = 'Concluído' THEN 2 
          ELSE 1 
        END ASC, 
        p.id DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota rápida para atualizar apenas o status da confecção direto pela tabela
app.patch('/api/pedidos/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status_confeccao } = req.body;
  try {
    const result = await pool.query(
      'UPDATE pedidos SET status_confeccao = $1 WHERE id = $2 RETURNING *',
      [status_confeccao, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Pedido não encontrado.' });
    }
    res.json({ sucesso: true, dados: result.rows[0] });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.put('/api/vendas/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nome_produto, observacoes, forma_pagamento, data_compra,
    data_estimada_entrega, valor, status_confeccao, status_entrega
  } = req.body;

  try {
    const query = `
      UPDATE pedidos 
      SET nome_produto = $1, observacoes = $2, forma_pagamento = $3, 
          data_compra = $4, data_estimada_entrega = $5, valor = $6, 
          status_confeccao = $7, status_entrega = $8
      WHERE id = $9
      RETURNING *;
    `;
    const values = [
      nome_produto, observacoes, forma_pagamento, data_compra || null,
      data_estimada_entrega || null, valor ? parseFloat(valor) : 0,
      status_confeccao, status_entrega, id
    ];

    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Pedido não encontrado.' });
    }
    res.json({ sucesso: true, dados: result.rows[0] });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.delete('/api/vendas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM pedidos WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ sucesso: false, erro: 'Pedido não encontrado.' });
    }
    res.json({ sucesso: true, mensagem: 'Pedido excluído com sucesso!' });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
