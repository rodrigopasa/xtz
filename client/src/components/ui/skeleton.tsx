import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "title" | "avatar" | "thumbnail" | "card"
}

function Skeleton({
  className,
  variant = "text",
  ...props
}: SkeletonProps) {
  const baseStyles = "animate-pulse rounded-md bg-muted relative overflow-hidden"
  const variantStyles = {
    text: "h-4 w-full",
    title: "h-8 w-3/4",
    avatar: "h-12 w-12 rounded-full",
    thumbnail: "h-48 w-full",
    card: "h-[320px] w-full"
  }

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/5 after:to-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }