// Types
interface User {
  id: number;
  username: string;
  role: string;
  branchid?: string; // Add optional branchid to the User interface
}

// Get the current authenticated user
export function getCurrentUser(): User | null {
  const userJson = localStorage.getItem('user');
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson) as User;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

// Get user token
export function getToken(): string | null {
  return localStorage.getItem('token');
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!getToken();
}

// Get user role
export function getUserRole(): string | null {
  const user = getCurrentUser();
  return user ? user.role : null;
}

// Get user branch ID
export function getUserBranchId(): string | null {
  const user = getCurrentUser();
  return user && user.branchid ? user.branchid : null;
}

// Login function
export function login(token: string, userData: User): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(userData));
}

// Logout function - keeping exactly as provided
export function logout() {
  // Clear all user-related data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userPreferences'); // ตัวอย่างข้อมูลที่อาจเก็บไว้
  sessionStorage.clear(); // ล้างข้อมูลใน sessionStorage ทั้งหมด

  // Redirect user to the login page
  window.location.href = '/auth/login';
}

// Check if user has specific role
export function hasRole(requiredRole: string): boolean {
  const role = getUserRole();
  return role === requiredRole;
}

// Check if user belongs to a specific branch
export function isFromBranch(branchId: string): boolean {
  const userBranchId = getUserBranchId();
  return userBranchId === branchId;
}
