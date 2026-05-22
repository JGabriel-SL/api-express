const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// --- Constants ---
const USER_TYPE_VIP = "VIP";
const USER_TYPE_NORMAL = "NORMAL";
const ORDER_STATUS_APPROVED = "APROVADO";

const VIP_DISCOUNT_PERCENTAGE = 0.10; // 10% discount
const VIP_ADDITIONAL_DISCOUNT = 50;

const DEFAULT_FREIGHT = 20;
const SAO_PAULO_FREIGHT = 5;
const CEARA_FREIGHT = 40;
const SAO_PAULO_UF = "SP";
const CEARA_UF = "CE";

const VIACEP_API_URL = "https://viacep.com.br/ws";

// Freight rates lookup map
const FREIGHT_RATES = {
  [SAO_PAULO_UF]: SAO_PAULO_FREIGHT,
  [CEARA_UF]: CEARA_FREIGHT,
};

let usuarios = [
  { id: 1, nome: "João Silva", tipo: USER_TYPE_VIP, saldo: 100 },
  { id: 2, nome: "Maria Souza", tipo: USER_TYPE_NORMAL, saldo: 50 }
];

let pedidos = [
  { id: 1, usuarioId: 1, valorFinal: 85.00, status: ORDER_STATUS_APPROVED },
  { id: 2, usuarioId: 2, valorFinal: 105.00, status: ORDER_STATUS_APPROVED },
  { id: 3, usuarioId: 99, valorFinal: 30.00, status: ORDER_STATUS_APPROVED }
];

// --- Helper Functions ---
const calculateFinalOrderValue = (valorTotal, userType) => {
  let valorFinal = valorTotal;
  if (userType === USER_TYPE_VIP) {
    valorFinal = valorTotal * (1 - VIP_DISCOUNT_PERCENTAGE);
    valorFinal -= VIP_ADDITIONAL_DISCOUNT;
  }
  return valorFinal;
};

const getFreightCost = async (cepDestino) => {
  try {
    const response = await axios.get(`${VIACEP_API_URL}/${cepDestino}/json/`);

    if (response.data.erro) {
      throw new Error("CEP inválido");
    }

    const uf = response.data.uf;
    const frete = FREIGHT_RATES[uf] !== undefined ? FREIGHT_RATES[uf] : DEFAULT_FREIGHT;

    return frete;

  } catch (error) {
    console.error("Error fetching CEP:", error.message);
    throw new Error("Erro ao calcular frete externo");
  }
};


app.get('/pedidos', (req, res) => {
  res.json(pedidos);
});

app.post('/pedidos', async (req, res) => {
  const { usuarioId, valorTotal, cepDestino } = req.body;

  if (!usuarioId || !valorTotal || !cepDestino) {
    return res.status(400).json({ erro: "Dados inválidos: usuarioId, valorTotal e cepDestino são obrigatórios" });
  }

  const usuario = usuarios.find(u => u.id === usuarioId);
  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  let valorFinal = calculateFinalOrderValue(valorTotal, usuario.tipo);

  try {
    const frete = await getFreightCost(cepDestino);
    valorFinal += frete;
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }

  if (usuario.saldo < valorFinal) {
    return res.status(400).json({ erro: "Saldo insuficiente" });
  }

  usuario.saldo -= valorFinal;

  const novoPedido = {
    id: pedidos.length + 1,
    usuarioId,
    valorFinal,
    status: ORDER_STATUS_APPROVED
  };
  pedidos.push(novoPedido);

  return res.status(201).json(novoPedido);
});

app.get('/pedidos/:id', (req, res) => {
  const pedido = pedidos.find(p => p.id === parseInt(req.params.id));

  if (!pedido) {
    return res.status(404).json({ erro: "Pedido não encontrado" });
  }

  const donoPedido = usuarios.find(u => u.id === pedido.usuarioId);

  if (!donoPedido) {
    return res.status(404).json({ erro: "Dono do pedido não encontrado" });
  }

  res.json({
    pedido,
    cliente: donoPedido.nome
  });
});

module.exports = app;