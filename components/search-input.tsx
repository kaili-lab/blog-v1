"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search } from "lucide-react";

interface SearchInputProps {
  className?: string;
  redirectPath?: string;
}

export default function SearchInput({
  className,
  redirectPath = "/posts",
}: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");

  const handleSearch = () => {
    if (!query.trim()) {
      // 如果搜索为空，跳转到默认页面（清除搜索）
      router.push(redirectPath);
      return;
    }

    // 构建搜索 URL，保留现有的 category 和 tag 参数
    const params = new URLSearchParams();
    params.set("search", query.trim());

    // 保留现有的过滤参数
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");
    if (category) params.set("category", category);
    if (tag) params.set("tag", tag);

    router.push(`${redirectPath}?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search articles..."
          className="pl-10 bg-input border-border"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={handleSearch}
        aria-label="Search"
      >
        Search
      </Button>
    </div>
  );
}
