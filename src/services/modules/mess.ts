import { api } from '../axiosConfig';

export const MessService = {
  getMenu: async () => {
    try {
      const res = await api.get('/mess');
      return res.data;
    } catch (error) {
      console.error('Mess Fetch Error:', error);
      return {};
    }
  },

  updateMenu: async (day: string, menuData: any) => {
    const payload = {
      day,
      ...menuData
    };
    const res = await api.post('/mess/update', payload);
    return res.data;
  },

  submitFeedback: async (feedback: { day: string; mealType: string; rating: number; comment?: string; studentId?: number }) => {
    const res = await api.post('/mess/feedback', feedback);
    return res.data;
  },

  getFeedbackStats: async () => {
    const res = await api.get('/mess/feedback/stats');
    return res.data;
  }
};