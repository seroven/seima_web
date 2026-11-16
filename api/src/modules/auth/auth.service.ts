import { unauthorized } from '../../common/errors/app-error';
import type { AdminUser } from './admin-user.entity';
import type { AdminUsersRepository } from './admin-users.repository';
import { hashPassword, verifyPassword } from './password';
import { signAccessToken, verifyAccessToken } from './token';

export interface AdminUserDto {
  id: string;
  email: string;
  nombre: string;
  rol: AdminUser['rol'];
}

export interface LoginResultDto {
  token: string;
  tokenType: 'Bearer';
  /** Segundos de vida del token. */
  expiresIn: number;
  usuario: AdminUserDto;
}

const toDto = (u: AdminUser): AdminUserDto => ({ id: u.id, email: u.email, nombre: u.nombre, rol: u.rol });

// Hash de relleno: si el correo no existe se compara igual contra uno falso, para que el tiempo de
// respuesta no revele qué correos están registrados.
const FALSE_HASH_PROMISE = hashPassword('contraseña-que-nadie-usa');

export class AuthService {
  constructor(private readonly users: AdminUsersRepository) {}

  async login(email: string, password: string): Promise<LoginResultDto> {
    const user = await this.users.findByEmail(email);
    const ok = await verifyPassword(password, user?.passwordHash ?? (await FALSE_HASH_PROMISE));
    if (!user || !user.activo || !ok) throw unauthorized('Correo o contraseña incorrectos');

    await this.users.touchLastLogin(user.id);
    const { token, expiresIn } = signAccessToken({ userId: user.id, rol: user.rol });
    return { token, tokenType: 'Bearer', expiresIn, usuario: toDto(user) };
  }

  /** Valida un token y devuelve el usuario vigente (si lo desactivan, el token deja de servir al instante). */
  async authenticate(token: string): Promise<AdminUser> {
    const claims = verifyAccessToken(token);
    const user = await this.users.findById(claims.userId);
    if (!user || !user.activo) throw unauthorized();
    return user;
  }

  async me(userId: string): Promise<AdminUserDto> {
    const user = await this.users.findById(userId);
    if (!user || !user.activo) throw unauthorized();
    return toDto(user);
  }

  /** Alta de un administrador (la usa el seed; el panel no crea usuarios por ahora). */
  async createAdmin(data: { email: string; password: string; nombre: string }): Promise<AdminUserDto> {
    return toDto(await this.users.create({ email: data.email, nombre: data.nombre, passwordHash: await hashPassword(data.password), rol: 'admin' }));
  }
}
