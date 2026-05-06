import "dotenv/config";
import Groq from "groq-sdk";
import { exec } from "child_process";
import {
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  mkdir,
} from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import open from "open";
import readline from "readline";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// Groq Client
// ─────────────────────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL_NAME = "llama-3.3-70b-versatile";
const MAX_ITERATIONS = 30;

// ─────────────────────────────────────────────────────────────────────────────
// Tool Implementations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the contents of a file from disk.
 */
async function readFileTool(args) {
  const filePath = args.filePath || args;
  try {
    const data = await fsReadFile(filePath, "utf-8");
    return `Contents of ${filePath}:\n${data}`;
  } catch (err) {
    return `Error reading file ${filePath}: ${err.message}`;
  }
}

/**
 * Write content to a file, creating directories if needed.
 */
async function writeFileTool(args) {
  const filePath = args.filePath || "";
  const content = args.content || "";
  try {
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await fsWriteFile(filePath, content, "utf-8");
    return `File written successfully: ${filePath} (${content.length} bytes)`;
  } catch (err) {
    return `Error writing file ${filePath}: ${err.message}`;
  }
}

/**
 * Execute a shell command and return its output.
 */
async function executeCommandTool(args) {
  const cmd = args.cmd || args;
  return new Promise((resolve) => {
    exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        resolve(`Command error: ${error.message}\nStderr: ${stderr}`);
      } else {
        resolve(
          `Command executed: ${cmd}\nOutput: ${stdout || "(no output)"}`
        );
      }
    });
  });
}

/**
 * Fetch a webpage's text content via HTTP GET.
 */
