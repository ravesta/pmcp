/**
 * API publik modul auth. Modul lain dan UI hanya boleh mengimpor dari sini (Technical Design §5.1).
 */
export { changeOwnPassword } from './application/change-password';
export type { ChangePasswordInput } from './application/change-password';
export { login } from './application/login';
export type { LoginInput, LoginSuccess } from './application/login';
export type { AuthDeps, AuthRepository, PasswordHasher, TokenService, UserRecord } from './application/ports';
export { logout, requireSession, requireSessionResult, toActor } from './application/session-use-cases';
export type { AuthenticatedSession } from './application/session-use-cases';
export { can } from './domain/actor';
export type { Action, Actor, Role, StageKind } from './domain/actor';
export { generateTemporaryPassword } from './domain/temporary-password';
export type { RandomIndex } from './domain/temporary-password';
export { isValidUsername, normalizeUsername } from './domain/username';
export { createArgon2Hasher, createTokenService, cryptoRandomIndex } from './infrastructure/crypto-services';
export { createPrismaAuthRepository } from './infrastructure/prisma-auth-repository';
