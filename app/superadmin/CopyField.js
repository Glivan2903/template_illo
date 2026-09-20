'use client';

import { useState } from 'react';
import { Copy, Check, ClipboardCopy } from 'lucide-react';
import styles from './superadmin.module.css';
import fieldStyles from '../admin/admin.module.css';

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // clipboard indisponível (ex.: contexto não seguro) — o valor ainda
    // está visível na tela pra copiar manualmente.
    return false;
  }
}

// Texto pronto pra colar num e-mail/WhatsApp pro cliente — junta tudo que
// ele precisa pra acessar o site e o painel admin da empresa dele.
export function buildAccessText({ nome, link, adminUser, adminPassword }) {
  const lines = [`Acesso — ${nome}`, ''];
  if (link) {
    lines.push(`Site: ${link}`);
    lines.push(`Painel admin: ${link}/admin`);
    lines.push('');
  }
  lines.push(`Usuário: ${adminUser}`);
  lines.push(`Senha: ${adminPassword}`);
  return lines.join('\n');
}

// Bloco vertical (label em cima, valor + copiar embaixo) — painel de
// "empresa criada" e cabeçalho do detalhe da empresa.
export function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (await copyText(value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className={styles.copyField}>
      <span className={styles.copyFieldLabel}>{label}</span>
      <div className={styles.copyFieldRow}>
        <code>{value}</code>
        <button type="button" onClick={handleClick} aria-label={`Copiar ${label}`}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

// Valor + ícone de copiar numa linha só — células de tabela, onde o espaço
// vertical é mais apertado.
export function CopyInline({ value }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (await copyText(value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <span className={styles.copyInline}>
      <code>{value}</code>
      <button type="button" onClick={handleClick} aria-label="Copiar">
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </span>
  );
}

// Ícone isolado (sem valor visível ao lado) — atalho rápido de copiar,
// usado na linha da tabela de empresas pra copiar só o link, sem precisar
// abrir o detalhe.
export function CopyIconButton({ value, label = 'Copiar link', size = 13 }) {
  const [copied, setCopied] = useState(false);

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (await copyText(value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <button type="button" className={styles.copyIconBtn} onClick={handleClick} aria-label={label} title={label}>
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
}

// Botão "copiar tudo" — junta site, painel admin, usuário e senha num texto
// só, pronto pra colar e mandar pro cliente.
export function CopyAllButton({ nome, link, adminUser, adminPassword, className }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const text = buildAccessText({ nome, link, adminUser, adminPassword });
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <button type="button" className={className || fieldStyles.secondaryBtn} onClick={handleClick}>
      {copied ? <Check size={13} /> : <ClipboardCopy size={13} />}
      {copied ? 'Copiado!' : 'Copiar dados de acesso'}
    </button>
  );
}
