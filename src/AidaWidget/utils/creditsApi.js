/* src/AidaWidget/utils/creditsApi.js */
import { CREDITS_API_HOST, CREDITS_API_KEY } from './apiConfig';

export const fetchUserCredits = async (userId) => {
  if (!userId) return null;
  
  try {
    const response = await fetch(`${CREDITS_API_HOST}/api/credits/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
         'x-functions-key': CREDITS_API_KEY
      }
    });
    
    if (!response.ok) {
      console.warn('Failed to fetch user credits:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data?.data?.balance ?? 0;
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return null;
  }
};