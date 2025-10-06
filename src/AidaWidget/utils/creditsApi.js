// src/AidaWidget/utils/creditsApi.js
export const fetchUserCredits = async (userId) => {
  if (!userId) return null;
  
  try {
    const response = await fetch(`https://aitutfunc.azurewebsites.net/api/credits/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
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