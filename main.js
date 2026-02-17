const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Путь к файлу базы данных
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'clients-database', 'clients.json');

// Создание директории и файла БД если не существуют
function initDatabase() {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ clients: [] }, null, 2));
    }
}

// Чтение данных из БД
function readDatabase() {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { clients: [] };
    }
}

// Запись данных в БД
function writeDatabase(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing database:', error);
        return false;
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icons', 'icon.png'),
        title: 'Мои клиенты'
    });

    mainWindow.loadFile('index.html');

    // Убираем меню
    mainWindow.setMenuBarVisibility(false);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    initDatabase();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC обработчики для работы с данными

// Получить путь к БД
ipcMain.handle('get-db-path', () => {
    return dbPath;
});

// Получить всех клиентов
ipcMain.handle('get-clients', () => {
    const db = readDatabase();
    return db.clients;
});

// Получить клиента по ID
ipcMain.handle('get-client', (event, id) => {
    const db = readDatabase();
    return db.clients.find(client => client.id === id);
});

// Добавить нового клиента
ipcMain.handle('add-client', (event, clientData) => {
    const db = readDatabase();
    const newClient = {
        ...clientData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        status: 'active',
        sessions: []
    };
    db.clients.push(newClient);
    writeDatabase(db);
    return newClient;
});

// Обновить клиента
ipcMain.handle('update-client', (event, id, updates) => {
    const db = readDatabase();
    const index = db.clients.findIndex(client => client.id === id);
    if (index !== -1) {
        db.clients[index] = { ...db.clients[index], ...updates };
        writeDatabase(db);
        return db.clients[index];
    }
    return null;
});

// Удалить клиента
ipcMain.handle('delete-client', (event, id) => {
    const db = readDatabase();
    db.clients = db.clients.filter(client => client.id !== id);
    writeDatabase(db);
    return true;
});

// Добавить сессию клиенту
ipcMain.handle('add-session', (event, clientId, sessionData) => {
    const db = readDatabase();
    const client = db.clients.find(c => c.id === clientId);
    if (client) {
        const newSession = {
            id: generateId(),
            date: new Date().toISOString(),
            notes: sessionData.notes || ''
        };
        if (!client.sessions) {
            client.sessions = [];
        }
        client.sessions.unshift(newSession);
        writeDatabase(db);
        return newSession;
    }
    return null;
});

// Обновить сессию
ipcMain.handle('update-session', (event, clientId, sessionId, updates) => {
    const db = readDatabase();
    const client = db.clients.find(c => c.id === clientId);
    if (client && client.sessions) {
        const sessionIndex = client.sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex !== -1) {
            client.sessions[sessionIndex] = { ...client.sessions[sessionIndex], ...updates };
            writeDatabase(db);
            return client.sessions[sessionIndex];
        }
    }
    return null;
});

// Генерация уникального ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}