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

// Garante que a tabela tem todas as colunas exigidas pelo formulário
async function configurarBanco() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY
      );
    `);

    // Lista de colunas e tipos que a tabela precisa ter
    const colunas = [
      "nome_razao_social TEXT",
      "cpf_cnpj TEXT",
      "endereco TEXT",
      "cidade TEXT",
      "bairro TEXT",
      "cep TEXT",
      "email TEXT",
      "data_nascimento DATE",
      "data_ordenacao DATE",
      "diocese_paroquia TEXT",
      "telefone_paroquia TEXT",
      "nome_produto TEXT",
      "observacoes TEXT",
      "forma_pagamento TEXT",
      "data_compra DATE",
      "data_estimada_entrega DATE",
      "valor NUMERIC",
      "status_confeccao TEXT",
      "status_entrega TEXT"
    ];

    // Adiciona cada coluna caso ela ainda não exista na tabela
    for (let colunaDef of colunas) {
      const nomeColuna = colunaDef.split(" ")[0];
      const tipoColuna = colunaDef.split(" ")[1];
      await pool.query(`
        ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS ${nomeColuna} ${tipoColuna};
      `).catch(() => {}); // Ignora se já existir
    }

    console.log("Banco de dados sincronizado com sucesso!");
  } catch (err) {
    console.error("Erro ao configurar banco:", err);
  }
}
configurarBanco();

// Rota para cadastrar (POST) compatível com o seu HTML
app.post('/api/vendas', async (req, res) => {
  const {
    nome_razao_social, cpf_cnpj, endereco, cidade, bairro, cep, email,
    data_nascimento, data_ordenacao, diocese_paroquia, telefone_paroquia,
    nome_produto, observacoes, forma_pagamento, data_compra,
    data_estimada_entrega, valor, status_confeccao, status_entrega
  } = req.body;

  try {
    const query = `
      INSERT INTO pedidos (
        nome_razao_social, cpf_cnpj, endereco, cidade, bairro, cep, email,
        data_nascimento, data_ordenacao, diocese_paroquia, telefone_paroquia,
        nome_produto, observacoes, forma_pagamento, data_compra,
        data_estimada_entrega, valor, status_confeccao, status_entrega
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *;
    `;
    
    const values = [
      nome_razao_social, cpf_cnpj, endereco, cidade, bairro, cep, email,
      data_nascimento || null, data_ordenacao || null, diocese_paroquia, telefone_paroquia,
      nome_produto, observacoes, forma_pagamento, data_compra || null,
      data_estimada_entrega || null, valor ? parseFloat(valor) : 0, status_confeccao, status_entrega
    ];

    const result = await pool.query(query, values);
    res.json({ sucesso: true, dados: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ sucesso: false, erro: err.message });
  }
});

// Rotas para buscar os pedidos salvos
app.get(['/api/pedidos', '/api/vendas'], async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(Rodando na porta ${PORT}));
