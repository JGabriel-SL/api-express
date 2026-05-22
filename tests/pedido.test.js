const request = require('supertest');
const axios = require('axios');
const app = require('../src/app');

jest.mock('axios');

describe('Testes de Integração - API de Pedidos', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Deve criar um pedido com sucesso para usuário NORMAL e frete de SP', async () => {
        axios.get.mockResolvedValue({
            data: {
                cep: "01001-000",
                uf: "SP"
            }
        });

        const novoPedido = {
            usuarioId: 2,
            valorTotal: 40,
            cepDestino: "01001000"
        };

        const response = await request(app)
            .post('/pedidos')
            .send(novoPedido);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.valorFinal).toBe(45);
        expect(response.body.status).toBe("APROVADO");
    });

    it('Deve retornar 400 se o ViaCEP disser que o CEP é inválido', async () => {
        axios.get.mockResolvedValue({
            data: { erro: true }
        });

        const pedidoComCepInvalido = {
            usuarioId: 2,
            valorTotal: 20,
            cepDestino: "99999999"
        };

        const response = await request(app)
            .post('/pedidos')
            .send(pedidoComCepInvalido);

        expect(response.status).toBe(400);
        expect(response.body.erro).toBe("CEP inválido");
    });

    it('Deve retornar 400 se o usuário não tiver saldo suficiente', async () => {
        axios.get.mockResolvedValue({
            data: { uf: "CE" }
        });

        const pedidoCaro = {
            usuarioId: 2,
            valorTotal: 20,
            cepDestino: "60000000"
        };

        const response = await request(app)
            .post('/pedidos')
            .send(pedidoCaro);

        expect(response.status).toBe(400);
        expect(response.body.erro).toBe("Saldo insuficiente");
    });

    it('Deve retornar 500 se o serviço do ViaCEP estiver fora do ar', async () => {
        axios.get.mockRejectedValue(new Error('Network Error'));

        const pedido = {
            usuarioId: 2,
            valorTotal: 20,
            cepDestino: "01001000"
        };

        const response = await request(app)
            .post('/pedidos')
            .send(pedido);

        expect(response.status).toBe(500);
        expect(response.body.erro).toBe("Erro ao calcular frete externo");
    });
});