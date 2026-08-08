/**
 * Deliberately not usage metrics - Lynq is young and invented numbers age
 * badly. These are claims the product can actually back up today.
 */
export default function StatsSection() {
    return (
        <section className="py-16 md:py-20">
            <div className="mx-auto max-w-7xl px-6">
                <p className="text-muted-foreground max-w-4xl text-balance text-4xl font-medium tracking-tight lg:text-5xl">
                    <span className="text-foreground">Support is not a six-tool problem.</span> Chat, tickets, announcements and surveys share one inbox.
                </p>

                <div className="mt-32 grid gap-12 md:grid-cols-3 xl:mt-44">
                    <div className="space-y-3 border-t pt-6">
                        <div className="text-5xl font-semibold tracking-tight">2 minutes</div>
                        <p className="text-muted-foreground">From pasting the snippet to your first answered message</p>
                    </div>
                    <div className="space-y-3 border-t pt-6">
                        <div className="text-5xl font-semibold tracking-tight">1 inbox</div>
                        <p className="text-muted-foreground">Web chat and Telegram land in the same place, with the same history</p>
                    </div>
                    <div className="space-y-3 border-t pt-6">
                        <div className="text-5xl font-semibold tracking-tight">0 redeploys</div>
                        <p className="text-muted-foreground">Change your widget, banners and surveys without shipping code</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
