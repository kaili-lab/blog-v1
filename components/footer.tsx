import Link from "next/link";
import { Github, Linkedin } from "lucide-react";
import { socialLinks } from "@/lib/config/about";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t border-border px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="/about"
              className="hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Contact
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href={socialLinks.github.url}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label={socialLinks.github.label}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="w-5 h-5" />
            </Link>
            <Link
              href={socialLinks.linkedin.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={socialLinks.linkedin.label}
            >
              <Linkedin className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          © {currentYear} AI Blog Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
