const request = require('supertest');
const axios = require('axios');
const app = require('../src/app'); // Caminho corrigido apontando para src/app

// Mockando o axios para não fazer requisições reais à internet
jest.mock('axios');

describe('Testes da API de Pedidos', () => {

    // Silencia o console.error no terminal durante os testes de erro esperados
    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterAll(() => {
        console.error.mockRestore();
    });

    // Limpa os mocks antes de cada teste para evitar interferência
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /pedidos', () => {
        it('Deve retornar a lista de todos os pedidos', async () => {
            const response = await request(app).get('/pedidos');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('GET /pedidos/:id', () => {
        it('Deve retornar o pedido e o nome do cliente com sucesso', async () => {
            const response = await request(app).get('/pedidos/1');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('pedido');
            expect(response.body).toHaveProperty('cliente', 'João Silva');
        });

        it('Deve retornar 404 se o pedido não existir', async () => {
            const response = await request(app).get('/pedidos/999');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ erro: "Pedido não encontrado" });
        });

        it('Deve retornar 404 se o dono do pedido não for encontrado', async () => {
            // O pedido ID 3 aponta para o usuarioId 99 (que não existe na lista original)
            const response = await request(app).get('/pedidos/3');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ erro: "Dono do pedido não encontrado" });
        });
    });

    describe('POST /pedidos', () => {
        it('Deve retornar 400 se faltarem dados obrigatórios', async () => {
            const response = await request(app)
                .post('/pedidos')
                .send({ usuarioId: 1 }); // Faltando valorTotal e cepDestino

            expect(response.status).toBe(400);
            expect(response.body.erro).toContain('Dados inválidos');
        });

        it('Deve retornar 404 se o usuário não existir', async () => {
            const response = await request(app)
                .post('/pedidos')
                .send({ usuarioId: 999, valorTotal: 100, cepDestino: '01001000' });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ erro: "Usuário não encontrado" });
        });

        it('Deve criar um pedido com sucesso para usuário NORMAL com frete padrão', async () => {
            // Simulando resposta do ViaCEP para um estado que não seja SP ou CE (ex: RJ)
            axios.get.mockResolvedValue({
                data: { uf: 'RJ' }
            });

            // Maria (ID 2) tem saldo 50. Valor total 20 + Frete padrão 20 = 40.
            const response = await request(app)
                .post('/pedidos')
                .send({ usuarioId: 2, valorTotal: 20, cepDestino: '20000000' });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.valorFinal).toBe(40); // 20 + 20
            expect(response.body.status).toBe('APROVADO');
        });

        it('Deve aplicar desconto VIP corretamente e frete de São Paulo', async () => {
            axios.get.mockResolvedValue({
                data: { uf: 'SP' }
            });

            // João (ID 1) é VIP. 
            // Conta: Valor 100 -> Desconto VIP de 10% = 90 -> Menos 50 adicionais = 40.
            // Frete SP = 5. Valor Final = 45.
            const response = await request(app)
                .post('/pedidos')
                .send({ usuarioId: 1, valorTotal: 100, cepDestino: '01001000' });

            expect(response.status).toBe(201);
            expect(response.body.valorFinal).toBe(45); // 40 + 5
        });

        it('Deve retornar 400 se o usuário não tiver saldo suficiente', async () => {
            axios.get.mockResolvedValue({
                data: { uf: 'CE' } // Frete CE = 40
            });

            // Maria (ID 2) tem saldo limitado. Um valor de compra alto vai estourar o orçamento.
            const response = await request(app)
                .post('/pedidos')
                .send({ usuarioId: 2, valorTotal: 200, cepDestino: '60000000' });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ erro: "Saldo insuficiente" });
        });

        it('Deve retornar 500 se o ViaCEP acusar CEP inválido', async () => {
            // Simula a propriedade 'erro' que o ViaCEP retorna em formato JSON
            axios.get.mockResolvedValue({
                data: { erro: true }
            });

            const response = await request(app)
                .post('/pedidos')
                .send({ usuarioId: 2, valorTotal: 10, cepDestino: '00000000' });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ erro: "Erro ao calcular frete externo" });
        });

        it('Deve retornar 500 se a API do ViaCEP falhar/estiver fora do ar', async () => {
            // Simula uma falha de conexão física/rede do Axios
            axios.get.mockRejectedValue(new Error('Network Error'));

            const response = await request(app)
                .post('/pedidos')
                .send({ usuarioId: 2, valorTotal: 10, cepDestino: '01001000' });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ erro: "Erro ao calcular frete externo" });
        });
    });
});