const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

function rainbowText(text) {
const colors = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
let result = '';
 for (let i = 0; i < text.length; i++) {
const color = colors[i % colors.length];
result += chalk[color](text[i]); } return result; }

console.log("");
console.log(` 🦎 ${chalk.green.bold('Starting')} ${rainbowText('CHAMELEON-BOTWA...')}`);
console.log(chalk.green("• ────────────────────────────────────────────── •"));
console.log(chalk.white("     --- Cargando comandos"));
console.log("");

const commandsPath = path.join(__dirname, "commands");
const commands = new Map();
 for (const file of fs.readdirSync(commandsPath)) {
  if (!file.endsWith(".js")) continue;
const command = require(path.join(commandsPath, file));
 if (command.name && typeof command.execute === "function") {
commands.set(command.name, command);
 console.log(`${chalk.green('     ❐ Comando cargado:')} ${chalk.white(`!${command.name}`)}`);
 if (Array.isArray(command.aliases)) {
  for (const alias of command.aliases) {
commands.set(alias, command);
 console.log(`${chalk.white('      ↳ Alias cargado:')} ${chalk.white(`!${alias}`)}`); } } } }

const client = new Client({
 authStrategy: new LocalAuth({
 clientId: "chameleon",
 dataPath: path.join(__dirname, "chameleon_session") }),
  puppeteer: {
  headless: true,
  args: [
   "--no-sandbox",
   "--disable-dev-shm-usage",
   "--disable-gpu",
   "--disable-setuid-sandbox",
   "--use-fake-ui-for-media-stream",
   "--autoplay-policy=no-user-gesture-required",
   "--enable-usermedia-screen-capturing",
   "--allow-http-screen-capture",
   "--enable-features=AudioServiceOutOfProcess",
   "--disable-extensions",
   "--use-fake-device-for-media-stream",
   "--use-file-for-fake-audio-capture=/dev/null" ] } });

client.on("qr", qr => {
 console.log("");
 console.log(chalk.greenBright(" ▣  Escanea el QR a continuación:"));
 console.log(chalk.white("     --- Abriendo sesión"));
 qrcode.generate(qr, { small: true }); });

client.on("authenticated", () => {
 console.log(chalk.greenBright(""));
 console.log(chalk.greenBright(""));
 console.log(chalk.green("--- Sesión autenticada."));
 console.log(chalk.greenBright("")); });

client.on("auth_failure", message => {
 console.error(chalk.red("❌ Error de autenticación:"), message); });

client.on("ready", async () => {
 console.log("");
 console.log(` 🦎 ${chalk.greenBright('Se ha conectado a')} ${rainbowText('CHAMELEON-BOTWA')} ${chalk.greenBright('con exito.')}`);
 console.log(chalk.green("• ────────────────────────────────────────────── •"));
 console.log("    With ღ by @ToxiPain");
 console.log("    Version 1.0.6");
 console.log("• ────────────────────────────────────────────── •");
 console.log("     --- Load CHR:", !!client.pupBrowser);
 console.log("     --- Load WhatsApp:", !!client.pupPage);
 console.log("     🗀  Sesión:", path.join(__dirname, "chameleon_session"));
 console.log("• ────────────────────────────────────────────── •");
 console.log("     Envianos tus sugerencias a: +50557418454");
 console.log("");

const vcCommand = commands.get("vc");
 if (vcCommand && typeof vcCommand.init === "function") {
 await vcCommand.init(client); } });

client.on("message", async message => {
try { const body = message.body?.trim();
 if (!body) return;
 if (!body.startsWith("!")) return;

const parts = body.split(/\s+/);
const commandName = parts[0].slice(1).toLowerCase();
const args = parts.slice(1);
const command = commands.get(commandName);
 if (!command) return;

console.log(`⚡ Comando: !${commandName}`);
await command.execute({ client, message, args, command: commandName }); } catch (error) {
 console.error("❌ Error ejecutando comando:", error); } });

client.on("disconnected", reason => {
 console.log("--- WhatsApp desconectado:", reason); });

client.on("change_state", state => {
 console.log("Estado:", state); });

client.initialize();
