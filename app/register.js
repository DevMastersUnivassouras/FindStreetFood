import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Alert, StyleSheet, Switch, Text, View, Keyboard, Platform, Pressable } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { BotaoAutenticacao } from '@/src/auth/components/botao-autenticacao';
import { EntradaAutenticacao } from '@/src/auth/components/entrada-autenticacao';
import { useAutenticacao } from '@/src/auth/context/contexto-autenticacao';

function validarEmail(valor) {
  const emailLimpo = String(valor || '').trim().toLowerCase();
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regexEmail.test(emailLimpo);
}

function formatarDataComMascara(valor) {
  const digitos = String(valor || '').replace(/\D/g, '').slice(0, 8);

  if (digitos.length <= 2) {
    return digitos;
  }

  if (digitos.length <= 4) {
    return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  }

  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

function dateParaBr(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = String(data.getFullYear());
  return `${dia}/${mes}/${ano}`;
}

function dataParaIso(valor) {
  const texto = String(valor || '').trim();

  const matchBr = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (matchBr) {
    return `${matchBr[3]}-${matchBr[2]}-${matchBr[1]}`;
  }

  const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) {
    return texto;
  }

  return '';
}

function dataTextoParaDate(valor) {
  const textoMascara = formatarDataComMascara(valor);
  const iso = dataParaIso(textoMascara);
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const data = new Date(ano, mes - 1, dia);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return data;
}

function idadeMinimaAtingida(dataIso) {
  const dataNormalizada = dataParaIso(dataIso);
  const match = String(dataNormalizada || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const nascimento = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    nascimento.getUTCFullYear() !== ano
    || nascimento.getUTCMonth() !== mes - 1
    || nascimento.getUTCDate() !== dia
  ) {
    return false;
  }

  const hoje = new Date();
  const limite = new Date(Date.UTC(hoje.getUTCFullYear() - 18, hoje.getUTCMonth(), hoje.getUTCDate()));
  return nascimento <= limite;
}

function validarCadastro({ nome, sobrenome, cpf, email, telefone, dataNascimento, senha, senhaConfirmacao }) {
  if (!nome.trim() || nome.trim().length < 2) return "Informe um nome válido.";
  if (!sobrenome.trim() || sobrenome.trim().length < 2) return "Informe um sobrenome válido.";
  if (String(cpf || "").replace(/\D/g, "").length !== 11) return "CPF deve ter 11 dígitos.";
  if (!validarEmail(email)) return "Informe um email válido.";
  if (!telefone.trim() || telefone.trim().length < 8) return "Informe um telefone válido.";
  if (!idadeMinimaAtingida(dataNascimento)) return "É necessário ter no mínimo 18 anos. Use data no formato DD/MM/AAAA.";
  if (!senha || senha.length < 6) return "Senha deve ter pelo menos 6 caracteres.";
  if (senha !== senhaConfirmacao) return "As senhas não coincidem.";
  return null;
}

