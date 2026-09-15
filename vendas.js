const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
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

      return res.status(200).json({ sucesso: true, mensagem: 'Venda cadastrada com sucesso!' });
    } catch (err) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT p.*, c.nome_razao_social, c.telefone_paroquia 
        FROM pedidos p 
        JOIN clientes c ON p.cliente_id = c.id 
        ORDER BY p.data_compra DESC
      `);
      return res.status(200).json(result.rows);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  res.status(405).json({ erro: 'Método não permitido' });
};