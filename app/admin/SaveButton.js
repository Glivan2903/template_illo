'use client';

// Fica desabilitado até a seção ter alguma alteração de novo (dirty) — e
// enquanto o Server Action está em voo (pending) — para não deixar salvar
// "no vazio" nem disparar o mesmo salvamento duas vezes.
export default function SaveButton({ pending, dirty, label, pendingLabel = 'Salvando...' }) {
  return (
    <button type="submit" className="btn-primary" disabled={pending || !dirty}>
      {pending ? pendingLabel : label}
    </button>
  );
}
