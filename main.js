// SUMOVAN MM DOCs - Windows desktop app. Opens the live MM DOCs web app in its own window and hides Google's
// "This application was created by a Google Apps Script user" banner. The app itself is not changed.
const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
const APP_URL = 'https://script.google.com/macros/s/AKfycbx-iFh71k3iHvSHMoFRP4kKY86gleX__CDyj3s2Dn9r8UVpknzVe5noqWAw5l9bYZZ7PQ/exec';

// Runs in Google's outer page only. Hides the banner text box, never anything that holds the app's iframe.
const HIDE_JS = `(function(){if(window.__sumoHide)return;window.__sumoHide=1;var T='Google Apps Script user';
var hide=function(){try{var l=document.querySelectorAll('div,span,p,table');for(var i=0;i<l.length;i++){var e=l[i],t=e.textContent||'';
if(t.length<400&&t.indexOf(T)>-1&&!e.querySelector('iframe')){var x=e;while(x.parentElement&&x.parentElement!==document.body&&(x.parentElement.textContent||'').length<400&&!x.parentElement.querySelector('iframe'))x=x.parentElement;
x.style.setProperty('display','none','important')}}}catch(e){}};
new MutationObserver(hide).observe(document.documentElement,{childList:true,subtree:true});hide();setTimeout(hide,500);setTimeout(hide,2000)})();`;

const okHost = h => /(^|\.)google\.com$|(^|\.)googleusercontent\.com$/.test(h || '');
if (!app.requestSingleInstanceLock()) app.quit();

let win;
function create() {
  win = new BrowserWindow({
    width: 1366, height: 860, minWidth: 900, minHeight: 600,
    backgroundColor: '#0B0B0C', title: 'SUMOVAN MM DOCs', icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: false }
  });
  win.setMenuBarVisibility(false);
  const wc = win.webContents;
  wc.setUserAgent(wc.getUserAgent().replace(/\s*Electron\/\S+/, '').replace(/\s*sumovan-mm-docs\/\S+/, ''));
  const inject = () => { wc.executeJavaScript(HIDE_JS).catch(() => {}); };
  wc.on('dom-ready', inject);
  wc.on('did-finish-load', inject);
  // PDFs made by the app open in a window of their own; any other link opens in the normal browser
  wc.setWindowOpenHandler(({ url }) => {
    if (/^(blob:|about:blank)/.test(url)) return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, width: 1000, height: 800, icon: path.join(__dirname, 'icon.png') } };
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    let h = ''; try { h = new URL(url).hostname; } catch (x) {}
    if (/^https?:/.test(url) && !okHost(h)) { e.preventDefault(); shell.openExternal(url); }
  });
  wc.on('did-fail-load', (e, code, desc, url, isMain) => {
    if (isMain && code !== -3) win.loadURL('data:text/html,' + encodeURIComponent(
      '<body style="font-family:sans-serif;background:#0B0B0C;color:#fff;text-align:center;padding:12vh 20px"><h2>No internet connection</h2><p>Check your internet, then press the button.</p><button style="font-size:18px;padding:12px 24px;background:#C8102E;color:#fff;border:0;border-radius:8px" onclick="location.href=\'' + APP_URL + '\'">Try again</button></body>'));
  });
  win.loadURL(APP_URL);
}
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((w, perm, cb) => cb(['media', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen'].includes(perm)));
  create();
});
app.on('window-all-closed', () => app.quit());
