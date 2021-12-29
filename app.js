require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const PRESIDENTIABLES = require('./data/presidentiables.json');
const QUOTES = require("./data/quotes.json");
const RESERVED_KEYWORDS = require('./data/reserved-keywords.json');

const validateEmail = require('./utils/email-validator');
const { mailer, generateMessage } = require('./utils/mailer');

const SELECT_CANDIDATE = "Select candidate";
const CONFIRM_REPORT = "Are these details correct?";

//TODO: First, need to check if user is logged in
//TODO: Then, these variables need to be associated with a specific logged in user
/**
 * This function generates and sends the report (if user opted to).
 *
 * @param chatId 
 * @param msg 
 */
const reportGenerator = (chatId, msg) => {
	if (!reportDetails.hasOwnProperty('name')) {
		reportDetails['name'] = msg.text;
		bot.sendMessage(chatId, "What is your email?");
	} else if (reportDetails.hasOwnProperty('name') && !reportDetails.hasOwnProperty('email')) {
		if (validateEmail(msg.text)) {
			reportDetails['email'] = msg.text;
			bot.sendMessage(chatId, "What is your report?");
		} else {
			bot.sendMessage(chatId, "Please provide a valid email.");
		}
	} else if (reportDetails.hasOwnProperty('name') && reportDetails.hasOwnProperty('email') &&
		!reportDetails.hasOwnProperty('report')) {
		reportDetails['report'] = msg.text;

		bot.sendMessage(chatId,
			'You requested a report with the following details\n' +
			`Name: ${reportDetails.name}\n` +
			`Email: ${reportDetails.email}\n` +
			`Report: ${reportDetails.report}\n\n` +
			`${CONFIRM_REPORT}`, {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "Yes",
							callback_data: "report_yes",
						}
					],
					[
						{
							text: "No",
							callback_data: "report_no",
						}
					]
				]
			}
		}
		);
	}
};

bot.onText(/QUOTES/, (msg) => {
	bot.sendMessage(msg.chat.id, SELECT_CANDIDATE, {
		reply_markup: {
			inline_keyboard: [...PRESIDENTIABLES]
		}
	});
});

bot.onText(/REPORT/, (msg) => {
	if (!reportStarted) {
		reportDetails = {};
		reportStarted = true;
		bot.sendMessage(msg.chat.id, "What is your name?");
	}
});

bot.on("message", (msg) => {
	const chatId = msg.chat.id;

	// Restrict reserved keywords
	if (reportStarted && RESERVED_KEYWORDS.includes(msg.text)) {
		bot.sendMessage(chatId, "The input provided is reserved. Please try again.");
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
		const quote = candidate.quotes[Math.floor(Math.random() * candidate.quotes.length)];

		bot.sendMessage(msg.chat.id, quote);

	// For the report email notification
	} else if (data === 'report_yes') {
		bot.sendMessage(msg.chat.id, "Sending email. Please wait.");
		reportStarted = false;
		reportSent = true;

		// Send the email
		mailer.sendMail(generateMessage(reportDetails), (err, info) => {
			if (err) {
				console.log(err);
				bot.sendMessage(msg.chat.id, "There was a problem sending the report to your email. Please try again later.");
			} else {
				bot.sendMessage(msg.chat.id, "Email sent!");
			}
		});

	} else if (data === 'report_no') {
		if (reportSent) {
			bot.sendMessage(msg.chat.id, "Sorry, the report was already sent.");
			reportStarted = false;
		} else {
			bot.sendMessage(msg.chat.id, "Try again.");
			reportSent = false;
			reportDetails = {};

			// Ask the user again
			bot.sendMessage(msg.chat.id, "What is your name?");
			reportStarted = true;
		}
	}
});
