import { IRefreshTokenRepository } from '../../../ports/repositories/refresh-token.repository.port';

export class LogoutUseCase {
  constructor(private refreshTokenRepository: IRefreshTokenRepository) {}

  async execute(token: string): Promise<void> {
    await this.refreshTokenRepository.revoke(token);
  }
}
