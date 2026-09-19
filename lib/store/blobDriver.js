// Driver de storage para Vercel: as functions serverless têm filesystem
// somente-leitura/efêmero, então usamos o Vercel Blob para persistir os
// mesmos documentos JSON (não é um banco de dados — é um "disco" remoto).
// Ativado automaticamente quando BLOB_READ_WRITE_TOKEN está definido.
//
// Observação: a forma exata de tratar "não encontrado" no @vercel/blob pode
// variar entre versões do SDK — se `head()` não lançar um erro reconhecível
// aqui, ajuste o catch abaixo conforme a versão instalada.
import { put, head } from '@vercel/blob';

function storeKey(name) {
  return `store/${name}.json`;
}

export async function readFile(name) {
  try {
    const info = await head(storeKey(name), { token: process.env.BLOB_READ_WRITE_TOKEN });
    const response = await fetch(info.url, { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    const notFound =
      error?.name === 'BlobNotFoundError' ||
      error?.status === 404 ||
      /not.?found/i.test(error?.message || '');
    if (notFound) return null;
    throw error;
  }
}

export async function writeFile(name, data) {
  await put(storeKey(name), JSON.stringify(data, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}

export async function saveUpload(filename, buffer, contentType) {
  const blob = await put(`uploads/${filename}`, buffer, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}
