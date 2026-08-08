import Link from 'next/link'
import { Button } from '@workspace/ui/components/button'
import { Check } from 'lucide-react'

/**
 * TODO: the prices below are placeholders - set them before this page ships.
 * The feature split is drawn from what the product actually does today, but
 * which capability sits behind which tier is a commercial decision, not a
 * technical one.
 */
const PLANS = [
    {
        name: 'Free',
        audience: 'For a single site, getting started',
        price: '$0',
        cta: 'Start for free',
        featured: false,
        features: ['Chat widget on one site', 'Unlimited web conversations', 'Shared inbox for your team', 'Ticket board with your own columns', 'Full widget customization'],
    },
    {
        name: 'Pro',
        audience: 'For teams answering every day',
        price: '$29',
        cta: 'Start for free',
        featured: true,
        features: ['Everything in Free', 'Telegram in the same inbox', 'Announcement banners and popups', 'Surveys and NPS', 'GitHub issue tracking', 'Image attachments in chat'],
    },
    {
        name: 'Business',
        audience: 'For multiple products and brands',
        price: '$99',
        cta: 'Start for free',
        featured: false,
        features: ['Everything in Pro', 'Multiple organizations', 'AI agents over MCP (Claude, Codex)', 'Priority support'],
    },
]

export default function Pricing() {
    return (
        <section
            className="py-16 md:py-20"
            id="pricing"
        >
            <div className="mx-auto max-w-7xl px-6">
                <div className="max-w-md space-y-6">
                    <h1 className="text-muted-foreground text-balance text-4xl font-medium tracking-tight lg:text-5xl">
                        <span className="text-foreground">Start free.</span> <br /> Upgrade when support gets busy.
                    </h1>
                </div>

                <div className="mt-12 grid gap-6 border *:p-8 max-lg:mx-auto max-lg:max-w-sm lg:mt-20 lg:grid-cols-3">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.name}
                            className={plan.featured ? 'bg-card relative flex flex-col gap-8 shadow-xl max-lg:border-y lg:border-x' : 'flex flex-col gap-8 max-lg:border-b lg:not-last:border-r lg:last:border-l'}
                        >
                            {plan.featured && <div className="inset-ring inset-ring-foreground/10 absolute right-0 top-0 w-fit -translate-y-px translate-x-px rounded-bl bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200 [corner-shape:bevel]">Most popular</div>}
                            <div>
                                <p className="text-lg font-medium">{plan.name}</p>
                                <p className="text-muted-foreground text-lg font-medium">{plan.audience}</p>

                                <div className="my-8 block text-4xl font-medium tracking-tight">
                                    {plan.price} <span className="text-muted-foreground text-lg">/mo</span>
                                </div>

                                <Button
                                    asChild
                                    className="w-full"
                                    variant={plan.featured ? 'default' : 'outline'}>
                                    <Link href="/sign-up">{plan.cta}</Link>
                                </Button>
                            </div>

                            <ul className="text-muted-foreground list-outside space-y-3">
                                {plan.features.map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-center gap-3"
                                    >
                                        <Check className="text-muted-foreground size-3 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
