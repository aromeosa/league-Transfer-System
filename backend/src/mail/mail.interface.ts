export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

/** Swap the provider bound to MAIL_SERVICE (see mail.module.ts) for a real vendor later. */
export interface MailService {
  sendPasswordReset(toEmail: string, resetUrl: string): Promise<void>;
  sendPlayerRegistrationInvite(
    toEmail: string,
    playerName: string,
    teamName: string,
    confirmUrl: string,
  ): Promise<void>;
}
