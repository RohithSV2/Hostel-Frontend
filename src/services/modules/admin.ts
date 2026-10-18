import { api } from '../axiosConfig';

export const AdminService = {
  // Stats
  getStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data;
  },
  
  // Student Management
  getAllStudents: async () => {
    const res = await api.get('/admin/students');
    return res.data;
  },

  getStudentById: async (id: number | string) => {
    const res = await api.get(`/admin/students/${id}`);
    return res.data;
  },

  addStudent: async (studentData: any) => {
    const res = await api.post('/admin/add-student', studentData);
    return res.data;
  },

  updateStudent: async (id: number | string, data: any) => {
    const res = await api.put(`/admin/students/${id}`, data);
    return res.data;
  },

  deleteStudent: async (id: number | string) => {
    const res = await api.delete(`/admin/students/${id}`);
    return res.data;
  },

  // Rooms Management
  getAllRooms: async () => {
    const res = await api.get('/rooms');
    return res.data;
  },

  allocateRoom: async (allocationData: { studentId: number; roomNumber: string; bedId?: string; block?: string }) => {
    const res = await api.post('/rooms/allocate', allocationData);
    return res.data;
  },

  deallocateRoom: async (studentId: number) => {
    const res = await api.post('/rooms/deallocate', { studentId });
    return res.data;
  },

  updateRoomStatus: async (roomId: number, status: 'AVAILABLE' | 'FULL' | 'MAINTENANCE') => {
    const res = await api.put(`/rooms/${roomId}/status`, { status });
    return res.data;
  },

  createRoom: async (roomData: any) => {
    const res = await api.post('/rooms', roomData);
    return res.data;
  },

  // Mess Menu
  updateMenu: async (day: string, menuData: any) => {
    const res = await api.post('/admin/menu', { day, ...menuData });
    return res.data;
  },

  // Notices & Announcements
  broadcastNotice: async (noticeData: { title: string; content: string; priority?: string; category?: string }) => {
    const res = await api.post('/admin/notice', noticeData);
    return res.data;
  },

  getNotices: async () => {
    const res = await api.get('/admin/notices');
    return res.data;
  },

  // Fallback transformer if needed
  transformStudentsToRooms: (students: any[]) => {
    const roomsMap = new Map();
    for (let i = 101; i <= 120; i++) {
      roomsMap.set(String(i), { roomNo: String(i), capacity: 3, occupants: [], status: 'AVAILABLE' });
    }
    
    students.forEach(student => {
      if (student.roomNumber && roomsMap.has(student.roomNumber)) {
        const room = roomsMap.get(student.roomNumber);
        room.occupants.push(student);
        if (room.occupants.length >= room.capacity) room.status = 'FULL';
      }
    });
    return Array.from(roomsMap.values());
  }
};