import TelegramBot from "node-telegram-bot-api";
import db from "../database/firebase";
import { UserData } from "../types";
import { generateWallet } from "../utils/wallet";
import { showIndicatorSelection, showAIModelSelection, showTimeframeSelection, generateIndicatorKeyboard } from "./keyboards";

interface UserIndicatorSelections {
  [chatId: string]: { [indicator: string]: boolean };
}

const userIndicatorSelections: UserIndicatorSelections = {};

// List of valid tokens
const validTokens = [
  "ETH", "BTC", "APT", "SUI", "MELANIA", "TRUMP", "AI16Z", "VIRTUAL", "ADA", "XRP",
  "NEIRO", "DOGS", "PNUT", "FLOKI", "BOME", "LTC", "DOGE", "EIGEN", "TAO", "ZRO",
  "OP", "SHIB", "TON", "BONK", "HBAR", "ENA", "W", "PEPE", "LINK", "WIF", "WLD",
  "STRK", "INJ", "JUP", "MANTA", "SEI", "AVAX", "BLUR", "PYTH", "MEME", "TIA",
  "BNB", "MATIC", "SOL", "ARB"
];

export const registerCallbacks = (bot: TelegramBot) => {
  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id.toString() || "";
    const messageId = query.message?.message_id;
    const userRef = db.ref(`users/${chatId}`);

    if (!chatId || !messageId) return;

    if (query.data === "default_ai") {
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
      await bot.sendMessage(chatId, "🔧Please enter a name for your AI Agent:");
      await userRef.update({ state: "waiting_for_name_default" });
    } else if (query.data === "custom_ai") {
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
      await bot.sendMessage(chatId, "🔧 Please enter a name for your AI Agent:");
      await userRef.update({ state: "waiting_for_name_custom" });
    } else if (query.data?.startsWith("toggle_indicator_")) {
      const indicator = query.data.replace("toggle_indicator_", "");

      if (!userIndicatorSelections[chatId]) {
        userIndicatorSelections[chatId] = {};
      }

      const selectedCount = Object.values(userIndicatorSelections[chatId]).filter(Boolean).length;

      if (userIndicatorSelections[chatId][indicator]) {
        userIndicatorSelections[chatId][indicator] = false;
      } else {
        if (selectedCount >= 3) {
          bot.answerCallbackQuery(query.id, { text: "❌ Bạn chỉ được chọn tối đa 3 chỉ báo!", show_alert: true });
          return;
        }
        userIndicatorSelections[chatId][indicator] = true;
      }

      bot.editMessageReplyMarkup(generateIndicatorKeyboard(chatId, userIndicatorSelections).reply_markup, {
        chat_id: chatId,
        message_id: messageId,
      });
    } else if (query.data === "confirm_indicators") {
      const selectedIndicators = Object.keys(userIndicatorSelections[chatId]).filter(
        (indicator) => userIndicatorSelections[chatId][indicator]
      );

      if (selectedIndicators.length === 0) {
        bot.answerCallbackQuery(query.id, { text: "❌ Bạn cần chọn ít nhất 1 chỉ báo!", show_alert: true });
        return;
      }

      const snapshot = await userRef.once("value");
      const userData = snapshot.val() as UserData;
      const updatedConfig = {
        ...userData.ai_agent_config,
        indicators: selectedIndicators,
      };

      await userRef.update({ ai_agent_config: updatedConfig, state: "waiting_for_ai_model" });

      await bot.deleteMessage(chatId, messageId);
      await bot.sendMessage(chatId, `✅ You have selected: ${selectedIndicators.join(", ")}`);
      delete userIndicatorSelections[chatId];
      showAIModelSelection(bot, chatId);
    } else if (query.data?.startsWith("select_ai_model_")) {
      const selectedModel = query.data.replace("select_ai_model_", "");

      const snapshot = await userRef.once("value");
      const userData = snapshot.val() as UserData;
      const updatedConfig = {
        ...userData.ai_agent_config,
        ai_model: selectedModel,
      };

      await userRef.update({ ai_agent_config: updatedConfig, state: "waiting_for_timeframe" });

      await bot.deleteMessage(chatId, messageId);
      await bot.sendMessage(chatId, `✅ You have selected mô hình AI: ${selectedModel}`);
      showTimeframeSelection(bot, chatId);
    } else if (query.data?.startsWith("select_timeframe_")) {
      const selectedTimeframe = query.data.replace("select_timeframe_", "");

      const snapshot = await userRef.once("value");
      const userData = snapshot.val() as UserData;
      const updatedConfig = {
        ...userData.ai_agent_config,
        timeframe: selectedTimeframe,
      };

      const wallet = generateWallet();

      await userRef.update({
        ai_agent_config: updatedConfig,
        key: wallet.privateKey,
        wallet: wallet.address,
        state: null,
      });

      await bot.deleteMessage(chatId, messageId);
      await bot.sendMessage(chatId, `✅ You have selected a time frame: ${selectedTimeframe}`);

      const walletInfo = `🎉 AI Agent *${userData.ai_agent_config!.name}* has been configured!\n\n`
        + `🔑 *Your wallet has been created!*\n`
        + `📌 *Address:* \`${wallet.address}\`\n`
        + `🔒 *Private Key:* \`${wallet.privateKey}\`\n\n`
        + `🚨 *Note:* Please backup your private key, do not share it with anyone!`;

      await bot.sendMessage(chatId, walletInfo, { parse_mode: "Markdown" });

      
    }

    bot.answerCallbackQuery(query.id);
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id.toString();
    const userRef = db.ref(`users/${chatId}`);
    const snapshot = await userRef.once("value");
    const userData = snapshot.val() as UserData | null;

    if (!userData) {
      return;
    }

    if (userData.state === "waiting_for_name_default") {
      const aiAgentName = msg.text!;
      const wallet = generateWallet();

      await userRef.update({
        ai_agent: true,
        ai_agent_config: {
          name: aiAgentName,
          type: "Default",
          token: "BTC_USD",
          indicators: ["Moving Average (MA)", "Relative Strength Index (RSI)", "MACD"],
          ai_model: 'ChatGPT',
          timeframe: '1h',
        },
        key: wallet.privateKey,
        wallet: wallet.address,
        state: null,
      });

      const walletInfo = `🎉 AI Agent *${userData.ai_agent_config!.name}* has been configured!\n\n`
        + `🔑 *Your wallet has been created!*\n`
        + `📌*Address:* \`${wallet.address}\`\n`
        + `🔒 *Private Key:* \`${wallet.privateKey}\`\n\n`
        + `🚨 *Note:* Please backup your private key, do not share it with anyone!`;

      await bot.sendMessage(chatId, walletInfo, { parse_mode: "Markdown" });

     
    } else if (userData.state === "waiting_for_name_custom") {
      const aiAgentName = msg.text!;

      await userRef.update({
        ai_agent: true,
        ai_agent_config: {
          name: aiAgentName,
          type: "Custom",
          token: null,
          indicators: [],
          ai_model: null,
          timeframe: null,
        },
        state: "waiting_for_token",
      });

      await bot.sendMessage(chatId, `🎉 AI Agent *${aiAgentName}* has been created successfully. Please enter the token you want to trade (eg: BTC, ETH, APT):`, { parse_mode: "Markdown" });
    } else if (userData.state === "waiting_for_token") {
      const inputToken = msg.text!.toUpperCase(); 

      // check  token vaild
      if (!validTokens.includes(inputToken)) {
        await bot.sendMessage(chatId, `⚠️ Token *${inputToken}* is invalid! Please re-enter (eg: BTC, ETH, APT):`, { parse_mode: "Markdown" });
        return;
      }
      const fullToken = `${inputToken}_USD`;

      const updatedConfig = {
        ...userData.ai_agent_config,
        token: fullToken,
      };

      await userRef.update({
        ai_agent_config: updatedConfig,
        state: "waiting_for_indicators",
      });

      await bot.sendMessage(chatId, `✅ You have selected a token: *${inputToken} / USD*. Now select the indicator.`, { parse_mode: "Markdown" });
      showIndicatorSelection(bot, chatId, userIndicatorSelections);
    }
  });
};