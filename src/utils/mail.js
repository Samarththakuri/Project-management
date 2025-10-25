import Mailgen from "mailgen";

const emailVerificationMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our App! we' are excited to have you on board.",
      action: {
        instructions:
          "To verify your email please click on the following button",
        button: {
          color: "#1aae5aff",
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
          color: "#37137aff",
          text: "Reset password",
          link: passwordResetUrl,
        },
      },
      outro: "Stuck?,Reply to this email",
    },
  };
};
export { emailVerificationMailgenContent, forgotPasswordMailgenContent };
