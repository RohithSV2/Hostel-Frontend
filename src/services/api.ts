import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdminService } from './modules/admin';
import { StudentService } from './modules/student';
import { ChatService } from './modules/chat';
import { MessService } from './modules/mess';
import { Room, User, Complaint, GatePass, LostItem, ChatMessage } from '../types';

// Export Module Services
export { AdminService, StudentService, ChatService, MessService };

// ====================================================================
// 1. AUTH & USER HELPERS
// ====================================================================
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userStr = await AsyncStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

export const getCurrentUserId = async (): Promise<number | null> => {
  const user = await getCurrentUser();
  return user ? user.id : null;
};

// ====================================================================
// 2. COMPLAINTS (Role-based & Filterable)
// ====================================================================
export const fetchComplaints = async (filters?: { status?: string; category?: string }): Promise<Complaint[]> => {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const isAdmin = user.role === 'admin';
    return await StudentService.getComplaints(user.id, isAdmin, filters);
  } catch (error) {
    console.error('Fetch Complaints Error:', error);
    return [];
  }
};

export const submitComplaint = async (data: { title: string; category: string; priority?: string; description?: string; userId?: number; image?: string }) => {
  return await StudentService.submitComplaint(data);
};

export const resolveComplaintAPI = async (id: string | number, remarks?: string) => {
  return await StudentService.resolveComplaint(id, remarks);
};

export const updateComplaintStatusAPI = async (id: string | number, status: string, remarks?: string) => {
  return await StudentService.updateComplaintStatus(id, status, remarks);
};

// ====================================================================
// 3. GATE PASSES (Role-based)
// ====================================================================
export const fetchLeaveRequests = async (): Promise<GatePass[]> => {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const isAdmin = user.role === 'admin';
    return await StudentService.getGatePasses(user.id, isAdmin);
  } catch (error) {
    console.error('Fetch Gate Pass Error:', error);
    return [];
  }
};

export const submitLeaveRequest = async (data: any) => {
  return await StudentService.requestGatePass(data);
};

export const updateGatePass = async (id: string | number, status: string, adminRemarks?: string) => {
  return await StudentService.updateGatePassStatus(id, status, adminRemarks);
};

// ====================================================================
// 4. ROOMS & STUDENT RECORDS
// ====================================================================
export const fetchRooms = async (): Promise<Room[]> => {
  try {
    const rooms = await AdminService.getAllRooms();
    return rooms || [];
  } catch (error) {
    console.warn('Fetch Rooms API failed, falling back to local student transformer:', error);
    const students = await AdminService.getAllStudents();
    return AdminService.transformStudentsToRooms(students);
  }
};

export const allocateStudentRoom = async (studentId: number, roomNumber: string, bedId?: string, block?: string) => {
  return await AdminService.allocateRoom({ studentId, roomNumber, bedId, block });
};

export const deallocateStudentRoom = async (studentId: number) => {
  return await AdminService.deallocateRoom(studentId);
};

export const updateRoomMaintenanceStatus = async (roomId: number, status: 'AVAILABLE' | 'FULL' | 'MAINTENANCE') => {
  return await AdminService.updateRoomStatus(roomId, status);
};

export const fetchAllStudents = AdminService.getAllStudents;
export const addNewStudent = AdminService.addStudent;
export const updateStudentData = AdminService.updateStudent;
export const deleteStudentRecord = AdminService.deleteStudent;
export const fetchAdminStats = AdminService.getStats;

// ====================================================================
// 5. MESS & FEEDBACK
// ====================================================================
export const fetchMenu = MessService.getMenu;
export const updateMenuData = MessService.updateMenu;
export const submitMealFeedback = MessService.submitFeedback;
export const fetchFeedbackStats = MessService.getFeedbackStats;

// ====================================================================
// 6. LOST & FOUND
// ====================================================================
export const fetchLostItems = StudentService.getLostItems;
export const submitLostFoundItem = StudentService.reportLostItem;
export const resolveLostItemAPI = StudentService.resolveLostItem;

// Auto-Send Found Message Helper
export const autoSendFoundMessage = async (item: string, finderContact: string, ownerContact: string) => {
  try {
    const user = await getCurrentUser();
    if (user) {
      await ChatService.sendMessage(
        `I found your reported item "${item}"! Please reach out to me at ${finderContact} to collect it.`,
        user.id,
        null,
        false
      );
    }
  } catch (e) {
    console.error('Auto send message error:', e);
  }
};

// ====================================================================
// 7. COMMUNITY CHAT & DIRECT MESSAGES
// ====================================================================
export const fetchGeneralChat = async () => {
  try {
    const messages = await ChatService.getGeneralChat();
    return (messages || []).map((msg: any) => ({
      id: msg.id.toString(),
      text: msg.content,
      user: msg.Sender ? msg.Sender.name : 'Unknown User',
      time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderId: msg.senderId,
      isNotice: msg.isNotice
    }));
  } catch (error) {
    return [];
  }
};

export const sendGeneralMessage = async (text: string) => {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return await ChatService.sendMessage(text, userId, null, false);
};

export const sendBroadcast = async (text: string, adminId: string | number) => {
  return await ChatService.sendMessage(text, adminId, null, true);
};

const organizeDMsIntoThreads = (myId: number, rawMessages: any[]) => {
  const threadsMap = new Map();
  rawMessages.forEach(msg => {
    const isMeSender = msg.senderId === myId;
    const otherUser = isMeSender ? msg.Receiver : msg.Sender;
    if (!otherUser) return;

    const threadId = otherUser.id.toString();
    if (!threadsMap.has(threadId)) {
      threadsMap.set(threadId, {
        id: threadId,
        name: otherUser.name,
        avatar: otherUser.name ? otherUser.name.slice(0, 2).toUpperCase() : 'U',
        lastMessage: msg.content,
        unread: 0,
        messages: []
      });
    }
    threadsMap.get(threadId).messages.push({
      id: msg.id.toString(),
      text: msg.content,
      sender: isMeSender ? 'me' : 'other',
      timestamp: new Date(msg.createdAt).getTime()
    });
  });
  return Array.from(threadsMap.values());
};

export const fetchChats = async () => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const rawMessages = await ChatService.getMyDMs(userId);
    return organizeDMsIntoThreads(userId, rawMessages || []);
  } catch (error) {
    return [];
  }
};

export const sendDM = async (receiverId: string | number, text: string) => {
  const senderId = await getCurrentUserId();
  if (!senderId) return null;
  return await ChatService.sendMessage(text, senderId, receiverId, false);
};

// ====================================================================
// 8. STUDENT PROFILE
// ====================================================================
export const fetchStudentData = async () => {
  try {
    const userStr = await AsyncStorage.getItem('user');
    if (!userStr) return null;

    const { id } = JSON.parse(userStr);
    const freshData = await StudentService.getProfile(id);

    return {
      ...freshData,
      course: freshData.course || 'B.Tech - Computer Science',
      profileImage: freshData.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    };
  } catch (error) {
    console.error('Error fetching student data:', error);
    return null;
  }
};

export const updateStudentProfile = async (profileData: any) => {
  return await StudentService.updateProfile(profileData);
};