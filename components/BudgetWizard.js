'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Trash2, Plus, Check, FileText, ShoppingCart, RefreshCw, AlertTriangle } from 'lucide-react';
import { getCentros, getConvenios, getProcedimentosPreco } from '../services/orcamento';
import ConfirmDialog from './ConfirmDialog';
import { useSiteConfig } from '../lib/siteConfigContext';
import styles from './BudgetWizard.module.css';

// Remove acentos e caixa para comparar termos de busca.
const normalizeString = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
};

export default function BudgetWizard() {
  const {
    CLINIC_NOME,
    CLINIC_PHONE_DISPLAY_MATRIZ,
    CLINIC_PHONE_DISPLAY_FILIAL,
    CLINIC_ENDERECO_MATRIZ,
    CLINIC_ENDERECO_FILIAL,
  } = useSiteConfig();

  // Qual(is) unidade(s) tem backend configurado — igual ao padrão usado na
  // Área do Cliente (API_BASE_URL_* é server-only, por isso vem via API).
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState({ mostrarMatriz: true, mostrarFilial: false });
  const [selectedUnidade, setSelectedUnidade] = useState('matriz');

  // Lists from API
  const [convenios, setConvenios] = useState([]);
  const [procedures, setProcedures] = useState([]);

  // Flow Step State (1: Select Convenio, 2: Search and Cart)
  const [step, setStep] = useState(1);

  // Selection States
  const [selectedConvenio, setSelectedConvenio] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Cart State (array of { codProcedimento, procedimento, centro, valor })
  const [cart, setCart] = useState([]);

  // Client Info for PDF
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [loadingProcedures, setLoadingProcedures] = useState(false);
  const [error, setError] = useState(null);
  const [errorProcedures, setErrorProcedures] = useState(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Unidades configuradas (client-side, via API — API_BASE_URL_* não pode
  // ser lido direto no browser).
  useEffect(() => {
    fetch('/api/unidades')
      .then((res) => res.json())
      .then((data) => {
        setUnidadesDisponiveis(data);
        if (!data.mostrarMatriz && data.mostrarFilial) {
          setSelectedUnidade('filial');
        }
      })
      .catch(() => {});
  }, []);

  // Load Convenios (dependem da unidade escolhida)
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);
        const convs = await getConvenios(selectedUnidade);

        const cleanedConvs = (convs || []).map(c => ({
          codigo: c.codigo,
          convenio: (c.convenio || '').trim()
        }));

        setConvenios(cleanedConvs);

        const defaultConv = cleanedConvs.find(c => c.codigo === 100) || cleanedConvs[0];
        setSelectedConvenio(defaultConv ? defaultConv.codigo : '');
      } catch (err) {
        console.error("Erro ao carregar convênios:", err);
        setError("Não foi possível carregar os dados do servidor. Por favor, recarregue a página.");
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [selectedUnidade]);

  // Load Procedures when selected convenio changes
  useEffect(() => {
    if (!selectedConvenio) return;

    async function loadProcedures() {
      try {
        setLoadingProcedures(true);
        setErrorProcedures(null);
        const procs = await getProcedimentosPreco(selectedUnidade, selectedConvenio);

        const cleanedProcs = (procs || []).map(p => ({
          ...p,
          convenio: (p.convenio || '').trim(),
          centro: (p.centro || '').trim(),
          procedimento: (p.procedimento || '').trim(),
        }));

        setProcedures(cleanedProcs);
      } catch (err) {
        console.error("Erro ao carregar procedimentos:", err);
        setErrorProcedures("Não foi possível carregar os exames para o convênio selecionado.");
      } finally {
        setLoadingProcedures(false);
      }
    }

    loadProcedures();
  }, [selectedConvenio, selectedUnidade]);

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }

    setClientPhone(value);
  };

  // In-memory Filtered Procedures (limited a 50 para performance)
  const filteredProcedures = useMemo(() => {
    if (!procedures) return [];

    const normalizedTerm = normalizeString(searchTerm);

    return procedures.filter(p => {
      if (!normalizedTerm) return true;

      const normalizedProc = normalizeString(p.procedimento);
      const normalizedCode = normalizeString(p.codProcedimento);

      return (
        normalizedProc.includes(normalizedTerm) ||
        normalizedCode.includes(normalizedTerm)
      );
    }).slice(0, 50);
  }, [procedures, searchTerm]);

  // Atualiza os itens do carrinho com os valores atuais (caso o convênio mude)
  const cartItems = useMemo(() => {
    return cart.map(cartItem => {
      const match = procedures.find(p => p.codProcedimento === cartItem.codProcedimento);
      if (match) {
        return {
          codProcedimento: cartItem.codProcedimento,
          procedimento: match.procedimento,
          centro: match.centro,
          valor: match.valor,
          indisponivel: false
        };
      }
      return {
        ...cartItem,
        valor: 0,
        indisponivel: true
      };
    });
  }, [cart, procedures]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.valor || 0), 0);
  }, [cartItems]);

  const scrollToCart = () => {
    const cartElement = document.getElementById('cart-section');
    if (cartElement) {
      cartElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleToggleCart = (exam) => {
    const exists = cart.some(item => item.codProcedimento === exam.codProcedimento);
    if (exists) {
      setCart(prev => prev.filter(item => item.codProcedimento !== exam.codProcedimento));
    } else {
      setCart(prev => [...prev, {
        codProcedimento: exam.codProcedimento,
        procedimento: exam.procedimento,
        centro: exam.centro,
        valor: exam.valor
      }]);
    }
  };

  const handleRemoveFromCart = (codProcedimento) => {
    setCart(prev => prev.filter(item => item.codProcedimento !== codProcedimento));
  };

  const handleClearCart = () => {
    setCart([]);
    setConfirmClearOpen(false);
  };

  // Generate PDF
  const handleGeneratePDF = async () => {
    if (cart.length === 0) return;

    try {
      setPdfGenerating(true);

      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const convenioName = convenios.find(c => c.codigo === Number(selectedConvenio))?.convenio || 'Particular';
      const endereco = selectedUnidade === 'filial' ? CLINIC_ENDERECO_FILIAL : CLINIC_ENDERECO_MATRIZ;
      const telefone = selectedUnidade === 'filial' ? CLINIC_PHONE_DISPLAY_FILIAL : CLINIC_PHONE_DISPLAY_MATRIZ;

      const primaryColor = [14, 107, 95];
      const secondaryColor = [29, 160, 140];
      const greenColor = [29, 160, 140];

      doc.setFillColor(244, 250, 249);
      doc.rect(0, 0, 210, 40, 'F');

      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(1.5);
      doc.line(0, 40, 210, 40);

      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(CLINIC_NOME.toUpperCase(), 15, 18);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      doc.text(endereco, 15, 25);
      doc.text(`Contato/WhatsApp: ${telefone}`, 15, 30);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("ORÇAMENTO DE PROCEDIMENTOS E EXAMES", 15, 52);

      doc.setFillColor(greenColor[0], greenColor[1], greenColor[2]);
      doc.rect(15, 55, 25, 1.5, 'F');

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(50, 50, 50);

      const dateStr = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      doc.setFont('Helvetica', 'bold');
      doc.text("Paciente:", 15, 65);
      doc.setFont('Helvetica', 'normal');
      doc.text(clientName || "Não Informado", 32, 65);

      doc.setFont('Helvetica', 'bold');
      doc.text("Telefone:", 15, 71);
      doc.setFont('Helvetica', 'normal');
      doc.text(clientPhone || "Não Informado", 32, 71);

      doc.setFont('Helvetica', 'bold');
      doc.text("Convênio:", 120, 65);
      doc.setFont('Helvetica', 'normal');
      doc.text(convenioName, 140, 65);

      doc.setFont('Helvetica', 'bold');
      doc.text("Emissão:", 120, 71);
      doc.setFont('Helvetica', 'normal');
      doc.text(dateStr, 140, 71);

      const tableRows = cartItems.map((item, index) => [
        String(index + 1).padStart(2, '0'),
        item.codProcedimento,
        item.procedimento,
        item.centro,
        item.indisponivel ? 'Não coberto' : `R$ ${item.valor.toFixed(2).replace('.', ',')}`
      ]);

      autoTable(doc, {
        startY: 78,
        head: [['Item', 'Código', 'Procedimento / Exame', 'Área / Centro', 'Valor']],
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: [14, 107, 95],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [40, 40, 40]
        },
        columnStyles: {
          0: { width: 10, halign: 'center' },
          1: { width: 22 },
          2: { width: 85 },
          3: { width: 45 },
          4: { width: 28, halign: 'right' }
        },
        margin: { left: 15, right: 15 }
      });

      const finalY = (doc.lastAutoTable?.finalY || doc.previousAutoTable?.finalY || 80) + 8;

      doc.setFillColor(244, 250, 249);
      doc.setDrawColor(227, 229, 232);
      doc.rect(130, finalY, 65, 12, 'FD');

      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("VALOR TOTAL:", 134, finalY + 7.5);

      doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
      doc.setFontSize(13);
      doc.text(`R$ ${cartTotal.toFixed(2).replace('.', ',')}`, 164, finalY + 7.5);

      const noteY = finalY + 22;
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text("Informações Importantes:", 15, noteY);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);

      const notes = [
        "1. Este orçamento é informativo, baseado na tabela de valores vigente e convênio selecionado.",
        "2. Validade deste orçamento: 15 dias a partir da data de emissão.",
        "3. Alguns exames laboratoriais ou de imagem necessitam de preparo especial (como jejum completo,",
        "   suspensão temporária de medicamentos ou ingestão prévia de água). Por favor, entre em contato para orientações.",
        `4. Para agendar seus exames, utilize o agendamento online no site ou entre em contato via WhatsApp pelo ${telefone}.`
      ];

      notes.forEach((note, idx) => {
        doc.text(note, 15, noteY + 5 + (idx * 4));
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        doc.text(`${CLINIC_NOME} - Cuidando de você e da sua família com carinho e confiança.`, 15, 287);
        doc.text(`Página ${i} de ${pageCount}`, 180, 287);
      }

      const fileName = `Orcamento_${clientName ? clientName.replace(/\s+/g, '_') : CLINIC_NOME.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);

    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Houve um erro ao gerar o arquivo PDF. Por favor, tente novamente.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const mostrarSeletorUnidade = unidadesDisponiveis.mostrarMatriz && unidadesDisponiveis.mostrarFilial;

  if (loading) {
    return (
      <div className={styles.loadingText}>
        <RefreshCw className="animate-spin" style={{ margin: '0 auto 1rem', animation: 'spin 1.5s linear infinite' }} size={32} />
        <p>Carregando convênios e exames disponíveis...</p>
        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.emptyState}>
        <AlertTriangle size={48} style={{ color: 'var(--error)', marginBottom: '1rem' }} />
        <p>{error}</p>
      </div>
    );
  }

  // Step 1: Select Unidade (se houver mais de uma) + Convênio
  if (step === 1) {
    return (
      <div className={styles.step1Container}>
        <div className={styles.step1Card}>
          {mostrarSeletorUnidade && (
            <div className={styles.selectorGroup} style={{ marginBottom: '1.5rem' }}>
              <label className={styles.selectorLabel}>Unidade</label>
              <select
                value={selectedUnidade}
                onChange={(e) => setSelectedUnidade(e.target.value)}
                className={styles.selectInput}
              >
                <option value="matriz">Unidade Matriz</option>
                <option value="filial">Unidade Filial</option>
              </select>
            </div>
          )}
          <h3 className={styles.step1Title}>Selecione seu Convênio</h3>
          <p className={styles.step1Subtitle}>
            Para iniciarmos seu orçamento, selecione o seu plano ou convênio de atendimento abaixo.
          </p>
          <div className={styles.selectorGroup} style={{ marginBottom: '2rem' }}>
            <select
              value={selectedConvenio}
              onChange={(e) => setSelectedConvenio(e.target.value)}
              className={styles.selectInput}
              style={{ fontSize: '1.05rem' }}
            >
              <option value="" disabled>Escolha um convênio...</option>
              {convenios.map(c => (
                <option key={c.codigo} value={c.codigo}>
                  {c.convenio}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setStep(2)}
            className="btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }}
            disabled={!selectedConvenio}
          >
            Avançar
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Search Exams & Cart
  const convenioName = convenios.find(c => c.codigo === Number(selectedConvenio))?.convenio || 'Particular';

  return (
    <div className={styles.container}>
      <div className={styles.searchSection}>
        <div className={styles.stepHeader}>
          <div className={styles.convenioBadge}>
            Convênio Selecionado: <strong>{convenioName}</strong>
          </div>
          <button
            onClick={() => setStep(1)}
            className={styles.changeConvenioBtn}
          >
            Alterar Convênio
          </button>
        </div>

        <div className={styles.selectorGroup}>
          <label className={styles.selectorLabel}>Busque os exames ou consultas</label>
          <div className={styles.searchBoxWrapper}>
            <Search className={styles.searchIcon} size={20} />
            <input
              type="text"
              placeholder="Digite o nome do exame ou código (Ex: Hemograma, Urina, Ultrassom...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        <div className={styles.selectorGroup}>
          <label className={styles.selectorLabel}>
            Exames Disponíveis ({filteredProcedures.length} de {procedures.length})
          </label>

          {loadingProcedures ? (
            <div className={styles.loadingText}>
              <RefreshCw className="animate-spin" style={{ margin: '0 auto 1rem', animation: 'spin 1.5s linear infinite' }} size={24} />
              <p>Atualizando tabela de preços...</p>
            </div>
          ) : errorProcedures ? (
            <div className={styles.emptyState}>
              <p>{errorProcedures}</p>
            </div>
          ) : filteredProcedures.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Nenhum procedimento encontrado com o termo digitado.</p>
            </div>
          ) : (
            <div className={styles.resultsContainer}>
              {filteredProcedures.map(exam => {
                const isInCart = cart.some(item => item.codProcedimento === exam.codProcedimento);
                return (
                  <div
                    key={exam.codProcedimento}
                    className={`${styles.resultCard} ${isInCart ? styles.resultCardSelected : ''}`}
                    onClick={() => handleToggleCart(exam)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.examDetails}>
                      <span className={styles.examName}>{exam.procedimento}</span>
                      <span className={styles.examCategory}>{exam.centro}</span>
                    </div>
                    <div className={styles.examAction}>
                      <span className={styles.examPrice}>
                        R$ {exam.valor.toFixed(2).replace('.', ',')}
                      </span>
                      <div
                        className={`${styles.addButton} ${isInCart ? styles.addButtonAdded : ''}`}
                        title={isInCart ? "Remover do Orçamento" : "Adicionar ao Orçamento"}
                      >
                        {isInCart ? <Check size={18} /> : <Plus size={18} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div id="cart-section" className={styles.cartSection}>
        <div className={styles.cartCard}>
          <div className={styles.cartHeader}>
            <h3 className={styles.cartTitle}>
              <ShoppingCart size={20} />
              Seu Orçamento
            </h3>
            <span className={styles.cartCount}>{cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}</span>
          </div>

          {cartItems.length === 0 ? (
            <div className={styles.emptyState} style={{ padding: '2rem 1rem' }}>
              <p>Nenhum exame selecionado ainda.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                Pesquise ao lado e clique em &ldquo;+&rdquo; para adicionar exames a este orçamento.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.cartItemsList}>
                {cartItems.map(item => (
                  <div key={item.codProcedimento} className={styles.cartItem}>
                    <div className={styles.cartItemInfo}>
                      <div className={styles.cartItemName}>{item.procedimento}</div>
                      <div className={styles.cartItemCategory}>{item.centro}</div>
                      {item.indisponivel && (
                        <div style={{ color: 'var(--error)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.1rem' }}>
                          <AlertTriangle size={10} /> Não coberto por este convênio
                        </div>
                      )}
                    </div>
                    <div className={styles.cartItemRight}>
                      <span className={styles.cartItemPrice} style={{ color: item.indisponivel ? 'var(--text-muted)' : 'inherit' }}>
                        {item.indisponivel ? '—' : `R$ ${item.valor.toFixed(2).replace('.', ',')}`}
                      </span>
                      <button
                        onClick={() => handleRemoveFromCart(item.codProcedimento)}
                        className={styles.removeBtn}
                        title="Remover item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.cartTotal}>
                <span>Total:</span>
                <span className={styles.totalValue}>R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
              </div>

              <div className={styles.formGroup}>
                <div style={{ fontSize: '0.825rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--foreground)' }}>
                  Personalizar Orçamento (Opcional):
                </div>

                <div className={styles.formField}>
                  <label htmlFor="patient-name">Nome Completo</label>
                  <input
                    id="patient-name"
                    type="text"
                    placeholder="Nome do Paciente"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>

                <div className={styles.formField}>
                  <label htmlFor="patient-phone">WhatsApp / Telefone</label>
                  <input
                    id="patient-phone"
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={clientPhone}
                    onChange={handlePhoneChange}
                  />
                </div>
              </div>

              <button
                onClick={handleGeneratePDF}
                disabled={pdfGenerating || cartItems.length === 0}
                className={styles.submitBtn}
              >
                {pdfGenerating ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} style={{ animation: 'spin 1.5s linear infinite' }} />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    Gerar PDF do Orçamento
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button onClick={() => setConfirmClearOpen(true)} className={styles.clearCartBtn}>
                  Limpar todos os itens
                </button>
              </div>

              <p className={styles.cartFooterNote}>
                * Orçamento gerado de acordo com a tabela selecionada. Valores sujeitos a alteração no momento do atendimento.
              </p>
            </>
          )}
        </div>
      </div>
      {cart.length > 0 && (
        <button
          onClick={scrollToCart}
          className={styles.floatingCartBtn}
          aria-label="Ver Orçamento"
        >
          <ShoppingCart size={18} />
          <span>Ver Orçamento ({cart.length})</span>
        </button>
      )}

      <ConfirmDialog
        open={confirmClearOpen}
        title="Limpar orçamento"
        message="Tem certeza que deseja remover todos os itens do seu orçamento?"
        confirmLabel="Limpar tudo"
        danger
        onConfirm={handleClearCart}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
