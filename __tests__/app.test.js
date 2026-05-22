const request = require('supertest');

jest.mock('axios');

describe('API de pedidos', () => {
  let app;
  let axios;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    axios = require('axios');
    app = require('../app');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('GET /pedidos', () => {
    it('retorna todos os pedidos cadastrados', async () => {
      const response = await request(app).get('/pedidos');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { id: 1, usuarioId: 1, valorFinal: 85, status: 'APROVADO' },
        { id: 2, usuarioId: 2, valorFinal: 105, status: 'APROVADO' },
        { id: 3, usuarioId: 99, valorFinal: 30, status: 'APROVADO' },
      ]);
    });
  });

  describe('GET /pedidos/:id', () => {
    it('retorna o pedido com o nome do cliente quando existe', async () => {
      const response = await request(app).get('/pedidos/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        pedido: { id: 1, usuarioId: 1, valorFinal: 85, status: 'APROVADO' },
        cliente: 'João Silva',
      });
    });

    it('retorna 404 quando o pedido não existe', async () => {
      const response = await request(app).get('/pedidos/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ erro: 'Pedido não encontrado' });
    });

    it('retorna 404 quando o dono do pedido não existe', async () => {
      const response = await request(app).get('/pedidos/3');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ erro: 'Dono do pedido não encontrado' });
    });
  });

  describe('POST /pedidos', () => {
    it('retorna 400 quando campos obrigatórios não são enviados', async () => {
      const response = await request(app)
        .post('/pedidos')
        .send({ usuarioId: 1, valorTotal: 100 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        erro: 'Dados inválidos: usuarioId, valorTotal e cepDestino são obrigatórios',
      });
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('retorna 404 quando o usuário não existe', async () => {
      const response = await request(app)
        .post('/pedidos')
        .send({ usuarioId: 999, valorTotal: 100, cepDestino: '01001000' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ erro: 'Usuário não encontrado' });
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('cria pedido para usuário normal com frete de São Paulo', async () => {
      axios.get.mockResolvedValue({ data: { uf: 'SP' } });

      const response = await request(app)
        .post('/pedidos')
        .send({ usuarioId: 2, valorTotal: 30, cepDestino: '01001000' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 4,
        usuarioId: 2,
        valorFinal: 35,
        status: 'APROVADO',
      });
      expect(axios.get).toHaveBeenCalledWith('https://viacep.com.br/ws/01001000/json/');
    });

    it('cria pedido para usuário normal com frete padrão quando UF não tem regra específica', async () => {
      axios.get.mockResolvedValue({ data: { uf: 'RJ' } });

      const response = await request(app)
        .post('/pedidos')
        .send({ usuarioId: 2, valorTotal: 20, cepDestino: '20040002' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 4,
        usuarioId: 2,
        valorFinal: 40,
        status: 'APROVADO',
      });
    });

    it('cria pedido para usuário VIP aplicando desconto e frete de São Paulo', async () => {
      axios.get.mockResolvedValue({ data: { uf: 'SP' } });

      const response = await request(app)
        .post('/pedidos')
        .send({ usuarioId: 1, valorTotal: 100, cepDestino: '01001000' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 4,
        usuarioId: 1,
        valorFinal: 45,
        status: 'APROVADO',
      });
    });

    it('cria pedido para usuário VIP aplicando desconto e frete do Ceará', async () => {
      axios.get.mockResolvedValue({ data: { uf: 'CE' } });

      const response = await request(app)
        .post('/pedidos')
        .send({ usuarioId: 1, valorTotal: 100, cepDestino: '60000000' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 4,
        usuarioId: 1,
        valorFinal: 80,
        status: 'APROVADO',
      });
    });

    it('retorna 400 quando o saldo do usuário é insuficiente', async () => {
      axios.get.mockResolvedValue({ data: { uf: 'CE' } });

      const response = await request(app)
        .post('/pedidos')
        .send({ usuarioId: 2, valorTotal: 20, cepDestino: '60000000' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ erro: 'Saldo insuficiente' });
    });

    it('retorna 500 quando o ViaCEP informa CEP inválido', async () => {
      axios.get.mockResolvedValue({ data: { erro: true } });

      const response = await request(app)
        .post('/pedidos')
        .send({ usuarioId: 1, valorTotal: 100, cepDestino: '00000000' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ erro: 'Erro ao calcular frete externo' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching CEP:', 'CEP inválido');
    });

    it('retorna 500 quando a consulta ao ViaCEP falha', async () => {
      axios.get.mockRejectedValue(new Error('timeout'));

      const response = await request(app)
        .post('/pedidos')
        .send({ usuarioId: 1, valorTotal: 100, cepDestino: '01001000' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ erro: 'Erro ao calcular frete externo' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching CEP:', 'timeout');
    });
  });
});
