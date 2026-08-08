'use client'
import { ClaudeAI } from '@workspace/ui/components/svgs/claude-ai'
import { Openai } from '@workspace/ui/components/svgs/openai'
import { TelegramIcon } from '@workspace/ui/components/telegram-icon'
import { Github } from 'lucide-react'
import { useMedia } from '@/hooks/use-media'
import { InfiniteSlider } from '@workspace/ui/components/motion-primitives/infinite-slider'

/**
 * Not a customer logo wall - these are the channels and tools Lynq actually
 * connects to, so the row stays honest while the product is young.
 */
export default function LogoCloud() {
    const isLarge = useMedia('(min-width: 64rem)')

    const Logos = () => {
        return (
            <>
                <Badge
                    icon={<TelegramIcon className="size-5" />}
                    label="Telegram"
                />
                <Badge
                    icon={<Github className="size-5" />}
                    label="GitHub"
                />
                <Badge
                    icon={<ClaudeAI className="size-5" />}
                    label="Claude"
                />
                <Badge
                    icon={<Openai className="size-5" />}
                    label="Codex"
                />
                <Badge label="React" />
                <Badge label="Next.js" />
                <Badge label="Plain HTML" />
            </>
        )
    }

    return (
        <section className="bg-background pb-16 pt-4">
            <div className="relative m-auto max-w-7xl px-6">
                <p className="text-muted-foreground mb-6 text-center text-sm lg:text-left">Installs on any stack, and answers from the channels your customers already use</p>
                {isLarge ? (
                    <div className="relative flex items-center justify-between gap-6 py-2">
                        <Logos />
                    </div>
                ) : (
                    <InfiniteSlider
                        gap={40}
                        className="mask-x-from-85% mask-x-to-99%"
                    >
                        <Logos />
                    </InfiniteSlider>
                )}
            </div>
        </section>
    )
}

const Badge = ({ icon, label }: { icon?: React.ReactNode; label: string }) => {
    return (
        <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-base font-medium">
            {icon}
            <span>{label}</span>
        </div>
    )
}
