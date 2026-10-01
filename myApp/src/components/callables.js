import { api } from '../services/api';

export const getUserStatus = () => api.getUserStatus().then(res => ({ data: res }));
export const analyzeHair = (data) => api.analyzeHair(data).then(res => ({ data: res }));
export const getAnalytics = () => api.getAnalytics().then(res => ({ data: res }));
export const updateDailyProgress = (data) => api.updateDailyProgress(data).then(res => ({ data: res }));
export const uploadMilestonePhoto = (data) => api.uploadMilestonePhoto(data).then(res => ({ data: res }));
export const generateWeeklySnapshot = () => Promise.resolve({ data: {} }); // Mock or implement if needed