import { supabase, UserInsert } from './supabase';

export function generateRandomTag(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let tag = '';
  for (let i = 0; i < 4; i++) {
    tag += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return tag;
}

export async function checkTagAvailability(username: string, tag: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .eq('tag', tag)
    .maybeSingle();

  if (error) {
    console.error('Error checking tag availability:', error);
    return false;
  }

  return data === null;
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Error checking email:', error);
    return false;
  }

  return data !== null;
}

export async function registerUser(email: string, username: string, tag: string, password: string) {
  const emailExists = await checkEmailExists(email);
  if (emailExists) {
    throw new Error('Email já está em uso');
  }

  const tagAvailable = await checkTagAvailability(username, tag);
  if (!tagAvailable) {
    throw new Error('Tag não está disponível. Por favor, escolha outra.');
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        tag,
      },
    },
  });

  if (authError) {
    console.error('Auth registration error:', authError);
    throw new Error(authError.message || 'Erro ao criar conta. Por favor, tente novamente.');
  }

  if (!authData.user) {
    throw new Error('Erro ao criar conta. Por favor, tente novamente.');
  }

  const userData: UserInsert = {
    id: authData.user.id,
    email,
    username,
    tag,
    password_hash: '',
  };

  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single();

  if (error) {
    console.error('Registration error:', error);
    throw new Error(error.message || 'Erro ao criar conta. Por favor, tente novamente.');
  }

  return data;
}

export async function loginUser(identifier: string, password: string) {
  let email = identifier;

  if (!identifier.includes('@')) {
    if (identifier.includes('#')) {
      const [username, tag] = identifier.split('#');
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('username', username)
        .eq('tag', tag)
        .maybeSingle();

      if (!userData) {
        throw new Error('Credenciais inválidas');
      }
      email = userData.email;
    } else {
      throw new Error('Formato inválido. Use email ou username#tag');
    }
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error('Login error:', authError);
    throw new Error('Credenciais inválidas');
  }

  if (!authData.user) {
    throw new Error('Erro ao fazer login. Por favor, tente novamente.');
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (userError || !userData) {
    console.error('User data error:', userError);
    throw new Error('Erro ao fazer login. Por favor, tente novamente.');
  }

  return userData;
}
