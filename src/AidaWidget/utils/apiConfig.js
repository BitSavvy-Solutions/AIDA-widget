/* src/AidaWidget/utils/apiConfig.js */
// This file centralizes API configuration and switches endpoints based on the deployment environment.

const isBetaEnvironment = window.location.hostname === 'beta-aitut.iverse.space';

// --- Agent Backend Configuration (Chat & Transcription) ---
const AGENT_PROD_HOST = 'https://aitut-agentbackend.azurewebsites.net';
const AGENT_BETA_HOST = 'https://aitut-agentbackend-beta-g3a7fndzdadbbafd.canadacentral-01.azurewebsites.net';

const agentHost = isBetaEnvironment ? AGENT_BETA_HOST : AGENT_PROD_HOST;

export const CHAT_URL = `${agentHost}/iverse_agent`;
export const TRANSCRIPTION_URL = `${agentHost}/transcribe_audio`;


// --- Functions API Configuration (Credits) ---
// NOTE: You must provide the correct host and key for the beta environment.
// The current values for beta are placeholders and need to be replaced.

const CREDITS_PROD_HOST = 'https://aitutfunc.azurewebsites.net';
// TODO: Replace with your beta functions host if it's different.
const CREDITS_BETA_HOST = 'https://aitutfunc.azurewebsites.net'; 

const CREDITS_PROD_KEY = 'dlkgVHOPghXdpOeE9SgyYe0r6nN3AjuEowskmJsDDhrBAzFuSlPb7g==';
// TODO: Replace with your beta function key.
const CREDITS_BETA_KEY = 'dlkgVHOPghXdpOeE9SgyYe0r6nN3AjuEowskmJsDDhrBAzFuSlPb7g=='; 

export const CREDITS_API_HOST = isBetaEnvironment ? CREDITS_BETA_HOST : CREDITS_PROD_HOST;
export const CREDITS_API_KEY = isBetaEnvironment ? CREDITS_BETA_KEY : CREDITS_PROD_KEY;