import { config } from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import db from "./firebase"; 
import {
  Account,
  Aptos,
  Ed25519PrivateKey,
  type InputEntryFunctionData,
  Network,
  PrivateKey,
  PrivateKeyVariants,
  AccountAddress, AptosConfig, NetworkToNetworkName
} from "@aptos-labs/ts-sdk";

config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN as string;
if (!TOKEN) throw new Error("Thiếu TELEGRAM_BOT_TOKEN trong file .env");

const bot = new TelegramBot(TOKEN, { polling: true });
interface UserData {
  id: number;
  username: string;
  key: string | null;
  wallet: string | null;
  ai_agent: boolean | null;
  ai_agent_config: {
    name: string | null;
    indicators: string[] | null;
    ai_model: string | null;
    timeframe: string | null;
  } | null;
  timestamp: number;
}

const userIndicatorSelections: Record<string, Record<string, boolean>> = {};
const indicators: string[] = [
  "Moving Average (MA)", "Relative Strength Index (RSI)", "MACD",
  "Bollinger Bands", "Stochastic Oscillator", "Fibonacci Retracement",
  "Ichimoku Cloud", "Parabolic SAR", "Volume Profile", "ATR"
];
const generateIndicatorKeyboard = (chatId: string) => {
  if (!userIndicatorSelections[chatId]) {
    userIndicatorSelections[chatId] = {};
  }

  const inlineKeyboard = indicators.map((indicator) => [
    {
      text: `${userIndicatorSelections[chatId][indicator] ? "✅ " : ""}${indicator}`,
      callback_data: `toggle_indicator_${indicator}`,
    },
  ]);

  inlineKeyboard.push([{ text: "👉 Xác nhận", callback_data: "confirm_indicators" }]);

  return { reply_markup: { inline_keyboard: inlineKeyboard } };
};
const showIndicatorSelection = (chatId: string) => {
  bot.sendMessage(chatId, "📊 Hãy chọn tối đa 3 chỉ báo:", generateIndicatorKeyboard(chatId));
};

// Hàm hiển thị menu chọn mô hình AI
const showAIModelSelection = (chatId: string) => {
  const aiModels = ["ChatGPT", "Grok AI", "Gemini", "DeepSeek"];
  const inlineKeyboard = aiModels.map((model) => [
    { text: model, callback_data: `select_ai_model_${model}` },
  ]);

  bot.sendMessage(chatId, "🤖 Hãy chọn mô hình AI:", {
    reply_markup: { inline_keyboard: inlineKeyboard },
  });
};

// Hàm hiển thị menu chọn khung thời gian
const showTimeframeSelection = (chatId: string) => {
  const timeframes = ["5m", "15m", "30m", "1h", "4h", "1d"];
  const inlineKeyboard = timeframes.map((timeframe) => [
    { text: timeframe, callback_data: `select_timeframe_${timeframe}` },
  ]);

  bot.sendMessage(chatId, "⏳ Hãy chọn khung thời gian:", {
    reply_markup: { inline_keyboard: inlineKeyboard },
  });
};


bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from?.username || "No Username";

  const userRef = db.ref(`users/${chatId}`);
  const snapshot = await userRef.once("value");
  const userData = snapshot.val();

  if (!userData || !userData.ai_agent) {
    await userRef.set({
      id: chatId,
      username: userName,
      key: null,
      wallet: null,
      ai_agent: false,
      ai_agent_config: null,
      timestamp: Date.now(),
    });

    bot.sendMessage(chatId, "Chào mừng bạn đến với bot của tôi. Sử dụng /create_aiagent để bắt đầu.");
  } else {
    bot.sendMessage(chatId, "Welcome back, master!");
  }
});

