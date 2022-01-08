require("dotenv").config();

const nodemailer = require("nodemailer");

const mailer = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateMessage = (messageObject) => {
  return {
    from: `${messageObject.name} <${messageObject.email}>`,
    replyTo: messageObject.email,
    to: process.env.EMAIL_RECIPIENT,
    subject: `A report from ${messageObject.name}`,
    html: `
            <strong>Name:</strong> ${messageObject.name}
            <br />
            <strong>Report:</strong> ${messageObject.report}
        `,
  };
};

module.exports = {
  mailer,
  generateMessage,
};
