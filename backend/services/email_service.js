const { Resend } = require('resend');

const createEmailService = ({ ResendClient = Resend, env = process.env } = {}) => {
  const sendOtpEmail = async ({ email, otp, purpose }) => {
    const { RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME = 'Nila Foods' } = env;
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      throw new Error('Resend email configuration is missing.');
    }

    const isReset = purpose === 'PASSWORD_RESET';
    const subject = isReset ? 'Reset your Nila Foods password' : 'Verify your Nila Foods account';
    const title = isReset ? 'Reset your password' : 'Verify your email';
    const notice = isReset
      ? 'If you did not request a password reset, secure your account and ignore this email.'
      : 'If you did not create a Nila Foods account, you can ignore this email.';
    const text = `${title}\n\nYour Nila Foods verification code is ${otp}.\nIt expires in 10 minutes. Do not share this code with anyone.\n\n${notice}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#292524">
        <p style="font-size:13px;font-weight:700;letter-spacing:2px;color:#166534">NILA FOODS</p>
        <h1 style="font-size:24px">${title}</h1>
        <p>Use this 6-digit code to ${isReset ? 'reset your password' : 'verify your email address'}:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#14532d">${otp}</p>
        <p>This code expires in 10 minutes. Do not share it with anyone.</p>
        <p style="font-size:13px;color:#78716c">${notice}</p>
      </div>`;
    const resend = new ResendClient(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: [email],
      subject,
      text,
      html,
    });
    if (error) throw new Error('Resend could not deliver the email.');
  };

  return {
    sendEmailVerificationOTP: (email, otp) => sendOtpEmail({ email, otp, purpose: 'EMAIL_VERIFICATION' }),
    sendPasswordResetOTP: (email, otp) => sendOtpEmail({ email, otp, purpose: 'PASSWORD_RESET' }),
  };
};

module.exports = { ...createEmailService(), createEmailService };
