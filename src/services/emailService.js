import nodemailer from "nodemailer";

let emailSender = sendSmtpEmail;

async function sendSmtpEmail({ to, verificationUrl }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    throw new Error("Email delivery is not configured.");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject: "Verify your NexPlay email",
    text: `Verify your email address to finish creating your NexPlay account: ${verificationUrl}\n\nThis link expires in 24 hours.`,
    html: `<p>Verify your email address to finish creating your NexPlay account:</p><p><a href="${verificationUrl}">Verify email</a></p><p>This link expires in 24 hours.</p>`
  });
}

export async function sendVerificationEmail({ to, token }) {
  const frontendOrigin = process.env.FRONTEND_ORIGIN?.split(",")[0]?.trim();
  if (!frontendOrigin) {
    throw new Error("FRONTEND_ORIGIN must be configured to send verification links.");
  }

  const verificationUrl = new URL("/verify-email", frontendOrigin);
  verificationUrl.searchParams.set("token", token);
  await emailSender({ to, verificationUrl: verificationUrl.toString() });
}

export function setVerificationEmailSender(sender) {
  emailSender = sender;
}

export function resetVerificationEmailSender() {
  emailSender = sendSmtpEmail;
}
