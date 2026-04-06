const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromAddress = process.env.EMAIL_FROM || 'no-reply@controlefinanceiro.app';
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

let transport;

if (smtpHost && smtpUser && smtpPass) {
  transport = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
} else {
  transport = nodemailer.createTransport({
    jsonTransport: true
  });
}

const enviarEmailConfirmacao = async (to, token, nome) => {
  const link = `${backendUrl}/api/users/verificar/${token}`;
  const mail = {
    from: fromAddress,
    to,
    subject: 'Confirme seu cadastro no Controle Financeiro',
    text: `Olá ${nome},\n\nObrigado por se cadastrar no Controle Financeiro.\n\nClique no link abaixo para confirmar seu email e ativar sua conta dentro de 3 dias:\n${link}\n\nSe você não fizer a confirmação em 3 dias, sua conta ficará bloqueada.\n\nSe você não fez esse cadastro, ignore esta mensagem.\n\nObrigado!`,
    html: `<p>Olá <strong>${nome}</strong>,</p>
           <p>Obrigado por se cadastrar no <strong>Controle Financeiro</strong>.</p>
           <p>Clique no link abaixo para confirmar seu email e ativar sua conta dentro de <strong>3 dias</strong>:</p>
           <p><a href="${link}">${link}</a></p>
           <p>Se você não fizer a confirmação em 3 dias, sua conta ficará bloqueada.</p>
           <p>Se você não fez esse cadastro, ignore esta mensagem.</p>
           <p>Obrigado!</p>`
  };

  const info = await transport.sendMail(mail);

  if (!smtpHost) {
    console.log('===== Email de confirmação =====');
    console.log(`Para: ${to}`);
    console.log(`Assunto: ${mail.subject}`);
    console.log(`Link de verificação: ${link}`);
    console.log('================================');
  }

  return info;
};

module.exports = {
  enviarEmailConfirmacao
};
