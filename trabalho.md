# Trabalho Prático: Refatoração, Testes Contínuos e Resiliência de APIs
## Disciplina: Testes Automatizados e Contínuos
### Curso: Pós-Graduação em Engenharia de Software com Foco em DevOps

---

## Objetivo do Trabalho
O objetivo deste trabalho prático é transformar um "Código Deus" (uma API Express monolítica, altamente acoplada e frágil) em um microsserviço resiliente, testável e pronto para operar de forma segura em uma esteira de **CI/CD (Continuous Integration / Continuous Delivery)**. 

Vocês colocarão em prática os conceitos de **Cultura Shift-Left**, **Design para Testabilidade**, **Isolamento de Dependências (Mocks/Stubs)** e **Métricas de Qualidade**.

---

## Parte 1: Refatoração e Arquitetura

O código fornecido (`app.js`) possui diversos anti-padrões de desenvolvimento que inviabilizam a automação confiável de testes e geram riscos catastróficos em produção (como *Race Conditions*, falta de tratamento de erros e dependência direta de APIs externas).

> **Entregável:** 
> - Subir 1 Pull Request com as intervenções de código:
>     - Isolamento das funcionalidades 
>     - Cobertura de testes unitários
>     - Cobertura de testes de integração (testes de API)
> - Fazer um slide explicando as principais intervenções e apresentar a cobertura de testes alcançada
