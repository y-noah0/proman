/**
 * UI utility functions for common operations
 */

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Project statuses
    Planning: "bg-blue-100 text-blue-800",
    Active: "bg-green-100 text-green-800",
    Completed: "bg-gray-100 text-gray-800",
    
    // Feature statuses
    Backlog: "bg-gray-100 text-gray-800",
    Ready: "bg-blue-100 text-blue-800",
    "In Progress": "bg-amber-100 text-amber-800",
    Review: "bg-purple-100 text-purple-800",
    Done: "bg-green-100 text-green-800",
    
    // Contract statuses
    Draft: "bg-gray-100 text-gray-800",
    Agreed: "bg-blue-100 text-blue-800",
    Implemented: "bg-green-100 text-green-800",
    
    // Consolidation statuses
    Pending: "bg-amber-100 text-amber-800",
    Fixed: "bg-green-100 text-green-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    Must: "bg-red-100 text-red-800",
    Should: "bg-orange-100 text-orange-800",
    Could: "bg-blue-100 text-blue-800",
    "Won't": "bg-gray-100 text-gray-800",
  };
  return colors[priority] || "bg-gray-100 text-gray-800";
}

export function getProgressPercentage(
  completed: number,
  total: number,
): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