bot.onText(/\/create_aiagent/, async (msg) => {
  const chatId = msg.chat.id;

  const userRef = db.ref(`users/${chatId}`);
  const snapshot = await userRef.once("value");
  const userData = snapshot.val() as UserData | null;

  if (!userData) {
    bot.sendMessage(chatId, "⚠️ Bạn chưa từng sử dụng bot. Hãy nhập /start trước.");
    return;
  }

  if (!userData.ai_agent) {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Dùng AI agent mặc định", callback_data: "default_ai" }],
          [{ text: "Tạo AI agent", callback_data: "custom_ai" }],
        ],
      },
    };

    bot.sendMessage(chatId, "Chọn một tùy chọn:", options);
  } else {
    bot.sendMessage(chatId, "Bạn đã có AI Agent rồi, không thể tạo thêm.");
  }
});
// Lắng nghe callback query
bot.on("callback_query", async (query) => {
  try {
    const chatId: string = query.message?.chat.id.toString() || "";
    const messageId: number | undefined = query.message?.message_id;
    const userRef = db.ref(`users/${chatId}`);

    if (!chatId || !messageId) return;

    if (query.data === "default_ai") {
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
      await bot.sendMessage(chatId, "🔧 Vui lòng nhập tên cho AI Agent của bạn:");

      bot.once("message", async (msg) => {
        if (msg.chat.id.toString() === chatId) {
          const aiAgentName: string = msg.text!;
          const acc = Account.generate(); // Tạo ví

          await userRef.update({
            ai_agent: true,
            ai_agent_config: {
              name: aiAgentName,
              indicators: null,
              ai_model: null,
              timeframe: null,
            },
            key: acc.privateKey.toString(),
            wallet: acc.accountAddress.toString(),
          });

          const walletInfo = `🎉 AI Agent *${aiAgentName}* đã được tạo thành công với cấu hình mặc định!\n\n`
            + `🔑 *Ví của bạn đã được tạo!*\n`
            + `📌 *Địa chỉ ví:* \`${acc.accountAddress.toString()}\`\n`
            + `🔒 *Private Key:* \`${acc.privateKey.toString()}\`\n\n`
            + `🚨 *Lưu ý:* Hãy sao lưu private key của bạn, không chia sẻ cho bất kỳ ai!`;

          await bot.sendMessage(chatId, walletInfo, { parse_mode: "Markdown" });
        }
      });

    } else if (query.data === "custom_ai") {
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
      await bot.sendMessage(chatId, "🔧 Vui lòng nhập tên cho AI Agent của bạn:");

      bot.once("message", async (msg) => {
        if (msg.chat.id.toString() === chatId) {
          const aiAgentName: string = msg.text!;

          await userRef.update({
            ai_agent: true,
            ai_agent_config: {
              name: aiAgentName,
              indicators: [],
              ai_model: null,
              timeframe: null,
            },
          });

          await bot.sendMessage(chatId, `🎉 AI Agent *${aiAgentName}* đã được tạo thành công. Bây giờ hãy cấu hình nó.`, { parse_mode: "Markdown" });

          // Hiển thị danh sách chọn chỉ báo
          showIndicatorSelection(chatId);
        }
      });
    } else if (query.data?.startsWith("toggle_indicator_")) {
      const indicator: string = query.data.replace("toggle_indicator_", "");

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

      bot.editMessageReplyMarkup(generateIndicatorKeyboard(chatId).reply_markup, {
        chat_id: chatId,
        message_id: query.message?.message_id!,
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

      await userRef.update({ ai_agent_config: updatedConfig });

      await bot.deleteMessage(chatId, query.message?.message_id!);
      await bot.sendMessage(chatId, `✅ You have selected: ${selectedIndicators.join(", ")}`);
      delete userIndicatorSelections[chatId];
      showAIModelSelection(chatId);

    } else if (query.data?.startsWith("select_ai_model_")) {
      const selectedModel = query.data.replace("select_ai_model_", "");

      const snapshot = await userRef.once("value");
      const userData = snapshot.val() as UserData;
      const updatedConfig = {
        ...userData.ai_agent_config,
        ai_model: selectedModel,
      };

      await userRef.update({ ai_agent_config: updatedConfig });

      await bot.deleteMessage(chatId, query.message?.message_id!);
      await bot.sendMessage(chatId, `✅ You have selected mô hình AI: ${selectedModel}`);

      showTimeframeSelection(chatId);

    } else if (query.data?.startsWith("select_timeframe_")) {
      const selectedTimeframe = query.data.replace("select_timeframe_", "");

      const snapshot = await userRef.once("value");
      const userData = snapshot.val() as UserData;
      const updatedConfig = {
        ...userData.ai_agent_config,
        timeframe: selectedTimeframe,
      };

      await userRef.update({ ai_agent_config: updatedConfig });

      await bot.deleteMessage(chatId, query.message?.message_id!);
      await bot.sendMessage(chatId, `✅ You have selected khung thời gian: ${selectedTimeframe}`);

      // Có thể thực hiện các hành động tiếp theo ở đây nếu cần
    }

    bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error("Lỗi:", error);
  }
});




// Logging middleware
// Hàm log chi tiết ra console
function logMessage(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Log lỗi polling chi tiết
bot.on("polling_error", (error) => {
  logMessage(`🚨 LỖI POLLING: ${error.message}`);
});

// Log khi bot khởi động
logMessage("🚀 Bot đang chạy...");

// Log khi nhận tin nhắn
bot.on("message", (msg) => {
  logMessage(`📩 Tin nhắn từ [ID: ${msg.chat.id} - USER: ${msg.from?.username || "N/A"}]: ${msg.text}`);
});

// Log khi có callback từ nút bấm
bot.on("callback_query", (query) => {
  logMessage(`🔘 Callback từ [ID: ${query.message?.chat.id}]: ${query.data}`);
});

