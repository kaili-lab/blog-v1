"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MarkdownEditor from "@/components/markdown-editor";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { postSchema } from "@/lib/zod-validations";
import { z } from "zod";
import { createPost } from "@/lib/actions/post";

import { useEffect, useState, useRef } from "react";
import { generateSlug } from "@/lib/slug-helper";
import { Loader2, X, ArrowLeft, Camera, Wand2 } from "lucide-react";
import { useSemanticToast } from "@/lib/hooks/useSemanticToast";
import { logger } from "@/lib/logger";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus } from "lucide-react";
import CategoryCreateDialog from "./category-create-dialog";
import TagCreateDialog from "./tag-create-dialog";
import { uploadImageFile } from "@/lib/utils/upload";
import { validateImageFile } from "@/lib/utils/file-validation";
import { UPLOAD_FOLDERS } from "@/lib/config/file-upload";
import { RequireAuth } from "@/components/auth/require-auth";

// 创建一个匹配 Zod schema 输入类型的类型
type PostFormInput = z.input<typeof postSchema>;

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Tag = {
  id: string;
  name: string;
  slug: string;
};

export default function PostFormPage({
  categoriesProps,
  tagsProps,
}: {
  categoriesProps: Category[];
  tagsProps: Tag[];
}) {
  const [categories, setCategories] = useState<Category[]>(categoriesProps);
  const [tags, setTags] = useState<Tag[]>(tagsProps);

  const [selectedTags] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [currentImagePublicId, setCurrentImagePublicId] = useState<string>("");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const { success, error } = useSemanticToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PostFormInput>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      slug: "",
      brief: "",
      content: "",
      coverImage: "",
      categoryId: "",
      tagIds: [],
      published: false,
      featured: false,
      metaTitle: "",
      metaDescription: "",
    },
  });

  // Initialize preview image URL when coverImage value changes
  useEffect(() => {
    const coverImageValue = form.watch("coverImage");
    if (coverImageValue && coverImageValue !== previewImageUrl) {
      setPreviewImageUrl(coverImageValue);
    }
  }, [form, previewImageUrl]);

  // 自动生成 slug
  const handleTitleChange = (title: string) => {
    const generatedSlug = generateSlug(title);
    form.setValue("slug", generatedSlug);
  };

  // 处理标签选择
  const handleTagToggle = (tagId: string) => {
    const currentTagIds = form.getValues("tagIds") || [];
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter((id) => id !== tagId)
      : [...currentTagIds, tagId];
    form.setValue("tagIds", newTagIds);
  };

  // 同步 selectedTags 到 form
  useEffect(() => {
    form.setValue("tagIds", selectedTags);
  }, [selectedTags, form]);

  const onSubmit = async (data: PostFormInput) => {
    try {
      // 确保默认值被正确设置
      const formData = {
        ...data,
        tagIds: data.tagIds ?? [],
        published: data.published ?? false,
        featured: data.featured ?? false,
      };

      const result = await createPost(formData);

      if (result.success) {
        success(result.message || "Post created successfully!");
        router.push("/dashboard/posts");
      } else {
        error(result.error || "Failed to create post");
      }
    } catch (err) {
      logger.error("Post form submission error", err);
      error("An unexpected error occurred");
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/posts");
  };

  // Handle image upload
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件
    const validation = validateImageFile(file);
    if (!validation.valid) {
      error(validation.error, validation.detail);
      return;
    }

    setIsUploadingImage(true);

    try {
      // 上传文件到 Cloudinary
      const uploadResponse = await uploadImageFile(
        file,
        UPLOAD_FOLDERS.COVER_IMAGES
      );

      if (uploadResponse.success) {
        // Update form field and preview
        form.setValue("coverImage", uploadResponse.url);
        setPreviewImageUrl(uploadResponse.url);
        setCurrentImagePublicId(uploadResponse.public_id);
        success(
          "Image uploaded successfully!",
          "Cover image has been uploaded and set."
        );
      } else {
        error(
          "Upload failed",
          uploadResponse.error || "Failed to upload image. Please try again."
        );
      }
    } catch (err) {
      logger.error("Image upload error:", err);
      error("Upload failed", "An unexpected error occurred. Please try again.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = async () => {
    // 如果有当前图片，从 Cloudinary 删除它
    if (currentImagePublicId) {
      try {
        const response = await fetch("/api/upload/cleanup", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ public_id: currentImagePublicId }),
        });

        if (response.ok) {
          success(
            "Image deleted",
            "Cover image has been removed from storage."
          );
        } else {
          console.error("Failed to delete image from Cloudinary");
        }
      } catch (err) {
        console.error("Failed to delete image from Cloudinary:", err);
        error("Delete failed", "Failed to delete image from storage.");
      }
    }

    // 清空表单和预览
    form.setValue("coverImage", "");
    setPreviewImageUrl("");
    setCurrentImagePublicId("");
  };

  const handleGenerateBrief = async () => {
    const content = form.getValues("content");

    if (!content.trim()) {
      error(
        "Content required",
        "Please enter a content before generating a brief."
      );
      return;
    }

    setIsGeneratingBrief(true);

    try {
      const response = await fetch("/api/ai/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "meta-description",
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate brief");
      }

      const data = await response.json();

      if (data.success && data.content) {
        form.setValue("brief", data.content);
        success(
          "Brief generated successfully!",
          "AI-generated brief has been created and set."
        );
      } else {
        error(
          "Generation failed",
          data.error || "Failed to generate brief. Please try again."
        );
      }
    } catch (err) {
      console.error("AI brief generation error:", err);
      error(
        "Generation failed",
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const handleGenerateCover = async () => {
    const title = form.getValues("title");
    const brief = form.getValues("brief");
    const categoryId = form.getValues("categoryId"); // 获取选中的分类ID

    if (!title.trim()) {
      error(
        "Title required",
        "Please enter a title before generating a cover image."
      );
      return;
    }

    if (!brief.trim()) {
      error(
        "Brief required",
        "Please generate a brief first before generating a cover image."
      );
      return;
    }

    // 获取分类名称
    const selectedCategory = categories.find((cat) => cat.id === categoryId);
    const categoryName = selectedCategory?.name || "general";

    setIsGeneratingCover(true);

    try {
      const response = await fetch("/api/ai/generate-cover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: brief.trim(),
          category: categoryName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate cover image");
      }

      const data = await response.json();

      if (data.success && data.image) {
        const imageData = data.image;

        // Use the image URL directly - no need to upload to Cloudinary!
        form.setValue("coverImage", imageData);
        setPreviewImageUrl(imageData);
        success(
          "Cover generated successfully!",
          "AI-generated cover image has been created and set."
        );
      } else {
        error(
          "Generation failed",
          data.error || "Failed to generate cover image. Please try again."
        );
      }
    } catch (err) {
      console.error("AI cover generation error:", err);
      error(
        "Generation failed",
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsGeneratingCover(false);
    }
  };

  // 处理分类创建成功
  const handleCategorySuccess = (category: {
    id: string;
    name: string;
    slug: string;
  }) => {
    setCategories((prev) => [...prev, category]);
    form.setValue("categoryId", category.id);
  };

  // 处理标签创建成功
  const handleTagSuccess = (tag: {
    id: string;
    name: string;
    slug: string;
  }) => {
    setTags((prev) => [...prev, tag]);
    const currentTagIds = form.getValues("tagIds") || [];
    form.setValue("tagIds", [...currentTagIds, tag.id]);
  };

  return (
    <RequireAuth>
      <div className="bg-background min-h-full">
        <div className="px-3 md:px-4 lg:px-6 py-3 md:py-4 lg:py-5 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Create New Post
            </h1>
          </div>

          {/* Form */}
          <div className="bg-card rounded-lg border border-border shadow-sm p-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Title Field */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter post title"
                          disabled={form.formState.isSubmitting}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleTitleChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cover Image Field */}
                <FormField
                  control={form.control}
                  name="coverImage"
                  render={({}) => (
                    <FormItem>
                      <FormLabel>Cover Image</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          {/* Image Preview */}
                          {previewImageUrl && (
                            <div className="relative inline-block">
                              <div className="relative w-64 h-40 overflow-hidden rounded-md border border-border bg-muted">
                                <Image
                                  src={previewImageUrl}
                                  alt="Cover preview"
                                  fill
                                  className="object-cover"
                                  priority={false}
                                  sizes="(max-width: 768px) 100vw, 256px"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-lg hover:bg-red-600 active:scale-95"
                                onClick={handleRemoveImage}
                                disabled={
                                  form.formState.isSubmitting ||
                                  isUploadingImage ||
                                  isGeneratingCover
                                }
                              >
                                <X className="h-3 w-3 transition-transform duration-200 hover:rotate-90" />
                              </Button>
                            </div>
                          )}

                          {/* Upload and Generate Buttons */}
                          <div className="flex flex-col space-y-2">
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleUploadClick}
                                disabled={
                                  form.formState.isSubmitting ||
                                  isUploadingImage ||
                                  isGeneratingCover
                                }
                                className="flex-1"
                              >
                                {isUploadingImage ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Camera className="mr-2 h-4 w-4" />
                                    Upload Image
                                  </>
                                )}
                              </Button>

                              <Button
                                type="button"
                                variant="default"
                                onClick={handleGenerateCover}
                                disabled={
                                  form.formState.isSubmitting ||
                                  isUploadingImage ||
                                  isGeneratingCover ||
                                  isGeneratingBrief ||
                                  !form.getValues("brief")?.trim() ||
                                  !!previewImageUrl
                                }
                                className="flex-1 bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                              >
                                {isGeneratingCover ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    Generate with AI
                                  </>
                                )}
                              </Button>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Upload your own image or generate one with AI
                              using your title and brief description. Brief is
                              required for AI generation.
                            </p>
                          </div>

                          {/* Hidden file input */}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Brief Field */}
                <FormField
                  control={form.control}
                  name="brief"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brief / Excerpt</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Short description of the post"
                            disabled={
                              form.formState.isSubmitting || isGeneratingBrief
                            }
                            rows={3}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateBrief}
                            disabled={
                              form.formState.isSubmitting ||
                              isGeneratingBrief ||
                              isGeneratingCover
                            }
                            className="bg-linear-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                          >
                            {isGeneratingBrief ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating Brief...
                              </>
                            ) : (
                              <>
                                <Wand2 className="mr-2 h-4 w-4" />
                                Generate Brief with AI
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Generate a brief description using AI based on your
                            title.
                          </p>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Content Field */}
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content (Markdown)</FormLabel>
                      <FormControl>
                        <MarkdownEditor
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Write your post content in Markdown..."
                          disabled={form.formState.isSubmitting}
                          minHeight={400}
                          showStats={true}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Supports Markdown formatting, code blocks, and images.
                        Use the toolbar to format text or upload images.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category Field */}
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <select
                            {...field}
                            disabled={form.formState.isSubmitting}
                            className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select a category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setIsCategoryDialogOpen(true)}
                            disabled={form.formState.isSubmitting}
                            className="h-10 w-10"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">
                        Select a category or create a new one.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tags Field */}
                <FormField
                  control={form.control}
                  name="tagIds"
                  render={() => {
                    const currentTagIds = form.watch("tagIds") || [];
                    return (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-background min-h-[60px]">
                            {tags.map((tag) => {
                              const isSelected = currentTagIds.includes(tag.id);
                              return (
                                <Badge
                                  key={tag.id}
                                  variant={isSelected ? "default" : "outline"}
                                  className="cursor-pointer transition-colors"
                                  onClick={() => handleTagToggle(tag.id)}
                                >
                                  {tag.name}
                                  {isSelected && <X className="ml-1 h-3 w-3" />}
                                </Badge>
                              );
                            })}
                            {tags.length === 0 && (
                              <span className="text-sm text-muted-foreground">
                                No tags available
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsTagDialogOpen(true)}
                            disabled={form.formState.isSubmitting}
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Tag
                          </Button>
                        </div>
                        <FormDescription className="text-xs">
                          Click tags to select/deselect or create new ones.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Published and Featured Checkboxes */}
                <div className="flex gap-6">
                  <FormField
                    control={form.control}
                    name="published"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            disabled={form.formState.isSubmitting}
                            className="rounded"
                          />
                        </FormControl>
                        <FormLabel className="mt-0! cursor-pointer">
                          Published
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            disabled={form.formState.isSubmitting}
                            className="rounded"
                          />
                        </FormControl>
                        <FormLabel className="mt-0! cursor-pointer">
                          Featured
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={form.formState.isSubmitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Post"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Create Category Dialog */}
          <CategoryCreateDialog
            open={isCategoryDialogOpen}
            onOpenChange={setIsCategoryDialogOpen}
            onSuccess={handleCategorySuccess}
          />

          {/* Create Tag Dialog */}
          <TagCreateDialog
            open={isTagDialogOpen}
            onOpenChange={setIsTagDialogOpen}
            onSuccess={handleTagSuccess}
          />
        </div>
      </div>
    </RequireAuth>
  );
}