async function fetchWebpageTool(args) {
  const url = args.url || args;
  try {
    const { data } = await axios.get(url, {
      responseType: "text",
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const truncated = data.substring(0, 5000);
    return `Fetched ${url} (first 5000 chars):\n${truncated}`;
  } catch (err) {
    return `Error fetching ${url}: ${err.message}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Registry
// ─────────────────────────────────────────────────────────────────────────────
const toolMap = {
  readFile: readFileTool,
  writeFile: writeFileTool,
  executeCommand: executeCommandTool,
  fetchWebpage: fetchWebpageTool,
};

// ─────────────────────────────────────────────────────────────────────────────
// System Prompt
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a Website Cloner Agent — an AI assistant that runs in a CLI terminal.
You work in a structured loop of: START -> THINK -> TOOL -> OBSERVE -> OUTPUT.

Your job is to take the user's instruction and produce working HTML/CSS/JS files
that clone the requested website. You must break the task into small steps,
think carefully, use your tools, observe the results, and iterate.

TOOLS AVAILABLE:
1. readFile(filePath: string)
   -> Reads and returns the contents of a file on disk.

2. writeFile(filePath: string, content: string)
   -> Writes content to a file. Creates parent directories automatically.

3. executeCommand(cmd: string)
   -> Runs a shell command (e.g. mkdir, ls, cat) and returns the output.

4. fetchWebpage(url: string)
   -> Fetches a URL via HTTP GET and returns the first 5000 characters.

RULES:
1. ALWAYS respond with a single valid JSON object per message.
2. Complete ONE step at a time. After each TOOL call, WAIT for the OBSERVE step.
3. Perform MULTIPLE THINK steps before and between actions.
4. When writing files, write the FULL, COMPLETE file content — no placeholders, no truncation, no "... rest of content". Every file must be production-ready.
5. For the writeFile tool, tool_args must be: {"filePath": "...", "content": "..."}.
   For readFile: {"filePath": "..."}.
   For executeCommand: {"cmd": "..."}.
   For fetchWebpage: {"url": "..."}.
6. All output files should be created inside the "output/" directory.
7. You MUST loop through multiple steps — do not try to finish in a single step.
8. Always output valid JSON only. Do not include markdown code fences, backticks, or any non-JSON text.

OUTPUT FORMAT (strict JSON — one per message):
{ "step": "START", "content": "description of what user wants" }
{ "step": "THINK", "content": "your reasoning" }
{ "step": "TOOL", "tool_name": "toolName", "tool_args": { ... } }
{ "step": "OUTPUT", "content": "final summary for the user" }

SCALER ACADEMY WEBSITE REFERENCE (for cloning tasks):
URL: https://www.scaler.com

COLOR SCHEME:
- Background: Dark theme (#0a0a0a or #111)
- Primary accent: Blue (#4f46e5 / #6366f1)
- Text: White (#fff) with gray subtexts (#9ca3af)
- CTA buttons: Gradient blue or solid blue (#4f46e5)
- Cards/sections: Dark cards (#1a1a2e or #16162a) with subtle borders

TYPOGRAPHY:
- Font: Inter or similar modern sans-serif from Google Fonts
- Hero headline: Large (48-64px), bold, white
- Subtext: 18-20px, gray (#9ca3af)

HEADER (Navigation Bar):
- Sticky top, dark background with slight blur/transparency
- Left: "SCALER" logo in bold white text (uppercase), use the text "SCALER" as logo
- Center/Right: Nav links — "Programs", "Reviews", "Events", "Resources"
- Far Right: "Book Free Live Class" CTA button in blue with rounded corners
- Mobile: Hamburger menu icon that toggles a dropdown

HERO SECTION:
- Full viewport height, dark background with subtle gradient or glow effect
- Small badge/pill at top: "AI expertise is now a premium skill" in a rounded pill with border
- Main headline: "Become the Professional Built for the Next Decade in AI." — large, bold, white
- Subtext: "Strong technical foundations, AI integrated at every stage, and a curriculum that evolves as the market does" — smaller, gray
- Program cards/links: "Modern Software and AI Engineering", "Data Science and ML", "Advanced AIML with Agentic AI", "DevOps, Cloud & AI Platform Engineering"
- "Request A Callback" and "Book Free Live Class" CTA buttons
- Decorative glow/gradient visual element (use CSS radial gradients, glowing orbs)

FOOTER:
- Dark background (#0a0a0a)
- Top: Company name and address
- Multi-column layout with sections:
  Column 1: "Explore Scaler" — links to all programs (Modern Software and AI Engineering, Data Science, DevOps, AIML, etc.)
  Column 2: "Resources" — Alumni Reviews, Blogs, Contact Us, Careers
  Column 3: "Others" — About Us, Become a Mentor, Become a TA, Hire From Us, Terms of Use, Privacy Policy
  Column 4: "Socials" — YouTube, LinkedIn, Facebook, Instagram, Twitter
- Bottom bar: copyright text

EXAMPLE:
User: Clone the Scaler Academy website with header, hero, and footer.

{ "step": "START", "content": "The user wants me to clone the Scaler Academy website. I need to create HTML, CSS, and JS files with a header, hero section, and footer." }
{ "step": "THINK", "content": "I should first create the output directory, then plan the HTML structure with header navigation, hero section, and footer. Let me start by creating the directory." }
{ "step": "TOOL", "tool_name": "executeCommand", "tool_args": { "cmd": "mkdir -p output" } }
(wait for OBSERVE)
{ "step": "THINK", "content": "Directory created. Now I'll write the CSS file first since both HTML and JS will reference it." }
{ "step": "TOOL", "tool_name": "writeFile", "tool_args": { "filePath": "output/styles.css", "content": "..." } }
(wait for OBSERVE)
... and so on until OUTPUT.`;

// ─────────────────────────────────────────────────────────────────────────────
// Banner
// ─────────────────────────────────────────────────────────────────────────────
function printBanner() {
  console.log(
    chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        🌐  Website Cloner Agent  🌐                           ║
║        ─────────────────────────                              ║
║        AI-Powered CLI Tool for Cloning Websites               ║
║        Powered by Groq (${MODEL_NAME})                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`)
  );
  console.log(
    chalk.gray(
      '  Type your instruction (e.g. "Clone the Scaler Academy website")'
    )
  );
  console.log(chalk.gray('  Type "exit" or "quit" to leave.\n'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Step Loggers
// ─────────────────────────────────────────────────────────────────────────────
function logStep(step, content) {
  const divider = chalk.gray("─".repeat(60));

  switch (step) {
    case "START":
      console.log(divider);
      console.log(chalk.cyan.bold("🚀 START"));
      console.log(chalk.cyan(`   ${content}`));
      console.log(divider);
      break;
    case "THINK":
      console.log(chalk.yellow.bold("🤔 THINK"));
      console.log(chalk.yellow(`   ${content}`));
      break;
    case "TOOL":
      console.log(chalk.magenta.bold(`🔧 TOOL CALL`));
      console.log(chalk.magenta(`   ${content}`));
      break;
    case "OBSERVE":
      console.log(chalk.gray.bold("👁  OBSERVE"));
      // Truncate long observe outputs for display
      const displayContent =
        content.length > 200 ? content.substring(0, 200) + "..." : content;
      console.log(chalk.gray(`   ${displayContent}`));
      break;
    case "OUTPUT":
      console.log(divider);
      console.log(chalk.green.bold("✅ OUTPUT"));
      console.log(chalk.green(`   ${content}`));
      console.log(divider);
      break;
  }
  console.log();
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Loop
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_RESPONSES = [
  { step: "START", content: "The user wants me to clone the Scaler Academy website. I need to create HTML, CSS, and JS files with a header, hero section, and footer." },
  { step: "THINK", content: "I should first create the output directory, then plan the HTML structure with header navigation, hero section, and footer." },
  { step: "TOOL", tool_name: "executeCommand", tool_args: { cmd: "mkdir -p output" } },
  { step: "THINK", content: "Directory created. Now I'll write the CSS file first since both HTML and JS will reference it." },
  { step: "TOOL", tool_name: "writeFile", tool_args: { filePath: "output/styles.css", content: "body { margin: 0; font-family: 'Inter', sans-serif; background-color: #0a0a0a; color: #fff; }\nheader { display: flex; justify-content: space-between; padding: 20px 40px; background: rgba(10,10,10,0.8); position: sticky; top: 0; }\n.logo { font-size: 24px; font-weight: bold; }\n.nav-links a { color: #fff; margin-left: 20px; text-decoration: none; }\n.btn { background: #4f46e5; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold; }\n.hero { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }\n.hero h1 { font-size: 64px; margin-bottom: 20px; }\n.hero p { color: #9ca3af; font-size: 20px; max-width: 600px; margin-bottom: 40px; }\nfooter { display: flex; justify-content: space-around; padding: 40px; background: #000; border-top: 1px solid #333; }" } },
  { step: "THINK", content: "CSS is ready. Next, I'll create the main HTML file that includes the header, hero section, and footer, and links to the CSS file." },
  { step: "TOOL", tool_name: "writeFile", tool_args: { filePath: "output/index.html", content: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Scaler Academy Clone</title>\n<link rel=\"stylesheet\" href=\"styles.css\">\n</head>\n<body>\n  <header>\n    <div class=\"logo\">SCALER</div>\n    <nav class=\"nav-links\">\n      <a href=\"#\">Programs</a>\n      <a href=\"#\">Reviews</a>\n      <a href=\"#\">Events</a>\n      <a href=\"#\" class=\"btn\">Book Free Live Class</a>\n    </nav>\n  </header>\n  <section class=\"hero\">\n    <div style=\"border: 1px solid #333; padding: 5px 15px; border-radius: 20px; margin-bottom: 20px;\">AI expertise is now a premium skill</div>\n    <h1>Become the Professional Built for the Next Decade in AI.</h1>\n    <p>Strong technical foundations, AI integrated at every stage, and a curriculum that evolves as the market does.</p>\n    <div>\n      <a href=\"#\" class=\"btn\" style=\"margin-right: 15px;\">Request A Callback</a>\n      <a href=\"#\" class=\"btn\">Explore Programs</a>\n    </div>\n  </section>\n  <footer>\n    <div>\n      <h3>Explore Scaler</h3>\n      <p>Modern Software Engineering</p>\n      <p>Data Science & ML</p>\n    </div>\n    <div>\n      <h3>Resources</h3>\n      <p>Alumni Reviews</p>\n      <p>Blogs</p>\n    </div>\n    <div>\n      <h3>Socials</h3>\n      <p>LinkedIn | Twitter | YouTube</p>\n    </div>\n  </footer>\n</body>\n</html>" } },
  { step: "THINK", content: "HTML is written. Finally, I will write a simple JS script to handle interactivity if needed." },
  { step: "TOOL", tool_name: "writeFile", tool_args: { filePath: "output/script.js", content: "console.log('Scaler Academy Clone Loaded Successfully!');" } },
  { step: "OUTPUT", content: "I have successfully cloned the Scaler Academy website. The files (index.html, styles.css, script.js) have been created in the output directory. I will now open it in your browser!" }
];

async function runAgent(userInput, isDemoMode = false) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userInput },
  ];

  let generatedHtmlPath = null;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const spinner = ora({
      text: chalk.blue(`Agent thinking... (step ${i + 1}/${MAX_ITERATIONS})`),
      spinner: "dots12",
    }).start();

    let parsed;

    let responseText = "";
    const MAX_RETRIES = 5;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (isDemoMode) {
          // Use mocked responses for offline demo
          parsed = DEMO_RESPONSES[i];
          if (!parsed) break; // End of demo sequence
          await new Promise(r => setTimeout(r, 1500)); // Simulate thinking delay
        } else {
          const completion = await groq.chat.completions.create({
            model: MODEL_NAME,
            messages: messages,
            temperature: 0.1,
          });

          responseText = completion.choices[0].message.content;
        }
        break; // success
      } catch (err) {
        const errMsg = String(err.message || err);
        const isRateLimit =
          err.status === 429 ||
          errMsg.includes("429") ||
          errMsg.toLowerCase().includes("rate") ||
          errMsg.toLowerCase().includes("quota") ||
          errMsg.toLowerCase().includes("limit");
        if (isRateLimit && attempt < MAX_RETRIES) {
          const delay = [5, 15, 30, 45, 60][attempt] * 1000;
          spinner.text = chalk.yellow(
            `⏳ Rate limited. Waiting ${delay / 1000}s before retry... (${attempt + 1}/${MAX_RETRIES})`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        spinner.fail(chalk.red(`Groq API error: ${errMsg}`));
        if (err.error) {
          console.error(chalk.red("Error Details:"), JSON.stringify(err.error, null, 2));
        } else {
          console.error(chalk.red("Raw Error:"), err);
        }
        return;
      }
    }

    spinner.stop();

    if (!isDemoMode) {
      try {
        // Strip markdown code fences if present
        let cleaned = responseText.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
        }
        parsed = JSON.parse(cleaned);
      } catch (err) {
        console.log(chalk.red(`⚠ JSON parse error. Raw response:`));
        console.log(chalk.gray(responseText.substring(0, 300)));
        // Push the raw content and ask the model to fix it
        messages.push({ role: "assistant", content: responseText });
        messages.push({
          role: "user",
          content:
            "Your last response was not valid JSON. Please respond with a single valid JSON object following the exact format specified. Do not wrap it in code fences.",
        });
        continue;
      }
    }

    if (!parsed) return; // Terminate early if we reached end of demo sequence

    // Push assistant message
    messages.push({
      role: "assistant",
      content: JSON.stringify(parsed),
    });

    // ── Handle each step ──
    if (parsed.step === "START") {
      logStep("START", parsed.content);
    } else if (parsed.step === "THINK") {
      logStep("THINK", parsed.content);
    } else if (parsed.step === "TOOL") {
      const toolName = parsed.tool_name;
      const toolArgs = parsed.tool_args;

      logStep(
        "TOOL",
        `Calling ${toolName}(${JSON.stringify(toolArgs).substring(0, 100)}...)`
      );

      if (!toolMap[toolName]) {
        const errorMsg = `Tool "${toolName}" is not available. Available tools: ${Object.keys(toolMap).join(", ")}`;
        logStep("OBSERVE", errorMsg);
        messages.push({
          role: "user",
          content: JSON.stringify({ step: "OBSERVE", content: errorMsg }),
        });
      } else {
        const toolSpinner = ora({
          text: chalk.magenta(`   Executing ${toolName}...`),
          spinner: "dots",
        }).start();

        let result;
        try {
          result = await toolMap[toolName](toolArgs);
        } catch (err) {
          result = `Tool execution error: ${err.message}`;
        }

        toolSpinner.succeed(chalk.magenta(`   ${toolName} completed`));

        // Track if an HTML file was written
        if (
          toolName === "writeFile" &&
          toolArgs.filePath &&
          toolArgs.filePath.endsWith(".html")
        ) {
          generatedHtmlPath = path.resolve(toolArgs.filePath);
        }

        logStep("OBSERVE", result);
        messages.push({
          role: "user",
          content: JSON.stringify({ step: "OBSERVE", content: result }),
        });
      }
    } else if (parsed.step === "OUTPUT") {
      logStep("OUTPUT", parsed.content);

      // Auto-open the generated HTML file in the browser
      if (generatedHtmlPath && existsSync(generatedHtmlPath)) {
        console.log(
          chalk.blue.bold(
            `\n🌐 Opening ${generatedHtmlPath} in your browser...\n`
          )
        );
        try {
          await open(generatedHtmlPath);
        } catch (err) {
          console.log(
            chalk.yellow(
              `   Could not auto-open browser: ${err.message}`
            )
          );
          console.log(
            chalk.yellow(
              `   Please open manually: file://${generatedHtmlPath}`
            )
          );
        }
      }
      return;
    }
  }

  console.log(
    chalk.red.bold(
      `\n⚠ Agent reached maximum iterations (${MAX_ITERATIONS}) without completing.\n`
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive CLI (readline)
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const isDemoMode = args.includes("demo");

  printBanner();

  if (isDemoMode) {
    console.log(chalk.yellow.bold("⚠ RUNNING IN OFFLINE DEMO MODE (Network bypassed)\n"));
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let isClosed = false;

  rl.on("close", () => {
    isClosed = true;
    console.log(chalk.cyan("\n👋 Goodbye!\n"));
    process.exit(0);
  });

  const prompt = () => {
    if (isClosed) return;
    rl.question(chalk.blue.bold("\n💬 You: "), async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
        rl.close();
        return;
      }

      await runAgent(trimmed, isDemoMode);
      prompt();
    });
  };

  prompt();
}

main();
