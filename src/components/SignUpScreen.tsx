import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, User, Lock, Hash, Shuffle, Loader2, CheckCircle2, XCircle, Eye, EyeOff, RefreshCw, Home } from 'lucide-react';
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

    if (tagStatus !== 'available') {
      setError('Tag não disponível ou não verificada');
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
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Voltar</span>
        </button>

        <div className="bg-white rounded-3xl shadow-colivin-lg p-8 space-y-6 border border-gray-100">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-colivin rounded-2xl mb-2">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-colivin bg-clip-text text-transparent">
              Co-Livin
            </h1>
            <h2 className="text-2xl font-bold text-gray-900">Criar Conta</h2>
            <p className="text-gray-600">Junte-se à comunidade</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-colivin-cobalt-500 focus:bg-white transition-all"
                  placeholder="seu@email.com"
                  disabled={loading || success}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-colivin-cobalt-500 focus:bg-white transition-all"
                    placeholder="username"
                    disabled={loading || success}
                    maxLength={20}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tag
                </label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                    className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white transition-all ${
                      tagStatus === 'available' ? 'border-colivin-mint-500' :
                      tagStatus === 'unavailable' ? 'border-red-500' :
                      'border-gray-200 focus:border-colivin-cobalt-500'
                    }`}
                    placeholder="A1B2"
                    disabled={loading || success}
                    maxLength={4}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateTag}
                    disabled={loading || success}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-colivin-cobalt-600 hover:text-colivin-cobalt-700 disabled:opacity-50"
                  >
                    <Shuffle className="w-5 h-5" />
                  </button>
                </div>
                {checkingTag && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    A verificar...
                  </p>
                )}
                {tagStatus === 'available' && (
                  <p className="text-xs text-colivin-mint-600 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {username}#{tag} disponível
                  </p>
                )}
                {tagStatus === 'unavailable' && (
                  <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {username}#{tag} já existe
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Palavra-passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-20 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-colivin-cobalt-500 focus:bg-white transition-all"
                  placeholder="Palavra-passe segura"
                  disabled={loading || success}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    disabled={loading || success}
                    className="text-colivin-cobalt-600 hover:text-colivin-cobalt-700 disabled:opacity-50"
                    title="Gerar palavra-passe"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading || success}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    {passwordReqs.length ? (
                      <CheckCircle2 className="w-3 h-3 text-colivin-mint-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-gray-400" />
                    )}
                    <span className={passwordReqs.length ? 'text-colivin-mint-600 font-medium' : 'text-gray-500'}>
                      Mínimo 8 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordReqs.uppercase ? (
                      <CheckCircle2 className="w-3 h-3 text-colivin-mint-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-gray-400" />
                    )}
                    <span className={passwordReqs.uppercase ? 'text-colivin-mint-600 font-medium' : 'text-gray-500'}>
                      1 letra maiúscula
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordReqs.number ? (
                      <CheckCircle2 className="w-3 h-3 text-colivin-mint-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-gray-400" />
                    )}
                    <span className={passwordReqs.number ? 'text-colivin-mint-600 font-medium' : 'text-gray-500'}>
                      1 número
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {passwordReqs.special ? (
                      <CheckCircle2 className="w-3 h-3 text-colivin-mint-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-gray-400" />
                    )}
                    <span className={passwordReqs.special ? 'text-colivin-mint-600 font-medium' : 'text-gray-500'}>
                      1 caractere especial (!@#$%^&*)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirmar Palavra-passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-colivin-cobalt-500 focus:bg-white transition-all"
                  placeholder="Repita a palavra-passe"
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading || success}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 font-medium mt-1">
                  As palavras-passe não coincidem
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-colivin-mint-50 border-2 border-colivin-mint-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-colivin-mint-600" />
                <p className="text-sm text-colivin-mint-700 font-medium">
                  Conta criada! A redirecionar para login...
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success || !allRequirementsMet || tagStatus !== 'available'}
              className="w-full py-4 bg-gradient-colivin hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-colivin disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  A criar conta...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Conta criada!
                </>
              ) : (
                'Criar Conta'
              )}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-gray-600">
              Já tem conta?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-colivin-cobalt-600 hover:text-colivin-cobalt-700 font-semibold transition-colors"
              >
                Entrar
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
