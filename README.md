# Telegram Financial Records Bot

This repository contains the code for a Telegram bot that helps manage your personal finances. The bot is designed to be deployed using Google Apps Script and integrates with Google Sheets to store and organize your financial data including expenses, income, and transfers.

## Features

- **Track multiple types of financial records** via Telegram using text or voice messages
- **AI-powered processing** using Google Gemini API for natural language understanding
- **Automatic categorization** of expenses and income
- **Interactive confirmation** with edit, confirm, and cancel options
- **Easy configuration** through Google Sheets
- **Secure usage** limited to authorized users
- **Detailed error logging** for troubleshooting

## Prerequisites

- A Telegram account
- Google account to use Google Apps Script and Google Sheets
- Google Gemini API key for AI-powered financial data processing (you can get one for free)

## Getting Started

### 1. Create a Telegram Bot

1. Open Telegram and search for the BotFather.
2. Start a chat with BotFather and send the command `/newbot`.
3. Follow the instructions to create your bot. You will receive a token, which you will use later.

### 2. Set Up Google Apps Script

1. Go to [Google Apps Script](https://script.google.com/).
2. Create a new project.
3. Go to `Project Settings` and turn on the option to show the manifest file `appsscript.json` in the editor.
4. Copy the code from this repository and paste it into the Apps Script editor.
5. Alternatively, if you have `clasp` installed, you can clone this repository and use `clasp push` to upload it.

### 3. Configure the Bot

1. In the Apps Script editor, go to `Project Settings` > `Script Properties`.
2. Add the following script properties:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from BotFather
   - `GEMINI_API_KEY`: Your Google Gemini API key (you can obtain it for free from [Google AI Studio](https://aistudio.google.com/))
   - `SHEET_ID`: The ID of your Google Spreadsheet (from the URL)
   - `MY_CHAT_ID`: Your Telegram user ID for admin access
   - `APP_URL`: The deployment URL of your Google Apps Script web app (you'll get this after deployment)

### 4. Create Google Spreadsheet

1. Create a new Google Spreadsheet.
2. Add the following sheets:
   - `Registros`: For storing all financial records (expenses, income, transfers)
   - `Config Bot`: For configuring categories and accounts
   - `Bot Errors`: For logging errors

3. Configure the "Config Bot" sheet with these columns:
   - Column A: Tipo (Type) - e.g., "Gastos" (Expenses), "Ingresos" (Income), "Inversiones" (Investments)
   - Column B: Categorías (Categories)
   - Column C: Subcategorías (Subcategories) with the following format: "Category > Subcategory"
   - Column D: Cuentas (Accounts)
   - Column E: Cuenta Asociada (Associated Account) - Optional, for linking cards to bank accounts (e.g., link "Visa Crédito" to "Banco ABC")

   Add your desired categories for both expenses and income. The "Tipo" column should contain:
   - "Gastos" for expense categories
   - "Ingresos" for income categories
   - "Inversiones" for investment categories (e.g., "Acciones", "Bonos")

   For accounts, you can add bank accounts, cash, and cards. If a card is associated to a bank account (e.g., debit card), put the bank account name in Column E. This way, expenses on that card will be recorded on the associated bank account.

4. The "Registros" sheet will store all financial records with the following structure:
   - Date
   - Amount (negative for expenses/investments, positive for income and transfers)
   - Account (source account)
   - Category
   - Subcategory
   - Description
   - Type (gasto/ingreso/transferencia/inversión)
   - Additional data fields and formulas for reporting
   - Asset (for investments)
   - Quantity (for investments)
   - Unit Price (for investments)

### 5. Deploy the Script

1. Click on `Deploy` > `New deployment`.
2. Select `Web app`.
3. Set the `Project version` to `New` and give it a description (e.g., Initial deployment).
4. Set `Execute the app as` to `Me`.
5. Set `Who has access` to `Anyone`.
6. Click `Deploy`.
7. You will receive a URL. Copy this URL and add it to your script properties as `APP_URL`.

### 6. Set Up Webhook

1. After deploying your script, run the `setWebhook` function from the Apps Script editor:
   - In the Apps Script editor, select `setWebhook` from the function dropdown menu at the top.
   - Click the "Run" button.
   - The function will use your script properties to automatically set up the webhook.
   - Check the logs to confirm that the webhook was set successfully.

### 7. Using the Bot

Open Telegram and start a chat with your bot. The bot is restricted to your chat ID (set in `MY_CHAT_ID`). You can use the following features:

- **Direct Text Messages**:
  Send a text message with financial information, and the bot will use Gemini to extract the details.

- **Voice Messages**:
  Send a voice message describing your financial record, and the bot will process it.

  **Examples**:
  - Expenses: "50 euros for dinner at a restaurant in cash", "Paid 1000 pesos for rent in 12 installments with Visa credit card"
  - Income: "Received 5000 salary from work in bank account", "Got 50 from freelance project in cash"
  - Transfers: "Transferred 2000 from savings to checking account"
  - Investments: "Bought 10 shares of AAPL at $150 each in Broker account", "Invested 1000 in bonds at $1000 total in Investment account"

- **Interactive Confirmations**:
  After processing your message, the bot will show a confirmation with three options:
  - ✅ **Confirm**: Save the record to your spreadsheet
  - ✏️ **Edit**: Modify any field before saving
  - ❌ **Cancel**: Discard the record

- **Configuration Commands**:
  - `/categorias_gastos` - View expenses categories
  - `/categorias_ingresos` - View income categories
  - `/subcategorias` - View subcategories for a specific category
  - `/cuentas` - View available accounts
  - `/ayuda` - Display help information

The bot intelligently recognizes different types of financial records and categorizes them automatically based on your message content.

## Troubleshooting

- If the bot doesn't respond, check the Bot Errors sheet in your spreadsheet
- Make sure your Telegram chat ID matches the one in script properties
- Verify that your webhook is properly set up by running the setWebhook function again
- If validation fails, check that your categories and accounts are properly configured in the spreadsheet

## Contributing

Feel free to fork this repository and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
