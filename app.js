require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const twilio = require("twilio");
const { exit } = require("process");
const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const PRESIDENTIABLES = require("./data/presidentiables.json");
const QUOTES = require("./data/quotes.json");
const RESERVED_KEYWORDS = require("./data/reserved-keywords.json");

const validateEmail = require("./utils/email-validator");
const { mailer, generateMessage } = require("./utils/mailer");

const SELECT_CANDIDATE = "Select candidate";
const CONFIRM_REPORT = "Are these details correct?";

let isUserLoggedIn = false;
let isLoginProcessStarted = false;
const keywords = ["/log_in", "/log_out", "/report", "/quotes", "Cancel"];

const keyboardOption = {
  parse_mode: "Markdown",
  reply_markup: {
    one_time_keyboard: true,
    keyboard: [
      [
        {
          text: "Yes",
          request_contact: true,
        },
      ],
      ["Cancel"],
    ],
  },
};

const otpOption = {
  parse_mode: "Markdown",
  reply_markup: {
    one_time_keyboard: true,
  },
};

const sendOtp = async (number) => {
  await client.verify
    .services(process.env.TWILIO_SERVICE_ID)
    .verifications.create({
      to: `+${number}`,
      channel: "sms",
    });
};

const verifyOtp = async (number, otp) => {
	try {
		const verification = await client.verify.services(process.env.TWILIO_SERVICE_ID)
			.verificationChecks
			.create({ to: `+${number}`, code: otp });
		return verification.status;
	} catch (error) {
		return error.message;
	}
};

bot.onText(/\/LOG_IN/i, async (msg, match) => {
	let userPhoneNumber = '';

	if (isUserLoggedIn) {
		bot.sendMessage(msg.chat.id, "You are already logged in");
	} else {
		isLoginProcessStarted = true;

		bot.sendMessage(msg.chat.id, "Do you want to log in using your contact information?", keyboardOption);
		bot.on("message", async (msg, match) => {
			if (msg.contact && isLoginProcessStarted) {
				userPhoneNumber = msg.contact.phone_number
				await sendOtp(userPhoneNumber);
				bot.sendMessage(msg.chat.id, "Please enter the OTP we sent to your phone number", otpOption);
			}
		});

		bot.onText(/.+/, async (msg, match) => {
			let otp = '';
			let isVerified = false;
			const pattern = /(\d+)/gi
			otp = match["input"];
			otp = otp.toLowerCase();

			if (pattern.test(otp) && !keywords.includes(otp)) {
				bot.sendMessage(msg.chat.id, "Please enter a valid OTP number.");
			} else if (pattern.test(otp)) {
				isVerified = await verifyOtp(userPhoneNumber, otp);
				if (isVerified && isLoginProcessStarted) {
					bot.sendMessage(msg.chat.id, "Successfully logged in!");
					isUserLoggedIn = true;
					isLoginProcessStarted = false;
				}
			}
		});
	}
});

bot.onText(/\/LOG_OUT/i, async (msg, match) => {
	isLoginProcessStarted = false;

	if (!isUserLoggedIn) {
		bot.sendMessage(msg.chat.id, "Please log in to continue.");
	} else {
		bot.sendMessage(msg.chat.id, "Do you want to log out?", {
			"parse_mode": "Markdown",
			"reply_markup": {
				"one_time_keyboard": true,
				"keyboard": [[{
					text: "Yes"
				}], ["Cancel"]]
			}
		});

		bot.on("message", async (msg, match) => {
			if (isUserLoggedIn && !keywords.includes(msg.text.toLowerCase())) {
				bot.sendMessage(msg.chat.id, "Successfully logged out!");
				isUserLoggedIn = false;
				isLoginProcessStarted = false
			}
			isLoginProcessStarted = false
		});
	}
})

/**
 * This function generates and sends the report (if user opted to).
 *
 * @param chatId
 * @param msg
 */
const reportGenerator = (chatId, msg) => {
  if (!reportDetails.hasOwnProperty("name")) {
    reportDetails["name"] = msg.text;
    bot.sendMessage(chatId, "What is your email?");
  } else if (
    reportDetails.hasOwnProperty("name") &&
    !reportDetails.hasOwnProperty("email")
  ) {
    if (validateEmail(msg.text)) {
      reportDetails["email"] = msg.text;
      bot.sendMessage(chatId, "What is your report?");
    } else {
      bot.sendMessage(chatId, "Please provide a valid email.");
    }
  } else if (
    reportDetails.hasOwnProperty("name") &&
    reportDetails.hasOwnProperty("email") &&
    !reportDetails.hasOwnProperty("report")
  ) {
    reportDetails["report"] = msg.text;

    bot.sendMessage(
      chatId,
      "You requested a report with the following details\n" +
        `Name: ${reportDetails.name}\n` +
        `Email: ${reportDetails.email}\n` +
        `Report: ${reportDetails.report}\n\n` +
        `${CONFIRM_REPORT}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Yes",
                callback_data: "report_yes",
              },
            ],
            [
              {
                text: "No",
                callback_data: "report_no",
              },
            ],
          ],
        },
      }
    );
  }
};

bot.onText(/\/QUOTES/i, (msg) => {
	bot.sendMessage(msg.chat.id, SELECT_CANDIDATE, {
		reply_markup: {
			inline_keyboard: [...PRESIDENTIABLES]
		}
	});
});

bot.onText(/\/REPORT/i, (msg) => {
	if (isUserLoggedIn && !reportStarted) {
		reportDetails = {};
		reportStarted = true;
		bot.sendMessage(msg.chat.id, "What is your name?");
	} else {
		bot.sendMessage(msg.chat.id, "Please log in to send a report.");
		reportStarted = false;
	}
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  // Restrict reserved keywords
  if (reportStarted && RESERVED_KEYWORDS.includes(msg.text)) {
    bot.sendMessage(
      chatId,
      "The input provided is reserved. Please try again."
    );
    return;
  }

  if (reportStarted) {
    reportGenerator(chatId, msg);
  }
});

let reportDetails = {};
let reportSent = false;
let reportStarted = false;
bot.on("callback_query", function onCallbackQuery(callbackQuery) {
  const data = callbackQuery.data;
  const msg = callbackQuery.message;

  // For the presidentible quotes
  if (data.startsWith("quote_")) {
    const candidate = QUOTES.find((c) => c.id === data);
    const quote =
      candidate.quotes[Math.floor(Math.random() * candidate.quotes.length)];

    bot.sendMessage(msg.chat.id, quote);

    // For the report email notification
  } else if (data === "report_yes") {
    bot.sendMessage(msg.chat.id, "Sending email. Please wait.");
    reportStarted = false;
    reportSent = true;

    // Send the email
    mailer.sendMail(generateMessage(reportDetails), (err, info) => {
      if (err) {
        console.log(err);
        bot.sendMessage(
          msg.chat.id,
          "There was a problem sending the report to your email. Please try again later."
        );
      } else {
        bot.sendMessage(msg.chat.id, "Email sent!");
        reportSent = false;
      }
    });
  } else if (data === "report_no") {
    if (reportSent) {
      bot.sendMessage(msg.chat.id, "Sorry, the report was already sent.");
      reportStarted = false;
    } else {
      bot.sendMessage(msg.chat.id, "Try again.").then(() => {
        reportSent = false;
        reportDetails = {};

        // Ask the user again
        bot.sendMessage(msg.chat.id, "What is your name?");
        reportStarted = true;
      });
    }
  }
});
