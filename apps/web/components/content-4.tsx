import { ArrowLeftRight, Bell, LineChart, Users } from 'lucide-react'

export default function ContentSection() {
    return (
        <section className="py-16 md:py-20">
            <div className="mx-auto max-w-7xl px-6">
                <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:gap-12">
                    <h2 className="max-w-md text-balance text-4xl font-medium tracking-tight lg:text-5xl">
                        <span className="text-muted-foreground">One conversation.</span> <br /> However they reach you.
                    </h2>
                    <div className="space-y-4">
                        <p className="text-muted-foreground text-balance text-lg">A customer starts in the widget on your pricing page, follows up on Telegram two days later, and by then whoever answers has usually lost the thread.</p>
                        <p className="text-muted-foreground text-balance text-lg">Lynq keeps every message, ticket and survey answer on the same customer, so the next person to reply picks up with the full history instead of asking them to explain it again.</p>

                        <div className="*:not-last:pb-3 *:not-last:border-b mt-20 flex flex-col gap-3 pt-6">
                            <p className="text-muted-foreground text-balance text-lg">
                                <span className="text-foreground font-medium">
                                    <ArrowLeftRight className="inline size-4 -translate-y-0.5" /> Web and Telegram, one inbox.
                                </span>{' '}
                                Same thread, same history, whichever channel they picked.
                            </p>

                            <p className="text-muted-foreground text-balance text-lg">
                                <span className="text-foreground font-medium">
                                    <Bell className="inline size-4 -translate-y-0.5" /> Announcements that reach them.
                                </span>{' '}
                                Ship a banner or popup without redeploying your site.
                            </p>

                            <p className="text-muted-foreground text-balance text-lg">
                                <span className="text-foreground font-medium">
                                    <Users className="inline size-4 -translate-y-0.5" /> Tickets from the conversation.
                                </span>{' '}
                                Promote any chat to a tracked ticket without retyping it.
                            </p>

                            <p className="text-muted-foreground text-balance text-lg">
                                <span className="text-foreground font-medium">
                                    <LineChart className="inline size-4 -translate-y-0.5" /> Ask before they forget.
                                </span>{' '}
                                Fire a survey or NPS question right after the conversation ends.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
