const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Получить путь к БД
    getDbPath: () => ipcRenderer.invoke('get-db-path'),
    
    // Клиенты
    getClients: () => ipcRenderer.invoke('get-clients'),
    getClient: (id) => ipcRenderer.invoke('get-client', id),
    addClient: (clientData) => ipcRenderer.invoke('add-client', clientData),
    updateClient: (id, updates) => ipcRenderer.invoke('update-client', id, updates),
    deleteClient: (id) => ipcRenderer.invoke('delete-client', id),
    
    // Сессии
    addSession: (clientId, sessionData) => ipcRenderer.invoke('add-session', clientId, sessionData),
    updateSession: (clientId, sessionId, updates) => ipcRenderer.invoke('update-session', clientId, sessionId, updates)
});