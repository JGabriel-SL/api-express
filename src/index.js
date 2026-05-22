const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor DEUS rodando na porta ${PORT}`);
  console.log(`⚠️  Cuidado: Contém alta concentração de acoplamento e gambiarras.`);
});