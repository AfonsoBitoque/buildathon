import { supabase, House, HouseInsert, HouseMemberInsert } from './supabase';

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function checkInviteCodeExists(inviteCode: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('houses')
    .select('id')
    .eq('invite_code', inviteCode)
    .maybeSingle();

  if (error) {
    console.error('Error checking invite code:', error);
    return false;
  }

  return data !== null;
}

export async function generateUniqueInviteCode(): Promise<string> {
  let code = generateInviteCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (await checkInviteCodeExists(code) && attempts < maxAttempts) {
    code = generateInviteCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Não foi possível gerar um código único. Tente novamente.');
  }

  return code;
}

export async function createHouse(name: string, userId: string): Promise<House> {
  if (!name || name.trim().length === 0) {
    throw new Error('O nome da casa é obrigatório');
  }

  const inviteCode = await generateUniqueInviteCode();

  const houseData: HouseInsert = {
    name: name.trim(),
    invite_code: inviteCode,
    created_by: userId,
  };

  const { data: house, error: houseError } = await supabase
    .from('houses')
    .insert(houseData)
    .select()
    .single();

  if (houseError) {
    console.error('Error creating house:', houseError);
    throw new Error('Erro ao criar casa. Por favor, tente novamente.');
  }

  const memberData: HouseMemberInsert = {
    house_id: house.id,
    user_id: userId,
  };

  const { error: memberError } = await supabase
    .from('house_members')
    .insert(memberData);

  if (memberError) {
    console.error('Error adding creator as member:', memberError);
  }

  return house;
}

export async function joinHouseByInviteCode(inviteCode: string, userId: string): Promise<House> {
  if (!inviteCode || inviteCode.length !== 8) {
    throw new Error('Código de convite inválido. Deve ter 8 caracteres.');
  }

  const { data: house, error: houseError } = await supabase
    .from('houses')
    .select('*')
    .eq('invite_code', inviteCode.toUpperCase())
    .maybeSingle();

  if (houseError) {
    console.error('Error finding house:', houseError);
    throw new Error('Erro ao procurar casa. Por favor, tente novamente.');
  }

  if (!house) {
    throw new Error('Código de convite inválido. Casa não encontrada.');
  }

  const { data: existingMember } = await supabase
    .from('house_members')
    .select('id')
    .eq('house_id', house.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMember) {
    throw new Error('Já é membro desta casa.');
  }

  const memberData: HouseMemberInsert = {
    house_id: house.id,
    user_id: userId,
  };

  const { error: memberError } = await supabase
    .from('house_members')
    .insert(memberData);

  if (memberError) {
    console.error('Error joining house:', memberError);
    throw new Error('Erro ao entrar na casa. Por favor, tente novamente.');
  }

  return house;
}

export async function getUserHouses(userId: string): Promise<House[]> {
  const { data: memberships, error: memberError } = await supabase
    .from('house_members')
    .select('house_id')
    .eq('user_id', userId);

  if (memberError) {
    console.error('Error fetching user memberships:', memberError);
    return [];
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const houseIds = memberships.map(m => m.house_id);

  const { data: houses, error: housesError } = await supabase
    .from('houses')
    .select('*')
    .in('id', houseIds)
    .order('created_at', { ascending: false });

  if (housesError) {
    console.error('Error fetching houses:', housesError);
    return [];
  }

  return houses || [];
}

export async function getHouseMembers(houseId: string) {
  const { data, error } = await supabase
    .from('house_members')
    .select(`
      id,
      joined_at,
      user_id,
      users (
        username,
        tag
      )
    `)
    .eq('house_id', houseId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching house members:', error);
    return [];
  }

  return data || [];
}
