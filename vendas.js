const { Client } = require('pg');

function getClient() {
  return new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client = getClient();

  try {
    await client.connect();

    if (req.method === 'POST') {
      const {
        nome_razao_social, cpf_cnpj, endereco, cidade, bairro, cep, email,
        data_nascimento, data_ordenacao, diocese_paroquia, telefone_paroquia,
        nome_produto, observacoes, forma_pagamento, data_compra, data_estimada_entrega,
        valor, status_confeccao, status_entrega
      } = req.body;

      const clienteResult = await client.query(
        `INSERT INTO clientes (nome_razao_social, cpf_cnpj, endereco, cidade, bairro, cep, email, data_nascimento, data_ordenacao, diocese_paroquia, telefone_paroquia) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [nome_razao_social, cpf_cnpj, endereco, cidade, bairro, cep, email, data_nascimento || null, data_ordenacao || null, diocese_paroquia, telefone_paroquia]
      );
      const clienteId = clienteResult.rows[0].id;

      await client.query(
        `INSERT INTO pedidos (cliente_id, nome_produto, observacoes, forma_pagamento, data_compra, data_estimada_entrega, valor, status_confeccao, status_entrega) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [clienteId, nome_produto, observacoes, forma_pagamento, data_compra, data_estimada_entrega, valor, status_confeccao, status_entrega]
      );

      await client.end();
      return res.status(200).json({ sucesso: true, mensagem: 'Venda cadastrada com sucesso!' });
    }

    if (req.method === 'GET') {
      const result = await client.query(`
        SELECT p.*, c.nome_razao_social, c.telefone_paroquia 
        FROM pedidos p 
        JOIN clientes c ON p.cliente_id = c.id 
        ORDER BY p.data_compra DESC
      `);
      await client.end();
      return res.status(200).json(result.rows);
    }

    await client.end();
    return res.status(405).json({ erro: 'Método não permitido' });

  } catch (err) {
    try { await client.end(); } catch (e) {}
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
};
