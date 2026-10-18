import { api } from '../axiosConfig';

export const ChatService = {
  getGeneralChat: async () => {
    const res = await api.get('/chat/general');
    return res.data;
  },

  getMyDMs: async (userId: string | number) => {
    const res = await api.get(`/chat/dms/${userId}`);
    return res.data;
  },

  sendMessage: async (content: string, senderId: string | number, receiverId: string | number | null = null, isNotice = false) => {
    const res = await api.post('/chat/send', { content, senderId, receiverId, isNotice });
    return res.data;
  }
};