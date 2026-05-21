# API Express

### Como rodar

1. Instale os pacotes
```sh
npm install
```

2. Suba o servidor
```sh
npx nodemon
```

Pronto, API rodando em <http://localhost:3000>

### Endpoints
- `GET /pedidos` (listar os pedidos)
- `GET /pedidos/:id` (buscar dados de um pedido)
- `POST /pedidos` (cadastrar pedido)
```json
{
    "usuarioId": 1, 
    "valorTotal": 123, 
    "cepDestino": "60352590"
}
```