import { randomUUID } from 'node:crypto';
import { unauthorized, validationError } from '../../common/errors/app-error';
import { env } from '../../config/env';
import type { AdminUser } from './admin-user.entity';
import type { AdminUsersRepository } from './admin-users.repository';
import { hashPassword, verifyPassword } from './password';
import { hashToken, nuevoToken, plazoEnMs } from './refresh';
import type { RefreshTokensRepository } from './refresh-tokens.repository';
import { signAccessToken, verifyAccessToken } from './token';

export interface AdminUserDto {
  id: string;
  usuario: string;
  email: string | null;
  nombre: string;
  rol: AdminUser['rol'];
}

export interface LoginResultDto {
  token: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** Segundos de vida del token de acceso. */
  expiresIn: number;
  usuario: AdminUserDto;
}

const toDto = (u: AdminUser): AdminUserDto => ({ id: u.id, usuario: u.usuario, email: u.email, nombre: u.nombre, rol: u.rol });

// Hash de relleno: si el usuario no existe se compara igual contra uno falso, para que el tiempo de
// respuesta no revele qué cuentas están registradas.
const FALSE_HASH_PROMISE = hashPassword('contraseña-que-nadie-usa');

export class AuthService {
  constructor(
    private readonly users: AdminUsersRepository,
    private readonly sesiones: RefreshTokensRepository,
  ) {}

  async login(usuario: string, password: string, dispositivo?: string): Promise<LoginResultDto> {
    const user = await this.users.findByUsuario(usuario);
    const ok = await verifyPassword(password, user?.passwordHash ?? (await FALSE_HASH_PROMISE));
    if (!user || !user.activo || !ok) throw unauthorized('Usuario o contraseña incorrectos');

    await this.users.touchLastLogin(user.id);
    return this.sesion(user, randomUUID(), dispositivo ?? null);
  }

  async refresh(raw: string): Promise<LoginResultDto> {
    const row = await this.sesiones.findByHash(hashToken(raw));
    if (!row) throw unauthorized();
    if (row.revocado) {
      await this.sesiones.revokeFamily(row.familia);
      throw unauthorized('La sesión ya no es válida. Entra de nuevo.');
    }
    if (row.vence.getTime() <= Date.now()) {
      await this.sesiones.revokeById(row.id);
      throw unauthorized();
    }
    const user = await this.users.findById(row.userId);
    if (!user || !user.activo) throw unauthorized();
    const tomado = await this.sesiones.revokeIfActive(row.id);
    if (!tomado) {
      await this.sesiones.revokeFamily(row.familia);
      throw unauthorized('La sesión ya no es válida. Entra de nuevo.');
    }
    return this.sesion(user, row.familia, row.dispositivo);
  }

  /** Cierra esta sesión. Si el token ya se había usado, cierra también las que salieron de él. */
  async logout(raw: string): Promise<void> {
    const row = await this.sesiones.findByHash(hashToken(raw));
    if (!row) return;
    if (row.revocado) {
      await this.sesiones.revokeFamily(row.familia);
      return;
    }
    await this.sesiones.revokeById(row.id);
  }

  async changePassword(userId: string, actual: string, nueva: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user || !user.activo) throw unauthorized();
    if (!(await verifyPassword(actual, user.passwordHash))) throw unauthorized('La contraseña actual no es correcta');
    if (actual === nueva) throw validationError([{ campo: 'passwordNueva', mensaje: 'Elige una contraseña distinta' }]);
    await this.users.updatePassword(userId, await hashPassword(nueva));
    await this.sesiones.revokeUser(userId);
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

  /** Alta de un administrador (la usa el seed; la app no crea usuarios). */
  async createAdmin(data: { usuario: string; email?: string | null; password: string; nombre: string }): Promise<AdminUserDto> {
    return toDto(
      await this.users.create({
        usuario: data.usuario,
        email: data.email ?? null,
        nombre: data.nombre,
        passwordHash: await hashPassword(data.password),
        rol: 'admin',
      }),
    );
  }

  private async sesion(user: AdminUser, familia: string, dispositivo: string | null): Promise<LoginResultDto> {
    const refreshToken = nuevoToken();
    await this.sesiones.insert({
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      familia,
      dispositivo,
      vence: new Date(Date.now() + plazoEnMs(env.JWT_REFRESH_EXPIRES_IN)),
    });
    const { token, expiresIn } = signAccessToken({ userId: user.id, rol: user.rol });
    return { token, refreshToken, tokenType: 'Bearer', expiresIn, usuario: toDto(user) };
  }
}
