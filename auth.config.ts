// auth.config.ts - Edge Runtime兼容 (Auth.js v5)
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    // error: "/auth/error", // 如需要可后续添加
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // 定义公共路由（不需要登录）
      const publicRoutes = [
        "/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        // 未来可能添加的公共页面
        "/about",
        "/contact",
        "/blog", // 如果博客内容是公开的
      ];

      // Auth.js v5 内置API路由 - 必须允许访问
      if (pathname.startsWith("/api/auth/")) {
        return true;
      }

      // API目录下的路由，都需要认证才能访问
      if (pathname.startsWith("/api/")) {
        // 需要登录才能访问其他API
        return isLoggedIn;
      }

      // 页面路由保护策略
      const isPublicRoute = publicRoutes.includes(pathname);

      // 已登录用户访问登录/注册页面，重定向到首页
      if (isLoggedIn && ["/login", "/register"].includes(pathname)) {
        return new Response(null, {
          status: 302,
          headers: { Location: "/" },
        });
      }

      // 未登录用户访问受保护页面，重定向到登录页
      if (!isLoggedIn && !isPublicRoute) {
        return false; // 触发重定向到 signIn 页面
      }

      return true;
    },
  },
  providers: [], // 在主配置中定义
};
