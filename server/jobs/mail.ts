import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../config";
export type Mail = { id: string; to: string; subject: string; text: string };
export type MailSender = (mail: Mail) => Promise<void>;
export function createMailSender(config: AppConfig): MailSender {
  const options = config.mail;
  const transport =
    options.mode === "smtp"
      ? nodemailer.createTransport({
          host: options.host,
          port: options.port,
          secure: options.secure,
          requireTLS: config.mode === "production" && !options.secure,
          ...(options.user
            ? { auth: { user: options.user, pass: options.password } }
            : {}),
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 20_000,
          disableFileAccess: true,
          disableUrlAccess: true,
        })
      : nodemailer.createTransport({
          streamTransport: true,
          buffer: true,
          newline: "unix",
        });
  return async (mail) => {
    if (options.mode === "disabled") throw new Error("MAIL_DISABLED");
    const messageId = `<${mail.id}@${new URL(config.origin).hostname}>`;
    const result = await transport.sendMail({
      from: options.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      messageId,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    if (options.mode === "capture") {
      await mkdir(options.captureDir, { recursive: true, mode: 0o700 });
      try {
        await writeFile(
          path.join(options.captureDir, `${mail.id}.eml`),
          result.message,
          { mode: 0o600, flag: "wx" },
        );
      } catch (e) {
        if (!(e instanceof Error && "code" in e && e.code === "EEXIST"))
          throw e;
      }
    } else if (!result.accepted?.length) throw new Error("SMTP_REJECTED");
  };
}
