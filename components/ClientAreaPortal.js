'use client';

import { useState, useEffect, useRef } from 'react';
import EcgLine from './EcgLine';
import { gsap, useGSAP } from '../lib/gsap';
import styles from './ClientAreaPortal.module.css';
import {
  getPaciente,
  getHistorico,
  cancelarAgendamento,
  getCentros,
  getProfissionais,
  getDias,
  getHorarios,
  getAgendasLivres,
  reagendarAgendamento,
  fanOutUnidades
} from '../services/api';
import { UNIDADES_INFO } from '../lib/unidadesInfo';
import { useSiteConfig } from '../lib/siteConfigContext';

function nomeUnidade(unidadeId) {
  return UNIDADES_INFO.find((u) => u.id === unidadeId)?.nome || unidadeId;
}
import {
  Calendar,
  Clock,
  User,
  Activity,
  LogOut,
  Phone,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  Trash2,
  Lock
} from 'lucide-react';

// Extraído de app/area-cliente/page.js para ser reaproveitado também na aba
// "Minhas Consultas" da Central de Agendamento (app/central-agendamento) —
// login por telefone, histórico, cancelamento e reagendamento, com o mesmo
// modal de confirmação customizado (sem window.confirm).
export default function ClientAreaPortal() {
  const { TEXTOS } = useSiteConfig();
  const [phoneInput, setPhoneInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Patient and history data
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);

  // Reschedule Wizard States
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [reschedulingItem, setReschedulingItem] = useState(null);
  const [rescheduleStep, setRescheduleStep] = useState(1);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Reschedule selection data
  const [centros, setCentros] = useState([]);
  const [selectedCentro, setSelectedCentro] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [selectedProfissional, setSelectedProfissional] = useState(null);
  const [agendas, setAgendas] = useState([]);
  const [selectedAgenda, setSelectedAgenda] = useState(null);

  // Custom Alert / Confirm Dialog State
  const [dialog, setDialog] = useState({
    show: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: null,
    onCancel: null
  });

  const cardRef = useRef(null);
  const viewRef = useRef(null);
  const rescheduleModalRef = useRef(null);
  const dialogRef = useRef(null);

  // Entrada do cartão e troca login ↔ painel ("swap", §5.4).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (viewRef.current) {
          gsap.fromTo(viewRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 });
        }
      });
    },
    { dependencies: [isAuthenticated] }
  );

  // Entrada dos modais.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (showRescheduleModal && rescheduleModalRef.current) {
          gsap.fromTo(
            rescheduleModalRef.current,
            { opacity: 0, y: 12, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: 'power3.out' }
          );
        }
        if (dialog.show && dialogRef.current) {
          gsap.fromTo(
            dialogRef.current,
            { opacity: 0, y: 10, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'power3.out' }
          );
        }
      });
    },
    { dependencies: [showRescheduleModal, dialog.show] }
  );

  // Auto-fill phone on page load if saved in localStorage
  useEffect(() => {
    const savedPhone = localStorage.getItem('clinicaTemplate_patientPhone');
    if (savedPhone) {
      setPhoneInput(savedPhone);
    }
  }, []);

  const handleLogin = async (e, directPhone = null) => {
    if (e) e.preventDefault();
    const phoneToQuery = directPhone || phoneInput;
    const cleanPhone = phoneToQuery.replace(/\D/g, '');

    if (cleanPhone.length < 8) {
      setError('Por favor, informe um telefone válido com DDD.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Busca histórico e cadastro nas duas unidades em paralelo — o
      // paciente pode ter consultas em qualquer uma delas, e não deveria
      // precisar saber (ou lembrar) em qual. Uma unidade fora do ar não
      // impede a outra de responder (fanOutUnidades usa Promise.allSettled).
      const [historicoPorUnidade, pacientePorUnidade] = await Promise.all([
        fanOutUnidades(getHistorico, cleanPhone),
        fanOutUnidades(getPaciente, cleanPhone),
      ]);

      const historyData = historicoPorUnidade.flatMap(({ unidadeId, dados }) =>
        (dados || []).map((item) => ({ ...item, unidade: unidadeId }))
      );

      // Nome do paciente: usa o primeiro cadastro encontrado, na ordem
      // Matriz → Filial — as duas bases não compartilham cadastro entre si.
      let patientName = '';
      for (const { dados } of pacientePorUnidade) {
        if (dados && dados.length > 0 && dados[0].CLI_NOME) {
          patientName = dados[0].CLI_NOME;
          break;
        }
      }

      if (historyData.length === 0 && !patientName) {
        setError('Nenhum agendamento ou cadastro encontrado para este telefone. Por favor, verifique o número.');
        setLoading(false);
        return;
      }

      // Sort appointments by date desc
      const sorted = historyData.sort((a, b) => new Date(b.hmaData) - new Date(a.hmaData));
      setAppointments(sorted);

      setPatient({
        CLI_NOME: patientName || 'Paciente',
        CLI_CELULAR: cleanPhone
      });

      localStorage.setItem('clinicaTemplate_patientPhone', cleanPhone);
      setIsAuthenticated(true);
    } catch (err) {
      setError('Erro ao carregar os dados. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('clinicaTemplate_patientPhone');
    setPatient(null);
    setAppointments([]);
    setIsAuthenticated(false);
    setPhoneInput('');
    setError(null);
  };

  const refreshHistory = async (phoneToQuery) => {
    const cleanPhone = phoneToQuery || patient?.CLI_CELULAR?.replace(/\D/g, '') || localStorage.getItem('clinicaTemplate_patientPhone');
    if (!cleanPhone) return;

    try {
      const historicoPorUnidade = await fanOutUnidades(getHistorico, cleanPhone);
      const historyData = historicoPorUnidade.flatMap(({ unidadeId, dados }) =>
        (dados || []).map((item) => ({ ...item, unidade: unidadeId }))
      );
      // Sort appointments by date desc
      const sorted = historyData.sort((a, b) => new Date(b.hmaData) - new Date(a.hmaData));
      setAppointments(sorted);
    } catch (err) {
      console.error('Erro ao recarregar histórico:', err);
    }
  };

  const handleCancel = (item) => {
    setDialog({
      show: true,
      title: 'Confirmar Cancelamento',
      message: `Deseja realmente cancelar a consulta de ${item.exaDescricao} com ${item.profissional}?`,
      type: 'confirm',
      onConfirm: async () => {
        setDialog(prev => ({ ...prev, show: false }));
        await executeCancel(item);
      },
      onCancel: () => setDialog(prev => ({ ...prev, show: false }))
    });
  };

  const executeCancel = async (item) => {
    setLoading(true);
    try {
      const dateParts = formatDateToDDMMYYYY(item.hmaData);
      const payload = {
        agd_codigo: item.agdCodigo,
        hdi_codigo: item.hdiCodigo,
        hma_numero: item.hmaNumero,
        data: dateParts
      };

      const res = await cancelarAgendamento(item.unidade, payload);
      if (res && res[0] && res[0].OK === 1) {
        setDialog({
          show: true,
          title: 'Cancelado com Sucesso',
          message: 'Agendamento cancelado com sucesso!',
          type: 'alert',
          onConfirm: () => setDialog(prev => ({ ...prev, show: false }))
        });
        await refreshHistory();
      } else {
        setDialog({
          show: true,
          title: 'Erro',
          message: 'Erro ao cancelar o agendamento.',
          type: 'alert',
          onConfirm: () => setDialog(prev => ({ ...prev, show: false }))
        });
      }
    } catch (err) {
      setDialog({
        show: true,
        title: 'Erro',
        message: 'Ocorreu um erro ao processar o cancelamento.',
        type: 'alert',
        onConfirm: () => setDialog(prev => ({ ...prev, show: false }))
      });
    } finally {
      setLoading(false);
    }
  };

  // Rescheduling Flow
  const startReschedule = async (item) => {
    setReschedulingItem(item);
    setShowRescheduleModal(true);
    setRescheduleStep(1);
    setRescheduleLoading(true);
    setSelectedCentro(null);
    setSelectedProfissional(null);
    setSelectedAgenda(null);
    setAgendas([]);

    try {
      // O reagendamento fica preso à mesma unidade da consulta original — é
      // ali que ela existe, sem fan-out nas duas.
      const unidade = item.unidade;
      const allCentros = await getCentros(unidade);
      setCentros((allCentros || []).map((c) => ({ ...c, unidade })));

      // Auto-match specialty
      const matchedCentro = (allCentros || []).find(c =>
        c.CEN_DESCRICAO.toLowerCase() === item.centro.toLowerCase()
      );

      if (matchedCentro) {
        const centroComUnidade = { ...matchedCentro, unidade };
        setSelectedCentro(centroComUnidade);
        // Load professionals for center
        const profs = await getProfissionais(unidade, matchedCentro.CEN_CODIGO);
        setProfissionais(profs || []);

        // Auto-match professional name
        const matchedProf = profs.find(p =>
          p.PROF_NOME.toLowerCase() === item.profissional.toLowerCase()
        );
        if (matchedProf) {
          setSelectedProfissional(matchedProf);
          // Advance to date picking directly
          await loadRescheduleDates(centroComUnidade, matchedProf);
          setRescheduleStep(2);
        }
      }
    } catch (err) {
      console.error('Erro no início do reagendamento:', err);
    } finally {
      setRescheduleLoading(false);
    }
  };

  const loadRescheduleDates = async (centro, prof) => {
    setRescheduleLoading(true);
    try {
      const unidade = centro.unidade;
      const dias = await getDias(unidade, centro.CEN_CODIGO, prof.PROF_CODIGO, prof.CONS_CODIGO, prof.PROF_ESTADO_CONS);

      if (dias && dias.length > 0) {
        const dia = dias[0];
        const horarios = await getHorarios(unidade, centro.CEN_CODIGO, prof.PROF_CODIGO, prof.CONS_CODIGO, prof.PROF_ESTADO_CONS, dia.HAG_DIA);

        if (horarios && horarios.length > 0) {
          const hor = horarios[0];
          const agendasLivres = await getAgendasLivres(unidade, dia.HAG_DIA, hor.AGD_CODIGO, hor.HDI_CODIGO, 4);
          const agendasWithCodes = (agendasLivres || []).map(a => ({
            ...a,
            agd_codigo: hor.AGD_CODIGO,
            hdi_codigo: hor.HDI_CODIGO
          }));
          setAgendas(agendasWithCodes);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar datas:', err);
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedAgenda || !reschedulingItem) return;

    setRescheduleLoading(true);
    try {
      const cleanPhone = patient?.CLI_CELULAR?.replace(/\D/g, '') || localStorage.getItem('clinicaTemplate_patientPhone');
      const payload = {
        agd_codigo_old: reschedulingItem.agdCodigo,
        hdi_codigo_old: reschedulingItem.hdiCodigo,
        hma_numero_old: reschedulingItem.hmaNumero,
        data_old: formatDateToDDMMYYYY(reschedulingItem.hmaData),

        dia_new: selectedAgenda.Dia,
        agd_codigo_new: selectedAgenda.agd_codigo,
        hdi_codigo_new: selectedAgenda.hdi_codigo,
        data_new: selectedAgenda.Data,

        nome: patient.CLI_NOME,
        telefone: cleanPhone,
        cnv_codigo: reschedulingItem.cnvCodigo,
        exa_codigo: reschedulingItem.exaCodigo
      };

      const res = await reagendarAgendamento(reschedulingItem.unidade, payload);
      if (res && res[0] && res[0].OK === 1) {
        setDialog({
          show: true,
          title: 'Reagendado com Sucesso',
          message: 'Reagendamento concluído com sucesso!',
          type: 'alert',
          onConfirm: () => {
            setDialog(prev => ({ ...prev, show: false }));
            setShowRescheduleModal(false);
          }
        });
        await refreshHistory();
      } else {
        setDialog({
          show: true,
          title: 'Erro',
          message: 'Erro ao reagendar consulta. Verifique se o horário ainda está disponível.',
          type: 'alert',
          onConfirm: () => setDialog(prev => ({ ...prev, show: false }))
        });
      }
    } catch (err) {
      setDialog({
        show: true,
        title: 'Erro',
        message: 'Erro na requisição de reagendamento.',
        type: 'alert',
        onConfirm: () => setDialog(prev => ({ ...prev, show: false }))
      });
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Date utilities
  const formatDateToDDMMYYYY = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const getMonthName = (monthStr) => {
    const months = {
      '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
      '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
    };
    return months[monthStr] || '';
  };

  // Só mostra o rótulo da unidade quando ela de fato diferencia alguma coisa
  // (2+ unidades aparecendo no histórico) — com só a Matriz configurada, não
  // faz sentido poluir a tela com um rótulo que nunca muda.
  const mostrarUnidade = new Set(appointments.map((a) => a.unidade)).size > 1;

  return (
    <>
      <section className="pageSection container">
        <div ref={cardRef} className={styles.contentCard} style={{ maxWidth: '900px' }}>
          <div ref={viewRef}>
          {!isAuthenticated ? (
            <div className={styles.loginContainer}>
              <div className={styles.loginIcon}><Lock size={32} /></div>
              <h2 className={styles.title} data-editable="textos.areaClienteTitulo">{TEXTOS?.areaClienteTitulo}</h2>
              <p className={styles.subtitle} data-editable="textos.areaClienteSubtitulo">{TEXTOS?.areaClienteSubtitulo}</p>

              {error && (
                <div className={styles.errorBox}>
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className={styles.loginForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="phone">Telefone / WhatsApp</label>
                  <div className={styles.inputWrapper}>
                    <Phone size={18} className={styles.inputIcon} />
                    <input
                      type="tel"
                      id="phone"
                      placeholder="Ex: 79 99999-8888"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      required
                      className={styles.textInput}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? (
                    <>
                      <EcgLine variant="spinner" className={styles.spinner} />
                      Buscando cadastro...
                    </>
                  ) : 'Acessar Área do Cliente'}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className={styles.dashboardHeader}>
                <div>
                  <h2 className={styles.welcomeText}>Olá, <span className={styles.welcomeName}>{patient?.CLI_NOME}</span></h2>
                  <p className={styles.welcomeSub}>Abaixo estão todas as suas consultas e exames registrados.</p>
                </div>
                <button onClick={handleLogout} className={styles.logoutBtn}>
                  <LogOut size={16} /> Sair
                </button>
              </div>

              {appointments.length === 0 ? (
                <div className={styles.emptyState}>
                  <Calendar size={48} className={styles.emptyIcon} />
                  <h3>Nenhum agendamento encontrado</h3>
                  <p>Você não possui consultas ou exames agendados neste número.</p>
                </div>
              ) : (
                <div className={styles.appointmentsList}>
                  {appointments.map((item, idx) => {
                    const isUpcoming = item.status === 'AGENDADO';
                    const isCanceled = item.status === 'CANCELADO';
                    const dateFormatted = formatDateToDDMMYYYY(item.hmaData);

                    return (
                      <div key={idx} className={`${styles.appointmentCard} ${isCanceled ? styles.cardCanceled : ''}`}>
                        <div className={styles.cardHeader}>
                          <div className={styles.cardBadgeContainer}>
                            <span className={`${styles.statusBadge} ${isUpcoming ? styles.badgeUpcoming : isCanceled ? styles.badgeCanceled : styles.badgeCompleted}`}>
                              {item.status}
                            </span>
                            {mostrarUnidade && (
                              <span className={styles.unidadeBadge}>{nomeUnidade(item.unidade)}</span>
                            )}
                            <span className={styles.cardDateText}>
                              <Calendar size={14} style={{ marginRight: '0.25rem' }} />
                              {dateFormatted} ({item.hagDia})
                            </span>
                          </div>
                        </div>

                        <div className={styles.cardBody}>
                          <div className={styles.cardInfoGrid}>
                            <div>
                              <span className={styles.infoLabel}>Procedimento / Exame</span>
                              <span className={styles.infoValue}>{item.exaDescricao}</span>
                            </div>
                            <div>
                              <span className={styles.infoLabel}>Médico / Profissional</span>
                              <span className={styles.infoValue}>{item.profissional}</span>
                            </div>
                            <div>
                              <span className={styles.infoLabel}>Especialidade</span>
                              <span className={styles.infoValue}>{item.centro}</span>
                            </div>
                            <div>
                              <span className={styles.infoLabel}>Convênio</span>
                              <span className={styles.infoValue}>{item.convenio}</span>
                            </div>
                          </div>

                          {isUpcoming && (
                            <div className={styles.cardActions}>
                              <button
                                onClick={() => startReschedule(item)}
                                className={styles.actionBtnReagendar}
                              >
                                <RefreshCw size={14} /> Reagendar
                              </button>
                              <button
                                onClick={() => handleCancel(item)}
                                className={styles.actionBtnCancelar}
                              >
                                <Trash2 size={14} /> Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </section>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className={styles.modalOverlay}>
          <div ref={rescheduleModalRef} className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <h3>Reagendar Consulta</h3>
              <button onClick={() => setShowRescheduleModal(false)} className={styles.closeModalBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {rescheduleLoading ? (
                <div className={styles.modalLoader}>
                  <EcgLine variant="spinner" />
                  <p>Buscando datas livres...</p>
                </div>
              ) : (
                <>
                  <div className={styles.currentSummary}>
                    <p><strong>Procedimento:</strong> {reschedulingItem?.exaDescricao}</p>
                    <p><strong>Médico:</strong> {reschedulingItem?.profissional}</p>
                    <p><strong>Data Atual:</strong> {formatDateToDDMMYYYY(reschedulingItem?.hmaData)} ({reschedulingItem?.hagDia})</p>
                  </div>

                  {rescheduleStep === 1 ? (
                    <div>
                      <h4 className={styles.stepTitle}>Selecione o Profissional</h4>
                      <div className={styles.modalProfsList}>
                        {profissionais.map(p => {
                          const isSelected = selectedProfissional?.PROF_CODIGO === p.PROF_CODIGO;
                          return (
                            <button
                              key={p.PROF_CODIGO}
                              className={`${styles.modalProfCard} ${isSelected ? styles.modalProfCardSelected : ''}`}
                              onClick={() => {
                                setSelectedProfissional(p);
                                loadRescheduleDates(selectedCentro, p);
                                setRescheduleStep(2);
                              }}
                            >
                              <User size={16} />
                              <span>{p.PROF_NOME}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 className={styles.stepTitle}>Selecione a Nova Data</h4>
                        <button
                          onClick={() => setRescheduleStep(1)}
                          className={styles.modalBackBtn}
                        >
                          Alterar Médico
                        </button>
                      </div>

                      <div className={styles.modalDateGrid}>
                        {agendas.filter(a => a.Livres > 0).map((ag, idx) => {
                          const isSelected = selectedAgenda?.Data === ag.Data;
                          return (
                            <button
                              key={idx}
                              className={`${styles.modalDateCard} ${isSelected ? styles.modalDateCardSelected : ''}`}
                              onClick={() => setSelectedAgenda(ag)}
                            >
                              <span className={styles.modalDateDayName}>{ag.Dia.toUpperCase()}</span>
                              <span className={styles.modalDateDayNumber}>{ag.Data.split('/')[0]}</span>
                              <span className={styles.modalDateMonthName}>{getMonthName(ag.Data.split('/')[1])}</span>
                              <span className={styles.modalDateVagas}>{ag.Livres} vagas</span>
                            </button>
                          );
                        })}
                      </div>

                      {agendas.length === 0 && (
                        <p className={styles.noDatesMessage}>Não há novas datas disponíveis no momento.</p>
                      )}

                      <button
                        onClick={handleRescheduleSubmit}
                        disabled={!selectedAgenda}
                        className="btn-primary"
                        style={{ width: '100%', marginTop: '2rem', justifyContent: 'center', opacity: !selectedAgenda ? 0.6 : 1 }}
                      >
                        Confirmar Reagendamento
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Dialog Modal */}
      {dialog.show && (
        <div className={styles.modalOverlay} style={{ zIndex: 110 }}>
          <div ref={dialogRef} className={styles.dialogContainer}>
            <div className={styles.dialogHeader}>
              <h3>{dialog.title}</h3>
              <button onClick={() => setDialog({ ...dialog, show: false })} className={styles.closeModalBtn}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.dialogBody}>
              <p className={styles.dialogMessage}>{dialog.message}</p>
            </div>
            <div className={styles.dialogFooter}>
              {dialog.type === 'confirm' ? (
                <>
                  <button
                    onClick={dialog.onCancel}
                    className={styles.dialogBtnSecondary}
                  >
                    Não, Voltar
                  </button>
                  <button
                    onClick={dialog.onConfirm}
                    className="btn-primary"
                  >
                    Sim, Confirmar
                  </button>
                </>
              ) : (
                <button
                  onClick={dialog.onConfirm || (() => setDialog({ ...dialog, show: false }))}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
