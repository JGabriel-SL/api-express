const request = require('supertest');
const axios = require('axios');
const app = require('../src/app.js');

jest.mock('axios');

describe('Testes de Integração - Endpoints de Pedidos', () => {

    // Limpa os mocks antes de cada teste para evitar interferências
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /pedidos', () => {
        it('deve retornar a lista inicial de pedidos', async () => {
            const response = await request(app).get('/pedidos');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });
    });

    describe('POST /pedidos', () => {
        it('deve criar um pedido com sucesso para um usuário NORMAL (sem desconto + frete padrão)', async () => {
            // Mockando a resposta do ViaCEP para um CEP genérico (ex: Rio de Janeiro - RJ)
            axios.get.mockResolvedValue({
                data: { uf: 'RJ' }
            });

            const novoPedido = {
                usuarioId: 2, // Maria Souza - NORMAL - Saldo: 50
                valorTotal: 20,
                cepDestino: '20000000'
            };

            // Cálculo esperado: 20 (valorTotal) + 20 (frete padrão RJ) = 40
            const response = await request(app)
                .post('/pedidos')
                .send(novoPedido);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.usuarioId).toBe(2);
            expect(response.body.valorFinal).toBe(40);
            expect(response.body.status).toBe('APROVADO');
        });

        it('deve aplicar desconto VIP e frete reduzido para SP', async () => {
            // Mockando a resposta do ViaCEP para São Paulo
            axios.get.mockResolvedValue({
                data: { uf: 'SP' }
            });

            const novoPedido = {
                usuarioId: 1, // João Silva - VIP - Saldo: 100
                valorTotal: 100,
                cepDestino: '01000000'
            };

            // Cálculo esperado: 
            // 100 - 10% (10) = 90
            // 90 - 50 (Desconto adicional VIP) = 40
            // 40 + 5 (Frete SP) = 45
            const response = await request(app)
                .post('/pedidos')
                .send(novoPedido);

            expect(response.status).toBe(201);
            expect(response.body.valorFinal).toBe(45);
        });

        it('deve retornar 400 se o usuário não tiver saldo suficiente', async () => {
            axios.get.mockResolvedValue({
                data: { uf: 'CE' } // Frete do CE é 40
            });

            const novoPedido = {
                usuarioId: 2, // Maria Souza - Saldo: 50
                valorTotal: 30,
                cepDestino: '60000000'
            };

            // Cálculo: 30 + 40 (frete) = 70 (Maria só tem 50 de saldo)
            const response = await request(app)
                .post('/pedidos')
                .send(novoPedido);

            expect(response.status).toBe(400);
            expect(response.body.erro).toBe('Saldo insuficiente');
        });

        it('deve retornar 404 se o usuário não existir', async () => {
            const response = await request(app)
                .post('/pedidos')
                .send({
                    usuarioId: 999, // ID inexistente
                    valorTotal: 50,
                    cepDestino: '01000000'
                });

            expect(response.status).toBe(404);
            expect(response.body.erro).toBe('Usuário não encontrado');
        });

        it('deve retornar 400 se faltarem dados obrigatórios', async () => {
            const response = await request(app)
                .post('/pedidos')
                .send({
                    usuarioId: 1
                    // faltando valorTotal e cepDestino
                });

            expect(response.status).toBe(400);
            expect(response.body.erro).toContain('Dados inválidos');
        });

        it('deve retornar 500 se o CEP for inválido ou a API falhar', async () => {
            // Simulando o erro que o ViaCEP retorna quando não acha o CEP
            axios.get.mockResolvedValue({
                data: { erro: true }
            });

            const response = await request(app)
                .post('/pedidos')
                .send({
                    usuarioId: 1,
                    valorTotal: 50,
                    cepDestino: '00000000'
                });

            expect(response.status).toBe(500);
            expect(response.body.erro).toBe('Erro ao calcular frete externo');
        });
    });

    describe('GET /pedidos/:id', () => {
        it('deve retornar o detalhe do pedido e o nome do cliente', async () => {
            const response = await request(app).get('/pedidos/1');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('pedido');
            expect(response.body).toHaveProperty('cliente', 'João Silva');
        });

        it('deve retornar 404 se o pedido não for encontrado', async () => {
            const response = await request(app).get('/pedidos/999');

            expect(response.status).toBe(404);
            expect(response.body.erro).toBe('Pedido não encontrado');
        });

        it('deve retornar 404 se o dono do pedido não for encontrado no sistema', async () => {
            // O pedido ID 3 na sua lista inicial aponta para o usuarioId: 99 (que não existe no array de usuários)
            const response = await request(app).get('/pedidos/3');

            expect(response.status).toBe(404);
            expect(response.body.erro).toBe('Dono do pedido não encontrado');
        });
    });
});