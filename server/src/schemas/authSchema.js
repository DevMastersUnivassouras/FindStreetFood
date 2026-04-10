const { z } = require('zod');

function normalizarCpf(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function parseDataIso(valor) {
  const texto = String(valor || '').trim();
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    data.getUTCFullYear() !== ano
    || data.getUTCMonth() !== mes - 1
    || data.getUTCDate() !== dia
  ) {
    return null;
  }

  return data;
}

function validarMaioridade18Anos(valor) {
  const nascimento = parseDataIso(valor);

  if (!nascimento) {
    return false;
  }

  const hoje = new Date();
  const limite = new Date(Date.UTC(hoje.getUTCFullYear() - 18, hoje.getUTCMonth(), hoje.getUTCDate()));
  return nascimento <= limite;
}

const birthDateSchema = z
  .string()
  .trim()
  .refine((value) => Boolean(parseDataIso(value)), 'Data de nascimento inválida. Use YYYY-MM-DD')
  .refine((value) => validarMaioridade18Anos(value), 'É necessário ter no mínimo 18 anos');

const registerSchema = z.object({
  cpf: z
    .string()
    .transform((value) => normalizarCpf(value))
    .refine((value) => value.length === 11, 'CPF deve ter 11 dígitos'),
  email: z.string().trim().email('Email inválido').transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(8, 'Telefone inválido'),
  birthDate: birthDateSchema,
  firstName: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  lastName: z.string().trim().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  passwordConfirmation: z.string().min(6, 'Confirmação de senha obrigatória'),
  biometricEnabled: z.boolean().optional().default(false),
})
.refine((data) => data.password === data.passwordConfirmation, {
  message: 'As senhas não coincidem',
  path: ['passwordConfirmation'],
});

const loginSchema = z.object({
  cpf: z
    .string()
    .transform((value) => normalizarCpf(value))
    .refine((value) => value.length === 11, 'CPF deve ter 11 dígitos'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const adminLoginSchema = z.object({
  adminId: z.string().trim().min(1, 'ID admin é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'Nome é obrigatório'),
  lastName: z.string().trim().min(1, 'Sobrenome é obrigatório'),
  email: z.string().email('Email inválido').transform((value) => value.trim().toLowerCase()),
  phone: z.string().trim().min(8, 'Telefone inválido'),
  birthDate: birthDateSchema,
});

module.exports = {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  updateProfileSchema,
};
