import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Github, Linkedin, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getAdminUser } from "@/lib/db-access/user";
import { getInitials } from "@/lib/utils";
import {
  skills,
  quickLinks,
  socialLinks,
  profileConfig,
  aboutContent,
} from "@/lib/config/about";

export default async function AboutPage() {
  const adminUser = await getAdminUser();

  // 空状态处理
  if (!adminUser) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="max-w-6xl mx-auto">
            <Card className="p-8 text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Admin User Not Found
              </h1>
              <p className="text-muted-foreground">
                The admin user information is not available at this time.
              </p>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* 左侧个人信息 */}
            <div className="md:col-span-4">
              <div className="sticky top-8">
                <Card className="p-6">
                  {/* 头像 */}
                  <div className="flex justify-center mb-4">
                    {adminUser.image ? (
                      <div className="w-32 h-32 rounded-full overflow-hidden ring-2 ring-primary/20">
                        <Image
                          src={adminUser.image}
                          alt="Admin avatar"
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                        <span className="text-4xl font-bold text-primary">
                          {getInitials(adminUser.name || "Admin")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 个人信息 */}
                  <div className="text-center space-y-2 mb-6">
                    <h1 className="text-2xl font-bold text-foreground">
                      {adminUser.name || "Admin"}
                    </h1>
                    <p className="text-primary font-medium">
                      {profileConfig.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profileConfig.description}
                    </p>
                  </div>

                  {/* 社交媒体链接 */}
                  <div className="flex justify-center gap-4 mb-6">
                    <Link
                      href={socialLinks.github.url}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label={socialLinks.github.label}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="w-5 h-5" aria-hidden="true" />
                    </Link>
                    <Link
                      href={socialLinks.linkedin.url}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label={socialLinks.linkedin.label}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Linkedin className="w-5 h-5" aria-hidden="true" />
                    </Link>
                  </div>

                  {/* CTA Button */}
                  <Button asChild className="w-full">
                    <Link
                      href={profileConfig.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${profileConfig.portfolioLabel} (opens in new tab)`}
                    >
                      {profileConfig.portfolioLabel}
                    </Link>
                  </Button>
                </Card>
              </div>
            </div>

            {/* 右侧内容 */}
            <div className="md:col-span-8 space-y-6">
              {/* 关于我 */}
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-foreground">About Me</h2>
                <div className="text-muted-foreground space-y-4">
                  <p>{aboutContent.paragraph1}</p>
                  <p className="text-foreground font-medium">
                    {aboutContent.paragraph2}
                  </p>
                </div>
              </Card>

              {/* 技能 */}
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-foreground ">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </Card>

              {/* 快速链接 */}
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-foreground ">
                  More About Me
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.title}
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noopener noreferrer" : undefined}
                        className="flex items-center gap-3 p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                        aria-label={link.external ? `${link.title} (opens in new tab)` : link.title}
                      >
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                          <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground flex items-center gap-1">
                            {link.title}
                            {link.external && (
                              <ExternalLink className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {link.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
