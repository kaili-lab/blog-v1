/**
 * 创建测试文章脚本
 * 用于测试混合搜索功能
 */

import { prisma } from "@/lib/db";
import { generatePostEmbeddings } from "@/lib/actions/post-embedding";

// 测试文章数据
const testPosts = [
  // 场景1: 中文短词测试 - "摇床"
  {
    title: "摇床的使用技巧",
    content:
      "摇床是婴儿睡眠的重要工具，正确的摇床使用可以促进婴儿的睡眠质量。摇床声对婴儿有很好的安抚作用，能够帮助婴儿快速入睡。选择合适的摇床需要考虑安全性、稳定性和舒适性。",
    brief: "摇床使用技巧和注意事项，帮助新手父母正确使用摇床",
    category: "育儿",
    tags: ["摇床", "婴儿", "睡眠"],
    searchTest: "摇床",
    expectedThreshold: 0.2,
  },
  {
    title: "摇床声对睡眠的影响",
    content:
      "摇床声是一种特殊的白噪音，对婴儿睡眠有重要影响。研究表明，摇床声可以模拟子宫环境，让婴儿感到安全和舒适。不同类型的摇床声有不同的效果，父母需要根据婴儿的反应选择合适的摇床声。",
    brief: "摇床声的睡眠科学，了解摇床声如何影响婴儿睡眠",
    category: "育儿",
    tags: ["摇床", "睡眠", "科学"],
    searchTest: "摇床",
    expectedThreshold: 0.2,
  },

  // 场景2: 中文短语测试 - "机器学习"
  {
    title: "机器学习入门指南",
    content:
      "机器学习是人工智能的核心技术，通过算法让计算机从数据中学习模式。机器学习包括监督学习、无监督学习和强化学习三大类型。掌握机器学习需要扎实的数学基础和编程能力，是进入AI领域的重要技能。",
    brief: "机器学习基础概念和实践方法，适合初学者入门",
    category: "技术",
    tags: ["机器学习", "AI", "算法"],
    searchTest: "机器学习",
    expectedThreshold: 0.3,
  },

  // 场景3: 中文长句测试 - "深度学习算法优化"
  {
    title: "深度学习算法优化实践",
    content:
      "深度学习算法优化是提升模型性能的关键技术，包括网络结构优化、超参数调优、正则化技术等。通过合理的优化策略，可以显著提高模型的准确性和泛化能力。优化过程需要结合理论知识和实践经验。",
    brief: "深度学习优化的实用技巧，提升模型性能的方法",
    category: "技术",
    tags: ["深度学习", "算法", "优化"],
    searchTest: "深度学习算法优化",
    expectedThreshold: 0.4,
  },

  // 场景4: 英文短词测试 - "AI"
  {
    title: "AI Development Best Practices",
    content:
      "AI development requires careful planning and implementation. Best practices include proper data preprocessing, model selection, and performance evaluation. Following these guidelines ensures successful AI projects and better outcomes.",
    brief: "AI development guidelines and best practices for developers",
    category: "Technology",
    tags: ["AI", "Development", "Best Practices"],
    searchTest: "AI",
    expectedThreshold: 0.4,
  },

  // 场景5: 英文短语测试 - "machine learning"
  {
    title: "Machine Learning Fundamentals",
    content:
      "Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models. It enables computers to learn and improve from experience without being explicitly programmed. Understanding the fundamentals is crucial for success in this field.",
    brief: "Introduction to machine learning concepts and applications",
    category: "Technology",
    tags: ["Machine Learning", "AI", "Algorithms"],
    searchTest: "machine learning",
    expectedThreshold: 0.5,
  },

  // 场景6: 英文长句测试 - "artificial intelligence and deep learning"
  {
    title: "Advanced Artificial Intelligence and Deep Learning Techniques",
    content:
      "Advanced artificial intelligence and deep learning techniques have revolutionized many industries. These technologies enable machines to perform complex tasks that previously required human intelligence. Understanding these advanced concepts is essential for staying competitive in the tech industry.",
    brief: "Advanced AI and deep learning methods for professionals",
    category: "Technology",
    tags: ["AI", "Deep Learning", "Advanced"],
    searchTest: "artificial intelligence and deep learning",
    expectedThreshold: 0.6,
  },

  // 场景7: 混合语言测试 - "React 开发"
  {
    title: "React 开发最佳实践",
    content:
      "React 是一个强大的 JavaScript 库，用于构建用户界面。React development 需要遵循最佳实践，包括组件设计、状态管理、性能优化等。掌握这些技巧可以显著提高开发效率和代码质量。",
    brief: "React 开发指南和最佳实践，提升前端开发技能",
    category: "技术",
    tags: ["React", "JavaScript", "前端"],
    searchTest: "React 开发",
    expectedThreshold: 0.3,
  },
];

