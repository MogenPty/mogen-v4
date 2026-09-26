import type { MailMessage, MailResult } from "./mail-types";
import type { MailProvider } from "./mail-provider";

/**
 * In-memory fake for application-level tests. Captures sent messages so
 * tests can assert recipient / subject / replyTo / body without live email.
 */
export class FakeMailProvider implements MailProvider {
  readonly name: string;
  readonly sent: MailMessage[] = [];
  constructor(
    name = "fake",
    private behaviour: MailResult = { success: true, messageId: "fake-id-1" },
  ) {
    this.name = name;
  }

  setBehaviour(behaviour: MailResult): void {
    this.behaviour = behaviour;
  }

  async send(message: MailMessage): Promise<MailResult> {
    if (this.behaviour.success) {
      this.sent.push(message);
    }
    return this.behaviour;
  }
}
