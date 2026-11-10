import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { ProgressBar } from "@/components/progress-bar";
import { PlatformLogo } from "@/components/platform-logo";
import { NavigationPending } from "@/components/navigation-pending";

export function GameCard({
  title,
  platform,
  href,
  percent,
  footer,
  completeLabel,
  coverUrl,
  completionistBadge,
  loadingLabel,
}: {
  title: string;
  platform: string;
  href: string;
  percent?: number;
  footer?: React.ReactNode;
  completeLabel?: string;
  coverUrl?: string | null;
  completionistBadge?: string | null;
  loadingLabel: string;
}) {
  const complete = percent === 100;

  return (
    <Card className="relative transition-all duration-200 hover:-translate-y-0.5 hover:ring-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-within:ring-primary/40">
      <CardHeader>
        <div className="flex items-start gap-3">
          {coverUrl && (
            <Image
              src={coverUrl}
              alt={title}
              width={56}
              height={56}
              className="size-14 shrink-0 rounded bg-muted/50 object-contain shadow-sm ring-1 ring-border"
            />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>
              <Link
                href={href}
                className="outline-none after:absolute after:inset-0 after:content-['']"
              >
                {title}
                <NavigationPending label={loadingLabel} className="ml-2 align-middle" />
              </Link>
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                <PlatformLogo platform={platform} />
                {platform}
              </span>
              {completionistBadge && (
                <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {completionistBadge}
                </span>
              )}
              {complete && completeLabel && (
                <span className="inline-flex items-center rounded-md bg-success/15 px-1.5 py-0.5 text-xs font-medium text-success">
                  {completeLabel}
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {percent !== undefined && (
        <CardContent>
          <ProgressBar percent={percent} />
        </CardContent>
      )}
      {footer && (
        <CardFooter className="relative z-10 border-t-0 bg-transparent pt-0">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
