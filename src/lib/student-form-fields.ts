// Campos e rótulos compartilhados da ficha do aluno de Novos Membros

export const EDUCATION_LEVELS = [
  'FUNDAMENTAL INCOMPLETO', 'FUNDAMENTAL COMPLETO',
  'MÉDIO INCOMPLETO', 'MÉDIO COMPLETO',
  'SUPERIOR INCOMPLETO', 'SUPERIOR COMPLETO',
  'PÓS-GRADUAÇÃO', 'MESTRADO', 'DOUTORADO',
]

export const MARITAL_STATUS = [
  'SOLTEIRO (A)', 'CASADO (A)', 'DIVORCIADO (A)', 'VIÚVO (A)', 'UNIÃO ESTÁVEL',
]

export const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

export const PHONE_OPERATORS = ['OI', 'VIVO', 'CLARO', 'TIM', 'OUTRA']

export const COURSE_STATUS = [
  { value: 'ainda_nao_fez', label: 'AINDA NÃO FEZ' },
  { value: 'fazendo', label: 'ESTÁ FAZENDO' },
  { value: 'concluiu', label: 'JÁ CONCLUIU' },
]

export const SIM_NAO = [
  { value: 'sim', label: 'SIM' },
  { value: 'nao', label: 'NÃO' },
]

export const BATISMO_COMO = ['IMERSÃO', 'ASPERSÃO', 'NÃO LEMBRO']

// Rótulos legíveis para exibição/PDF
export const FIELD_LABELS: Record<string, string> = {
  full_name: 'Nome',
  gender: 'Sexo',
  education_level: 'Grau de Instrução',
  formation: 'Formação',
  is_entrepreneur: 'É empresário',
  profession: 'Profissão',
  address_type: 'Tipo de Endereço',
  has_cpf: 'Tem CPF',
  cpf: 'CPF',
  rg: 'RG',
  rg_ssp: 'SSP',
  naturalidade: 'Naturalidade',
  nacionalidade: 'Nacionalidade',
  birth_date: 'Data de Nascimento',
  marital_status: 'Estado Civil',
  cep: 'CEP',
  address: 'Endereço',
  city: 'Cidade',
  neighborhood: 'Bairro',
  sub_neighborhood: 'Sub Bairro',
  state: 'Estado',
  country: 'País',
  number: 'Número',
  complement: 'Complemento',
  phone1: 'Telefone 01',
  phone2: 'Telefone 02',
  email: 'E-mail',
  rhema: 'RHEMA',
  emr: 'EMR',
  ermm: 'ERMM',
  novo_nascimento: 'Novo Nascimento',
  batismo_espirito_santo: 'Batismo no Espírito Santo',
  batismo_aguas: 'Batismo nas Águas',
  batismo_aguas_como: 'Como foi o batismo',
  facebook: 'Facebook',
  instagram: 'Instagram',
  observacoes: 'Observações',
}
