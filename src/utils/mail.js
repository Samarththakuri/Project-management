import { request, response, text } from "express";
import Mailgen from "mailgen";

import nodemailer from "nodemailer";
const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task Manager",
      link: "https://taskmanagelink.com",
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);
  const emailHtml = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mail = {
    from: "mail.taskmanager@example.com",
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHtml,
  };

  try {
    await transporter.sendMail(mail);
    console.log("✅ Email sent successfully");
  } catch (error) {
    console.error("❌ Email service failed", error);
  }
};

const emailVerificationMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our App! we' are excited to have you on board.",
      action: {
        instructions:
          "To verify your email please click on the following button",
        button: {
          color: "#1aae5a",
          text: "Verify your email",
          link: verificationUrl,
        },
      },
      outro: "Stuck?,Reply to this email",
    },
  };
};

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our App! we' are excited to have you on board.",
      action: {
        instructions: "To reset you password click on the following button",
        button: {
          color: "#37137a",
          text: "Reset password",
          link: passwordResetUrl,
        },
      },
      outro: "Stuck?,Reply to this email",
    },
  };
};
export {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
};
