// Lista de unidades conhecida tanto pelo client quanto pelo server — sem
// nenhuma URL aqui (isso fica só em lib/unidades.js, que é server-only).
// Cada unidade tem seu próprio backend/banco no ClinVida, sem nenhum dado
// compartilhado entre elas.
export const UNIDADES_INFO = [
  { id: 'matriz', nome: 'Matriz' },
  { id: 'filial', nome: 'Filial' },
];
