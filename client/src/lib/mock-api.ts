// Mock API for development only
export const enableMockAPI = () => {
  console.log('Mock API disabled in production');
};

export const getMockApiData = (endpoint: string) => {
  console.log('Mock API disabled in production for:', endpoint);
  return null;
};

export default { enableMockAPI, getMockApiData };