require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const quotes = require("./quotes.json");

const twilio = require("twilio");
const { exit } = require("process");
const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const SELECT_CANDIDATE = "Select candidate";
const CONFIRM_REPORT = "Are these details correct?";

let isUserLoggedIn = false;

const keyboardOption = {
  "parse_mode": "Markdown",
  "reply_markup": {
      "one_time_keyboard": true,
      "keyboard": [[{
        text: "Yes",
        request_contact: true
      }], ["Cancel"]]
  }
};

const otpOption = {
  "parse_mode": "Markdown",
  "reply_markup": {
      "one_time_keyboard": true
  }
};

const sendOtp = async (number) => {
  await client.verify.services(process.env.TWILIO_SERVICE_ID)
    .verifications
    .create({
      to: `+${number}`,
      channel: 'sms'
    });
};

const verifyOtp = async (number, otp) => {
  const verification = await client.verify.services(process.env.TWILIO_SERVICE_ID)
    .verificationChecks
    .create({to: `+${number}`, code: otp});
	return verification.status;
};

bot.onText(/\/log_in/, async (msg, match) => {
	let userPhoneNumber = '';

	if (isUserLoggedIn) {
		bot.sendMessage(msg.chat.id, "You are already logged in");
	} else {
		bot.sendMessage(msg.chat.id, "Do you want to log in using your contact information?", keyboardOption);
		bot.on("message", async (msg, match) => {
			if (msg.contact) {
				userPhoneNumber = msg.contact.phone_number
				await sendOtp(userPhoneNumber);
				bot.sendMessage(msg.chat.id, "Please enter the OTP we sent to your phone number", otpOption);
			}
		});

		bot.onText(/\d/, async (msg, match) => {
			let otp = '';
			let isVerified = false;

			otp = match["input"];
			isVerified = await verifyOtp(userPhoneNumber, otp);
			if (isVerified) {
				bot.sendMessage(msg.chat.id, "Successfully logged in!");
				isUserLoggedIn = true;
			}
		});
	}
});

bot.onText(/\/log_out/, async (msg, match) => {
	if (isUserLoggedIn) {
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
			if (msg.text !== "CANCEL") {
				bot.sendMessage(msg.chat.id, "Successfully logged out!");
				isUserLoggedIn = false;
			}
		});
	}
})

bot.onText(/QUOTES/, function (msg, match) {
  bot.sendMessage(msg.chat.id, SELECT_CANDIDATE, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Emmanuel 'Manny' Pacquiao",
            callback_data: "manny",
          },
        ],
        [
          {
            text: "Ferdinand 'Bongbong' Marcos",
            callback_data: "bongbong",
          },
        ],
        [
          {
            text: "Francisco 'Isko' Moreno",
            callback_data: "isko",
          },
        ],
        [
          {
            text: "Ma. Leonor 'Leni' Robredo",
            callback_data: "leni",
          },
        ],
        [
          {
            text: "Panfilo 'Ping' Lacson",
            callback_data: "ping",
          },
        ],
      ],
    },
  });
});

bot.on("callback_query", function onCallbackQuery(callbackQuery) {
	const data = callbackQuery.data;
	const msg = callbackQuery.message;

	if (msg.text === SELECT_CANDIDATE) {
		const parsed_quotes = JSON.parse(JSON.stringify(quotes.candidates));
		let candidate = parsed_quotes.filter((c) => c.candidate === data)[0];
		let quote =
		  candidate.quotes[Math.floor(Math.random() * candidate.quotes.length)];

		bot.sendMessage(msg.chat.id, quote);
	} else if (msg.text === CONFIRM_REPORT) {
		if (data == "yes") {
			bot.sendMessage(msg.chat.id, "Sending email");
			//TODO: Need to send email
		} else {
			bot.sendMessage(msg.chat.id, "Try again");
		}
	}
});


//TODO: First, need to check if user is logged in
//TODO: Then, these variables need to be associated with a specific logged in user
const wait = [];
const report_resp = [];

bot.onText(/REPORT/, (msg) => {
	const chatId = msg.chat.id;
	bot.sendMessage(chatId, "What is your name?");
	wait.push("name");
});

//Wait for any message, get details
bot.on('message', (msg) => {
	const chatId = msg.chat.id;
	if (wait.includes("name")) {
		report_resp.push(msg.text);
		wait.splice(wait.indexOf("name"), 1);

		wait.push("email");
		bot.sendMessage(chatId, "What is your email?");
	} else if (wait.includes("email")) {
		report_resp.push(msg.text);
		//TODO: Need to validate email if correct format
		wait.splice(wait.indexOf("email"), 1);

		wait.push("report");
		bot.sendMessage(chatId, "What is your report?");
	} else if (wait.includes("report")) {
		report_resp.push(msg.text);
		wait.splice(wait.indexOf("report"), 1);

		bot.sendMessage(chatId, "Your name is " + report_resp.slice(0,1)
			+ "\nYour email is " + report_resp.slice(1,2)
			+ "\nYour report is " + report_resp.slice(2,3));

		bot.sendMessage(chatId, CONFIRM_REPORT, {
			reply_markup: {
			  inline_keyboard: [
				[
				  {
					text: "Yes",
					callback_data: "yes",
				  },
				],
				[
				  {
					text: "No",
					callback_data: "no",
				  },
				],
			  ],
			},
		});
	}
});
