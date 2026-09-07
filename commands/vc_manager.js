const puppeteer = require("puppeteer");

let callObserverInstalled = false;
let currentCall = null;
let isCallHandlerRegistered = false;

async function setupCallObserver(waPage) {
 if (callObserverInstalled) return;
callObserverInstalled = true;
 await waPage.exposeFunction("__vcLog", async (msg) => {
 console.log(`📹 ${msg}`); });
 await waPage.exposeFunction("__autoReject", async () => {
const result = await waPage.evaluate(() => {
const selectors = [
 'button[aria-label*="Rechazar" i]',
 'button[aria-label*="Reject" i]',
 '[data-testid="call-reject"]',
 '[data-testid="voip-reject-call"]' ];
 for (const selector of selectors) {
const btn = document.querySelector(selector);
 if (btn && btn.offsetParent !== null && !btn.disabled) {
 btn.click();
 return { success: true }; } }
 return { success: false }; });
 if (result.success) {
 console.log("📹 [VC] Llamada de voz rechazada"); }
 return result.success; });
 await waPage.evaluate(() => {
  if (window.__VC_OBSERVER_INSTALLED) return;
  window.__VC_OBSERVER_INSTALLED = true;
  window.__vcState = {
   isActive: false,
   type: null,
   buttons: []};

let lastRejectedType = null;
function detectCallType() {
 const hasVideo = document.querySelectorAll('video, [data-testid*="video"], [data-icon*="video"]').length > 0;
 const hasAudio = document.querySelectorAll('[data-icon*="audio"], [data-testid*="audio"]').length > 0;
 if (hasVideo) return "video";
 if (hasAudio) return "voice";
 return "unknown"; }

function detectCallActive() {
const selectors = [
 '[data-testid="call-container"]:not([style*="display: none"])',
 '[data-testid="voip-container"]:not([style*="display: none"])',
 'div[class*="call"][class*="active"]' ];
 for (const selector of selectors) {
const el = document.querySelector(selector);
 if (el && el.offsetParent !== null) return true; } return false; }

function mapCallUI() {
const buttons = [];
const selectors = [
 'button[aria-label*="Rechazar" i]',
 'button[aria-label*="Aceptar" i]',
 'button[aria-label*="Finalizar" i]' ];
 for (const selector of selectors) {
const elements = document.querySelectorAll(selector);
elements.forEach(btn => {
 if (btn.offsetParent !== null) {
 buttons.push({
  selector: selector,
  ariaLabel: btn.getAttribute('aria-label') || '',
  visible: true,
  disabled: btn.disabled || false }); }
  }); }
 return buttons; }

function fullMap() {
const isActive = detectCallActive();
const type = detectCallType();
const buttons = mapCallUI();
            
window.__vcState.isActive = isActive;
window.__vcState.type = type;
window.__vcState.buttons = buttons;


if (type === 'voice' && lastRejectedType !== 'voice') {
 lastRejectedType = 'voice';
 window.__vcLog(`📹 Detectada llamada de VOZ, rechazando...`);
 window.__autoReject(); }
if (type !== 'voice') {
 lastRejectedType = null; } return { isActive, type, buttons };}

const observer = new MutationObserver(() => {
 setTimeout(() => {
  fullMap(); }, 100); });

observer.observe(document.body, {
 childList: true,
 subtree: true,
 attributes: true,
 attributeFilter: ['style', 'class', 'aria-label'] });

setTimeout(fullMap, 1000);
setInterval(() => {
 if (detectCallActive()) fullMap(); }, 3000); }); }

async function autoRejectVoiceCall(waPage) {
const result = await waPage.evaluate(() => {
const selectors = [
 'button[aria-label*="Rechazar" i]',
 'button[aria-label*="Reject" i]',
 '[data-testid="call-reject"]',
 '[data-testid="voip-reject-call"]' ];
   for (const selector of selectors) {
const btn = document.querySelector(selector);
 if (btn && btn.offsetParent !== null && !btn.disabled) {
 btn.click();
 return { success: true }; } }
 return { success: false }; });
 return result.success; }

async function initializeVCSystem(client) {
 try { const waPage = client.pupPage;
 if (!waPage) {
  console.log("📹 [VC] No se pudo acceder a WhatsApp Web para inicializar VC");
  return; }

if (!isCallHandlerRegistered) {
client.on('call', async (call) => {
 console.log(`📹 [VC] Llamada de: ${call.from} | Video: ${call.isVideo}`);
currentCall = call;
 if (!call.isVideo) {
  console.log("📹 [VC] Rechazando llamada de voz...");
  try { await call.reject();
  console.log("📹 [VC] Rechazada con whatsapp-web.js");
  } catch {
  console.log("📹 [VC] Fallo reject nativo, usando puppeteer");
  await autoRejectVoiceCall(waPage); } } });
isCallHandlerRegistered = true; }


await setupCallObserver(waPage);
 } catch (error) {
 console.error("📹 [VC] Error al inicializar el sistema:", error.message); } }