export default function TelaCadastro() {
  const { fazerCadastro } = useAutenticacao();
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [dataNascimentoSelecionada, setDataNascimentoSelecionada] = useState(new Date(2000, 0, 1));
  const [mostrarCalendarioNascimento, setMostrarCalendarioNascimento] = useState(false);
  const [senha, setSenha] = useState('');
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
  const [ativarBiometriaNoAparelho, setAtivarBiometriaNoAparelho] = useState(false);
  const [carregando, setCarregando] = useState(false);

  function abrirCalendarioNascimento() {
    const dataAtual = dataTextoParaDate(dataNascimento) || dataNascimentoSelecionada;
    setDataNascimentoSelecionada(dataAtual);
    setMostrarCalendarioNascimento(true);
  }

  function aoTrocarDataNascimento(event, dataSelecionada) {
    if (Platform.OS === 'android') {
      setMostrarCalendarioNascimento(false);
    }

    if (event?.type === 'dismissed' || !dataSelecionada) {
      return;
    }

    setDataNascimentoSelecionada(dataSelecionada);
    setDataNascimento(dateParaBr(dataSelecionada));
  }

  async function clicarCadastrar() {
    const erroValidacao = validarCadastro({
      nome,
      sobrenome,
      cpf,
      email,
      telefone,
      dataNascimento,
      senha,
      senhaConfirmacao,
    });

    if (erroValidacao) {
      Alert.alert("Erro", erroValidacao);
      return;
    }

    const birthDateIso = dataParaIso(dataNascimento);

    const payload = {
      firstName: nome.trim(),
      lastName: sobrenome.trim(),
      cpf: cpf,
      email: email.trim().toLowerCase(),
      phone: telefone.trim(),
      birthDate: birthDateIso,
      password: senha,
      passwordConfirmation: senhaConfirmacao,
      biometricEnabled: ativarBiometriaNoAparelho,
    };

    try {
      setCarregando(true);
      
      const resultadoCadastro = await fazerCadastro(payload, ativarBiometriaNoAparelho);

      if (resultadoCadastro?.mensagemBiometria) {
        Alert.alert('Biometria', resultadoCadastro.mensagemBiometria);
      }

      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Erro no cadastro', error.message || 'Não foi possível cadastrar.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
      <View style={styles.caixaPrincipal}>
        <Text style={styles.titulo}>Criar conta</Text>

        <EntradaAutenticacao
          label="Nome"
          value={nome}
          onChangeText={setNome}
          placeholder="Seu nome"
          autoCapitalize="words"
        />

        <EntradaAutenticacao
          label="Sobrenome"
          value={sobrenome}
          onChangeText={setSobrenome}
          placeholder="Seu sobrenome"
          autoCapitalize="words"
        />

        <EntradaAutenticacao
          label="CPF"
          value={cpf}
          onChangeText={setCpf}
          placeholder="Somente numeros"
          keyboardType="number-pad"
        />

        <EntradaAutenticacao
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="seuemail@dominio.com"
          keyboardType="email-address"
        />

        <EntradaAutenticacao
          label="Telefone"
          value={telefone}
          onChangeText={setTelefone}
          placeholder="Seu telefone"
          keyboardType="phone-pad"
        />

        <View style={styles.caixaCampoData}>
          <Text style={styles.rotuloData}>Data de Nascimento</Text>
          <Pressable onPress={abrirCalendarioNascimento} style={styles.entradaData}>
            <Text style={dataNascimento ? styles.textoEntradaData : styles.placeholderEntradaData}>
              {dataNascimento || 'DD/MM/AAAA'}
            </Text>
          </Pressable>

          {mostrarCalendarioNascimento && (
            <View style={styles.boxCalendario}>
              <DateTimePicker
                value={dataNascimentoSelecionada}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={aoTrocarDataNascimento}
              />

              {Platform.OS === 'ios' && (
                <Pressable style={styles.botaoCalendario} onPress={() => setMostrarCalendarioNascimento(false)}>
                  <Text style={styles.textoBotaoCalendario}>Fechar calendário</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <EntradaAutenticacao
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          placeholder="Crie uma senha"
          secureTextEntry
        />

        <EntradaAutenticacao
          label="Confirmação de Senha"
          value={senhaConfirmacao}
          onChangeText={setSenhaConfirmacao}
          placeholder="Repita a sua senha"
          secureTextEntry
        />

        <View style={styles.linhaOpcao}>
          <Text style={styles.textoOpcao}>Cadastrar biometria no aparelho</Text>
          <Switch value={ativarBiometriaNoAparelho} onValueChange={setAtivarBiometriaNoAparelho} />
        </View>

        <BotaoAutenticacao title="Cadastrar" onPress={() => {
          clicarCadastrar();
          Keyboard.dismiss();
        }}
          loading={carregando} />

        <Link href="/login" style={styles.linkLogin} onPress={() => Keyboard.dismiss()}>
          Já tem conta? Entrar
        </Link>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  caixaPrincipal: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    color: '#0f172a',
  },
  linhaOpcao: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  caixaCampoData: {
    width: '100%',
    marginBottom: 14,
  },
  rotuloData: {
    marginBottom: 6,
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  entradaData: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    minHeight: 48,
    justifyContent: 'center',
  },
  textoEntradaData: {
    color: '#111827',
  },
  placeholderEntradaData: {
    color: '#9ca3af',
  },
  boxCalendario: {
    marginTop: 6,
  },
  botaoCalendario: {
    alignSelf: 'flex-end',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  textoBotaoCalendario: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  textoOpcao: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  linkLogin: {
    marginTop: 16,
    color: '#1d4ed8',
    textAlign: 'center',
    fontWeight: '600',
  },
});
