import { prisma } from "./db";
import type {
  User as NextAuthUser,
  Account as NextAuthAccount,
} from "next-auth";
import { logAuthEvent } from "@/auth";

// 关于参数的类型说明：
// 1. 这个函数在 signIn 这个Callback 中调用
// 2. Authjs定义这个signIn时提供了类型，所以调用signIn时，TS会自动推导出signIn参数类型；
// 3. 这个函数也需要user, account，它们需要显式的定义类型，因为参数来自signIn，所以直接它的参数类型即可；
export async function handleOAuthSignIn(
  user: NextAuthUser,
  account: NextAuthAccount
): Promise<{ success: boolean; userId?: string; error?: string }> {
  // 基本验证：确保有邮箱
  if (!user.email) {
    return {
      success: false,
      error: "OAuth user missing email",
    };
  }

  try {
    // 检查是否已存在相同邮箱的用户
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { account: true },
    });

    if (existingUser) {
      // 检查是否已经链接了当前provider
      const existingAccount = existingUser.account.find(
        (acc: { provider: string }) => acc.provider === account.provider
      );

      if (!existingAccount) {
        // 重要：在修改user对象之前保存原始的OAuth信息
        const originalProviderName = user.name;
        const originalProviderImage = user.image;

        // 自动链接新的OAuth账户到现有用户
        await prisma.account.create({
          // Prisma的新增和更新，需要data这个参数，来指定要新增或更新的数据；
          data: {
            userId: existingUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refresh_token: account.refresh_token ?? null,
            access_token: account.access_token ?? null,
            expires_at: account.expires_at ?? null,
            token_type: account.token_type ?? null,
            scope: account.scope ?? null,
            id_token: account.id_token ?? null,
            session_state: account.session_state
              ? String(account.session_state)
              : null,
            // 存储当前provider的原始OAuth信息
            providerName: originalProviderName ?? null,
            providerImage: originalProviderImage ?? null,
          },
        });

        logAuthEvent("Account linked", account.provider, {
          email: user.email,
          providerName: originalProviderName,
          hasImage: !!originalProviderImage,
        });
      } else {
        // 如果账户已存在，更新provider信息（以防OAuth信息有更新）
        await prisma.account.update({
          where: { id: existingAccount.id },
          data: {
            providerName: user.name ?? null,
            providerImage: user.image ?? null,
            // 也更新OAuth tokens
            refresh_token: account.refresh_token ?? null,
            access_token: account.access_token ?? null,
            expires_at: account.expires_at ?? null,
            id_token: account.id_token ?? null,
          },
        });

        logAuthEvent("Account updated", account.provider, {
          email: user.email,
          providerName: user.name,
          hasImage: !!user.image,
        });
      }

      // 返回现有用户的ID，供 signIn callback 更新 user.id
      return { success: true, userId: existingUser.id };
    }

    // 首次OAuth登录，会自动创建用户（通过 adapter）
    return { success: true, userId: user.id };
  } catch (error) {
    console.error("Error in OAuth sign-in:", error);
    return { success: false, error: String(error) };
  }
}
