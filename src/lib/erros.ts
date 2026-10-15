/**
 * Tradução de erros técnicos para mensagens curtas e legíveis.
 *
 * Antes, qualquer falha no banco chegava crua na tela — o usuário via coisas
 * como `Invalid prisma.client.create() invocation: Error querying the
 * database: FATAL: (ENOTFOUND) tenant/user postgres.xxxx not found`.
 * Aqui esse ruído vira uma frase só.
 *
 * Este módulo é isomórfico de propósito: roda no servidor (para limpar a
 * mensagem antes dela sair pela API) e no cliente (como última barreira).
 */

/** Frase genérica quando não dá para identificar a causa. */
export const ERRO_GENERICO =
  "Não foi possível concluir a operação. Tente novamente.";

/** Frase para quando o banco não responde (Supabase pausado, rede, etc.). */
export const ERRO_BANCO =
  "Não consegui falar com o banco de dados. Tente de novo em alguns instantes.";

/**
 * Indica se o texto parece ser um despejo técnico (stack, SQL, driver)
 * em vez de uma mensagem escrita para uma pessoa.
 */
export function pareceTecnico(texto: string): boolean {
  if (!texto) return true;
  if (texto.length > 220) return true;
  if (texto.includes("\n")) return true;
  const marcas = [
    "prisma.",
    "PrismaClient",
    "Invalid `",
    "invocation",
    "Error querying the database",
    "FATAL:",
    "ENOTFOUND",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "at Object.",
    "node_modules",
    "Unique constraint",
    "Foreign key constraint",
    "connection pool",
    "database server",
    "TypeError",
    "undefined is not",
    "Cannot read propert",
  ];
  return marcas.some((m) => texto.includes(m));
}

/** Detecta falha de conectividade com o banco a partir do texto bruto. */
function ehFalhaDeConexao(texto: string): boolean {
  const marcas = [
    "ENOTFOUND",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "Can't reach database server",
    "Timed out fetching a new connection",
    "connection pool",
    "FATAL:",
    "server has closed the connection",
    "P1001",
    "P1002",
    "P1008",
    "P1017",
  ];
  return marcas.some((m) => texto.includes(m));
}

/**
 * Extrai o nome legível do campo citado em erros de constraint única.
 * Ex.: `Unique constraint failed on the fields: (\`email\`)` -> "e-mail".
 */
function campoDuplicado(texto: string): string | null {
  const m =
    texto.match(/Unique constraint failed on the fields: \(`([^`]+)`\)/) ??
    texto.match(/Unique constraint failed on the (?:field|constraint): `([^`]+)`/);
  if (!m) return null;
  const bruto = m[1].split(",")[0].trim().replace(/_key$/, "");
  const rotulos: Record<string, string> = {
    email: "e-mail",
    cpf_cnpj: "CPF/CNPJ",
    cpfCnpj: "CPF/CNPJ",
    cnpj: "CNPJ",
    cpf: "CPF",
    code: "código",
    rg: "RG",
    name: "nome",
    phone: "telefone",
    plate: "placa",
  };
  return rotulos[bruto] ?? bruto;
}

/**
 * Converte o texto bruto de um erro em uma frase curta para o usuário.
 * Devolve `null` quando o texto já é uma mensagem amigável (escrita por nós).
 */
export function traduzirErro(bruto: string): string | null {
  const texto = bruto ?? "";

  if (ehFalhaDeConexao(texto)) return ERRO_BANCO;

  if (texto.includes("P2002") || texto.includes("Unique constraint")) {
    const campo = campoDuplicado(texto);
    return campo
      ? `Já existe um cadastro com esse ${campo}.`
      : "Já existe um cadastro com esses dados.";
  }

  if (texto.includes("P2003") || texto.includes("Foreign key constraint")) {
    return "Este registro está ligado a outros cadastros e não pode ser alterado assim.";
  }

  if (texto.includes("P2025") || texto.includes("Record to update not found")) {
    return "Registro não encontrado. Ele pode ter sido removido.";
  }

  if (texto.includes("P2014")) {
    return "Existem registros vinculados a este item. Remova-os primeiro.";
  }

  if (pareceTecnico(texto)) return ERRO_GENERICO;

  return null; // já é amigável
}

/** Mensagens por código do tRPC, quando não há nada melhor. */
const POR_CODIGO: Record<string, string> = {
  UNAUTHORIZED: "Sua sessão expirou. Entre novamente.",
  FORBIDDEN: "Você não tem permissão para esta ação.",
  NOT_FOUND: "Registro não encontrado.",
  TIMEOUT: "A operação demorou demais. Tente novamente.",
  TOO_MANY_REQUESTS: "Muitas tentativas seguidas. Aguarde um instante.",
  PAYLOAD_TOO_LARGE: "O arquivo enviado é grande demais.",
  BAD_REQUEST: "Confira os dados preenchidos e tente novamente.",
  INTERNAL_SERVER_ERROR: ERRO_GENERICO,
};

/**
 * Mensagem pronta para exibir, a partir de um erro do tRPC (ou qualquer
 * outro). Use sempre esta função em `onError` — nunca `e.message` direto.
 */
export function mensagemErro(e: unknown): string {
  if (!e) return ERRO_GENERICO;

  const err = e as {
    message?: string;
    data?: { code?: string; zodError?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } };
    shape?: { data?: { code?: string } };
  };

  // Erro de validação (Zod): mostra o primeiro problema, sem o JSON inteiro.
  const zod = err.data?.zodError;
  if (zod) {
    const doCampo = Object.values(zod.fieldErrors ?? {})
      .flat()
      .filter(Boolean)[0];
    const doForm = (zod.formErrors ?? []).filter(Boolean)[0];
    const primeiro = doCampo ?? doForm;
    if (primeiro) return primeiro;
    return "Confira os dados preenchidos e tente novamente.";
  }

  const bruto = typeof err.message === "string" ? err.message.trim() : "";
  const traduzida = traduzirErro(bruto);
  if (traduzida) return traduzida;

  if (bruto) return bruto;

  const codigo = err.data?.code ?? err.shape?.data?.code;
  return (codigo && POR_CODIGO[codigo]) || ERRO_GENERICO;
}