module.exports = {
 name: "vc",
 aliases: ["videocall"],
    
init: initializeVCSystem,
async execute({ client, message, args }) {
 try { const waPage = client.pupPage;
 if (!waPage) { return await message.reply("❌ No se pudo acceder a WhatsApp Web."); }
const subCommand = args && args[0] ? args[0].toLowerCase() : null;

if (subCommand === "status") {
const domState = await waPage.evaluate(() => window.__vcState || null);
if (!domState || !domState.isActive) {
 return await message.reply("📹 No se detectaron Video Calls entrantes."); }
 return await message.reply("📹 Hay un Video Call entrante, usa !vc accept para entrar o !vc reject para rechazar"); }
if (subCommand === "accept") {
 const result = await waPage.evaluate(() => {
 const selectors = [
  'button[aria-label*="Aceptar" i]',
  'button[aria-label*="Accept" i]',
  '[data-testid="call-accept"]',
  '[data-testid="voip-accept-call"]' ];
   for (const selector of selectors) {
   const btn = document.querySelector(selector);
   if (btn && btn.offsetParent !== null && !btn.disabled) {
   btn.click();
   return { success: true }; } }
   return { success: false };
   });

if (result.success) {
 await message.reply("✅ Videollamada aceptada.");
setTimeout(async () => {
  try { await waPage.evaluate(async () => {
   const selectors = [
   '[data-testid="camera-turn-off"]',
   '[data-testid="camera-turn-on"]',
   'button[aria-label*="Desactivar cámara" i]',
   'button[aria-label*="Activar cámara" i]'
   ].join(', ');

const triggerClick = (element) => {
 const opts = { bubbles: true, cancelable: true, view: window };
 element.dispatchEvent(new MouseEvent('mousedown', opts));
 element.dispatchEvent(new MouseEvent('mouseup', opts));
 element.click(); };

const offBtn = document.querySelector(selectors);
if (!offBtn) return;
triggerClick(offBtn);
await new Promise(resolve => setTimeout(resolve, 500));
const onBtn = document.querySelector(selectors) || offBtn;
triggerClick(onBtn); });
 } catch (e) {}
 }, 1000);
 } else { await message.reply("❌ No hay ninguna VideoCall entrante para aceptar."); }
 return; }

if (subCommand === "reject") {
if (currentCall) {
 try {
await currentCall.reject();
 await message.reply("📵 Llamada rechazada.");
 return; } catch {}
 }

const result = await waPage.evaluate(() => {
const selectors = [
 'button[aria-label*="Rechazar" i]',
 'button[aria-label*="Reject" i]',
 '[data-testid="call-reject"]',
 '[data-testid="voip-reject-call"]' ];
 for (const selector of selectors) {
const btn = document.querySelector(selector);
 if (btn && btn.offsetParent !== null && !btn.disabled) {
 btn.click();
 return { success: true }; } }
 return { success: false };
 });

if (result.success) {
 await message.reply("📵 Llamada rechazada.");
 } else { await message.reply("❌ No hay ninguna VideoCall entrante para rechazar."); }
 return; }

if (subCommand === "end") {
const result = await waPage.evaluate(() => {
 const selectors = [
 'button[aria-label*="Finalizar" i]',
 'button[aria-label*="End" i]',
 '[data-testid="call-end"]',
 '[data-testid="voip-end-call"]' ];
for (const selector of selectors) {
const btn = document.querySelector(selector);
 if (btn && btn.offsetParent !== null && !btn.disabled) {
btn.click();
return { success: true }; } }
return { success: false };
});

if (result.success) {
 await message.reply("🔚 Llamada finalizada.");
 currentCall = null;
 } else { await message.reply("❌ No hay ninguna llamada activa para finalizar."); }
 return; }
 await message.reply(
 "📹 *VideoCall Manager Menu:*\n\n" +
 "📋 Comandos:\n" +
 "• `!vc status` - Ver estado\n" +
 "• `!vc accept` - Aceptar\n" +
 "• `!vc reject` - Rechazar\n" +
 "• `!vc end` - Finalizar" );
 } catch (error) { console.error("📹 [VC] Error:", error.message);
 await message.reply(`❌ Error: ${error.message}`); } }
 };
