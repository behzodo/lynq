import { ClaudeAI } from '@workspace/ui/components/svgs/claude-ai'
import { Openai } from '@workspace/ui/components/svgs/openai'
import { TelegramIcon } from '@workspace/ui/components/telegram-icon'
import { Button } from '@workspace/ui/components/button'
import { Code2, FileCode2, Github } from 'lucide-react'
import Link from 'next/link'

export default function IntegrationsSection() {
    return (
        <section id="channels">
            <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
                <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:gap-12">
                    <div className="flex flex-col justify-between gap-12 pb-6 max-lg:order-last md:mt-6">
                        <div>
                            <h2 className="text-balance text-4xl font-medium tracking-tight lg:text-5xl">Fits the stack you already have</h2>
                            <p className="text-muted-foreground mb-6 mt-4 text-balance text-lg">Install the widget on any framework, answer from the channels your customers already use, and drive your announcements and surveys from the AI coding agent you already have open.</p>
                            <Button
                                asChild
                                variant="outline">
                                <Link href="/sign-up">Get Started</Link>
                            </Button>
                        </div>

                        <p className="text-muted-foreground max-w-xs text-balance text-lg">
                            Every snippet in the docs comes <span className="text-foreground font-medium">pre-filled with your organization ID</span>. Nothing to configure.
                        </p>
                    </div>

                    <div className="mask-radial-at-top-left mask-radial-from-65% mask-radial-[100%_80%] -mx-6 px-6 sm:mx-auto sm:max-w-md md:-mx-6 md:ml-auto md:mr-0">
                        <div className="bg-card rounded-2xl border p-3 shadow-lg md:pb-12">
                            <div className="grid grid-cols-2 gap-2">
                                <Integration
                                    icon={<TelegramIcon className="size-6" />}
                                    name="Telegram"
                                    description="Customers message your bot, you reply from the same inbox."
                                />
                                <Integration
                                    icon={<Github className="size-6" />}
                                    name="GitHub"
                                    description="Turn a report into a tracked issue on your project board."
                                />
                                <Integration
                                    icon={<ClaudeAI className="size-6" />}
                                    name="Claude"
                                    description="Connect over MCP and have it write your announcements."
                                />
                                <Integration
                                    icon={<Openai className="size-6" />}
                                    name="Codex"
                                    description="Same MCP endpoint, signed in with your Lynq account."
                                />
                                <Integration
                                    icon={<Code2 className="size-6" />}
                                    name="React & Next.js"
                                    description="Drop the widget in your root layout and you are done."
                                />
                                <Integration
                                    icon={<FileCode2 className="size-6" />}
                                    name="Plain HTML"
                                    description="One script tag before the closing body tag. No build step."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

const Integration = ({ icon, name, description }: { icon: React.ReactNode; name: string; description: string }) => {
    return (
        <div className="hover:bg-foreground/5 cursor-pointer space-y-4 rounded-lg border p-4 transition-colors">
            <div className="flex size-fit items-center justify-center">{icon}</div>
            <div className="space-y-1">
                <h3 className="text-sm font-medium">{name}</h3>
                <p className="text-muted-foreground line-clamp-1 text-sm md:line-clamp-2">{description}</p>
            </div>
        </div>
    )
}
