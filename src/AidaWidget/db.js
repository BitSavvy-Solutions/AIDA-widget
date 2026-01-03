/* src/AidaWidget/db.js */
import Dexie from 'dexie';

export const db = new Dexie('AidaWidgetDB');

// Define the schema
// We don't need to list all properties, only the ones we want to index/search by.
db.version(1).stores({
  chats: 'id, title, createdAt', // Primary key: id
  projects: 'id, name'           // Primary key: id
});

// Helper to migrate data from LocalStorage if it exists (One-time run)
export const migrateFromLocalStorage = async () => {
  try {
    const hasMigrated = localStorage.getItem('aida-db-migrated');
    if (hasMigrated) return;

    const oldHistory = localStorage.getItem('aida-chat-history');
    const oldProjects = localStorage.getItem('aida-history-projects');

    if (oldHistory) {
      const chats = JSON.parse(oldHistory);
      if (Array.isArray(chats) && chats.length > 0) {
        await db.chats.bulkPut(chats);
      }
    }

    if (oldProjects) {
      const projects = JSON.parse(oldProjects);
      if (Array.isArray(projects) && projects.length > 0) {
        await db.projects.bulkPut(projects);
      }
    }

    localStorage.setItem('aida-db-migrated', 'true');
    // Optional: Clear old data
    //localStorage.removeItem('aida-chat-history');
    //localStorage.removeItem('aida-history-projects');
    console.log('AidaWidget: Migration to IndexedDB successful.');
  } catch (error) {
    console.error('AidaWidget: Migration failed', error);
  }
};