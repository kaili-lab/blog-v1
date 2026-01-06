/**
 * 生成搜索功能测试报告
 * 运行方式: npx tsx scripts/generate-test-report.ts
 */

import { searchPostsWithFilters } from "@/lib/db-access/post";

interface TestResult {
  query: string;
  expected: string;
  threshold: number;
  success: boolean;
  resultCount?: number;
  searchType?: string;
  duration: number;
  traditionalCount?: number;
  vectorCount?: number;
  error?: string;
}

const testCases = [
  {
    query: "摇床",
    expected: "中文短词",
    threshold: 0.2,
    description: "测试中文短词搜索，应该使用低阈值",
  },
  {
    query: "机器学习",
    expected: "中文短语",
    threshold: 0.3,
    description: "测试中文短语搜索，应该使用中等阈值",
  },
  {
    query: "深度学习算法优化",
    expected: "中文长句",
    threshold: 0.4,
    description: "测试中文长句搜索，应该使用较高阈值",
  },
  {
    query: "AI",
    expected: "英文短词",
    threshold: 0.4,
    description: "测试英文短词搜索，应该使用中等阈值",
  },
  {
    query: "machine learning",
    expected: "英文短语",
    threshold: 0.5,
    description: "测试英文短语搜索，应该使用较高阈值",
  },
  {
    query: "artificial intelligence and deep learning",
    expected: "英文长句",
    threshold: 0.6,
    description: "测试英文长句搜索，应该使用高阈值",
  },
  {
    query: "React 开发",
    expected: "混合语言",
    threshold: 0.3,
    description: "测试混合语言搜索，应该使用中等阈值",
  },
];

async function generateTestReport() {
  console.log("🧪 开始搜索功能测试...\n");

  const results: TestResult[] = [];

  for (const testCase of testCases) {
    console.log("=".repeat(80));
    console.log(`测试: "${testCase.query}"`);
    console.log(`类型: ${testCase.expected}`);
    console.log(`描述: ${testCase.description}`);
    console.log(`预期阈值: ${testCase.threshold}`);
    console.log("-".repeat(80));

    const startTime = Date.now();

    try {
      const result = await searchPostsWithFilters(testCase.query, {
        page: 1,
        pageSize: 10,
        onlyPublished: true,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      const testResult = {
        query: testCase.query,
        expected: testCase.expected,
        threshold: testCase.threshold,
        success: result.success,
        resultCount: result.posts.length,
        searchType: result.searchType,
        duration: duration,
        traditionalCount: result.traditionalCount || 0,
        vectorCount: result.vectorCount || 0,
      };

      results.push(testResult);

      console.log(`✅ 结果: ${result.success ? "成功" : "失败"}`);
      console.log(`📊 找到文章: ${result.posts.length} 篇`);
      console.log(`🔍 搜索类型: ${result.searchType}`);
      console.log(`⏱️ 耗时: ${duration}ms`);

      if (result.searchType === "hybrid") {
        console.log(`📈 传统搜索: ${result.traditionalCount} 篇`);
        console.log(`🤖 向量搜索: ${result.vectorCount} 篇`);
      }

      // 显示前3个结果
      if (result.posts.length > 0) {
        console.log("\n📝 搜索结果:");
        result.posts
          .slice(0, 3)
          .forEach((post: { title: string; brief: string }, index: number) => {
            console.log(`  ${index + 1}. ${post.title}`);
            console.log(`     简介: ${post.brief}`);
          });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(`❌ 测试失败: ${errorMessage}`);
      results.push({
        query: testCase.query,
        expected: testCase.expected,
        threshold: testCase.threshold,
        success: false,
        error: errorMessage,
        duration: 0,
        searchType: undefined,
        resultCount: 0,
        traditionalCount: 0,
        vectorCount: 0,
      });
    }

    console.log("\n");
  }

  // 生成测试报告
  console.log("📊 测试报告总结");
  console.log("=".repeat(80));

  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;
  const successRate = (successCount / totalCount) * 100;

  console.log(
    `✅ 成功测试: ${successCount}/${totalCount} (${successRate.toFixed(1)}%)`
  );
  console.log(
    `⏱️ 平均耗时: ${(
      results.reduce((sum, r) => sum + r.duration, 0) / totalCount
    ).toFixed(0)}ms`
  );

  console.log("\n📈 详细结果:");
  results.forEach((result, index) => {
    const status = result.success ? "✅" : "❌";
    console.log(
      `${index + 1}. ${status} "${result.query}" - ${result.expected} (${
        result.duration
      }ms)`
    );
  });

  console.log("\n🎯 性能分析:");
  const traditionalSearches = results.filter(
    (r) => r.searchType === "traditional"
  );
  const hybridSearches = results.filter((r) => r.searchType === "hybrid");

  if (traditionalSearches.length > 0) {
    const avgTraditionalTime =
      traditionalSearches.reduce((sum, r) => sum + r.duration, 0) /
      traditionalSearches.length;
    console.log(`⚡ 传统搜索平均耗时: ${avgTraditionalTime.toFixed(0)}ms`);
  }

  if (hybridSearches.length > 0) {
    const avgHybridTime =
      hybridSearches.reduce((sum, r) => sum + r.duration, 0) /
      hybridSearches.length;
    console.log(`🤖 混合搜索平均耗时: ${avgHybridTime.toFixed(0)}ms`);
  }

  console.log("\n💡 优化建议:");
  if (successRate < 100) {
    console.log("- 检查失败测试的搜索词和数据库内容");
    console.log("- 确认嵌入向量是否正确生成");
    console.log("- 检查相似度阈值设置是否合理");
  }

  const slowSearches = results.filter((r) => r.duration > 3000);
  if (slowSearches.length > 0) {
    console.log("- 优化慢查询，考虑添加数据库索引");
    console.log("- 检查向量搜索的API调用性能");
  }

  console.log("\n🎉 测试完成！");
}

generateTestReport().catch(console.error);
