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
