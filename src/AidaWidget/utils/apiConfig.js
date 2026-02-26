/* src/AidaWidget/utils/apiConfig.js */
// This file centralizes API configuration and switches endpoints based on the deployment environment.


const isProdEnvironment = 
  window.location.hostname === 'beta-aitut.iverse.space' || 
  window.location.hostname === 'aida.iverse.space';

// --- Agent Backend Configuration (Chat & Transcription) ---
const AGENT_PROD_HOST = 'https://aida-agentbackend-prod.graydune-dda4d1ba.canadaeast.azurecontainerapps.io/api';
const AGENT_BETA_HOST = 'https://aida-agentbackend-dev.graydune-dda4d1ba.canadaeast.azurecontainerapps.io/api';

const agentHost = isProdEnvironment ? AGENT_PROD_HOST : AGENT_BETA_HOST;

export const CHAT_URL = `${agentHost}/iverse_agent`;
export const TRANSCRIPTION_URL = `${agentHost}/transcribe_audio`;
// ✅ ADDED: New endpoint for the URL scraper
export const SCRAPE_URL = `${agentHost}/scrape_url_to_markdown`;


// --- Functions API Configuration (Credits) ---
// NOTE: You must provide the correct host and key for the beta environment.
// The current values for beta are placeholders and need to be replaced.

const CREDITS_PROD_HOST = 'https://aitutfunc.azurewebsites.net';
// TODO: Replace with your beta functions host if it's different.
const CREDITS_BETA_HOST = 'https://aitutfunc.azurewebsites.net'; 

const CREDITS_PROD_KEY = 'dlkgVHOPghXdpOeE9SgyYe0r6nN3AjuEowskmJsDDhrBAzFuSlPb7g==';
// TODO: Replace with your beta function key.
const CREDITS_BETA_KEY = 'dlkgVHOPghXdpOeE9SgyYe0r6nN3AjuEowskmJsDDhrBAzFuSlPb7g=='; 

export const CREDITS_API_HOST = isProdEnvironment ?  CREDITS_PROD_HOST : CREDITS_BETA_HOST;
export const CREDITS_API_KEY = isProdEnvironment ?  CREDITS_PROD_KEY : CREDITS_BETA_KEY;