import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, User, Lock, Hash, Shuffle, Loader2, CheckCircle2, XCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { registerUser, generateRandomTag, checkTagAvailability } from '../lib/auth';

export function SignUpScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [tag, setTag] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [checkingTag, setCheckingTag] = useState(false);
  const [tagStatus, setTagStatus] = useState<'available' | 'unavailable' | null>(null);

  useEffect(() => {
    if (tag.length === 4 && username) {
      checkTag();
    } else {
      setTagStatus(null);
    }
  }, [tag, username]);

  const checkTag = async () => {
    if (tag.length !== 4 || !username) return;

    setCheckingTag(true);
    try {
      const available = await checkTagAvailability(username, tag);
      setTagStatus(available ? 'available' : 'unavailable');
    } catch (error) {
      console.error('Error checking tag:', error);
    } finally {
      setCheckingTag(false);
    }
  };

  const handleGenerateTag = () => {
    const newTag = generateRandomTag();
    setTag(newTag);
  };

  const generateSecurePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    const allChars = uppercase + lowercase + numbers + special;
    for (let i = 0; i < 9; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    const shuffled = password.split('').sort(() => Math.random() - 0.5).join('');
    return shuffled;
  };

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword();
    setPassword(newPassword);
    setConfirmPassword(newPassword);
  };

  const validatePassword = (pwd: string) => {
    const requirements = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*]/.test(pwd),
    };
    return requirements;
  };

  const passwordReqs = validatePassword(password);
  const allRequirementsMet = Object.values(passwordReqs).every(req => req);

  const validateForm = () => {
    if (!email || !username || !tag || !password || !confirmPassword) {
      setError('Todos os campos são obrigatórios');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email inválido');
      return false;
    }

    if (username.length < 3) {
      setError('Username deve ter pelo menos 3 caracteres');
      return false;
    }

    if (!/^[A-Za-z0-9]{4}$/.test(tag)) {
      setError('Tag deve ter exatamente 4 caracteres (letras ou números)');
      return false;
    }

    if (password.length < 8) {
      setError('Palavra-passe deve ter pelo menos 8 caracteres');
      return false;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Palavra-passe deve conter pelo menos 1 letra maiúscula');
      return false;
    }

    if (!/[0-9]/.test(password)) {
      setError('Palavra-passe deve conter pelo menos 1 número');
      return false;
    }

    if (!/[!@#$%^&*]/.test(password)) {
      setError('Palavra-passe deve conter pelo menos 1 caractere especial (!@#$%^&*)');
      return false;
    }

    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem');
      return false;
    }

    if (tagStatus === 'unavailable') {
      setError('Tag não está disponível. Por favor, escolha outra.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      await registerUser(email, username, tag, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white">Criar Conta</h2>
            <p className="text-slate-400">Preencha os dados para se registar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="seu@email.com"
                  disabled={loading || success}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="usuario_exemplo"
                  disabled={loading || success}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tag Única (4 caracteres)
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                      className="w-full pl-12 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="XXXX"
                      maxLength={4}
                      disabled={loading || success}
                    />
                    {checkingTag && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 animate-spin" />
                    )}
                    {!checkingTag && tagStatus === 'available' && tag.length === 4 && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                    )}
                    {!checkingTag && tagStatus === 'unavailable' && tag.length === 4 && (
                      <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateTag}
                    className="px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-white transition-colors flex items-center gap-2"
                    disabled={loading || success}
                  >
                    <Shuffle className="w-5 h-5" />
                  </button>
                </div>
                {username && tag.length === 4 && (
                  <div className="text-sm text-slate-400 flex items-center gap-2">
                    Formato final: <span className="text-white font-mono">{username}#{tag}</span>
                  </div>
                )}
                {tagStatus === 'unavailable' && (
                  <p className="text-sm text-red-400">Tag não disponível. Escolha outra.</p>
                )}
                {tagStatus === 'available' && (
                  <p className="text-sm text-green-400">Tag disponível!</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Palavra-passe
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                      disabled={loading || success}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      disabled={loading || success}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-white transition-colors flex items-center gap-2"
                    disabled={loading || success}
                    title="Gerar palavra-passe segura"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-300 mb-1.5">Requisitos da palavra-passe:</p>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordReqs.length ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className={passwordReqs.length ? 'text-green-400' : 'text-slate-400'}>
                      Mínimo de 8 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordReqs.uppercase ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className={passwordReqs.uppercase ? 'text-green-400' : 'text-slate-400'}>
                      Pelo menos 1 letra maiúscula
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordReqs.number ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className={passwordReqs.number ? 'text-green-400' : 'text-slate-400'}>
                      Pelo menos 1 número
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordReqs.special ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className={passwordReqs.special ? 'text-green-400' : 'text-slate-400'}>
                      Pelo menos 1 caractere especial (!@#$%^&*)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirmar Palavra-passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  disabled={loading || success}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-400 mt-1.5 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  As palavras-passe não coincidem
                </p>
              )}
              {confirmPassword && password === confirmPassword && allRequirementsMet && (
                <p className="text-sm text-green-400 mt-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  As palavras-passe coincidem
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Conta criada com sucesso! Redirecionando...
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success || checkingTag || !allRequirementsMet || password !== confirmPassword}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {success ? 'Conta Criada!' : 'Criar Conta'}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-slate-400 hover:text-white text-sm transition-colors"
              disabled={loading || success}
            >
              Já tem conta? <span className="text-blue-400 font-semibold">Entrar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
