const {app, BrowserWindow} = require('electron');
const path = require('path')
const modalPath = path.join('file://', __dirname, 'index.html')
let win; 

app.on('ready', () => {
    win = new BrowserWindow({ width: 400, height: 320 })
    win.on('close', () => { win = null })
    win.loadURL(modalPath)
})


