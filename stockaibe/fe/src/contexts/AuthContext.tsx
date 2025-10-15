/**
 * Authentication context for managing user state
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { message } from 'antd';
import apiClient from '../api/client';
import type { User, LoginRequest, RegisterRequest } from '../types/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      if (apiClient.isAuthenticated()) {
        try {
          const currentUser = await apiClient.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          console.error('Failed to get current user:', error);
          apiClient.logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      await apiClient.login(data);
      const currentUser = await apiClient.getCurrentUser();
      setUser(currentUser);
      message.success('登录成功');
    } catch (error: any) {
      message.error(error.response?.data?.detail || '登录失败');
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      await apiClient.register(data);
      message.success('注册成功，请登录');
    } catch (error: any) {
      message.error(error.response?.data?.detail || '注册失败');
      throw error;
    }
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
    message.info('已退出登录');
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: user !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
