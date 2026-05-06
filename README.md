# 🌐 Website Cloner Agent — AI-Powered CLI Tool

A **conversational CLI agent** that clones websites by generating fully working HTML, CSS, and JavaScript files. Powered by the blazingly fast **Groq API** (`llama-3.3-70b-versatile`) and built with a ReAct (Reasoning + Acting) agent loop.

## 🎯 What It Does

Give the agent a natural-language instruction like _"Clone the Scaler Academy website"_ and it will:

1. **Reason** through the task step by step
2. **Use tools** to create directories, write files, and fetch web content
3. **Generate** a complete, production-quality HTML/CSS/JS website
4. **Open** the result in your browser automatically

## 🏗️ Architecture

The agent follows a **ReAct loop** pattern:

```
START → THINK → TOOL → OBSERVE → THINK → TOOL → OBSERVE → ... → OUTPUT
```

```
┌─────────────────────────────────────────────────────────┐
│                    User Input                           │
│         "Clone the Scaler Academy website"              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               🚀 START Step                             │
│         Agent understands the task                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               🤔 THINK Step(s)                          │
│         Agent plans its approach                        │
│         (multiple think steps allowed)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               🔧 TOOL Step                              │
│         Agent calls a tool:                             │
│         writeFile / readFile / executeCommand /         │
│         fetchWebpage                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               👁 OBSERVE Step                            │
│         Agent sees the tool result                      │
│         and decides next action                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
              (Loop repeats)
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               ✅ OUTPUT Step                            │
│         Agent delivers final summary                    │
│         Browser opens the generated page                │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `writeFile(filePath, content)` | Creates/overwrites a file with the given content |
| `readFile(filePath)` | Reads and returns file contents |
| `executeCommand(cmd)` | Runs a shell command and returns output |
| `fetchWebpage(url)` | Fetches a URL and returns the first 5000 chars |

## 📦 Setup

### Prerequisites
- **Node.js** v18 or higher
- **Groq API Key** (free at [Groq Console](https://console.groq.com/keys))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/website-cloner-agent.git
cd website-cloner-agent

# 2. Install dependencies
npm install

# 3. Set up your API key
#    Create a .env file with your Groq API key:
echo "GROQ_API_KEY=your-groq-key-here" > .env

# 4. Run the agent
npm start
```

## 🚀 Usage

```bash
npm start
```

The agent will display a welcome banner and prompt you for input:

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        🌐  Website Cloner Agent  🌐                           ║
║        ─────────────────────────                              ║
║        AI-Powered CLI Tool for Cloning Websites               ║
║        Powered by Groq (llama-3.3-70b-versatile)              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

💬 You: Clone the Scaler Academy website with header, hero section, and footer
```

The agent will then loop through multiple reasoning and tool-calling steps, showing its thought process in real-time with colored output.

### 📴 Offline Demo Mode (No API Key Required)

If you have network restrictions or API quota limits, you can run the agent in **Offline Demo Mode**. This mode bypasses the API and simulates the ReAct loop to generate the Scaler Academy website structure perfectly.

```bash
npm start demo
```

## 📁 Output

Generated files are saved to the `output/` directory:

```
output/
├── index.html    # Main HTML file
├── styles.css    # Stylesheet
└── script.js     # JavaScript for interactivity
```

The HTML file automatically opens in your default browser when the agent finishes.

## 🎨 Features

- **Interactive CLI** — chat with the agent in natural language
- **ReAct Agent Loop** — multi-step reasoning with tool usage
- **Colored Terminal Output** — distinct colors for each step type
- **Loading Spinners** — visual feedback during API calls and tool execution
- **Auto Browser Open** — generated pages open automatically
- **Error Recovery** — handles JSON parse errors and tool failures gracefully

## 🧰 Tech Stack

- **Runtime**: Node.js (ESM)
- **AI Model**: Groq (`llama-3.3-70b-versatile`)
- **Libraries**: `groq-sdk`, `chalk`, `ora`, `axios`, `dotenv`, `open`

## 📜 License

MIT
