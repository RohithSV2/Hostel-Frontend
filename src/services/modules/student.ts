import { api } from '../axiosConfig';

export const StudentService = {
  // --- COMPLAINTS ---
  getComplaints: async (userId?: string | number, isAdmin = false, filters?: { status?: string; category?: string }) => {
    let url = isAdmin ? '/complaints/all' : `/complaints/my/${userId}`;
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'All') params.append('status', filters.status);
    if (filters?.category && filters.category !== 'All') params.append('category', filters.category);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const res = await api.get(url);
    return res.data;
  },
  
  submitComplaint: async (data: { title: string; category: string; priority?: string; description?: string; userId?: number; image?: string }) => {
    return await api.post('/complaints', data);
  },

  resolveComplaint: async (id: string | number, adminRemarks?: string) => {
    return await api.put(`/complaints/${id}/resolve`, { adminRemarks });
  },

  updateComplaintStatus: async (id: string | number, status: string, adminRemarks?: string) => {
    return await api.put(`/complaints/${id}/status`, { status, adminRemarks });
  },

  // --- GATE PASSES ---
  getGatePasses: async (userId?: string | number, isAdmin = false) => {
    const url = isAdmin ? '/gatepass/all' : `/gatepass/my/${userId}`;
    const res = await api.get(url);
    return res.data;
  },

  requestGatePass: async (data: { reason: string; passType?: string; from: string; to: string; departureTime?: string; returnTime?: string; destination?: string; studentId?: number }) => {
    return await api.post('/gatepass', data);
  },

  updateGatePassStatus: async (id: string | number, status: string, adminRemarks?: string) => {
    return await api.put(`/gatepass/${id}`, { status, adminRemarks });
  },

  verifyPassToken: async (token: string) => {
    const res = await api.get(`/gatepass/verify/${token}`);
    return res.data;
  },

  // --- LOST & FOUND ---
  getLostItems: async () => {
    const res = await api.get('/lostfound');
    return res.data;
  },

  reportLostItem: async (data: any) => {
    // If data already is a FormData or plain object
    if (data instanceof FormData) {
      const res = await api.post('/lostfound', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    }

    const res = await api.post('/lostfound', data);
    return res.data;
  },
  
  resolveLostItem: async (id: string | number, foundByContact: string) => {
    return await api.put(`/lostfound/${id}/resolve`, { foundByContact });
  },

  // --- PROFILE & DASHBOARD ---
  getProfile: async (userId: string | number) => {
    const res = await api.get(`/auth/me/${userId}`);
    return res.data;
  },

  updateProfile: async (data: any) => {
    const res = await api.put('/auth/profile', data);
    return res.data;
  },

  getDashboardSummary: async (userId: string | number) => {
    const res = await api.get(`/student/dashboard/${userId}`);
    return res.data;
  }
};