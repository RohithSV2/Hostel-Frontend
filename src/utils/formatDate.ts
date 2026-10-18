export const formatDate = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '--';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return String(dateInput);
  }
};

export const formatTime = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '--';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return String(dateInput);
  }
};

export const formatCurrency = (amount?: number | null): string => {
  if (amount === undefined || amount === null) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const getPriorityColor = (priority?: string): string => {
  switch (priority) {
    case 'Urgent':
      return '#B3261E'; // Red
    case 'High':
      return '#E65100'; // Dark Orange
    case 'Normal':
      return '#1565C0'; // Blue
    case 'Low':
    default:
      return '#689F38'; // Green
  }
};

export const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'Approved':
    case 'Resolved':
    case 'Paid':
    case 'AVAILABLE':
      return '#2E7D32'; // Green
    case 'In Progress':
    case 'Partial':
      return '#E65100'; // Orange
    case 'Pending':
      return '#F57C00'; // Amber
    case 'Rejected':
    case 'Overdue':
    case 'FULL':
    case 'MAINTENANCE':
      return '#C62828'; // Red
    default:
      return '#757575';
  }
};
