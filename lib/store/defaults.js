// Valores padrão usados quando content.json/settings.json ainda não existem
// (primeira execução) — espelham os valores que hoje vivem em lib/config.js,
// lib/featureFlags.js e .env.example, para que o site continue idêntico até
// alguém editar algo pelo /admin ou /superadmin.

export const DEFAULT_CONTENT = {
  clinicNome: 'Sua Clínica',
  brand: {
    colorPrimary: '#2b7a3e',
    colorSecondary: '#8cc63f',
    logoUrl: '/logo.svg',
  },
  heroFotoUrl: '/fachada.png',
  unidades: {
    matriz: {
      telefoneDisplay: '(00) 00000-0000',
      whatsappUrl: 'https://wa.me/5500000000000',
      endereco: 'Endereço da unidade Matriz, Cidade – UF',
    },
    filial: {
      telefoneDisplay: '(00) 00000-0000',
      whatsappUrl: 'https://wa.me/5500000000000',
      endereco: 'Endereço da unidade Filial, Cidade – UF',
    },
  },
  horarioAtendimento: 'Segunda a sexta 08h–18h · Sábado 08h–12h · Domingo fechado',
  instagramHandle: '@sua_clinica',
  instagramUrl: 'https://www.instagram.com/sua_clinica',
  timezone: 'America/Sao_Paulo',
  textos: {
    heroTituloLinha1: 'Sua saúde em',
    heroTituloLinha2: 'boas mãos.',
    heroSubtitle:
      'Atendimento humanizado, diversas especialidades e exames especializados perto de você. Agende sua consulta sem sair de casa.',
    sobreTitulo: 'Tradição e cuidado com você',
    sobreDescricao:
      'A Sua Clínica nasceu com o propósito de oferecer medicina de qualidade com atendimento humanizado. Cuidamos da sua saúde e da sua família com excelência e profissionalismo.',
    footerDescricao: 'Medicina de qualidade com atendimento humanizado, perto de você.',
    ctaComAgendamentoTitulo: 'Agende sua consulta ou exame online',
    ctaComAgendamentoTexto:
      'Escolha o especialista, o convênio e o horário que se encaixam na sua rotina. Leva menos de dois minutos.',
    ctaSemAgendamentoTitulo: 'Fale com a nossa equipe',
    ctaSemAgendamentoTexto:
      'No momento não aceitamos agendamento pelo site. Fale com a clínica pelo WhatsApp para marcar sua consulta ou exame.',

    // Navegação e botões (Header/Footer, aparecem em todas as páginas).
    navSobre: 'Sobre Nós',
    navEspecialidades: 'Especialidades',
    navProfissionais: 'Profissionais',
    navOrcamento: 'Orçamento',
    navChat: 'Fale com a Sofia',
    navContato: 'Contato',
    navAreaCliente: 'Área do Cliente',
    botaoAgendarConsulta: 'Agendar consulta',
    botaoFalarWhatsapp: 'Falar no WhatsApp',
    botaoFalarWhatsappRodape: 'Fale pelo WhatsApp',

    // Página /agendamento
    agendamentoEyebrow: 'Agendamento online',
    agendamentoTitulo: 'Agende sua consulta ou exame',

    // Página /orcamento
    orcamentoTitulo: 'Orçamento de Exames e Consultas',
    orcamentoIntro:
      'Selecione seu convênio, busque os procedimentos desejados, adicione-os ao carrinho e gere um documento em PDF com seu orçamento.',

    // Página /medicos
    medicosEyebrow: 'Nossa equipe',
    medicosTitulo: 'Conheça nossos profissionais',

    // Página /central-agendamento
    centralTitulo: 'Agende sua Consulta ou Exame',
    centralTabNovo: 'Novo Agendamento',
    centralTabConsultas: 'Minhas Consultas',

    // Página /area-cliente (e aba "Minhas Consultas" da Central)
    areaClienteTitulo: 'Área do Cliente',
    areaClienteSubtitulo: 'Digite o telefone cadastrado no agendamento para consultar o seu histórico.',
  },
  especialidades: [
    { id: 1, nome: 'Clínica Geral', descricao: 'Consultas de rotina e acompanhamento contínuo.', icone: 'Stethoscope' },
    { id: 2, nome: 'Cardiologia', descricao: 'Avaliação e cuidado da saúde do coração.', icone: 'Heart' },
    { id: 3, nome: 'Pediatria', descricao: 'Atendimento dedicado a crianças e adolescentes.', icone: 'Baby' },
    { id: 4, nome: 'Psiquiatria & Psicologia', descricao: 'Cuidado com a saúde mental e emocional.', icone: 'Brain' },
    { id: 5, nome: 'Exames de Imagem', descricao: 'Ultrassonografia e diagnóstico por imagem.', icone: 'Activity' },
    { id: 6, nome: 'Dermatologia', descricao: 'Saúde da pele, cabelos e unhas.', icone: 'Eye' },
    { id: 7, nome: 'Ortopedia', descricao: 'Ossos, músculos e articulações.', icone: 'Bone' },
    { id: 8, nome: 'Exames Laboratoriais', descricao: 'Coleta e análises clínicas no local.', icone: 'Microscope' },
  ],
};

export const DEFAULT_SETTINGS = {
  featureFlags: {
    sobre: true,
    especialidades: true,
    cta: true,
    profissionais: true,
    orcamento: true,
    agendamento: true,
    areaCliente: true,
    centralAgendamento: true,
    chat: true,
    chatFlutuante: true,
  },
  unidades: {
    matriz: { apiBaseUrl: '' },
    filial: { apiBaseUrl: '' },
  },
  openai: {
    apiKey: '',
    model: '',
  },
};
