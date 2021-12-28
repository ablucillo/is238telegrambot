require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const quotes = require("./quotes.json");

bot.onText(/QUOTES/, function (msg, match) {
  bot.sendMessage(msg.chat.id, "Select candidate", {
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

  if (msg.text === "Select candidate") {
    const parsed_quotes = JSON.parse(JSON.stringify(quotes.candidates));
    let candidate = parsed_quotes.filter((c) => c.candidate === data)[0];
    let quote =
      candidate.quotes[Math.floor(Math.random() * candidate.quotes.length)];

    bot.sendMessage(msg.chat.id, quote);
  }
});

const wait = [];
const report_resp = [];

bot.onText(/REPORT/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "What is your name?");
  wait.push("name");
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (wait.includes("name")) {
	//bot.sendMessage(chatId, msg.text);
	report_resp.push(msg.text);
	wait.splice(wait.indexOf("name"), 1);
	
	wait.push("email");
	bot.sendMessage(chatId, "What is your email?");
  } 
  
  else if (wait.includes("email")) {
	//bot.sendMessage(chatId, msg.text);
	report_resp.push(msg.text);
	wait.splice(wait.indexOf("email"), 1);
	
	wait.push("report");
	bot.sendMessage(chatId, "What is your report?");
  } 

  else if (wait.includes("report")) {
	//bot.sendMessage(chatId, msg.text);
	report_resp.push(msg.text);
	wait.splice(wait.indexOf("report"), 1);
	
	bot.sendMessage(chatId, "Your name is " + report_resp.slice(0,1)
		+ "\nYour email is " + report_resp.slice(1,2)
		+ "\nYour report is " + report_resp.slice(2,3));
	
	bot.sendMessage(chatId, "Are these details correct?", {
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

bot.on("callback_query", function onCallbackQuery(callbackQuery) {
  const data = callbackQuery.data;
  const msg = callbackQuery.message;

  if (msg.text === "Are these details correct?") {
	  if (data == "yes") {
		bot.sendMessage(msg.chat.id, "Sending email");
		//send email
	  } else {
		  bot.sendMessage(msg.chat.id, "Try again");
	  }
  }
});