async function createTestData() {
  console.log("🚀 开始创建测试数据...\n");

  try {
    // 1. 创建测试用户（如果不存在）
    console.log("👤 创建测试用户...");
    const testUser = await prisma.user.upsert({
      where: { email: "test@example.com" },
      update: {},
      create: {
        name: "Test User",
        email: "test@example.com",
        image: null,
        role: "admin",
      },
    });
    console.log(`✅ 用户创建成功: ${testUser.name} (${testUser.id})`);

    // 2. 获取分类映射
    console.log("\n📂 获取分类信息...");
    const categories = ["育儿", "技术", "Technology"];
    const categoryMap = new Map();

    for (const categoryName of categories) {
      const category = await prisma.category.findUnique({
        where: { slug: categoryName.toLowerCase() },
      });
      if (category) {
        categoryMap.set(categoryName, category);
        console.log(`✅ 分类已存在: ${category.name} (${category.id})`);
      } else {
        console.log(`❌ 分类不存在: ${categoryName}`);
      }
    }

    // 3. 获取标签映射
    console.log("\n🏷️ 获取标签信息...");
    const allTags = new Set();
    testPosts.forEach((post) => {
      post.tags.forEach((tag) => allTags.add(tag));
    });

    const tagMap = new Map();
    for (const tagName of allTags) {
      const tag = await prisma.tag.findUnique({
        where: { slug: (tagName as string).toLowerCase() },
      });
      if (tag) {
        tagMap.set(tagName, tag);
        console.log(`✅ 标签已存在: ${tag.name} (${tag.id})`);
      } else {
        console.log(`❌ 标签不存在: ${tagName}`);
      }
    }

    // 4. 创建测试文章
    console.log("\n📝 创建测试文章...");
    const createdPosts = [];

    for (const postData of testPosts) {
      try {
        // 生成 slug
        const slug = postData.title
          .toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();

        // 获取分类和标签ID
        const category = categoryMap.get(postData.category);
        const tagIds = postData.tags
          .map((tagName) => tagMap.get(tagName)?.id)
          .filter(Boolean);

        if (!category) {
          console.error(`❌ 分类不存在: ${postData.category}`);
          continue;
        }

        // 直接使用 Prisma 创建文章
        const post = await prisma.post.create({
          data: {
            title: postData.title,
            slug: slug,
            brief: postData.brief,
            content: postData.content,
            coverImage: "",
            categoryId: category.id,
            authorId: testUser.id,
            published: true,
            featured: false,
            metaTitle: postData.title,
            metaDescription: postData.brief,
            tags: {
              connect: tagIds.map((id) => ({ id })),
            },
          },
          include: {
            category: true,
            tags: true,
            author: true,
          },
        });

        // 直接调用生成 embedding
        await generatePostEmbeddings({
          id: post.id,
          title: post.title,
          content: post.content,
        });

        createdPosts.push({
          ...post,
          searchTest: postData.searchTest,
          expectedThreshold: postData.expectedThreshold,
        });

        console.log(`✅ 文章创建成功: ${postData.title}`);
      } catch (error) {
        console.error(`❌ 创建文章失败: ${postData.title}`, error);
      }
    }

    // 5. 输出测试信息
    console.log("\n📊 测试数据创建完成！");
    console.log("=".repeat(60));
    console.log("测试场景总结:");
    console.log("=".repeat(60));

    const scenarios = [
      {
        name: "中文短词",
        posts: createdPosts.filter((p) => p.searchTest === "摇床"),
      },
      {
        name: "中文短语",
        posts: createdPosts.filter((p) => p.searchTest === "机器学习"),
      },
      {
        name: "中文长句",
        posts: createdPosts.filter((p) => p.searchTest === "深度学习算法优化"),
      },
      {
        name: "英文短词",
        posts: createdPosts.filter((p) => p.searchTest === "AI"),
      },
      {
        name: "英文短语",
        posts: createdPosts.filter((p) => p.searchTest === "machine learning"),
      },
      {
        name: "英文长句",
        posts: createdPosts.filter(
          (p) => p.searchTest === "artificial intelligence and deep learning"
        ),
      },
      {
        name: "混合语言",
        posts: createdPosts.filter((p) => p.searchTest === "React 开发"),
      },
    ];

    scenarios.forEach((scenario) => {
      console.log(`\n${scenario.name}:`);
      scenario.posts.forEach((post) => {
        console.log(`  - ${post.title} (阈值: ${post.expectedThreshold})`);
      });
    });

    console.log("\n🎯 下一步操作:");
    console.log("1. 运行: npm run test:report");
    console.log("3. 访问 /posts 页面测试搜索功能");
    console.log("4. 尝试搜索: 摇床, 机器学习, AI, machine learning");
    console.log("5. 检查搜索结果是否包含相关文章");
    console.log("6. 观察搜索类型: traditional 或 hybrid");
  } catch (error) {
    console.error("❌ 创建测试数据失败:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
createTestData().catch(console.error);
