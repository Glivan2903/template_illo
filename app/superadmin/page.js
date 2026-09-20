import { Building2, Globe, KeyRound, ToggleLeft } from 'lucide-react';
import { listEmpresas, getEmpresaSettings } from '../../lib/platform/db';
import EmpresasPorMesChart from './EmpresasPorMesChart';
import ModulosUsoChart from './ModulosUsoChart';
import chartStyles from './charts.module.css';
import styles from './superadmin.module.css';
import fieldStyles from '../admin/admin.module.css';

const FLAG_LABELS = [
  { key: 'sobre', label: 'Sobre Nós' },
  { key: 'especialidades', label: 'Especialidades' },
  { key: 'cta', label: 'Chamada final' },
  { key: 'profissionais', label: 'Profissionais' },
  { key: 'orcamento', label: 'Orçamento' },
  { key: 'agendamento', label: 'Agendamento' },
  { key: 'areaCliente', label: 'Área do Cliente' },
  { key: 'centralAgendamento', label: 'Central de Agendamento' },
  { key: 'chat', label: 'Chat — Sofia' },
  { key: 'chatFlutuante', label: 'Chat flutuante' },
];

function ultimosNMeses(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('pt-BR', { month: 'short' }) });
  }
  return out;
}

export default async function SuperadminDashboardPage() {
  const empresas = listEmpresas();
  const settingsPorEmpresa = await Promise.all(empresas.map((e) => getEmpresaSettings(e.slug)));

  const totalEmpresas = empresas.length;
  const comDominioProprio = empresas.filter((e) => e.dominio_customizado).length;
  const comOpenAI = settingsPorEmpresa.filter((s) => s.openai?.apiKey).length;
  const mediaModulos =
    totalEmpresas === 0
      ? 0
      : Math.round(
          (settingsPorEmpresa.reduce((acc, s) => {
            const flags = s.featureFlags || {};
            return acc + FLAG_LABELS.filter(({ key }) => flags[key] !== false).length;
          }, 0) /
            totalEmpresas) *
            10
        ) / 10;

  const meses = ultimosNMeses(6);
  const porMes = meses.map(({ key, label }) => ({
    label,
    value: empresas.filter((e) => {
      const d = new Date(e.created_at);
      return `${d.getFullYear()}-${d.getMonth()}` === key;
    }).length,
  }));

  const usoModulos = FLAG_LABELS.map(({ key, label }) => ({
    label,
    percent:
      totalEmpresas === 0
        ? 0
        : Math.round((settingsPorEmpresa.filter((s) => (s.featureFlags || {})[key] !== false).length / totalEmpresas) * 100),
  }));

  return (
    <div>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div className={fieldStyles.statTile}>
          <span className={fieldStyles.statLabel}>
            <Building2 size={14} /> Empresas
          </span>
          <span className={fieldStyles.statValue}>{totalEmpresas}</span>
        </div>
        <div className={fieldStyles.statTile}>
          <span className={fieldStyles.statLabel}>
            <Globe size={14} /> Domínio próprio
          </span>
          <span className={fieldStyles.statValue}>{comDominioProprio}</span>
        </div>
        <div className={fieldStyles.statTile}>
          <span className={fieldStyles.statLabel}>
            <KeyRound size={14} /> Com chave OpenAI
          </span>
          <span className={fieldStyles.statValue}>{comOpenAI}</span>
        </div>
        <div className={fieldStyles.statTile}>
          <span className={fieldStyles.statLabel}>
            <ToggleLeft size={14} /> Média de módulos ativos
          </span>
          <span className={fieldStyles.statValue}>{mediaModulos}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        <EmpresasPorMesChart data={porMes} />
        <ModulosUsoChart data={usoModulos} />
      </div>
    </div>
  );
}
